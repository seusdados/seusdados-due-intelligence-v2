import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        // Semânticos
        success: "bg-[var(--semantic-success-light)] text-[var(--semantic-success-dark)]",
        warning: "bg-[var(--semantic-warning-light)] text-[var(--semantic-warning-dark)]",
        danger: "bg-[var(--semantic-danger-light)] text-[var(--semantic-danger-dark)]",
        info: "bg-[var(--semantic-info-light)] text-[var(--semantic-info-dark)]",
        
        // Neutros
        default: "bg-gray-100 text-gray-700",
        outline: "bg-transparent border border-gray-300 text-gray-700",
        
        // Brand
        accent: "bg-[var(--brand-accent-light)] text-[var(--brand-accent-dark)]",
        accentSolid: "bg-[var(--brand-accent)] text-white",
        
        // Perfis
        admin: "bg-violet-100 text-violet-700",
        consultor: "bg-blue-100 text-blue-700",
        sponsor: "bg-pink-100 text-pink-700",
        comite: "bg-orange-100 text-orange-700",
        liderProcesso: "bg-teal-100 text-teal-700",
        gestorArea: "bg-cyan-100 text-cyan-700",
        terceiro: "bg-indigo-100 text-indigo-700",
        
        // Módulos
        conformidade: "bg-violet-100 text-violet-700",
        duediligence: "bg-teal-100 text-teal-700",
        contratos: "bg-indigo-100 text-indigo-700",
        governanca: "bg-amber-100 text-amber-700",
        meudpo: "bg-pink-100 text-pink-700",
        ged: "bg-slate-100 text-slate-700",
        
        // Status
        new: "bg-red-500 text-white uppercase tracking-wide",
        beta: "bg-purple-500 text-white uppercase tracking-wide",
        pro: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-1",
        lg: "text-sm px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeCustomProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export function BadgeCustom({
  className,
  variant,
  size,
  icon,
  children,
  ...props
}: BadgeCustomProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon}
      {children}
    </span>
  );
}

// Badge com dot indicador
interface BadgeDotProps extends BadgeCustomProps {
  dotColor?: string;
}

export function BadgeDot({
  className,
  variant,
  size,
  dotColor,
  children,
  ...props
}: BadgeDotProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      <span 
        className={cn(
          "w-2 h-2 rounded-full",
          dotColor || "bg-current opacity-70"
        )} 
      />
      {children}
    </span>
  );
}

// Badge para contagem
interface BadgeCountProps {
  count: number;
  max?: number;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  className?: string;
}

const countVariants = {
  default: "bg-gray-500",
  danger: "bg-red-500",
  warning: "bg-amber-500",
  success: "bg-green-500",
};

export function BadgeCount({
  count,
  max = 99,
  variant = 'default',
  className = '',
}: BadgeCountProps) {
  const displayCount = count > max ? `${max}+` : count;
  
  return (
    <span 
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white",
        countVariants[variant],
        className
      )}
    >
      {displayCount}
    </span>
  );
}

export default BadgeCustom;
