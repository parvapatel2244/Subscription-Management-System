import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { DashboardOverview } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Percent,
  Download,
  CheckCircle,
} from 'lucide-react';

interface MonthlyRevenue {
  month: string;
  amount: number;
}

export const ReportView: React.FC = () => {
  const [downloading, setDownloading] = useState(false);

  const { data: overview, isLoading: isOverviewLoading } = useQuery<DashboardOverview>({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.get<DashboardOverview>('/api/v1/reports/dashboard/overview'),
  });

  const { data: revenueData = [], isLoading: isRevLoading } = useQuery<MonthlyRevenue[]>({
    queryKey: ['revenue-report'],
    queryFn: () => api.get<MonthlyRevenue[]>('/api/v1/reports/revenue'),
  });

  const handleExportExcel = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/reports/export/invoices', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice report.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brightloop_invoices_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Export error');
    } finally {
      setDownloading(false);
    }
  };

  const revList = Array.isArray(revenueData) ? revenueData : [];
  const maxRevenue = Math.max(...revList.map((d) => d.amount), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports & Analytics</h1>
          <p className="text-sm text-gray-500">
            Real-time recurring revenue metrics, collection efficiency, and invoice audit reports
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={downloading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
          {downloading ? 'Generating Report...' : 'Export Invoices to Excel'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Net Revenue Received"
          value={`₹${(overview?.revenue_received || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
          description="Total settled payments net of refunds"
        />
        <StatCard
          title="Monthly Recurring Revenue (MRR)"
          value={`₹${(overview?.mrr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
          description={`ARR: ₹${(overview?.arr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
        />
        <StatCard
          title="Collection Rate"
          value={`${overview?.collection_rate || 0}%`}
          icon={<Percent className="w-6 h-6 text-blue-600" />}
          description="Paid amount / Total invoiced amount"
        />
        <StatCard
          title="Outstanding Receivables"
          value={`₹${(overview?.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
          description="Unpaid balances across open invoices"
        />
        <StatCard
          title="Overdue Invoices"
          value={overview?.overdue_invoices_count || 0}
          icon={<AlertTriangle className="w-6 h-6 text-rose-600" />}
          description={`Overdue amount: ₹${(overview?.overdue_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
        />
        <StatCard
          title="Active Subscriptions"
          value={overview?.active_subscriptions || 0}
          icon={<CheckCircle className="w-6 h-6 text-teal-600" />}
          description="Paying subscriptions currently active"
        />
      </div>

      {/* Monthly Revenue Visual Trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Monthly Revenue Breakdown
          </h2>
          <span className="text-xs text-gray-500">Based on settled payment receipts</span>
        </div>

        {isRevLoading ? (
          <div className="p-8 text-center text-gray-500">Loading trend data...</div>
        ) : revList.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No completed payment transactions recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {revList.map((item) => {
              const percentage = Math.round((item.amount / maxRevenue) * 100);
              return (
                <div key={item.month} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.month}</span>
                    <span className="font-semibold text-gray-900">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

