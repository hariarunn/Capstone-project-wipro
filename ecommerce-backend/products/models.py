from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Product(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    title       = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    category    = db.Column(db.String(80), nullable=False)
    imageUrl    = db.Column(db.String(500), nullable=False)
    price       = db.Column(db.Integer, nullable=False)
    oldPrice    = db.Column(db.Integer)
    rating      = db.Column(db.Float, default=0)
    reviews     = db.Column(db.Integer, default=0)
    inStock     = db.Column(db.Boolean, default=True)
    stock       = db.Column(db.Integer, default=10)
    delivery    = db.Column(db.String(80), default="Tomorrow")

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class Review(db.Model):
    id        = db.Column(db.Integer, primary_key=True)
    productId = db.Column(db.Integer, db.ForeignKey("product.id"), index=True, nullable=False)
    userId    = db.Column(db.Integer)
    userName  = db.Column(db.String(120))
    userEmail = db.Column(db.String(120))
    rating    = db.Column(db.Integer, nullable=False)
    comment   = db.Column(db.String(500), nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        d["createdAt"] = d["createdAt"].isoformat()
        return d
