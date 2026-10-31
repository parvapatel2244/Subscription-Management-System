from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.report_service import ReportService
from app.api.deps import get_current_user, require_permission

router = APIRouter()

@router.get("/dashboard/overview")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ReportService.get_dashboard_overview(db)

@router.get("/revenue")
def get_revenue_report(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return ReportService.get_revenue_report(db)

@router.get("/export/invoices")
def export_invoices_excel(
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("reports.view"))
):
    excel_bytes = ReportService.export_invoices_excel(db)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=invoices_report.xlsx"}
    )

