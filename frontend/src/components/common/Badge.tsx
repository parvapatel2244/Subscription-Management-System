import React from 'react';

interface BadgeProps {
  status?: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ status, variant, children }) => {
  const content = children !== undefined ? children : (status || '');
  const textStr = typeof content === 'string' ? content : String(status || '');
  const s = textStr.toLowerCase();

  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (variant) {
    if (variant === 'success') bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (variant === 'warning') bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
    else if (variant === 'danger') bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
    else if (variant === 'info') bgClass = 'bg-sky-50 text-sky-700 border-sky-200';
    else bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
  } else {
    if (['active', 'paid', 'successful', 'completed', 'converted'].includes(s)) {
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (['partially_paid', 'paused', 'processing', 'pending'].includes(s)) {
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (['overdue', 'failed', 'cancelled', 'rejected', 'closed', 'deactivated'].includes(s)) {
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (['confirmed', 'sent', 'accepted'].includes(s)) {
      bgClass = 'bg-sky-50 text-sky-700 border-sky-200';
    }
  }

  const label = typeof content === 'string' ? content.replace(/_/g, ' ') : content;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${bgClass}`}
    >
      {label}
    </span>
  );
};
