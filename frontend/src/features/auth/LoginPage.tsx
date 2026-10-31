import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Shield, Users, CreditCard, Sparkles, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface QuickAccount {
  name: string;
  role: string;
  email: string;
  password: string;
  badge: string;
  badgeColor: string;
  scenario: string;
  category: 'staff' | 'customer';
}

const QUICK_ACCOUNTS: QuickAccount[] = [
  // Staff Roles
  {
    name: 'Super Administrator',
    role: 'SUPER_ADMIN',
    email: 'admin@brightloop.io',
    password: 'Admin@Brightloop2026!',
    badge: 'Super Admin',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    scenario: 'Full ERP access, billing batch engine, and system settings',
    category: 'staff',
  },
  {
    name: 'Sarah Jenkins',
    role: 'SALES_STAFF',
    email: 'sales@brightloop.io',
    password: 'SalesStaff@2026!',
    badge: 'Sales Staff',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    scenario: 'Customer creation, quotation authoring, discount rules',
    category: 'staff',
  },
  {
    name: 'Brian Cole',
    role: 'BILLING_STAFF',
    email: 'billing@brightloop.io',
    password: 'BillingStaff@2026!',
    badge: 'Billing Staff',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    scenario: 'Invoicing lifecycle, overdue tracking, scheduled runs',
    category: 'staff',
  },
  {
    name: 'Fiona Gallagher',
    role: 'FINANCE_STAFF',
    email: 'finance@brightloop.io',
    password: 'FinanceStaff@2026!',
    badge: 'Finance Staff',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    scenario: 'Manual payments, refunds, revenue reports & Excel export',
    category: 'staff',
  },
  {
    name: 'Staff Administrator',
    role: 'STAFF_ADMIN',
    email: 'staff.admin@brightloop.io',
    password: 'StaffAdmin@2026!',
    badge: 'Staff Admin',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    scenario: 'Internal team management and role permissions matrix',
    category: 'staff',
  },

  // Customer Portal
  {
    name: 'Nexus Dynamics Inc',
    role: 'CUSTOMER',
    email: 'robert@nexusdynamics.io',
    password: 'Customer@2026!',
    badge: 'Razorpay Online Pay',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold',
    scenario: 'Has open invoice INV-00003 (₹35,400). Test Razorpay modal checkout!',
    category: 'customer',
  },
  {
    name: 'Acme Technologies Pvt Ltd',
    role: 'CUSTOMER',
    email: 'alice@acme.com',
    password: 'Customer@2026!',
    badge: 'Active Monthly Plan',
    badgeColor: 'bg-teal-100 text-teal-700 border-teal-200',
    scenario: 'Active subscription (SUB-00001) with paid and partially paid invoices',
    category: 'customer',
  },
  {
    name: 'HyperScale Cloud Systems',
    role: 'CUSTOMER',
    email: 'sarah@hyperscale.tv',
    password: 'Customer@2026!',
    badge: 'Paused Subscription',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    scenario: 'Paused subscription (SUB-00003) to explore service pause/resume',
    category: 'customer',
  },
  {
    name: 'Apex Freight Logistics',
    role: 'CUSTOMER',
    email: 'david@apexlogistics.in',
    password: 'Customer@2026!',
    badge: 'Overdue & Closed',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
    scenario: 'Overdue invoice INV-00004 (₹5,900) & closed contract history',
    category: 'customer',
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@brightloop.io');
  const [password, setPassword] = useState('Admin@Brightloop2026!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'staff' | 'customer'>('staff');

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setLoading(true);

    try {
      const data = await api.post<{ access_token: string; refresh_token: string }>('/auth/login', {
        email: loginEmail,
        password: loginPass,
      });
      await login(data);
      const me = await api.get<any>('/auth/me');
      const isCust = Array.isArray(me?.roles) && me.roles.some((r: any) => r?.code === 'CUSTOMER');
      navigate(isCust ? '/portal/dashboard' : '/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  const handleQuickSelect = (acc: QuickAccount, autoSubmit: boolean = false) => {
    setEmail(acc.email);
    setPassword(acc.password);
    if (autoSubmit) {
      executeLogin(acc.email, acc.password);
    }
  };

  const currentQuickList = QUICK_ACCOUNTS.filter((acc) => acc.category === activeTab);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500 rounded-2xl text-white font-black text-2xl shadow-lg shadow-sky-500/25 mb-3">
            B
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Brightloop Subscription Platform
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
            Unified recurring billing, subscription lifecycle management, and self-service customer portal
          </p>
        </div>

        {/* Two-Column Card Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sign-in Form (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl shadow-2xl p-7 sm:p-8 border border-slate-800/10">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sign In</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials or use the Quick Access presets on the right
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm transition"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                New enterprise customer?{' '}
                <Link to="/register" className="text-sky-600 hover:text-sky-700 font-semibold">
                  Register public account
                </Link>
              </p>
            </div>
          </div>

          {/* Right Column: Quick Access Presets (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-800 text-white space-y-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white tracking-tight">
                  1-Click Quick Access Logins
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                Click any role to log in instantly
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`flex-1 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === 'staff'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Enterprise Staff ({QUICK_ACCOUNTS.filter((a) => a.category === 'staff').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('customer')}
                className={`flex-1 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === 'customer'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Customer Portal ({QUICK_ACCOUNTS.filter((a) => a.category === 'customer').length})
              </button>
            </div>

            {/* Accounts Grid */}
            <div className="space-y-2.5">
              {currentQuickList.map((acc) => {
                const isSelected = email === acc.email;
                return (
                  <div
                    key={acc.email}
                    onClick={() => handleQuickSelect(acc, false)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800/90 border-sky-500 shadow-sm shadow-sky-500/20 ring-1 ring-sky-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{acc.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${acc.badgeColor}`}
                        >
                          {acc.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{acc.scenario}</p>
                      <div className="text-[11px] text-slate-500 font-mono">{acc.email}</div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickSelect(acc, true);
                        }}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                          acc.category === 'customer'
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
                            : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-600/30'
                        }`}
                      >
                        Login <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
