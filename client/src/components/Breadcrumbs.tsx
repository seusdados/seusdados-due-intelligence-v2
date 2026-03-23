import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  const [location] = useLocation();

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {showHome && (
          <>
            <li>
              <Link
                href="/"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="sr-only">Início</span>
              </Link>
            </li>
            {items.length > 0 && (
              <li>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </li>
            )}
          </>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isActive = item.href === location;

          return (
            <li key={index} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={`hover:text-foreground transition-colors ${
                    isActive ? "text-foreground font-medium" : ""
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`${
                    isLast
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Breadcrumb presets for common pages - Atualizado com nova nomenclatura
export const breadcrumbPresets = {
  // Cadastros
  cadastros: [
    { label: "Cadastros", href: "/cadastros" },
  ],
  organizacoes: [
    { label: "Cadastros", href: "/cadastros" },
    { label: "Organizações", href: "/cadastros" },
  ],
  organizacaoDetalhe: (id: string, name?: string) => [
    { label: "Cadastros", href: "/cadastros" },
    { label: name || `Organização #${id}` },
  ],
  terceiros: [
    { label: "Cadastros", href: "/cadastros" },
    { label: "Terceiros", href: "/terceiros" },
  ],
  terceiroDetalhe: (id: string, name?: string) => [
    { label: "Cadastros", href: "/cadastros" },
    { label: "Terceiros", href: "/terceiros" },
    { label: name || `Terceiro #${id}` },
  ],
  usuarios: [
    { label: "Cadastros", href: "/cadastros" },
    { label: "Usuários", href: "/usuarios" },
  ],
  convites: [
    { label: "Cadastros", href: "/cadastros" },
    { label: "Convites", href: "/convites" },
  ],
  
  // Avaliações
  avaliacoes: [
    { label: "Avaliações", href: "/avaliacoes" },
  ],
  conformidade: [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Maturidade LGPD", href: "/avaliacoes" },
  ],
  conformidadeNova: [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Maturidade LGPD", href: "/avaliacoes" },
    { label: "Nova Avaliação" },
  ],
  conformidadeAvaliacao: (id: string, title?: string) => [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Maturidade LGPD", href: "/avaliacoes" },
    { label: title || `Avaliação #${id}` },
  ],
  dueDiligence: [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Due Diligence", href: "/due-diligence" },
  ],
  dueDiligenceNova: [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Due Diligence", href: "/due-diligence" },
    { label: "Nova Avaliação" },
  ],
  dueDiligenceAvaliacao: (id: string, title?: string) => [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Due Diligence", href: "/due-diligence" },
    { label: title || `Avaliação #${id}` },
  ],
  analiseContratos: [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Análise de Contratos", href: "/analise-contratos" },
  ],
  analiseContratosDetalhe: (id: string, title?: string) => [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Análise de Contratos", href: "/analise-contratos" },
    { label: title || `Contrato #${id}` },
  ],
  mapeamentos: [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Mapeamento de Dados", href: "/mapeamentos" },
  ],
  mapeamentosNovo: [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Mapeamento de Dados", href: "/mapeamentos" },
    { label: "Novo Mapeamento" },
  ],
  mapeamentosDetalhe: (id: string, title?: string) => [
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Mapeamento de Dados", href: "/mapeamentos" },
    { label: title || `Mapeamento #${id}` },
  ],
  
  // Governança
  governanca: [
    { label: "Governança", href: "/governanca" },
    { label: "Comitê de Privacidade", href: "/governanca" },
  ],
  governancaNova: [
    { label: "Governança", href: "/governanca" },
    { label: "Comitê de Privacidade", href: "/governanca" },
    { label: "Nova Configuração" },
  ],
  governancaReuniao: (id: string) => [
    { label: "Governança", href: "/governanca" },
    { label: "Comitê de Privacidade", href: "/governanca" },
    { label: `Reunião #${id}` },
  ],
  centralDireitos: [
    { label: "Governança", href: "/governanca" },
    { label: "Direitos dos Titulares", href: "/central-direitos" },
  ],
  incidentes: [
    { label: "Governança", href: "/governanca" },
    { label: "Gestão de Incidentes", href: "/incidentes" },
  ],
  
  // MeuDPO
  meudpo: [
    { label: "MeuDPO", href: "/meudpo" },
  ],
  tickets: [
    { label: "MeuDPO", href: "/meudpo" },
    { label: "Tickets", href: "/meudpo" },
  ],
  ticketDetalhe: (id: string, title?: string) => [
    { label: "MeuDPO", href: "/meudpo" },
    { label: "Tickets", href: "/meudpo" },
    { label: title || `Chamado #${id}` },
  ],
  painelSLA: [
    { label: "MeuDPO", href: "/meudpo" },
    { label: "Painel SLA", href: "/meudpo-sla" },
  ],
  produtividade: [
    { label: "MeuDPO", href: "/meudpo" },
    { label: "Produtividade", href: "/meudpo-produtividade" },
  ],
  relatoriosMeudpo: [
    { label: "MeuDPO", href: "/meudpo" },
    { label: "Relatórios", href: "/meudpo-relatorios" },
  ],
  
  // Documentos
  documentos: [
    { label: "Documentos", href: "/ged" },
  ],
  ged: [
    { label: "Documentos", href: "/ged" },
    { label: "GED Seusdados", href: "/ged" },
  ],
  gedCliente: [
    { label: "Documentos", href: "/ged" },
    { label: "GED Cliente", href: "/ged-cliente" },
  ],
  templates: [
    { label: "Documentos", href: "/ged" },
    { label: "Templates", href: "/templates" },
  ],
  
  // IA
  ia: [
    { label: "Inteligência Artificial", href: "/admin/ia" },
  ],
  assistenteIA: [
    { label: "Inteligência Artificial", href: "/admin/ia" },
    { label: "Assistente IA", href: "/admin/ia" },
  ],
  regrasXAI: [
    { label: "Inteligência Artificial", href: "/admin/ia" },
    { label: "Regras XAI", href: "/admin/ia/xai-regras" },
  ],
  auditoriaXAI: [
    { label: "Inteligência Artificial", href: "/admin/ia" },
    { label: "Auditoria XAI", href: "/admin/ia/xai-auditoria" },
  ],
  
  // Configurações
  config: [
    { label: "Configurações", href: "/catalogo-servicos" },
  ],
  catalogoServicos: [
    { label: "Configurações", href: "/catalogo-servicos" },
    { label: "Catálogo de Serviços", href: "/catalogo-servicos" },
  ],
  simulador: [
    { label: "Configurações", href: "/catalogo-servicos" },
    { label: "Simulador CPPD", href: "/simulador-cppd" },
  ],
  simuladorNovo: [
    { label: "Configurações", href: "/catalogo-servicos" },
    { label: "Simulador CPPD", href: "/simulador-cppd" },
    { label: "Nova Simulação" },
  ],
};

export default Breadcrumbs;
