from typing import Optional, List
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

class DiscountCreate(BaseModel):
    name: str
    discount_type: str = "percentage" # percentage, fixed
    value: Decimal
    minimum_purchase: Decimal = Decimal("0.00")
    minimum_quantity: int = 1
    start_date: date
    end_date: date
    usage_limit: Optional[int] = None
    scope: str = "all" # all, product, subscription
    product_ids: List[int] = []

class DiscountOut(BaseModel):
    id: int
    name: str
    discount_type: str
    value: Decimal
    minimum_purchase: Decimal
    minimum_quantity: int
    start_date: date
    end_date: date
    usage_limit: Optional[int] = None
    usage_count: int
    scope: str
    status: str

    class Config:
        from_attributes = True

