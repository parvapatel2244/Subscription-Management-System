import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  FileSpreadsheet,
  Repeat,
  Receipt,
  CreditCard,
  Percent,
  BarChart3,
  ShieldAlert,
  Settings,
  UserCheck,
  Building2,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, isCustomer, hasPermission, hasRole } = useAuth();

  const adminNav = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/customers', label: 'Customers', icon: Users, perm: 'customer.view' },
    { to: '/admin/products', label: 'Products', icon: Package, perm: 'product.view' },
    { to: '/admin/plans', label: 'Plans & Taxes', icon: Layers, perm: 'plan.view' },
    { to: '/admin/quotations', label: 'Quotations', icon: FileSpreadsheet, perm: 'quotation.view' },
    { to: '/admin/subscriptions', label: 'Subscriptions', icon: Repeat, perm: 'subscription.view' },
    { to: '/admin/invoices', label: 'Invoices', icon: Receipt, perm: 'invoice.view' },
    { to: '/admin/payments', label: 'Payments', icon: CreditCard, perm: 'payment.view' },
    { to: '/admin/discounts', label: 'Discounts', icon: Percent, perm: 'discount.view' },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3, perm: 'reports.view' },
    { to: '/admin/staff', label: 'Staff & Roles', icon: UserCheck, perm: 'staff.manage' },
    { to: '/admin/audit', label: 'Audit Logs', icon: ShieldAlert, perm: 'audit.view' },
    { to: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings.manage' },
  ];

  const customerNav = [
    { to: '/portal/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/portal/subscriptions', label: 'My Subscriptions', icon: Repeat },
    { to: '/portal/quotations', label: 'My Quotations', icon: FileSpreadsheet },
    { to: '/portal/invoices', label: 'Invoices & Payments', icon: Receipt },
    { to: '/portal/payments', label: 'Payment History', icon: CreditCard },
    { to: '/portal/profile', label: 'Account Profile', icon: Building2 },
  ];

  const items = isCustomer ? customerNav : adminNav;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen text-slate-300">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-sky-500/20">
          B
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-tight">Brightloop</span>
          <span className="block text-[10px] text-sky-400 uppercase font-semibold tracking-wider">
            {isCustomer ? 'Customer Portal' : 'Enterprise ERP'}
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          if ('perm' in item && typeof item.perm === 'string' && !hasPermission(item.perm)) {
            return null;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30 text-xs text-slate-500">
        <div className="font-medium text-slate-400 truncate">{user?.name}</div>
        <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
      </div>
    </aside>
  );
};

