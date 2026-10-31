from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.customer import Customer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token."
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload invalid."
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is {user.status}."
        )

    return user

def require_permission(perm_code: str):
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_perm_codes = set()
        for role in current_user.roles:
            if role.code == "SUPER_ADMIN":
                return current_user # Super Admin has unrestricted access
            for p in role.permissions:
                user_perm_codes.add(p.code)

        if perm_code not in user_perm_codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Missing required permission '{perm_code}'."
            )
        return current_user
    return permission_checker

def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    role_codes = {r.code for r in current_user.roles}
    if "SUPER_ADMIN" not in role_codes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to Super Administrators only."
        )
    return current_user

def get_current_customer(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Customer:
    """Enforces customer isolation: customer identity is resolved from the authenticated user only."""
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No customer profile linked to this user account."
        )
    return customer

