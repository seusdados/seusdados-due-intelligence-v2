/**
 * Seusdados Due Diligence - Lazy Loading Pages
 * Code splitting para otimização de performance
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Helper function to create lazy components with suspense
export function lazyWithSuspense<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  const LazyComponent = lazy(importFn);
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={<PageLoader />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// ==================== LAZY LOADED PAGES ====================

// Módulo de Conformidade
export const LazyConformidade = lazyWithSuspense(() => import('./pages/Conformidade'));
export const LazyConformidadeNova = lazyWithSuspense(() => import('./pages/ConformidadeNova'));
export const LazyConformidadeAvaliacao = lazyWithSuspense(() => import('./pages/ConformidadeAvaliacao'));
export const LazyConformidadeResultado = lazyWithSuspense(() => import('./pages/ConformidadeResultado'));
export const LazyConformidadeDominioDetalhes = lazyWithSuspense(() => 
  import('./pages/ConformidadeDominioDetalhes').then(m => ({ default: m.ConformidadeDominioDetalhes }))
);
export const LazyConformidadeAtribuicao = lazyWithSuspense(() => import('./pages/ConformidadeAtribuicao'));

// Módulo de Due Diligence
export const LazyDueDiligence = lazyWithSuspense(() => import('./pages/DueDiligence'));
export const LazyDueDiligenceNova = lazyWithSuspense(() => import('./pages/DueDiligenceNova'));
export const LazyDueDiligenceAvaliacao = lazyWithSuspense(() => import('./pages/DueDiligenceAvaliacao'));
export const LazyDueDiligenceResultado = lazyWithSuspense(() => import('./pages/DueDiligenceResultado'));

// Módulo de Análise de Contratos
export const LazyContractAnalysis = lazyWithSuspense(() => import('./pages/ContractAnalysis'));
export const LazyContractAnalysisDetail = lazyWithSuspense(() => import('./pages/ContractAnalysisDetail'));
export const LazyContractActionPlan = lazyWithSuspense(() => import('./pages/ContractActionPlan'));
export const LazyContractsDashboard = lazyWithSuspense(() => 
  import('./pages/ContractsDashboard').then(m => ({ default: m.ContractsDashboard }))
);
export const LazyLgpdTemplateEditor = lazyWithSuspense(() => import('./pages/LgpdTemplateEditor'));
export const LazyActionPlanDashboard = lazyWithSuspense(() => import('./pages/ActionPlanDashboard'));
export const LazyActionPlanCompliancePage = lazyWithSuspense(() => import('./pages/ActionPlanCompliancePage'));
export const LazyActionPlanContractsPage = lazyWithSuspense(() => import('./pages/ActionPlanContractsPage'));
export const LazyActionPlanDueDiligencePage = lazyWithSuspense(() => import('./pages/ActionPlanDueDiligencePage'));

// Módulo GED
export const LazyGED = lazyWithSuspense(() => import('./pages/GED'));

// Módulo de Governança
export const LazyGovernanca = lazyWithSuspense(() => import('./pages/Governanca'));
export const LazyGovernancaMeetingRoom = lazyWithSuspense(() => import('./pages/GovernancaMeetingRoom'));
export const LazyGovernancaPlanoMensal = lazyWithSuspense(() => import('./pages/GovernancaPlanoMensal'));
export const LazyGovernancaAuditDashboard = lazyWithSuspense(() => import('./pages/GovernancaAuditDashboard'));

// Módulo de Simulador
export const LazySimulador = lazyWithSuspense(() => import('./pages/Simulador'));
export const LazySimuladorHub = lazyWithSuspense(() => import('./pages/SimuladorHub'));
export const LazySimuladorCenarios = lazyWithSuspense(() => import('./pages/SimuladorCenarios'));
export const LazyVisualLawTabletopCPPD = lazyWithSuspense(() => 
  import('./pages/VisualLawTabletopCPPD').then(m => ({ default: m.VisualLawTabletopCPPD }))
);

// Módulo MeuDPO / Tickets
export const LazyTickets = lazyWithSuspense(() => import('./pages/Tickets'));
export const LazyTicketDetail = lazyWithSuspense(() => import('./pages/TicketDetail'));
export const LazyTicketDetailPremium = lazyWithSuspense(() => import('./pages/TicketDetailPremium'));
export const LazyMeudpoSLA = lazyWithSuspense(() => import('./pages/MeudpoSLA'));
export const LazySLADashboard = lazyWithSuspense(() => import('./pages/SLADashboard'));
export const LazyMeudpoConfig = lazyWithSuspense(() => import('./pages/MeudpoConfig'));
export const LazyMeudpoProdutividade = lazyWithSuspense(() => import('./pages/MeudpoProdutividade'));
export const LazyMeudpoTemplates = lazyWithSuspense(() => import('./pages/MeudpoTemplates'));
export const LazyTicketReports = lazyWithSuspense(() => import('./pages/TicketReports'));
export const LazyNovoTicketCliente = lazyWithSuspense(() => import('./pages/NovoTicketCliente'));
export const LazyTicketTags = lazyWithSuspense(() => import('./pages/TicketTags'));
export const LazyCatalogoServicos = lazyWithSuspense(() => import('./pages/CatalogoServicos'));

// Módulo de Mapeamentos
export const LazyMapeamentos = lazyWithSuspense(() => import('./pages/Mapeamentos'));
export const LazyMapeamentoWizard = lazyWithSuspense(() => import('./pages/MapeamentoWizard'));
export const LazyMapeamentoDetalhes = lazyWithSuspense(() => import('./pages/MapeamentoDetalhes'));
export const LazyMapeamentosDashboard = lazyWithSuspense(() => import('./pages/MapeamentosDashboard'));
export const LazyRotDocumentViewer = lazyWithSuspense(() => import('./pages/RotDocumentViewer'));

// Módulo DPIA e Revisão Periódica
export const LazyDpiaDashboard = lazy(() => import('./pages/DpiaDashboard'));
export const LazyDpiaDetail = lazy(() => import('./pages/DpiaDetail'));
export const LazyRipdAdmin = lazy(() => import('./pages/RipdAdmin'));
export const LazyRopaExport = lazy(() => import('./pages/RopaExport'));
export const LazyComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard'));

// Módulo de Direitos dos Titulares
export const LazyCentralDireitos = lazyWithSuspense(() => import('./pages/CentralDireitos'));
export const LazyEntrevistaDigital = lazyWithSuspense(() => import('./pages/EntrevistaDigital'));

// Dashboards
export const LazyDashboardExecutivo = lazyWithSuspense(() => import('./pages/DashboardExecutivo'));
export const LazyDashboardOperacional = lazyWithSuspense(() => import('./pages/DashboardOperacional'));
export const LazyDashboardMetricas = lazyWithSuspense(() => import('./pages/DashboardMetricas'));
export const LazyMaturityDashboard = lazyWithSuspense(() => import('./pages/MaturityDashboard'));
export const LazyCadastrosDashboard = lazyWithSuspense(() => import('./pages/CadastrosDashboard'));
export const LazyPendingDashboard = lazyWithSuspense(() => import('./pages/PendingDashboard'));

// Módulo de IA
export const LazyAdminIA = lazyWithSuspense(() => import('./pages/AdminIA'));
export const LazyChatIA = lazyWithSuspense(() => import('./pages/ChatIA'));
export const LazyXaiRulesPanel = lazyWithSuspense(() => import('./pages/XaiRulesPanel'));
export const LazyXaiAuditDashboard = lazyWithSuspense(() => import('./pages/XaiAuditDashboard'));

// Administração
export const LazyAdmin = lazyWithSuspense(() => import('./pages/Admin'));
export const LazyUsuarios = lazyWithSuspense(() => import('./pages/Usuarios'));
export const LazyOrganizacoes = lazyWithSuspense(() => import('./pages/Organizacoes'));
export const LazyOrganizacaoDetalhes = lazyWithSuspense(() => import('./pages/OrganizacaoDetalhes'));
export const LazyOrganizacaoEditar = lazyWithSuspense(() => import('./pages/OrganizacaoEditar'));
export const LazyConvites = lazyWithSuspense(() => import('./pages/Convites'));

// Terceiros
export const LazyTerceiros = lazyWithSuspense(() => import('./pages/Terceiros'));
export const LazyTerceiroNovo = lazyWithSuspense(() => import('./pages/TerceiroNovo'));
export const LazyTerceiroEditar = lazyWithSuspense(() => import('./pages/TerceiroEditar'));
export const LazyTerceiroDetalhes = lazyWithSuspense(() => import('./pages/TerceiroDetalhes'));
export const LazyTerceiroCadastroMassa = lazyWithSuspense(() => import('./pages/TerceiroCadastroMassa'));

// Relatórios e Histórico
export const LazyHistoricoAvaliacoes = lazyWithSuspense(() => import('./pages/HistoricoAvaliacoes'));
export const LazyRelatoriosAtividades = lazyWithSuspense(() => import('./pages/RelatoriosAtividades'));

// Configurações
export const LazyConfiguracaoLembretes = lazyWithSuspense(() => import('./pages/ConfiguracaoLembretes'));
export const LazyTemplatesUnificados = lazyWithSuspense(() => import('./pages/TemplatesUnificados'));
export const LazyGovbrSignatureConfig = lazyWithSuspense(() => import('./pages/GovbrSignatureConfig'));

// Outros
export const LazyEnviarLinks = lazyWithSuspense(() => import('./pages/EnviarLinks'));
export const LazyAcompanhamentoLinks = lazyWithSuspense(() => import('./pages/AcompanhamentoLinks'));
export const LazyDpaApprovalsDashboard = lazyWithSuspense(() => import('./pages/DpaApprovalsDashboard'));
export const LazyIncidentControlPanel = lazyWithSuspense(() => import('./pages/IncidentControlPanel'));

// Histórico de Notificações
export const LazyNotificationHistory = lazyWithSuspense(() => import('./pages/NotificationHistory'));

// Guia de Estilo
export const LazyStyleGuide = lazyWithSuspense(() => import('./pages/StyleGuide'));


// Gestão de Perfis
export const LazyProfileManagement = lazyWithSuspense(() => import('./pages/ProfileManagement'));

// Framework SeusDados - Maturidade LGPD
export const LazySeusdadosAvaliacao = lazyWithSuspense(() => import('./pages/SeusdadosAvaliacao'));
export const LazySeusdadosAvaliacaoExecucao = lazyWithSuspense(() => import('./pages/SeusdadosAvaliacaoExecucao'));

// Sistema de Avaliações de Conformidade
export const LazyUnifiedAssessments = lazyWithSuspense(() => import('./pages/UnifiedAssessments'));
export const LazyAssessmentDetails = lazyWithSuspense(() => import('./pages/AssessmentDetails'));
export const LazyAssessmentAssignment = lazyWithSuspense(() => import('./pages/AssessmentAssignment'));
export const LazyConsultantPanel = lazyWithSuspense(() => import('./pages/ConsultantPanel'));
export const LazyAssessmentDashboard = lazyWithSuspense(() => import('./pages/AssessmentDashboard'));
export const LazyDeadlineManager = lazyWithSuspense(() => import('./pages/DeadlineManager'));
export const LazyReportViewer = lazyWithSuspense(() => import('./pages/ReportViewer'));
export const LazyConsolidatedAnalysisDashboard = lazyWithSuspense(() =>
  import('./pages/ConsolidatedAnalysisDashboard').then((m) => ({
    default: m.ConsolidatedAnalysisDashboard,
  }))
);


// Status de E-mails
export const LazyEmailStatus = lazyWithSuspense(() => import('./pages/EmailStatus'));

// Taxonomia Admin
export const LazyTaxonomyAdmin = lazyWithSuspense(() => import('./pages/TaxonomyAdmin'));

// Painel Global da Equipe Interna
export const LazyGlobalActionPanel = lazyWithSuspense(() => import('./pages/GlobalActionPanel'));

// Página de Validação de Ação em Tela Completa
export const LazyActionValidationPage = lazyWithSuspense(() => import('./pages/ActionValidationPage'));
