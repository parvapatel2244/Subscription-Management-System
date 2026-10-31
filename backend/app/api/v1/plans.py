from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.product import Plan, PlanProduct, PlanPrice, Tax, Product
from app.schemas.product import PlanCreate, PlanOut, TaxCreate, TaxOut
from app.api.deps import get_current_user, require_permission

router = APIRouter()

VALID_FREQUENCIES = {"daily", "weekly", "monthly", "yearly"}

@router.get("", response_model=List[PlanOut])
def list_plans(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Plan)
    if status:
        query = query.filter(Plan.status == status)
    else:
        query = query.filter(Plan.status != "archived")
    return query.order_by(Plan.name.asc()).all()

@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PlanCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("plan.manage"))
):
    if payload.billing_interval.lower() not in VALID_FREQUENCIES:
        raise HTTPException(status_code=400, detail=f"Billing frequency must be one of {VALID_FREQUENCIES}")

    if payload.interval_count < 1:
        raise HTTPException(status_code=400, detail="Interval count must be a positive integer.")

    if payload.minimum_quantity < 1:
        raise HTTPException(status_code=400, detail="Minimum quantity must be at least 1.")

    if payload.amount < 0:
        raise HTTPException(status_code=400, detail="Plan price cannot be negative.")

    if payload.available_from and payload.available_until and payload.available_until < payload.available_from:
        raise HTTPException(status_code=400, detail="Available until date cannot be before available from date.")

    if db.query(Plan).filter(Plan.plan_code == payload.plan_code.strip()).first():
        raise HTTPException(status_code=400, detail="Plan code already exists.")

    plan = Plan(
        name=payload.name.strip(),
        plan_code=payload.plan_code.strip().upper(),
        description=payload.description,
        billing_interval=payload.billing_interval.lower(),
        interval_count=payload.interval_count,
        minimum_quantity=payload.minimum_quantity,
        available_from=payload.available_from,
        available_until=payload.available_until,
        auto_close=payload.auto_close,
        allow_early_close=payload.allow_early_close,
        allow_pause=payload.allow_pause,
        allow_renewal=payload.allow_renewal,
        status="active"
    )
    db.add(plan)
    db.flush()

    # Plan price
    pp = PlanPrice(
        plan_id=plan.id,
        currency=payload.currency,
        amount=payload.amount,
        effective_from=date.today()
    )
    db.add(pp)

    # Associate products
    for pid in payload.product_ids:
        prod = db.query(Product).filter(Product.id == pid).first()
        if prod:
            db.add(PlanProduct(
                plan_id=plan.id,
                product_id=prod.id,
                default_quantity=1
            ))

    db.commit()
    db.refresh(plan)
    return plan

# --- Taxes (Must be placed before dynamic /{plan_id} routes) ---

@router.get("/taxes", response_model=List[TaxOut])
@router.get("/taxes/list", response_model=List[TaxOut])
def list_taxes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return db.query(Tax).filter(Tax.status == "active").all()

@router.post("/taxes", response_model=TaxOut, status_code=status.HTTP_201_CREATED)
def create_tax(
    payload: TaxCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("tax.manage"))
):
    if payload.rate < 0:
        raise HTTPException(status_code=400, detail="Tax rate cannot be negative.")

    if db.query(Tax).filter(Tax.tax_code == payload.tax_code.strip()).first():
        raise HTTPException(status_code=400, detail="Tax code already exists.")

    tax = Tax(
        name=payload.name.strip(),
        tax_code=payload.tax_code.strip().upper(),
        tax_type=payload.tax_type,
        rate=payload.rate,
        effective_from=payload.effective_from,
        effective_until=payload.effective_until,
        status="active"
    )
    db.add(tax)
    db.commit()
    db.refresh(tax)
    return tax

@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")
    return plan

@router.post("/{plan_id}/activate")
def activate_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("plan.manage"))
):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")
    plan.status = "active"
    db.commit()
    return {"success": True, "message": "Plan activated."}

@router.post("/{plan_id}/archive")
def archive_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("plan.manage"))
):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")
    plan.status = "archived"
    db.commit()
    return {"success": True, "message": "Plan archived."}

