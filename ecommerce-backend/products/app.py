from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from models import db, Product, Review
from sqlalchemy import or_, desc, asc, func
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ---- Absolute DB path (prevents sqlite path issues) ----
BASE_DIR = os.path.dirname(__file__)
INSTANCE_DIR = os.path.join(BASE_DIR, "instance")
os.makedirs(INSTANCE_DIR, exist_ok=True)
DB_PATH = os.path.join(INSTANCE_DIR, "products.db")

app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

def seed():
    if Product.query.count():
        return
    demo = [
        dict(title="Wireless Headphones", description="Over-ear, noise cancelling",
             category="Audio", imageUrl="https://picsum.photos/seed/pho/640/480",
             price=2999, oldPrice=3999, stock=25, inStock=True, delivery="Tomorrow"),
        dict(title="Smart Watch", description="Waterproof with GPS",
             category="Wearables", imageUrl="https://picsum.photos/seed/watch/640/480",
             price=4999, oldPrice=5499, stock=12, inStock=True, delivery="In 2 days"),
    ]
    for p in demo:
        db.session.add(Product(**p))
    db.session.commit()

# Flask 3: do one-time init explicitly
def init_db():
    with app.app_context():
        db.create_all()
        seed()
        print(f"[products] DB ready at {DB_PATH}")

init_db()

def _is_admin():
    return (request.headers.get("X-User-Role") or "").lower() == "admin"

def _user_ctx():
    return {
        "id":  (request.headers.get("X-User-Id") or "").strip() or None,
        "name":request.headers.get("X-User-Name") or "you",
        "email":request.headers.get("X-User-Email") or "",
    }

@app.get("/products")
def list_products():
    q   = (request.args.get("search") or "").strip().lower()
    cat = request.args.get("category")
    minP = int(request.args.get("minPrice") or 0)
    maxP = int(request.args.get("maxPrice") or 10**9)
    minR = float(request.args.get("minRating") or 0)
    sort = request.args.get("sort") or "relevance"
    page = int(request.args.get("page") or 1)
    size = int(request.args.get("pageSize") or 20)

    qry = Product.query
    if q:
        qry = qry.filter(or_(Product.title.ilike(f"%{q}%"),
                             Product.description.ilike(f"%{q}%")))
    if cat:
        qry = qry.filter(Product.category == cat)
    qry = qry.filter(Product.price.between(minP, maxP),
                     Product.rating >= minR)

    if sort == "priceAsc":   qry = qry.order_by(asc(Product.price))
    elif sort == "priceDesc":qry = qry.order_by(desc(Product.price))
    elif sort == "newest":   qry = qry.order_by(desc(Product.id))
    elif sort == "rating":   qry = qry.order_by(desc(Product.rating))
    else:                    qry = qry.order_by(desc(Product.id))

    total = qry.count()
    items = qry.offset((page-1)*size).limit(size).all()
    body = [p.to_dict() for p in items]
    resp = make_response(jsonify(body))
    resp.headers["X-Total-Count"] = str(total)
    resp.headers["X-Page"] = str(page)
    resp.headers["X-Page-Size"] = str(size)
    return resp

@app.get("/products/<int:pid>")
def get_product(pid):
    p = Product.query.get_or_404(pid)
    return p.to_dict()

@app.post("/products")
def create_product():
    if not _is_admin():
        return {"message":"Forbidden"}, 403
    data = request.get_json() or {}
    for k in ("rating","reviews"): data.pop(k, None)
    p = Product(**data)
    p.rating = 0; p.reviews = 0
    db.session.add(p); db.session.commit()
    return p.to_dict(), 201

@app.patch("/products/<int:pid>")
def update_product(pid):
    if not _is_admin():
        return {"message":"Forbidden"}, 403
    p = Product.query.get_or_404(pid)
    data = request.get_json() or {}
    data.pop("rating", None); data.pop("reviews", None); data.pop("id", None)
    for k,v in data.items(): setattr(p, k, v)
    db.session.commit()
    return p.to_dict()

@app.delete("/products/<int:pid>")
def delete_product(pid):
    if not _is_admin(): return {"message":"Forbidden"}, 403
    p = Product.query.get_or_404(pid)
    db.session.delete(p); db.session.commit()
    return {"ok": True}

# ---------- Reviews ----------
@app.get("/products/<int:pid>/reviews")
def reviews(pid):
    _ = Product.query.get_or_404(pid)
    rows = Review.query.filter_by(productId=pid).order_by(Review.createdAt.desc()).all()
    return [r.to_dict() for r in rows]

@app.post("/products/<int:pid>/reviews")
def add_review(pid):
    user = _user_ctx()
    if not (user["id"] or user["email"]):
        return {"message":"Unauthorized"}, 401

    p = Product.query.get_or_404(pid)
    body = request.get_json() or {}
    rating = int(body.get("rating") or 0)
    comment = (body.get("comment") or "").strip()
    if not (1 <= rating <= 5) or not comment:
        return {"message":"Invalid review"}, 400

    exists = Review.query.filter(
        Review.productId==pid,
        ( (Review.userId==user["id"]) | (Review.userEmail==user["email"]) )
    ).first()
    if exists: return {"message":"Already reviewed"}, 400

    r = Review(productId=pid, userId=user["id"], userName=user["name"],
               userEmail=user["email"], rating=rating, comment=comment)
    db.session.add(r)
    db.session.flush()
    agg = db.session.query(func.avg(Review.rating), func.count(Review.id))\
        .filter(Review.productId==pid).first()
    p.rating = round(float(agg[0] or 0), 1)
    p.reviews = int(agg[1] or 0)
    db.session.commit()
    return r.to_dict(), 201

# ---------- Stock reservation endpoints ----------
@app.post("/products/<int:pid>/decrement")
def decrement_stock(pid: int):
    """Atomically decrease stock; used by Orders when confirming checkout."""
    body = request.get_json() or {}
    qty = max(1, int(body.get("qty") or 1))

    p = Product.query.get_or_404(pid)
    if (p.stock or 0) < qty:
        return {"message": "Insufficient stock"}, 409

    p.stock = int(p.stock) - qty
    if p.stock <= 0:
        p.stock = 0
        p.inStock = False
    db.session.commit()
    return {"ok": True, "stock": p.stock}

@app.post("/products/<int:pid>/increment")
def increment_stock(pid: int):
    """Return stock; used on order cancel or failed checkout."""
    body = request.get_json() or {}
    qty = max(1, int(body.get("qty") or 1))

    p = Product.query.get_or_404(pid)
    p.stock = int(p.stock or 0) + qty
    if p.stock > 0:
        p.inStock = True
    db.session.commit()
    return {"ok": True, "stock": p.stock}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001, debug=True)
