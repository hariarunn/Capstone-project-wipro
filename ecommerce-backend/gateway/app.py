from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
import os, json, base64, requests, sqlite3, datetime
import jwt  
from werkzeug.security import generate_password_hash, check_password_hash

PRODUCTS = os.environ.get("PRODUCTS_URL", "http://products:8001")
ORDERS   = os.environ.get("ORDERS_URL",   "http://orders:8002")

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_EXPIRES_HOURS = int(os.environ.get("JWT_EXPIRES_HOURS", "24"))

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "instance")
os.makedirs(DATA_DIR, exist_ok=True)
USERS_DB = os.path.join(DATA_DIR, "users.db")

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = os.path.join(BASE_DIR, "uploads")
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# CORS for API endpoints
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ---------------- DB helpers ----------------
def db():
    conn = sqlite3.connect(USERS_DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_users():
    with db() as conn:
        conn.execute("""
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL
          )""")
        # seed admin if missing
        cur = conn.execute("SELECT id FROM users WHERE email=?", ("admin@shop.local",))
        if not cur.fetchone():
            conn.execute(
                "INSERT INTO users (name,email,password_hash,role,created_at) VALUES (?,?,?,?,?)",
                ("Admin", "admin@shop.local",
                 generate_password_hash("Admin@123"),
                 "admin", datetime.datetime.utcnow().isoformat())
            )
        conn.commit()

init_users()

# ---------------- JWT helpers ----------------
def make_token(user_row):
    now = datetime.datetime.utcnow()
    exp = now + datetime.timedelta(hours=JWT_EXPIRES_HOURS)
    payload = {
        "sub": user_row["id"],
        "name": user_row["name"],
        "email": user_row["email"],
        "role": user_row["role"],
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token_verified():
    """Verify HS256 token and return claims dict or {}."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return {}
    token = auth.split()[1]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return {}

# fallback: accept old unsigned tokens (only for any legacy sessions)
def decode_token_legacy():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return {}
    token = auth.split()[1]
    parts = token.split(".")
    if len(parts) < 2:
        return {}
    payload = parts[1] + "==="
    try:
        data = json.loads(base64.urlsafe_b64decode(payload).decode("utf-8"))
        return {k: data.get(k) for k in ("sub", "name", "email", "role", "exp")}
    except Exception:
        return {}

def current_user_claims():
    claims = decode_token_verified()
    if claims:
        return claims
    return decode_token_legacy()

# ---------------- Auth API ----------------
@app.post("/api/auth/register")
def register():
    body = request.get_json() or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if len(name) < 2 or "@" not in email or len(password) < 8:
        return {"message": "Validation failed"}, 400

    try:
        with db() as conn:
            conn.execute(
                "INSERT INTO users (name,email,password_hash,role,created_at) VALUES (?,?,?,?,?)",
                (name, email, generate_password_hash(password), "user", datetime.datetime.utcnow().isoformat())
            )
            cur = conn.execute("SELECT * FROM users WHERE email=?", (email,))
            row = cur.fetchone()
    except sqlite3.IntegrityError:
        return {"message": "Email already registered"}, 400

    token = make_token(row)
    return {
        "id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"],
        "token": token
    }, 201

@app.post("/api/auth/login")
def login():
    body = request.get_json() or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if "@" not in email or len(password) < 8:
        return {"message": "Invalid credentials"}, 400

    with db() as conn:
        cur = conn.execute("SELECT * FROM users WHERE email=?", (email,))
        row = cur.fetchone()
    if not row or not check_password_hash(row["password_hash"], password):
        return {"message": "Invalid email or password"}, 401

    token = make_token(row)
    return {
        "id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"],
        "token": token
    }

@app.get("/api/auth/me")
def me():
    claims = current_user_claims()
    if not claims:
        return {"message": "Unauthorized"}, 401
    return {
        "id": claims.get("sub"),
        "name": claims.get("name"),
        "email": claims.get("email"),
        "role": claims.get("role"),
        "exp": claims.get("exp"),
    }

# ---------------- Uploads ----------------
@app.post("/api/upload")
def upload():
    f = request.files.get("file")
    if not f:
        return jsonify({"message": "file missing"}), 400
    name = f.filename.replace("/", "_")
    path = os.path.join(app.config["UPLOAD_FOLDER"], name)
    f.save(path)
    return jsonify({"imageUrl": f"/uploads/{name}"})

@app.get("/api/uploads/<path:name>")
def get_upload_api(name):
    return send_from_directory(app.config["UPLOAD_FOLDER"], name)

@app.get("/uploads/<path:name>")
def get_upload_public(name):
    return send_from_directory(app.config["UPLOAD_FOLDER"], name)

# ---------------- Proxy ----------------
def _forward(target_base: str, strip="/api"):
    user = current_user_claims()
    url = target_base + request.full_path.replace(strip, "", 1)
    if url.endswith("?"):
        url = url[:-1]

    headers = {k: v for k, v in request.headers.items()
               if k.lower() not in ("host", "content-length")}
    if user:
        headers["X-User-Id"]    = str(user.get("sub") or "")
        headers["X-User-Name"]  = user.get("name") or ""
        headers["X-User-Email"] = user.get("email") or ""
        headers["X-User-Role"]  = user.get("role") or ""

    resp = requests.request(
        method=request.method,
        url=url,
        headers=headers,
        data=request.get_data(),
        params=request.args,
        files=request.files if request.files else None,
        stream=True,
    )
    excluded = {"content-encoding", "transfer-encoding", "connection", "keep-alive"}
    headers_out = [(k, v) for k, v in resp.raw.headers.items() if k.lower() not in excluded]
    return Response(resp.content, status=resp.status_code, headers=headers_out)

@app.get("/api/health")
def health():
    return {"ok": True}

@app.route("/api/products", methods=["GET", "POST", "OPTIONS"])
@app.route("/api/products/<path:rest>", methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"])
def products_proxy(rest=None):
    return _forward(PRODUCTS)

@app.route("/api/orders", methods=["GET", "POST", "OPTIONS"])
@app.route("/api/orders/<path:rest>", methods=["GET", "PATCH", "OPTIONS"])
@app.route("/api/admin/orders", methods=["GET", "OPTIONS"])
def orders_proxy(rest=None):
    return _forward(ORDERS)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
