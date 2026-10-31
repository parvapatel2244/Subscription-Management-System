from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

class CustomerAddressSchema(BaseModel):
    id: Optional[int] = None
    address_type: str = "billing"
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    is_default: bool = True

    class Config:
        from_attributes = True

class CustomerBillingProfileSchema(BaseModel):
    currency: str = "INR"
    billing_email: EmailStr
    payment_terms_days: int = 15
    tax_number: Optional[str] = None

    class Config:
        from_attributes = True

class CustomerCreate(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: Optional[str] = None
    tax_number: Optional[str] = None
    address: Optional[CustomerAddressSchema] = None
    billing_email: Optional[EmailStr] = None
    payment_terms_days: Optional[int] = 15

class CustomerUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    tax_number: Optional[str] = None
    status: Optional[str] = None

class CustomerOut(BaseModel):
    id: int
    customer_code: str
    company_name: str
    contact_name: str
    email: str
    phone: Optional[str] = None
    tax_number: Optional[str] = None
    status: str
    created_at: datetime
    addresses: List[CustomerAddressSchema] = []
    billing_profile: Optional[CustomerBillingProfileSchema] = None

    class Config:
        from_attributes = True

