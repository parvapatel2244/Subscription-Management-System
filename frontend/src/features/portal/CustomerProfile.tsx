import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Building,
  Mail,
  Phone,
  Save,
  CheckCircle,
  AlertCircle,
  MapPin,
  CreditCard,
} from 'lucide-react';

export const CustomerProfile: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['my-customer-profile'],
    queryFn: () => api.get<Customer[]>('/api/v1/customers'),
  });

  const customer = Array.isArray(customers) ? customers[0] : null;

  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    tax_number: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        company_name: customer.company_name || '',
        contact_name: customer.contact_name || '',
        phone: customer.phone || '',
        tax_number: customer.tax_number || '',
      });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!customer?.id) throw new Error('Customer ID missing');
      return api.patch(`/api/v1/customers/${customer.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-customer-profile'] });
      setSuccessMsg('Profile information updated successfully.');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update profile.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const address = customer?.addresses?.[0];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing Profile & Account</h1>
        <p className="text-sm text-gray-500">
          Manage your organization credentials, tax numbers, and primary contact information
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading profile...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Edit Form */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              Company Details
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Legal Name</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Primary Contact Person</label>
                <input
                  type="text"
                  required
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Registered Email (Read-Only)</label>
                <input
                  type="email"
                  disabled
                  value={customer?.email || user?.email || ''}
                  className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMutation.isPending ? 'Saving...' : 'Update Information'}
                </button>
              </div>
            </form>
          </div>

          {/* Side Info Cards */}
          <div className="space-y-6">
            {/* Account Code */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Customer Account Code
              </span>
              <div className="font-mono text-xl font-bold text-indigo-600">
                {customer?.customer_code || 'N/A'}
              </div>
              <p className="text-xs text-gray-500">
                Quote this identifier whenever contacting enterprise support.
              </p>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Default Billing Address
              </h4>
              {address ? (
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="font-medium text-gray-800">{address.address_line1}</div>
                  {address.address_line2 && <div>{address.address_line2}</div>}
                  <div>
                    {address.city}, {address.state} {address.postal_code}
                  </div>
                  <div>{address.country}</div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No primary address registered.</p>
              )}
            </div>

            {/* Terms */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Billing Profile Terms
              </h4>
              <div className="text-xs text-gray-600 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">Currency:</span>
                  <span className="font-semibold text-gray-800">
                    {customer?.billing_profile?.currency || 'INR'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Standard Payment Due:</span>
                  <span className="font-semibold text-gray-800">
                    {customer?.billing_profile?.payment_terms_days || 15} Days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

