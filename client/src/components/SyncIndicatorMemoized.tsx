import { memo, useMemo } from "react";
import { Cloud, CloudOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SyncIndicatorMemoizedProps {
  status: "idle" | "syncing" | "success" | "error";
  lastSyncTime?: Date;
  errorMessage?: string;
  compact?: boolean;
}

const SyncIndicatorMemoized = memo(function SyncIndicatorMemoized({
  status,
  lastSyncTime,
  errorMessage,
  compact = false,
}: SyncIndicatorMemoizedProps) {
  const content = useMemo(() => {
    switch (status) {
      case "syncing":
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
          label: "Sincronizando...",
          color: "text-blue-500",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          label: lastSyncTime
            ? `Sincronizado às ${lastSyncTime.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Sincronizado",
          color: "text-green-500",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          label: errorMessage || "Erro na sincronização",
          color: "text-red-500",
        };
      default:
        return {
          icon: <Cloud className="h-4 w-4 text-gray-400" />,
          label: "Pronto para sincronizar",
          color: "text-gray-400",
        };
    }
  }, [status, lastSyncTime, errorMessage]);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 ${content.color}`}>
              {content.icon}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {content.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 ${content.color}`}>
      {content.icon}
      <span className="text-xs font-medium">{content.label}</span>
    </div>
  );
});

export default SyncIndicatorMemoized;
