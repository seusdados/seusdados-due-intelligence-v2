import { BackButton } from "@/components/BackButton";
import { SmartDPOButton } from "@/components/SmartDPOButton";
import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  backTo?: string;
  showBack?: boolean;
  showDPOButton?: boolean;
  dpoContext?: {
    module: string;
    page: string;
    entityId?: number;
    entityType?: string;
  };
  actions?: ReactNode;
  children?: ReactNode;
  /** Ícone do cabeçalho - quando fornecido, exibe no padrão visual Seusdados */
  icon?: LucideIcon;
}

/**
 * Componente de cabeçalho de página padronizado
 * Inclui: botão voltar, título, subtítulo, badge, botão DPO e ações customizadas
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  backTo,
  showBack = true,
  showDPOButton = true,
  dpoContext,
  actions,
  children,
  icon: Icon
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Linha do botão voltar */}
      {showBack && (
        <div className="mb-4">
          <BackButton to={backTo} />
        </div>
      )}
      
      {/* Cabeçalho principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Ícone com gradiente violeta - Padrão Visual Seusdados */}
          {Icon && (
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25 flex-shrink-0">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          )}
          <div>
            {badge && (
              <p className="text-[0.65rem] font-semibold tracking-[0.3em] text-violet-600 mb-1 uppercase">
                {badge}
              </p>
            )}
            <h1 className="heading-2">
              {title}
            </h1>
            {subtitle && (
              <p className="body-small">
                {subtitle}
              </p>
            )}
            {children}
          </div>
        </div>
        
        {/* Ações do cabeçalho */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {actions}
          {showDPOButton && dpoContext && (
            <SmartDPOButton
              sourceContext={dpoContext}
              variant="outline"
            />
          )}
        </div>
      </div>
    </div>
  );
}
