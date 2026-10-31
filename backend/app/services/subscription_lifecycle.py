from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.database import utcnow
from app.models.subscription import Subscription, SubscriptionLine, SubscriptionEvent
from app.models.quotation import Quotation
from app.models.product import Plan
from app.models.operational import SystemSetting

class SubscriptionLifecycleService:
    @staticmethod
    def generate_subscription_number(db: Session) -> str:
        prefix_setting = db.query(SystemSetting).filter(SystemSetting.setting_key == "subscription_prefix").first()
        prefix = prefix_setting.setting_value if prefix_setting else "SUB-"
        year = datetime.now(timezone.utc).year
        count = db.query(Subscription).count() + 1
        return f"{prefix}{year}-{count:05d}"

    @staticmethod
    def convert_quotation(
        db: Session,
        quotation_id: int,
        performed_by: str = "SYSTEM"
    ) -> Subscription:
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            raise ValueError("Quotation not found.")
        if quotation.status != "accepted":
            raise ValueError(f"Quotation cannot be converted because its status is '{quotation.status}'. Must be 'accepted'.")

        # Check existing subscription
        existing_sub = db.query(Subscription).filter(Subscription.quotation_id == quotation_id).first()
        if existing_sub:
            raise ValueError(f"Quotation has already been converted to subscription {existing_sub.subscription_number}.")

        # Find plan from lines or first line
        plan_id = None
        for line in quotation.lines:
            if line.plan_id:
                plan_id = line.plan_id
                break
        if not plan_id:
            # Fallback to default or first active plan
            first_plan = db.query(Plan).filter(Plan.status == "active").first()
            if not first_plan:
                raise ValueError("No active plan available for subscription.")
            plan_id = first_plan.id

        plan = db.query(Plan).filter(Plan.id == plan_id).first()

        sub_number = SubscriptionLifecycleService.generate_subscription_number(db)
        today = date.today()

        subscription = Subscription(
            subscription_number=sub_number,
            customer_id=quotation.customer_id,
            quotation_id=quotation.id,
            plan_id=plan.id,
            status="confirmed",
            start_date=today,
            expiry_date=None, # Ongoing unless plan specifies
            next_billing_date=today,
            billing_interval=plan.billing_interval,
            interval_count=plan.interval_count,
            payment_terms_days=15,
            currency=quotation.currency,
            auto_renew=plan.allow_renewal
        )
        db.add(subscription)
        db.flush()

        # Copy lines
        for q_line in quotation.lines:
            net_amt = (q_line.unit_price * q_line.quantity) - q_line.discount_amount
            tax_rate = Decimal("0.0000")
            if net_amt > Decimal("0.0000") and q_line.tax_amount > Decimal("0.0000"):
                tax_rate = (q_line.tax_amount / net_amt) * Decimal("100.0")

            sub_line = SubscriptionLine(
                subscription_id=subscription.id,
                product_id=q_line.product_id,
                variant_id=q_line.variant_id,
                description_snapshot=q_line.description_snapshot,
                quantity=q_line.quantity,
                unit_price=q_line.unit_price,
                tax_snapshot=tax_rate,
                discount_snapshot=q_line.discount_amount,
                line_total=q_line.line_total
            )
            db.add(sub_line)

        # Log event
        db.add(SubscriptionEvent(
            subscription_id=subscription.id,
            event_type="converted_from_quotation",
            previous_status="quotation",
            new_status="confirmed",
            reason=f"Converted from accepted quotation {quotation.quotation_number}",
            performed_by=performed_by
        ))

        # Mark quotation converted
        quotation.status = "converted"
        db.commit()
        db.refresh(subscription)
        return subscription

    @staticmethod
    def activate(db: Session, subscription_id: int, performed_by: str = "SYSTEM") -> Subscription:
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            raise ValueError("Subscription not found.")
        if sub.status == "active":
            return sub

        prev_status = sub.status
        sub.status = "active"
        if not sub.next_billing_date:
            sub.next_billing_date = date.today()

        db.add(SubscriptionEvent(
            subscription_id=sub.id,
            event_type="activated",
            previous_status=prev_status,
            new_status="active",
            reason="Subscription activated",
            performed_by=performed_by
        ))
        db.commit()
        db.refresh(sub)
        return sub

    @staticmethod
    def pause(db: Session, subscription_id: int, reason: str, performed_by: str = "SYSTEM") -> Subscription:
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            raise ValueError("Subscription not found.")
        if sub.status != "active":
            raise ValueError(f"Cannot pause subscription with status '{sub.status}'.")

        if not sub.plan.allow_pause:
            raise ValueError("The subscription plan does not allow pausing.")

        sub.status = "paused"
        db.add(SubscriptionEvent(
            subscription_id=sub.id,
            event_type="paused",
            previous_status="active",
            new_status="paused",
            reason=reason or "Customer/Staff requested pause",
            performed_by=performed_by
        ))
        db.commit()
        db.refresh(sub)
        return sub

    @staticmethod
    def resume(db: Session, subscription_id: int, performed_by: str = "SYSTEM") -> Subscription:
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            raise ValueError("Subscription not found.")
        if sub.status != "paused":
            raise ValueError(f"Cannot resume subscription with status '{sub.status}'.")

        sub.status = "active"
        # Reset next billing date to today if it was in the past
        if sub.next_billing_date and sub.next_billing_date < date.today():
            sub.next_billing_date = date.today()

        db.add(SubscriptionEvent(
            subscription_id=sub.id,
            event_type="resumed",
            previous_status="paused",
            new_status="active",
            reason="Subscription resumed from pause",
            performed_by=performed_by
        ))
        db.commit()
        db.refresh(sub)
        return sub

    @staticmethod
    def close(db: Session, subscription_id: int, reason: str, performed_by: str = "SYSTEM") -> Subscription:
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            raise ValueError("Subscription not found.")
        if sub.status == "closed":
            return sub

        prev_status = sub.status
        sub.status = "closed"
        db.add(SubscriptionEvent(
            subscription_id=sub.id,
            event_type="closed",
            previous_status=prev_status,
            new_status="closed",
            reason=reason or "Subscription closed",
            performed_by=performed_by
        ))
        db.commit()
        db.refresh(sub)
        return sub

    @staticmethod
    def renew(db: Session, subscription_id: int, performed_by: str = "SYSTEM") -> Subscription:
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            raise ValueError("Subscription not found.")
        if not sub.plan.allow_renewal:
            raise ValueError("Plan does not permit renewal.")

        # If sub has expiry_date, extend by 1 year or interval
        if sub.expiry_date:
            from app.services.billing_engine import add_calendar_interval
            sub.expiry_date = add_calendar_interval(sub.expiry_date, sub.billing_interval, sub.interval_count)
        
        if sub.status == "closed":
            sub.status = "active"

        db.add(SubscriptionEvent(
            subscription_id=sub.id,
            event_type="renewed",
            previous_status=sub.status,
            new_status="active",
            reason="Subscription term renewed",
            performed_by=performed_by
        ))
        db.commit()
        db.refresh(sub)
        return sub
