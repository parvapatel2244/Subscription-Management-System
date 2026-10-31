from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db, utcnow
from app.models.operational import Notification
from app.api.deps import get_current_user

router = APIRouter()

@router.get("")
def list_notifications(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "read_at": n.read_at,
            "created_at": n.created_at
        }
        for n in notifs
    ]

@router.patch("/{notif_id}/read")
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    n = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if n:
        n.read_at = utcnow()
        db.commit()
    return {"success": True}

@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read_at.is_(None)
    ).update({"read_at": utcnow()})
    db.commit()
    return {"success": True}

