from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.operational import SystemSetting
from app.api.deps import get_current_user, require_permission

router = APIRouter()

@router.get("")
def get_settings(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    settings_list = db.query(SystemSetting).all()
    return {s.setting_key: s.setting_value for s in settings_list}

@router.patch("")
def update_settings(
    updates: Dict[str, str],
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("settings.manage"))
):
    for key, val in updates.items():
        s = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
        if s:
            s.setting_value = str(val)
        else:
            db.add(SystemSetting(setting_key=key, setting_value=str(val), setting_group="general"))
    db.commit()
    return {"success": True, "message": "Settings updated."}

