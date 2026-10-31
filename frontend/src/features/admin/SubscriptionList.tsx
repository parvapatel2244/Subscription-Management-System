import React, { useState, useEffect } from 'react';
import {
  Repeat,
  Play,
  Pause,
  XCircle,
  RotateCcw,
  Zap,
  Eye,
  History,
  Calendar,
  Layers
} from 'lucide-react';
import { Subscription, SubscriptionEvent } from '../../types';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const SubscriptionList: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);

  // Action dialogs
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [actionSubId, setActionSubId] = useState<number | null>(null);
  const [actionReason, setActionReason] = useState('');

  const fetchSubscriptions = async () => {
    try {
      const data = await api.get<Subscription[]>('/subscriptions');
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleActivate = async (id: number) => {
    try {
      await api.post(`/subscriptions/${id}/activate`);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionSubId) return;
    try {
      await api.post(`/subscriptions/${actionSubId}/pause`, { reason: actionReason });
      setPauseModalOpen(false);
      setActionReason('');
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResume = async (id: number) => {
    try {
      await api.post(`/subscriptions/${id}/resume`);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionSubId) return;
    try {
      await api.post(`/subscriptions/${actionSubId}/close`, { reason: actionReason });
      setCloseModalOpen(false);
      setActionReason('');
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRenew = async (id: number) => {
    try {
      await api.post(`/subscriptions/${id}/renew`);
      alert('Subscription renewed successfully.');
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBillNow = async (id: number) => {
    try {
      const res = await api.post<any>(`/subscriptions/${id}/bill-now`);
      alert(`${res.message} Invoice ${res.invoice_number} created.`);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openDetails = async (sub: Subscription) => {
    setSelectedSub(sub);
    try {
      const evts = await api.get<SubscriptionEvent[]>(`/subscriptions/${sub.id}/events`);
      setEvents(evts);
    } catch {
      setEvents([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Lifecycle</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Active customer subscriptions, recurring schedules, and term renewals
          </p>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Subscription #</th>
                <th className="px-6 py-3.5">Interval</th>
                <th className="px-6 py-3.5">Start Date</th>
                <th className="px-6 py-3.5">Next Billing Date</th>
                <th className="px-6 py-3.5">Auto Renew</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                    No subscriptions found. Convert an accepted quotation to generate a subscription.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">
                      {s.subscription_number}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700 capitalize">
                      {s.interval_count > 1 ? `${s.interval_count} ` : ''}
                      {s.billing_interval}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{s.start_date}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-sky-700">
                      {s.next_billing_date || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          s.auto_renew ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.auto_renew ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={s.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => openDetails(s)}
                          title="View Details & Event History"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Bill Now */}
                        {s.status === 'active' && (
                          <button
                            onClick={() => handleBillNow(s.id)}
                            title="Generate Recurring Invoice Now"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 border border-sky-200"
                          >
                            <Zap className="w-3 h-3 text-sky-600" />
                            Bill Now
                          </button>
                        )}

                        {/* Lifecycle buttons */}
                        {['draft', 'confirmed'].includes(s.status) && (
                          <button
                            onClick={() => handleActivate(s.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                          >
                            <Play className="w-3 h-3" />
                            Activate
                          </button>
                        )}

                        {s.status === 'active' && (
                          <button
                            onClick={() => {
                              setActionSubId(s.id);
                              setPauseModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 border border-amber-200"
                          >
                            <Pause className="w-3 h-3 text-amber-600" />
                            Pause
                          </button>
                        )}

                        {s.status === 'paused' && (
                          <button
                            onClick={() => handleResume(s.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                          >
                            <Play className="w-3 h-3" />
                            Resume
                          </button>
                        )}

                        {['active', 'paused'].includes(s.status) && (
                          <button
                            onClick={() => {
                              setActionSubId(s.id);
                              setCloseModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                          >
                            <XCircle className="w-3 h-3" />
                            Close
                          </button>
                        )}

                        {s.status === 'closed' && (
                          <button
                            onClick={() => handleRenew(s.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Renew
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

      {/* Details & Event History Modal */}
      {selectedSub && (
        <Modal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          title={`Subscription ${selectedSub.subscription_number}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Status</span>
                <Badge status={selectedSub.status} />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Frequency</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {selectedSub.billing_interval}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Start Date</span>
                <span className="font-semibold text-slate-800">{selectedSub.start_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Next Billing</span>
                <span className="font-bold text-sky-700">{selectedSub.next_billing_date || 'N/A'}</span>
              </div>
            </div>

            {/* Line items snapshot */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase block mb-2">
                Contract Snapshot Lines
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="p-2.5">Item Snapshot</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Unit Price</th>
                      <th className="p-2.5">Tax (%)</th>
                      <th className="p-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSub.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="p-2.5 font-medium text-slate-800">{l.description_snapshot}</td>
                        <td className="p-2.5">{l.quantity}</td>
                        <td className="p-2.5">₹{Number(l.unit_price).toFixed(2)}</td>
                        <td className="p-2.5">{Number(l.tax_snapshot).toFixed(2)}%</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          ₹{Number(l.line_total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Lifecycle Event History */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 mb-2">
                <History className="w-3.5 h-3.5 text-slate-500" />
                Auditable Lifecycle History
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center">No lifecycle events recorded.</div>
                ) : (
                  events.map((e) => (
                    <div
                      key={e.id}
                      className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs flex items-start justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 capitalize">
                          {e.event_type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {e.reason || 'Status updated'} (by {e.performed_by || 'SYSTEM'})
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(e.event_date).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pause Modal */}
      <Modal isOpen={pauseModalOpen} onClose={() => setPauseModalOpen(false)} title="Pause Subscription" maxWidth="sm">
        <form onSubmit={handlePauseSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Pausing this subscription will halt recurring billing until resumed according to plan pause policy.
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Reason for Pause *
            </label>
            <textarea
              required
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. Customer temporary seasonal suspension"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPauseModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-600 text-white font-semibold rounded-lg text-xs shadow-sm"
            >
              Confirm Pause
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Modal */}
      <Modal isOpen={closeModalOpen} onClose={() => setCloseModalOpen(false)} title="Close Subscription" maxWidth="sm">
        <form onSubmit={handleCloseSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Closing will stop future recurring billing for this subscription. Confirmed past invoices will remain preserved.
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Reason for Closure *
            </label>
            <textarea
              required
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. Customer contract termination"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCloseModalOpen(false)}
              className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-rose-600 text-white font-semibold rounded-lg text-xs shadow-sm"
            >
              Confirm Close
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

