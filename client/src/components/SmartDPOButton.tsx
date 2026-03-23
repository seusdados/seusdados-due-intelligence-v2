import { useAuth } from "@/_core/hooks/useAuth";
import { AcionarDPO } from "./AcionarDPO";
import { CriarDemandaDPO } from "./CriarDemandaDPO";
import type { DPOActionContext } from "./dpo/dpoContext";

interface SmartDPOButtonProps {
  // Suporta tanto o formato antigo (sourceContext) quanto o novo (context)
  sourceContext?: {
    module?: string;
    page?: string;
    entityType?: string;
    entityId?: number;
    entityName?: string;
    additionalData?: Record<string, unknown>;
  };
  context?: DPOActionContext;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  buttonText?: string;
  iconOnly?: boolean;
}

export function SmartDPOButton({ 
  sourceContext, 
  context,
  variant = "outline",
  size = "sm",
  className = "",
  buttonText,
  iconOnly = false
}: SmartDPOButtonProps) {
  const { user } = useAuth();
  
  // Se o usuário é Admin ou Consultor, mostra o painel de gestão DPO
  const isAdminOrConsultor = user?.role === "admin_global" || user?.role === "consultor";
  
  // Mesclar context e sourceContext para compatibilidade
  const mergedContext = context ? {
    module: context.module,
    page: context.page,
    entityType: context.entityType,
    entityId: typeof context.entityId === 'number' ? context.entityId : parseInt(String(context.entityId)) || undefined,
    entityName: context.entityName,
    additionalData: {
      deepLink: context.deepLink,
      snapshot: context.snapshot,
    }
  } : sourceContext;
  
  if (isAdminOrConsultor) {
    return (
      <CriarDemandaDPO 
        sourceContext={mergedContext}
        variant={variant}
        buttonText={buttonText || "MeuDPO"}
      />
    );
  }
  
  // Para usuários normais, mostra o botão de acionar DPO
  return (
    <AcionarDPO 
      sourceContext={mergedContext}
      variant={variant}
      size={size}
      className={className}
      buttonText={buttonText || "MeuDPO"}
      iconOnly={iconOnly}
    />
  );
}

export default SmartDPOButton;
