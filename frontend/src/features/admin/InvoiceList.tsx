import React, { useState, useEffect } from 'react';
import { FileDown, CheckCircle, XCircle, CreditCard, Search, Filter } from 'lucide-react';
import { Invoice } from '../../types';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Payment Recording Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payNotes, setPayNotes] = useState('');
  const [recording, setRecording] = useState(false);

  const fetchInvoices = async () => {
    try {
      let url = '/invoices';
      if (statusFilter === 'overdue') {
        url = '/invoices/overdue';
      } else if (statusFilter) {
        url = `/invoices?status=${statusFilter}`;
      }
      const data = await api.get<Invoice[]>(url);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleConfirm = async (id: number) => {
    try {
      await api.post(`/invoices/${id}/confirm`);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (id: number) => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;
    try {
      await api.post(`/invoices/${id}/cancel?reason=${encodeURIComponent(reason)}`);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openPayModal = (inv: Invoice) => {
    setActiveInvoice(inv);
    setPayAmount(String(inv.balance_due));
    setPayModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;
    setRecording(true);
    try {
      await api.post('/payments/manual', {
        customer_id: activeInvoice.customer_id,
        invoice_id: activeInvoice.id,
        amount: parseFloat(payAmount),
        method: payMethod,
        notes: payNotes
      });
      setPayModalOpen(false);
      setActiveInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setRecording(false);
    }
  };

  const filtered = invoices.filter((inv) =>
    inv.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Issued billing records, PDF statements, balances, and payment allocations
          </p>
        </div>

        <a
          href="/api/v1/reports/export/invoices"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition shadow-sm"
        >
          <FileDown className="w-4 h-4" />
          Export Invoices Excel
        </a>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number (e.g. INV-2026-00001)..."
            className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg outline-none bg-white font-medium"
          >
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Issue Date</th>
                <th className="px-6 py-3.5">Due Date</th>
                <th className="px-6 py-3.5">Grand Total</th>
                <th className="px-6 py-3.5">Paid</th>
                <th className="px-6 py-3.5">Balance Due</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-xs text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-xs text-slate-400">
                    No invoices matching the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{inv.invoice_date}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{inv.due_date}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900 text-xs">
                      {inv.currency} {Number(inv.grand_total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-700 text-xs">
                      {inv.currency} {Number(inv.amount_paid).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-xs">
                      {inv.currency} {Number(inv.balance_due).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <a
                          href={`/api/v1/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </a>

                        {inv.status === 'draft' && (
                          <button
                            onClick={() => handleConfirm(inv.id)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100"
                          >
                            Confirm
                          </button>
                        )}

                        {inv.balance_due > 0 && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => openPayModal(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                          >
                            <CreditCard className="w-3 h-3" />
                            Record Pay
                          </button>
                        )}

                        {['draft', 'confirmed'].includes(inv.status) && inv.amount_paid === 0 && (
                          <button
                            onClick={() => handleCancel(inv.id)}
                            className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {activeInvoice && (
        <Modal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          title={`Record Payment for ${activeInvoice.invoice_number}`}
          maxWidth="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between">
              <div>
                <span className="text-slate-400 block font-medium">Invoice Balance Due:</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  {activeInvoice.currency} {Number(activeInvoice.balance_due).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Invoice Total:</span>
                <span className="font-semibold text-slate-700 mt-0.5 block">
                  {activeInvoice.currency} {Number(activeInvoice.grand_total).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Payment Amount ({activeInvoice.currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                max={activeInvoice.balance_due}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Payment Method *
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white capitalize"
              >
                <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="upi">UPI Manual Settlement</option>
                <option value="card">Card POS / Offline</option>
                <option value="cash">Cash Settlement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Transaction Reference / Notes
              </label>
              <textarea
                rows={2}
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="e.g. UTR / NEFT reference number 987654321"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={recording}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-600/20 disabled:opacity-50"
              >
                {recording ? 'Allocating...' : 'Allocate & Post Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

