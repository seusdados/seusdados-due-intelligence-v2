import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, CheckCircle, AlertCircle, TrendingUp, Download,
  RefreshCw, FileText, Paperclip, Eye, Loader2, Users, BarChart3,
  Shield, Database, Lock, Bell, Building, GraduationCap, Lightbulb,
  Send, ClipboardList, Sparkles, Edit, ChevronDown, ChevronUp,
  Calendar, MessageSquare, History, X, Check, Clock, Upload,
  Trash2, UserPlus
} from "lucide-react";
import { CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/contexts/ToastContext";
import { ActionPlanTab } from "@/components/ActionPlanTab";
import { MaturityRadarChart } from "@/components/assessments/MaturityRadarChart";
import { RiskMatrix5Columns } from "@/components/assessments/RiskMatrix5Columns";
import { MATURITY_LEVELS, QUESTION_OPTIONS } from "../../../shared/frameworkSeusdados";

// Ícones por domínio
const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  "IA-01": <Shield className="w-4 h-4" />,
  "IA-02": <Database className="w-4 h-4" />,
  "IA-03": <CheckCircle className="w-4 h-4" />,
  "IA-04": <Users className="w-4 h-4" />,
  "IA-05": <Lock className="w-4 h-4" />,
  "IA-06": <Bell className="w-4 h-4" />,
  "IA-07": <Building className="w-4 h-4" />,
  "IA-08": <GraduationCap className="w-4 h-4" />,
  "IA-09": <Lightbulb className="w-4 h-4" />,
};

// Cores por nível de maturidade
const LEVEL_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-800",
  2: "bg-orange-100 text-orange-800",
  3: "bg-yellow-100 text-yellow-800",
  4: "bg-blue-100 text-blue-800",
  5: "bg-green-100 text-green-800",
};

// Cores para a matriz de risco 5x5
function getRiskCellColor(prob: number, impact: number): string {
  const score = prob * impact;
  if (score >= 20) return "bg-red-700 text-white";
  if (score >= 15) return "bg-red-500 text-white";
  if (score >= 10) return "bg-orange-400 text-white";
  if (score >= 5) return "bg-yellow-300 text-yellow-900";
  return "bg-green-300 text-green-900";
}

function getRiskLabel(level: string): string {
  switch (level) {
    case "muito_critica": return "Muito Critico";
    case "critica": return "Risco Critico";
    case "alta": return "Risco Alto";
    case "media": return "Risco Medio";
    case "baixa": return "Risco Baixo";
    default: return level;
  }
}
function getRiskBadgeColor(level: string): string {
  switch (level) {
    case "muito_critica": return "bg-red-200 text-red-900 border-red-400";
    case "critica": return "bg-red-100 text-red-800 border-red-300";
    case "alta": return "bg-orange-100 text-orange-800 border-orange-300";
    case "media": return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "baixa": return "bg-green-100 text-green-800 border-green-300";
    default: return "bg-gray-100 text-gray-800";
  }
}

export default function ConsultantPanel() {
  const params = useParams<{ assessmentId: string }>();
  const assessmentId = params.assessmentId ? parseInt(params.assessmentId) : null;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  // Ler tab e actionId da URL (ex: ?tab=plano-de-acao&actionId=540008)
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const actionIdFromUrl = urlParams.get('actionId');
  // Mapear tab da URL para o valor interno do Tabs
  const tabMap: Record<string, string> = {
    'plano-de-acao': 'plano-acao',
    'plano-acao': 'plano-acao',
    'andamento': 'andamento',
    'respostas': 'respostas',
    'maturidade': 'maturidade',
    'risco': 'risco',
  };
  const initialTab = (tabFromUrl && tabMap[tabFromUrl]) || 'andamento';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [highlightedActionId] = useState<number | null>(
    actionIdFromUrl ? parseInt(actionIdFromUrl) : null
  );
  const toast = useToast();
  const utils = trpc.useUtils();

  // Buscar dados de análise do backend
  const { data: analysisData, isLoading, error: analysisError, refetch, isRefetching } = trpc.assessments.getAnalysisData.useQuery(
    { assessmentId: assessmentId! },
    { enabled: !!assessmentId, refetchInterval: 30000, retry: 0 }
  );

  // Buscar plano de ação existente
  const { data: actionPlanItems, refetch: refetchActions } = trpc.actionPlan.listByAssessment.useQuery(
    { assessmentType: 'compliance', assessmentId: assessmentId! },
    { enabled: !!assessmentId }
  );



  // Mutations para plano de ação
  const generatePlanMutation = trpc.assessments.generateAssessmentActionPlan.useMutation({
    onSuccess: (data) => {
      toast.success("Plano de Ação Gerado", `${data.count} ações criadas com sucesso.`);
      refetchActions();
    },
    onError: (err) => {
      toast.error("Erro", err.message);
    },
  });



  const refineActionMutation = trpc.assessments.refineAssessmentAction.useMutation({
    onSuccess: (data) => {
      toast.success("Ação refinada com IA");
      refetchActions();
    },
    onError: (err) => {
      toast.error("Erro ao refinar", err.message);
    },
  });



  // Dados para o gráfico radar
  const radarData = useMemo(() => {
    if (!analysisData) return [];
    return analysisData.domainProgress.map(d => ({
      domain: d.domainId,
      domainName: d.domainName,
      score: d.averageLevel,
      maxScore: 5,
    }));
  }, [analysisData]);

  // Dados para a matriz de risco (formato RiskItem para RiskMatrix5Columns)
  const riskItems = useMemo(() => {
    if (!analysisData) return [];
    return analysisData.riskMatrixData.map((r: any, idx: number) => ({
      id: String(idx + 1),
      domain: r.domainId,
      domainName: r.domainName,
      lgpdArticles: [] as string[],
      isoControls: [] as string[],
      nistFunctions: [] as string[],
      severity: r.riskLevel as 'muito_critica' | 'critica' | 'alta' | 'media' | 'baixa',
      probability: r.probability,
      impact: r.impact,
      score: r.severity,
      description: `Nivel medio de maturidade: ${r.averageLevel.toFixed(1)}/5`,
      mitigation: "",
    }));
  }, [analysisData]);

  // Buscar todas as evidências da avaliação (para exibição na aba Respostas)
  const { data: allEvidences = [] } = trpc.assessments.getAllEvidencesByAssessment.useQuery(
    { assessmentId: assessmentId! },
    { enabled: !!assessmentId }
  );
  // Mapa de evidências por questionId para acesso rápido
  const evidencesByQuestion = useMemo(() => {
    const map: Record<string, typeof allEvidences> = {};
    for (const ev of allEvidences) {
      if (!map[ev.questionId]) map[ev.questionId] = [];
      map[ev.questionId].push(ev);
    }
    return map;
  }, [allEvidences]);
  // Verificação de acesso: usuários comuns podem acessar (backend valida se avaliação está concluída)
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-gray-500">Faça login para acessar a análise.</p>
            <Button className="mt-4" onClick={() => navigate("/avaliacoes")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isInternal = ['admin_global', 'consultor'].includes(user.role);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-600">Carregando dados de analise...</span>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    // Determinar mensagem de erro com base no tipo de erro retornado pelo backend
    const errorCode = (analysisError as any)?.data?.code;
    const errorMessage = (analysisError as any)?.message || '';
    const isForbidden = errorCode === 'FORBIDDEN';
    const isNoLink = errorMessage.includes('vínculo');

    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            {isForbidden ? (
              <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            ) : (
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            )}
            <h2 className="text-xl font-semibold mb-2">
              {isForbidden && isNoLink
                ? 'Acesso Restrito'
                : isForbidden
                ? 'Avaliação não disponível'
                : 'Avaliação não encontrada'}
            </h2>
            <p className="text-gray-500 mb-4">
              {isForbidden && isNoLink
                ? 'Você não possui domínios atribuídos nesta avaliação. Entre em contato com o administrador para solicitar acesso.'
                : isForbidden
                ? errorMessage
                : 'A avaliação solicitada não existe ou foi removida.'}
            </p>
            <Button className="mt-2" onClick={() => navigate("/plano-acao/maturidade")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Plano de Ação
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assessment = analysisData.assessment;
  const statusLabel = assessment.status === "concluida" ? "Concluida"
    : assessment.status === "iniciada" ? "Em Andamento"
    : assessment.status === "programada" ? "Programada"
    : assessment.status === "arquivada" ? "Arquivada"
    : assessment.status;

  const statusColor = assessment.status === "concluida" ? "bg-white text-green-700 border border-green-300"
    : assessment.status === "iniciada" ? "bg-white text-blue-700 border border-blue-300"
    : "bg-white/90 text-gray-700 border border-gray-300";

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-6 rounded-xl mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/avaliacoes")}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Analise da Avaliacao</h1>
              <p className="text-white/80 mt-1">
                {(assessment as any).assessmentCode || `Avaliacao #${assessment.id}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              style={{
                backgroundColor: assessment.status === 'concluida' ? '#16a34a' : assessment.status === 'iniciada' ? '#2563eb' : '#6b7280',
                color: '#ffffff',
                border: 'none',
                padding: '4px 14px',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 700,
                display: 'inline-block',
                letterSpacing: '0.01em',
              }}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Métricas resumidas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{analysisData.overallProgress}%</p>
            <p className="text-xs text-white/80">Progresso Geral</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{analysisData.overallAverage.toFixed(1)}</p>
            <p className="text-xs text-white/80">Media de Maturidade</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{analysisData.totalAnswered}/{analysisData.totalQuestions}</p>
            <p className="text-xs text-white/80">Respostas</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{analysisData.totalEvidences}</p>
            <p className="text-xs text-white/80">Evidencias</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{analysisData.completedAssignments}/{analysisData.assignmentsCount}</p>
            <p className="text-xs text-white/80">Dominios Concluidos</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="andamento" className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" /> Andamento
          </TabsTrigger>
          <TabsTrigger value="respostas" className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Respostas
          </TabsTrigger>
          <TabsTrigger value="maturidade" className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> Maturidade
          </TabsTrigger>
          <TabsTrigger value="risco" className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Matriz de Risco
          </TabsTrigger>
          <TabsTrigger value="plano-acao" className="flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" /> Plano de Ação
            {(actionPlanItems?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{actionPlanItems?.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ========== ABA ANDAMENTO ========== */}
        <TabsContent value="andamento" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysisData.domainProgress.map((domain: any) => (
              <Card key={domain.domainId} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-indigo-600">{DOMAIN_ICONS[domain.domainId]}</span>
                    <h3 className="font-semibold text-sm text-gray-900 flex-1">{domain.domainName}</h3>
                    {domain.progressPercent === 100 && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{domain.answeredQuestions}/{domain.totalQuestions} respondidas</span>
                      <span>{domain.progressPercent}%</span>
                    </div>
                    <Progress value={domain.progressPercent} className="h-2" />

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {domain.assignedTo
                            ? domain.assignedTo.name
                            : "Nao atribuido"}
                        </span>
                      </div>
                      {domain.assignedTo && (
                        <Badge variant="outline" className={`text-xs ${
                          domain.assignedTo.status === "concluida" ? "bg-green-50 text-green-700 border-green-200" :
                          domain.assignedTo.status === "em_andamento" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-gray-50 text-gray-600 border-gray-200"
                        }`}>
                          {domain.assignedTo.status === "concluida" ? "Concluido" :
                           domain.assignedTo.status === "em_andamento" ? "Em Andamento" :
                           "Pendente"}
                        </Badge>
                      )}
                    </div>

                    {domain.averageLevel > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs text-gray-500">Maturidade media:</span>
                        <Badge className={`text-xs ${LEVEL_COLORS[Math.round(domain.averageLevel)] || "bg-gray-100 text-gray-800"}`}>
                          {domain.averageLevel.toFixed(1)}/5
                        </Badge>
                      </div>
                    )}

                    {domain.evidenceCount > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Paperclip className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{domain.evidenceCount} evidencia(s)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ========== ABA RESPOSTAS ========== */}
        <TabsContent value="respostas" className="space-y-4">
          {analysisData.domainProgress.map((domain: any) => (
            <Card key={domain.domainId}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-indigo-600">{DOMAIN_ICONS[domain.domainId]}</span>
                  {domain.domainName}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {domain.answeredQuestions}/{domain.totalQuestions}
                  </Badge>
                  {domain.assignedTo && (
                    <span className="text-xs text-gray-500 font-normal">
                      Respondente: {domain.assignedTo.name}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {domain.responses.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2">Nenhuma resposta registrada neste dominio.</p>
                ) : (
                  <div className="space-y-3">
                    {domain.responses.map((resp: any) => {
                      // Buscar o texto descritivo da resposta selecionada
                      const questionOptions = QUESTION_OPTIONS[resp.questionId];
                      const selectedOption = questionOptions?.find((opt: { level: number; text: string }) => opt.level === resp.selectedLevel);
                      const levelInfo = MATURITY_LEVELS.find(m => m.level === resp.selectedLevel);

                      return (
                        <div key={resp.questionId} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Pergunta */}
                          <div className="flex items-start gap-3 p-4 bg-gray-50">
                            <Badge className={`text-xs flex-shrink-0 mt-0.5 ${LEVEL_COLORS[resp.selectedLevel] || "bg-gray-100"}`}>
                              N{resp.selectedLevel}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{resp.questionText}</p>
                            </div>
                            {resp.respondedAt && (
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {new Date(resp.respondedAt).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>

                          {/* Resposta */}
                          <div className="px-4 py-3 bg-white border-t border-gray-100">
                            <div className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-gray-600">
                                    Nivel {resp.selectedLevel} — {levelInfo?.title || ''}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">
                                  {selectedOption?.text || levelInfo?.description || `Nivel ${resp.selectedLevel} selecionado`}
                                </p>
                                {resp.notes && (
                                  <div className="mt-2 pl-3 border-l-2 border-indigo-200">
                                    <p className="text-xs text-gray-500 italic">
                                      <MessageSquare className="w-3 h-3 inline mr-1" />
                                      {resp.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Evidências anexadas */}
                          {(() => {
                            const questionEvs = evidencesByQuestion[resp.questionId] || [];
                            if (questionEvs.length === 0) return null;
                            return (
                              <div className="px-4 py-3 bg-indigo-50 border-t border-indigo-100">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="text-xs font-semibold text-indigo-700">
                                    Evidências anexadas ({questionEvs.length})
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {questionEvs.map((ev: any) => (
                                    <div key={ev.id} className="flex items-center gap-2">
                                      {ev.type === 'link' ? (
                                        <Eye className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                      ) : (
                                        <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                      )}
                                      <a
                                        href={ev.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-xs"
                                        title={ev.fileName || ev.fileUrl}
                                      >
                                        {ev.fileName || ev.fileUrl}
                                      </a>
                                      {ev.description && (
                                        <span className="text-xs text-gray-400 italic truncate">
                                          — {ev.description}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ========== ABA MATURIDADE ========== */}
        <TabsContent value="maturidade" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico Radar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Maturidade por Dominio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {radarData.some(d => d.score > 0) ? (
                  <MaturityRadarChart
                    framework="seusdados"
                    domainScores={radarData}
                    title="Avaliacao de Maturidade"
                    showExportButtons={false}
                    height={350}
                  />
                ) : (
                  <div className="py-12 text-center text-gray-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Dados insuficientes para gerar o grafico.</p>
                    <p className="text-xs mt-1">Aguarde as respostas dos respondentes.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo de Maturidade */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo da Avaliacao</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 bg-indigo-50 rounded-lg">
                    <p className="text-3xl font-bold text-indigo-600">
                      {analysisData.overallAverage.toFixed(1)}
                    </p>
                    <p className="text-sm text-indigo-700">Media Geral</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      {analysisData.domainProgress.filter((d: any) => d.averageLevel >= 4).length}
                    </p>
                    <p className="text-sm text-green-700">Dominios Conformes</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">
                      {analysisData.domainProgress.filter((d: any) => d.averageLevel >= 2.5 && d.averageLevel < 4).length}
                    </p>
                    <p className="text-sm text-yellow-700">Em Progresso</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-3xl font-bold text-red-600">
                      {analysisData.domainProgress.filter((d: any) => d.averageLevel > 0 && d.averageLevel < 2.5).length}
                    </p>
                    <p className="text-sm text-red-700">Criticos</p>
                  </div>
                </div>

                {/* Tabela de níveis por domínio */}
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Nivel por Dominio</h4>
                  <div className="space-y-1.5">
                    {analysisData.domainProgress
                      .filter((d: any) => d.averageLevel > 0)
                      .sort((a: any, b: any) => a.averageLevel - b.averageLevel)
                      .map((d: any) => (
                        <div key={d.domainId} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-12">{d.domainId}</span>
                          <span className="text-sm flex-1 truncate">{d.domainName}</span>
                          <div className="w-24">
                            <Progress value={(d.averageLevel / 5) * 100} className="h-2" />
                          </div>
                          <Badge className={`text-xs w-14 justify-center ${LEVEL_COLORS[Math.round(d.averageLevel)] || "bg-gray-100"}`}>
                            {d.averageLevel.toFixed(1)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========== ABA MATRIZ DE RISCO 5x5 ========== */}
        <TabsContent value="risco" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Matriz de Risco 5x5 Visual */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Matriz de Risco 5x5
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisData.riskMatrixData.length > 0 ? (
                  <div className="space-y-4">
                    {/* Grid 5x5 */}
                    <div className="relative">
                      {/* Label eixo Y */}
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-500 font-medium whitespace-nowrap">
                        Probabilidade
                      </div>
                      <div className="ml-8">
                        {/* Labels superiores (Impacto) */}
                        <div className="grid grid-cols-5 gap-1 mb-1">
                          {["Muito Baixo", "Baixo", "Medio", "Alto", "Muito Alto"].map(label => (
                            <div key={label} className="text-center text-xs text-gray-500 font-medium">{label}</div>
                          ))}
                        </div>
                        {/* Grid 5x5 */}
                        {[5, 4, 3, 2, 1].map(prob => (
                          <div key={prob} className="grid grid-cols-5 gap-1 mb-1">
                            {[1, 2, 3, 4, 5].map(impact => {
                              const domainsInCell = analysisData.riskMatrixData.filter(
                                (r: any) => r.probability === prob && r.impact === impact
                              );
                              return (
                                <div
                                  key={`${prob}-${impact}`}
                                  className={`${getRiskCellColor(prob, impact)} rounded-lg p-1.5 min-h-[52px] flex flex-col items-center justify-center text-center`}
                                >
                                  {domainsInCell.length > 0 ? (
                                    domainsInCell.map((d: any) => (
                                      <span key={d.domainId} className="text-xs font-bold block leading-tight">
                                        {d.domainId}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs opacity-30">{prob * impact}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                        {/* Label eixo X */}
                        <div className="text-center text-xs text-gray-500 font-medium mt-2">Impacto</div>
                      </div>
                    </div>

                    {/* Legenda */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-green-300"></span>
                        <span className="text-xs text-gray-600">Baixo (1-4)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-yellow-300"></span>
                        <span className="text-xs text-gray-600">Medio (5-9)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-orange-400"></span>
                        <span className="text-xs text-gray-600">Alto (10-14)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-red-500"></span>
                        <span className="text-xs text-gray-600">Critico (15-19)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-red-700"></span>
                        <span className="text-xs text-gray-600">Muito Critico (20-25)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Dados insuficientes para gerar a matriz.</p>
                    <p className="text-xs mt-1">Aguarde as respostas dos respondentes.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lista de riscos por domínio */}
            <Card>
              <CardHeader>
                <CardTitle>Classificacao de Risco por Dominio</CardTitle>
              </CardHeader>
              <CardContent>
                {analysisData.riskMatrixData.length > 0 ? (
                  <div className="space-y-2">
                    {analysisData.riskMatrixData
                      .sort((a: any, b: any) => b.severity - a.severity)
                      .map((risk: any) => (
                        <div key={risk.domainId} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                          <span className="text-indigo-600">{DOMAIN_ICONS[risk.domainId]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{risk.domainName}</p>
                            <p className="text-xs text-gray-500">
                              Prob: {risk.probability} | Impacto: {risk.impact} | Score: {risk.severity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${LEVEL_COLORS[Math.round(risk.averageLevel)] || "bg-gray-100"}`}>
                              N{risk.averageLevel.toFixed(1)}
                            </Badge>
                            <Badge className={`text-xs ${getRiskBadgeColor(risk.riskLevel)}`}>
                              {getRiskLabel(risk.riskLevel)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic py-4 text-center">Sem dados de risco disponiveis.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RiskMatrix5Columns existente */}
          {riskItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Detalhamento Multi-Norma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiskMatrix5Columns risks={riskItems} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== ABA PLANO DE AÇÃO ========== */}
        {/* ========== ABA PLANO DE AÇÃO ========== */}
        <TabsContent value="plano-acao" className="space-y-6">
          <ActionPlanTab
            assessmentType="compliance"
            assessmentId={assessmentId!}
            organizationId={analysisData?.assessment?.organizationId || 0}
            isInternal={isInternal}
            actions={actionPlanItems || []}
            onRefreshActions={() => refetchActions()}
            showGenerateButton={true}
            onGeneratePlan={() => generatePlanMutation.mutate({ assessmentId: assessmentId! })}
            isGenerating={generatePlanMutation.isPending}
            onRefineAction={(actionId, instruction) => {
              refineActionMutation.mutate({ actionId, instruction });
            }}
            isRefining={refineActionMutation.isPending}
            highlightedActionId={highlightedActionId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
