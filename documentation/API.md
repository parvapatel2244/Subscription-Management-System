# Brightloop Subscription Management System - API Specification

The REST API is exposed under `/api/v1` and authenticated using JWT Bearer tokens with short-lived access tokens (60 minutes) and rotating refresh tokens (30 days).

---

## 1. Authentication & Security

### `POST /api/v1/auth/login`
- **Description:** Authenticates a user with Argon2id password verification and issues access & refresh tokens.
- **Request Body:**
```json
{
  "email": "admin@brightloop.io",
  "password": "Admin@Brightloop2026!"
}
```
- **Response (200 OK):**
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "def456...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### `POST /api/v1/auth/register`
- **Description:** Public registration endpoint for prospective customers. Creates user and linked customer profile.
- **Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@acmecorp.com",
  "password": "StrongPassword@123!",
  "company_name": "Acme Corp",
  "phone": "+91 9876543210"
}
```

### `POST /api/v1/auth/refresh`
- **Description:** Rotates a single-use refresh token and issues a new access/refresh pair. Prevents replay attacks.

### `GET /api/v1/auth/me`
- **Description:** Returns the authenticated user's profile, role list, and permission codes.

---

## 2. Customer Management

### `GET /api/v1/customers`
- **Permissions:** `customer.view` (or automatic self-scoping for customers)
- **Query Params:** `search` (name, company, email, customer_code), `status` (`active`, `suspended`, `inactive`)
- **Response:** Array of customer objects with billing profiles and addresses.

### `POST /api/v1/customers`
- **Permissions:** `customer.create`
- **Request Body:**
```json
{
  "company_name": "Starlight Industries",
  "contact_name": "Alex Vance",
  "email": "alex@starlight.io",
  "phone": "+91 9876543210",
  "tax_number": "GSTIN27AABCU9603R1ZM",
  "payment_terms_days": 15,
  "address": {
    "address_type": "billing",
    "address_line1": "456 Tech Park, Cyber City",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postal_code": "560100",
    "country": "India"
  }
}
```

### `PATCH /api/v1/customers/{customer_id}`
- **Permissions:** `customer.update` or account owner.

---

## 3. Products, Plans & Taxes

### `GET /api/v1/products`
- **Permissions:** `product.view`
- **Response:** List of software products with child variants and active status.

### `POST /api/v1/products`
- **Permissions:** `product.manage`
- **Request Body:** Includes product code, sales price, cost price, and optional variants.

### `GET /api/v1/plans`
- **Permissions:** `plan.view`
- **Response:** Subscription plans with intervals (`monthly`, `yearly`, `daily`, `weekly`), pause permissions, auto-close rules, and early close policies.

### `GET /api/v1/plans/taxes` & `POST /api/v1/plans/taxes`
- **Permissions:** `tax.manage`
- **Description:** Configures tax rates (e.g. GST 18%, VAT 5%).

---

## 4. Quotations

### `GET /api/v1/quotations`
- **Permissions:** `quotation.view` (scoped to customer if caller is a customer).

### `POST /api/v1/quotations`
- **Permissions:** `quotation.create`
- **Features:** Dynamic lines with products, variants, quantities, unit prices, discounts, and taxes.

### `POST /api/v1/quotations/{id}/send`
- **Status Transition:** `draft` &rarr; `sent`.

### `POST /api/v1/quotations/{id}/accept`
- **Status Transition:** `sent` &rarr; `accepted`.

### `POST /api/v1/quotations/{id}/convert`
- **Permissions:** `quotation.create` or `subscription.activate`
- **Operation:** Authoritatively converts accepted quotation into an active subscription, records lifecycle events, snapshots product prices, and schedules initial billing period.

### `GET /api/v1/quotations/{id}/pdf`
- **Response:** Binary PDF stream generated via ReportLab with corporate branding and tax breakdown.

---

## 5. Subscriptions

### `GET /api/v1/subscriptions`
- **Permissions:** `subscription.view`

### `POST /api/v1/subscriptions/{id}/pause`
- **Permissions:** `subscription.pause`
- **Validation:** Verifies if `plan.allow_pause` is enabled. Freezes recurring billing date.

### `POST /api/v1/subscriptions/{id}/resume`
- **Permissions:** `subscription.resume`
- **Operation:** Sets subscription to active and recomputes the next billing date.

### `POST /api/v1/subscriptions/{id}/close`
- **Permissions:** `subscription.close`
- **Validation:** Validates `allow_early_close` constraints if closing before expiry date.

### `POST /api/v1/subscriptions/{id}/bill-now`
- **Permissions:** `invoice.create`
- **Operation:** Triggers immediate ad-hoc invoice generation for the subscription.

---

## 6. Invoices & Billing Engine

### `GET /api/v1/invoices`
- **Permissions:** `invoice.view` (scoped for customer users).

### `GET /api/v1/invoices/overdue`
- **Description:** Filters invoices where `due_date < today` and `balance_due > 0`.

### `POST /api/v1/invoices/{id}/confirm`
- **Status Transition:** `draft` &rarr; `confirmed`. Locks line items and issues due date.

### `POST /api/v1/invoices/{id}/cancel`
- **Permissions:** `invoice.cancel`
- **Status Transition:** &rarr; `cancelled`. Reverse allocations if needed.

### `GET /api/v1/invoices/{id}/pdf`
- **Description:** Downloads official ReportLab PDF tax invoice.

---

## 7. Payments & Razorpay Gateway

### `POST /api/v1/payments/manual`
- **Permissions:** `payment.record`
- **Request Body:**
```json
{
  "customer_id": 1,
  "invoice_id": 10,
  "amount": 2950.00,
  "method": "bank_transfer",
  "notes": "Wire confirmation #NEFT982347"
}
```

### `POST /api/v1/payments/online/order`
- **Description:** Prepares a Razorpay Gateway order for an open invoice.
- **Request Body:**
```json
{
  "invoice_id": 10
}
```
- **Response:**
```json
{
  "order_id": "order_H72kd9...",
  "amount": 295000,
  "currency": "INR",
  "key_id": "rzp_test_TuNd1nSE5rzBYA",
  "invoice_number": "INV-00010",
  "customer_name": "Jane Doe",
  "customer_email": "jane@acmecorp.com"
}
```

### `POST /api/v1/payments/online/verify`
- **Description:** Verifies HMAC SHA256 signature from Razorpay Checkout SDK and allocates payment.
- **Request Body:**
```json
{
  "invoice_id": 10,
  "razorpay_order_id": "order_H72kd9...",
  "razorpay_payment_id": "pay_H72kd9...",
  "razorpay_signature": "a1b2c3d4..."
}
```

### `POST /api/v1/payments/webhook`
- **Description:** Receives Razorpay asynchronous webhook events (`payment.captured`, `refund.processed`). Validates signature against `settings.RAZORPAY_WEBHOOK_SECRET`.

### `POST /api/v1/payments/refund`
- **Permissions:** `payment.refund`
- **Operation:** Initiates gateway or manual refund and updates invoice balance due.

---

## 8. Reports & Analytics

### `GET /api/v1/reports/dashboard/overview`
- **Metrics:** Net revenue received, MRR, ARR, collection rate, outstanding balance, overdue count.

### `GET /api/v1/reports/revenue`
- **Description:** Aggregates monthly settled revenue.

### `GET /api/v1/reports/export/invoices`
- **Response:** Streaming `.xlsx` spreadsheet workbook generated using OpenPyXL.

