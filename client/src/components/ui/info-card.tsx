import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface InfoCardProps {
  title: string;
  icon?: LucideIcon;
  variant?: 'default' | 'info' | 'warning' | 'danger' | 'success';
  children: ReactNode;
  className?: string;
}

const variantStyles = {
  default: 'border-l-[var(--brand-accent)]',
  info: 'border-l-[var(--semantic-info)]',
  warning: 'border-l-[var(--semantic-warning)]',
  danger: 'border-l-[var(--semantic-danger)]',
  success: 'border-l-[var(--semantic-success)]',
};

const iconColors = {
  default: 'text-[var(--brand-accent)]',
  info: 'text-[var(--semantic-info)]',
  warning: 'text-[var(--semantic-warning)]',
  danger: 'text-[var(--semantic-danger)]',
  success: 'text-[var(--semantic-success)]',
};

export function InfoCard({ 
  title, 
  icon: Icon, 
  variant = 'default', 
  children,
  className = ''
}: InfoCardProps) {
  return (
    <div className={`bg-[var(--bg-subtle)] rounded-xl p-5 border-l-4 ${variantStyles[variant]} ${className}`}>
      <h5 className="text-base font-bold mb-2 flex items-center gap-2">
        {Icon && <Icon className={`w-[18px] h-[18px] ${iconColors[variant]}`} />}
        {title}
      </h5>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

// Variante para alertas
interface AlertCardProps {
  title: string;
  icon?: LucideIcon;
  variant?: 'info' | 'warning' | 'danger' | 'success';
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

const alertBgStyles = {
  info: 'bg-[var(--semantic-info-light)] border-[var(--semantic-info)]',
  warning: 'bg-[var(--semantic-warning-light)] border-[var(--semantic-warning)]',
  danger: 'bg-[var(--semantic-danger-light)] border-[var(--semantic-danger)]',
  success: 'bg-[var(--semantic-success-light)] border-[var(--semantic-success)]',
};

const alertTextStyles = {
  info: 'text-[var(--semantic-info-dark)]',
  warning: 'text-[var(--semantic-warning-dark)]',
  danger: 'text-[var(--semantic-danger-dark)]',
  success: 'text-[var(--semantic-success-dark)]',
};

export function AlertCard({ 
  title, 
  icon: Icon, 
  variant = 'info', 
  children,
  action,
  className = ''
}: AlertCardProps) {
  return (
    <div className={`rounded-xl p-4 border ${alertBgStyles[variant]} ${className}`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${alertTextStyles[variant]}`} />
        )}
        <div className="flex-1">
          <h5 className={`font-semibold mb-1 ${alertTextStyles[variant]}`}>
            {title}
          </h5>
          <div className={`text-sm ${alertTextStyles[variant]} opacity-90`}>
            {children}
          </div>
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InfoCard;
