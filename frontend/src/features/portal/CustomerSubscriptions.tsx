import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Subscription } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Repeat, Calendar, CheckCircle, Clock, Eye, AlertCircle, FileText } from 'lucide-react';

export const CustomerSubscriptions: React.FC = () => {
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['my-subscriptions'],
    queryFn: () => api.get<Subscription[]>('/api/v1/subscriptions'),
  });

  const subList = Array.isArray(subscriptions) ? subscriptions : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Subscriptions</h1>
        <p className="text-sm text-gray-500">
          Overview of recurring plans, service renewal dates, and contracted line items
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading your subscriptions...</div>
      ) : subList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Repeat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No subscriptions found</h3>
          <p className="text-sm text-gray-500 mt-1">
            You do not have any active or pending software subscriptions on your account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subList.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4 hover:border-indigo-200 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {sub.subscription_number}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">
                    Started on {sub.start_date}
                  </div>
                </div>
                <Badge
                  variant={
                    sub.status === 'active'
                      ? 'success'
                      : sub.status === 'paused'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {sub.status}
                </Badge>
              </div>

              {/* Line items summary */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Included Services
                </div>
                {sub.lines.map((l) => (
                  <div key={l.id} className="flex justify-between text-gray-800 text-xs">
                    <span>
                      {l.description_snapshot} (x{l.quantity})
                    </span>
                    <span className="font-medium">
                      ₹{Number(l.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Schedule Info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                <div>
                  <span className="text-gray-400 block">Billing Cycle:</span>
                  <span className="font-semibold text-gray-800 capitalize">
                    {sub.billing_interval} ({sub.interval_count})
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Next Renewal:</span>
                  <span className="font-semibold text-gray-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    {sub.next_billing_date || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  {sub.auto_renew ? 'Auto-Renewal Enabled' : 'Manual Renewal'}
                </span>
                <button
                  onClick={() => setSelectedSub(sub)}
                  className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subscription Details Modal */}
      <Modal
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        title={`Subscription Details: ${selectedSub?.subscription_number}`}
      >
        {selectedSub && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg">
              <div>
                <span className="text-xs text-gray-500">Status</span>
                <div className="mt-0.5">
                  <Badge variant={selectedSub.status === 'active' ? 'success' : 'default'}>
                    {selectedSub.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Billing Cadence</span>
                <div className="font-semibold capitalize text-gray-800">
                  {selectedSub.billing_interval} (Every {selectedSub.interval_count})
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Commencement Date</span>
                <div className="font-medium text-gray-800">{selectedSub.start_date}</div>
              </div>
              <div>
                <span className="text-xs text-gray-500">Next Scheduled Invoice</span>
                <div className="font-medium text-indigo-600">
                  {selectedSub.next_billing_date || 'N/A'}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                Contracted Line Items
              </h4>
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600">Description</th>
                    <th className="px-3 py-2 text-center text-gray-600">Qty</th>
                    <th className="px-3 py-2 text-right text-gray-600">Rate (₹)</th>
                    <th className="px-3 py-2 text-right text-gray-600">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedSub.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 text-gray-900 font-medium">
                        {l.description_snapshot}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{l.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        ₹{Number(l.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 font-semibold">
                        ₹{Number(l.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedSub.events && selectedSub.events.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                  Lifecycle Timeline
                </h4>
                <div className="space-y-2 border-l-2 border-indigo-200 pl-3">
                  {selectedSub.events.map((ev) => (
                    <div key={ev.id} className="text-xs">
                      <div className="font-medium text-gray-800">
                        {ev.event_type.replace('_', ' ').toUpperCase()} &rarr; {ev.new_status}
                      </div>
                      <div className="text-gray-400">
                        {new Date(ev.event_date).toLocaleString()} • {ev.reason || 'Standard update'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

