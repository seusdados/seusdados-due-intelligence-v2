import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft,
  Download,
  AlertTriangle,
  Shield,
  FileText,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  FileDown,
  ListChecks,
  Wand2,
  Paperclip,
  Trash2
} from "lucide-react";
import { GedDocumentPicker } from "@/components/GedDocumentPicker";
import { MaturityDashboardPremium } from "@/components/MaturityDashboardPremium";
import { MaturityRecommendations } from "@/components/MaturityRecommendations";
import { ScoringLogicModal } from "@/components/ScoringLogicModal";
import { MaturityComparisonFilters } from "@/components/MaturityComparisonFilters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { DUE_DILIGENCE_FRAMEWORK } from "@shared/frameworkDueDiligence";
import EvidenceUpload from "@/components/EvidenceUpload";
import { ReportViewer } from "@/components/ReportViewer";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";

const riskColors: Record<string, string> = {
  Baixo: "#22c55e",
  Moderado: "#eab308",
  Alto: "#f97316",
  Crítico: "#dc2626",
};

const dueDiligenceRiskBands = [
  { nome: 'Baixo', cor: '#22c55e', corFundo: '#dcfce7', descricao: 'Risco controlado. Manter monitoramento periódico e evidências atualizadas.' },
  { nome: 'Moderado', cor: '#eab308', corFundo: '#fef9c3', descricao: 'Risco relevante. Definir plano de mitigação e acompanhar implementação.' },
  { nome: 'Alto', cor: '#f97316', corFundo: '#ffedd5', descricao: 'Risco alto. Priorizar ações corretivas e revisar controles do terceiro.' },
  { nome: 'Crítico', cor: '#dc2626', corFundo: '#fee2e2', descricao: 'Risco crítico. Avaliar contenção imediata, escalonamento e eventual suspensão.' },
];

function getQuestionByNumber(questionId: number) {
  return DUE_DILIGENCE_FRAMEWORK.find((q) => q.number === questionId);
}

function getDueDiligenceClassification(score: number) {
  if (score <= 6) return dueDiligenceRiskBands[0];
  if (score <= 12) return dueDiligenceRiskBands[1];
  if (score <= 18) return dueDiligenceRiskBands[2];
  return dueDiligenceRiskBands[3];
}

export default function DueDiligenceResultado() {
  const params = useParams<{ id: string }>();
  const assessmentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  // Estados para geração de plano de ação com IA
  const [showActionPlanDialog, setShowActionPlanDialog] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState(10);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [generatedResultId, setGeneratedResultId] = useState<number | null>(null);
  const [refinementInput, setRefinementInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showGedPicker, setShowGedPicker] = useState(false);
  
  // Estados para relatório premium
  const [showPremiumReport, setShowPremiumReport] = useState(false);
  const [premiumReportHtml, setPremiumReportHtml] = useState<string>('');
  
  // Estados para modais explicativos
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [scoringModalType, setScoringModalType] = useState<'radar' | 'matrix' | 'classification' | 'all'>('all');

  const { data: assessment, isLoading: loadingAssessment } = trpc.thirdPartyAssessment.getById.useQuery(
    { id: assessmentId },
    { enabled: !!assessmentId }
  );

  const { data: responses, isLoading: loadingResponses } = trpc.thirdPartyAssessment.getResponses.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );

  const { data: thirdParty } = trpc.thirdParty.getById.useQuery(
    { id: assessment?.thirdPartyId || 0 },
    { enabled: !!assessment?.thirdPartyId }
  );

  const { data: organization } = trpc.organization.getById.useQuery(
    { id: assessment?.organizationId || 0 },
    { enabled: !!assessment?.organizationId }
  );

  // Query de documentos vinculados
  const { data: linkedDocuments, refetch: refetchDocuments } = trpc.ged.getAssessmentDocuments.useQuery(
    { assessmentType: 'due_diligence', assessmentId },
    { enabled: !!assessmentId }
  );

  const unlinkDocumentMutation = trpc.ged.unlinkDocumentFromAssessment.useMutation({
    onSuccess: () => {
      refetchDocuments();
    },
  });

  // Calculate risk scores by category
  const categoryScores = useMemo(() => {
    if (!responses) return [];
    
    const categories: Record<string, { scores: number[]; questions: any[] }> = {};
    
    responses.forEach((r: any) => {
      const question = getQuestionByNumber(r.questionId);
      if (question) {
        if (!categories[question.section]) {
          categories[question.section] = { scores: [], questions: [] };
        }
        categories[question.section].scores.push(r.riskScore);
        categories[question.section].questions.push({ ...r, question });
      }
    });
    
    return Object.entries(categories).map(([name, data]) => {
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      const maxScore = Math.max(...data.scores);
      const classification = getDueDiligenceClassification(maxScore);
      
      return {
        name,
        avgScore: Math.round(avgScore * 10) / 10,
        maxScore,
        classification: classification.nome,
        color: classification.cor,
        questions: data.questions
      };
    });
  }, [responses]);

  // Risk distribution for pie chart
  const riskDistribution = useMemo(() => {
    if (!responses) return [];
    
    const counts: Record<string, number> = {
      Baixo: 0,
      Moderado: 0,
      Alto: 0,
      Crítico: 0
    };
    
    responses.forEach((r: any) => {
      const cls = getDueDiligenceClassification(r.riskScore);
      counts[cls.nome]++;
    });
    
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: riskColors[name]
      }));
  }, [responses]);

  // Risk matrix data
  const matrixData = useMemo(() => {
    if (!responses) return [];
    return responses.map((r: any) => ({
      x: r.impactScore || 1,
      y: r.probabilityScore || 1,
      z: r.riskScore,
      name: getQuestionByNumber(r.questionId)?.question.substring(0, 30) || "",
      classification: getDueDiligenceClassification(r.riskScore)
    }));
  }, [responses]);

  // Overall classification
  const overallClassification = useMemo(() => {
    if (!responses || responses.length === 0) return null;
    const maxScore = Math.max(...responses.map((r: any) => r.riskScore));
    return getDueDiligenceClassification(maxScore);
  }, [responses]);

  const exportPdfMutation = trpc.thirdPartyAssessment.exportPdf.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.contentType });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Relatório exportado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao exportar relatório: ' + error.message);
    },
  });

  const handleExportPdf = useCallback(() => {
    if (assessmentId) {
      exportPdfMutation.mutate({ id: assessmentId });
    }
  }, [assessmentId, exportPdfMutation]);

  // Mutation para relatório premium HTML
  const exportPremiumHtmlMutation = trpc.thirdPartyAssessment.exportPremiumHtml.useMutation({
    onSuccess: (data) => {
      setPremiumReportHtml(data.html);
      setShowPremiumReport(true);
      toast.success('Relatório premium gerado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao gerar relatório premium: ' + error.message);
    },
  });

  const handleExportPremiumHtml = useCallback(() => {
    if (assessmentId) {
      exportPremiumHtmlMutation.mutate({ id: assessmentId });
    }
  }, [assessmentId, exportPremiumHtmlMutation]);

  // Mutation para gerar plano de ação com IA
  const generateActionPlanMutation = trpc.ai.generateDueDiligenceActionPlan.useMutation({
    onSuccess: (data) => {
      const result = data as { success?: boolean; content?: string; resultId?: number; gapsCount?: number; message?: string };
      if (result.success) {
        setGeneratedPlan(result.content || null);
        setGeneratedResultId(result.resultId || null);
        toast.success(`Plano de ação gerado com ${result.gapsCount} riscos identificados!`);
      } else {
        toast.info(result.message || 'Nenhum risco identificado');
        setShowActionPlanDialog(false);
      }
    },
    onError: (error) => {
      toast.error('Erro ao gerar plano de ação: ' + error.message);
    },
  });

  // Mutation para refinar plano de ação
  const refineActionPlanMutation = trpc.ai.refineActionPlan.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedPlan(data.content || null);
        setGeneratedResultId(data.resultId || null);
        setRefinementInput('');
        toast.success('Plano de ação refinado com sucesso!');
      }
    },
    onError: (error) => {
      toast.error('Erro ao refinar plano: ' + error.message);
    },
  });

  const handleGenerateActionPlan = useCallback(() => {
    if (assessmentId && assessment?.organizationId) {
      setGeneratedPlan(null);
      setGeneratedResultId(null);
      generateActionPlanMutation.mutate({
        assessmentId,
        organizationId: assessment.organizationId,
        riskThreshold,
      });
    }
  }, [assessmentId, assessment?.organizationId, riskThreshold, generateActionPlanMutation]);

  const handleRefineActionPlan = useCallback(() => {
    if (generatedResultId && assessment?.organizationId && refinementInput.trim()) {
      refineActionPlanMutation.mutate({
        resultId: generatedResultId,
        organizationId: assessment.organizationId,
        refinementRequest: refinementInput,
      });
    }
  }, [generatedResultId, assessment?.organizationId, refinementInput, refineActionPlanMutation]);

  const handleCopyPlan = useCallback(() => {
    if (generatedPlan) {
      navigator.clipboard.writeText(generatedPlan);
      setCopied(true);
      toast.success('Plano copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedPlan]);

  // Query para buscar templates disponíveis
  const { data: templates } = trpc.ai.getSystemTemplates.useQuery(
    { module: 'due_diligence' },
    { enabled: showTemplatesDialog }
  );

  // Mutation para gerar a partir de template
  const generateFromTemplateMutation = trpc.ai.generateFromTemplate.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedPlan(data.content || null);
        setGeneratedResultId(data.resultId || null);
        setShowTemplatesDialog(false);
        setShowActionPlanDialog(true);
        toast.success('Conteúdo gerado com sucesso!');
      }
    },
    onError: (error) => {
      toast.error('Erro ao gerar conteúdo: ' + error.message);
    },
  });

  // Mutation para aplicar plano ao módulo de ações
  const applyPlanMutation = trpc.ai.applyParsedActions.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.totalCreated} ações criadas no módulo de Planos de Ação!`);
        setShowActionPlanDialog(false);
        setGeneratedPlan(null);
        setGeneratedResultId(null);
      } else {
        toast.info(data.message || 'Nenhuma ação encontrada no plano');
      }
    },
    onError: (error) => {
      toast.error('Erro ao aplicar plano: ' + error.message);
    },
  });

  // Mutation para exportar plano em PDF
  const exportPlanPdfMutation = trpc.ai.exportActionPlanPdf.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.contentType });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Plano de ação exportado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao exportar plano: ' + error.message);
    },
  });

  const handleGenerateFromTemplate = useCallback(() => {
    if (selectedTemplate && assessmentId && assessment?.organizationId) {
      generateFromTemplateMutation.mutate({
        templateId: selectedTemplate,
        organizationId: assessment.organizationId,
        assessmentId,
        assessmentType: 'due_diligence',
      });
    }
  }, [selectedTemplate, assessmentId, assessment?.organizationId, generateFromTemplateMutation]);

  const handleApplyPlan = useCallback(() => {
    if (generatedResultId && assessment?.organizationId) {
      applyPlanMutation.mutate({
        resultId: generatedResultId,
        organizationId: assessment.organizationId,
        assessmentType: 'third_party',
        assessmentId,
      });
    }
  }, [generatedResultId, assessment?.organizationId, assessmentId, applyPlanMutation]);

  const handleExportPlanPdf = useCallback(() => {
    if (generatedResultId && assessment?.organizationId) {
      exportPlanPdfMutation.mutate({
        resultId: generatedResultId,
        organizationId: assessment.organizationId,
      });
    }
  }, [generatedResultId, assessment?.organizationId, exportPlanPdfMutation]);

  // Critical risks
  const criticalRisks = useMemo(() => {
    if (!responses) return [];
    return responses
      .filter((r: any) => r.riskScore >= 17)
      .map((r: any) => ({
        ...r,
        question: getQuestionByNumber(r.questionId)
      }));
  }, [responses]);

  if (loadingAssessment || loadingResponses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-lg font-semibold mb-2">Avaliação não encontrada</h2>
            <Button onClick={() => setLocation('/due-diligence')}>
              Voltar para listagem
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/due-diligence')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{assessment.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{thirdParty?.name || "Terceiro"}</Badge>
              <span className="body-small">
                {organization?.name}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => setShowTemplatesDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 hover:from-purple-600 hover:to-indigo-600"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Templates IA
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowActionPlanDialog(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Plano de Ação com IA
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowGedPicker(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:from-purple-700 hover:to-blue-700"
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Anexar Evidências
            {linkedDocuments && linkedDocuments.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20">
                {linkedDocuments.length}
              </Badge>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPremiumHtml}
            disabled={exportPremiumHtmlMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
          >
            {exportPremiumHtmlMutation.isPending ? (
              <>
                <span className="animate-spin mr-2">◎</span>
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Relatório Premium
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportPdf}
            disabled={exportPdfMutation.isPending}
            className="btn-gradient-seusdados text-white border-0"
          >
            {exportPdfMutation.isPending ? (
              <>
                <span className="animate-spin mr-2">◎</span>
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dashboard Premium com Gráficos Estonteantes */}
      <MaturityDashboardPremium
        assessment={assessment}
        responses={responses}
        overallClassification={overallClassification}
        categoryScores={categoryScores}
        matrixData={matrixData}
        criticalRisks={criticalRisks}
        thirdParty={thirdParty}
        organization={organization}
        onOpenScoringModal={(type) => {
          setScoringModalType(type);
          setShowScoringModal(true);
        }}
      />

      {/* Risk Alert */}
      {overallClassification && overallClassification.nome === "Crítico" && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800">Deal Breaker Identificado</h3>
                <p className="text-sm text-red-700 mt-1">
                  {overallClassification.descricao}. Recomenda-se não prosseguir com a contratação 
                  até que os riscos críticos sejam mitigados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <Tabs defaultValue="bar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bar">Por Categoria</TabsTrigger>
          <TabsTrigger value="pie">Distribuição</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="evidences">Evidências</TabsTrigger>
        </TabsList>

        <TabsContent value="bar">
          <Card>
            <CardHeader>
              <CardTitle>Risco por Categoria</CardTitle>
              <CardDescription>
                Pontuação máxima de risco por categoria de avaliação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryScores} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 25]} />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="maxScore" name="Risco Máximo">
                      {categoryScores.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pie">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Riscos</CardTitle>
              <CardDescription>
                Proporção de questões por classificação de risco
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes das Avaliações</CardTitle>
              <CardDescription>
                Lista completa de questões avaliadas com pontuações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Questão</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Impacto</TableHead>
                    <TableHead>Probabilidade</TableHead>
                    <TableHead>Risco</TableHead>
                    <TableHead>Classificação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses?.map((r: any) => {
                    const question = getQuestionByNumber(r.questionId);
                    const cls = getDueDiligenceClassification(r.riskScore);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate text-sm">{question?.question}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{question?.section}</Badge>
                        </TableCell>
                        <TableCell>{r.impactScore}</TableCell>
                        <TableCell>{r.probabilityScore}</TableCell>
                        <TableCell className="font-medium">{r.riskScore}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: cls.corFundo, color: cls.cor }}>
                            {cls.nome}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidences">
          <Card>
            <CardHeader>
              <CardTitle>Evidências e Documentos</CardTitle>
              <CardDescription>
                Anexe documentos comprobatórios relacionados à avaliação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EvidenceUpload
                organizationId={assessment.organizationId}
                assessmentType="third_party"
                assessmentId={assessment.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Critical Risks */}
      {criticalRisks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Riscos Críticos Identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalRisks.map((risk: any) => (
                <div 
                  key={risk.id} 
                  className="p-4 rounded-lg border border-red-200 bg-red-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-red-800">{risk.question?.question}</h4>
                    <Badge className="bg-red-500 text-white">
                      Risco: {risk.riskScore}
                    </Badge>
                  </div>
                  <p className="text-sm text-red-700">
                    Impacto: {risk.impactScore}/5 | Probabilidade: {risk.probabilityScore}/5
                  </p>
                  {risk.notes && (
                    <p className="text-sm text-red-600 mt-2 italic">
                      Observação: {risk.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dueDiligenceRiskBands.map((cls) => {
              const count = responses?.filter((r: any) => {
                const c = getDueDiligenceClassification(r.riskScore);
                return c.nome === cls.nome;
              }).length || 0;
              
              if (count === 0) return null;
              
              return (
                <div 
                  key={cls.nome}
                  className="p-4 rounded-lg border"
                  style={{ borderLeftWidth: 4, borderLeftColor: cls.cor }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{cls.nome}</h4>
                    <Badge style={{ backgroundColor: cls.corFundo, color: cls.cor }}>
                      {count} {count === 1 ? 'questão' : 'questões'}
                    </Badge>
                  </div>
                  <p className="body-small">
                    {cls.descricao}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Geração de Plano de Ação com IA */}
      <Dialog open={showActionPlanDialog} onOpenChange={setShowActionPlanDialog}>
        <DialogContent className="max-w-[900px] w-[95vw] max-h-[95vh] h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Gerar Plano de Ação com IA
            </DialogTitle>
            <DialogDescription>
              A IA analisará os riscos identificados na avaliação de due diligence e gerará um plano de ação para mitigação.
            </DialogDescription>
          </DialogHeader>

          {!generatedPlan ? (
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label>Nível de Risco Mínimo para Considerar</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[riskThreshold]}
                    onValueChange={(v) => setRiskThreshold(v[0])}
                    min={1}
                    max={25}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold w-8 text-center">{riskThreshold}</span>
                </div>
                <p className="body-small">
                  Questões com score de risco igual ou acima de {riskThreshold} (1–25) serão consideradas para o plano.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">O que será gerado:</h4>
                <ul className="body-small space-y-1">
                  <li>• Análise dos riscos identificados por categoria</li>
                  <li>• Ações de mitigação priorizadas</li>
                  <li>• Responsáveis sugeridos para cada ação</li>
                  <li>• Prazos estimados de implementação</li>
                  <li>• Indicadores de monitoramento</li>
                  <li>• Recomendações para gestão do terceiro</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              <ScrollArea className="flex-1 min-h-0 border rounded-lg">
                <div className="prose prose-sm max-w-none dark:prose-invert p-4">
                  <Streamdown>{generatedPlan}</Streamdown>
                </div>
              </ScrollArea>

              <div className="space-y-3">
                <Label>Solicitar Refinamento</Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ex: Detalhe mais as ações de mitigação para riscos críticos, ou adicione controles contratuais..."
                    value={refinementInput}
                    onChange={(e) => setRefinementInput(e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    onClick={handleRefineActionPlan}
                    disabled={!refinementInput.trim() || refineActionPlanMutation.isPending}
                    className="self-end"
                  >
                    {refineActionPlanMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Você pode solicitar refinamentos ilimitados para ajustar o plano conforme necessário.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            {generatedPlan && (
              <>
                <Button variant="outline" onClick={handleCopyPlan}>
                  {copied ? (
                    <><Check className="mr-2 h-4 w-4" /> Copiado!</>
                  ) : (
                    <><Copy className="mr-2 h-4 w-4" /> Copiar Plano</>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportPlanPdf}
                  disabled={exportPlanPdfMutation.isPending}
                >
                  {exportPlanPdfMutation.isPending ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Exportando...</>
                  ) : (
                    <><FileDown className="mr-2 h-4 w-4" /> Exportar PDF</>
                  )}
                </Button>
                <Button 
                  onClick={handleApplyPlan}
                  disabled={applyPlanMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {applyPlanMutation.isPending ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Aplicando...</>
                  ) : (
                    <><ListChecks className="mr-2 h-4 w-4" /> Aplicar ao Módulo de Ações</>
                  )}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setShowActionPlanDialog(false);
                setGeneratedPlan(null);
                setGeneratedResultId(null);
                setRefinementInput('');
              }}
            >
              {generatedPlan ? 'Fechar' : 'Cancelar'}
            </Button>
            {!generatedPlan && (
              <Button
                onClick={handleGenerateActionPlan}
                disabled={generateActionPlanMutation.isPending}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {generateActionPlanMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Gerando Plano...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Plano de Ação
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Templates de IA */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-500" />
              Templates de Análise com IA
            </DialogTitle>
            <DialogDescription>
              Selecione um template pré-configurado para gerar análises específicas da avaliação de due diligence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && templates && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">
                  {templates.find(t => t.id === selectedTemplate)?.name}
                </h4>
                <p className="body-small">
                  {templates.find(t => t.id === selectedTemplate)?.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {templates.find(t => t.id === selectedTemplate)?.category}
                  </Badge>
                  <Badge variant="secondary">
                    {templates.find(t => t.id === selectedTemplate)?.module}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplatesDialog(false);
                setSelectedTemplate('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateFromTemplate}
              disabled={!selectedTemplate || generateFromTemplateMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
            >
              {generateFromTemplateMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Gerar Análise
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seção de Evidências Vinculadas */}
      {linkedDocuments && linkedDocuments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-purple-600" />
              Evidências Vinculadas ({linkedDocuments.length})
            </CardTitle>
            <CardDescription>
              Documentos do GED anexados como evidências desta avaliação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {linkedDocuments.map((link: any) => (
                <div key={link.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{link.document?.name || 'Documento'}</p>
                      <div className="flex items-center gap-2 body-small">
                        <Badge variant="outline" className="text-xs">
                          {link.category === 'evidencia_conformidade' ? 'Evidência de Conformidade' :
                           link.category === 'documento_suporte' ? 'Documento de Suporte' :
                           link.category === 'relatorio_auditoria' ? 'Relatório de Auditoria' :
                           link.category === 'politica_procedimento' ? 'Política/Procedimento' :
                           link.category === 'contrato' ? 'Contrato' :
                           link.category === 'termo_responsabilidade' ? 'Termo de Responsabilidade' :
                           'Outro'}
                        </Badge>
                        {link.description && <span>- {link.description}</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlinkDocumentMutation.mutate({ id: link.id })}
                    disabled={unlinkDocumentMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GED Document Picker */}
      {assessment?.organizationId && (
        <GedDocumentPicker
          open={showGedPicker}
          onOpenChange={setShowGedPicker}
          organizationId={assessment.organizationId}
          assessmentType="due_diligence"
          assessmentId={assessmentId}
          onDocumentLinked={() => refetchDocuments()}
        />
      )}

      {/* Recomendações Interativas e Editáveis */}
      <MaturityRecommendations
        assessmentId={assessmentId}
        editable={true}
      />

      {/* Filtros e Comparações */}
      <MaturityComparisonFilters
        currentThirdPartyId={assessment?.thirdPartyId || 0}
        currentThirdPartyName={thirdParty?.name || 'Terceiro'}
        availableThirdParties={[]}
      />

      {/* Modal Explicativo de Lógica de Pontuação */}
      <ScoringLogicModal
        open={showScoringModal}
        onOpenChange={setShowScoringModal}
        type={scoringModalType}
      />

      {/* Relatório Premium Viewer */}
      <ReportViewer
        isOpen={showPremiumReport}
        onClose={() => setShowPremiumReport(false)}
        title={`Relatório de Due Diligence - ${thirdParty?.name || 'Terceiro'}`}
        htmlContent={premiumReportHtml}
        reportType="Due Diligence"
        onDownloadPdf={handleExportPdf}
      />
    </div>
  );
}
