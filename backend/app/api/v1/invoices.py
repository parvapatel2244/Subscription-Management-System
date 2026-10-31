from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db, utcnow
from app.models.invoice import Invoice, InvoiceStatusHistory
from app.schemas.invoice import InvoiceOut
from app.services.pdf_service import PDFService
from app.api.deps import get_current_user, require_permission

router = APIRouter()

@router.get("", response_model=List[InvoiceOut])
def list_invoices(
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role_codes = {r.code for r in current_user.roles}
    query = db.query(Invoice)
    if "CUSTOMER" in role_codes and "SUPER_ADMIN" not in role_codes and "STAFF_ADMIN" not in role_codes:
        if not current_user.customer:
            return []
        query = query.filter(Invoice.customer_id == current_user.customer.id)
    elif customer_id:
        query = query.filter(Invoice.customer_id == customer_id)

    if status:
        query = query.filter(Invoice.status == status)

    return query.order_by(Invoice.created_at.desc()).all()

@router.get("/overdue", response_model=List[InvoiceOut])
def list_overdue_invoices(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    today = date.today()
    return db.query(Invoice).filter(
        Invoice.status.in_(["confirmed", "partially_paid", "overdue"]),
        Invoice.due_date < today,
        Invoice.balance_due > 0
    ).order_by(Invoice.due_date.asc()).all()

@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    role_codes = {r.code for r in current_user.roles}
    if "CUSTOMER" in role_codes and "SUPER_ADMIN" not in role_codes and "STAFF_ADMIN" not in role_codes:
        if not current_user.customer or current_user.customer.id != inv.customer_id:
            raise HTTPException(status_code=403, detail="Access denied.")

    return inv

@router.post("/{invoice_id}/confirm")
def confirm_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("invoice.confirm"))
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    if inv.status != "draft":
        raise HTTPException(status_code=400, detail=f"Cannot confirm invoice in '{inv.status}' status.")

    prev = inv.status
    inv.status = "confirmed"
    db.add(InvoiceStatusHistory(
        invoice_id=inv.id,
        previous_status=prev,
        new_status="confirmed",
        changed_by=current_user.name,
        reason="Confirmed manually"
    ))
    db.commit()
    return {"success": True, "message": "Invoice confirmed."}

@router.post("/{invoice_id}/cancel")
def cancel_invoice(
    invoice_id: int,
    reason: str = "Authorized cancellation",
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("invoice.cancel"))
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    if inv.amount_paid > 0:
        raise HTTPException(status_code=400, detail="Cannot cancel an invoice with payments already recorded. Process refunds first.")

    prev = inv.status
    inv.status = "cancelled"
    db.add(InvoiceStatusHistory(
        invoice_id=inv.id,
        previous_status=prev,
        new_status="cancelled",
        changed_by=current_user.name,
        reason=reason
    ))
    db.commit()
    return {"success": True, "message": "Invoice cancelled."}

@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    pdf_bytes = PDFService.generate_invoice_pdf(inv)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={inv.invoice_number}.pdf"}
    )

