import io
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

from app.models.subscription import Subscription
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment, Refund

class ReportService:
    @staticmethod
    def get_dashboard_overview(db: Session) -> Dict[str, Any]:
        today = date.today()

        # Active subscriptions
        active_subs_count = db.query(Subscription).filter(Subscription.status == "active").count()
        total_customers = db.query(Customer).filter(Customer.status != "archived").count()

        # Revenue received = successful payments - refunds
        total_payments = db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).filter(
            Payment.status == "successful"
        ).scalar()

        total_refunds = db.query(func.coalesce(func.sum(Refund.amount), Decimal("0.00"))).filter(
            Refund.status == "successful"
        ).scalar()

        net_revenue = Decimal(str(total_payments)) - Decimal(str(total_refunds))

        # Outstanding balance
        outstanding = db.query(func.coalesce(func.sum(Invoice.balance_due), Decimal("0.00"))).filter(
            Invoice.status.in_(["confirmed", "partially_paid", "overdue"])
        ).scalar()

        # Overdue invoices
        overdue_query = db.query(Invoice).filter(
            Invoice.status.in_(["confirmed", "partially_paid", "overdue"]),
            Invoice.due_date < today,
            Invoice.balance_due > Decimal("0.00")
        )
        overdue_count = overdue_query.count()
        overdue_amount = db.query(func.coalesce(func.sum(Invoice.balance_due), Decimal("0.00"))).filter(
            Invoice.status.in_(["confirmed", "partially_paid", "overdue"]),
            Invoice.due_date < today,
            Invoice.balance_due > Decimal("0.00")
        ).scalar()

        # Calculate MRR for active subscriptions
        active_subs = db.query(Subscription).filter(Subscription.status == "active").all()
        mrr = Decimal("0.00")
        for sub in active_subs:
            # Calculate recurring value of lines
            sub_val = sum([Decimal(str(l.line_total)) for l in sub.lines], Decimal("0.00"))
            interval = sub.billing_interval.lower()
            count = max(1, sub.interval_count)
            if interval == "monthly":
                mrr += sub_val / Decimal(count)
            elif interval == "yearly":
                mrr += sub_val / (Decimal("12.0") * Decimal(count))
            elif interval == "weekly":
                mrr += (sub_val * Decimal("52.0")) / (Decimal("12.0") * Decimal(count))
            elif interval == "daily":
                mrr += (sub_val * Decimal("365.0")) / (Decimal("12.0") * Decimal(count))

        arr = mrr * Decimal("12.0")

        # Collection rate: Total paid / Grand total of issued invoices * 100
        total_invoiced = db.query(func.coalesce(func.sum(Invoice.grand_total), Decimal("0.00"))).filter(
            Invoice.status.in_(["confirmed", "partially_paid", "paid", "overdue"])
        ).scalar()
        collection_rate = Decimal("0.00")
        if total_invoiced > Decimal("0.00"):
            collection_rate = (Decimal(str(total_payments)) / Decimal(str(total_invoiced))) * Decimal("100.0")

        return {
            "active_subscriptions": active_subs_count,
            "total_customers": total_customers,
            "revenue_received": float(net_revenue),
            "total_outstanding": float(outstanding),
            "overdue_invoices_count": overdue_count,
            "overdue_amount": float(overdue_amount),
            "mrr": float(round(mrr, 2)),
            "arr": float(round(arr, 2)),
            "collection_rate": float(round(collection_rate, 2)),
            "currency": "INR"
        }

    @staticmethod
    def get_revenue_report(db: Session, start_date: Optional[date] = None, end_date: Optional[date] = None) -> List[Dict[str, Any]]:
        # Group payments by month
        payments = db.query(Payment).filter(Payment.status == "successful").order_by(Payment.payment_date.asc()).all()
        grouped: Dict[str, Decimal] = {}
        for p in payments:
            m_key = p.payment_date.strftime("%Y-%m")
            grouped[m_key] = grouped.get(m_key, Decimal("0.00")) + Decimal(str(p.amount))

        result = []
        for m_key, amt in grouped.items():
            result.append({"month": m_key, "amount": float(amt)})
        return result

    @staticmethod
    def export_invoices_excel(db: Session) -> bytes:
        wb = Workbook()
        ws = wb.active
        ws.title = "Invoices Report"

        # Headers
        headers = ["Invoice #", "Customer", "Date", "Due Date", "Status", "Currency", "Subtotal", "Tax", "Discount", "Total", "Paid", "Balance Due"]
        ws.append(headers)

        header_font = Font(name="Calibri", bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="0369A1", end_color="0369A1", fill_type="solid")
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        invoices = db.query(Invoice).order_by(Invoice.created_at.desc()).all()
        for inv in invoices:
            ws.append([
                inv.invoice_number,
                inv.customer.company_name if inv.customer else "",
                str(inv.invoice_date),
                str(inv.due_date),
                inv.status.upper(),
                inv.currency,
                float(inv.subtotal),
                float(inv.tax_total),
                float(inv.discount_total),
                float(inv.grand_total),
                float(inv.amount_paid),
                float(inv.balance_due)
            ])

        # Auto-adjust column widths
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = col[0].column_letter
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = io.BytesIO()
        wb.save(output)
        bytes_data = output.getvalue()
        output.close()
        return bytes_data

