from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel

class InvoiceLineOut(BaseModel):
    id: int
    product_id: Optional[int] = None
    description_snapshot: str
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    tax_rate_snapshot: Decimal
    tax_amount: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    customer_id: int
    subscription_id: Optional[int] = None
    billing_period_start: Optional[date] = None
    billing_period_end: Optional[date] = None
    invoice_date: date
    due_date: date
    status: str
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    grand_total: Decimal
    amount_paid: Decimal
    balance_due: Decimal
    created_at: datetime
    lines: List[InvoiceLineOut] = []

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    customer_id: int
    subscription_id: Optional[int] = None
    due_date: date
    currency: str = "INR"
    lines: List[dict]

