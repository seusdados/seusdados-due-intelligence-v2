import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  CheckCircle2,
  TrendingUp,
  FileText,
  BarChart3,
  Sparkles,
  ClipboardList,
  RefreshCw,
  Copy,
  Check,
  FileDown,
  ListChecks,
  Wand2,
  Paperclip,
  Trash2,
  Eye
} from "lucide-react";
import { GedDocumentPicker } from "@/components/GedDocumentPicker";
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
import { dominiosConformidade, niveisMaturidade, frameworksDisponiveis } from "@shared/assessmentData";
import EvidenceUpload from "@/components/EvidenceUpload";
import { ReportViewer } from "@/components/ReportViewer";
import { ConformidadeResultadoHeader } from "@/components/ConformidadeResultadoHeader";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from "recharts";

const maturityColors: Record<number, string> = {
  1: "#dc2626",
  2: "#ea580c",
  3: "#eab308",
  4: "#22c55e",
  5: "#0ea5e9",
};

export default function ConformidadeResultado() {
  const params = useParams<{ id: string }>();
  const assessmentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  // Estados para geração de plano de ação com IA
  const [showActionPlanDialog, setShowActionPlanDialog] = useState(false);
  const [maturityThreshold, setMaturityThreshold] = useState(3);
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

  const { data: assessment, isLoading: loadingAssessment } = trpc.compliance.getById.useQuery(
    { id: assessmentId },
    { enabled: !!assessmentId }
  );

  const { data: responses, isLoading: loadingResponses } = trpc.compliance.getResponses.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );

  const { data: organization } = trpc.organization.getById.useQuery(
    { id: assessment?.organizationId || 0 },
    { enabled: !!assessment?.organizationId }
  );

  // Query de documentos vinculados
  const { data: linkedDocuments, refetch: refetchDocuments } = trpc.ged.getAssessmentDocuments.useQuery(
    { assessmentType: 'conformidade', assessmentId },
    { enabled: !!assessmentId }
  );

  const unlinkDocumentMutation = trpc.ged.unlinkDocumentFromAssessment.useMutation({
    onSuccess: () => {
      refetchDocuments();
    },
  });

  // Calculate domain scores
  const domainScores = useMemo(() => {
    if (!responses) return [];
    
    return dominiosConformidade.map(domain => {
      const domainResponses = responses.filter((r: any) => r.domainId === domain.id);
      const avgScore = domainResponses.length > 0
        ? domainResponses.reduce((acc: number, r: any) => acc + r.selectedLevel, 0) / domainResponses.length
        : 0;
      
      return {
        id: domain.id,
        name: domain.titulo.split(' ').slice(0, 2).join(' '),
        fullName: domain.titulo,
        score: Math.round(avgScore * 10) / 10,
        answered: domainResponses.length,
        total: domain.questoes.length,
        maturityLevel: Math.round(avgScore)
      };
    });
  }, [responses]);

  // Radar chart data
  const radarData = domainScores.map(d => ({
    domain: d.name,
    score: d.score,
    fullMark: 5
  }));

  // Bar chart data
  const barData = domainScores.map(d => ({
    name: `D${d.id}`,
    score: d.score,
    color: maturityColors[d.maturityLevel] || "#gray"
  }));

  // Pie chart data for maturity distribution
  const maturityDistribution = useMemo(() => {
    if (!responses) return [];
    
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    responses.forEach((r: any) => {
      if (counts[r.selectedLevel] !== undefined) {
        counts[r.selectedLevel]++;
      }
    });
    
    return niveisMaturidade.map(n => ({
      name: n.nome,
      value: counts[n.nivel],
      color: n.cor
    })).filter(d => d.value > 0);
  }, [responses]);

  // Overall maturity
  const overallMaturity = useMemo(() => {
    if (!responses || responses.length === 0) return null;
    const avg = responses.reduce((acc: number, r: any) => acc + r.selectedLevel, 0) / responses.length;
    const level = Math.round(avg);
    return niveisMaturidade.find(n => n.nivel === level);
  }, [responses]);

  // Export PDF mutation - MUST be before any conditional returns
  const exportPdfMutation = trpc.compliance.exportPdf.useMutation({
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
  const exportPremiumHtmlMutation = trpc.compliance.exportPremiumHtml.useMutation({
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
  const generateActionPlanMutation = trpc.ai.generateComplianceActionPlan.useMutation({
    onSuccess: (data) => {
      const result = data as { success?: boolean; content?: string; resultId?: number; gapsCount?: number; message?: string };
      if (result.success) {
        setGeneratedPlan(result.content || null);
        setGeneratedResultId(result.resultId || null);
        toast.success(`Plano de ação gerado com ${result.gapsCount} lacunas identificadas!`);
      } else {
        toast.info(result.message || 'Nenhuma lacuna identificada');
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
        maturityThreshold,
      });
    }
  }, [assessmentId, assessment?.organizationId, maturityThreshold, generateActionPlanMutation]);

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
    { module: 'compliance' },
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
        assessmentType: 'compliance',
      });
    }
  }, [selectedTemplate, assessmentId, assessment?.organizationId, generateFromTemplateMutation]);

  const handleApplyPlan = useCallback(() => {
    if (generatedResultId && assessment?.organizationId) {
      applyPlanMutation.mutate({
        resultId: generatedResultId,
        organizationId: assessment.organizationId,
        assessmentType: 'compliance',
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
            <Button onClick={() => setLocation('/conformidade')}>
              Voltar para listagem
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fw = frameworksDisponiveis[assessment.framework as keyof typeof frameworksDisponiveis];

  return (
    <div className="space-y-6">
      {/* Header com Topo */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/avaliacoes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{assessment.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="gap-1">
              <span>{fw?.icone}</span>
              {fw?.nome}
            </Badge>
            <span className="body-small">
              {organization?.name}
            </span>
          </div>
        </div>
      </div>

      {/* Novo Topo com Resumo e Timeline */}
      <ConformidadeResultadoHeader
        assessment={{
          id: assessmentId,
          title: assessment.title,
          createdAt: assessment.createdAt,
          dueDate: assessment.dueDate,
          status: assessment.status,
          totalQuestions: assessment.totalQuestions,
          answeredQuestions: assessment.answeredQuestions,
        }}
        onNewApplication={() => setLocation('/conformidade')}
        onEditDeadline={() => toast.info('Edicao de prazo em desenvolvimento')}
      />

      {/* Botoes de Acao */}
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: overallMaturity?.corFundo }}
              >
                <TrendingUp className="h-6 w-6" style={{ color: overallMaturity?.cor }} />
              </div>
              <div>
                <p className="body-small">Nível de Maturidade</p>
                <p className="text-2xl font-bold" style={{ color: overallMaturity?.cor }}>
                  {overallMaturity?.nome || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="body-small">Pontuação Geral</p>
                <p className="text-2xl font-bold">{assessment.overallScore || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="body-small">Questões Respondidas</p>
                <p className="text-2xl font-bold">
                  {assessment.answeredQuestions}/{assessment.totalQuestions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="radar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="radar">Gráfico Radar</TabsTrigger>
          <TabsTrigger value="bar">Gráfico de Barras</TabsTrigger>
          <TabsTrigger value="pie">Distribuição</TabsTrigger>
          <TabsTrigger value="details">Detalhes por Domínio</TabsTrigger>
          <TabsTrigger value="evidences">Evidências</TabsTrigger>
        </TabsList>

        <TabsContent value="radar">
          <Card>
            <CardHeader>
              <CardTitle>Maturidade por Domínio</CardTitle>
              <CardDescription>
                Visualização radar dos níveis de maturidade em cada domínio de conformidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} />
                    <Radar
                      name="Maturidade"
                      dataKey="score"
                      stroke="#5f29cc"
                      fill="#5f29cc"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bar">
          <Card>
            <CardHeader>
              <CardTitle>Pontuação por Domínio</CardTitle>
              <CardDescription>
                Comparativo de maturidade entre os domínios avaliados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Bar dataKey="score" name="Maturidade">
                      {barData.map((entry, index) => (
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
              <CardTitle>Distribuição de Maturidade</CardTitle>
              <CardDescription>
                Proporção de respostas por nível de maturidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={maturityDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {maturityDistribution.map((entry, index) => (
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
              <CardTitle>Detalhes por Domínio</CardTitle>
              <CardDescription>
                Análise detalhada de cada domínio de conformidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domínio</TableHead>
                    <TableHead>Questões</TableHead>
                    <TableHead>Pontuação</TableHead>
                    <TableHead>Maturidade</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domainScores.map((domain) => {
                    const maturity = niveisMaturidade.find(n => n.nivel === domain.maturityLevel);
                    return (
                      <TableRow key={domain.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{domain.fullName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {domain.answered}/{domain.total}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{domain.score.toFixed(1)}</span>/5
                        </TableCell>
                        <TableCell>
                          <Badge 
                            style={{ 
                              backgroundColor: maturity?.corFundo, 
                              color: maturity?.cor,
                              borderColor: maturity?.cor
                            }}
                          >
                            {maturity?.nome || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress 
                              value={(domain.answered / domain.total) * 100} 
                              className="h-2" 
                            />
                            <span className="text-xs text-muted-foreground">
                              {Math.round((domain.answered / domain.total) * 100)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/conformidade/avaliacao/${assessmentId}/dominio/${domain.id}`)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Ver Detalhes
                          </Button>
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
                assessmentType="compliance"
                assessmentId={assessment.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
            {domainScores
              .filter(d => d.maturityLevel < 4)
              .sort((a, b) => a.maturityLevel - b.maturityLevel)
              .slice(0, 5)
              .map((domain) => {
                const maturity = niveisMaturidade.find(n => n.nivel === domain.maturityLevel);
                return (
                  <div 
                    key={domain.id} 
                    className="p-4 rounded-lg border"
                    style={{ borderLeftWidth: 4, borderLeftColor: maturity?.cor }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{domain.fullName}</h4>
                      <Badge 
                        style={{ 
                          backgroundColor: maturity?.corFundo, 
                          color: maturity?.cor 
                        }}
                      >
                        Nível {domain.maturityLevel}
                      </Badge>
                    </div>
                    <p className="body-small">
                      Este domínio apresenta oportunidades de melhoria. Recomenda-se desenvolver 
                      plano de ação para elevar o nível de maturidade de {maturity?.nome} para 
                      {niveisMaturidade.find(n => n.nivel === domain.maturityLevel + 1)?.nome || "Otimizado"}.
                    </p>
                  </div>
                );
              })}
            {domainScores.filter(d => d.maturityLevel < 4).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>Excelente! Todos os domínios apresentam maturidade adequada.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Geração de Plano de Ação com IA */}
      <Dialog open={showActionPlanDialog} onOpenChange={setShowActionPlanDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Gerar Plano de Ação com IA
            </DialogTitle>
            <DialogDescription>
              A IA analisará as lacunas identificadas na avaliação e gerará um plano de ação estruturado e priorizado.
            </DialogDescription>
          </DialogHeader>

          {!generatedPlan ? (
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label>Nível de Maturidade Mínimo para Considerar Lacuna</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[maturityThreshold]}
                    onValueChange={(v) => setMaturityThreshold(v[0])}
                    min={1}
                    max={5}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold w-8 text-center">{maturityThreshold}</span>
                </div>
                <p className="body-small">
                  Questões com nível de maturidade abaixo de {maturityThreshold} serão consideradas lacunas.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">O que será gerado:</h4>
                <ul className="body-small space-y-1">
                  <li>• Análise das lacunas identificadas por domínio</li>
                  <li>• Ações priorizadas por criticidade</li>
                  <li>• Responsáveis sugeridos para cada ação</li>
                  <li>• Prazos estimados de implementação</li>
                  <li>• Recursos necessários e critérios de sucesso</li>
                  <li>• Recomendações gerais para o sucesso do plano</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              <ScrollArea className="flex-1 border rounded-lg p-4">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <Streamdown>{generatedPlan}</Streamdown>
                </div>
              </ScrollArea>

              <div className="space-y-3">
                <Label>Solicitar Refinamento</Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ex: Detalhe mais as ações do domínio de Governança, ou adicione prazos mais curtos..."
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
              Selecione um template pré-configurado para gerar análises específicas da avaliação.
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
          assessmentType="conformidade"
          assessmentId={assessmentId}
          onDocumentLinked={() => refetchDocuments()}
        />
      )}

      {/* Relatório Premium Viewer */}
      <ReportViewer
        isOpen={showPremiumReport}
        onClose={() => setShowPremiumReport(false)}
        title={`Relatório de Conformidade - ${organization?.name || 'Organização'}`}
        htmlContent={premiumReportHtml}
        reportType="Conformidade PPPD"
        onDownloadPdf={handleExportPdf}
      />
    </div>
  );
}
