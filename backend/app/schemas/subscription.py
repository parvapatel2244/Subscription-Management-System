from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel

class SubscriptionLineOut(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    description_snapshot: str
    quantity: int
    unit_price: Decimal
    tax_snapshot: Decimal
    discount_snapshot: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class SubscriptionEventOut(BaseModel):
    id: int
    event_type: str
    previous_status: Optional[str] = None
    new_status: str
    event_date: datetime
    reason: Optional[str] = None
    performed_by: Optional[str] = None

    class Config:
        from_attributes = True

class SubscriptionOut(BaseModel):
    id: int
    subscription_number: str
    customer_id: int
    quotation_id: Optional[int] = None
    plan_id: int
    status: str
    start_date: date
    expiry_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    billing_interval: str
    interval_count: int
    payment_terms_days: int
    currency: str
    auto_renew: bool
    created_at: datetime
    lines: List[SubscriptionLineOut] = []
    events: List[SubscriptionEventOut] = []

    class Config:
        from_attributes = True

class SubscriptionPauseRequest(BaseModel):
    reason: str

class SubscriptionCloseRequest(BaseModel):
    reason: str

