export interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_system_role: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  status: string;
  roles: Role[];
  permissions: string[];
  customer_id?: number | null;
}

export interface CustomerAddress {
  id?: number;
  address_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export interface CustomerBillingProfile {
  currency: string;
  billing_email: string;
  payment_terms_days: number;
  tax_number?: string;
}

export interface Customer {
  id: number;
  customer_code: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  tax_number?: string;
  status: string;
  created_at: string;
  addresses?: CustomerAddress[];
  billing_profile?: CustomerBillingProfile;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  variant_name: string;
  variant_code: string;
  price_adjustment: number;
  status: string;
}

export interface Product {
  id: number;
  name: string;
  product_code: string;
  product_type: string;
  sales_price: number;
  cost_price: number;
  description?: string;
  notes?: string;
  status: string;
  variants: ProductVariant[];
}

export interface Plan {
  id: number;
  name: string;
  plan_code: string;
  description?: string;
  billing_interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval_count: number;
  minimum_quantity: number;
  auto_close: boolean;
  allow_early_close: boolean;
  allow_pause: boolean;
  allow_renewal: boolean;
  status: string;
}

export interface Tax {
  id: number;
  name: string;
  tax_code: string;
  tax_type: string;
  rate: number;
  status: string;
}

export interface QuotationLine {
  id: number;
  product_id: number;
  variant_id?: number;
  plan_id?: number;
  description_snapshot: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  issue_date: string;
  expiry_date: string;
  currency: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  lines: QuotationLine[];
}

export interface SubscriptionLine {
  id: number;
  product_id: number;
  description_snapshot: string;
  quantity: number;
  unit_price: number;
  tax_snapshot: number;
  discount_snapshot: number;
  line_total: number;
}

export interface SubscriptionEvent {
  id: number;
  event_type: string;
  previous_status?: string;
  new_status: string;
  event_date: string;
  reason?: string;
  performed_by?: string;
}

export interface Subscription {
  id: number;
  subscription_number: string;
  customer_id: number;
  quotation_id?: number;
  plan_id: number;
  status: 'draft' | 'quotation' | 'confirmed' | 'active' | 'paused' | 'closed';
  start_date: string;
  expiry_date?: string;
  next_billing_date?: string;
  billing_interval: string;
  interval_count: number;
  payment_terms_days: number;
  currency: string;
  auto_renew: boolean;
  lines: SubscriptionLine[];
  events?: SubscriptionEvent[];
}

export interface InvoiceLine {
  id: number;
  product_id?: number;
  description_snapshot: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  taxable_amount: number;
  tax_rate_snapshot: number;
  tax_amount: number;
  line_total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  subscription_id?: number;
  billing_period_start?: string;
  billing_period_end?: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'confirmed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  currency: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  created_at: string;
  lines: InvoiceLine[];
}

export interface PaymentAllocation {
  id: number;
  invoice_id: number;
  allocated_amount: number;
}

export interface Refund {
  id: number;
  payment_id: number;
  refund_reference: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
}

export interface Payment {
  id: number;
  payment_reference: string;
  customer_id: number;
  method: string;
  payment_type: 'online' | 'manual';
  amount: number;
  currency: string;
  payment_date: string;
  status: string;
  notes?: string;
  allocations: PaymentAllocation[];
  refunds?: Refund[];
}

export interface Discount {
  id: number;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  minimum_purchase: number;
  minimum_quantity: number;
  start_date: string;
  end_date: string;
  usage_limit?: number;
  usage_count: number;
  scope: string;
  status: string;
}

export interface DashboardOverview {
  active_subscriptions: number;
  total_customers: number;
  revenue_received: number;
  total_outstanding: number;
  overdue_invoices_count: number;
  overdue_amount: number;
  mrr: number;
  arr: number;
  collection_rate: number;
  currency: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: string;
  new_values?: string;
  ip_address?: string;
  created_at: string;
}

