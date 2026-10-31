from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base, utcnow, IDType

class Customer(Base):
    __tablename__ = "customers"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    user_id = Column(IDType, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)
    customer_code = Column(String(50), unique=True, nullable=False, index=True)
    company_name = Column(String(150), nullable=False)
    contact_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    tax_number = Column(String(50), nullable=True)
    status = Column(String(30), default="active", nullable=False) # active, inactive, archived
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="customer")
    addresses = relationship("CustomerAddress", back_populates="customer", cascade="all, delete-orphan")
    billing_profile = relationship("CustomerBillingProfile", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="customer")
    subscriptions = relationship("Subscription", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id = Column(IDType, primary_key=True, autoincrement=True)
    customer_id = Column(IDType, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    address_type = Column(String(30), default="billing", nullable=False) # billing, shipping
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    postal_code = Column(String(30), nullable=False)
    country = Column(String(100), default="India", nullable=False)
    is_default = Column(Boolean, default=True, nullable=False)

    customer = relationship("Customer", back_populates="addresses")


class CustomerBillingProfile(Base):
    __tablename__ = "customer_billing_profiles"

    id = Column(IDType, primary_key=True, autoincrement=True)
    customer_id = Column(IDType, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, unique=True)
    currency = Column(String(10), default="INR", nullable=False)
    billing_email = Column(String(255), nullable=False)
    payment_terms_days = Column(Integer, default=15, nullable=False)
    tax_number = Column(String(50), nullable=True)

    customer = relationship("Customer", back_populates="billing_profile")
