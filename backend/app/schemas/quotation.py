from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel

class QuotationLineCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    plan_id: Optional[int] = None
    description: Optional[str] = None
    quantity: int = 1
    unit_price: Optional[Decimal] = None
    discount_amount: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("0.00")

class QuotationLineOut(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    plan_id: Optional[int] = None
    description_snapshot: str
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class QuotationCreate(BaseModel):
    customer_id: int
    template_id: Optional[int] = None
    issue_date: date
    expiry_date: date
    currency: str = "INR"
    lines: List[QuotationLineCreate]

class QuotationOut(BaseModel):
    id: int
    quotation_number: str
    customer_id: int
    template_id: Optional[int] = None
    status: str
    issue_date: date
    expiry_date: date
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    grand_total: Decimal
    accepted_at: Optional[datetime] = None
    lines: List[QuotationLineOut] = []

    class Config:
        from_attributes = True

class QuotationTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    validity_days: int = 30
    lines: List[QuotationLineCreate] = []

class QuotationTemplateOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    validity_days: int
    status: str

    class Config:
        from_attributes = True

