from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base, utcnow, IDType

class User(Base):
    __tablename__ = "users"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    normalized_email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(30), default="active", nullable=False) # active, pending_verification, deactivated
    email_verified_at = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    roles = relationship("Role", secondary="user_roles", back_populates="users", lazy="joined")
    customer = relationship("Customer", back_populates="user", uselist=False)
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "roles"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_system_role = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    users = relationship("User", secondary="user_roles", back_populates="roles")
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles", lazy="joined")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(IDType, primary_key=True, index=True, autoincrement=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    module = Column(String(50), nullable=False)
    description = Column(String(255), nullable=False)

    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")


class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(IDType, primary_key=True, autoincrement=True)
    user_id = Column(IDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(IDType, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_role"),)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(IDType, primary_key=True, autoincrement=True)
    role_id = Column(IDType, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(IDType, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(IDType, primary_key=True, autoincrement=True)
    user_id = Column(IDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(IDType, primary_key=True, autoincrement=True)
    user_id = Column(IDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(IDType, primary_key=True, autoincrement=True)
    user_id = Column(IDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
