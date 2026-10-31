import json
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models.operational import AuditLog

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[Any] = None,
        user_id: Optional[int] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            old_values=json.dumps(old_values, default=str) if old_values else None,
            new_values=json.dumps(new_values, default=str) if new_values else None,
            ip_address=ip_address
        )
        db.add(audit_entry)
        db.commit()
        return audit_entry

