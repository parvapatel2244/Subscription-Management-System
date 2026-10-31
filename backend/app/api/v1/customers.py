from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.database import get_db, utcnow
from app.models.customer import Customer, CustomerAddress, CustomerBillingProfile
from app.models.subscription import Subscription
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut
from app.schemas.subscription import SubscriptionOut
from app.schemas.invoice import InvoiceOut
from app.schemas.payment import PaymentOut
from app.api.deps import get_current_user, require_permission

router = APIRouter()

def verify_customer_access(current_user: User, customer_id: int):
    # If user is a customer, verify ownership
    role_codes = {r.code for r in current_user.roles}
    if "CUSTOMER" in role_codes and "SUPER_ADMIN" not in role_codes and "STAFF_ADMIN" not in role_codes:
        if not current_user.customer or current_user.customer.id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot view or edit another customer's account."
            )

@router.get("", response_model=List[CustomerOut])
def list_customers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_codes = {r.code for r in current_user.roles}
    if "CUSTOMER" in role_codes and "SUPER_ADMIN" not in role_codes and "STAFF_ADMIN" not in role_codes and "SALES_STAFF" not in role_codes:
        # Customer can only see self
        if not current_user.customer:
            return []
        return [current_user.customer]

    query = db.query(Customer)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Customer.company_name.ilike(s),
                Customer.contact_name.ilike(s),
                Customer.email.ilike(s),
                Customer.customer_code.ilike(s)
            )
        )
    if status:
        query = query.filter(Customer.status == status)

    return query.order_by(Customer.created_at.desc()).all()

@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("customer.create"))
):
    max_id = db.query(func.coalesce(func.max(Customer.id), 0)).scalar()
    cust_code = f"CUST-{(max_id + 1):05d}"

    customer = Customer(
        customer_code=cust_code,
        company_name=payload.company_name,
        contact_name=payload.contact_name,
        email=payload.email,
        phone=payload.phone,
        tax_number=payload.tax_number,
        status="active"
    )
    db.add(customer)
    db.flush()

    # Address
    if payload.address:
        addr = CustomerAddress(
            customer_id=customer.id,
            address_type=payload.address.address_type,
            address_line1=payload.address.address_line1,
            address_line2=payload.address.address_line2,
            city=payload.address.city,
            state=payload.address.state,
            postal_code=payload.address.postal_code,
            country=payload.address.country,
            is_default=True
        )
        db.add(addr)

    # Billing Profile
    b_email = payload.billing_email or payload.email
    bp = CustomerBillingProfile(
        customer_id=customer.id,
        currency="INR",
        billing_email=b_email,
        payment_terms_days=payload.payment_terms_days or 15,
        tax_number=payload.tax_number
    )
    db.add(bp)

    db.commit()
    db.refresh(customer)
    return customer

@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_customer_access(current_user, customer_id)
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return cust

@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_customer_access(current_user, customer_id)
    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    if payload.company_name is not None:
        cust.company_name = payload.company_name
    if payload.contact_name is not None:
        cust.contact_name = payload.contact_name
    if payload.phone is not None:
        cust.phone = payload.phone
    if payload.tax_number is not None:
        cust.tax_number = payload.tax_number
    if payload.status is not None:
        # Customer cannot change their own status
        if "CUSTOMER" in {r.code for r in current_user.roles}:
            raise HTTPException(status_code=403, detail="Cannot alter account status.")
        cust.status = payload.status

    db.commit()
    db.refresh(cust)
    return cust

@router.get("/{customer_id}/subscriptions", response_model=List[SubscriptionOut])
def get_customer_subscriptions(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_customer_access(current_user, customer_id)
    return db.query(Subscription).filter(Subscription.customer_id == customer_id).order_by(Subscription.created_at.desc()).all()

@router.get("/{customer_id}/invoices", response_model=List[InvoiceOut])
def get_customer_invoices(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_customer_access(current_user, customer_id)
    return db.query(Invoice).filter(Invoice.customer_id == customer_id).order_by(Invoice.created_at.desc()).all()

@router.get("/{customer_id}/payments", response_model=List[PaymentOut])
def get_customer_payments(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_customer_access(current_user, customer_id)
    return db.query(Payment).filter(Payment.customer_id == customer_id).order_by(Payment.payment_date.desc()).all()

@router.get("/{customer_id}/summary")
def get_customer_summary(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_customer_access(current_user, customer_id)
    active_subs = db.query(Subscription).filter(
        Subscription.customer_id == customer_id,
        Subscription.status == "active"
    ).count()

    total_paid = db.query(func.coalesce(func.sum(Invoice.amount_paid), Decimal("0.00"))).filter(
        Invoice.customer_id == customer_id
    ).scalar()

    total_outstanding = db.query(func.coalesce(func.sum(Invoice.balance_due), Decimal("0.00"))).filter(
        Invoice.customer_id == customer_id,
        Invoice.status.in_(["confirmed", "partially_paid", "overdue"])
    ).scalar()

    return {
        "active_subscriptions": active_subs,
        "total_paid": float(total_paid),
        "total_outstanding": float(total_outstanding),
        "currency": "INR"
    }
