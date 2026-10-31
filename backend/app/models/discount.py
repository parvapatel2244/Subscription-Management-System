from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Integer, Date
from sqlalchemy.orm import relationship
from app.core.database import Base, utcnow, IDType

class Discount(Base):
    __tablename__ = "discounts"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    discount_type = Column(String(30), default="percentage", nullable=False) # percentage, fixed
    value = Column(Numeric(19, 4), nullable=False)
    minimum_purchase = Column(Numeric(19, 4), default=0.0000, nullable=False)
    minimum_quantity = Column(Integer, default=1, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    usage_limit = Column(Integer, nullable=True) # None = unlimited
    usage_count = Column(Integer, default=0, nullable=False)
    scope = Column(String(30), default="all", nullable=False) # all, product, subscription
    status = Column(String(30), default="active", nullable=False) # active, inactive, expired

    products = relationship("Product", secondary="discount_products")
    usages = relationship("DiscountUsage", back_populates="discount", cascade="all, delete-orphan")


class DiscountProduct(Base):
    __tablename__ = "discount_products"

    id = Column(IDType, primary_key=True, autoincrement=True)
    discount_id = Column(IDType, ForeignKey("discounts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(IDType, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)


class DiscountApplication(Base):
    __tablename__ = "discount_applications"

    id = Column(IDType, primary_key=True, autoincrement=True)
    discount_id = Column(IDType, ForeignKey("discounts.id", ondelete="RESTRICT"), nullable=False)
    invoice_id = Column(IDType, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=True)
    quotation_id = Column(IDType, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=True)
    applied_amount = Column(Numeric(19, 4), nullable=False)


class DiscountUsage(Base):
    __tablename__ = "discount_usages"

    id = Column(IDType, primary_key=True, autoincrement=True)
    discount_id = Column(IDType, ForeignKey("discounts.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(IDType, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(IDType, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=True)
    used_at = Column(DateTime, default=utcnow, nullable=False)

    discount = relationship("Discount", back_populates="usages")
