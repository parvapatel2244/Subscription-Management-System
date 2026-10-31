import React, { useState, useEffect } from 'react';
import { Plus, Search, Building2, Mail, Phone, Eye, ExternalLink } from 'lucide-react';
import { Customer } from '../../types';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [custSummary, setCustSummary] = useState<any>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [state, setState] = useState('Maharashtra');
  const [postalCode, setPostalCode] = useState('400001');
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      const url = search ? `/customers?search=${encodeURIComponent(search)}` : '/customers';
      const data = await api.get<Customer[]>(url);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/customers', {
        company_name: companyName,
        contact_name: contactName,
        email,
        phone,
        tax_number: taxNumber,
        address: {
          address_line1: 'Corporate Park Block B',
          city,
          state,
          postal_code: postalCode,
          country: 'India'
        }
      });
      setIsCreateOpen(false);
      // Reset form
      setCompanyName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setTaxNumber('');
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = async (cust: Customer) => {
    setSelectedCust(cust);
    try {
      const summary = await api.get<any>(`/customers/${cust.id}/summary`);
      setCustSummary(summary);
    } catch {
      setCustSummary(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage customer organizations, billing profiles, and accounts
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company name, contact, customer code, or email..."
          className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
        />
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Company & Contact</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Phone</th>
                <th className="px-6 py-3.5">Tax / GSTIN</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">
                      {c.customer_code}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{c.company_name}</div>
                      <div className="text-xs text-slate-500">{c.contact_name}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{c.email}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{c.phone || '—'}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">{c.tax_number || '—'}</td>
                    <td className="px-6 py-4">
                      <Badge status={c.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleView(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register New Customer">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Solaris Technologies Ltd"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Alice Smith"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@solaris.io"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Tax / GSTIN Number
              </label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="27AAAAA0000A1Z5"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-sky-600/20 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      {selectedCust && (
        <Modal
          isOpen={!!selectedCust}
          onClose={() => setSelectedCust(null)}
          title={`Customer: ${selectedCust.company_name}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Customer Code</span>
                <span className="font-mono font-bold text-slate-800">{selectedCust.customer_code}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Contact Person</span>
                <span className="font-semibold text-slate-800">{selectedCust.contact_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Email</span>
                <span className="text-slate-800 font-medium">{selectedCust.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Status</span>
                <Badge status={selectedCust.status} />
              </div>
            </div>

            {/* Financial Summary */}
            {custSummary && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-sky-700 block uppercase">
                    Active Contracts
                  </span>
                  <span className="text-lg font-bold text-sky-950 mt-1 block">
                    {custSummary.active_subscriptions}
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-emerald-700 block uppercase">
                    Total Paid
                  </span>
                  <span className="text-lg font-bold text-emerald-950 mt-1 block">
                    ₹{custSummary.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl">
                  <span className="text-[11px] font-semibold text-rose-700 block uppercase">
                    Outstanding Due
                  </span>
                  <span className="text-lg font-bold text-rose-950 mt-1 block">
                    ₹{custSummary.total_outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCust(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

