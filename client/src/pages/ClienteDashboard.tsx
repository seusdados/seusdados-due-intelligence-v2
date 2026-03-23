import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { TaskDelegationModal } from "@/components/TaskDelegationModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { StatCard, ModuleCard, InfoCard, CardGrid, SectionHeader, CARD_TOKENS } from "@/components/DashboardCard";
import { 
  Building2, Users, FileCheck, Shield,
  ArrowLeft, Plus, Send, ClipboardList,
  AlertTriangle, CheckCircle, Clock,
  ExternalLink, BarChart3, Eye, HardDrive,
  Scale, TrendingUp, MessageSquare,
  Headphones, RefreshCw
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

export default function ClienteDashboard() {
  const { user } = useAuth();
  const params = useParams<{ organizationId: string }>();
  const organizationId = parseInt(params.organizationId || "0");
  const [, setLocation] = useLocation();
  const [delegationModal, setDelegationModal] = useState({ isOpen: false, taskId: 0, taskTitle: '' });

  const { data: organization, isLoading: loadingOrg } = trpc.organization.getById.useQuery(
    { id: organizationId },
    { enabled: !!organizationId }
  );

  const { data: thirdParties } = trpc.thirdParty.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: complianceAssessments } = trpc.compliance.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: dueDiligenceAssessments } = trpc.thirdPartyAssessment.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: contractAnalyses } = trpc.contractAnalysis.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  ) as { data: Array<{
    id: number;
    contractName: string;
    contractAnalysisStatus: string;
    complianceScore: number | null;
    criticalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
    veryLowRisks: number;
    createdAt: string;
    updatedAt: string;
  }> | undefined };

  const { data: actionPlans } = trpc.actionPlan.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: ticketsData, refetch: refetchTickets } = trpc.tickets.list.useQuery(
    { organizationId },
    { enabled: !!organizationId, refetchInterval: 30000 }
  );

  const { data: myDeadlines, refetch: refetchDeadlines } = trpc.actionPlan.getMyDeadlines.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  const contractActions = actionPlans?.filter((a: { assessmentType: string }) => a.assessmentType === 'contract_analysis') || [];
  const ticketsList = ticketsData?.tickets || [];
  const openTickets = ticketsList.filter((t: any) => 
    ['novo', 'em_analise', 'aguardando_cliente', 'aguardando_terceiro'].includes(t.status)
  ).length || 0;
  const resolvedTickets = ticketsList.filter((t: any) => t.status === 'resolvido').length || 0;

  const isConsultor = user?.role === 'admin_global' || user?.role === 'consultor';
  const pendingDeadlines = myDeadlines?.filter((d: any) => d.status !== 'concluida' && d.status !== 'cancelada') || [];

  const handleDelegateClick = (taskId: number, taskTitle: string) => {
    setDelegationModal({ isOpen: true, taskId, taskTitle });
  };

  const handleDelegateSuccess = () => {
    refetchDeadlines();
  };

  if (loadingOrg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8" />
          <CardGrid columns={4}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </CardGrid>
          <Skeleton className="h-96 mt-8" />
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-border/60 shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-lg font-semibold mb-2">Organização não encontrada</h2>
          <Button onClick={() => setLocation('/selecionar-cliente')}>
            Voltar para seleção
          </Button>
        </div>
      </div>
    );
  }

  const pendingAssessments = (complianceAssessments?.filter(a => a.status === 'em_andamento').length || 0) +
    (dueDiligenceAssessments?.filter(a => a.status === 'em_andamento').length || 0);

  const completedAssessments = (complianceAssessments?.filter(a => a.status === 'concluida').length || 0) +
    (dueDiligenceAssessments?.filter(a => a.status === 'concluida').length || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isConsultor && (
                <Button variant="ghost" size="icon" onClick={() => setLocation('/selecionar-cliente')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <img src="/logo-seusdados.png" alt="Seusdados" className="h-8" />
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                {organization.logoUrl ? (
                  <img src={organization.logoUrl} alt={organization.name} className="h-8 w-8 rounded object-contain" />
                ) : (
                  <div className="h-8 w-8 rounded bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                    <span className="text-white font-medium text-xs">
                      {organization.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-sm font-medium text-slate-800">
                    {organization.tradeName || organization.name}
                  </h1>
                  <p className="text-xs text-slate-500">{organization.cnpj}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{user?.name}</span>
              <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                {user?.role === 'admin_global' ? 'Admin' : user?.role === 'consultor' ? 'Consultor' : 'Cliente'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {/* Stats Cards - Padronizados */}
        <SectionHeader title="Visão Geral" subtitle="Indicadores consolidados da organização" />
        <CardGrid columns={3}>
          <StatCard
            label="Terceiros"
            value={thirdParties?.length || 0}
            icon={Users}
            iconGradient="violet"
          />
          <StatCard
            label="Avaliações"
            value={(complianceAssessments?.length || 0) + (dueDiligenceAssessments?.length || 0)}
            icon={FileCheck}
            iconGradient="blue"
          />
          <StatCard
            label="Em Andamento"
            value={pendingAssessments}
            icon={Clock}
            iconGradient="amber"
          />
          <StatCard
            label="Concluídas"
            value={completedAssessments}
            icon={CheckCircle}
            iconGradient="emerald"
          />
          <StatCard
            label="Chamados Abertos"
            value={openTickets}
            icon={MessageSquare}
            iconGradient="pink"
            onClick={() => setLocation(`/meudpo?org=${organizationId}`)}
          />
          <StatCard
            label="Chamados Resolvidos"
            value={resolvedTickets}
            icon={CheckCircle}
            iconGradient="emerald"
            onClick={() => setLocation(`/meudpo?org=${organizationId}`)}
          />
        </CardGrid>

        {/* Quick Actions - Padronizados */}
        <SectionHeader title="Ações Rápidas" subtitle="Acesso direto às funcionalidades" className="mt-8" />
        <CardGrid columns={4}>
          <ModuleCard
            icon={Plus}
            customGradient="from-violet-600 via-purple-600 to-violet-700"
            title="Cadastrar Terceiro"
            description="Individual ou em massa"
            buttons={[{ label: 'Cadastrar', variant: 'primary' as const, onClick: () => setLocation(`/cliente/${organizationId}/terceiros/novo`) }]}
          />
          <ModuleCard
            icon={Shield}
            gradient="duediligence"
            title="Nova Maturidade"
            description="Avaliação de terceiros"
            buttons={[{ label: 'Iniciar', variant: 'primary' as const, onClick: () => setLocation(`/cliente/${organizationId}/due-diligence/nova`) }]}
          />
          <ModuleCard
            icon={ClipboardList}
            gradient="conformidade"
            title="Nova Conformidade"
            description="Avaliação PPPD"
            buttons={[{ label: 'Iniciar', variant: 'primary' as const, onClick: () => setLocation('/avaliacoes') }]}
          />
          <ModuleCard
            icon={Send}
            gradient="governanca"
            title="Enviar Formulários"
            description="Para terceiros"
            buttons={[{ label: 'Enviar', variant: 'primary' as const, onClick: () => setLocation(`/cliente/${organizationId}/enviar-links`) }]}
          />
          <ModuleCard
            icon={Eye}
            gradient="contratos"
            title="Acompanhamento"
            description="Status das respostas"
            buttons={[{ label: 'Ver', variant: 'secondary' as const, onClick: () => setLocation(`/cliente/${organizationId}/acompanhamento`) }]}
          />
          <ModuleCard
            icon={HardDrive}
            gradient="ged"
            title="Documentos"
            description="GED da organização"
            buttons={[{ label: 'Acessar', variant: 'secondary' as const, onClick: () => setLocation(`/ged/organizacao/${organizationId}`) }]}
          />
          <ModuleCard
            icon={Clock}
            gradient="meudpo"
            title="Lembretes"
            description="Configuração automática"
            buttons={[{ label: 'Configurar', variant: 'secondary' as const, onClick: () => setLocation(`/cliente/${organizationId}/configuracao-lembretes`) }]}
          />
          <ModuleCard
            icon={BarChart3}
            gradient="contratos"
            title="Dashboard Executivo"
            description="Visão consolidada"
            buttons={[{ label: 'Abrir', variant: 'primary' as const, onClick: () => setLocation(`/cliente/${organizationId}/dashboard-executivo`) }]}
          />
        </CardGrid>

        {/* Tabs */}
        <div className="mt-8">
          <Tabs defaultValue="terceiros" className="space-y-4">
            <TabsList className="bg-white">
              <TabsTrigger value="terceiros">Terceiros</TabsTrigger>
              <TabsTrigger value="conformidade">Conformidade PPPD</TabsTrigger>
              <TabsTrigger value="due-diligence">Maturidade</TabsTrigger>
              <TabsTrigger value="contratos">Análise Contratos</TabsTrigger>
              <TabsTrigger value="chamados" className="flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                Chamados
                {openTickets > 0 && (
                  <Badge className="bg-orange-500 text-white text-xs ml-1">{openTickets}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="prazos" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Meus Prazos
              </TabsTrigger>
            </TabsList>

            {/* Tab Terceiros */}
            <TabsContent value="terceiros">
              <InfoCard icon={Users} iconGradient="violet" title="Terceiros Cadastrados" subtitle="Parceiros e fornecedores da organização"
                headerAction={
                  <Button onClick={() => setLocation(`/cliente/${organizationId}/terceiros/novo`)} className="btn-gradient-seusdados text-white" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Novo Terceiro
                  </Button>
                }
                className="!min-h-0 !h-auto"
              >
                {thirdParties && thirdParties.length > 0 ? (
                  <div className="space-y-3">
                    {thirdParties.slice(0, 5).map((tp) => (
                      <div key={tp.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/cliente/${organizationId}/terceiros/${tp.id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{tp.tradeName || tp.name}</p>
                            <p className="text-sm text-slate-500">{tp.cnpj}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {tp.riskLevel && (
                            <Badge variant="outline" className={
                              tp.riskLevel === 'critico' ? 'border-red-500 text-red-500' :
                              tp.riskLevel === 'alto' ? 'border-orange-500 text-orange-500' :
                              tp.riskLevel === 'moderado' ? 'border-yellow-500 text-yellow-500' :
                              'border-green-500 text-green-500'
                            }>{tp.riskLevel}</Badge>
                          )}
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Nenhum terceiro cadastrado</p>
                  </div>
                )}
              </InfoCard>
            </TabsContent>

            {/* Tab Conformidade */}
            <TabsContent value="conformidade">
              <InfoCard icon={ClipboardList} iconGradient="violet" title="Avaliações de Conformidade" subtitle="Programa de Auditoria e Conformidade PPPD"
                headerAction={
                  !['sponsor', 'comite', 'lider_processo', 'gestor_area'].includes(user?.role) ? (
                    <Button onClick={() => setLocation('/avaliacoes')} className="btn-gradient-seusdados text-white" size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Nova Avaliação
                    </Button>
                  ) : undefined
                }
                className="!min-h-0 !h-auto"
              >
                {complianceAssessments && complianceAssessments.length > 0 ? (
                  <div className="space-y-3">
                    {complianceAssessments.map((assessment) => (
                      <div key={assessment.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/avaliacoes/${assessment.id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-violet-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{assessment.title}</p>
                            <p className="text-sm text-slate-500">
                              {assessment.framework.toUpperCase()} • {assessment.answeredQuestions}/{assessment.totalQuestions} questões
                            </p>
                          </div>
                        </div>
                        <Badge variant={assessment.status === 'concluida' ? 'default' : 'secondary'}
                          className={assessment.status === 'concluida' ? 'bg-green-100 text-green-700' : ''}>
                          {assessment.status === 'concluida' ? 'Concluída' : 
                           assessment.status === 'em_andamento' ? 'Em Andamento' : 'Rascunho'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Nenhuma avaliação de conformidade</p>
                  </div>
                )}
              </InfoCard>
            </TabsContent>

            {/* Tab Due Diligence */}
            <TabsContent value="due-diligence">
              <InfoCard icon={Shield} iconGradient="blue" title="Avaliações de Maturidade" subtitle="Gestão de Maturidade e Risco de Terceiros"
                headerAction={
                  !['sponsor', 'comite', 'lider_processo', 'gestor_area'].includes(user?.role) ? (
                    <Button onClick={() => setLocation(`/cliente/${organizationId}/due-diligence/nova`)} className="btn-gradient-seusdados text-white" size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Nova Avaliação
                    </Button>
                  ) : undefined
                }
                className="!min-h-0 !h-auto"
              >
                {dueDiligenceAssessments && dueDiligenceAssessments.length > 0 ? (
                  <div className="space-y-3">
                    {dueDiligenceAssessments.map((assessment) => (
                      <div key={assessment.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/due-diligence/resultado/${assessment.id}`)}>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{assessment.title}</p>
                            <p className="text-sm text-slate-500">{assessment.answeredQuestions}/{assessment.totalQuestions} questões</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {assessment.riskClassification && (
                            <Badge variant="outline" className={
                              assessment.riskClassification === 'critico' ? 'border-red-500 text-red-500' :
                              assessment.riskClassification === 'alto' ? 'border-orange-500 text-orange-500' :
                              assessment.riskClassification === 'moderado' ? 'border-yellow-500 text-yellow-500' :
                              'border-green-500 text-green-500'
                            }>{assessment.riskClassification}</Badge>
                          )}
                          <Badge variant={assessment.status === 'concluida' ? 'default' : 'secondary'}
                            className={assessment.status === 'concluida' ? 'bg-green-100 text-green-700' : ''}>
                            {assessment.status === 'concluida' ? 'Concluída' : 
                             assessment.status === 'em_andamento' ? 'Em Andamento' : 'Rascunho'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Nenhuma avaliação de maturidade</p>
                  </div>
                )}
              </InfoCard>
            </TabsContent>

            {/* Tab Contratos */}
            <TabsContent value="contratos">
              <InfoCard icon={Scale} iconGradient="emerald" title="Análises de Contratos LGPD" subtitle="Resultados das análises contratuais realizadas pela consultoria"
                className="!min-h-0 !h-auto"
              >
                {contractAnalyses && contractAnalyses.length > 0 ? (
                  <div className="space-y-4">
                    {/* Resumo de Riscos */}
                    <div className="grid grid-cols-5 gap-3 mb-4">
                      {[
                        { label: 'Críticos', color: 'red', value: contractAnalyses.reduce((acc, a) => acc + (a.criticalRisks || 0), 0) },
                        { label: 'Altos', color: 'orange', value: contractAnalyses.reduce((acc, a) => acc + (a.highRisks || 0), 0) },
                        { label: 'Médios', color: 'yellow', value: contractAnalyses.reduce((acc, a) => acc + (a.mediumRisks || 0), 0) },
                        { label: 'Baixos', color: 'blue', value: contractAnalyses.reduce((acc, a) => acc + (a.lowRisks || 0), 0) },
                        { label: 'M. Baixos', color: 'green', value: contractAnalyses.reduce((acc, a) => acc + (a.veryLowRisks || 0), 0) },
                      ].map(item => (
                        <div key={item.label} className={`p-3 rounded-lg bg-${item.color}-50 text-center`}>
                          <p className={`text-2xl font-light text-${item.color}-600`}>{item.value}</p>
                          <p className={`text-xs text-${item.color}-600 uppercase tracking-wide`}>{item.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Lista de Análises */}
                    {contractAnalyses.map((analysis) => (
                      <div key={analysis.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-emerald-50/50 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/analise-contratos/${analysis.id}`)}>
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                            <Scale className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{analysis.contractName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={
                                analysis.contractAnalysisStatus === 'approved' ? 'border-green-500 text-green-600 bg-green-50' :
                                analysis.contractAnalysisStatus === 'reviewed' ? 'border-purple-500 text-purple-600 bg-purple-50' :
                                analysis.contractAnalysisStatus === 'completed' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                                'border-slate-300 text-slate-500'
                              }>
                                {analysis.contractAnalysisStatus === 'approved' ? 'Aprovada' :
                                 analysis.contractAnalysisStatus === 'reviewed' ? 'Revisada' :
                                 analysis.contractAnalysisStatus === 'completed' ? 'Concluída' :
                                 analysis.contractAnalysisStatus === 'analyzing' ? 'Analisando' : 'Pendente'}
                              </Badge>
                              {analysis.complianceScore !== null && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className={`h-4 w-4 ${
                                    analysis.complianceScore >= 80 ? 'text-green-600' :
                                    analysis.complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  }`} />
                                  <span className={`text-sm font-bold ${
                                    analysis.complianceScore >= 80 ? 'text-green-600' :
                                    analysis.complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>{analysis.complianceScore}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {(analysis.criticalRisks > 0 || analysis.highRisks > 0) && (
                            <div className="flex gap-1">
                              {analysis.criticalRisks > 0 && (
                                <Badge className="bg-red-500 text-white text-xs">{analysis.criticalRisks} críticos</Badge>
                              )}
                              {analysis.highRisks > 0 && (
                                <Badge className="bg-orange-500 text-white text-xs">{analysis.highRisks} altos</Badge>
                              )}
                            </div>
                          )}
                          <span className="text-xs text-slate-400">
                            {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Scale className="h-16 w-16 mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 font-light">Nenhuma análise de contrato disponível</p>
                    <p className="text-sm text-slate-400 mt-1">As análises serão realizadas pela consultoria Seusdados</p>
                  </div>
                )}
              </InfoCard>

              {/* Plano de Ação de Contratos */}
              {contractActions.length > 0 && (
                <InfoCard icon={ClipboardList} iconGradient="violet" title="Plano de Ação - Contratos" subtitle="Ações de mitigação de riscos contratuais"
                  badge={{ text: `${contractActions.filter((a: { status: string }) => a.status === 'pendente').length} pendentes`, variant: 'warning' }}
                  className="mt-5 !min-h-0 !h-auto"
                >
                  <div className="space-y-3">
                    {contractActions.slice(0, 10).map((action: { id: number; title: string; priority: string; status: string; dueDate: string | null }) => (
                      <div key={action.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-violet-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge className={`shrink-0 ${
                            action.priority === 'critica' ? 'bg-red-500' :
                            action.priority === 'alta' ? 'bg-orange-500' :
                            action.priority === 'media' ? 'bg-yellow-500' : 'bg-blue-500'
                          } text-white`}>
                            {action.priority === 'critica' ? 'Crítica' :
                             action.priority === 'alta' ? 'Alta' :
                             action.priority === 'media' ? 'Média' : 'Baixa'}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium text-slate-800 line-clamp-1">{action.title}</p>
                            {action.dueDate && (
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                Prazo: {new Date(action.dueDate).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={
                          action.status === 'concluida' ? 'border-green-500 text-green-600 bg-green-50' :
                          action.status === 'em_andamento' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                          action.status === 'cancelada' ? 'border-slate-300 text-slate-500' :
                          'border-yellow-500 text-yellow-600 bg-yellow-50'
                        }>
                          {action.status === 'concluida' ? 'Concluída' :
                           action.status === 'em_andamento' ? 'Em Andamento' :
                           action.status === 'cancelada' ? 'Cancelada' : 'Pendente'}
                        </Badge>
                      </div>
                    ))}
                    {contractActions.length > 10 && (
                      <p className="text-center text-sm text-slate-500 pt-2">
                        E mais {contractActions.length - 10} ações...
                      </p>
                    )}
                  </div>
                </InfoCard>
              )}
            </TabsContent>

            {/* Tab Chamados */}
            <TabsContent value="chamados">
              <InfoCard icon={Headphones} iconGradient="violet" title="Chamados MeuDPO" subtitle="Solicitações e atendimentos do DPO"
                headerAction={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchTickets()}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
                    </Button>
                    <Button onClick={() => setLocation(`/meudpo?org=${organizationId}`)} className="btn-gradient-seusdados text-white" size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Novo Chamado
                    </Button>
                  </div>
                }
                className="!min-h-0 !h-auto"
              >
                {/* Métricas de Chamados */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Novos', color: 'blue', value: ticketsData?.tickets?.filter((t: any) => t.status === 'novo').length || 0 },
                    { label: 'Em Análise', color: 'yellow', value: ticketsData?.tickets?.filter((t: any) => t.status === 'em_analise').length || 0 },
                    { label: 'Aguardando', color: 'orange', value: ticketsData?.tickets?.filter((t: any) => t.status === 'aguardando_cliente').length || 0 },
                    { label: 'Resolvidos', color: 'green', value: ticketsData?.tickets?.filter((t: any) => t.status === 'resolvido').length || 0 },
                  ].map(item => (
                    <div key={item.label} className={`p-3 rounded-lg bg-${item.color}-50 text-center`}>
                      <p className={`text-2xl font-light text-${item.color}-600`}>{item.value}</p>
                      <p className={`text-xs text-${item.color}-600 uppercase tracking-wide`}>{item.label}</p>
                    </div>
                  ))}
                </div>

                {/* Lista de Chamados */}
                {ticketsData?.tickets && ticketsData.tickets.length > 0 ? (
                  <div className="space-y-3">
                    {ticketsData.tickets.slice(0, 10).map((ticket: any) => (
                      <div key={ticket.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-violet-50/50 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/meudpo/${ticket.id}`)}>
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            ticket.status === 'novo' ? 'bg-blue-100' :
                            ticket.status === 'em_analise' ? 'bg-yellow-100' :
                            ticket.status === 'aguardando_cliente' ? 'bg-orange-100' :
                            ticket.status === 'resolvido' ? 'bg-green-100' : 'bg-slate-100'
                          }`}>
                            <MessageSquare className={`h-5 w-5 ${
                              ticket.status === 'novo' ? 'text-blue-600' :
                              ticket.status === 'em_analise' ? 'text-yellow-600' :
                              ticket.status === 'aguardando_cliente' ? 'text-orange-600' :
                              ticket.status === 'resolvido' ? 'text-green-600' : 'text-slate-600'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-400">
                                {ticket.ticketNumber ? `#${ticket.ticketNumber.toString().padStart(6, '0')}` : `#${ticket.id}`}
                              </span>
                              <p className="font-medium text-slate-800">{ticket.title}</p>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-1">{ticket.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${
                            ticket.priority === 'critica' ? 'bg-red-500' :
                            ticket.priority === 'alta' ? 'bg-orange-500' :
                            ticket.priority === 'media' ? 'bg-yellow-500' : 'bg-blue-500'
                          } text-white`}>
                            {ticket.priority === 'critica' ? 'Crítica' :
                             ticket.priority === 'alta' ? 'Alta' :
                             ticket.priority === 'media' ? 'Média' : 'Baixa'}
                          </Badge>
                          <Badge variant="outline" className={
                            ticket.status === 'novo' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                            ticket.status === 'em_analise' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                            ticket.status === 'aguardando_cliente' ? 'border-orange-500 text-orange-600 bg-orange-50' :
                            ticket.status === 'resolvido' ? 'border-green-500 text-green-600 bg-green-50' :
                            'border-slate-300 text-slate-500'
                          }>
                            {ticket.status === 'novo' ? 'Novo' :
                             ticket.status === 'em_analise' ? 'Em Análise' :
                             ticket.status === 'aguardando_cliente' ? 'Aguardando' :
                             ticket.status === 'resolvido' ? 'Resolvido' : ticket.status}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                    {ticketsData.tickets.length > 10 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" onClick={() => setLocation(`/meudpo?org=${organizationId}`)}>
                          Ver todos os {ticketsData.tickets.length} chamados
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Headphones className="h-16 w-16 mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 font-light">Nenhum chamado registrado</p>
                    <p className="text-sm text-slate-400 mt-1">Abra um chamado para solicitar atendimento do DPO</p>
                    <Button className="mt-4 btn-gradient-seusdados text-white"
                      onClick={() => setLocation(`/meudpo?org=${organizationId}`)}>
                      <Plus className="mr-2 h-4 w-4" /> Abrir Primeiro Chamado
                    </Button>
                  </div>
                )}
              </InfoCard>
            </TabsContent>

            {/* Tab Prazos */}
            <TabsContent value="prazos">
              <InfoCard icon={Clock} iconGradient="red" title="Meus Prazos" subtitle="Próximos vencimentos de ações" className="!min-h-0 !h-auto">
                {pendingDeadlines && pendingDeadlines.length > 0 ? (
                  <div className="space-y-3">
                    {pendingDeadlines.map((deadline: any) => {
                      const dueDate = deadline.dueDate ? new Date(deadline.dueDate) : null;
                      const isOverdue = dueDate && dueDate < new Date();
                      const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                      return (
                        <div key={deadline.id} className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-800">{deadline.title}</h4>
                              <p className="text-sm text-slate-500 mt-1">{deadline.description}</p>
                            </div>
                            <Badge variant="outline" className={isOverdue ? 'border-red-500 text-red-500' : daysUntilDue && daysUntilDue <= 3 ? 'border-orange-500 text-orange-500' : 'border-green-500 text-green-500'}>
                              {isOverdue ? 'Vencido' : daysUntilDue === 0 ? 'Hoje' : daysUntilDue === 1 ? 'Amanhã' : `${daysUntilDue} dias`}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-500">
                              <span className="font-medium">Prioridade:</span> {deadline.priority}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleDelegateClick(deadline.id, deadline.title)}>
                              Delegar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-500 font-light">Nenhum prazo pendente</p>
                    <p className="text-sm text-slate-400 mt-1">Seus prazos aparecerão aqui</p>
                  </div>
                )}
              </InfoCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <TaskDelegationModal
        isOpen={delegationModal.isOpen}
        onClose={() => setDelegationModal({ isOpen: false, taskId: 0, taskTitle: '' })}
        taskId={delegationModal.taskId}
        taskTitle={delegationModal.taskTitle}
        organizationId={organizationId}
        onSuccess={handleDelegateSuccess}
      />
    </div>
  );
}
