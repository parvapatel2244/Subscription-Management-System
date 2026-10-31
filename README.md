# Brightloop Subscription Management System

> Production-ready, full-stack recurring revenue and subscription lifecycle management platform.

Built with **FastAPI**, **SQLAlchemy 2.x**, **React 18 + TypeScript + Vite**, **Tailwind CSS**, and integrated with **Razorpay**.

---

## 🌟 System Highlights

- **Multi-Role RBAC:** Super Admin, Staff Admin, Sales Staff, Billing Staff, Finance Staff, and Customer.
- **Authoritative Financial Engine:** Calculations in Python `Decimal` across line items, quantity discounts, tax rates, and grand totals to prevent financial rounding drift.
- **Full Subscription Lifecycle:** Quotations with PDF generation &rarr; customer acceptance &rarr; automatic conversion to active subscriptions &rarr; pause &rarr; resume &rarr; renewal &rarr; close.
- **Calendar Clamping Billing Engine:** Accurate billing on month-end dates (Jan 31 &rarr; Feb 28 &rarr; Mar 31) with period locks to guarantee zero duplicate invoicing.
- **Dual Payment Channels:** Manual payment recording (bank transfer, cheque, cash) and online self-service payments powered by **Razorpay Checkout SDK**.
- **Audit Logging & Compliance:** Immutable JSON diff tracking of administrative actions and financial changes.
- **Financial Analytics & Reporting:** Real-time MRR, ARR, collection efficiency, overdue tracking, and Excel invoice exports via OpenPyXL.

---

## 🔑 Seeded Demo Accounts & Credentials

The system comes pre-seeded with realistic records across every module. You can sign in using any of the accounts below:

### 1. Internal Enterprise Staff (Admin Workspace `/admin`)

| Role | Email | Password | Permissions & Exploration Focus |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@brightloop.io` | `Admin@Brightloop2026!` | Full unrestricted system access, batch billing execution, system settings |
| **Staff Admin** | `staff.admin@brightloop.io` | `StaffAdmin@2026!` | Administrative user management, team member onboarding |
| **Sales Staff** | `sales@brightloop.io` | `SalesStaff@2026!` | Customer creation, quotation authoring, discount rules |
| **Billing Staff** | `billing@brightloop.io` | `BillingStaff@2026!` | Invoices, confirmation, recurring cycle runs, overdue tracking |
| **Finance Staff** | `finance@brightloop.io` | `FinanceStaff@2026!` | Payment recording, refunds, revenue analytics & Excel export |

### 2. Customer Accounts (Customer Self-Service Portal `/portal`)

| Customer Company | Email | Password | Pre-seeded Scenario & Test Purpose |
| :--- | :--- | :--- | :--- |
| **Nexus Dynamics Inc** | `robert@nexusdynamics.io` | `Customer@2026!` | Has open invoice **`INV-00003` (₹35,400.00)**. Perfect for testing **"Pay with Razorpay"** online gateway checkout! Also has pending quote `QTN-00002` ready to accept. |
| **Acme Technologies** | `alice@acme.com` | `Customer@2026!` | Active monthly subscription (`SUB-00001`), fully settled invoice (`INV-00001`), and partially paid invoice (`INV-00002`). |
| **HyperScale Cloud** | `sarah@hyperscale.tv` | `Customer@2026!` | Subscription in **`paused`** state (`SUB-00003`). Test subscription resume or draft quotes. |
| **Apex Freight Logistics**| `david@apexlogistics.in` | `Customer@2026!` | Demonstrates **`overdue`** invoice (`INV-00004`) and closed subscription lifecycle (`SUB-00004`). |

### Razorpay Integration (Live Test Keys)
- **Key ID:** `rzp_test_TuNd1nSE5rzBYA`
- **Key Secret:** `SU24VgtcARGHWb2NQ715xqTR`
- **Webhook Secret:** `brightloop_rzp_webhook_secret_2026`

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- MySQL 8+ (or SQLite for development/testing)

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies (if needed)
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API is available at: `http://localhost:8000`\
Interactive Swagger docs: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The application opens at: `http://localhost:5173`

---

## 🧪 Running Automated Tests

Run the full backend integration test suite:

```bash
# From workspace root
$env:PYTHONPATH="backend"; backend\venv\Scripts\pytest.exe backend\tests\test_api.py -v
```

Tests verify:
1. `test_financial_calculator`: Precision rounding and tax calculations.
2. `test_health_check`: API availability.
3. `test_super_admin_login`: Password hashing and JWT issuance.
4. `test_customer_registration_and_login`: Onboarding flow and role scoping.
5. `test_end_to_end_subscription_and_billing`: Complete end-to-end journey from product creation &rarr; quotation &rarr; acceptance &rarr; conversion &rarr; recurring invoice generation &rarr; payment allocation &rarr; balance settlement.

---

## 📚 Technical Documentation

- [API Specification](documentation/API.md) - Detailed endpoints, payloads, and response schemas.
- [Business Workflows](documentation/WORKFLOWS.md) - Quotation conversion, billing engine clamping, and Razorpay payment flow.
- [Database Model](documentation/DATABASE.md) - ER diagrams, tables, indexing, and migration schema.

