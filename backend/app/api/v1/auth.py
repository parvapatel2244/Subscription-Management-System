import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, utcnow
from app.core.security import (
    verify_password,
    get_password_hash,
    validate_password_strength,
    create_access_token,
    create_refresh_token,
    hash_token
)
from app.models.user import User, Role, UserRole, RefreshToken, PasswordResetToken, EmailVerificationToken
from app.models.customer import Customer, CustomerAddress, CustomerBillingProfile
from app.models.operational import Notification, AuditLog
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    UserOut
)
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_customer(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    # 1. Normalize email
    normalized_email = payload.email.lower().strip()

    # 2. Check email uniqueness
    existing_user = db.query(User).filter(User.normalized_email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 3. Validate password strength
    is_valid, msg = validate_password_strength(payload.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # 4. Hash password
    pwd_hash = get_password_hash(payload.password)

    # 5. Create user
    user = User(
        name=payload.name.strip(),
        email=payload.email,
        normalized_email=normalized_email,
        password_hash=pwd_hash,
        status="active", # Available for login directly or after verify
        email_verified_at=utcnow()
    )
    db.add(user)
    db.flush()

    # 6. Assign CUSTOMER role
    customer_role = db.query(Role).filter(Role.code == "CUSTOMER").first()
    if customer_role:
        db.add(UserRole(user_id=user.id, role_id=customer_role.id))

    # 7. Create customer record
    from sqlalchemy import func
    max_id = db.query(func.coalesce(func.max(Customer.id), 0)).scalar()
    cust_code = f"CUST-{(max_id + 1):05d}"
    company_name = payload.company_name or f"{payload.name}'s Organization"
    customer = Customer(
        user_id=user.id,
        customer_code=cust_code,
        company_name=company_name,
        contact_name=payload.name,
        email=payload.email,
        phone=payload.phone,
        status="active"
    )
    db.add(customer)
    db.flush()

    # Create default address & billing profile
    address = CustomerAddress(
        customer_id=customer.id,
        address_type="billing",
        address_line1="123 Business Way",
        city="Mumbai",
        state="Maharashtra",
        postal_code="400001",
        country="India",
        is_default=True
    )
    db.add(address)

    billing_profile = CustomerBillingProfile(
        customer_id=customer.id,
        currency="INR",
        billing_email=payload.email,
        payment_terms_days=15
    )
    db.add(billing_profile)

    # 8. Create Email verification token
    raw_token = secrets.token_urlsafe(32)
    db.add(EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=utcnow() + timedelta(hours=24)
    ))

    # Welcome Notification
    db.add(Notification(
        user_id=user.id,
        notification_type="registration",
        title="Welcome to Brightloop",
        message="Your account has been registered successfully."
    ))

    db.commit()

    return {
        "success": True,
        "message": "Registration successful. You can now log in.",
        "verification_token_debug": raw_token
    }

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    normalized_email = payload.email.lower().strip()
    user = db.query(User).filter(User.normalized_email == normalized_email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status}. Please contact support."
        )

    # Update last login
    user.last_login_at = utcnow()

    # Generate tokens
    access_token = create_access_token(subject=user.id)
    raw_refresh_token, refresh_hash, refresh_expires = create_refresh_token(subject=user.id)

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=refresh_expires
    ))
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    t_hash = hash_token(payload.refresh_token)
    token_record = db.query(RefreshToken).filter(
        RefreshToken.token_hash == t_hash,
        RefreshToken.revoked_at.is_(None)
    ).first()

    if not token_record or token_record.expires_at < utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or expired."
        )

    # Revoke old refresh token (Token rotation)
    token_record.revoked_at = utcnow()

    # Issue new pair
    user = token_record.user
    new_access = create_access_token(subject=user.id)
    new_raw_refresh, new_refresh_hash, new_refresh_expires = create_refresh_token(subject=user.id)

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=new_refresh_hash,
        expires_at=new_refresh_expires
    ))
    db.commit()

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_raw_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    t_hash = hash_token(payload.token)
    record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == t_hash,
        EmailVerificationToken.used_at.is_(None)
    ).first()

    if not record or record.expires_at < utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token is invalid or has expired."
        )

    record.used_at = utcnow()
    user = db.query(User).filter(User.id == record.user_id).first()
    if user:
        user.email_verified_at = utcnow()
        user.status = "active"

    db.commit()
    return {"success": True, "message": "Email verified successfully."}

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    normalized = payload.email.lower().strip()
    user = db.query(User).filter(User.normalized_email == normalized).first()
    
    # Generic response to prevent account enumeration
    token_debug = None
    if user:
        raw_token = secrets.token_urlsafe(32)
        token_debug = raw_token
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=utcnow() + timedelta(hours=2)
        ))
        db.commit()

    return {
        "success": True,
        "message": "If an account with that email exists, password reset instructions have been sent.",
        "reset_token_debug": token_debug
    }

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    t_hash = hash_token(payload.token)
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == t_hash,
        PasswordResetToken.used_at.is_(None)
    ).first()

    if not record or record.expires_at < utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token is invalid or has expired."
        )

    is_valid, msg = validate_password_strength(payload.new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found.")

    user.password_hash = get_password_hash(payload.new_password)
    record.used_at = utcnow()

    # Revoke all existing refresh tokens for security
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": utcnow()})

    db.commit()
    return {"success": True, "message": "Password reset successfully. You can now log in."}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    user_perm_codes = set()
    is_super_admin = any(r.code == "SUPER_ADMIN" for r in current_user.roles)
    for role in current_user.roles:
        for p in role.permissions:
            user_perm_codes.add(p.code)

    return UserOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        status=current_user.status,
        email_verified_at=current_user.email_verified_at,
        roles=[
            {"id": r.id, "name": r.name, "code": r.code, "description": r.description, "is_system_role": r.is_system_role}
            for r in current_user.roles
        ],
        permissions=list(user_perm_codes) if not is_super_admin else ["*"],
        customer_id=current_user.customer.id if current_user.customer else None
    )

@router.post("/logout")
def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    t_hash = hash_token(payload.refresh_token)
    token_record = db.query(RefreshToken).filter(RefreshToken.token_hash == t_hash).first()
    if token_record:
        token_record.revoked_at = utcnow()
        db.commit()
    return {"success": True, "message": "Logged out successfully."}
