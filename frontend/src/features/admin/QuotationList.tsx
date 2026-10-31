import React, { useState, useEffect } from 'react';
import { Plus, Send, CheckCircle2, XCircle, Repeat, FileDown, Eye } from 'lucide-react';
import { Quotation, Customer, Product, Plan } from '../../types';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const QuotationList: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [lines, setLines] = useState<any[]>([
    { product_id: '', variant_id: '', quantity: 1, discount_amount: 0, tax_rate: 18 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [qData, cData, prData, plData] = await Promise.all([
        api.get<Quotation[]>('/quotations'),
        api.get<Customer[]>('/customers'),
        api.get<Product[]>('/products'),
        api.get<Plan[]>('/plans')
      ]);
      setQuotations(Array.isArray(qData) ? qData : []);
      setCustomers(Array.isArray(cData) ? cData : []);
      setProducts(Array.isArray(prData) ? prData : []);
      setPlans(Array.isArray(plData) ? plData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addLine = () => {
    setLines([...lines, { product_id: '', variant_id: '', quantity: 1, discount_amount: 0, tax_rate: 18 }]);
  };

  const updateLine = (index: number, field: string, val: any) => {
    const updated = [...lines];
    updated[index][field] = val;
    setLines(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    setSubmitting(true);
    try {
      await api.post('/quotations', {
        customer_id: Number(selectedCustomerId),
        issue_date: today,
        expiry_date: expiry,
        currency: 'INR',
        lines: lines.map((l) => ({
          product_id: Number(l.product_id),
          variant_id: l.variant_id ? Number(l.variant_id) : undefined,
          plan_id: selectedPlanId ? Number(selectedPlanId) : undefined,
          quantity: Number(l.quantity),
          discount_amount: Number(l.discount_amount),
          tax_rate: Number(l.tax_rate)
        }))
      });
      setIsOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async (id: number) => {
    try {
      await api.post(`/quotations/${id}/send`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await api.post(`/quotations/${id}/accept`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.post(`/quotations/${id}/reject`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConvert = async (id: number) => {
    try {
      const sub = await api.post<any>(`/quotations/${id}/convert`);
      alert(`Subscription ${sub.subscription_number} created successfully!`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Prepare, send, and convert accepted customer proposals to subscriptions
          </p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Create Quotation
        </button>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Quotation #</th>
                <th className="px-6 py-3.5">Issue Date</th>
                <th className="px-6 py-3.5">Expiry Date</th>
                <th className="px-6 py-3.5">Subtotal</th>
                <th className="px-6 py-3.5">Grand Total</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                    Loading quotations...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                    No quotations created yet. Click "Create Quotation" to start.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                      {q.quotation_number}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{q.issue_date}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{q.expiry_date}</td>
                    <td className="px-6 py-4 font-medium text-slate-700 text-xs">
                      {q.currency} {Number(q.subtotal).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {q.currency} {Number(q.grand_total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={q.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/api/v1/quotations/${q.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </a>

                        {q.status === 'draft' && (
                          <button
                            onClick={() => handleSend(q.id)}
                            title="Send to Customer"
                            className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100"
                          >
                            Send
                          </button>
                        )}

                        {q.status === 'sent' && (
                          <>
                            <button
                              onClick={() => handleAccept(q.id)}
                              title="Mark Accepted"
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(q.id)}
                              title="Mark Rejected"
                              className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {q.status === 'accepted' && (
                          <button
                            onClick={() => handleConvert(q.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm"
                          >
                            <Repeat className="w-3 h-3" />
                            Convert
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

      {/* Create Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create Quotation Proposal" maxWidth="2xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Customer *
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white"
              >
                <option value="">Select Customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.contact_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Associated Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none bg-white"
              >
                <option value="">Select Plan...</option>
                {plans.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name} ({pl.billing_interval})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Lines */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Items & Pricing</span>
              <button
                type="button"
                onClick={addLine}
                className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
              >
                + Add Line
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const selectedProd = products.find((p) => p.id === Number(line.product_id));
                return (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        required
                        value={line.product_id}
                        onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="">Select Product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Base ₹{Number(p.sales_price).toFixed(2)})
                          </option>
                        ))}
                      </select>

                      {/* Variant dropdown */}
                      <select
                        value={line.variant_id}
                        onChange={(e) => updateLine(idx, 'variant_id', e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="">No Variant / Base</option>
                        {selectedProd?.variants?.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.variant_name} (+₹{Number(v.price_adjustment).toFixed(2)})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-2">
                        <div className="w-1/2">
                          <label className="text-[10px] text-slate-400 block">Quantity</label>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs"
                          />
                        </div>
                        <div className="w-1/2">
                          <label className="text-[10px] text-slate-400 block">Discount (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={line.discount_amount}
                            onChange={(e) => updateLine(idx, 'discount_amount', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-sky-600/20 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Save Draft Quotation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

