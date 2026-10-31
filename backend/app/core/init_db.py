from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.permissions import ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS
from app.models.user import User, Role, Permission, UserRole, RolePermission
from app.models.operational import SystemSetting

ROLE_METADATA = {
    "SUPER_ADMIN": {"name": "Super Administrator", "description": "Full unrestricted system access"},
    "STAFF_ADMIN": {"name": "Staff Administrator", "description": "Configurable administrative access"},
    "SALES_STAFF": {"name": "Sales Staff", "description": "Customers, quotations, and subscription operations"},
    "BILLING_STAFF": {"name": "Billing Staff", "description": "Billing, invoices, and payments"},
    "FINANCE_STAFF": {"name": "Finance Staff", "description": "Payments, receivables, and financial reports"},
    "CUSTOMER": {"name": "Customer", "description": "Customer self-service portal access"}
}

DEFAULT_SETTINGS = [
    {"setting_key": "currency", "setting_value": settings.DEFAULT_CURRENCY, "setting_group": "financial"},
    {"setting_key": "timezone", "setting_value": settings.DEFAULT_TIMEZONE, "setting_group": "general"},
    {"setting_key": "quotation_prefix", "setting_value": "QTN-", "setting_group": "billing"},
    {"setting_key": "subscription_prefix", "setting_value": "SUB-", "setting_group": "billing"},
    {"setting_key": "invoice_prefix", "setting_value": "INV-", "setting_group": "billing"},
    {"setting_key": "payment_prefix", "setting_value": "PAY-", "setting_group": "payment"},
    {"setting_key": "refund_prefix", "setting_value": "REF-", "setting_group": "payment"},
    {"setting_key": "month_end_policy", "setting_value": "clamp", "setting_group": "billing"},
    {"setting_key": "tax_mode", "setting_value": "exclusive", "setting_group": "financial"},
    {"setting_key": "razorpay_key_id", "setting_value": settings.RAZORPAY_KEY_ID, "setting_group": "payment"},
]

def init_db(db: Session) -> None:
    # 1. Seed Permissions
    existing_perms = {p.code: p for p in db.query(Permission).all()}
    for perm_data in ALL_PERMISSIONS:
        if perm_data["code"] not in existing_perms:
            perm = Permission(
                code=perm_data["code"],
                module=perm_data["module"],
                description=perm_data["description"]
            )
            db.add(perm)
    db.commit()

    # Re-fetch permissions map
    perm_map = {p.code: p for p in db.query(Permission).all()}

    # 2. Seed Roles
    existing_roles = {r.code: r for r in db.query(Role).all()}
    for role_code, meta in ROLE_METADATA.items():
        role = existing_roles.get(role_code)
        if not role:
            role = Role(
                code=role_code,
                name=meta["name"],
                description=meta["description"],
                is_system_role=True
            )
            db.add(role)
            db.commit()
            db.refresh(role)
            existing_roles[role_code] = role

        # Ensure role has appropriate permissions
        desired_perm_codes = DEFAULT_ROLE_PERMISSIONS.get(role_code, [])
        current_perm_ids = {p.id for p in role.permissions}
        for code in desired_perm_codes:
            p = perm_map.get(code)
            if p and p.id not in current_perm_ids:
                db.add(RolePermission(role_id=role.id, permission_id=p.id))
        db.commit()

    # 3. Seed Super Admin User
    admin_email_norm = settings.SUPER_ADMIN_EMAIL.lower().strip()
    admin_user = db.query(User).filter(User.normalized_email == admin_email_norm).first()
    if not admin_user:
        admin_user = User(
            name=settings.SUPER_ADMIN_NAME,
            email=settings.SUPER_ADMIN_EMAIL,
            normalized_email=admin_email_norm,
            password_hash=get_password_hash(settings.SUPER_ADMIN_PASSWORD),
            status="active",
            email_verified_at=datetime.now(timezone.utc),
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    # Ensure Super Admin role assignment
    super_admin_role = existing_roles.get("SUPER_ADMIN")
    if super_admin_role:
        has_role = db.query(UserRole).filter(
            UserRole.user_id == admin_user.id,
            UserRole.role_id == super_admin_role.id
        ).first()
        if not has_role:
            db.add(UserRole(user_id=admin_user.id, role_id=super_admin_role.id))
            db.commit()

    # 4. Seed Default Settings
    existing_settings = {s.setting_key: s for s in db.query(SystemSetting).all()}
    for item in DEFAULT_SETTINGS:
        if item["setting_key"] not in existing_settings:
            db.add(SystemSetting(
                setting_key=item["setting_key"],
                setting_value=item["setting_value"],
                setting_group=item["setting_group"]
            ))
    db.commit()

    # 5. Seed validated demo data across all modules if products are empty
    from app.models.product import Product
    if db.query(Product).count() == 0:
        from app.core.seed_demo_data import seed_all_demo_data
        seed_all_demo_data()

