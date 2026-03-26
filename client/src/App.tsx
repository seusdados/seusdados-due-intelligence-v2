import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { MainLayout } from "./components/MainLayout";
import { FocusModeProvider } from "./contexts/FocusModeContext";
import { Toaster } from "sonner";

// Pages - Public (carregamento imediato para melhor UX)
import Login from "./pages/Login";

import TerceiroAvaliacao from "./pages/TerceiroAvaliacao";
import DireitosTitular from "./pages/DireitosTitular";
import DpaApprovalPublic from "./pages/DpaApprovalPublic";
import AceitarConvite from "./pages/AceitarConvite";
import DefinirSenha from "./pages/DefinirSenha";
import PrimeiroAcesso from "./pages/PrimeiroAcesso";
import EsqueceuSenha from "./pages/EsqueceuSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import EntrevistaDigital from "./pages/EntrevistaDigital";
import EntrevistaPublica from "./pages/EntrevistaPublica";
import GovbrCallback from "./pages/GovbrCallback";
import NotFound from "./pages/NotFound";
import RotPopRendered from "./pages/RotPopRendered";

// Pages - Core (carregamento imediato)
import SelecionarCliente from "./pages/SelecionarCliente";
import ClienteDashboard from "./pages/ClienteDashboard";
import Dashboard from "./pages/Dashboard";
import Perfil from "./pages/Perfil";
import { PaAnpdDashboard } from "./pages/PaAnpdDashboard";
import { PaAnpdIncidentDetail } from "./pages/PaAnpdIncidentDetail";
import { PaAnpdCaseDetail } from "./pages/PaAnpdCaseDetail";
import { PaAnpdCisEditor } from "./pages/PaAnpdCisEditor";
import { PaAnpdEvidences } from "./pages/PaAnpdEvidences";

// Lazy loaded pages (code splitting)
import {
  LazyConformidade,
  LazyConformidadeNova,
  LazyConformidadeAvaliacao,
  LazyConformidadeResultado,
  LazyConformidadeDominioDetalhes,
  LazyConformidadeAtribuicao,

  LazyDueDiligence,
  LazyDueDiligenceNova,
  LazyDueDiligenceAvaliacao,
  LazyDueDiligenceResultado,
  LazyContractAnalysis,
  LazyContractAnalysisDetail,
  LazyContractActionPlan,
  LazyContractsDashboard,
  LazyLgpdTemplateEditor,
  LazyActionPlanCompliancePage,
  LazyActionPlanContractsPage,
  LazyActionPlanDueDiligencePage,
  LazyGED,
  LazyGovernanca,
  LazyGovernancaMeetingRoom,
  LazyGovernancaPlanoMensal,
  LazyGovernancaAuditDashboard,
  LazySimulador,
  LazySimuladorHub,
  LazySimuladorCenarios,
  LazyVisualLawTabletopCPPD,
  LazyTickets,
  LazyTicketDetail,
  LazyTicketDetailPremium,
  LazyMeudpoSLA,
  LazySLADashboard,
  LazyMeudpoConfig,
  LazyMeudpoProdutividade,
  LazyMeudpoTemplates,
  LazyTicketReports,
  LazyNovoTicketCliente,
  LazyTicketTags,
  LazyCatalogoServicos,
  LazyMapeamentos,
  LazyMapeamentoWizard,
  LazyMapeamentoDetalhes,
  LazyMapeamentosDashboard,
  LazyRotDocumentViewer,
  LazyDpiaDashboard,
  LazyDpiaDetail,
  LazyRopaExport,
  LazyComplianceDashboard,
  LazyCentralDireitos,
  LazyDashboardExecutivo,
  LazyDashboardOperacional,
  LazyDashboardMetricas,
  LazyMaturityDashboard,
  LazyCadastrosDashboard,
  LazyPendingDashboard,
  LazyAdminIA,
  LazyChatIA,
  LazyXaiRulesPanel,
  LazyXaiAuditDashboard,
  LazyAdmin,
  LazyUsuarios,
  LazyOrganizacoes,
  LazyOrganizacaoDetalhes,
  LazyOrganizacaoEditar,
  LazyConvites,
  LazyTerceiros,
  LazyTerceiroNovo,
  LazyTerceiroEditar,
  LazyTerceiroDetalhes,
  LazyTerceiroCadastroMassa,
  LazyHistoricoAvaliacoes,
  LazyRelatoriosAtividades,
  LazyConfiguracaoLembretes,
  LazyTemplatesUnificados,
  LazyGovbrSignatureConfig,
  LazyEnviarLinks,
  LazyAcompanhamentoLinks,
  LazyDpaApprovalsDashboard,
  LazyIncidentControlPanel,
  LazyNotificationHistory,
  LazyEmailStatus,
  LazyStyleGuide,
  LazyProfileManagement,
  LazySeusdadosAvaliacao,
  LazySeusdadosAvaliacaoExecucao,
  LazyUnifiedAssessments,
  LazyAssessmentDetails,
  LazyAssessmentAssignment,
  LazyConsultantPanel,
  LazyAssessmentDashboard,
  LazyDeadlineManager,
  LazyReportViewer,
  LazyConsolidatedAnalysisDashboard,
  LazyRipdAdmin,
  LazyTaxonomyAdmin,
  LazyGlobalActionPanel,
  LazyActionValidationPage,
} from "./lazyPages";

function Router() {
  return (
    <Switch>
      {/* Premium markdown-rendered viewer */}
      <Route path="/doc/:kind/:rotId" component={RotPopRendered} />

      {/* Public - Login Page */}
      <Route path="/login" component={Login} />
      <Route path="/definir-senha" component={DefinirSenha} />
      <Route path="/primeiro-acesso/:token" component={PrimeiroAcesso} />
      <Route path="/esqueceu-senha" component={EsqueceuSenha} />
      <Route path="/redefinir-senha/:token" component={RedefinirSenha} />

      {/* Public - Third Party Assessment via Link */}
      <Route path="/avaliacao/:token" component={TerceiroAvaliacao} />

      {/* Public - Accept User Invite */}
      <Route path="/convite/:token" component={AceitarConvite} />

      {/* Public - Entrevista Digital (LEGACY) — DESATIVADO */}
      <Route path="/entrevista">
        {() => <NotFound />}
      </Route>

      {/* Public - Entrevista Pública com Token (Modelo 2) */}
      <Route path="/entrevista/:token" component={EntrevistaPublica} />

      {/* Public - Portal de Direitos do Titular (LGPD Art. 18, § 3º) */}
      <Route path="/direitos-titular" component={DireitosTitular} />

      {/* Public - DPA Approval via Link */}
      <Route path="/dpa-approval/:token" component={DpaApprovalPublic} />

      {/* Gov.br OAuth Callback */}
      <Route path="/govbr/callback" component={GovbrCallback} />

      {/* Consultor/Admin - Select Client */}
      <Route path="/selecionar-cliente" component={SelecionarCliente} />

      {/* Client Dashboard (for consultors viewing a client, or clients viewing their own) */}
      <Route path="/cliente/:organizationId">
        <MainLayout>
          <ClienteDashboard />
        </MainLayout>
      </Route>
      
      {/* Client-specific routes */}
      <Route path="/cliente/:organizationId/terceiros/novo">
        <MainLayout>
          <LazyTerceiroNovo />
        </MainLayout>
      </Route>
      <Route path="/cliente/:organizationId/terceiros/massa">
        <MainLayout>
          <LazyTerceiroCadastroMassa />
        </MainLayout>
      </Route>
      <Route path="/cliente/:organizationId/terceiros/:id">
        <MainLayout>
          <LazyTerceiros />
        </MainLayout>
      </Route>
      {/* OCULTADO: rota legada /conformidade - redirecionamento para /avaliacoes */}
      <Route path="/cliente/:organizationId/conformidade/nova">
        {() => { window.location.replace('/avaliacoes'); return null; }}
      </Route>
      <Route path="/cliente/:organizationId/due-diligence">
        <MainLayout>
          <LazyDueDiligence />
        </MainLayout>
      </Route>
      <Route path="/cliente/:organizationId/due-diligence/nova">
        <MainLayout>
          <LazyDueDiligenceNova />
        </MainLayout>
      </Route>
      <Route path="/cliente/:organizationId/enviar-links">
        <MainLayout>
          <LazyEnviarLinks />
        </MainLayout>
      </Route>
      <Route path="/cliente/:orgId/acompanhamento">
        <MainLayout>
          <LazyAcompanhamentoLinks />
        </MainLayout>
      </Route>
      <Route path="/cliente/:organizationId/historico">
        <MainLayout>
          <LazyHistoricoAvaliacoes />
        </MainLayout>
      </Route>
      <Route path="/cliente/:orgId/configuracao-lembretes">
        <MainLayout>
          <LazyConfiguracaoLembretes />
        </MainLayout>
      </Route>
      <Route path="/cliente/:organizationId/dashboard-executivo">
        <MainLayout>
          <LazyDashboardExecutivo />
        </MainLayout>
      </Route>

      {/* Legacy Dashboard (redirects based on role) */}
      <Route path="/">
        <MainLayout>
          <Dashboard />
        </MainLayout>
      </Route>
      
      {/* Dashboard - mesma rota que / */}
      <Route path="/dashboard">
        <MainLayout>
          <Dashboard />
        </MainLayout>
      </Route>

      {/* Dashboard Operacional */}
      <Route path="/dashboard-operacional">
        <MainLayout>
          <LazyDashboardOperacional />
        </MainLayout>
      </Route>
      <Route path="/metricas">
        <MainLayout>
          <LazyDashboardMetricas />
        </MainLayout>
      </Route>

      {/* Centro de Cadastros (Organizações + Usuários + Convites) */}
      <Route path="/cadastros">
          <LazyCadastrosDashboard />
      </Route>

      {/* Dashboard de Pendências */}
      <Route path="/pendencias">
          <LazyPendingDashboard />
      </Route>

      {/* Organizações */}
      <Route path="/organizacoes">
        <MainLayout>
          <LazyOrganizacoes />
        </MainLayout>
      </Route>
      <Route path="/organizacoes/:id">
        <MainLayout>
          <LazyOrganizacaoDetalhes />
        </MainLayout>
      </Route>
      <Route path="/organizacoes/:id/editar">
        <MainLayout>
          <LazyOrganizacaoEditar />
        </MainLayout>
      </Route>

      {/* Terceiros */}
      <Route path="/terceiros">
        <MainLayout>
          <LazyTerceiros />
        </MainLayout>
      </Route>
      <Route path="/terceiros/novo">
        <MainLayout>
          <LazyTerceiroNovo />
        </MainLayout>
      </Route>
      <Route path="/terceiros/:id/editar">
        <MainLayout>
          <LazyTerceiroEditar />
        </MainLayout>
      </Route>
      <Route path="/terceiros/:id">
        <MainLayout>
          <LazyTerceiroDetalhes />
        </MainLayout>
      </Route>

      {/* Conformidade PPPD - OCULTADO: rota legada, não acessível aos usuários.
         O questionário de maturidade deve ser acessado exclusivamente via /avaliacoes.
         Código mantido internamente para compatibilidade. */}
      {/* Redirecionamento: qualquer acesso a /conformidade/* vai para /avaliacoes */}
      <Route path="/conformidade/:rest*">
        {() => { window.location.replace('/avaliacoes'); return null; }}
      </Route>
      <Route path="/conformidade">
        {() => { window.location.replace('/avaliacoes'); return null; }}
      </Route>
      {/*
      <Route path="/conformidade">
        <MainLayout>
          <LazyConformidade />
        </MainLayout>
      </Route>
      <Route path="/conformidade/nova">
        <MainLayout>
          <LazyConformidadeNova />
        </MainLayout>
      </Route>
      <Route path="/conformidade/avaliacao/:id">
        <MainLayout>
          <LazyConformidadeAvaliacao />
        </MainLayout>
      </Route>
      <Route path="/conformidade/resultado/:id">
        <MainLayout>
          <LazyConformidadeResultado />
        </MainLayout>
      </Route>
      <Route path="/conformidade/:id/atribuir">
        <MainLayout>
          <LazyConformidadeAtribuicao />
        </MainLayout>
      </Route>
      <Route path="/conformidade/avaliacao/:assessmentId/dominio/:domainId">
        <MainLayout>
          <LazyConformidadeDominioDetalhes />
        </MainLayout>
      </Route>
      */}

      {/* Framework SeusDados - Maturidade LGPD */}
      <Route path="/seusdados">
        <MainLayout>
          <LazySeusdadosAvaliacao />
        </MainLayout>
      </Route>
      <Route path="/seusdados/avaliacao/:id">
        <LazySeusdadosAvaliacaoExecucao />
      </Route>

      {/* Due Diligence */}
      <Route path="/due-diligence">
        <MainLayout>
          <LazyDueDiligence />
        </MainLayout>
      </Route>
      <Route path="/due-diligence/nova">
        <MainLayout>
          <LazyDueDiligenceNova />
        </MainLayout>
      </Route>
      <Route path="/due-diligence/avaliacao/:id">
        <MainLayout>
          <LazyDueDiligenceAvaliacao />
        </MainLayout>
      </Route>
      <Route path="/due-diligence/resultado/:id">
        <MainLayout>
          <LazyDueDiligenceResultado />
        </MainLayout>
      </Route>

      {/* Análise de Contratos */}
      <Route path="/analise-contratos">
        <MainLayout>
          <LazyContractAnalysis />
        </MainLayout>
      </Route>
      <Route path="/analise-contratos/dashboard">
        <MainLayout>
          <LazyContractsDashboard />
        </MainLayout>
      </Route>
      <Route path="/analise-contratos/:id">
        <MainLayout>
          <LazyContractAnalysisDetail />
        </MainLayout>
      </Route>
      <Route path="/analise-contratos/:id/plano-acao">
        <MainLayout>
          <LazyContractActionPlan />
        </MainLayout>
      </Route>
      <Route path="/templates-lgpd">
        <MainLayout>
          <LazyLgpdTemplateEditor />
        </MainLayout>
      </Route>
      <Route path="/plano-acao/maturidade">
        <MainLayout>
          <LazyActionPlanCompliancePage />
        </MainLayout>
      </Route>
      <Route path="/plano-acao/contratos">
        <MainLayout>
          <LazyActionPlanContractsPage />
        </MainLayout>
      </Route>
      <Route path="/plano-acao/due-diligence">
        <MainLayout>
          <LazyActionPlanDueDiligencePage />
        </MainLayout>
      </Route>
      <Route path="/plano-acao/validacao/:id">
        <MainLayout>
          <LazyActionValidationPage />
        </MainLayout>
      </Route>
      <Route path="/plano-acao">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/painel-global">
        <MainLayout>
          <LazyGlobalActionPanel />
        </MainLayout>
      </Route>
      <Route path="/dpa-approvals">
        <MainLayout>
          <LazyDpaApprovalsDashboard />
        </MainLayout>
      </Route>

      {/* GED - Gerenciamento Eletrônico de Documentos */}
      <Route path="/ged">
        <MainLayout>
          <LazyGED />
        </MainLayout>
      </Route>
      <Route path="/ged-cliente">
        <MainLayout>
          <LazyGED />
        </MainLayout>
      </Route>

      {/* Governança */}
      <Route path="/governanca">
        <MainLayout>
          <LazyGovernanca />
        </MainLayout>
      </Route>
      <Route path="/governanca/reuniao/:meetingId">
        <MainLayout>
          <LazyGovernancaMeetingRoom />
        </MainLayout>
      </Route>
      <Route path="/governanca/plano-mensal">
        <MainLayout>
          <LazyGovernancaPlanoMensal />
        </MainLayout>
      </Route>
      <Route path="/governanca/plano/:planoId">
        <MainLayout>
          <LazyGovernancaPlanoMensal />
        </MainLayout>
      </Route>
      <Route path="/governanca/auditoria">
        <MainLayout>
          <LazyGovernancaAuditDashboard />
        </MainLayout>
      </Route>

      {/* Simulador CPPD */}
      <Route path="/simulador">
        <MainLayout>
          <LazySimulador />
        </MainLayout>
      </Route>
      <Route path="/simulador-hub">
        <MainLayout>
          <LazySimuladorHub />
        </MainLayout>
      </Route>
      <Route path="/simulador-cenarios">
        <MainLayout>
          <LazySimuladorCenarios />
        </MainLayout>
      </Route>
      <Route path="/tabletop-cppd">
        <MainLayout>
          <LazyVisualLawTabletopCPPD />
        </MainLayout>
      </Route>

      {/* XAI - IA Explicável */}
      <Route path="/xai-rules">
        <MainLayout>
          <LazyXaiRulesPanel />
        </MainLayout>
      </Route>
      <Route path="/xai-audit">
        <MainLayout>
          <LazyXaiAuditDashboard />
        </MainLayout>
      </Route>

      {/* Maturidade */}
      <Route path="/maturidade">
        <MainLayout>
          <LazyMaturityDashboard />
        </MainLayout>
      </Route>

      {/* MeuDPO - Tickets */}
      <Route path="/meudpo">
        <MainLayout>
          <LazyTickets />
        </MainLayout>
      </Route>
      <Route path="/meudpo/ticket/:id">
        <MainLayout>
          <LazyTicketDetail />
        </MainLayout>
      </Route>
      <Route path="/meudpo/ticket-premium/:id">
        <MainLayout>
          <LazyTicketDetailPremium />
        </MainLayout>
      </Route>
      <Route path="/meudpo/sla">
        <MainLayout>
          <LazyMeudpoSLA />
        </MainLayout>
      </Route>
      <Route path="/sla-dashboard">
        <MainLayout>
          <LazySLADashboard />
        </MainLayout>
      </Route>
      <Route path="/meudpo/config">
        <MainLayout>
          <LazyMeudpoConfig />
        </MainLayout>
      </Route>
      <Route path="/meudpo/produtividade">
        <MainLayout>
          <LazyMeudpoProdutividade />
        </MainLayout>
      </Route>
      <Route path="/meudpo/templates">
        <MainLayout>
          <LazyMeudpoTemplates />
        </MainLayout>
      </Route>
      <Route path="/meudpo/reports">
        <MainLayout>
          <LazyTicketReports />
        </MainLayout>
      </Route>
      <Route path="/meudpo/novo-ticket">
        <MainLayout>
          <LazyNovoTicketCliente />
        </MainLayout>
      </Route>
      <Route path="/meudpo/tags">
        <MainLayout>
          <LazyTicketTags />
        </MainLayout>
      </Route>
      <Route path="/meudpo/catalogo">
        <MainLayout>
          <LazyCatalogoServicos />
        </MainLayout>
      </Route>

      {/* Mapeamentos */}
      <Route path="/mapeamentos">
        <MainLayout>
          <LazyMapeamentos />
        </MainLayout>
      </Route>
      <Route path="/mapeamentos/novo">
        <MainLayout>
          <LazyMapeamentoWizard />
        </MainLayout>
      </Route>
      {/* /mapeamentos/:id (LEGACY MANUAL) — Redireciona para /rot/:rotId */}
      <Route path="/mapeamentos/:id">
        {(params: any) => {
          window.location.replace(`/rot/${params?.id}`);
          return null;
        }}
      </Route>
      <Route path="/mapeamentos-dashboard">
        <MainLayout>
          <LazyMapeamentosDashboard />
        </MainLayout>
      </Route>
      <Route path="/rot/:rotId">
        <MainLayout>
          <LazyRotDocumentViewer />
        </MainLayout>
      </Route>

      {/* DPIA e Revisão Periódica */}
      <Route path="/dpia">
          <LazyDpiaDashboard />
      </Route>
      <Route path="/dpia/:id">
        <MainLayout>
          <LazyDpiaDetail />
        </MainLayout>
      </Route>
      <Route path="/taxonomia-admin">
        <MainLayout>
          <LazyTaxonomyAdmin />
        </MainLayout>
      </Route>

      <Route path="/ripd-admin">
          <LazyRipdAdmin />
      </Route>
      <Route path="/mapeamento/ropa-export">
          <LazyRopaExport />
      </Route>
      <Route path="/compliance">
        <MainLayout>
          <LazyComplianceDashboard />
        </MainLayout>
      </Route>

      {/* Central de Direitos dos Titulares */}
      <Route path="/central-direitos">
        <MainLayout>
          <LazyCentralDireitos />
        </MainLayout>
      </Route>

      {/* Incidentes */}
      <Route path="/incidentes">
        <MainLayout>
          <LazyIncidentControlPanel />
        </MainLayout>
      </Route>

      {/* Admin */}
      <Route path="/admin">
        <MainLayout>
          <LazyAdmin />
        </MainLayout>
      </Route>
      <Route path="/usuarios">
        <MainLayout>
          <LazyUsuarios />
        </MainLayout>
      </Route>
      <Route path="/convites">
        <MainLayout>
          <LazyConvites />
        </MainLayout>
      </Route>
      <Route path="/admin/perfis">
          <LazyProfileManagement />
      </Route>

      {/* IA */}
      <Route path="/admin-ia">
        <MainLayout>
          <LazyAdminIA />
        </MainLayout>
      </Route>
      <Route path="/chat-ia">
        <MainLayout>
          <LazyChatIA />
        </MainLayout>
      </Route>

      {/* Configurações */}
      <Route path="/configuracoes">
        <MainLayout>
          <Perfil />
        </MainLayout>
      </Route>
      <Route path="/perfil">
        <MainLayout>
          <Perfil />
        </MainLayout>
      </Route>
      <Route path="/templates-unificados">
        <MainLayout>
          <LazyTemplatesUnificados />
        </MainLayout>
      </Route>
      <Route path="/govbr-config">
        <MainLayout>
          <LazyGovbrSignatureConfig />
        </MainLayout>
      </Route>

      {/* Relatórios */}
      <Route path="/relatorios-atividades">
        <MainLayout>
          <LazyRelatoriosAtividades />
        </MainLayout>
      </Route>

      {/* Histórico de Notificações */}
      <Route path="/historico-notificacoes">
        <MainLayout>
          <LazyNotificationHistory />
        </MainLayout>
      </Route>

      {/* Status de E-mails */}
      <Route path="/email-status">
        <MainLayout>
          <LazyEmailStatus />
        </MainLayout>
      </Route>

      {/* PA ANPD - Gestão de Incidentes */}
      <Route path="/pa-anpd">
        <MainLayout>
          <PaAnpdDashboard />
        </MainLayout>
      </Route>
      <Route path="/pa-anpd/incidente/:id">
        <MainLayout>
          <PaAnpdIncidentDetail />
        </MainLayout>
      </Route>
      <Route path="/pa-anpd/caso/:id">
        <MainLayout>
          <PaAnpdCaseDetail />
        </MainLayout>
      </Route>
      <Route path="/pa-anpd/cis/:id">
        <MainLayout>
          <PaAnpdCisEditor />
        </MainLayout>
      </Route>
      <Route path="/pa-anpd/evidencias/:id">
        <MainLayout>
          <PaAnpdEvidences />
        </MainLayout>
      </Route>

      {/* Guia de Estilo */}
      <Route path="/style-guide">
        <MainLayout>
          <LazyStyleGuide />
        </MainLayout>
      </Route>

      {/* Sistema de Avaliações de Conformidade */}
      <Route path="/avaliacoes">
        <MainLayout>
          <LazyUnifiedAssessments />
        </MainLayout>
      </Route>
      <Route path="/avaliacoes/:id/atribuir">
        <MainLayout>
          <LazyAssessmentAssignment />
        </MainLayout>
      </Route>
      <Route path="/avaliacoes/:id">
        <MainLayout>
          <LazyAssessmentDetails />
        </MainLayout>
      </Route>
      <Route path="/avaliacoes/:assessmentId/consultor">
        <MainLayout>
          <LazyConsultantPanel />
        </MainLayout>
      </Route>
      <Route path="/avaliacoes/:assessmentId/dashboard">
        <MainLayout>
          <LazyAssessmentDashboard />
        </MainLayout>
      </Route>
      <Route path="/prazos">
        <MainLayout>
          <LazyDeadlineManager />
        </MainLayout>
      </Route>
      <Route path="/relatorios">
        <MainLayout>
          <LazyReportViewer />
        </MainLayout>
      </Route>

      <Route path="/avaliacoes/dashboard-consolidado">
        <MainLayout>
          <LazyConsolidatedAnalysisDashboard />
        </MainLayout>
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <FocusModeProvider>
        <TooltipProvider>
          <Router />
          <Toaster position="top-right" richColors closeButton duration={5000} />
        </TooltipProvider>
      </FocusModeProvider>
    </ErrorBoundary>
  );
}

export default App;
