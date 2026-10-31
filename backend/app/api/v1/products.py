from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.product import Product, ProductVariant
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, VariantCreate, VariantOut
from app.api.deps import get_current_user, require_permission

router = APIRouter()

@router.get("", response_model=List[ProductOut])
def list_products(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Product)
    if status:
        query = query.filter(Product.status == status)
    else:
        query = query.filter(Product.status != "archived")
    return query.order_by(Product.name.asc()).all()

@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("product.manage"))
):
    # Check code uniqueness
    if db.query(Product).filter(Product.product_code == payload.product_code.strip()).first():
        raise HTTPException(status_code=400, detail="Product code already exists.")

    if payload.sales_price < 0 or payload.cost_price < 0:
        raise HTTPException(status_code=400, detail="Prices cannot be negative.")

    product = Product(
        name=payload.name.strip(),
        product_code=payload.product_code.strip().upper(),
        product_type=payload.product_type,
        sales_price=payload.sales_price,
        cost_price=payload.cost_price,
        description=payload.description,
        notes=payload.notes,
        status="active"
    )
    db.add(product)
    db.flush()

    for v in payload.variants:
        variant = ProductVariant(
            product_id=product.id,
            variant_name=v.variant_name.strip(),
            variant_code=v.variant_code.strip().upper(),
            price_adjustment=v.price_adjustment,
            status="active"
        )
        db.add(variant)

    db.commit()
    db.refresh(product)
    return product

@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product

@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("product.manage"))
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    if payload.name is not None:
        product.name = payload.name.strip()
    if payload.sales_price is not None:
        if payload.sales_price < 0:
            raise HTTPException(status_code=400, detail="Sales price cannot be negative.")
        product.sales_price = payload.sales_price
    if payload.cost_price is not None:
        if payload.cost_price < 0:
            raise HTTPException(status_code=400, detail="Cost price cannot be negative.")
        product.cost_price = payload.cost_price
    if payload.description is not None:
        product.description = payload.description
    if payload.notes is not None:
        product.notes = payload.notes
    if payload.status is not None:
        product.status = payload.status

    db.commit()
    db.refresh(product)
    return product

@router.post("/{product_id}/archive")
def archive_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("product.manage"))
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product.status = "archived"
    db.commit()
    return {"success": True, "message": "Product archived."}

@router.post("/{product_id}/variants", response_model=VariantOut, status_code=status.HTTP_201_CREATED)
def create_variant(
    product_id: int,
    payload: VariantCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("product.manage"))
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    variant = ProductVariant(
        product_id=product.id,
        variant_name=payload.variant_name.strip(),
        variant_code=payload.variant_code.strip().upper(),
        price_adjustment=payload.price_adjustment,
        status="active"
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant

@router.get("/{product_id}/price")
def calculate_price(
    product_id: int,
    variant_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    base_price = Decimal(str(product.sales_price))
    adjustment = Decimal("0.00")

    if variant_id:
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == variant_id,
            ProductVariant.product_id == product.id
        ).first()
        if variant:
            adjustment = Decimal(str(variant.price_adjustment))

    unit_price = base_price + adjustment
    return {
        "base_price": float(base_price),
        "price_adjustment": float(adjustment),
        "unit_price": float(unit_price)
    }

