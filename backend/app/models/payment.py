from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Numeric, Date
from sqlalchemy.orm import relationship
from app.core.database import Base, utcnow, IDType

class Payment(Base):
    __tablename__ = "payments"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    payment_reference = Column(String(64), unique=True, nullable=False, index=True)
    customer_id = Column(IDType, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    method = Column(String(30), nullable=False) # upi, card, netbanking, bank_transfer, cash
    payment_type = Column(String(30), nullable=False) # online, manual
    amount = Column(Numeric(19, 4), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    payment_date = Column(DateTime, default=utcnow, nullable=False)
    status = Column(String(30), default="pending", nullable=False, index=True) # pending, successful, failed, refunded
    notes = Column(Text, nullable=True)

    customer = relationship("Customer", back_populates="payments")
    allocations = relationship("PaymentAllocation", back_populates="payment", cascade="all, delete-orphan")
    transaction = relationship("PaymentTransaction", back_populates="payment", uselist=False, cascade="all, delete-orphan")
    refunds = relationship("Refund", back_populates="payment", cascade="all, delete-orphan")


class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id = Column(IDType, primary_key=True, autoincrement=True)
    payment_id = Column(IDType, ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(IDType, ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False, index=True)
    allocated_amount = Column(Numeric(19, 4), nullable=False)

    payment = relationship("Payment", back_populates="allocations")
    invoice = relationship("Invoice", back_populates="allocations")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(IDType, primary_key=True, autoincrement=True)
    payment_id = Column(IDType, ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, unique=True)
    gateway_name = Column(String(50), default="Razorpay", nullable=False)
    gateway_order_id = Column(String(100), nullable=True, index=True)
    gateway_payment_id = Column(String(100), nullable=True, index=True)
    gateway_status = Column(String(50), nullable=True)
    response_reference = Column(Text, nullable=True)

    payment = relationship("Payment", back_populates="transaction")


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(IDType, primary_key=True, autoincrement=True)
    payment_id = Column(IDType, ForeignKey("payments.id", ondelete="RESTRICT"), nullable=False, index=True)
    refund_reference = Column(String(64), unique=True, nullable=False, index=True)
    amount = Column(Numeric(19, 4), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(30), default="pending", nullable=False) # pending, successful, failed
    gateway_refund_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    payment = relationship("Payment", back_populates="refunds")
