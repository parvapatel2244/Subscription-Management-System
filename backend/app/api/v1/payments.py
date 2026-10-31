import json
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, utcnow
from app.models.payment import Payment, Refund
from app.models.invoice import Invoice
from app.models.operational import WebhookEvent
from app.schemas.payment import (
    PaymentOut,
    ManualPaymentCreate,
    OnlineOrderCreate,
    OnlineOrderVerify,
    RefundCreate,
    RefundOut
)
from app.services.payment_service import PaymentService
from app.integrations.payments.razorpay_adapter import RazorpayAdapter
from app.api.deps import get_current_user, require_permission

router = APIRouter()

@router.get("", response_model=List[PaymentOut])
def list_payments(
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role_codes = {r.code for r in current_user.roles}
    query = db.query(Payment)
    if "CUSTOMER" in role_codes and "SUPER_ADMIN" not in role_codes and "STAFF_ADMIN" not in role_codes:
        if not current_user.customer:
            return []
        query = query.filter(Payment.customer_id == current_user.customer.id)
    elif customer_id:
        query = query.filter(Payment.customer_id == customer_id)

    return query.order_by(Payment.payment_date.desc()).all()

@router.post("/manual", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_manual_payment(
    payload: ManualPaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("payment.record"))
):
    try:
        payment = PaymentService.record_manual_payment(
            db=db,
            customer_id=payload.customer_id,
            invoice_id=payload.invoice_id,
            amount=payload.amount,
            method=payload.method,
            notes=payload.notes,
            performed_by_user_id=current_user.id,
            user_name=current_user.name
        )
        return payment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/online/create-order")
@router.post("/online/order")
def create_online_order(
    payload: OnlineOrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if invoice.balance_due <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="This invoice is already fully paid.")

    adapter = RazorpayAdapter()
    try:
        order = adapter.create_order(
            amount=invoice.balance_due,
            currency=invoice.currency,
            receipt=f"RCP-{invoice.invoice_number}",
            notes={"invoice_id": str(invoice.id), "customer_id": str(invoice.customer_id)}
        )
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": settings.RAZORPAY_KEY_ID,
            "invoice_number": invoice.invoice_number,
            "customer_name": invoice.customer.contact_name,
            "customer_email": invoice.customer.email
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create gateway order: {str(e)}")

@router.post("/online/verify", response_model=PaymentOut)
def verify_online_payment(
    payload: OnlineOrderVerify,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    adapter = RazorpayAdapter()
    is_valid = adapter.verify_payment_signature(
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature
    )

    if not is_valid:
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    invoice = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    try:
        payment = PaymentService.record_online_payment(
            db=db,
            customer_id=invoice.customer_id,
            invoice_id=invoice.id,
            amount=invoice.balance_due,
            method="razorpay",
            gateway_order_id=payload.razorpay_order_id,
            gateway_payment_id=payload.razorpay_payment_id,
            gateway_response=json.dumps({"signature": payload.razorpay_signature})
        )
        return payment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{payment_id}/refund", response_model=RefundOut)
def initiate_refund(
    payment_id: int,
    payload: RefundCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("payment.refund"))
):
    try:
        refund = PaymentService.process_refund(
            db=db,
            payment_id=payment_id,
            amount=payload.amount,
            reason=payload.reason,
            performed_by_user_id=current_user.id,
            user_name=current_user.name
        )
        return refund
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    body = await request.body()
    body_str = body.decode("utf-8")

    adapter = RazorpayAdapter()
    if x_razorpay_signature:
        if not adapter.verify_webhook_signature(body_str, x_razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    data = json.loads(body_str)
    event_id = data.get("event_id") or data.get("id") or "evt_" + str(utcnow().timestamp())
    event_type = data.get("event", "unknown")

    # Record webhook event
    if db.query(WebhookEvent).filter(WebhookEvent.event_id == event_id).first():
        return {"status": "ignored", "reason": "duplicate event"}

    evt = WebhookEvent(
        provider="Razorpay",
        event_id=event_id,
        event_type=event_type,
        payload=body_str,
        processing_status="processed",
        processed_at=utcnow()
    )
    db.add(evt)
    db.commit()

    return {"status": "ok"}

