from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str
    company_name: Optional[str] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class VerifyEmailRequest(BaseModel):
    token: str

class RoleOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    is_system_role: bool

    class Config:
        from_attributes = True

class PermissionOut(BaseModel):
    id: int
    code: str
    module: str
    description: str

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    status: str
    email_verified_at: Optional[datetime] = None
    roles: List[RoleOut] = []
    permissions: List[str] = []
    customer_id: Optional[int] = None

    class Config:
        from_attributes = True

class StaffCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str
    role_id: int

