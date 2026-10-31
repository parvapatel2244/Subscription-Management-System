from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

class PaymentAllocationOut(BaseModel):
    id: int
    invoice_id: int
    allocated_amount: Decimal

    class Config:
        from_attributes = True

class RefundOut(BaseModel):
    id: int
    payment_id: int
    refund_reference: str
    amount: Decimal
    reason: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentOut(BaseModel):
    id: int
    payment_reference: str
    customer_id: int
    method: str
    payment_type: str
    amount: Decimal
    currency: str
    payment_date: datetime
    status: str
    notes: Optional[str] = None
    allocations: List[PaymentAllocationOut] = []
    refunds: List[RefundOut] = []

    class Config:
        from_attributes = True

class ManualPaymentCreate(BaseModel):
    customer_id: int
    invoice_id: int
    amount: Decimal
    method: str = "bank_transfer"
    notes: Optional[str] = None

class OnlineOrderCreate(BaseModel):
    invoice_id: int

class OnlineOrderVerify(BaseModel):
    invoice_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class RefundCreate(BaseModel):
    amount: Decimal
    reason: str

