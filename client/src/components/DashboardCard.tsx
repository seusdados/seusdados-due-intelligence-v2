/**
 * =============================================
 * SEUSDADOS DESIGN SYSTEM v6.1
 * COMPONENTE: DashboardCard
 * =============================================
 * 
 * Componente padronizado para TODOS os cards de dashboard.
 * Garante dimensões uniformes, alinhamento consistente,
 * backgrounds, efeitos, botões e textos padronizados.
 * 
 * REGRAS DE USO:
 * 1. Todo card de dashboard DEVE usar este componente
 * 2. Nunca usar <Card> diretamente em dashboards
 * 3. Todos os cards em um grid devem usar a mesma variante
 * 4. Cards são SEMPRE clicáveis (navegar para detalhes)
 * 5. REGRA DE CONTRASTE: Em qualquer área com background de cor
 *    forte/escura (gradientes, cores sólidas), TODOS os textos
 *    DEVEM ser brancos (#FFFFFF). NUNCA usar texto preto/escuro
 *    sobre fundo colorido. Esta regra é INEGOCIÁVEL.
 * 
 * VARIANTES:
 * - stat:    Indicador numérico (KPI) — compacto, 1 linha
 * - module:  Card de módulo — header com gradiente, métricas, botões
 * - info:    Card informativo — lista de itens, tabela, agenda
 * - action:  Card de ação rápida — destaque com CTA
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* =============================================
   TOKENS DE DESIGN — CARD SYSTEM
   ============================================= */

const CARD_TOKENS = {
  // Dimensões mínimas por variante (garante uniformidade no grid)
  height: {
    stat: 'min-h-[120px]',
    module: 'min-h-[320px]',
    info: 'min-h-[280px]',
    action: 'min-h-[160px]',
  },
  // Padding interno uniforme
  padding: {
    stat: 'p-5',
    module: 'p-0',
    info: 'p-5',
    action: 'p-5',
  },
  // Border radius — uniforme para todos
  radius: 'rounded-xl',
  // Sombra padrão + hover
  shadow: 'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]',
  shadowHover: 'hover:shadow-[0_10px_15px_rgba(0,0,0,0.08),0_4px_6px_rgba(0,0,0,0.04)]',
  // Transição padrão
  transition: 'transition-all duration-200 ease-out',
  // Background padrão
  bg: 'bg-card',
  // Border
  border: 'border border-border/50',
  // Tipografia — escala modular 1.35
  text: {
    title: 'text-[1.125rem] font-semibold leading-tight tracking-[-0.01em] text-card-foreground',
    subtitle: 'text-[0.8125rem] font-light leading-relaxed text-muted-foreground',
    value: 'text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-card-foreground',
    valueSmall: 'text-[1.375rem] font-semibold leading-tight text-card-foreground',
    label: 'text-[0.75rem] font-medium uppercase tracking-wider text-muted-foreground',
    body: 'text-[0.875rem] font-light leading-relaxed text-card-foreground/80',
    caption: 'text-[0.75rem] font-light text-muted-foreground',
  },
  // Ícone container
  iconBox: {
    sm: 'w-9 h-9 rounded-lg flex items-center justify-center',
    md: 'w-11 h-11 rounded-xl flex items-center justify-center',
    lg: 'w-14 h-14 rounded-xl flex items-center justify-center',
  },
  iconSize: {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  },
  // Botão padrão dentro de cards
  button: {
    primary: 'h-10 px-5 text-[0.8125rem] font-medium rounded-lg',
    secondary: 'h-10 px-5 text-[0.8125rem] font-medium rounded-lg border',
  },
  // Badge / Tag
  badge: 'inline-flex items-center px-2.5 py-0.5 rounded-md text-[0.6875rem] font-medium uppercase tracking-wider',
} as const;

/* =============================================
   GRADIENTES DE MÓDULO
   ============================================= */

export const MODULE_GRADIENTS = {
  conformidade: 'from-violet-600 via-purple-600 to-violet-700',
  duediligence: 'from-teal-500 via-emerald-500 to-teal-600',
  contratos: 'from-indigo-500 via-blue-500 to-indigo-600',
  governanca: 'from-amber-500 via-orange-500 to-amber-600',
  meudpo: 'from-pink-500 via-rose-500 to-pink-600',
  incidentes: 'from-red-500 via-rose-600 to-red-700',
  ged: 'from-slate-500 via-gray-500 to-slate-600',
  maturidade: 'from-emerald-500 via-green-500 to-emerald-600',
  default: 'from-violet-600 via-indigo-600 to-violet-700',
} as const;

export const ICON_GRADIENTS = {
  violet: 'bg-gradient-to-br from-violet-500 to-indigo-600',
  blue: 'bg-gradient-to-br from-blue-500 to-cyan-500',
  emerald: 'bg-gradient-to-br from-emerald-500 to-green-600',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-500',
  pink: 'bg-gradient-to-br from-pink-500 to-rose-500',
  red: 'bg-gradient-to-br from-red-500 to-orange-500',
  teal: 'bg-gradient-to-br from-teal-500 to-emerald-500',
  indigo: 'bg-gradient-to-br from-indigo-500 to-blue-500',
  slate: 'bg-gradient-to-br from-slate-500 to-gray-500',
} as const;

export type IconGradient = keyof typeof ICON_GRADIENTS;
export type ModuleGradient = keyof typeof MODULE_GRADIENTS;

/* =============================================
   TIPOS
   ============================================= */

type CardVariant = 'stat' | 'module' | 'info' | 'action';

interface BaseCardProps {
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

/* =============================================
   1. STAT CARD — Indicador numérico (KPI)
   ============================================= */

interface StatCardProps extends BaseCardProps {
  icon: LucideIcon;
  iconGradient?: IconGradient;
  value: string | number;
  label: string;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
}

export function StatCard({
  icon: Icon,
  iconGradient = 'violet',
  value,
  label,
  subtitle,
  trend,
  className,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={cn(
        CARD_TOKENS.bg,
        CARD_TOKENS.border,
        CARD_TOKENS.radius,
        CARD_TOKENS.shadow,
        CARD_TOKENS.shadowHover,
        CARD_TOKENS.transition,
        CARD_TOKENS.height.stat,
        CARD_TOKENS.padding.stat,
        'flex items-center gap-4',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className={cn(CARD_TOKENS.iconBox.md, ICON_GRADIENTS[iconGradient], 'shadow-lg flex-shrink-0')}>
        <Icon className={cn(CARD_TOKENS.iconSize.md, 'text-white')} />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={CARD_TOKENS.text.value}>{value}</span>
        <span className={CARD_TOKENS.text.label}>{label}</span>
        {subtitle && <span className={CARD_TOKENS.text.caption}>{subtitle}</span>}
        {trend && (
          <span className={cn(
            'text-[0.75rem] font-medium',
            trend.positive ? 'text-emerald-600' : 'text-red-500'
          )}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

/* =============================================
   2. MODULE CARD — Card de módulo
   ============================================= */

interface ModuleMetric {
  value: string | number;
  label: string;
}

interface ModuleButton {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ModuleCardProps extends BaseCardProps {
  tag?: string;
  title: string;
  subtitle?: string;
  description?: string;
  gradient?: ModuleGradient;
  customGradient?: string;
  metrics?: ModuleMetric[];
  buttons?: ModuleButton[];
  icon?: LucideIcon;
  disabled?: boolean;
  disabledTooltip?: string;
}

export function ModuleCard({
  tag,
  title,
  subtitle,
  description,
  gradient = 'default',
  customGradient,
  metrics,
  buttons,
  icon: Icon,
  className,
  onClick,
  disabled = false,
  disabledTooltip = 'Em breve',
}: ModuleCardProps) {
  const gradientClass = customGradient || MODULE_GRADIENTS[gradient];
  
  return (
    <div
      className={cn(
        CARD_TOKENS.bg,
        CARD_TOKENS.border,
        CARD_TOKENS.radius,
        CARD_TOKENS.shadow,
        !disabled && CARD_TOKENS.shadowHover,
        CARD_TOKENS.transition,
        CARD_TOKENS.height.module,
        'overflow-hidden flex flex-col relative',
        disabled ? 'cursor-default opacity-50 grayscale pointer-events-none' : (onClick && 'cursor-pointer'),
        className
      )}
      onClick={disabled ? undefined : onClick}
      title={disabled ? disabledTooltip : undefined}
    >
      {disabled && (
        <div 
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-auto cursor-default"
          title={disabledTooltip}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="sr-only">{disabledTooltip}</span>
        </div>
      )}
      {/* Header com gradiente — altura fixa */}
      {/* REGRA DE CONTRASTE: TODO texto dentro de gradiente DEVE ser branco */}
      <div className={cn(
        `bg-gradient-to-br ${gradientClass}`,
        'px-5 pt-5 pb-4 flex-shrink-0',
        '[&_*]:!text-white [&]:text-white'
      )}>
        {tag && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[0.6875rem] font-medium uppercase tracking-wider bg-white/20 !text-white mb-2">
            {tag}
          </span>
        )}
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 !text-white" />
            </div>
          )}
          <div>
            <h3 className="text-[1.125rem] font-semibold leading-tight !text-white">{title}</h3>
            {subtitle && <p className="text-[0.8125rem] font-light !text-white/80 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Body — flex-grow para empurrar footer */}
      <div className="flex-1 px-5 pt-4 pb-3">
        {description && (
          <p className={cn(CARD_TOKENS.text.body, 'line-clamp-3')}>{description}</p>
        )}
        
        {/* Métricas — grid uniforme */}
        {metrics && metrics.length > 0 && (
          <div className={cn(
            'grid gap-3 mt-4',
            metrics.length <= 2 ? 'grid-cols-2' : 
            metrics.length <= 4 ? 'grid-cols-4' : 'grid-cols-4'
          )}>
            {metrics.map((metric, idx) => (
              <div key={idx} className="text-center">
                <span className={CARD_TOKENS.text.valueSmall}>{metric.value}</span>
                <span className={cn(CARD_TOKENS.text.label, 'block mt-0.5')}>{metric.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer — botões uniformes */}
      {buttons && buttons.length > 0 && (
        <div className="px-5 pb-5 pt-2 flex gap-2 flex-shrink-0">
          {buttons.map((btn, idx) => (
            <Button
              key={idx}
              variant={btn.variant === 'secondary' ? 'outline' : 'default'}
              className={cn(
                'flex-1',
                CARD_TOKENS.button[btn.variant || 'primary'],
                btn.variant === 'secondary' 
                  ? 'bg-transparent hover:bg-muted/50' 
                  : `bg-gradient-to-r ${gradientClass} text-white`
              )}
              onClick={(e) => {
                e.stopPropagation();
                btn.onClick();
              }}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =============================================
   3. INFO CARD — Card informativo
   ============================================= */

interface InfoCardProps extends BaseCardProps {
  icon?: LucideIcon;
  iconGradient?: IconGradient;
  title: string;
  subtitle?: string;
  badge?: { text: string; variant?: 'default' | 'success' | 'warning' | 'danger' };
  headerAction?: React.ReactNode;
}

export function InfoCard({
  icon: Icon,
  iconGradient = 'violet',
  title,
  subtitle,
  badge,
  headerAction,
  children,
  className,
  onClick,
}: InfoCardProps) {
  const badgeColors = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  };

  return (
    <div
      className={cn(
        CARD_TOKENS.bg,
        CARD_TOKENS.border,
        CARD_TOKENS.radius,
        CARD_TOKENS.shadow,
        CARD_TOKENS.shadowHover,
        CARD_TOKENS.transition,
        CARD_TOKENS.height.info,
        CARD_TOKENS.padding.info,
        'flex flex-col',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Header padronizado */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn(CARD_TOKENS.iconBox.sm, ICON_GRADIENTS[iconGradient], 'shadow-md')}>
              <Icon className={cn(CARD_TOKENS.iconSize.sm, 'text-white')} />
            </div>
          )}
          <div>
            <h3 className={CARD_TOKENS.text.title}>{title}</h3>
            {subtitle && <p className={CARD_TOKENS.text.subtitle}>{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className={cn(CARD_TOKENS.badge, badgeColors[badge.variant || 'default'])}>
              {badge.text}
            </span>
          )}
          {headerAction}
        </div>
      </div>

      {/* Content — flex-grow */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

/* =============================================
   4. ACTION CARD — Card de ação rápida
   ============================================= */

interface ActionCardProps extends BaseCardProps {
  icon: LucideIcon;
  iconGradient?: IconGradient;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ActionCard({
  icon: Icon,
  iconGradient = 'violet',
  title,
  description,
  actionLabel,
  onAction,
  className,
  onClick,
}: ActionCardProps) {
  return (
    <div
      className={cn(
        CARD_TOKENS.bg,
        CARD_TOKENS.border,
        CARD_TOKENS.radius,
        CARD_TOKENS.shadow,
        CARD_TOKENS.shadowHover,
        CARD_TOKENS.transition,
        CARD_TOKENS.height.action,
        CARD_TOKENS.padding.action,
        'flex items-center gap-4',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className={cn(CARD_TOKENS.iconBox.lg, ICON_GRADIENTS[iconGradient], 'shadow-lg flex-shrink-0')}>
        <Icon className={cn(CARD_TOKENS.iconSize.lg, 'text-white')} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={CARD_TOKENS.text.title}>{title}</h3>
        {description && <p className={cn(CARD_TOKENS.text.body, 'mt-1 line-clamp-2')}>{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button
          variant="outline"
          className={cn(CARD_TOKENS.button.secondary, 'flex-shrink-0')}
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/* =============================================
   5. GRID HELPERS — Layouts de grid padronizados
   ============================================= */

interface CardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

export function CardGrid({ children, columns = 3, className }: CardGridProps) {
  const colClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  };

  return (
    <div className={cn(
      'grid gap-5',
      colClasses[columns],
      className
    )}>
      {children}
    </div>
  );
}

/* =============================================
   6. SECTION HEADER — Título de seção padronizado
   ============================================= */

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-5', className)}>
      <div>
        <h2 className="text-[1.375rem] font-semibold leading-tight tracking-[-0.01em] text-card-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[0.8125rem] font-light text-muted-foreground mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/* =============================================
   EXPORT TOKENS (para uso direto em CSS-in-JS)
   ============================================= */

export { CARD_TOKENS };
export type { CardVariant, StatCardProps, ModuleCardProps, InfoCardProps, ActionCardProps };
