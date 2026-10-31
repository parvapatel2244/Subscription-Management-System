import React, { useState, useEffect } from 'react';
import { CreditCard, RotateCcw, Search, Eye } from 'lucide-react';
import { Payment } from '../../types';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const PaymentList: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Refund modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPayments = async () => {
    try {
      const data = await api.get<Payment[]>('/payments');
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const openRefund = (p: Payment) => {
    setSelectedPayment(p);
    setRefundAmount(String(p.amount));
    setRefundModalOpen(true);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setProcessing(true);
    try {
      await api.post(`/payments/${selectedPayment.id}/refund`, {
        amount: parseFloat(refundAmount),
        reason: refundReason
      });
      alert('Refund processed and invoice allocations adjusted.');
      setRefundModalOpen(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (err: any) {
      alert(err.message || 'Refund failed');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = payments.filter(
    (p) =>
      p.payment_reference.toLowerCase().includes(search.toLowerCase()) ||
      p.method.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Receipts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit manual collections, online gateway orders, and financial refunds
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by payment reference (e.g. PAY-2026-00001)..."
          className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Payment Ref</th>
                <th className="px-6 py-3.5">Method</th>
                <th className="px-6 py-3.5">Channel / Type</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                      {p.payment_reference}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700 uppercase">
                      {p.method}
                    </td>
                    <td className="px-6 py-4 text-xs capitalize text-slate-500">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          p.payment_type === 'online'
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.payment_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                      {p.currency} {Number(p.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={p.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.status === 'successful' && (
                        <button
                          onClick={() => openRefund(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Modal */}
      {selectedPayment && (
        <Modal
          isOpen={refundModalOpen}
          onClose={() => setRefundModalOpen(false)}
          title={`Process Refund for ${selectedPayment.payment_reference}`}
          maxWidth="md"
        >
          <form onSubmit={handleRefundSubmit} className="space-y-4">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-800">
              Processing a refund will reverse allocations against associated invoice balances.
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Refund Amount ({selectedPayment.currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                max={selectedPayment.amount}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Reason for Refund *
              </label>
              <textarea
                required
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Service cancellation or overpayment adjustment"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Authorize Refund'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

