import { Link } from "wouter";
import { ChevronRight, Home, History } from "lucide-react";
import { useNavigationHistory } from "@/hooks/useNavigationHistory";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DynamicBreadcrumbsProps {
  showHistory?: boolean;
  maxItems?: number;
  className?: string;
}

export function DynamicBreadcrumbs({ 
  showHistory = true, 
  maxItems = 4,
  className = ""
}: DynamicBreadcrumbsProps) {
  const { getDynamicBreadcrumbs, history, clearHistory } = useNavigationHistory();
  const breadcrumbs = getDynamicBreadcrumbs();

  // Limitar número de itens exibidos
  const displayedBreadcrumbs = breadcrumbs.slice(-maxItems);
  const hasHiddenItems = breadcrumbs.length > maxItems;

  if (displayedBreadcrumbs.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <nav aria-label="Breadcrumb" className={`mb-4 ${className}`}>
        <ol className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          {/* Indicador de itens ocultos */}
          {hasHiddenItems && (
            <>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
                      <History className="h-3 w-3" />
                      <span className="text-xs">...</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium text-xs">Histórico de navegação</p>
                      <div className="text-xs text-muted-foreground">
                        {breadcrumbs.slice(0, -maxItems).map((item, idx) => (
                          <div key={idx}>{item.label}</div>
                        ))}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </li>
              <li>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </li>
            </>
          )}

          {displayedBreadcrumbs.map((item, index) => {
            const isLast = index === displayedBreadcrumbs.length - 1;
            const isHome = item.path === "/";

            return (
              <li key={index} className="flex items-center gap-1">
                {!isLast ? (
                  <Link
                    href={item.path}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {isHome && <Home className="h-4 w-4" />}
                    {!isHome && <span>{item.label}</span>}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium flex items-center gap-1">
                    {isHome && <Home className="h-4 w-4" />}
                    {!isHome && item.label}
                  </span>
                )}
                {!isLast && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                )}
              </li>
            );
          })}

          {/* Botão para limpar histórico (apenas em desenvolvimento ou se showHistory) */}
          {showHistory && history.length > 2 && (
            <li className="ml-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    Limpar
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Limpar histórico de navegação</p>
                </TooltipContent>
              </Tooltip>
            </li>
          )}
        </ol>
      </nav>
    </TooltipProvider>
  );
}

export default DynamicBreadcrumbs;
