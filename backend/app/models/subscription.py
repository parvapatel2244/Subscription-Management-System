from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Numeric, Integer, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base, utcnow, IDType

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    subscription_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(IDType, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    quotation_id = Column(IDType, ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True, unique=True)
    plan_id = Column(IDType, ForeignKey("plans.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(30), default="draft", nullable=False, index=True) # draft, quotation, confirmed, active, paused, closed
    start_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=True)
    next_billing_date = Column(Date, nullable=True, index=True)
    billing_interval = Column(String(20), nullable=False) # daily, weekly, monthly, yearly
    interval_count = Column(Integer, default=1, nullable=False)
    payment_terms_days = Column(Integer, default=15, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    auto_renew = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    customer = relationship("Customer", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    quotation = relationship("Quotation", back_populates="subscription")
    lines = relationship("SubscriptionLine", back_populates="subscription", cascade="all, delete-orphan")
    events = relationship("SubscriptionEvent", back_populates="subscription", cascade="all, delete-orphan")
    billing_periods = relationship("SubscriptionBillingPeriod", back_populates="subscription", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="subscription")


class SubscriptionLine(Base):
    __tablename__ = "subscription_lines"

    id = Column(IDType, primary_key=True, autoincrement=True)
    subscription_id = Column(IDType, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(IDType, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    variant_id = Column(IDType, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    description_snapshot = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(19, 4), nullable=False)
    tax_snapshot = Column(Numeric(12, 4), default=0.0000, nullable=False)
    discount_snapshot = Column(Numeric(19, 4), default=0.0000, nullable=False)
    line_total = Column(Numeric(19, 4), nullable=False)

    subscription = relationship("Subscription", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")


class SubscriptionEvent(Base):
    __tablename__ = "subscription_events"

    id = Column(IDType, primary_key=True, autoincrement=True)
    subscription_id = Column(IDType, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False) # quotation_sent, confirmed, activated, paused, resumed, closed, renewed
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    event_date = Column(DateTime, default=utcnow, nullable=False)
    reason = Column(Text, nullable=True)
    performed_by = Column(String(100), nullable=True) # user name or "SYSTEM"

    subscription = relationship("Subscription", back_populates="events")


class SubscriptionBillingPeriod(Base):
    __tablename__ = "subscription_billing_periods"

    id = Column(IDType, primary_key=True, autoincrement=True)
    subscription_id = Column(IDType, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    billing_status = Column(String(30), default="pending", nullable=False) # pending, billed, skipped
    invoice_id = Column(IDType, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)

    subscription = relationship("Subscription", back_populates="billing_periods")
    invoice = relationship("Invoice")

    __table_args__ = (
        UniqueConstraint("subscription_id", "period_start", "period_end", name="uq_subscription_period"),
    )
