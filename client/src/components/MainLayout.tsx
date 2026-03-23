import { ReactNode, useEffect } from "react";
import { NavMain } from "./NavMain";
import { FocusModeIndicator } from "./FocusModeIndicator";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useIdleTimeout, IDLE_TIMEOUT_DEFAULTS } from "@/hooks/useIdleTimeout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
  requireAuth?: boolean;
}

/**
 * Layout principal com navegação horizontal (Design System v6.1)
 * Substitui o DashboardLayout com sidebar
 */
export function MainLayout({ children, className = '', requireAuth = true }: MainLayoutProps) {
  const { loading, user } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();

  // Idle timeout handler
  const handleIdleLogout = async () => {
    toast.info("Sessão encerrada por inatividade");
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  const {
    showWarning,
    remainingTime,
    resetTimer,
  } = useIdleTimeout({
    timeout: IDLE_TIMEOUT_DEFAULTS.TIMEOUT,
    warningTime: IDLE_TIMEOUT_DEFAULTS.WARNING_TIME,
    onIdle: handleIdleLogout,
    enabled: !!user,
  });

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (!loading && !user && requireAuth) {
      window.location.href = getLoginUrl();
    }
  }, [loading, user, requireAuth]);

  // Redireciona para troca de senha se obrigatória
  useEffect(() => {
    if (!loading && user && (user as any).mustChangePassword) {
      window.location.href = "/definir-senha";
    }
  }, [loading, user]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-accent)]" />
          <p className="text-[var(--text-secondary)]">Carregando...</p>
        </div>
      </div>
    );
  }

  // Não autenticado
  if (!user && requireAuth) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)]">
      <NavMain />
      <FocusModeIndicator />
      <main className={`max-w-[1600px] mx-auto px-4 lg:px-6 py-6 ${className}`}>
        {children}
      </main>
      
      {/* Idle Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={(open) => !open && resetTimer()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sessão Inativa</AlertDialogTitle>
            <AlertDialogDescription>
              Você está inativo há algum tempo. Sua sessão será encerrada em{" "}
              <span className="font-bold text-[var(--brand-accent)]">
                {Math.ceil(remainingTime / 1000)}
              </span>{" "}
              segundos por motivos de segurança.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleIdleLogout}>
              Sair agora
            </AlertDialogCancel>
            <AlertDialogAction onClick={resetTimer}>
              Continuar conectado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componente de cabeçalho de página
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
          {breadcrumb.map((item, index) => (
            <span key={index} className="flex items-center gap-2">
              {index > 0 && <span>/</span>}
              {item.href ? (
                <a href={item.href} className="hover:text-[var(--brand-accent)] transition-colors">
                  {item.label}
                </a>
              ) : (
                <span className="text-[var(--text-secondary)]">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
          {subtitle && (
            <p className="text-[var(--text-secondary)] mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Grid responsivo para cards
interface CardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function CardGrid({ children, columns = 3, className = '' }: CardGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 lg:gap-6 ${className}`}>
      {children}
    </div>
  );
}

// Card de estatística
interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; label: string };
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

const statVariants = {
  default: 'border-l-[var(--brand-accent)]',
  success: 'border-l-[var(--semantic-success)]',
  warning: 'border-l-[var(--semantic-warning)]',
  danger: 'border-l-[var(--semantic-danger)]',
  info: 'border-l-[var(--semantic-info)]',
};

export function StatCard({ title, value, change, icon, variant = 'default', onClick }: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  
  return (
    <Wrapper 
      className={`
        bg-white rounded-xl p-5 border border-[var(--border-default)] border-l-4 ${statVariants[variant]}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow text-left w-full' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)] mb-1">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${change.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change.value >= 0 ? '+' : ''}{change.value}% {change.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-[var(--bg-subtle)]">
            {icon}
          </div>
        )}
      </div>
    </Wrapper>
  );
}

// Seção com título
interface SectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Section({ title, subtitle, children, actions, className = '' }: SectionProps) {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>}
            {subtitle && <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// Card base
interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-[var(--border-default)] ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

// Empty state
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="p-4 rounded-full bg-[var(--bg-subtle)] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

export default MainLayout;
