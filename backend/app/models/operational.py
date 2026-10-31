from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Date
from sqlalchemy.orm import relationship
from app.core.database import Base, utcnow, IDType

class BillingJob(Base):
    __tablename__ = "billing_jobs"

    id = Column(IDType, primary_key=True, autoincrement=True)
    subscription_id = Column(IDType, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    status = Column(String(30), default="pending", nullable=False, index=True) # pending, processing, completed, failed, skipped
    attempts = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(IDType, primary_key=True, autoincrement=True)
    user_id = Column(IDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(IDType, primary_key=True, autoincrement=True)
    recipient = Column(String(255), nullable=False, index=True)
    template_code = Column(String(50), nullable=False)
    status = Column(String(30), default="sent", nullable=False)
    provider_reference = Column(String(100), nullable=True)
    sent_at = Column(DateTime, default=utcnow, nullable=False)
    error_message = Column(Text, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(IDType, primary_key=True, autoincrement=True)
    user_id = Column(IDType, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(50), nullable=True)
    old_values = Column(Text, nullable=True)
    new_values = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(IDType, primary_key=True, autoincrement=True)
    setting_key = Column(String(100), unique=True, nullable=False, index=True)
    setting_value = Column(Text, nullable=False)
    setting_group = Column(String(50), default="general", nullable=False)


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(IDType, primary_key=True, autoincrement=True)
    provider = Column(String(50), nullable=False)
    event_id = Column(String(100), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    payload = Column(Text, nullable=False)
    processing_status = Column(String(30), default="pending", nullable=False) # pending, processed, failed, ignored
    processed_at = Column(DateTime, nullable=True)


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    id = Column(IDType, primary_key=True, autoincrement=True)
    key_hash = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(IDType, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    endpoint = Column(String(255), nullable=False)
    request_hash = Column(String(64), nullable=False)
    response_reference = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=False)
