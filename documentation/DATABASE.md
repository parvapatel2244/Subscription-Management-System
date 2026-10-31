# Database Architecture & Entity-Relationship Model

The Brightloop Subscription Management System uses **MySQL 8+ with InnoDB** as its primary system of record. Models are written with SQLAlchemy 2.x and managed with Alembic migrations.

---

## 1. Primary Model Groups

```
+---------------------------------------------------------------------------------+
|                                 CORE AUTH & RBAC                                |
|  users  <-->  user_roles  <-->  roles  <-->  role_permissions  <-->  permissions|
|  refresh_tokens, email_verification_tokens, password_reset_tokens               |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                             CUSTOMERS & PROFILES                                |
|  customers  <-->  customer_addresses                                            |
|  customers  <-->  customer_billing_profiles                                     |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                             PRODUCTS, PLANS & TAXES                             |
|  products  <-->  product_variants                                               |
|  plans  <-->  plan_products                                                     |
|  taxes  <-->  product_taxes                                                     |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                           QUOTATIONS & SUBSCRIPTIONS                            |
|  quotations  <-->  quotation_lines                                              |
|  subscriptions  <-->  subscription_lines                                        |
|  subscriptions  <-->  subscription_events                                       |
|  subscriptions  <-->  subscription_billing_periods                              |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                               INVOICES & BILLING                                |
|  invoices  <-->  invoice_lines                                                  |
|  invoices  <-->  invoice_status_history                                         |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                              PAYMENTS & REFUNDS                                 |
|  payments  <-->  payment_allocations  <-->  invoices                            |
|  payments  <-->  payment_transactions                                           |
|  payments  <-->  refunds                                                        |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                               OPERATIONS & AUDIT                                |
|  audit_logs, system_settings, webhook_events, idempotency_keys, billing_jobs     |
+---------------------------------------------------------------------------------+
```

---

## 2. Table Specifications

### Authentication & Users
- `users`: ID, `name`, `email`, `normalized_email` (unique index), `password_hash` (Argon2id), `status` (`active`, `suspended`, `inactive`), timestamps.
- `roles`: `code` (`SUPER_ADMIN`, `STAFF_ADMIN`, `SALES_STAFF`, `BILLING_STAFF`, `FINANCE_STAFF`, `CUSTOMER`), `name`, `is_system_role`.
- `permissions`: `code` (`customer.view`, `invoice.confirm`, `payment.record`, etc.), `module`, `description`.
- `refresh_tokens`: Stored SHA256 hashed token with expiry and revocation status.

### Customers
- `customers`: `customer_code` (unique, e.g. `CUST-00001`), `company_name`, `contact_name`, `email`, `phone`, `tax_number`, `status`.
- `customer_billing_profiles`: `currency` (default `INR`), `billing_email`, `payment_terms_days` (default 15).
- `customer_addresses`: `address_type` (`billing`, `shipping`), street lines, `city`, `state`, `postal_code`, `country`.

### Products & Plans
- `products`: `product_code`, `name`, `sales_price` (Decimal 12,4), `cost_price`, `product_type`.
- `product_variants`: Variant name and price adjustment.
- `plans`: `plan_code`, `name`, `billing_interval` (`monthly`, `yearly`, `daily`, `weekly`), `interval_count`, `allow_pause`, `allow_early_close`, `auto_close`.
- `taxes`: `tax_code`, `rate` (Decimal 5,2, e.g. 18.00%), `tax_type`.

### Invoices & Financial Totals
- `invoices`: `invoice_number` (unique), `customer_id`, `subscription_id`, `status` (`draft`, `confirmed`, `partially_paid`, `paid`, `overdue`, `cancelled`), `invoice_date`, `due_date`, `subtotal`, `discount_total`, `tax_total`, `grand_total`, `amount_paid`, `balance_due`.
- `invoice_lines`: Item description, quantity, unit price, tax rate snapshot, tax amount, discount amount, line total.

### Payments & Gateway Transactions
- `payments`: `payment_reference` (unique), `customer_id`, `amount`, `currency`, `method` (`razorpay`, `bank_transfer`, `cash`, `cheque`), `payment_type` (`online`, `manual`), `status` (`successful`, `failed`, `refunded`, `partially_refunded`).
- `payment_allocations`: Links payment directly to invoice with `allocated_amount`.
- `refunds`: Refund reference, amount, reason, and status.

---

## 3. SQLite vs MySQL Compatibility
- `IDType = BigInteger().with_variant(Integer, "sqlite")`: Ensures seamless autoincrement primary keys in SQLite development/testing and `BIGINT AUTO_INCREMENT` in MySQL InnoDB production.
- Foreign key pragma enabled automatically for SQLite test sessions (`PRAGMA foreign_keys=ON;`).

