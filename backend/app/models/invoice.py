from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Numeric, Integer, Date
from sqlalchemy.orm import relationship
from app.core.database import Base, utcnow, IDType

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(IDType, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    subscription_id = Column(IDType, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    billing_period_start = Column(Date, nullable=True)
    billing_period_end = Column(Date, nullable=True)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    status = Column(String(30), default="draft", nullable=False, index=True) # draft, confirmed, partially_paid, paid, overdue, cancelled
    currency = Column(String(10), default="INR", nullable=False)
    subtotal = Column(Numeric(19, 4), default=0.0000, nullable=False)
    discount_total = Column(Numeric(19, 4), default=0.0000, nullable=False)
    tax_total = Column(Numeric(19, 4), default=0.0000, nullable=False)
    grand_total = Column(Numeric(19, 4), default=0.0000, nullable=False)
    amount_paid = Column(Numeric(19, 4), default=0.0000, nullable=False)
    balance_due = Column(Numeric(19, 4), default=0.0000, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    customer = relationship("Customer", back_populates="invoices")
    subscription = relationship("Subscription", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    allocations = relationship("PaymentAllocation", back_populates="invoice")
    status_history = relationship("InvoiceStatusHistory", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(IDType, primary_key=True, autoincrement=True)
    invoice_id = Column(IDType, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(IDType, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    description_snapshot = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(19, 4), nullable=False)
    discount_amount = Column(Numeric(19, 4), default=0.0000, nullable=False)
    taxable_amount = Column(Numeric(19, 4), nullable=False)
    tax_rate_snapshot = Column(Numeric(12, 4), default=0.0000, nullable=False)
    tax_amount = Column(Numeric(19, 4), default=0.0000, nullable=False)
    line_total = Column(Numeric(19, 4), nullable=False)

    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product")


class InvoiceStatusHistory(Base):
    __tablename__ = "invoice_status_history"

    id = Column(IDType, primary_key=True, autoincrement=True)
    invoice_id = Column(IDType, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    changed_by = Column(String(100), nullable=False)
    reason = Column(Text, nullable=True)
    changed_at = Column(DateTime, default=utcnow, nullable=False)

    invoice = relationship("Invoice", back_populates="status_history")
