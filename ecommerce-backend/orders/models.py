from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Order(db.Model):
    id        = db.Column(db.Integer, primary_key=True)
    userId    = db.Column(db.Integer)
    userName  = db.Column(db.String(120))
    email     = db.Column(db.String(120), index=True)
    status    = db.Column(db.String(20), default="Created")
    placedAt  = db.Column(db.DateTime, default=datetime.utcnow)
    method    = db.Column(db.String(10))
    coupon    = db.Column(db.String(20))
    subtotal  = db.Column(db.Integer, default=0)
    discount  = db.Column(db.Integer, default=0)
    shipping  = db.Column(db.Integer, default=0)
    tax       = db.Column(db.Integer, default=0)
    total     = db.Column(db.Integer, default=0)
    address_name   = db.Column(db.String(120))
    address_phone  = db.Column(db.String(20))
    address_line1  = db.Column(db.String(200))
    address_line2  = db.Column(db.String(200))
    address_city   = db.Column(db.String(100))
    address_state  = db.Column(db.String(100))
    address_zip    = db.Column(db.String(20))

class OrderItem(db.Model):
    id        = db.Column(db.Integer, primary_key=True)
    orderId   = db.Column(db.Integer, db.ForeignKey("order.id"), index=True)
    productId = db.Column(db.Integer)
    title     = db.Column(db.String(200))
    price     = db.Column(db.Integer)
    qty       = db.Column(db.Integer)
    imageUrl  = db.Column(db.String(500))
