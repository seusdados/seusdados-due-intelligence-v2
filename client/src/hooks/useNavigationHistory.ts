import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";

export interface NavigationHistoryItem {
  path: string;
  label: string;
  timestamp: number;
}

// Mapeamento de rotas para labels amigáveis
const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/avaliacoes": "Avaliações de Maturidade",
  "/due-diligence": "Due Diligence",
  "/analise-contratos": "Análise de Contratos",
  "/governanca": "Governança PPPD",
  "/mapeamentos": "Mapeamentos",
  "/mapeamentos-dashboard": "Dashboard Mapeamentos",
  "/meudpo/tickets": "MeuDPO",
  "/central-direitos": "Central de Direitos",
  "/simulador-cppd": "Simulador CPPD",
  "/terceiros": "Terceiros",
  "/organizacoes": "Organizações",
  "/ged": "GED Seusdados",
  "/ged-cliente": "GED Cliente",
  "/templates-lgpd": "Templates LGPD",
  "/usuarios": "Usuários",
  "/convites": "Convites",
  "/administracao": "Administração",
  "/integracao-ia": "Integração IA",
  "/regras-xai": "Regras XAI",
  "/auditoria-xai": "Auditoria XAI",
  "/direitos-titular": "Portal de Direitos",
};

// Padrões de rotas dinâmicas
const DYNAMIC_ROUTE_PATTERNS: { pattern: RegExp; getLabel: (match: RegExpMatchArray) => string }[] = [
  { pattern: /^\/avaliacoes\/(\d+)$/, getLabel: (m) => `Avaliação #${m[1]}` },
  { pattern: /^\/due-diligence\/(\d+)$/, getLabel: (m) => `Avaliação #${m[1]}` },
  { pattern: /^\/analise-contratos\/(\d+)$/, getLabel: (m) => `Contrato #${m[1]}` },
  { pattern: /^\/mapeamentos\/(\d+)$/, getLabel: (m) => `Mapeamento #${m[1]}` },
  { pattern: /^\/meudpo\/tickets\/(\d+)$/, getLabel: (m) => `Chamado #${m[1]}` },
  { pattern: /^\/terceiros\/(\d+)$/, getLabel: (m) => `Terceiro #${m[1]}` },
  { pattern: /^\/organizacoes\/(\d+)$/, getLabel: (m) => `Organização #${m[1]}` },
  { pattern: /^\/governanca\/reuniao\/(\d+)$/, getLabel: (m) => `Reunião #${m[1]}` },
  { pattern: /^\/simulador-cppd\/(\d+)$/, getLabel: (m) => `Simulação #${m[1]}` },
  { pattern: /^\/avaliacoes\/nova$/, getLabel: () => "Nova Avaliação" },
  { pattern: /^\/due-diligence\/nova$/, getLabel: () => "Nova Avaliação" },
  { pattern: /^\/governanca\/nova$/, getLabel: () => "Nova Configuração" },
  { pattern: /^\/simulador-cppd\/nova$/, getLabel: () => "Nova Simulação" },
];

const STORAGE_KEY = "navigation_history";
const MAX_HISTORY_LENGTH = 10;

function getRouteLabel(path: string): string {
  // Primeiro, verificar rotas estáticas
  if (ROUTE_LABELS[path]) {
    return ROUTE_LABELS[path];
  }

  // Depois, verificar padrões dinâmicos
  for (const { pattern, getLabel } of DYNAMIC_ROUTE_PATTERNS) {
    const match = path.match(pattern);
    if (match) {
      return getLabel(match);
    }
  }

  // Fallback: usar o último segmento do path
  const segments = path.split("/").filter(Boolean);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, " ");
  }

  return "Página";
}

function loadHistory(): NavigationHistoryItem[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: NavigationHistoryItem[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignorar erros de storage
  }
}

export function useNavigationHistory() {
  const [location] = useLocation();
  const [history, setHistory] = useState<NavigationHistoryItem[]>(() => loadHistory());

  // Adicionar nova entrada ao histórico quando a localização mudar
  useEffect(() => {
    setHistory((prev) => {
      // Não adicionar se for a mesma página
      if (prev.length > 0 && prev[prev.length - 1].path === location) {
        return prev;
      }

      const newItem: NavigationHistoryItem = {
        path: location,
        label: getRouteLabel(location),
        timestamp: Date.now(),
      };

      // Remover duplicatas anteriores do mesmo path
      const filtered = prev.filter((item) => item.path !== location);

      // Adicionar novo item e limitar tamanho
      const newHistory = [...filtered, newItem].slice(-MAX_HISTORY_LENGTH);

      // Salvar no sessionStorage
      saveHistory(newHistory);

      return newHistory;
    });
  }, [location]);

  // Limpar histórico
  const clearHistory = useCallback(() => {
    setHistory([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  // Obter breadcrumbs dinâmicos baseados no histórico
  const getDynamicBreadcrumbs = useCallback(() => {
    if (history.length === 0) return [];

    // Sempre incluir Dashboard como primeiro item se não estiver no histórico
    const breadcrumbs: NavigationHistoryItem[] = [];
    
    // Adicionar Dashboard se não for a página atual
    if (location !== "/") {
      breadcrumbs.push({
        path: "/",
        label: "Dashboard",
        timestamp: 0,
      });
    }

    // Adicionar itens do histórico relevantes (últimos 3, excluindo Dashboard e página atual)
    const relevantHistory = history
      .filter((item) => item.path !== "/" && item.path !== location)
      .slice(-2);

    breadcrumbs.push(...relevantHistory);

    // Adicionar página atual (sem link)
    breadcrumbs.push({
      path: location,
      label: getRouteLabel(location),
      timestamp: Date.now(),
    });

    return breadcrumbs;
  }, [history, location]);

  return {
    history,
    currentPath: location,
    currentLabel: getRouteLabel(location),
    clearHistory,
    getDynamicBreadcrumbs,
  };
}

export default useNavigationHistory;
