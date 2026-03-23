/**
 * Componente de Header padronizado para Dashboards
 * Segue o padrão visual do Dashboard de Maturidade LGPD
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  iconClassName?: string;
}

export function DashboardHeader({ 
  icon: Icon, 
  title, 
  subtitle,
  iconClassName = "bg-gradient-to-br from-violet-500 to-blue-500"
}: DashboardHeaderProps) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className={`p-3 rounded-xl ${iconClassName} shadow-lg`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  valueColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = "bg-violet-100",
  valueColor = "text-foreground"
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-border/50">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </div>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${iconBgColor}`}>
          <Icon className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface IndicatorCardProps {
  title: string;
  module: string;
  value: string | number;
  meta?: string;
  progress?: number;
  count?: string;
  status: 'ok' | 'attention' | 'critical';
  icon: LucideIcon;
}

export function IndicatorCard({
  title,
  module,
  value,
  meta,
  progress = 0,
  count,
  status,
  icon: Icon
}: IndicatorCardProps) {
  const statusConfig = {
    ok: {
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'OK',
      valueColor: 'text-emerald-600'
    },
    attention: {
      badge: 'bg-amber-100 text-amber-700',
      label: 'Atenção',
      valueColor: 'text-amber-600'
    },
    critical: {
      badge: 'bg-red-100 text-red-700',
      label: 'Crítico',
      valueColor: 'text-red-600'
    }
  };

  const config = statusConfig[status];

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-border/50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100">
            <Icon className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <div className="font-semibold text-foreground">{title}</div>
            <div className="text-xs text-muted-foreground">Módulo: {module}</div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.badge}`}>
          {config.label}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Atual</span>
          <span className={`text-xl font-bold ${config.valueColor}`}>{value}</span>
        </div>
        
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              status === 'ok' ? 'bg-emerald-500' : 
              status === 'attention' ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          {meta && <span>Meta: {meta}</span>}
          {count && <span>{count}</span>}
        </div>
      </div>
    </div>
  );
}

export default DashboardHeader;
