import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Settings, Save, CheckCircle, AlertCircle, Building, CreditCard, Mail, Key } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: settings = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ['system-settings'],
    queryFn: () => api.get<Record<string, string>>('/api/v1/settings'),
  });

  const [form, setForm] = useState<Record<string, string>>({
    company_name: 'Brightloop Software Pvt Ltd',
    default_currency: 'INR',
    invoice_prefix: 'INV-',
    quotation_prefix: 'QT-',
    default_payment_terms_days: '15',
    tax_number: 'GSTIN27AABCU9603R1ZM',
    support_email: 'billing@brightloop.io',
    razorpay_key_id: 'rzp_test_TuNd1nSE5rzBYA',
    razorpay_webhook_secret: 'brightloop_rzp_webhook_secret_2026',
  });

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setForm((prev) => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (updates: Record<string, string>) => api.patch('/api/v1/settings', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setSuccessMsg('System configuration settings updated successfully.');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update settings.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
        <p className="text-sm text-gray-500">Configure global business settings, taxation rules, prefixes, and payment credentials</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 text-sm rounded-lg flex items-center gap-2 border border-emerald-200">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading settings...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              Organization & Taxation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Legal Name</label>
                <input
                  type="text"
                  required
                  value={form.company_name || ''}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Identification / GSTIN</label>
                <input
                  type="text"
                  value={form.tax_number || ''}
                  onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Default Currency</label>
                <select
                  value={form.default_currency || 'INR'}
                  onChange={(e) => setForm({ ...form, default_currency: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Support / Billing Email</label>
                <input
                  type="email"
                  value={form.support_email || ''}
                  onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Billing & Sequences */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              Invoicing & Terms
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Invoice Number Prefix</label>
                <input
                  type="text"
                  value={form.invoice_prefix || ''}
                  onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Quotation Prefix</label>
                <input
                  type="text"
                  value={form.quotation_prefix || ''}
                  onChange={(e) => setForm({ ...form, quotation_prefix: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Default Due Term (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={form.default_payment_terms_days || '15'}
                  onChange={(e) => setForm({ ...form, default_payment_terms_days: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Payment Gateway Integration */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Razorpay Gateway Credentials
            </h3>
            <p className="text-xs text-gray-500">Live test key and webhook secret for processing customer self-service payments</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-gray-400" />
                  Razorpay Key ID
                </label>
                <input
                  type="text"
                  value={form.razorpay_key_id || ''}
                  onChange={(e) => setForm({ ...form, razorpay_key_id: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-gray-400" />
                  Razorpay Webhook Secret
                </label>
                <input
                  type="password"
                  value={form.razorpay_webhook_secret || ''}
                  onChange={(e) => setForm({ ...form, razorpay_webhook_secret: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving Settings...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

