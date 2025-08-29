from flask import Flask, request
from flask_cors import CORS
from models import db, Order, OrderItem
import requests, math, os

# Use env override in Docker; default to products service DNS name
PRODUCTS = os.environ.get("PRODUCTS_URL", "http://products:8001")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ---- Absolute DB path ----
BASE_DIR = os.path.dirname(__file__)
INSTANCE_DIR = os.path.join(BASE_DIR, "instance")
os.makedirs(INSTANCE_DIR, exist_ok=True)
DB_PATH = os.path.join(INSTANCE_DIR, "orders.db")

app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

# Create tables at startup (Flask 3 safe)
with app.app_context():
    db.create_all()
    print(f"[orders] DB ready at {DB_PATH}; PRODUCTS_URL={PRODUCTS}")

def _user():
    return {
        "id":    (request.headers.get("X-User-Id") or "").strip() or None,
        "name":  request.headers.get("X-User-Name") or "you",
        "email": request.headers.get("X-User-Email") or "",
        "role":  (request.headers.get("X-User-Role") or "").lower()
    }

# ---------- helpers to reserve/return stock ----------
def _reserve_stock(lines):
    """Call products service to decrement stock for each line. Returns (ok, failed_message)."""
    reserved = []
    for ln in lines:
        try:
            r = requests.post(f"{PRODUCTS}/products/{ln['productId']}/decrement",
                              json={"qty": ln["qty"]}, timeout=5)
        except Exception:
            _release_stock(reserved)  # best effort rollback
            return False, "Products service unavailable"
        if r.status_code != 200:
            _release_stock(reserved)
            try:
                msg = r.json().get("message", "Insufficient stock")
            except Exception:
                msg = "Insufficient stock"
            return False, msg
        reserved.append({"productId": ln["productId"], "qty": ln["qty"]})
    return True, None

def _release_stock(lines):
    """Best-effort: add stock back for each line."""
    for ln in lines:
        try:
            requests.post(f"{PRODUCTS}/products/{ln['productId']}/increment",
                          json={"qty": ln["qty"]}, timeout=5)
        except Exception:
            pass

@app.get("/orders")
def my_orders():
    u = _user()
    if not (u["email"] or u["id"]):
        return {"message": "Unauthorized"}, 401
    rows = (
        Order.query
        .filter((Order.email == u["email"]) | (Order.userId == u["id"]))
        .order_by(Order.placedAt.desc())
        .all()
    )
    return [_to_shop_shape(o) for o in rows]

@app.post("/orders")
def create_order():
    u = _user()
    if not (u["email"] or u["id"]):
        return {"message": "Unauthorized"}, 401

    body = request.get_json() or {}
    items_req = body.get("items") or []  # [{id,qty}]
    address   = body.get("address") or {}
    method    = (body.get("method") or "card").lower()
    coupon    = (body.get("coupon") or "").upper() or None

    # verify products & prices against products service
    cart_lines = []
    subtotal = 0
    for it in items_req:
        pid, qty = int(it["id"]), int(it["qty"])
        try:
            r = requests.get(f"{PRODUCTS}/products/{pid}", timeout=5)
        except Exception:
            return {"message": "Products service unavailable"}, 502

        if r.status_code != 200:
            return {"message": "Product not found"}, 400
        p = r.json()

        if (not p.get("inStock")) or qty > int(p.get("stock", 0)):
            return {"message": f"{p['title']} out of stock"}, 400

        line = {
            "productId": p["id"],
            "title": p["title"],
            "price": int(p["price"]),
            "qty": qty,
            "imageUrl": p["imageUrl"],
        }
        cart_lines.append(line)
        subtotal += line["price"] * qty

    # totals
    discount = math.floor(subtotal * 0.10) if coupon == "DEAL10" else 0
    after = max(0, subtotal - discount)
    shipping = 0 if (after >= 999 or coupon == "FREESHIP" or not cart_lines) else 49
    tax = math.floor(after * 0.12)
    total = after + shipping + tax

    # Reserve stock BEFORE writing the order, so we don't oversell
    ok, msg = _reserve_stock(cart_lines)
    if not ok:
        return {"message": msg or "Insufficient stock"}, 409

    # persist order
    try:
        o = Order(
            userId=u["id"],
            userName=u["name"],
            email=u["email"],
            status="Created",
            method=method,
            coupon=coupon,
            subtotal=subtotal,
            discount=discount,
            shipping=shipping,
            tax=tax,
            total=total,
            address_name=address.get("name", ""),
            address_phone=address.get("phone", ""),
            address_line1=address.get("line1", ""),
            address_line2=address.get("line2", ""),
            address_city=address.get("city", ""),
            address_state=address.get("state", ""),
            address_zip=address.get("pincode", ""),
        )
        db.session.add(o)
        db.session.flush()

        for ln in cart_lines:
            db.session.add(OrderItem(orderId=o.id, **ln))
        db.session.commit()
    except Exception:
        # If DB write fails, put stock back
        _release_stock(cart_lines)
        db.session.rollback()
        return {"message": "Could not create order"}, 500

    return _to_shop_shape(o), 201

@app.patch("/orders/<int:oid>")
def patch_order(oid):
    u = _user()
    o = Order.query.get_or_404(oid)
    data = request.get_json() or {}

    # user cancel
    if data.get("action") == "cancel":
        if not (u["email"] and u["email"] == o.email) and u["role"] != "admin":
            return {"message": "Forbidden"}, 403
        if o.status in ("Dispatched", "Delivered"):
            return {"message": "Too late to cancel"}, 400
        # return stock
        items = OrderItem.query.filter_by(orderId=o.id).all()
        _release_stock([{"productId": it.productId, "qty": it.qty} for it in items])
        o.status = "Cancelled"
        db.session.commit()
        return {"ok": True}

    # admin status update
    if "status" in data:
        if u["role"] != "admin":
            return {"message": "Forbidden"}, 403
        o.status = data["status"]
        db.session.commit()
        return {"ok": True}

    return {"message": "Bad request"}, 400

@app.get("/admin/orders")
def admin_list():
    if _user()["role"] != "admin":
        return {"message": "Forbidden"}, 403
    rows = Order.query.order_by(Order.placedAt.desc()).all()
    return [_to_admin_shape(o) for o in rows]

# -------- shape helpers to match your frontend --------
def _to_shop_shape(o: Order):
    items = OrderItem.query.filter_by(orderId=o.id).all()
    return {
        "id": o.id,
        "userId": o.userId,
        "userName": o.userName,
        "email": o.email,
        "items": [
            {
                "id": it.productId,
                "title": it.title,
                "price": it.price,
                "qty": it.qty,
                "imageUrl": it.imageUrl,
            }
            for it in items
        ],
        "totals": {
            "subtotal": o.subtotal,
            "discount": o.discount,
            "shipping": o.shipping,
            "tax": o.tax,
            "total": o.total,
            "coupon": o.coupon,
        },
        "status": o.status,
        "placedAt": o.placedAt.isoformat(),
        "method": o.method,
        "address": {
            "name": o.address_name,
            "phone": o.address_phone,
            "line1": o.address_line1,
            "line2": o.address_line2,
            "city": o.address_city,
            "state": o.address_state,
            "pincode": o.address_zip,
        },
    }

def _to_admin_shape(o: Order):
    items = OrderItem.query.filter_by(orderId=o.id).all()
    return {
        "id": o.id,
        "userId": o.userId,
        "userName": o.userName,
        "email": o.email,
        "items": [
            {
                "id": it.productId,
                "title": it.title,
                "price": it.price,
                "qty": it.qty,
                "imageUrl": it.imageUrl,
            }
            for it in items
        ],
        "amount": o.total,
        "status": o.status,
        "createdAt": o.placedAt.isoformat(),
        "address": {
            "name": o.address_name,
            "line1": o.address_line1,
            "line2": o.address_line2,
            "city": o.address_city,
            "state": o.address_state,
            "zip": o.address_zip,
            "phone": o.address_phone,
        },
        "payment": {"method": o.method.upper()},
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8002, debug=True)
