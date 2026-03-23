import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Briefcase, 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  Building2,
  FileSearch,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  FileSignature,
  ClipboardList,
  Activity,
  Calendar,
  ExternalLink,
  AlertCircle,
  TrendingUp,
  Shield,
  RefreshCw
} from "lucide-react";
import { useLocation, useParams } from "wouter";

const riskColors: Record<string, string> = {
  baixo: "bg-green-100 text-green-800",
  moderado: "bg-yellow-100 text-yellow-800",
  alto: "bg-orange-100 text-orange-800",
  critico: "bg-red-100 text-red-800",
};

const typeLabels: Record<string, string> = {
  fornecedor: "Fornecedor",
  parceiro: "Parceiro",
  suboperador: "Suboperador",
  outro: "Outro",
};

const statusColors: Record<string, string> = {
  ativo: "bg-green-100 text-green-800",
  pendente: "bg-yellow-100 text-yellow-800",
  vencido: "bg-red-100 text-red-800",
  cancelado: "bg-gray-100 text-gray-800",
  em_renovacao: "bg-blue-100 text-blue-800",
};

const activityIcons: Record<string, any> = {
  contrato_criado: FileSignature,
  avaliacao_iniciada: FileSearch,
  avaliacao_concluida: CheckCircle,
  plano_acao_criado: ClipboardList,
  documento_anexado: FileText,
  contrato_vencendo: AlertCircle,
  contrato_renovado: RefreshCw,
};

export default function TerceiroDetalhes() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const terceiroId = parseInt(params.id || "0");
  const [activeTab, setActiveTab] = useState("overview");
  
  const { user } = useAuth();
  const organizationId = user?.organizationId || 0;

  // Buscar perfil completo do terceiro
  const { data: profile, isLoading, refetch } = trpc.thirdParty.getFullProfile.useQuery(
    { thirdPartyId: terceiroId, organizationId },
    { enabled: terceiroId > 0 && organizationId > 0 }
  );

  // Fallback para dados básicos se getFullProfile não existir
  const { data: terceiro } = trpc.thirdParty.getById.useQuery(
    { id: terceiroId },
    { enabled: terceiroId > 0 && !profile }
  );

  const { data: assessments } = trpc.thirdPartyAssessment.listByThirdParty.useQuery(
    { thirdPartyId: terceiroId },
    { enabled: terceiroId > 0 }
  );

  const data = profile || terceiro;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/terceiros')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Terceiro não encontrado</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <p className="text-muted-foreground">
              O terceiro solicitado não foi encontrado ou você não tem permissão para visualizá-lo.
            </p>
            <Button className="mt-4" onClick={() => setLocation('/terceiros')}>
              Voltar para Terceiros
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = profile?.stats || {
    total_contracts: 0,
    active_contracts: 0,
    expired_contracts: 0,
    expiring_soon: 0,
    total_assessments: assessments?.length || 0,
    total_action_plans: 0,
    completed_action_plans: 0,
  };

  const contracts = profile?.contracts || [];
  const dueDiligence = profile?.dueDiligence || assessments || [];
  const contractAnalyses = profile?.contractAnalyses || [];
  const actionPlans = profile?.actionPlans || [];
  const activities = profile?.activities || [];

  const lastAssessment = dueDiligence?.[0];
  const riskScore = lastAssessment?.overallRiskScore;
  const riskLevel = riskScore ? (riskScore <= 25 ? "baixo" : riskScore <= 50 ? "moderado" : riskScore <= 75 ? "alto" : "critico") : "não avaliado";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <div className="relative px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLocation('/terceiros')}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Briefcase className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">{data.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-white/20 text-white border-0">{typeLabels[data.type] || data.type}</Badge>
                    {data.category && (
                      <Badge className="bg-white/20 text-white border-0">{data.category}</Badge>
                    )}
                    <Badge className={riskLevel === "não avaliado" ? "bg-gray-500/50 text-white border-0" : riskColors[riskLevel]}>
                      {riskLevel === "não avaliado" ? "Não avaliado" : `Risco ${riskLevel}`}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/due-diligence/nova?terceiro=' + terceiroId)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <FileSearch className="mr-2 h-4 w-4" />
                Nova Avaliação
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/analise-contratos?terceiro=' + terceiroId)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <FileSignature className="mr-2 h-4 w-4" />
                Analisar Contrato
              </Button>
              <Button 
                onClick={() => setLocation('/terceiros/' + terceiroId + '/editar')}
                className="bg-white text-green-700 hover:bg-white/90"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 -mt-6 pb-8 space-y-6">

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileSignature className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="body-small">Contratos Ativos</p>
                <p className="text-2xl font-bold">{stats.active_contracts}</p>
                {stats.expiring_soon > 0 && (
                  <p className="text-xs text-orange-600">{stats.expiring_soon} vencendo em breve</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileSearch className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="body-small">Avaliações</p>
                <p className="text-2xl font-bold">{stats.total_assessments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ClipboardList className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="body-small">Planos de Ação</p>
                <p className="text-2xl font-bold">{stats.total_action_plans}</p>
                {stats.total_action_plans > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {stats.completed_action_plans} concluídos
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="body-small">Nível de Risco</p>
                <p className="text-2xl font-bold capitalize">{riskLevel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Building2 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2">
            <FileSignature className="h-4 w-4" />
            Contratos ({contracts.length})
          </TabsTrigger>
          <TabsTrigger value="assessments" className="gap-2">
            <FileSearch className="h-4 w-4" />
            Due Diligence ({dueDiligence.length})
          </TabsTrigger>
          <TabsTrigger value="action-plans" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Planos de Ação ({actionPlans.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <Activity className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-3 gap-6">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Informações Cadastrais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="body-small">Razão Social</p>
                    <p className="font-medium">{data.name}</p>
                  </div>
                  {data.tradeName && (
                    <div>
                      <p className="body-small">Nome Fantasia</p>
                      <p className="font-medium">{data.tradeName}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {data.cnpj && (
                    <div>
                      <p className="body-small">CNPJ</p>
                      <p className="font-medium">{data.cnpj}</p>
                    </div>
                  )}
                  <div>
                    <p className="body-small">Tipo</p>
                    <p className="font-medium">{typeLabels[data.type] || data.type}</p>
                  </div>
                </div>

                {data.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="body-small">Endereço</p>
                      <p className="font-medium">{data.address}</p>
                    </div>
                  </div>
                )}

                {data.description && (
                  <div>
                    <p className="body-small">Observações</p>
                    <p className="text-sm">{data.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.contactName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{data.contactName}</span>
                  </div>
                )}
                {data.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${data.contactEmail}`} className="text-primary hover:underline">
                      {data.contactEmail}
                    </a>
                  </div>
                )}
                {data.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{data.contactPhone}</span>
                  </div>
                )}
                {!data.contactName && !data.contactEmail && !data.contactPhone && (
                  <p className="body-small">Nenhum contato cadastrado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contratos */}
        <TabsContent value="contracts" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contratos Vinculados</CardTitle>
                  <CardDescription>
                    Contratos analisados e gerenciados para este terceiro
                  </CardDescription>
                </div>
                <Button onClick={() => setLocation(`/analise-contratos?terceiro=${terceiroId}`)}>
                  <FileSignature className="mr-2 h-4 w-4" />
                  Novo Contrato
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {contracts.length > 0 ? (
                <div className="space-y-4">
                  {contracts.map((contract: any) => {
                    const isExpiring = contract.end_date && 
                      new Date(contract.end_date) > new Date() && 
                      new Date(contract.end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    const isExpired = contract.end_date && new Date(contract.end_date) < new Date();
                    
                    return (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <FileSignature className={`h-5 w-5 ${isExpired ? 'text-red-500' : isExpiring ? 'text-orange-500' : 'text-green-500'}`} />
                          <div>
                            <p className="font-medium">{contract.title}</p>
                            <div className="flex items-center gap-2 body-small">
                              {contract.contract_number && <span>Nº {contract.contract_number}</span>}
                              {contract.department && <span>• {contract.department}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            {contract.start_date && (
                              <p>Início: {new Date(contract.start_date).toLocaleDateString('pt-BR')}</p>
                            )}
                            {contract.end_date && (
                              <p className={isExpired ? 'text-red-600' : isExpiring ? 'text-orange-600' : ''}>
                                Vencimento: {new Date(contract.end_date).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                          <Badge className={statusColors[contract.status] || statusColors.ativo}>
                            {contract.status}
                          </Badge>
                          {contract.contract_analysis_id && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setLocation(`/analise-contratos/${contract.contract_analysis_id}`)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhum contrato vinculado a este terceiro
                  </p>
                  <Button onClick={() => setLocation(`/analise-contratos?terceiro=${terceiroId}`)}>
                    <FileSignature className="mr-2 h-4 w-4" />
                    Analisar Contrato
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Due Diligence */}
        <TabsContent value="assessments" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Avaliações Due Diligence</CardTitle>
                  <CardDescription>
                    Histórico de avaliações de risco realizadas
                  </CardDescription>
                </div>
                <Button onClick={() => setLocation(`/due-diligence/nova?terceiro=${terceiroId}`)}>
                  <FileSearch className="mr-2 h-4 w-4" />
                  Nova Avaliação
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dueDiligence.length > 0 ? (
                <div className="space-y-4">
                  {dueDiligence.map((assessment: any) => (
                    <div
                      key={assessment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setLocation(`/due-diligence/${assessment.id}/resultado`)}
                    >
                      <div className="flex items-center gap-4">
                        {assessment.status === "concluida" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {assessment.title || `Avaliação #${assessment.id}`}
                          </p>
                          <p className="body-small">
                            {new Date(assessment.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {assessment.overallRiskScore !== null && (
                          <div className="text-right">
                            <p className="body-small">Score de Risco</p>
                            <p className="font-bold">{assessment.overallRiskScore}%</p>
                          </div>
                        )}
                        <Badge className={riskColors[assessment.overallRiskScore ? (assessment.overallRiskScore <= 25 ? "baixo" : assessment.overallRiskScore <= 50 ? "moderado" : assessment.overallRiskScore <= 75 ? "alto" : "critico") : ""] || "bg-gray-100 text-gray-800"}>
                          {assessment.status === "concluida" ? 
                            (assessment.overallRiskScore ? `Risco ${assessment.overallRiskScore <= 25 ? "Baixo" : assessment.overallRiskScore <= 50 ? "Moderado" : assessment.overallRiskScore <= 75 ? "Alto" : "Crítico"}` : "Concluída") 
                            : "Pendente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhuma avaliação realizada para este terceiro
                  </p>
                  <Button onClick={() => setLocation(`/due-diligence/nova?terceiro=${terceiroId}`)}>
                    <FileSearch className="mr-2 h-4 w-4" />
                    Iniciar Avaliação
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Planos de Ação */}
        <TabsContent value="action-plans" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Planos de Ação</CardTitle>
              <CardDescription>
                Planos de ação gerados a partir de avaliações e análises
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionPlans.length > 0 ? (
                <div className="space-y-4">
                  {actionPlans.map((plan: any) => {
                    const progress = plan.total_actions > 0 
                      ? Math.round((plan.completed_actions / plan.total_actions) * 100) 
                      : 0;
                    
                    return (
                      <div
                        key={plan.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => setLocation(`/plano-acao/${plan.id}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-purple-500" />
                            <p className="font-medium">{plan.title}</p>
                          </div>
                          <Badge className={plan.status === 'concluido' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {plan.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between body-small">
                            <span>{plan.completed_actions || 0} de {plan.total_actions || 0} ações concluídas</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum plano de ação gerado para este terceiro
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de Atividades</CardTitle>
              <CardDescription>
                Histórico de todas as atividades relacionadas a este terceiro
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {activities.map((activity: any, index: number) => {
                      const Icon = activityIcons[activity.activity_type] || Activity;
                      return (
                        <div key={activity.id || index} className="relative pl-10">
                          <div className="absolute left-2 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="h-3 w-3 text-primary" />
                          </div>
                          <div className="bg-muted/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium">{activity.title}</p>
                            </div>
                            {activity.description && (
                              <p className="body-small mb-2">{activity.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma atividade registrada
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
