import React, { useState, useEffect } from 'react';
import { Plus, Layers, Receipt, Check, X } from 'lucide-react';
import { Plan, Tax, Product } from '../../types';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const PlanList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'plans' | 'taxes'>('plans');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Plan Modal
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [billingInterval, setBillingInterval] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [intervalCount, setIntervalCount] = useState(1);
  const [minQty, setMinQty] = useState(1);
  const [amount, setAmount] = useState('2500.00');
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [allowPause, setAllowPause] = useState(true);
  const [allowEarlyClose, setAllowEarlyClose] = useState(true);
  const [allowRenewal, setAllowRenewal] = useState(true);

  // Tax Modal
  const [isTaxOpen, setIsTaxOpen] = useState(false);
  const [taxName, setTaxName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [taxRate, setTaxRate] = useState('18.00');

  const loadData = async () => {
    try {
      const [plansData, taxesData, prodsData] = await Promise.all([
        api.get<Plan[]>('/plans'),
        api.get<Tax[]>('/plans/taxes/list'),
        api.get<Product[]>('/products')
      ]);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setTaxes(Array.isArray(taxesData) ? taxesData : []);
      setProducts(Array.isArray(prodsData) ? prodsData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/plans', {
        name: planName,
        plan_code: planCode,
        billing_interval: billingInterval,
        interval_count: Number(intervalCount),
        minimum_quantity: Number(minQty),
        amount: parseFloat(amount),
        currency: 'INR',
        product_ids: selectedProductIds,
        allow_pause: allowPause,
        allow_early_close: allowEarlyClose,
        allow_renewal: allowRenewal
      });
      setIsPlanOpen(false);
      setPlanName('');
      setPlanCode('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/plans/taxes', {
        name: taxName,
        tax_code: taxCode,
        tax_type: 'percentage',
        rate: parseFloat(taxRate),
        effective_from: new Date().toISOString().split('T')[0]
      });
      setIsTaxOpen(false);
      setTaxName('');
      setTaxCode('');
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Plans & Tax Rules</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure subscription billing cycles, minimum limits, and tax rates
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'plans' ? (
            <button
              onClick={() => setIsPlanOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-sky-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              New Subscription Plan
            </button>
          ) : (
            <button
              onClick={() => setIsTaxOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-sky-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Configure Tax Rule
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-sm font-semibold transition border-b-2 ${
            activeTab === 'plans'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Subscription Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('taxes')}
          className={`pb-3 text-sm font-semibold transition border-b-2 ${
            activeTab === 'taxes'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Tax Rules ({taxes.length})
        </button>
      </div>

      {/* Plans View */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-slate-400 text-sm">Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-400 text-sm">
              No subscription plans configured yet.
            </div>
          ) : (
            plans.map((pl) => (
              <div
                key={pl.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                      {pl.plan_code}
                    </span>
                    <Badge status={pl.status} />
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mt-3">{pl.name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 capitalize">
                    <span>Billing:</span>
                    <span className="font-semibold text-slate-800">
                      Every {pl.interval_count > 1 ? `${pl.interval_count} ` : ''}
                      {pl.billing_interval}
                    </span>
                  </div>

                  {pl.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{pl.description}</p>
                  )}

                  {/* Settings checklist */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1">
                      {pl.allow_pause ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-300" />
                      )}
                      <span>Pause</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {pl.allow_early_close ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-300" />
                      )}
                      <span>Early Close</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {pl.allow_renewal ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-300" />
                      )}
                      <span>Auto Renew</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Min Qty: {pl.minimum_quantity}</span>
                  <span className="font-bold text-sky-600 capitalize">{pl.billing_interval} cycle</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Taxes View */}
      {activeTab === 'taxes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Tax Name</th>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Rate (%)</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-400">
                    No tax rules configured yet.
                  </td>
                </tr>
              ) : (
                taxes.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-800">{t.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{t.tax_code}</td>
                    <td className="px-6 py-4 text-xs capitalize text-slate-500">{t.tax_type}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{Number(t.rate).toFixed(2)}%</td>
                    <td className="px-6 py-4">
                      <Badge status={t.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Plan Modal */}
      <Modal isOpen={isPlanOpen} onClose={() => setIsPlanOpen(false)} title="Create Subscription Plan" maxWidth="xl">
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Plan Name *
              </label>
              <input
                type="text"
                required
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Enterprise Yearly Plan"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Plan Code *
              </label>
              <input
                type="text"
                required
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value)}
                placeholder="PLAN-ENT-YR"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Frequency *
              </label>
              <select
                value={billingInterval}
                onChange={(e: any) => setBillingInterval(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none capitalize"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Interval Count
              </label>
              <input
                type="number"
                min={1}
                value={intervalCount}
                onChange={(e) => setIntervalCount(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Plan Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-bold"
              />
            </div>
          </div>

          {/* Associated Product Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
              Select Products in this Plan
            </label>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1.5">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-50 p-1.5 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedProductIds([...selectedProductIds, p.id]);
                      else setSelectedProductIds(selectedProductIds.filter((id) => id !== p.id));
                    }}
                  />
                  <span>{p.name} ({p.product_code}) - ₹{Number(p.sales_price).toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Permissions checkboxes */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allowPause} onChange={(e) => setAllowPause(e.target.checked)} />
              <span>Allow Pause</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allowEarlyClose} onChange={(e) => setAllowEarlyClose(e.target.checked)} />
              <span>Early Close</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={allowRenewal} onChange={(e) => setAllowRenewal(e.target.checked)} />
              <span>Auto Renewal</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsPlanOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-sky-600/20"
            >
              Save Plan
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Tax Modal */}
      <Modal isOpen={isTaxOpen} onClose={() => setIsTaxOpen(false)} title="Configure Tax Rule" maxWidth="md">
        <form onSubmit={handleCreateTax} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Tax Name *</label>
            <input
              type="text"
              required
              value={taxName}
              onChange={(e) => setTaxName(e.target.value)}
              placeholder="GST Standard 18%"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Tax Code *</label>
              <input
                type="text"
                required
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                placeholder="GST18"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Rate (%) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="18.00"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none font-bold"
              />
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsTaxOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-sky-600/20"
            >
              Save Tax Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

