from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db, utcnow
from app.core.security import get_password_hash, validate_password_strength
from app.models.user import User, Role, Permission, UserRole, RolePermission
from app.schemas.auth import UserOut, StaffCreate, RoleOut, PermissionOut
from app.api.deps import get_current_user, require_permission, require_super_admin

router = APIRouter()

@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("staff.manage"))
):
    users = db.query(User).order_by(User.id.desc()).all()
    out = []
    for u in users:
        perms = set()
        for r in u.roles:
            for p in r.permissions:
                perms.add(p.code)
        out.append(UserOut(
            id=u.id,
            name=u.name,
            email=u.email,
            status=u.status,
            email_verified_at=u.email_verified_at,
            roles=u.roles,
            permissions=list(perms),
            customer_id=u.customer.id if u.customer else None
        ))
    return out

@router.post("/staff", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_staff(
    payload: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("staff.manage"))
):
    normalized = payload.email.lower().strip()
    if db.query(User).filter(User.normalized_email == normalized).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    is_valid, msg = validate_password_strength(payload.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    role = db.query(Role).filter(Role.id == payload.role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected role does not exist.")

    # Only Super Admin can create another Super Admin
    if role.code == "SUPER_ADMIN" and not any(r.code == "SUPER_ADMIN" for r in current_user.roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Administrators can create other Super Administrators."
        )

    user = User(
        name=payload.name.strip(),
        email=payload.email,
        normalized_email=normalized,
        password_hash=get_password_hash(payload.password),
        status="active",
        email_verified_at=utcnow()
    )
    db.add(user)
    db.flush()

    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.commit()
    db.refresh(user)

    perms = [p.code for p in role.permissions]
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        status=user.status,
        email_verified_at=user.email_verified_at,
        roles=[role],
        permissions=perms
    )

@router.get("/roles", response_model=List[RoleOut])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Role).all()

@router.get("/permissions", response_model=List[PermissionOut])
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("role.manage"))
):
    return db.query(Permission).order_by(Permission.module.asc()).all()

@router.put("/roles/{role_id}/permissions")
def update_role_permissions(
    role_id: int,
    permission_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("role.manage"))
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    if role.code == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Cannot alter Super Admin system role permissions.")

    db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
    for pid in permission_ids:
        db.add(RolePermission(role_id=role.id, permission_id=pid))
    db.commit()
    return {"success": True, "message": "Permissions updated successfully."}

@router.post("/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("staff.manage"))
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.status = "deactivated"
    db.commit()
    return {"success": True, "message": "User deactivated."}

