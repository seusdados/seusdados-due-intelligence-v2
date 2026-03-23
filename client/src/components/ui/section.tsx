import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface SectionProps {
  title: string;
  icon?: LucideIcon;
  tag?: string;
  tagVariant?: 'new' | 'default';
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

export function Section({ 
  title, 
  icon: Icon, 
  tag, 
  tagVariant = 'default',
  children,
  className = '',
  headerAction
}: SectionProps) {
  return (
    <section className={`bg-white border border-[var(--border-default)] rounded-2xl overflow-hidden ${className}`}>
      <div className="px-6 py-5 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold flex items-center gap-3">
            {Icon && <Icon className="w-[22px] h-[22px] text-[var(--brand-accent)]" />}
            {title}
          </h2>
          {tag && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              tagVariant === 'new' 
                ? 'bg-red-500 text-white uppercase tracking-wide' 
                : 'bg-[var(--brand-accent-light)] text-[var(--brand-accent-dark)]'
            }`}>
              {tag}
            </span>
          )}
        </div>
        {headerAction && (
          <div className="flex items-center gap-2">
            {headerAction}
          </div>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </section>
  );
}

// Variante compacta para cards menores
interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'elevated';
}

const variantStyles = {
  default: 'bg-white border border-[var(--border-default)]',
  bordered: 'bg-white border-2 border-[var(--brand-accent)]',
  elevated: 'bg-white shadow-lg border-0',
};

export function SectionCard({ 
  title, 
  icon: Icon, 
  children,
  className = '',
  variant = 'default'
}: SectionCardProps) {
  return (
    <div className={`rounded-xl overflow-hidden ${variantStyles[variant]} ${className}`}>
      <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
        <h3 className="text-base font-semibold flex items-center gap-2">
          {Icon && <Icon className="w-[18px] h-[18px] text-[var(--brand-accent)]" />}
          {title}
        </h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export default Section;
