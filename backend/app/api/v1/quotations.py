from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db, utcnow
from app.models.quotation import Quotation, QuotationLine, QuotationTemplate, QuotationTemplateLine
from app.models.customer import Customer
from app.models.product import Product, ProductVariant, Plan
from app.schemas.quotation import (
    QuotationCreate,
    QuotationOut,
    QuotationTemplateCreate,
    QuotationTemplateOut
)
from app.schemas.subscription import SubscriptionOut
from app.services.financial_calculator import FinancialCalculator
from app.services.subscription_lifecycle import SubscriptionLifecycleService
from app.services.pdf_service import PDFService
from app.api.deps import get_current_user, require_permission

router = APIRouter()

@router.get("/templates", response_model=List[QuotationTemplateOut])
def list_templates(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(QuotationTemplate).filter(QuotationTemplate.status == "active").all()

@router.post("/templates", response_model=QuotationTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: QuotationTemplateCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("quotation.create"))
):
    tmpl = QuotationTemplate(
        name=payload.name.strip(),
        description=payload.description,
        validity_days=payload.validity_days,
        status="active"
    )
    db.add(tmpl)
    db.flush()

    for line in payload.lines:
        t_line = QuotationTemplateLine(
            template_id=tmpl.id,
            product_id=line.product_id,
            variant_id=line.variant_id,
            plan_id=line.plan_id,
            quantity=line.quantity,
            unit_price=line.unit_price or Decimal("0.00")
        )
        db.add(t_line)

    db.commit()
    db.refresh(tmpl)
    return tmpl

@router.get("", response_model=List[QuotationOut])
def list_quotations(
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role_codes = {r.code for r in current_user.roles}
    query = db.query(Quotation)
    if "CUSTOMER" in role_codes and "SUPER_ADMIN" not in role_codes and "STAFF_ADMIN" not in role_codes:
        if not current_user.customer:
            return []
        query = query.filter(Quotation.customer_id == current_user.customer.id)
    elif customer_id:
        query = query.filter(Quotation.customer_id == customer_id)

    if status:
        query = query.filter(Quotation.status == status)

    return query.order_by(Quotation.created_at.desc()).all()

@router.post("", response_model=QuotationOut, status_code=status.HTTP_201_CREATED)
def create_quotation(
    payload: QuotationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("quotation.create"))
):
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    if not payload.lines:
        raise HTTPException(status_code=400, detail="Quotation must contain at least one line.")

    if payload.expiry_date <= payload.issue_date:
        raise HTTPException(status_code=400, detail="Expiry date must be later than issue date.")

    count = db.query(Quotation).count() + 1
    year = datetime.now(timezone.utc).year
    q_num = f"QTN-{year}-{count:05d}"

    # Calculate lines
    calc_lines = []
    for l in payload.lines:
        prod = db.query(Product).filter(Product.id == l.product_id).first()
        if not prod:
            raise HTTPException(status_code=400, detail=f"Product ID {l.product_id} not found.")

        # Unit price
        unit_price = l.unit_price
        if unit_price is None:
            unit_price = prod.sales_price
            if l.variant_id:
                var = db.query(ProductVariant).filter(ProductVariant.id == l.variant_id).first()
                if var:
                    unit_price += var.price_adjustment

        desc = l.description or prod.name
        calc_lines.append({
            "product_id": prod.id,
            "variant_id": l.variant_id,
            "plan_id": l.plan_id,
            "description_snapshot": desc,
            "quantity": l.quantity,
            "unit_price": unit_price,
            "discount_amount": l.discount_amount,
            "tax_rate": l.tax_rate
        })

    doc_totals = FinancialCalculator.calculate_document(calc_lines)

    quotation = Quotation(
        quotation_number=q_num,
        customer_id=customer.id,
        template_id=payload.template_id,
        status="draft",
        issue_date=payload.issue_date,
        expiry_date=payload.expiry_date,
        currency=payload.currency,
        subtotal=doc_totals["subtotal"],
        discount_total=doc_totals["discount_total"],
        tax_total=doc_totals["tax_total"],
        grand_total=doc_totals["grand_total"]
    )
    db.add(quotation)
    db.flush()

    for item in doc_totals["lines"]:
        ql = QuotationLine(
            quotation_id=quotation.id,
            product_id=item["product_id"],
            variant_id=item["variant_id"],
            plan_id=item["plan_id"],
            description_snapshot=item["description_snapshot"],
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            discount_amount=item["discount_amount"],
            tax_amount=item["tax_amount"],
            line_total=item["line_total"]
        )
        db.add(ql)

    db.commit()
    db.refresh(quotation)
    return quotation

@router.get("/{quotation_id}", response_model=QuotationOut)
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    # Isolation check
    role_codes = {r.code for r in current_user.roles}
    if "CUSTOMER" in role_codes and "SUPER_ADMIN" not in role_codes and "STAFF_ADMIN" not in role_codes:
        if not current_user.customer or current_user.customer.id != quotation.customer_id:
            raise HTTPException(status_code=403, detail="Access denied.")

    return quotation

@router.post("/{quotation_id}/send")
def send_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("quotation.send"))
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")
    quotation.status = "sent"
    db.commit()
    return {"success": True, "message": "Quotation marked as sent."}

@router.post("/{quotation_id}/accept")
def accept_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if quotation.expiry_date < date.today():
        quotation.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Cannot accept an expired quotation.")

    if quotation.status in ["rejected", "converted"]:
        raise HTTPException(status_code=400, detail=f"Cannot accept quotation in '{quotation.status}' state.")

    quotation.status = "accepted"
    quotation.accepted_at = utcnow()
    db.commit()
    return {"success": True, "message": "Quotation accepted successfully."}

@router.post("/{quotation_id}/reject")
def reject_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")
    quotation.status = "rejected"
    db.commit()
    return {"success": True, "message": "Quotation rejected."}

@router.post("/{quotation_id}/convert", response_model=SubscriptionOut)
def convert_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        sub = SubscriptionLifecycleService.convert_quotation(
            db=db,
            quotation_id=quotation_id,
            performed_by=current_user.name
        )
        return sub
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{quotation_id}/pdf")
def download_quotation_pdf(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    pdf_bytes = PDFService.generate_quotation_pdf(quotation)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={quotation.quotation_number}.pdf"}
    )

