import uuid
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.core.database import utcnow
from app.models.payment import Payment, PaymentAllocation, PaymentTransaction, Refund
from app.models.invoice import Invoice, InvoiceStatusHistory
from app.models.operational import SystemSetting
from app.services.audit_service import AuditService
from app.integrations.payments.razorpay_adapter import RazorpayAdapter

class PaymentService:
    @staticmethod
    def generate_payment_reference(db: Session, prefix: str = "PAY-") -> str:
        count = db.query(Payment).count() + 1
        year = datetime.now(timezone.utc).year
        return f"{prefix}{year}-{count:05d}"

    @staticmethod
    def generate_refund_reference(db: Session, prefix: str = "REF-") -> str:
        count = db.query(Refund).count() + 1
        year = datetime.now(timezone.utc).year
        return f"{prefix}{year}-{count:05d}"

    @staticmethod
    def record_manual_payment(
        db: Session,
        customer_id: int,
        invoice_id: int,
        amount: Decimal,
        method: str, # bank_transfer, cash, upi, card
        notes: Optional[str] = None,
        performed_by_user_id: Optional[int] = None,
        user_name: str = "Staff"
    ) -> Payment:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError("Invoice not found.")
        if invoice.status in ["paid", "cancelled"]:
            raise ValueError(f"Cannot record payment against invoice with status '{invoice.status}'.")

        if amount <= Decimal("0.00"):
            raise ValueError("Payment amount must be greater than zero.")

        if amount > invoice.balance_due:
            raise ValueError(f"Payment amount ({amount}) exceeds invoice remaining balance ({invoice.balance_due}).")

        ref = PaymentService.generate_payment_reference(db)

        payment = Payment(
            payment_reference=ref,
            customer_id=customer_id,
            method=method,
            payment_type="manual",
            amount=amount,
            currency=invoice.currency,
            payment_date=utcnow(),
            status="successful",
            notes=notes
        )
        db.add(payment)
        db.flush()

        # Allocate payment to invoice
        allocation = PaymentAllocation(
            payment_id=payment.id,
            invoice_id=invoice.id,
            allocated_amount=amount
        )
        db.add(allocation)

        # Update invoice balance and status
        invoice.amount_paid += amount
        invoice.balance_due -= amount
        prev_status = invoice.status
        if invoice.balance_due <= Decimal("0.0001"):
            invoice.status = "paid"
            invoice.balance_due = Decimal("0.0000")
        else:
            invoice.status = "partially_paid"

        db.add(InvoiceStatusHistory(
            invoice_id=invoice.id,
            previous_status=prev_status,
            new_status=invoice.status,
            changed_by=user_name,
            reason=f"Manual payment received ({ref}: {invoice.currency} {amount})"
        ))

        AuditService.log_action(
            db=db,
            action="PAYMENT_RECORDED",
            entity_type="Payment",
            entity_id=payment.id,
            user_id=performed_by_user_id,
            new_values={
                "payment_reference": ref,
                "amount": str(amount),
                "invoice_id": invoice_id,
                "method": method
            }
        )

        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def record_online_payment(
        db: Session,
        customer_id: int,
        invoice_id: int,
        amount: Decimal,
        method: str, # upi, card, netbanking
        gateway_order_id: str,
        gateway_payment_id: str,
        gateway_response: Optional[str] = None
    ) -> Payment:
        # Check idempotency on gateway_payment_id
        existing_tx = db.query(PaymentTransaction).filter(
            PaymentTransaction.gateway_payment_id == gateway_payment_id
        ).first()
        if existing_tx:
            # Already processed idempotently
            return existing_tx.payment

        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError("Invoice not found.")

        ref = PaymentService.generate_payment_reference(db, prefix="PAY-RZP-")

        payment = Payment(
            payment_reference=ref,
            customer_id=customer_id,
            method=method,
            payment_type="online",
            amount=amount,
            currency=invoice.currency,
            payment_date=utcnow(),
            status="successful",
            notes=f"Razorpay online payment {gateway_payment_id}"
        )
        db.add(payment)
        db.flush()

        tx = PaymentTransaction(
            payment_id=payment.id,
            gateway_name="Razorpay",
            gateway_order_id=gateway_order_id,
            gateway_payment_id=gateway_payment_id,
            gateway_status="captured",
            response_reference=gateway_response
        )
        db.add(tx)

        # Allocate
        alloc_amount = min(amount, invoice.balance_due)
        allocation = PaymentAllocation(
            payment_id=payment.id,
            invoice_id=invoice.id,
            allocated_amount=alloc_amount
        )
        db.add(allocation)

        # Update invoice
        invoice.amount_paid += alloc_amount
        invoice.balance_due = max(Decimal("0.0000"), invoice.balance_due - alloc_amount)
        prev_status = invoice.status
        if invoice.balance_due <= Decimal("0.0001"):
            invoice.status = "paid"
        else:
            invoice.status = "partially_paid"

        db.add(InvoiceStatusHistory(
            invoice_id=invoice.id,
            previous_status=prev_status,
            new_status=invoice.status,
            changed_by="RAZORPAY_GATEWAY",
            reason=f"Online payment captured (Order {gateway_order_id}, Payment {gateway_payment_id})"
        ))

        AuditService.log_action(
            db=db,
            action="ONLINE_PAYMENT_CAPTURED",
            entity_type="Payment",
            entity_id=payment.id,
            new_values={
                "gateway_payment_id": gateway_payment_id,
                "amount": str(amount),
                "invoice_id": invoice_id
            }
        )

        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def process_refund(
        db: Session,
        payment_id: int,
        amount: Decimal,
        reason: str,
        performed_by_user_id: Optional[int] = None,
        user_name: str = "Staff"
    ) -> Refund:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise ValueError("Payment not found.")
        if payment.status not in ["successful", "partially_refunded"]:
            raise ValueError(f"Cannot refund payment with status '{payment.status}'.")

        # Calculate already refunded amount
        existing_refunds = db.query(Refund).filter(
            Refund.payment_id == payment.id,
            Refund.status == "successful"
        ).all()
        already_refunded = sum([r.amount for r in existing_refunds], Decimal("0.0000"))

        max_refundable = payment.amount - already_refunded
        if amount > max_refundable:
            raise ValueError(f"Refund amount ({amount}) exceeds maximum refundable amount ({max_refundable}).")

        refund_ref = PaymentService.generate_refund_reference(db)
        gateway_refund_id = None

        # If online payment via Razorpay, call gateway
        if payment.payment_type == "online" and payment.transaction:
            adapter = RazorpayAdapter()
            try:
                rzp_refund = adapter.process_refund(
                    razorpay_payment_id=payment.transaction.gateway_payment_id,
                    amount=amount,
                    notes={"refund_reference": refund_ref, "reason": reason}
                )
                gateway_refund_id = rzp_refund.get("id")
            except Exception as e:
                raise ValueError(f"Razorpay refund failed: {str(e)}")

        refund = Refund(
            payment_id=payment.id,
            refund_reference=refund_ref,
            amount=amount,
            reason=reason,
            status="successful",
            gateway_refund_id=gateway_refund_id,
            created_at=utcnow()
        )
        db.add(refund)

        # Update invoice balance due to reversal of allocation
        for alloc in payment.allocations:
            inv = alloc.invoice
            if inv:
                inv.amount_paid = max(Decimal("0.0000"), inv.amount_paid - amount)
                inv.balance_due = inv.grand_total - inv.amount_paid
                prev_status = inv.status
                if inv.balance_due >= inv.grand_total:
                    inv.status = "confirmed"
                elif inv.balance_due > Decimal("0.0000"):
                    inv.status = "partially_paid"
                db.add(InvoiceStatusHistory(
                    invoice_id=inv.id,
                    previous_status=prev_status,
                    new_status=inv.status,
                    changed_by=user_name,
                    reason=f"Refund issued ({refund_ref}: {payment.currency} {amount})"
                ))

        if (already_refunded + amount) >= payment.amount:
            payment.status = "refunded"
        else:
            payment.status = "partially_refunded"

        AuditService.log_action(
            db=db,
            action="PAYMENT_REFUNDED",
            entity_type="Refund",
            entity_id=refund.id,
            user_id=performed_by_user_id,
            new_values={
                "refund_reference": refund_ref,
                "amount": str(amount),
                "payment_id": payment_id,
                "reason": reason
            }
        )

        db.commit()
        db.refresh(refund)
        return refund

