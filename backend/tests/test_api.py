import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta

from app.main import app
from app.core.database import Base, get_db
from app.core.init_db import init_db
from app.models.customer import Customer
from app.models.product import Product, ProductVariant, Plan, Tax
from app.models.quotation import Quotation, QuotationLine
from app.models.subscription import Subscription
from app.models.invoice import Invoice
from app.services.financial_calculator import FinancialCalculator
from app.services.billing_engine import BillingEngine

from sqlalchemy.pool import StaticPool

# In-memory SQLite for testing with StaticPool so all sessions share the memory DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    init_db(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_financial_calculator():
    # Test formula: Line Subtotal = Qty * Unit Price
    # Net Subtotal = Sum(Line Subtotal) - Discount
    # Tax = Taxable Amount * Tax Rate / 100
    res = FinancialCalculator.calculate_line_item(
        unit_price=Decimal("2000.00"),
        quantity=2,
        discount_amount=Decimal("100.00"),
        tax_rate=Decimal("18.00"),
        is_tax_inclusive=False
    )
    assert res["subtotal"] == Decimal("4000.00")
    assert res["discount_amount"] == Decimal("100.00")
    assert res["taxable_amount"] == Decimal("3900.00")
    assert res["tax_amount"] == Decimal("702.00")
    assert res["line_total"] == Decimal("4602.00")

def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_super_admin_login(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@brightloop.io",
        "password": "Admin@Brightloop2026!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_customer_registration_and_login(client):
    # Test registration with valid password complexity
    reg_response = client.post("/api/v1/auth/register", json={
        "name": "Jane Doe",
        "email": "jane.doe@example.com",
        "password": "Password123!",
        "company_name": "Acme Innovations"
    })
    assert reg_response.status_code == 201

    # Login
    login_response = client.post("/api/v1/auth/login", json={
        "email": "jane.doe@example.com",
        "password": "Password123!"
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Current user check
    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "jane.doe@example.com"
    assert me_response.json()["customer_id"] is not None

def test_end_to_end_subscription_and_billing(client, db_session):
    # 1. Login as Admin
    admin_login = client.post("/api/v1/auth/login", json={
        "email": "admin@brightloop.io",
        "password": "Admin@Brightloop2026!"
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Create Product with Variant
    prod_res = client.post("/api/v1/products", headers=admin_headers, json={
        "name": "Brightloop Enterprise Suite",
        "product_code": "PROD-ENT-001",
        "product_type": "software",
        "sales_price": "2000.00",
        "cost_price": "500.00",
        "variants": [
            {"variant_name": "Premium Support Addon", "variant_code": "VAR-PREM", "price_adjustment": "560.00"}
        ]
    })
    assert prod_res.status_code == 201
    prod_data = prod_res.json()
    product_id = prod_data["id"]
    variant_id = prod_data["variants"][0]["id"]

    # Verify Unit Price = Base Price + Variant adjustment = 2000 + 560 = 2560
    price_res = client.get(f"/api/v1/products/{product_id}/price?variant_id={variant_id}")
    assert price_res.status_code == 200
    assert price_res.json()["unit_price"] == 2560.0

    # 3. Create Subscription Plan
    plan_res = client.post("/api/v1/plans", headers=admin_headers, json={
        "name": "Monthly Enterprise",
        "plan_code": "PLAN-M-ENT",
        "billing_interval": "monthly",
        "interval_count": 1,
        "minimum_quantity": 1,
        "amount": "2560.00",
        "currency": "INR",
        "product_ids": [product_id],
        "allow_pause": True,
        "allow_early_close": True,
        "allow_renewal": True
    })
    assert plan_res.status_code == 201
    plan_id = plan_res.json()["id"]

    # 4. Create Customer
    cust_res = client.post("/api/v1/customers", headers=admin_headers, json={
        "company_name": "Solaris Corp",
        "contact_name": "Alice Smith",
        "email": "alice@solaris.io",
        "phone": "+91 9876543210"
    })
    assert cust_res.status_code == 201
    customer_id = cust_res.json()["id"]

    # 5. Create Quotation
    today = date.today()
    q_res = client.post("/api/v1/quotations", headers=admin_headers, json={
        "customer_id": customer_id,
        "issue_date": str(today),
        "expiry_date": str(today + timedelta(days=30)),
        "currency": "INR",
        "lines": [
            {
                "product_id": product_id,
                "variant_id": variant_id,
                "plan_id": plan_id,
                "quantity": 1,
                "unit_price": "2560.00",
                "discount_amount": "60.00",
                "tax_rate": "18.00"
            }
        ]
    })
    assert q_res.status_code == 201
    q_data = q_res.json()
    quotation_id = q_data["id"]
    assert float(q_data["subtotal"]) == 2560.0
    assert float(q_data["discount_total"]) == 60.0
    # Taxable = 2500, Tax (18%) = 450, Grand total = 2950
    assert float(q_data["tax_total"]) == 450.0
    assert float(q_data["grand_total"]) == 2950.0

    # 6. Customer accepts quotation
    accept_res = client.post(f"/api/v1/quotations/{quotation_id}/accept", headers=admin_headers)
    assert accept_res.status_code == 200

    # 7. Convert quotation to subscription (Enforces at most one subscription)
    convert_res = client.post(f"/api/v1/quotations/{quotation_id}/convert", headers=admin_headers)
    assert convert_res.status_code == 200
    sub_data = convert_res.json()
    sub_id = sub_data["id"]
    assert sub_data["status"] == "confirmed"

    # Repeated conversion is rejected
    repeat_res = client.post(f"/api/v1/quotations/{quotation_id}/convert", headers=admin_headers)
    assert repeat_res.status_code == 400

    # 8. Activate subscription
    act_res = client.post(f"/api/v1/subscriptions/{sub_id}/activate", headers=admin_headers)
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "active"

    # 9. Trigger billing (Invoice Generation)
    bill_res = client.post(f"/api/v1/subscriptions/{sub_id}/bill-now", headers=admin_headers)
    assert bill_res.status_code == 200
    inv_id = bill_res.json()["invoice_id"]

    # Verify duplicate billing in same period is prevented
    dup_res = client.post(f"/api/v1/subscriptions/{sub_id}/bill-now", headers=admin_headers)
    assert dup_res.status_code == 400

    # 10. Verify generated invoice
    inv_res = client.get(f"/api/v1/invoices/{inv_id}", headers=admin_headers)
    assert inv_res.status_code == 200
    inv_data = inv_res.json()
    assert float(inv_data["grand_total"]) == 2950.0
    assert float(inv_data["balance_due"]) == 2950.0
    assert inv_data["status"] == "confirmed"

    # 11. Record Manual Partial Payment (Rs 1500)
    pay_res = client.post("/api/v1/payments/manual", headers=admin_headers, json={
        "customer_id": customer_id,
        "invoice_id": inv_id,
        "amount": "1500.00",
        "method": "bank_transfer",
        "notes": "Partial NEFT transfer"
    })
    assert pay_res.status_code == 201

    # Check invoice status is now partially_paid, balance = 1450
    inv_res2 = client.get(f"/api/v1/invoices/{inv_id}", headers=admin_headers)
    assert inv_res2.json()["status"] == "partially_paid"
    assert float(inv_res2.json()["amount_paid"]) == 1500.0
    assert float(inv_res2.json()["balance_due"]) == 1450.0

    # 12. Complete full payment (Remaining Rs 1450)
    pay_res2 = client.post("/api/v1/payments/manual", headers=admin_headers, json={
        "customer_id": customer_id,
        "invoice_id": inv_id,
        "amount": "1450.00",
        "method": "upi",
        "notes": "Final settlement"
    })
    assert pay_res2.status_code == 201

    # Check invoice is now paid, balance = 0
    inv_res3 = client.get(f"/api/v1/invoices/{inv_id}", headers=admin_headers)
    assert inv_res3.json()["status"] == "paid"
    assert float(inv_res3.json()["balance_due"]) == 0.0

    # 13. Overpayment is prevented
    overpay_res = client.post("/api/v1/payments/manual", headers=admin_headers, json={
        "customer_id": customer_id,
        "invoice_id": inv_id,
        "amount": "100.00",
        "method": "cash"
    })
    assert overpay_res.status_code == 400

    # 14. Check Dashboard Overview figures reconcile
    dash_res = client.get("/api/v1/reports/dashboard/overview", headers=admin_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["active_subscriptions"] >= 1
    assert dash_data["revenue_received"] >= 2950.0
