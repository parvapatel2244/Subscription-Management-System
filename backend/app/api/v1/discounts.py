from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.discount import Discount, DiscountProduct
from app.schemas.discount import DiscountCreate, DiscountOut
from app.api.deps import get_current_user, require_permission

router = APIRouter()

@router.get("", response_model=List[DiscountOut])
def list_discounts(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Discount).order_by(Discount.id.desc()).all()

@router.post("", response_model=DiscountOut, status_code=status.HTTP_201_CREATED)
def create_discount(
    payload: DiscountCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("discount.manage"))
):
    if payload.discount_type == "percentage" and (payload.value <= 0 or payload.value > 100):
        raise HTTPException(status_code=400, detail="Percentage discount must be between 0 and 100.")
    if payload.discount_type == "fixed" and payload.value <= 0:
        raise HTTPException(status_code=400, detail="Fixed discount amount must be greater than zero.")
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date cannot precede start date.")

    discount = Discount(
        name=payload.name.strip(),
        discount_type=payload.discount_type,
        value=payload.value,
        minimum_purchase=payload.minimum_purchase,
        minimum_quantity=payload.minimum_quantity,
        start_date=payload.start_date,
        end_date=payload.end_date,
        usage_limit=payload.usage_limit,
        usage_count=0,
        scope=payload.scope,
        status="active"
    )
    db.add(discount)
    db.flush()

    for pid in payload.product_ids:
        db.add(DiscountProduct(discount_id=discount.id, product_id=pid))

    db.commit()
    db.refresh(discount)
    return discount

@router.post("/validate")
def validate_discount(
    discount_id: int,
    subtotal: Decimal,
    quantity: int = 1,
    db: Session = Depends(get_db)
):
    disc = db.query(Discount).filter(Discount.id == discount_id).first()
    if not disc or disc.status != "active":
        return {"valid": False, "reason": "Discount does not exist or is inactive."}

    today = date.today()
    if today < disc.start_date or today > disc.end_date:
        return {"valid": False, "reason": "Discount is outside of its valid date window."}

    if disc.usage_limit and disc.usage_count >= disc.usage_limit:
        return {"valid": False, "reason": "Discount usage limit has been reached."}

    if subtotal < disc.minimum_purchase:
        return {"valid": False, "reason": f"Minimum purchase of {disc.minimum_purchase} required."}

    if quantity < disc.minimum_quantity:
        return {"valid": False, "reason": f"Minimum quantity of {disc.minimum_quantity} required."}

    # Calculate discount amount
    if disc.discount_type == "percentage":
        amount = round(subtotal * disc.value / Decimal("100.0"), 2)
    else:
        amount = min(disc.value, subtotal)

    return {"valid": True, "discount_amount": float(amount), "name": disc.name}

