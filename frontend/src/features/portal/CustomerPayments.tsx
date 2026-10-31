import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Payment } from '../../types';
import { Badge } from '../../components/common/Badge';
import { CreditCard, CheckCircle, Clock, Calendar, ArrowUpRight, RotateCcw } from 'lucide-react';

export const CustomerPayments: React.FC = () => {
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ['my-payments'],
    queryFn: () => api.get<Payment[]>('/api/v1/payments'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-gray-500">
          Receipts of settled transactions, online payment gateway confirmations, and credit adjustments
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading payment history...</div>
      ) : (Array.isArray(payments) ? payments : []).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No payments recorded</h3>
          <p className="text-sm text-gray-500 mt-1">
            Receipts will be displayed here whenever an invoice payment is settled.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Payment Reference</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Method & Type</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount Paid</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Allocations & Refunds</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(Array.isArray(payments) ? payments : []).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>{p.payment_reference}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{p.payment_date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-xs">
                    <div className="font-semibold uppercase tracking-wider text-gray-800">{p.method}</div>
                    <div className="text-gray-400 capitalize">{p.payment_type} Gateway</div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                    ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={p.status === 'successful' ? 'success' : 'default'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {p.allocations && p.allocations.length > 0 && (
                      <div>
                        {p.allocations.map((a) => (
                          <div key={a.id} className="text-indigo-600 font-medium">
                            Invoice #{a.invoice_id} &rarr; ₹{Number(a.allocated_amount).toFixed(2)}
                          </div>
                        ))}
                      </div>
                    )}
                    {p.refunds && p.refunds.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {p.refunds.map((rf) => (
                          <div key={rf.id} className="text-rose-600 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" />
                            Refunded ₹{Number(rf.amount).toFixed(2)} ({rf.status})
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

