"""
Comprehensive Demo Data Seeder for Brightloop Subscription Management System
Populates realistic, connected test data across all modules:
- Staff users across all RBAC roles
- Customers with billing profiles & addresses
- Products with variants and GST tax rules
- Subscription plans across all intervals (monthly, yearly, weekly, daily)
- Quotations across all lifecycle states (draft, sent, accepted, converted, rejected)
- Subscriptions across all states (active, paused, closed) with line items and history events
- Invoices across all statuses (draft, confirmed, paid, partially_paid, overdue)
- Manual and online payments with allocations and refunds
- Promotional discount rules
- Audit log trails
- User notifications
"""

import json
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from app.core.database import SessionLocal, Base, engine, utcnow
from app.core.security import get_password_hash
from app.models.user import User, Role, UserRole
from app.models.customer import Customer, CustomerAddress, CustomerBillingProfile
from app.models.product import Product, ProductVariant, Plan, Tax, ProductTax
from app.models.quotation import Quotation, QuotationLine
from app.models.subscription import Subscription, SubscriptionLine, SubscriptionEvent, SubscriptionBillingPeriod
from app.models.invoice import Invoice, InvoiceLine, InvoiceStatusHistory
from app.models.payment import Payment, PaymentAllocation, PaymentTransaction, Refund
from app.models.discount import Discount
from app.models.operational import Notification, AuditLog, SystemSetting
from app.services.financial_calculator import FinancialCalculator


def seed_all_demo_data():
    db = SessionLocal()
    try:
        print("[*] Starting Comprehensive Demo Data Seeding...")
        today = date.today()
        now = datetime.now(timezone.utc)

        # -------------------------------------------------------------
        # 1. ROLES LOOKUP
        # -------------------------------------------------------------
        roles = {r.code: r for r in db.query(Role).all()}
        if not roles:
            print("[!] System roles not found. Please run init_db first.")
            return

        # -------------------------------------------------------------
        # 2. INTERNAL STAFF USERS
        # -------------------------------------------------------------
        staff_accounts = [
            ("Staff Administrator", "staff.admin@brightloop.io", "StaffAdmin@2026!", "STAFF_ADMIN"),
            ("Sarah Jenkins (Sales)", "sales@brightloop.io", "SalesStaff@2026!", "SALES_STAFF"),
            ("Brian Cole (Billing)", "billing@brightloop.io", "BillingStaff@2026!", "BILLING_STAFF"),
            ("Fiona Gallagher (Finance)", "finance@brightloop.io", "FinanceStaff@2026!", "FINANCE_STAFF"),
        ]

        staff_users = {}
        for name, email, pwd, role_code in staff_accounts:
            norm = email.lower().strip()
            user = db.query(User).filter(User.normalized_email == norm).first()
            if not user:
                user = User(
                    name=name,
                    email=email,
                    normalized_email=norm,
                    password_hash=get_password_hash(pwd),
                    status="active",
                    email_verified_at=now - timedelta(days=60)
                )
                db.add(user)
                db.flush()
                db.add(UserRole(user_id=user.id, role_id=roles[role_code].id))
                db.commit()
                print(f"  + Created staff user: {email} ({role_code})")
            staff_users[role_code] = user

        # -------------------------------------------------------------
        # 3. TAXES (GST & VAT)
        # -------------------------------------------------------------
        tax_rules = [
            ("GST 18%", "GST18", "percentage", Decimal("18.00")),
            ("GST 12%", "GST12", "percentage", Decimal("12.00")),
            ("GST 5%", "GST5", "percentage", Decimal("5.00")),
            ("Tax Exempt 0%", "ZERO", "percentage", Decimal("0.00")),
        ]

        taxes = {}
        for name, code, ttype, rate in tax_rules:
            tax = db.query(Tax).filter(Tax.tax_code == code).first()
            if not tax:
                tax = Tax(name=name, tax_code=code, tax_type=ttype, rate=rate, effective_from=date(2024, 1, 1), status="active")
                db.add(tax)
                db.commit()
                db.refresh(tax)
            taxes[code] = tax

        # -------------------------------------------------------------
        # 4. PRODUCTS & VARIANTS
        # -------------------------------------------------------------
        products_data = [
            {
                "code": "PROD-ERP",
                "name": "Brightloop Cloud ERP",
                "type": "software",
                "sales_price": Decimal("2500.00"),
                "cost_price": Decimal("600.00"),
                "description": "Complete multi-module enterprise resource planning suite.",
                "tax_code": "GST18",
                "variants": [
                    ("Standard Edition", "ERP-STD", Decimal("0.00")),
                    ("Professional Edition", "ERP-PRO", Decimal("1500.00")),
                    ("Enterprise Dedicated", "ERP-ENT", Decimal("4000.00")),
                ]
            },
            {
                "code": "PROD-DB",
                "name": "High-Availability Managed Database",
                "type": "software",
                "sales_price": Decimal("1200.00"),
                "cost_price": Decimal("300.00"),
                "description": "Auto-scaling MySQL/Postgres cluster with instant automated failover.",
                "tax_code": "GST18",
                "variants": [
                    ("50 GB Fast NVMe", "DB-50G", Decimal("0.00")),
                    ("200 GB Fast NVMe", "DB-200G", Decimal("800.00")),
                    ("1 TB High-IOPS NVMe", "DB-1T", Decimal("2500.00")),
                ]
            },
            {
                "code": "PROD-SLA",
                "name": "24/7 Dedicated SLA & Support",
                "type": "service",
                "sales_price": Decimal("3000.00"),
                "cost_price": Decimal("800.00"),
                "description": "15-minute response guarantee with dedicated technical account manager.",
                "tax_code": "GST18",
                "variants": []
            },
            {
                "code": "PROD-ANALYTICS",
                "name": "Advanced Financial Analytics Suite",
                "type": "software",
                "sales_price": Decimal("1500.00"),
                "cost_price": Decimal("250.00"),
                "description": "Predictive churn modelling, cohort analysis, and revenue forecasting.",
                "tax_code": "GST18",
                "variants": []
            }
        ]

        products = {}
        variants = {}
        for pdata in products_data:
            p = db.query(Product).filter(Product.product_code == pdata["code"]).first()
            if not p:
                p = Product(
                    name=pdata["name"],
                    product_code=pdata["code"],
                    product_type=pdata["type"],
                    sales_price=pdata["sales_price"],
                    cost_price=pdata["cost_price"],
                    description=pdata["description"],
                    status="active"
                )
                db.add(p)
                db.flush()

                # Attach tax
                tax_obj = taxes.get(pdata["tax_code"])
                if tax_obj:
                    db.add(ProductTax(product_id=p.id, tax_id=tax_obj.id))

                # Attach variants
                for vname, vcode, vadj in pdata["variants"]:
                    v = ProductVariant(
                        product_id=p.id,
                        variant_name=vname,
                        variant_code=vcode,
                        price_adjustment=vadj,
                        status="active"
                    )
                    db.add(v)
                    db.flush()
                    variants[vcode] = v
                db.commit()
                db.refresh(p)
            products[pdata["code"]] = p

        # -------------------------------------------------------------
        # 5. PLANS
        # -------------------------------------------------------------
        plans_data = [
            ("Business Monthly", "PLAN-BIZ-M", "monthly", 1, True, True, True),
            ("Enterprise Annual Suite", "PLAN-ENT-Y", "yearly", 1, False, False, True),
            ("Growth Sprint Weekly", "PLAN-FLEX-W", "weekly", 1, True, True, True),
            ("Evaluation Daily Pilot", "PLAN-PILOT-D", "daily", 1, False, False, False),
        ]

        plans = {}
        for name, code, interval, icount, allow_p, allow_c, allow_r in plans_data:
            pl = db.query(Plan).filter(Plan.plan_code == code).first()
            if not pl:
                pl = Plan(
                    name=name,
                    plan_code=code,
                    billing_interval=interval,
                    interval_count=icount,
                    allow_pause=allow_p,
                    allow_early_close=allow_c,
                    allow_renewal=allow_r,
                    status="active"
                )
                db.add(pl)
                db.commit()
                db.refresh(pl)
            plans[code] = pl

        # -------------------------------------------------------------
        # 6. CUSTOMERS & USER PORTAL ACCOUNTS
        # -------------------------------------------------------------
        customers_seed = [
            {
                "company": "Acme Technologies Pvt Ltd",
                "contact": "Alice Johnson",
                "email": "alice@acme.com",
                "pwd": "Customer@2026!",
                "phone": "+91 9845012345",
                "tax_number": "GSTIN29AABCA1234B1Z5",
                "terms": 15,
                "addr": ("101 Silicon Valley Blvd", "Indiranagar", "Bengaluru", "Karnataka", "560038", "India")
            },
            {
                "company": "Nexus Dynamics Inc",
                "contact": "Robert Smith",
                "email": "robert@nexusdynamics.io",
                "pwd": "Customer@2026!",
                "phone": "+91 9711098765",
                "tax_number": "GSTIN27AACCN9876C1Z2",
                "terms": 30,
                "addr": ("Tower 4, Bandra Kurla Complex", "Bandra East", "Mumbai", "Maharashtra", "400051", "India")
            },
            {
                "company": "HyperScale Cloud Systems",
                "contact": "Sarah Connor",
                "email": "sarah@hyperscale.tv",
                "pwd": "Customer@2026!",
                "phone": "+91 9900011223",
                "tax_number": "GSTIN36AADCH5544K1ZS",
                "terms": 15,
                "addr": ("88 HITEC City Phase 2", "Madhapur", "Hyderabad", "Telangana", "500081", "India")
            },
            {
                "company": "Apex Freight Logistics",
                "contact": "David Miller",
                "email": "david@apexlogistics.in",
                "pwd": "Customer@2026!",
                "phone": "+91 9444088990",
                "tax_number": "GSTIN33AAACD9988P1ZN",
                "terms": 7,
                "addr": ("12 Port Terminal Road", "Harbour Zone", "Chennai", "Tamil Nadu", "600001", "India")
            }
        ]

        customers = {}
        for cdata in customers_seed:
            cust = db.query(Customer).filter(Customer.email == cdata["email"]).first()
            if not cust:
                # Count current customers
                c_count = db.query(Customer).count()
                cust = Customer(
                    customer_code=f"CUST-{(c_count + 1):05d}",
                    company_name=cdata["company"],
                    contact_name=cdata["contact"],
                    email=cdata["email"],
                    phone=cdata["phone"],
                    tax_number=cdata["tax_number"],
                    status="active"
                )
                db.add(cust)
                db.flush()

                # Address
                l1, l2, city, state, pin, country = cdata["addr"]
                db.add(CustomerAddress(
                    customer_id=cust.id,
                    address_type="billing",
                    address_line1=l1,
                    address_line2=l2,
                    city=city,
                    state=state,
                    postal_code=pin,
                    country=country,
                    is_default=True
                ))

                # Billing Profile
                db.add(CustomerBillingProfile(
                    customer_id=cust.id,
                    currency="INR",
                    billing_email=cdata["email"],
                    payment_terms_days=cdata["terms"],
                    tax_number=cdata["tax_number"]
                ))

                # Linked User Account
                c_user = db.query(User).filter(User.normalized_email == cdata["email"].lower()).first()
                if not c_user:
                    c_user = User(
                        name=cdata["contact"],
                        email=cdata["email"],
                        normalized_email=cdata["email"].lower(),
                        password_hash=get_password_hash(cdata["pwd"]),
                        status="active",
                        email_verified_at=now - timedelta(days=45)
                    )
                    db.add(c_user)
                    db.flush()
                    db.add(UserRole(user_id=c_user.id, role_id=roles["CUSTOMER"].id))

                cust.user_id = c_user.id
                db.commit()
                db.refresh(cust)
                print(f"  + Created customer & portal login: {cdata['company']} ({cust.customer_code})")
            customers[cdata["email"]] = cust


        # -------------------------------------------------------------
        # 7. DISCOUNTS & COUPONS
        # -------------------------------------------------------------
        discounts_data = [
            ("WELCOME10", "percentage", Decimal("10.00"), Decimal("1000.00"), 1, 100, 15),
            ("STARTUP500", "fixed", Decimal("500.00"), Decimal("2500.00"), 1, 50, 8),
            ("ENTERPRISE20", "percentage", Decimal("20.00"), Decimal("15000.00"), 1, 20, 3),
        ]

        for dname, dtype, dval, min_p, min_q, ulimit, ucount in discounts_data:
            disc = db.query(Discount).filter(Discount.name == dname).first()
            if not disc:
                disc = Discount(
                    name=dname,
                    discount_type=dtype,
                    value=dval,
                    minimum_purchase=min_p,
                    minimum_quantity=min_q,
                    start_date=today - timedelta(days=30),
                    end_date=today + timedelta(days=120),
                    usage_limit=ulimit,
                    usage_count=ucount,
                    scope="all_products",
                    status="active"
                )
                db.add(disc)
        db.commit()

        # -------------------------------------------------------------
        # 8. QUOTATIONS (Across Diverse States)
        # -------------------------------------------------------------
        # QTN 1: Acme Corp -> Converted to Subscription
        q1 = db.query(Quotation).filter(Quotation.quotation_number == "QTN-00001").first()
        if not q1:
            q1 = Quotation(
                quotation_number="QTN-00001",
                customer_id=customers["alice@acme.com"].id,
                status="converted",
                issue_date=today - timedelta(days=45),
                expiry_date=today - timedelta(days=15),
                currency="INR",
                subtotal=Decimal("4000.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("720.00"),
                grand_total=Decimal("4720.00"),
                created_at=now - timedelta(days=45)
            )
            db.add(q1)
            db.flush()
            # Lines
            db.add(QuotationLine(
                quotation_id=q1.id,
                product_id=products["PROD-ERP"].id,
                variant_id=None,
                plan_id=plans["PLAN-BIZ-M"].id,
                description_snapshot="Brightloop Cloud ERP (Standard Edition)",
                quantity=1,
                unit_price=Decimal("2500.00"),
                discount_amount=Decimal("0.00"),
                tax_amount=Decimal("450.00"),
                line_total=Decimal("2950.00")
            ))
            db.add(QuotationLine(
                quotation_id=q1.id,
                product_id=products["PROD-ANALYTICS"].id,
                variant_id=None,
                plan_id=plans["PLAN-BIZ-M"].id,
                description_snapshot="Advanced Financial Analytics Suite",
                quantity=1,
                unit_price=Decimal("1500.00"),
                discount_amount=Decimal("0.00"),
                tax_amount=Decimal("270.00"),
                line_total=Decimal("1770.00")
            ))
            db.commit()
            print("  + Seeded Quotation: QTN-00001 (Converted)")

        # QTN 2: Nexus Dynamics -> Sent (Awaiting Acceptance)
        q2 = db.query(Quotation).filter(Quotation.quotation_number == "QTN-00002").first()
        if not q2:
            q2 = Quotation(
                quotation_number="QTN-00002",
                customer_id=customers["robert@nexusdynamics.io"].id,
                status="sent",
                issue_date=today - timedelta(days=5),
                expiry_date=today + timedelta(days=25),
                currency="INR",
                subtotal=Decimal("30000.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("5400.00"),
                grand_total=Decimal("35400.00"),
                created_at=now - timedelta(days=5)
            )
            db.add(q2)
            db.flush()
            db.add(QuotationLine(
                quotation_id=q2.id,
                product_id=products["PROD-ERP"].id,
                variant_id=None,
                plan_id=plans["PLAN-ENT-Y"].id,
                description_snapshot="Brightloop Cloud ERP (Annual Enterprise Suite)",
                quantity=1,
                unit_price=Decimal("30000.00"),
                discount_amount=Decimal("0.00"),
                tax_amount=Decimal("5400.00"),
                line_total=Decimal("35400.00")
            ))
            db.commit()
            print("  + Seeded Quotation: QTN-00002 (Sent)")

        # QTN 3: HyperScale Media -> Draft
        q3 = db.query(Quotation).filter(Quotation.quotation_number == "QTN-00003").first()
        if not q3:
            q3 = Quotation(
                quotation_number="QTN-00003",
                customer_id=customers["sarah@hyperscale.tv"].id,
                status="draft",
                issue_date=today,
                expiry_date=today + timedelta(days=30),
                currency="INR",
                subtotal=Decimal("5500.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("990.00"),
                grand_total=Decimal("6490.00"),
                created_at=now
            )
            db.add(q3)
            db.flush()
            db.add(QuotationLine(
                quotation_id=q3.id,
                product_id=products["PROD-ERP"].id,
                variant_id=None,
                description_snapshot="Brightloop Cloud ERP + Managed DB",
                quantity=1,
                unit_price=Decimal("5500.00"),
                discount_amount=Decimal("0.00"),
                tax_amount=Decimal("990.00"),
                line_total=Decimal("6490.00")
            ))
            db.commit()
            print("  + Seeded Quotation: QTN-00003 (Draft)")

        # QTN 4: Apex Logistics -> Rejected
        q4 = db.query(Quotation).filter(Quotation.quotation_number == "QTN-00004").first()
        if not q4:
            q4 = Quotation(
                quotation_number="QTN-00004",
                customer_id=customers["david@apexlogistics.in"].id,
                status="rejected",
                issue_date=today - timedelta(days=20),
                expiry_date=today - timedelta(days=5),
                currency="INR",
                subtotal=Decimal("5000.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("900.00"),
                grand_total=Decimal("5900.00"),
                created_at=now - timedelta(days=20)
            )
            db.add(q4)
            db.commit()
            print("  + Seeded Quotation: QTN-00004 (Rejected)")

        # -------------------------------------------------------------
        # 9. SUBSCRIPTIONS (Lifecycle Stages)
        # -------------------------------------------------------------
        # SUB 1: Active Monthly Subscription (Acme Corp)
        s1 = db.query(Subscription).filter(Subscription.subscription_number == "SUB-00001").first()
        if not s1:
            s1 = Subscription(
                subscription_number="SUB-00001",
                customer_id=customers["alice@acme.com"].id,
                quotation_id=q1.id if q1 else None,
                plan_id=plans["PLAN-BIZ-M"].id,
                status="active",
                start_date=today - timedelta(days=40),
                next_billing_date=today + timedelta(days=20),
                billing_interval="monthly",
                interval_count=1,
                payment_terms_days=15,
                currency="INR",
                auto_renew=True,
                created_at=now - timedelta(days=40)
            )
            db.add(s1)
            db.flush()

            # Subscription Lines
            db.add(SubscriptionLine(
                subscription_id=s1.id,
                product_id=products["PROD-ERP"].id,
                description_snapshot="Brightloop Cloud ERP (Standard Edition)",
                quantity=1,
                unit_price=Decimal("2500.00"),
                tax_snapshot=Decimal("18.00"),
                discount_snapshot=Decimal("0.00"),
                line_total=Decimal("2950.00")
            ))
            db.add(SubscriptionLine(
                subscription_id=s1.id,
                product_id=products["PROD-ANALYTICS"].id,
                description_snapshot="Advanced Financial Analytics Suite",
                quantity=1,
                unit_price=Decimal("1500.00"),
                tax_snapshot=Decimal("18.00"),
                discount_snapshot=Decimal("0.00"),
                line_total=Decimal("1770.00")
            ))

            # Events
            db.add(SubscriptionEvent(
                subscription_id=s1.id,
                event_type="activated",
                new_status="active",
                event_date=now - timedelta(days=40),
                reason="Converted from quotation QTN-00001"
            ))

            # Billing Period
            db.add(SubscriptionBillingPeriod(
                subscription_id=s1.id,
                period_start=today - timedelta(days=40),
                period_end=today - timedelta(days=10),
                invoice_id=None,
                billing_status="billed"
            ))
            db.commit()
            print("  + Seeded Subscription: SUB-00001 (Active Monthly)")

        # SUB 2: Active Annual Enterprise (Nexus Dynamics)
        s2 = db.query(Subscription).filter(Subscription.subscription_number == "SUB-00002").first()
        if not s2:
            s2 = Subscription(
                subscription_number="SUB-00002",
                customer_id=customers["robert@nexusdynamics.io"].id,
                plan_id=plans["PLAN-ENT-Y"].id,
                status="active",
                start_date=today - timedelta(days=15),
                next_billing_date=today + timedelta(days=350),
                billing_interval="yearly",
                interval_count=1,
                payment_terms_days=30,
                currency="INR",
                auto_renew=True,
                created_at=now - timedelta(days=15)
            )
            db.add(s2)
            db.flush()
            db.add(SubscriptionLine(
                subscription_id=s2.id,
                product_id=products["PROD-ERP"].id,
                description_snapshot="Brightloop Cloud ERP Enterprise Multi-Tenant",
                quantity=1,
                unit_price=Decimal("30000.00"),
                tax_snapshot=Decimal("18.00"),
                discount_snapshot=Decimal("0.00"),
                line_total=Decimal("35400.00")
            ))
            db.add(SubscriptionEvent(
                subscription_id=s2.id,
                event_type="activated",
                new_status="active",
                event_date=now - timedelta(days=15),
                reason="Direct contract onboarding"
            ))
            db.commit()
            print("  + Seeded Subscription: SUB-00002 (Active Annual)")

        # SUB 3: Paused Subscription (HyperScale Media)
        s3 = db.query(Subscription).filter(Subscription.subscription_number == "SUB-00003").first()
        if not s3:
            s3 = Subscription(
                subscription_number="SUB-00003",
                customer_id=customers["sarah@hyperscale.tv"].id,
                plan_id=plans["PLAN-BIZ-M"].id,
                status="paused",
                start_date=today - timedelta(days=60),
                next_billing_date=None,
                billing_interval="monthly",
                interval_count=1,
                payment_terms_days=15,
                currency="INR",
                auto_renew=True,
                created_at=now - timedelta(days=60)
            )
            db.add(s3)
            db.flush()
            db.add(SubscriptionLine(
                subscription_id=s3.id,
                product_id=products["PROD-DB"].id,
                description_snapshot="Managed Cloud DB (200GB)",
                quantity=1,
                unit_price=Decimal("2000.00"),
                tax_snapshot=Decimal("18.00"),
                discount_snapshot=Decimal("0.00"),
                line_total=Decimal("2360.00")
            ))
            db.add(SubscriptionEvent(
                subscription_id=s3.id,
                event_type="paused",
                previous_status="active",
                new_status="paused",
                event_date=now - timedelta(days=10),
                reason="Requested temporary hold during datacenter migration"
            ))
            db.commit()
            print("  + Seeded Subscription: SUB-00003 (Paused)")

        # SUB 4: Closed Subscription (Apex Logistics)
        s4 = db.query(Subscription).filter(Subscription.subscription_number == "SUB-00004").first()
        if not s4:
            s4 = Subscription(
                subscription_number="SUB-00004",
                customer_id=customers["david@apexlogistics.in"].id,
                plan_id=plans["PLAN-FLEX-W"].id,
                status="closed",
                start_date=today - timedelta(days=90),
                expiry_date=today - timedelta(days=10),
                next_billing_date=None,
                billing_interval="weekly",
                interval_count=1,
                payment_terms_days=7,
                currency="INR",
                auto_renew=False,
                created_at=now - timedelta(days=90)
            )
            db.add(s4)
            db.flush()
            db.add(SubscriptionEvent(
                subscription_id=s4.id,
                event_type="closed",
                previous_status="active",
                new_status="closed",
                event_date=now - timedelta(days=10),
                reason="Terminated per mutual early-close agreement"
            ))
            db.commit()
            print("  + Seeded Subscription: SUB-00004 (Closed)")

        # -------------------------------------------------------------
        # 10. INVOICES (Paid, Partially Paid, Overdue, Confirmed)
        # -------------------------------------------------------------
        # INV 1: Acme Corp (SUB-00001) -> FULLY PAID
        inv1 = db.query(Invoice).filter(Invoice.invoice_number == "INV-00001").first()
        if not inv1:
            inv1 = Invoice(
                invoice_number="INV-00001",
                customer_id=customers["alice@acme.com"].id,
                subscription_id=s1.id if s1 else None,
                billing_period_start=today - timedelta(days=40),
                billing_period_end=today - timedelta(days=10),
                invoice_date=today - timedelta(days=40),
                due_date=today - timedelta(days=25),
                status="paid",
                currency="INR",
                subtotal=Decimal("4000.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("720.00"),
                grand_total=Decimal("4720.00"),
                amount_paid=Decimal("4720.00"),
                balance_due=Decimal("0.00"),
                created_at=now - timedelta(days=40)
            )
            db.add(inv1)
            db.flush()
            db.add(InvoiceLine(
                invoice_id=inv1.id,
                product_id=products["PROD-ERP"].id,
                description_snapshot="Brightloop Cloud ERP (Standard Edition)",
                quantity=1,
                unit_price=Decimal("2500.00"),
                discount_amount=Decimal("0.00"),
                taxable_amount=Decimal("2500.00"),
                tax_rate_snapshot=Decimal("18.00"),
                tax_amount=Decimal("450.00"),
                line_total=Decimal("2950.00")
            ))
            db.add(InvoiceLine(
                invoice_id=inv1.id,
                product_id=products["PROD-ANALYTICS"].id,
                description_snapshot="Advanced Financial Analytics Suite",
                quantity=1,
                unit_price=Decimal("1500.00"),
                discount_amount=Decimal("0.00"),
                taxable_amount=Decimal("1500.00"),
                tax_rate_snapshot=Decimal("18.00"),
                tax_amount=Decimal("270.00"),
                line_total=Decimal("1770.00")
            ))
            db.add(InvoiceStatusHistory(
                invoice_id=inv1.id,
                previous_status="confirmed",
                new_status="paid",
                changed_by="System Batch",
                reason="Automatic payment settlement",
                changed_at=now - timedelta(days=35)
            ))
            db.commit()
            print("  + Seeded Invoice: INV-00001 (Fully Paid)")

        # INV 2: Acme Corp (SUB-00001) -> PARTIALLY PAID
        inv2 = db.query(Invoice).filter(Invoice.invoice_number == "INV-00002").first()
        if not inv2:
            inv2 = Invoice(
                invoice_number="INV-00002",
                customer_id=customers["alice@acme.com"].id,
                subscription_id=s1.id if s1 else None,
                billing_period_start=today - timedelta(days=10),
                billing_period_end=today + timedelta(days=20),
                invoice_date=today - timedelta(days=10),
                due_date=today + timedelta(days=5),
                status="partially_paid",
                currency="INR",
                subtotal=Decimal("4000.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("720.00"),
                grand_total=Decimal("4720.00"),
                amount_paid=Decimal("2000.00"),
                balance_due=Decimal("2720.00"),
                created_at=now - timedelta(days=10)
            )
            db.add(inv2)
            db.flush()
            db.add(InvoiceLine(
                invoice_id=inv2.id,
                product_id=products["PROD-ERP"].id,
                description_snapshot="Brightloop Cloud ERP (Standard Edition)",
                quantity=1,
                unit_price=Decimal("2500.00"),
                discount_amount=Decimal("0.00"),
                taxable_amount=Decimal("2500.00"),
                tax_rate_snapshot=Decimal("18.00"),
                tax_amount=Decimal("450.00"),
                line_total=Decimal("2950.00")
            ))
            db.add(InvoiceLine(
                invoice_id=inv2.id,
                product_id=products["PROD-ANALYTICS"].id,
                description_snapshot="Advanced Financial Analytics Suite",
                quantity=1,
                unit_price=Decimal("1500.00"),
                discount_amount=Decimal("0.00"),
                taxable_amount=Decimal("1500.00"),
                tax_rate_snapshot=Decimal("18.00"),
                tax_amount=Decimal("270.00"),
                line_total=Decimal("1770.00")
            ))
            db.commit()
            print("  + Seeded Invoice: INV-00002 (Partially Paid)")

        # INV 3: Nexus Dynamics (SUB-00002) -> CONFIRMED / UNPAID (Ideal for Razorpay testing!)
        inv3 = db.query(Invoice).filter(Invoice.invoice_number == "INV-00003").first()
        if not inv3:
            inv3 = Invoice(
                invoice_number="INV-00003",
                customer_id=customers["robert@nexusdynamics.io"].id,
                subscription_id=s2.id if s2 else None,
                billing_period_start=today - timedelta(days=15),
                billing_period_end=today + timedelta(days=350),
                invoice_date=today - timedelta(days=15),
                due_date=today + timedelta(days=15),
                status="confirmed",
                currency="INR",
                subtotal=Decimal("30000.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("5400.00"),
                grand_total=Decimal("35400.00"),
                amount_paid=Decimal("0.00"),
                balance_due=Decimal("35400.00"),
                created_at=now - timedelta(days=15)
            )
            db.add(inv3)
            db.flush()
            db.add(InvoiceLine(
                invoice_id=inv3.id,
                product_id=products["PROD-ERP"].id,
                description_snapshot="Brightloop Cloud ERP Enterprise Multi-Tenant (1 Year)",
                quantity=1,
                unit_price=Decimal("30000.00"),
                discount_amount=Decimal("0.00"),
                taxable_amount=Decimal("30000.00"),
                tax_rate_snapshot=Decimal("18.00"),
                tax_amount=Decimal("5400.00"),
                line_total=Decimal("35400.00")
            ))
            db.commit()
            print("  + Seeded Invoice: INV-00003 (Confirmed / Online Pay Ready)")

        # INV 4: Apex Logistics -> OVERDUE
        inv4 = db.query(Invoice).filter(Invoice.invoice_number == "INV-00004").first()
        if not inv4:
            inv4 = Invoice(
                invoice_number="INV-00004",
                customer_id=customers["david@apexlogistics.in"].id,
                subscription_id=None,
                invoice_date=today - timedelta(days=40),
                due_date=today - timedelta(days=15),  # Passed!
                status="overdue",
                currency="INR",
                subtotal=Decimal("5000.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("900.00"),
                grand_total=Decimal("5900.00"),
                amount_paid=Decimal("0.00"),
                balance_due=Decimal("5900.00"),
                created_at=now - timedelta(days=40)
            )
            db.add(inv4)
            db.flush()
            db.add(InvoiceLine(
                invoice_id=inv4.id,
                product_id=products["PROD-SLA"].id,
                description_snapshot="24/7 Dedicated SLA & Support (Custom Period)",
                quantity=1,
                unit_price=Decimal("5000.00"),
                discount_amount=Decimal("0.00"),
                taxable_amount=Decimal("5000.00"),
                tax_rate_snapshot=Decimal("18.00"),
                tax_amount=Decimal("900.00"),
                line_total=Decimal("5900.00")
            ))
            db.commit()
            print("  + Seeded Invoice: INV-00004 (Overdue)")

        # INV 5: HyperScale Media -> DRAFT
        inv5 = db.query(Invoice).filter(Invoice.invoice_number == "INV-00005").first()
        if not inv5:
            inv5 = Invoice(
                invoice_number="INV-00005",
                customer_id=customers["sarah@hyperscale.tv"].id,
                subscription_id=None,
                invoice_date=today,
                due_date=today + timedelta(days=15),
                status="draft",
                currency="INR",
                subtotal=Decimal("2500.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("450.00"),
                grand_total=Decimal("2950.00"),
                amount_paid=Decimal("0.00"),
                balance_due=Decimal("2950.00"),
                created_at=now
            )
            db.add(inv5)
            db.commit()
            print("  + Seeded Invoice: INV-00005 (Draft)")

        # -------------------------------------------------------------
        # 11. PAYMENTS, ALLOCATIONS & REFUNDS
        # -------------------------------------------------------------
        # Payment 1: Full settlement for INV-00001 (Manual Wire Transfer)
        p1 = db.query(Payment).filter(Payment.payment_reference == "PAY-00001").first()
        if not p1 and inv1:
            p1 = Payment(
                payment_reference="PAY-00001",
                customer_id=customers["alice@acme.com"].id,
                amount=Decimal("4720.00"),
                currency="INR",
                method="bank_transfer",
                payment_type="manual",
                status="successful",
                payment_date=now - timedelta(days=35),
                notes="NEFT Reference #HDFC00192849"
            )
            db.add(p1)
            db.flush()
            db.add(PaymentAllocation(
                payment_id=p1.id,
                invoice_id=inv1.id,
                allocated_amount=Decimal("4720.00")
            ))
            db.commit()
            print("  + Seeded Payment: PAY-00001 (Bank Transfer Rs.4,720)")

        # Payment 2: Partial settlement for INV-00002 (Razorpay Gateway)
        p2 = db.query(Payment).filter(Payment.payment_reference == "PAY-00002").first()
        if not p2 and inv2:
            p2 = Payment(
                payment_reference="PAY-00002",
                customer_id=customers["alice@acme.com"].id,
                amount=Decimal("2000.00"),
                currency="INR",
                method="razorpay",
                payment_type="online",
                status="successful",
                payment_date=now - timedelta(days=5),
                notes="Online gateway authorization #pay_DEMO_9981"
            )
            db.add(p2)
            db.flush()
            db.add(PaymentTransaction(
                payment_id=p2.id,
                gateway_name="Razorpay",
                gateway_order_id="order_DEMO_9981",
                gateway_payment_id="pay_DEMO_9981",
                gateway_status="captured"
            ))
            db.add(PaymentAllocation(
                payment_id=p2.id,
                invoice_id=inv2.id,
                allocated_amount=Decimal("2000.00")
            ))
            db.commit()
            print("  + Seeded Payment: PAY-00002 (Razorpay Partial Rs.2,000)")

        # Payment 3: Payment with a Refund (Credit Adjustment)
        p3 = db.query(Payment).filter(Payment.payment_reference == "PAY-00003").first()
        if not p3:
            p3 = Payment(
                payment_reference="PAY-00003",
                customer_id=customers["robert@nexusdynamics.io"].id,
                amount=Decimal("5000.00"),
                currency="INR",
                method="bank_transfer",
                payment_type="manual",
                status="partially_refunded",
                payment_date=now - timedelta(days=20),
                notes="Initial onboarding deposit"
            )
            db.add(p3)
            db.flush()
            # Refund record
            db.add(Refund(
                payment_id=p3.id,
                refund_reference="REF-00001",
                amount=Decimal("1000.00"),
                reason="Downgrade credit note adjustment per SLA discussion",
                status="successful",
                created_at=now - timedelta(days=12)
            ))
            db.commit()
            print("  + Seeded Payment: PAY-00003 with Refund REF-00001")

        # -------------------------------------------------------------
        # 12. NOTIFICATIONS
        # -------------------------------------------------------------
        notifications_data = [
            ("Invoice #INV-00001 Settled", "Payment of Rs.4,720.00 received via Bank Transfer.", now - timedelta(days=35)),
            ("Invoice #INV-00002 Due Soon", "Invoice #INV-00002 has a balance due of Rs.2,720.00 due on 15th.", now - timedelta(days=3)),
            ("Quotation #QTN-00002 Issued", "Annual Enterprise Quotation ready for review and acceptance.", now - timedelta(days=5)),
            ("System Update: Month-End Billing", "Automated recurring billing batch processed successfully.", now - timedelta(hours=6)),
        ]

        admin_u = db.query(User).filter(User.normalized_email == "admin@brightloop.io").first()
        admin_uid = admin_u.id if admin_u else 1

        for title, msg, created in notifications_data:
            db.add(Notification(
                user_id=admin_uid,
                notification_type="billing",
                title=title,
                message=msg,
                created_at=created
            ))
        db.commit()

        # -------------------------------------------------------------
        # 13. AUDIT LOGS
        # -------------------------------------------------------------
        audit_events = [
            ("customer.create", "Customer", "1", None, {"company": "Acme Technologies", "code": "CUST-00001"}),
            ("quotation.create", "Quotation", "1", None, {"quote_no": "QTN-00001", "total": 4720.0}),
            ("quotation.convert", "Quotation", "1", {"status": "accepted"}, {"status": "converted", "sub_id": "1"}),
            ("subscription.activate", "Subscription", "1", {"status": "draft"}, {"status": "active"}),
            ("invoice.create", "Invoice", "1", None, {"inv_no": "INV-00001", "total": 4720.0}),
            ("payment.record", "Payment", "1", None, {"amount": 4720.0, "ref": "PAY-00001", "method": "bank_transfer"}),
            ("subscription.pause", "Subscription", "3", {"status": "active"}, {"status": "paused", "reason": "Datacenter migration"}),
            ("payment.refund", "Payment", "3", None, {"refund_ref": "REF-00001", "amount": 1000.0}),
        ]

        for action, etype, eid, old_v, new_v in audit_events:
            db.add(AuditLog(
                user_id=1,
                action=action,
                entity_type=etype,
                entity_id=eid,
                old_values=json.dumps(old_v) if old_v else None,
                new_values=json.dumps(new_v) if new_v else None,
                ip_address="127.0.0.1",
                created_at=now - timedelta(days=1)
            ))
        db.commit()
        print("  + Seeded Audit Trail and System Notifications")

        print("[SUCCESS] All Demo Data Successfully Seeded!")

    except Exception as e:
        db.rollback()
        print(f"[FAIL] Error during seeding: {str(e)}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_all_demo_data()
