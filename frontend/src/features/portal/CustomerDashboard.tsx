import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Subscription, Invoice, Payment } from '../../types';
import { Badge } from '../../components/common/Badge';
import {
  CreditCard,
  FileText,
  Repeat,
  AlertCircle,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: subscriptions = [], isLoading: isSubsLoading } = useQuery<Subscription[]>({
    queryKey: ['my-subscriptions'],
    queryFn: () => api.get<Subscription[]>('/api/v1/subscriptions'),
  });

  const { data: invoices = [], isLoading: isInvoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['my-invoices'],
    queryFn: () => api.get<Invoice[]>('/api/v1/invoices'),
  });

  const { data: payments = [], isLoading: isPaymentsLoading } = useQuery<Payment[]>({
    queryKey: ['my-payments'],
    queryFn: () => api.get<Payment[]>('/api/v1/payments'),
  });

  const subList = Array.isArray(subscriptions) ? subscriptions : [];
  const invList = Array.isArray(invoices) ? invoices : [];
  const payList = Array.isArray(payments) ? payments : [];

  const activeSubs = subList.filter((s) => s.status === 'active');
  const outstandingInvoices = invList.filter(
    (inv) =>
      ['confirmed', 'partially_paid', 'overdue'].includes(inv.status) &&
      Number(inv.balance_due) > 0
  );

  const totalOutstanding = outstandingInvoices.reduce(
    (sum, inv) => sum + Number(inv.balance_due),
    0
  );

  const overdueInvoices = outstandingInvoices.filter(
    (inv) => new Date(inv.due_date) < new Date()
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-3xl">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/30 text-indigo-100 border border-indigo-400/30 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Customer Self-Service Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-indigo-200 mt-2 text-sm sm:text-base">
            Manage your subscriptions, view invoices, download tax receipts, and pay online securely.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm">
            <span>Active Subscriptions</span>
            <Repeat className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {isSubsLoading ? '...' : activeSubs.length}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {subscriptions.length} total services registered
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm">
            <span>Balance Due</span>
            <AlertCircle
              className={`w-5 h-5 ${totalOutstanding > 0 ? 'text-amber-500' : 'text-emerald-500'}`}
            />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {overdueInvoices.length > 0 ? (
              <span className="text-rose-600 font-medium">
                {overdueInvoices.length} invoice(s) overdue
              </span>
            ) : (
              <span className="text-emerald-600">All due accounts current</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-sm">
            <span>Total Payments Made</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            ₹
            {payList
              .reduce((sum, p) => sum + Number(p.amount), 0)
              .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Across {payList.length} transactions
          </div>
        </div>
      </div>

      {/* Outstanding Invoices Alert Banner */}
      {outstandingInvoices.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                You have {outstandingInvoices.length} unpaid invoice(s) totaling ₹
                {totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-amber-700">
                Please settle payment to prevent service interruptions on recurring subscriptions.
              </p>
            </div>
          </div>
          <Link
            to="/portal/invoices"
            className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap"
          >
            Review & Pay Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      )}

      {/* Grid: Active Plans & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Subscriptions Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-indigo-600" />
              Active Subscriptions
            </h2>
            <Link
              to="/portal/subscriptions"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              View all <ArrowRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>

          {isSubsLoading ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading subscriptions...</div>
          ) : activeSubs.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              No active subscriptions found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeSubs.map((sub) => (
                <div key={sub.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-gray-900 font-mono text-xs">
                      {sub.subscription_number}
                    </span>
                    <div className="text-xs text-gray-500">
                      Billing {sub.billing_interval} (every {sub.interval_count})
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="success">Active</Badge>
                    <div className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      Next: {sub.next_billing_date || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Recent Invoices
            </h2>
            <Link
              to="/portal/invoices"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              View all <ArrowRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>

          {isInvoicesLoading ? (
            <div className="p-6 text-center text-gray-400 text-sm">Loading invoices...</div>
          ) : invList.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No invoices issued yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {invList.slice(0, 5).map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-gray-900 font-mono text-xs">
                      {inv.invoice_number}
                    </span>
                    <div className="text-xs text-gray-500">Due: {inv.due_date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      ₹{Number(inv.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-0.5">
                      <Badge
                        variant={
                          inv.status === 'paid'
                            ? 'success'
                            : inv.status === 'overdue'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

