from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel

class VariantCreate(BaseModel):
    variant_name: str
    variant_code: str
    price_adjustment: Decimal = Decimal("0.00")

class VariantOut(BaseModel):
    id: int
    product_id: int
    variant_name: str
    variant_code: str
    price_adjustment: Decimal
    status: str

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    product_code: str
    product_type: str = "software"
    sales_price: Decimal
    cost_price: Decimal = Decimal("0.00")
    description: Optional[str] = None
    notes: Optional[str] = None
    variants: List[VariantCreate] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sales_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class ProductOut(BaseModel):
    id: int
    name: str
    product_code: str
    product_type: str
    sales_price: Decimal
    cost_price: Decimal
    description: Optional[str] = None
    notes: Optional[str] = None
    status: str
    variants: List[VariantOut] = []

    class Config:
        from_attributes = True

class TaxCreate(BaseModel):
    name: str
    tax_code: str
    tax_type: str = "percentage"
    rate: Decimal
    effective_from: date
    effective_until: Optional[date] = None

class TaxOut(BaseModel):
    id: int
    name: str
    tax_code: str
    tax_type: str
    rate: Decimal
    status: str

    class Config:
        from_attributes = True

class PlanCreate(BaseModel):
    name: str
    plan_code: str
    description: Optional[str] = None
    billing_interval: str # daily, weekly, monthly, yearly
    interval_count: int = 1
    minimum_quantity: int = 1
    amount: Decimal
    currency: str = "INR"
    product_ids: List[int] = []
    available_from: Optional[date] = None
    available_until: Optional[date] = None
    auto_close: bool = True
    allow_early_close: bool = True
    allow_pause: bool = True
    allow_renewal: bool = True

class PlanOut(BaseModel):
    id: int
    name: str
    plan_code: str
    description: Optional[str] = None
    billing_interval: str
    interval_count: int
    minimum_quantity: int
    auto_close: bool
    allow_early_close: bool
    allow_pause: bool
    allow_renewal: bool
    status: str

    class Config:
        from_attributes = True

