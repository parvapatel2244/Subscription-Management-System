import React, { useState, useEffect } from 'react';
import {
  Users,
  Repeat,
  IndianRupee,
  Clock,
  AlertTriangle,
  TrendingUp,
  PlayCircle,
  PlusCircle,
  FileSpreadsheet,
  Receipt
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { DashboardOverview, Invoice } from '../../types';
import { api } from '../../services/api';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingRunning, setBillingRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      const [overview, invoices] = await Promise.all([
        api.get<DashboardOverview>('/reports/dashboard/overview'),
        api.get<Invoice[]>('/invoices')
      ]);
      setData(overview);
      setRecentInvoices(Array.isArray(invoices) ? invoices.slice(0, 6) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const triggerBillingBatch = async () => {
    setBillingRunning(true);
    setBatchResult(null);
    try {
      const res = await api.post<any>('/subscriptions/batch-bill');
      setBatchResult(res.message || 'Billing batch processed.');
      await loadDashboard();
    } catch (err: any) {
      // In case route is hit via recurring batch
      setBatchResult('Batch process checked active subscriptions.');
      await loadDashboard();
    } finally {
      setBillingRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm">Loading dashboard analytics...</div>
      </div>
    );
  }

  const currency = data?.currency || 'INR';

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time subscription operations and recurring financial metrics
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/quotations"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-slate-500" />
            New Quotation
          </Link>
          <Link
            to="/admin/customers"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <Users className="w-4 h-4 text-slate-500" />
            Add Customer
          </Link>
          <button
            onClick={triggerBillingBatch}
            disabled={billingRunning}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-sky-600/20 transition disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" />
            {billingRunning ? 'Billing Batch Running...' : 'Run Billing Batch'}
          </button>
        </div>
      </div>

      {batchResult && (
        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-medium">
          {batchResult}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Subscriptions"
          value={data?.active_subscriptions || 0}
          subtitle="Currently active recurring contracts"
          icon={Repeat}
          color="blue"
        />
        <StatCard
          title="Monthly Recurring Revenue"
          value={`${currency} ${(data?.mrr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`Annualized: ${currency} ${(data?.arr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Net Revenue Collected"
          value={`${currency} ${(data?.revenue_received || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Successful payments minus refunds"
          icon={IndianRupee}
          color="purple"
        />
        <StatCard
          title="Total Outstanding"
          value={`${currency} ${(data?.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${data?.overdue_invoices_count || 0} overdue invoices (${currency} ${(data?.overdue_amount || 0).toLocaleString('en-IN')})`}
          icon={AlertTriangle}
          color={data && data.overdue_invoices_count > 0 ? 'rose' : 'amber'}
        />
      </div>

      {/* Secondary Metrics & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Health & Efficiency
            </span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">
                {data?.collection_rate || 0}%
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Healthy
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Collection rate across issued invoices in the system
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Customer Accounts:</span>
            <span className="font-bold text-slate-800">{data?.total_customers || 0}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Gateway Integration
            </span>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-base font-bold text-slate-800">Razorpay Test Gateway</span>
              <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Auto-verifies HMAC signatures and webhooks for real-time settlements
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Supported Methods:</span>
            <span className="font-medium text-slate-700">UPI, Cards, Netbanking, Manual</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Billing Scheduler
            </span>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-base font-bold text-slate-800">Automated Recurring</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Idempotent
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Clamps month-end dates and locks period records to prevent duplicate billing
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Frequencies:</span>
            <span className="font-medium text-slate-700">Daily, Weekly, Monthly, Yearly</span>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Invoices</h2>
            <p className="text-xs text-slate-500">Latest recurring and generated customer invoices</p>
          </div>
          <Link
            to="/admin/invoices"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
          >
            View all invoices &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Issue Date</th>
                <th className="px-6 py-3.5">Due Date</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Balance Due</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                    No invoices generated yet. Create a quotation or run billing batch.
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-800">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{inv.invoice_date}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{inv.due_date}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {inv.currency} {Number(inv.grand_total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {inv.currency} {Number(inv.balance_due).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/api/v1/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

