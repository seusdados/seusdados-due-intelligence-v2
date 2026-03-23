// =====================================================
// MEUDPO PREMIUM - COMPONENTES DE UI AVANÇADOS
// Seusdados Due Diligence - Módulo MeuDPO v2.0
// =====================================================

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, CheckCircle2, Clock, ArrowRight, Sparkles,
  TrendingUp, TrendingDown, Minus, Bell, X, ChevronRight,
  Zap, Shield, FileText, Users, HelpCircle, GraduationCap,
  ClipboardList, AlertTriangle, Timer, Calendar, User,
  MessageSquare, Paperclip, MoreHorizontal, ExternalLink,
  Copy, Check, Eye, EyeOff, Search, Command, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type TicketType = 
  | "solicitacao_titular" 
  | "incidente_seguranca" 
  | "duvida_juridica" 
  | "consultoria_geral" 
  | "auditoria" 
  | "treinamento" 
  | "documentacao";

export type TicketPriority = "baixa" | "media" | "alta" | "critica";
export type TicketStatus = "novo" | "em_analise" | "aguardando_cliente" | "aguardando_terceiro" | "resolvido" | "cancelado";
export type SLALevel = "padrao" | "prioritario" | "urgente";

// =====================================================
// CONSTANTES DE CONFIGURAÇÃO VISUAL
// =====================================================

export const TICKET_TYPE_CONFIG: Record<TicketType, {
  label: string;
  icon: typeof AlertCircle;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  slaDefault: number;
}> = {
  solicitacao_titular: {
    label: "Solicitação de Titular",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    description: "Requisições de titulares de dados (acesso, correção, exclusão, portabilidade)",
    slaDefault: 15
  },
  incidente_seguranca: {
    label: "Incidente de Segurança",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    description: "Vazamentos, acessos não autorizados, violações de dados",
    slaDefault: 24
  },
  duvida_juridica: {
    label: "Dúvida Jurídica",
    icon: HelpCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Consultas sobre interpretação legal e compliance LGPD",
    slaDefault: 48
  },
  consultoria_geral: {
    label: "Consultoria Geral",
    icon: MessageSquare,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    description: "Orientações sobre boas práticas de privacidade",
    slaDefault: 72
  },
  auditoria: {
    label: "Auditoria",
    icon: ClipboardList,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "Solicitações de auditoria e verificação de conformidade",
    slaDefault: 120
  },
  treinamento: {
    label: "Treinamento",
    icon: GraduationCap,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    description: "Demandas de capacitação em LGPD",
    slaDefault: 168
  },
  documentacao: {
    label: "Documentação",
    icon: FileText,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    description: "Elaboração ou revisão de documentos de privacidade",
    slaDefault: 120
  }
};

export const PRIORITY_CONFIG: Record<TicketPriority, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  baixa: {
    label: "Baixa",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-300",
    dotColor: "bg-slate-400"
  },
  media: {
    label: "Média",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300",
    dotColor: "bg-blue-500"
  },
  alta: {
    label: "Alta",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
    dotColor: "bg-amber-500"
  },
  critica: {
    label: "Crítica",
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-300",
    dotColor: "bg-red-500"
  }
};

export const STATUS_CONFIG: Record<TicketStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Clock;
}> = {
  novo: {
    label: "Novo",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Sparkles
  },
  em_analise: {
    label: "Em Análise",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: Clock
  },
  aguardando_cliente: {
    label: "Aguardando Cliente",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: Users
  },
  aguardando_terceiro: {
    label: "Aguardando Terceiro",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    icon: ExternalLink
  },
  resolvido: {
    label: "Resolvido",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: CheckCircle2
  },
  cancelado: {
    label: "Cancelado",
    color: "text-slate-500",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-300",
    icon: X
  }
};

// =====================================================
// COMPONENTES DE ANIMAÇÃO E FEEDBACK
// =====================================================

// Animação de pulso para badges importantes
export function PulseBadge({ 
  children, 
  pulse = false,
  className 
}: { 
  children: React.ReactNode; 
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex", className)}>
      {pulse && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-20" />
      )}
      <span className="relative inline-flex">{children}</span>
    </span>
  );
}

// Contador animado para métricas
export function AnimatedCounter({ 
  value, 
  duration = 1000,
  prefix = "",
  suffix = "",
  className
}: { 
  value: number; 
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(startValue + (endValue - startValue) * easeProgress);
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{displayValue.toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

// =====================================================
// INDICADOR DE SLA PREMIUM
// =====================================================

export function SLAIndicator({ 
  deadline, 
  status,
  size = "default",
  showLabel = true,
  className
}: { 
  deadline: Date | string | null; 
  status: TicketStatus;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
  className?: string;
}) {
  if (!deadline || status === "resolvido" || status === "cancelado") {
    return null;
  }

  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const now = new Date();
  const totalTime = deadlineDate.getTime() - now.getTime();
  const hoursRemaining = Math.floor(totalTime / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((totalTime % (1000 * 60 * 60)) / (1000 * 60));
  
  const percentUsed = totalTime <= 0 ? 100 : Math.max(0, 100 - (totalTime / (72 * 60 * 60 * 1000)) * 100);

  const getSLAStatus = () => {
    if (totalTime <= 0) return { status: "violated", color: "bg-red-500", textColor: "text-red-600", label: "SLA Violado" };
    if (hoursRemaining <= 4) return { status: "critical", color: "bg-red-500", textColor: "text-red-600", label: "Crítico" };
    if (hoursRemaining <= 12) return { status: "warning", color: "bg-amber-500", textColor: "text-amber-600", label: "Atenção" };
    if (hoursRemaining <= 24) return { status: "attention", color: "bg-yellow-500", textColor: "text-yellow-600", label: "Em Alerta" };
    return { status: "normal", color: "bg-green-500", textColor: "text-green-600", label: "No Prazo" };
  };

  const slaStatus = getSLAStatus();

  const sizeClasses = {
    sm: "h-1.5",
    default: "h-2",
    lg: "h-3"
  };

  const formatTimeRemaining = () => {
    if (totalTime <= 0) {
      const hoursOverdue = Math.abs(hoursRemaining);
      if (hoursOverdue >= 24) {
        return `${Math.floor(hoursOverdue / 24)}d atrasado`;
      }
      return `${hoursOverdue}h atrasado`;
    }
    if (hoursRemaining >= 24) {
      const days = Math.floor(hoursRemaining / 24);
      const hours = hoursRemaining % 24;
      return `${days}d ${hours}h restantes`;
    }
    return `${hoursRemaining}h ${minutesRemaining}m restantes`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("space-y-1", className)}>
            {showLabel && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  SLA
                </span>
                <span className={cn("font-medium", slaStatus.textColor)}>
                  {formatTimeRemaining()}
                </span>
              </div>
            )}
            <div className={cn("w-full bg-muted rounded-full overflow-hidden", sizeClasses[size])}>
              <motion.div
                className={cn("h-full rounded-full", slaStatus.color)}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percentUsed, 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            {slaStatus.status === "violated" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 text-xs text-red-600 font-medium"
              >
                <AlertCircle className="h-3 w-3" />
                {slaStatus.label}
              </motion.div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-sm">
            <p className="font-medium">{slaStatus.label}</p>
            <p className="text-muted-foreground">
              Prazo: {deadlineDate.toLocaleDateString('pt-BR')} às {deadlineDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =====================================================
// BADGE DE STATUS ANIMADO
// =====================================================

export function StatusBadge({ 
  status, 
  size = "default",
  showIcon = true,
  animated = true,
  className
}: { 
  status: TicketStatus; 
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-sm px-2.5 py-1",
    lg: "text-sm px-3 py-1.5"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    default: "h-3.5 w-3.5",
    lg: "h-4 w-4"
  };

  const content = (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors",
      config.bgColor,
      config.borderColor,
      config.color,
      sizeClasses[size],
      className
    )}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );

  if (animated && (status === "novo" || status === "em_analise")) {
    return <PulseBadge pulse>{content}</PulseBadge>;
  }

  return content;
}

// =====================================================
// BADGE DE PRIORIDADE
// =====================================================

export function PriorityBadge({ 
  priority, 
  size = "default",
  showDot = true,
  className
}: { 
  priority: TicketPriority; 
  size?: "sm" | "default" | "lg";
  showDot?: boolean;
  className?: string;
}) {
  const config = PRIORITY_CONFIG[priority];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-sm px-2.5 py-1",
    lg: "text-sm px-3 py-1.5"
  };

  const dotSizes = {
    sm: "h-1.5 w-1.5",
    default: "h-2 w-2",
    lg: "h-2.5 w-2.5"
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors",
      config.bgColor,
      config.borderColor,
      config.color,
      sizeClasses[size],
      className
    )}>
      {showDot && (
        <span className={cn("rounded-full", config.dotColor, dotSizes[size])} />
      )}
      {config.label}
    </span>
  );
}

// =====================================================
// BADGE DE TIPO DE TICKET
// =====================================================

export function TicketTypeBadge({ 
  type, 
  size = "default",
  showIcon = true,
  variant = "default",
  className
}: { 
  type: TicketType; 
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
  variant?: "default" | "outline" | "filled";
  className?: string;
}) {
  const config = TICKET_TYPE_CONFIG[type];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-sm px-2.5 py-1",
    lg: "text-sm px-3 py-1.5"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    default: "h-3.5 w-3.5",
    lg: "h-4 w-4"
  };

  const variantClasses = {
    default: cn(config.bgColor, config.borderColor, config.color, "border"),
    outline: cn("bg-transparent", config.borderColor, config.color, "border"),
    filled: cn(config.color.replace("text-", "bg-").replace("-600", "-500"), "text-white border-transparent")
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}

// =====================================================
// CARD DE MÉTRICA ANIMADO
// =====================================================

export function MetricCard({
  title,
  value,
  previousValue,
  icon: Icon,
  color = "primary",
  format = "number",
  suffix = "",
  loading = false,
  onClick,
  className
}: {
  title: string;
  value: number;
  previousValue?: number;
  icon?: typeof Clock;
  color?: "primary" | "success" | "warning" | "danger" | "info";
  format?: "number" | "percent" | "hours" | "currency";
  suffix?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const colorClasses = {
    primary: "from-primary/10 to-primary/5 border-primary/20",
    success: "from-green-500/10 to-green-500/5 border-green-500/20",
    warning: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    danger: "from-red-500/10 to-red-500/5 border-red-500/20",
    info: "from-blue-500/10 to-blue-500/5 border-blue-500/20"
  };

  const iconColorClasses = {
    primary: "text-primary bg-primary/10",
    success: "text-green-600 bg-green-100",
    warning: "text-amber-600 bg-amber-100",
    danger: "text-red-600 bg-red-100",
    info: "text-blue-600 bg-blue-100"
  };

  const getTrend = () => {
    if (previousValue === undefined) return null;
    const diff = value - previousValue;
    const percent = previousValue !== 0 ? Math.abs((diff / previousValue) * 100).toFixed(1) : 0;
    
    if (diff > 0) return { direction: "up", value: percent, icon: TrendingUp, color: "text-green-600" };
    if (diff < 0) return { direction: "down", value: percent, icon: TrendingDown, color: "text-red-600" };
    return { direction: "neutral", value: 0, icon: Minus, color: "text-muted-foreground" };
  };

  const trend = getTrend();

  const formatValue = (val: number) => {
    switch (format) {
      case "percent": return `${val.toFixed(1)}%`;
      case "hours": return `${val.toFixed(1)}h`;
      case "currency": return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      default: return val.toLocaleString('pt-BR');
    }
  };

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-shadow",
        colorClasses[color],
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          ) : (
            <div className="flex items-baseline gap-1">
              <AnimatedCounter 
                value={value} 
                className="text-2xl font-bold text-foreground"
              />
              {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </div>
          )}
          {trend && !loading && (
            <div className={cn("flex items-center gap-1 text-xs", trend.color)}>
              <trend.icon className="h-3 w-3" />
              <span>{trend.value}%</span>
              <span className="text-muted-foreground">vs. anterior</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("rounded-lg p-2", iconColorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// =====================================================
// QUICK ACTIONS BAR
// =====================================================

export function QuickActionsBar({
  actions,
  className
}: {
  actions: Array<{
    label: string;
    icon: typeof Clock;
    onClick: () => void;
    shortcut?: string;
    disabled?: boolean;
    variant?: "default" | "primary" | "danger";
  }>;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 p-2 bg-muted/50 rounded-lg", className)}>
      {actions.map((action, index) => (
        <TooltipProvider key={index}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={action.variant === "primary" ? "default" : action.variant === "danger" ? "destructive" : "ghost"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className="gap-2"
              >
                <action.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex items-center gap-2">
                <span>{action.label}</span>
                {action.shortcut && (
                  <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">
                    {action.shortcut}
                  </kbd>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  className
}: {
  icon?: typeof FileText;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col items-center justify-center py-12 text-center", className)}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

// =====================================================
// SKELETON LOADERS
// =====================================================

export function TicketCardSkeleton() {
  return (
    <div className="p-4 border rounded-lg animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-5 w-48 bg-muted rounded" />
        </div>
        <div className="h-6 w-20 bg-muted rounded-full" />
      </div>
      <div className="h-4 w-full bg-muted rounded mb-2" />
      <div className="h-4 w-3/4 bg-muted rounded mb-4" />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-muted rounded-full" />
          <div className="h-6 w-16 bg-muted rounded-full" />
        </div>
        <div className="h-4 w-24 bg-muted rounded" />
      </div>
    </div>
  );
}

export function TicketListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TicketCardSkeleton key={i} />
      ))}
    </div>
  );
}

// =====================================================
// NOTIFICATION TOAST
// =====================================================

export function useToast() {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    title: string;
    description?: string;
    type: "success" | "error" | "warning" | "info";
  }>>([]);

  const addToast = (toast: Omit<typeof toasts[0], "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  return { toasts, addToast, setToasts };
}

export function ToastContainer({ toasts, onDismiss }: { 
  toasts: Array<{
    id: string;
    title: string;
    description?: string;
    type: "success" | "error" | "warning" | "info";
  }>;
  onDismiss: (id: string) => void;
}) {
  const typeConfig = {
    success: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 border-green-200" },
    error: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 border-red-200" },
    warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    info: { icon: Bell, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map(toast => {
          const config = typeConfig[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100 }}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-sm",
                config.bg
              )}
            >
              <config.icon className={cn("h-5 w-5 shrink-0", config.color)} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{toast.title}</p>
                {toast.description && (
                  <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default {
  TICKET_TYPE_CONFIG,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  PulseBadge,
  AnimatedCounter,
  SLAIndicator,
  StatusBadge,
  PriorityBadge,
  TicketTypeBadge,
  MetricCard,
  QuickActionsBar,
  EmptyState,
  TicketCardSkeleton,
  TicketListSkeleton,
  useToast,
  ToastContainer
};
