from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.subscription import Subscription, SubscriptionEvent
from app.models.invoice import Invoice
from app.schemas.subscription import (
    SubscriptionOut,
    SubscriptionEventOut,
    SubscriptionPauseRequest,
    SubscriptionCloseRequest
)
from app.schemas.invoice import InvoiceOut
from app.services.subscription_lifecycle import SubscriptionLifecycleService
from app.services.billing_engine import BillingEngine
from app.api.deps import get_current_user, require_permission

router = APIRouter()

@router.get("", response_model=List[SubscriptionOut])
def list_subscriptions(
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role_codes = {r.code for r in current_user.roles}
    query = db.query(Subscription)
    if "CUSTOMER" in role_codes and "SUPER_ADMIN" not in role_codes and "STAFF_ADMIN" not in role_codes:
        if not current_user.customer:
            return []
        query = query.filter(Subscription.customer_id == current_user.customer.id)
    elif customer_id:
        query = query.filter(Subscription.customer_id == customer_id)

    if status:
        query = query.filter(Subscription.status == status)

    return query.order_by(Subscription.created_at.desc()).all()

@router.get("/{sub_id}", response_model=SubscriptionOut)
def get_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    role_codes = {r.code for r in current_user.roles}
    if "CUSTOMER" in role_codes and "SUPER_ADMIN" not in role_codes and "STAFF_ADMIN" not in role_codes:
        if not current_user.customer or current_user.customer.id != sub.customer_id:
            raise HTTPException(status_code=403, detail="Access denied.")

    return sub

@router.post("/{sub_id}/activate", response_model=SubscriptionOut)
def activate_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        return SubscriptionLifecycleService.activate(db, sub_id, performed_by=current_user.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{sub_id}/pause", response_model=SubscriptionOut)
def pause_subscription(
    sub_id: int,
    payload: SubscriptionPauseRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        return SubscriptionLifecycleService.pause(db, sub_id, payload.reason, performed_by=current_user.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{sub_id}/resume", response_model=SubscriptionOut)
def resume_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        return SubscriptionLifecycleService.resume(db, sub_id, performed_by=current_user.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{sub_id}/close", response_model=SubscriptionOut)
def close_subscription(
    sub_id: int,
    payload: SubscriptionCloseRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        return SubscriptionLifecycleService.close(db, sub_id, payload.reason, performed_by=current_user.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{sub_id}/renew", response_model=SubscriptionOut)
def renew_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        return SubscriptionLifecycleService.renew(db, sub_id, performed_by=current_user.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{sub_id}/bill-now")
def bill_subscription_now(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    invoice, msg = BillingEngine.bill_subscription(db, sub)
    if not invoice:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "invoice_id": invoice.id, "invoice_number": invoice.invoice_number}

@router.get("/{sub_id}/events", response_model=List[SubscriptionEventOut])
def get_subscription_events(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(SubscriptionEvent).filter(SubscriptionEvent.subscription_id == sub_id).order_by(SubscriptionEvent.event_date.desc()).all()

@router.get("/{sub_id}/invoices", response_model=List[InvoiceOut])
def get_subscription_invoices(
    sub_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Invoice).filter(Invoice.subscription_id == sub_id).order_by(Invoice.created_at.desc()).all()

