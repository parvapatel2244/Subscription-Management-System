from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Numeric, Integer, Date
from sqlalchemy.orm import relationship
from app.core.database import Base, utcnow, IDType

class QuotationTemplate(Base):
    __tablename__ = "quotation_templates"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    validity_days = Column(Integer, default=30, nullable=False)
    status = Column(String(30), default="active", nullable=False)

    lines = relationship("QuotationTemplateLine", back_populates="template", cascade="all, delete-orphan")


class QuotationTemplateLine(Base):
    __tablename__ = "quotation_template_lines"

    id = Column(IDType, primary_key=True, autoincrement=True)
    template_id = Column(IDType, ForeignKey("quotation_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(IDType, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    variant_id = Column(IDType, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    plan_id = Column(IDType, ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(19, 4), nullable=False)

    template = relationship("QuotationTemplate", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    plan = relationship("Plan")


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    quotation_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(IDType, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    template_id = Column(IDType, ForeignKey("quotation_templates.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(30), default="draft", nullable=False) # draft, sent, accepted, rejected, expired, converted
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    subtotal = Column(Numeric(19, 4), default=0.0000, nullable=False)
    discount_total = Column(Numeric(19, 4), default=0.0000, nullable=False)
    tax_total = Column(Numeric(19, 4), default=0.0000, nullable=False)
    grand_total = Column(Numeric(19, 4), default=0.0000, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    customer = relationship("Customer", back_populates="quotations")
    lines = relationship("QuotationLine", back_populates="quotation", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="quotation", uselist=False)


class QuotationLine(Base):
    __tablename__ = "quotation_lines"

    id = Column(IDType, primary_key=True, autoincrement=True)
    quotation_id = Column(IDType, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(IDType, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    variant_id = Column(IDType, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    plan_id = Column(IDType, ForeignKey("plans.id", ondelete="SET NULL"), nullable=True)
    description_snapshot = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(19, 4), nullable=False)
    discount_amount = Column(Numeric(19, 4), default=0.0000, nullable=False)
    tax_amount = Column(Numeric(19, 4), default=0.0000, nullable=False)
    line_total = Column(Numeric(19, 4), nullable=False)

    quotation = relationship("Quotation", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    plan = relationship("Plan")
