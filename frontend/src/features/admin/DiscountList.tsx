import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Discount } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Plus, Tag, Calendar, AlertCircle } from 'lucide-react';

export const DiscountList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    value: 10,
    minimum_purchase: 0,
    minimum_quantity: 1,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    usage_limit: 100,
    scope: 'all_products',
    product_ids: [] as number[],
  });

  const { data: discounts = [], isLoading } = useQuery<Discount[]>({
    queryKey: ['discounts'],
    queryFn: () => api.get<Discount[]>('/api/v1/discounts'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/api/v1/discounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      setIsAddOpen(false);
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create discount.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discounts & Promotions</h1>
          <p className="text-sm text-gray-500">Manage campaign discounts, coupon rules, and quantity thresholds</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg('');
            setIsAddOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Discount
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading discounts...</div>
      ) : (Array.isArray(discounts) ? discounts : []).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No discounts active</h3>
          <p className="text-sm text-gray-500 mt-1">Create promotional rules to apply discounts to quotations and invoices.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Name / Code</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Type & Value</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Conditions</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Validity Window</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Usage</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(Array.isArray(discounts) ? discounts : []).map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-500" />
                    {d.name}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {d.discount_type === 'percentage' ? (
                      <span className="font-semibold text-emerald-600">{d.value}% Off</span>
                    ) : (
                      <span className="font-semibold text-indigo-600">₹{d.value} Flat Off</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    <div>Min Purchase: ₹{d.minimum_purchase}</div>
                    <div>Min Quantity: {d.minimum_quantity}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{d.start_date} to {d.end_date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    <span className="font-medium">{d.usage_count}</span>
                    <span className="text-gray-400"> / {d.usage_limit || '∞'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={d.status === 'active' ? 'success' : 'default'}>
                      {d.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Discount Rule">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Discount Name / Coupon</label>
            <input
              type="text"
              required
              placeholder="e.g. SUMMER2026 or EarlyBird10"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Discount Type</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {formData.discount_type === 'percentage' ? 'Percentage Value (%)' : 'Amount (₹)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Minimum Purchase (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.minimum_purchase}
                onChange={(e) => setFormData({ ...formData, minimum_purchase: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Minimum Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.minimum_quantity}
                onChange={(e) => setFormData({ ...formData, minimum_quantity: parseInt(e.target.value) || 1 })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Usage Limit</label>
            <input
              type="number"
              min="1"
              value={formData.usage_limit}
              onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 1 })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Create Discount'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

