from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Numeric, Integer, Date
from sqlalchemy.orm import relationship
from app.core.database import Base, utcnow, IDType

class Product(Base):
    __tablename__ = "products"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    product_code = Column(String(50), unique=True, nullable=False, index=True)
    product_type = Column(String(50), default="software", nullable=False) # software, service, addon
    sales_price = Column(Numeric(19, 4), default=0.0000, nullable=False)
    cost_price = Column(Numeric(19, 4), default=0.0000, nullable=False)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(30), default="active", nullable=False) # draft, active, archived
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    taxes = relationship("Tax", secondary="product_taxes", back_populates="products")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    product_id = Column(IDType, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_name = Column(String(100), nullable=False)
    variant_code = Column(String(50), nullable=False)
    price_adjustment = Column(Numeric(19, 4), default=0.0000, nullable=False)
    status = Column(String(30), default="active", nullable=False)

    product = relationship("Product", back_populates="variants")


class Plan(Base):
    __tablename__ = "plans"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    plan_code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    billing_interval = Column(String(20), nullable=False) # daily, weekly, monthly, yearly
    interval_count = Column(Integer, default=1, nullable=False)
    minimum_quantity = Column(Integer, default=1, nullable=False)
    available_from = Column(Date, nullable=True)
    available_until = Column(Date, nullable=True)
    auto_close = Column(Boolean, default=True, nullable=False)
    allow_early_close = Column(Boolean, default=True, nullable=False)
    allow_pause = Column(Boolean, default=True, nullable=False)
    allow_renewal = Column(Boolean, default=True, nullable=False)
    status = Column(String(30), default="active", nullable=False) # draft, active, archived
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    products = relationship("PlanProduct", back_populates="plan", cascade="all, delete-orphan")
    prices = relationship("PlanPrice", back_populates="plan", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="plan")


class PlanProduct(Base):
    __tablename__ = "plan_products"

    id = Column(IDType, primary_key=True, autoincrement=True)
    plan_id = Column(IDType, ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(IDType, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    default_variant_id = Column(IDType, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    default_quantity = Column(Integer, default=1, nullable=False)

    plan = relationship("Plan", back_populates="products")
    product = relationship("Product")
    default_variant = relationship("ProductVariant")


class PlanPrice(Base):
    __tablename__ = "plan_prices"

    id = Column(IDType, primary_key=True, autoincrement=True)
    plan_id = Column(IDType, ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    currency = Column(String(10), default="INR", nullable=False)
    amount = Column(Numeric(19, 4), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_until = Column(Date, nullable=True)

    plan = relationship("Plan", back_populates="prices")


class Tax(Base):
    __tablename__ = "taxes"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    tax_code = Column(String(50), unique=True, nullable=False, index=True)
    tax_type = Column(String(30), default="percentage", nullable=False) # percentage, fixed
    rate = Column(Numeric(12, 4), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_until = Column(Date, nullable=True)
    status = Column(String(30), default="active", nullable=False)

    products = relationship("Product", secondary="product_taxes", back_populates="taxes")


class ProductTax(Base):
    __tablename__ = "product_taxes"

    id = Column(IDType, primary_key=True, autoincrement=True)
    product_id = Column(IDType, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    tax_id = Column(IDType, ForeignKey("taxes.id", ondelete="CASCADE"), nullable=False)
