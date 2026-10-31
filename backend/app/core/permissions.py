from typing import Dict, List

# Standard permission codes
ALL_PERMISSIONS = [
    # Customer Management
    {"code": "customer.view", "module": "Customers", "description": "View customers"},
    {"code": "customer.create", "module": "Customers", "description": "Create customers"},
    {"code": "customer.update", "module": "Customers", "description": "Update customers"},
    
    # Products and Plans
    {"code": "product.manage", "module": "Products", "description": "Manage products and variants"},
    {"code": "product.view", "module": "Products", "description": "View products and variants"},
    {"code": "plan.manage", "module": "Plans", "description": "Manage subscription plans"},
    {"code": "plan.view", "module": "Plans", "description": "View subscription plans"},
    {"code": "tax.manage", "module": "Taxes", "description": "Configure tax rules"},
    
    # Quotations
    {"code": "quotation.view", "module": "Quotations", "description": "View quotations"},
    {"code": "quotation.create", "module": "Quotations", "description": "Create and edit quotations"},
    {"code": "quotation.send", "module": "Quotations", "description": "Send quotations to customers"},
    
    # Subscriptions
    {"code": "subscription.view", "module": "Subscriptions", "description": "View subscriptions"},
    {"code": "subscription.activate", "module": "Subscriptions", "description": "Activate subscriptions"},
    {"code": "subscription.pause", "module": "Subscriptions", "description": "Pause subscriptions"},
    {"code": "subscription.resume", "module": "Subscriptions", "description": "Resume subscriptions"},
    {"code": "subscription.close", "module": "Subscriptions", "description": "Close subscriptions"},
    {"code": "subscription.renew", "module": "Subscriptions", "description": "Renew subscriptions"},
    
    # Invoices
    {"code": "invoice.view", "module": "Invoices", "description": "View invoices"},
    {"code": "invoice.create", "module": "Invoices", "description": "Create eligible invoices"},
    {"code": "invoice.confirm", "module": "Invoices", "description": "Confirm draft invoices"},
    {"code": "invoice.cancel", "module": "Invoices", "description": "Cancel invoices"},
    {"code": "invoice.send", "module": "Invoices", "description": "Send invoices to customers"},
    
    # Payments
    {"code": "payment.view", "module": "Payments", "description": "View payments and allocations"},
    {"code": "payment.record", "module": "Payments", "description": "Record manual payments"},
    {"code": "payment.refund", "module": "Payments", "description": "Initiate refunds"},
    
    # Discounts
    {"code": "discount.manage", "module": "Discounts", "description": "Manage discount rules and coupons"},
    {"code": "discount.view", "module": "Discounts", "description": "View discounts"},
    
    # Reports
    {"code": "reports.finance", "module": "Reports", "description": "View financial and revenue reports"},
    {"code": "reports.view", "module": "Reports", "description": "View operational reports and analytics"},
    
    # Staff & System
    {"code": "staff.manage", "module": "Staff", "description": "Create and manage staff accounts"},
    {"code": "role.manage", "module": "Roles", "description": "Create and manage roles and permissions"},
    {"code": "audit.view", "module": "Audit", "description": "View system and audit logs"},
    {"code": "settings.manage", "module": "Settings", "description": "Manage system settings"},

    # Customer Portal
    {"code": "customer.portal", "module": "Portal", "description": "Access customer self-service portal"}
]

# Role code mapping to permission codes
DEFAULT_ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "SUPER_ADMIN": [p["code"] for p in ALL_PERMISSIONS],
    "STAFF_ADMIN": [
        "customer.view", "customer.create", "customer.update",
        "product.manage", "product.view", "plan.manage", "plan.view", "tax.manage",
        "quotation.view", "quotation.create", "quotation.send",
        "subscription.view", "subscription.activate", "subscription.pause", "subscription.resume", "subscription.close", "subscription.renew",
        "invoice.view", "invoice.create", "invoice.confirm", "invoice.cancel", "invoice.send",
        "payment.view", "payment.record", "payment.refund",
        "discount.manage", "discount.view",
        "reports.finance", "reports.view",
        "staff.manage", "role.manage", "audit.view", "settings.manage"
    ],
    "SALES_STAFF": [
        "customer.view", "customer.create", "customer.update",
        "product.view", "plan.view",
        "quotation.view", "quotation.create", "quotation.send",
        "subscription.view", "subscription.activate", "subscription.renew",
        "invoice.view", "discount.view", "reports.view"
    ],
    "BILLING_STAFF": [
        "customer.view", "product.view", "plan.view",
        "subscription.view",
        "invoice.view", "invoice.create", "invoice.confirm", "invoice.cancel", "invoice.send",
        "payment.view", "payment.record", "reports.view"
    ],
    "FINANCE_STAFF": [
        "customer.view", "subscription.view",
        "invoice.view", "payment.view", "payment.record", "payment.refund",
        "reports.finance", "reports.view", "audit.view"
    ],
    "CUSTOMER": [
        "customer.portal"
    ]
}

