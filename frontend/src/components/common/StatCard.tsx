import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon: LucideIcon | React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  description,
  icon,
  trend,
  trendUp,
  color = 'blue'
}) => {
  const colorMap = {
    blue: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    purple: 'bg-indigo-50 text-indigo-600'
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    // Icon is a component type (function or React.forwardRef object from Lucide)
    const IconComponent = icon as React.ElementType;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
          {renderIcon()}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {(subtitle || description || trend) && (
          <div className="mt-1 flex items-center text-xs text-slate-500">
            {trend && (
              <span className={`font-semibold mr-1.5 ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend}
              </span>
            )}
            <span>{subtitle || description}</span>
          </div>
        )}
      </div>
    </div>
  );
};
