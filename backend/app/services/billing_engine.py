import calendar
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import utcnow
from app.models.subscription import Subscription, SubscriptionBillingPeriod, SubscriptionEvent
from app.models.invoice import Invoice, InvoiceLine, InvoiceStatusHistory
from app.models.operational import BillingJob, SystemSetting
from app.models.customer import Customer
from app.services.financial_calculator import FinancialCalculator

def add_calendar_interval(start_date: date, interval: str, count: int = 1) -> date:
    """
    Computes the end date for a billing period using calendar arithmetic with month-end clamping.
    """
    if interval == "daily":
        return start_date + timedelta(days=count)
    elif interval == "weekly":
        return start_date + timedelta(weeks=count)
    elif interval == "monthly":
        new_year = start_date.year + (start_date.month + count - 1) // 12
        new_month = (start_date.month + count - 1) % 12 + 1
        _, max_day = calendar.monthrange(new_year, new_month)
        new_day = min(start_date.day, max_day)
        return date(new_year, new_month, new_day)
    elif interval == "yearly":
        new_year = start_date.year + count
        # Handle leap year Feb 29
        if start_date.month == 2 and start_date.day == 29 and not calendar.isleap(new_year):
            return date(new_year, 2, 28)
        return date(new_year, start_date.month, start_date.day)
    return start_date + timedelta(days=30 * count)

class BillingEngine:
    @staticmethod
    def generate_invoice_number(db: Session) -> str:
        prefix_setting = db.query(SystemSetting).filter(SystemSetting.setting_key == "invoice_prefix").first()
        prefix = prefix_setting.setting_value if prefix_setting else "INV-"
        current_year = datetime.now(timezone.utc).year
        # Count existing invoices this year
        count = db.query(Invoice).count() + 1
        return f"{prefix}{current_year}-{count:05d}"

    @staticmethod
    def bill_subscription(
        db: Session,
        subscription: Subscription,
        as_of_date: Optional[date] = None
    ) -> Tuple[Optional[Invoice], str]:
        """
        Processes a single subscription for billing.
        Returns (Invoice, message).
        """
        if subscription.status != "active":
            return None, f"Subscription status is {subscription.status}, not eligible for billing."

        target_date = as_of_date or date.today()
        if not subscription.next_billing_date or subscription.next_billing_date > target_date:
            return None, f"Subscription is not due for billing (next billing date: {subscription.next_billing_date})."

        period_start = subscription.next_billing_date
        period_end = add_calendar_interval(
            period_start,
            subscription.billing_interval,
            subscription.interval_count
        )

        # Check existing billing period (prevent duplicate billing)
        existing_period = db.query(SubscriptionBillingPeriod).filter(
            SubscriptionBillingPeriod.subscription_id == subscription.id,
            SubscriptionBillingPeriod.period_start == period_start,
            SubscriptionBillingPeriod.period_end == period_end
        ).first()

        if existing_period and existing_period.billing_status == "billed":
            # Advance billing date if stuck
            subscription.next_billing_date = period_end
            db.commit()
            return None, "Billing period was already billed. Duplicate prevented."

        # Calculate invoice lines from subscription lines
        invoice_lines_data = []
        raw_lines = []
        for s_line in subscription.lines:
            raw_lines.append({
                "product_id": s_line.product_id,
                "description_snapshot": s_line.description_snapshot,
                "unit_price": Decimal(str(s_line.unit_price)),
                "quantity": s_line.quantity,
                "discount_amount": Decimal(str(s_line.discount_snapshot)),
                "tax_rate": Decimal(str(s_line.tax_snapshot))
            })

        calc_result = FinancialCalculator.calculate_document(raw_lines, overall_discount=None)

        # Create Invoice
        invoice_number = BillingEngine.generate_invoice_number(db)
        invoice_date = date.today()
        due_date = invoice_date + timedelta(days=subscription.payment_terms_days)

        invoice = Invoice(
            invoice_number=invoice_number,
            customer_id=subscription.customer_id,
            subscription_id=subscription.id,
            billing_period_start=period_start,
            billing_period_end=period_end,
            invoice_date=invoice_date,
            due_date=due_date,
            status="confirmed",
            currency=subscription.currency,
            subtotal=calc_result["subtotal"],
            discount_total=calc_result["discount_total"],
            tax_total=calc_result["tax_total"],
            grand_total=calc_result["grand_total"],
            amount_paid=Decimal("0.0000"),
            balance_due=calc_result["grand_total"]
        )
        db.add(invoice)
        db.flush()

        for c_line in calc_result["lines"]:
            inv_line = InvoiceLine(
                invoice_id=invoice.id,
                product_id=c_line["product_id"],
                description_snapshot=c_line["description_snapshot"],
                quantity=c_line["quantity"],
                unit_price=c_line["unit_price"],
                discount_amount=c_line["discount_amount"],
                taxable_amount=c_line["taxable_amount"],
                tax_rate_snapshot=c_line["tax_rate"],
                tax_amount=c_line["tax_amount"],
                line_total=c_line["line_total"]
            )
            db.add(inv_line)

        # Add initial invoice status history
        db.add(InvoiceStatusHistory(
            invoice_id=invoice.id,
            previous_status="draft",
            new_status="confirmed",
            changed_by="BILLING_SCHEDULER",
            reason="Automatic recurring billing"
        ))

        # Record or update billing period
        if existing_period:
            existing_period.billing_status = "billed"
            existing_period.invoice_id = invoice.id
        else:
            db.add(SubscriptionBillingPeriod(
                subscription_id=subscription.id,
                period_start=period_start,
                period_end=period_end,
                billing_status="billed",
                invoice_id=invoice.id
            ))

        # Advance subscription next_billing_date
        subscription.next_billing_date = period_end

        # Check if subscription reached expiry
        if subscription.expiry_date and period_end >= subscription.expiry_date:
            if not subscription.auto_renew:
                subscription.status = "closed"
                db.add(SubscriptionEvent(
                    subscription_id=subscription.id,
                    event_type="closed",
                    previous_status="active",
                    new_status="closed",
                    reason="Reached contract expiry date",
                    performed_by="BILLING_SCHEDULER"
                ))

        db.commit()
        db.refresh(invoice)
        return invoice, f"Invoice {invoice.invoice_number} generated successfully."

    @staticmethod
    def run_billing_batch(db: Session, as_of_date: Optional[date] = None) -> Dict[str, Any]:
        """
        Finds all active subscriptions due for billing and processes them.
        """
        target_date = as_of_date or date.today()
        eligible_subs = db.query(Subscription).filter(
            Subscription.status == "active",
            Subscription.next_billing_date <= target_date
        ).all()

        results = {
            "processed": len(eligible_subs),
            "invoices_generated": 0,
            "errors": []
        }

        for sub in eligible_subs:
            job = BillingJob(
                subscription_id=sub.id,
                period_start=sub.next_billing_date,
                period_end=add_calendar_interval(sub.next_billing_date, sub.billing_interval, sub.interval_count),
                status="processing",
                attempts=1
            )
            db.add(job)
            db.commit()

            try:
                inv, msg = BillingEngine.bill_subscription(db, sub, target_date)
                if inv:
                    job.status = "completed"
                    job.processed_at = utcnow()
                    results["invoices_generated"] += 1
                else:
                    job.status = "skipped"
                    job.error_message = msg
                db.commit()
            except Exception as e:
                db.rollback()
                job.status = "failed"
                job.error_message = str(e)
                db.commit()
                results["errors"].append({"subscription_id": sub.id, "error": str(e)})

        return results

