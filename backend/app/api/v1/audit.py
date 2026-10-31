from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.operational import AuditLog
from app.api.deps import get_current_user, require_permission

router = APIRouter()

@router.get("")
def list_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("audit.view"))
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "old_values": l.old_values,
            "new_values": l.new_values,
            "ip_address": l.ip_address,
            "created_at": l.created_at
        }
        for l in logs
    ]

