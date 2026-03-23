import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  FileText, 
  Shield, 
  Users, 
  Database, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit,
  Save,
  Sparkles,
  Download,
  Building2,
  FolderOpen,
  FileCheck,
  ExternalLink,
  RefreshCw,
  Plus,
  History,
  GitCompare,
  ChevronRight,
  Bell,
  Scale,
  Link2,
  Eye,
  BarChart3,
  Target,
  RotateCcw,
  PenLine
} from "lucide-react";
import { toast } from "sonner";
import { BaseLegalSelector } from "@/components/BaseLegalSelector";
import { DadosPessoaisSelector } from "@/components/DadosPessoaisSelector";
import { FormattedTextDisplay, BaseLegalDisplay, JustificativaDisplay } from "@/components/FormattedTextDisplay";

const statusColors: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  em_revisao: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-green-100 text-green-800",
  arquivado: "bg-blue-100 text-blue-800",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em Revisão",
  aprovado: "Aprovado",
  arquivado: "Arquivado",
};

const riskColors: Record<string, string> = {
  baixo: "bg-green-100 text-green-800 border-green-200",
  medio: "bg-yellow-100 text-yellow-800 border-yellow-200",
  alto: "bg-orange-100 text-orange-800 border-orange-200",
  critico: "bg-red-100 text-red-800 border-red-200",
};

const riskLabels: Record<string, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

export default function MapeamentoDetalhes() {
  const [, params] = useRoute<{ id: string }>("/mapeamentos/:id");
  const rotId = params?.id ? parseInt(params.id) : null;
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [editedBaseLegal, setEditedBaseLegal] = useState("");
  const [editedDadosPessoais, setEditedDadosPessoais] = useState<string[]>([]);

  const { data: rot, isLoading, refetch } = trpc.rot.getById.useQuery(
    { id: rotId! },
    { enabled: !!rotId }
  );

  const updateMutation = trpc.rot.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditing(false);
      toast.success("Mapeamento atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const generateBaseLegalMutation = trpc.rot.generateBaseLegal.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Análise de risco e base legal geradas com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao gerar análise: ${error.message}`);
    }
  });

  const updateStatusMutation = trpc.rot.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Status atualizado!");
    },
  });

  const generateRotPremiumMutation = trpc.rot.generateRotPremium.useMutation({
    onSuccess: (data) => {
      // Download do PDF
      const link = document.createElement('a');
      link.href = `data:${data.contentType};base64,${data.data}`;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("ROT Premium gerado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao gerar ROT Premium: ${error.message}`);
    }
  });

  const generatePopPremiumMutation = trpc.rot.generatePopPremium.useMutation({
    onSuccess: (data) => {
      // Download do PDF
      const link = document.createElement('a');
      link.href = `data:${data.contentType};base64,${data.data}`;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("POP Premium gerado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao gerar POP Premium: ${error.message}`);
    }
  });

  const handleGenerateRotPremium = () => {
    if (!rotId || !rot?.organizationId) return;
    generateRotPremiumMutation.mutate({ rotId, organizationId: rot.organizationId });
  };

  const handleGeneratePopPremium = () => {
    if (!rotId || !rot?.organizationId) return;
    generatePopPremiumMutation.mutate({ rotId, organizationId: rot.organizationId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!rot) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="heading-4 mb-2">Mapeamento não encontrado</h2>
            <p className="text-muted-foreground mb-4">
              O registro de operação de tratamento solicitado não existe ou foi removido.
            </p>
            <Link href="/mapeamentos">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Mapeamentos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditedDescription(rot.description || "");
    setEditedBaseLegal(rot.legalBase || "");
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: rot.id,
      description: editedDescription,
      legalBase: editedBaseLegal,
    });
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({
      id: rot.id,
      status: newStatus as "rascunho" | "em_revisao" | "aprovado" | "arquivado",
    });
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/mapeamentos">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{rot.title}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {rot.department || "Departamento não informado"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusColors[rot.status || "rascunho"]}>
            {statusLabels[rot.status || "rascunho"]}
          </Badge>
          {rot.aiAnalysis && (rot.aiAnalysis as any)?.riskLevel && (
            <Badge className={riskColors[(rot.aiAnalysis as any).riskLevel]}>
              Risco: {riskLabels[(rot.aiAnalysis as any).riskLevel]}
            </Badge>
          )}
          <Select value={rot.status || "rascunho"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="em_revisao">Em Revisão</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="body-small">Categoria de Titular</p>
                <p className="font-semibold">{rot.titularCategory || "Não informado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="body-small">Dados Tratados</p>
                <p className="font-semibold">{Array.isArray(rot.dataCategories) ? (rot.dataCategories as any[]).length : 0} categorias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="body-small">Base Legal</p>
                <p className="font-semibold truncate max-w-32" title={rot.legalBase || ""}>
                  {rot.legalBase ? rot.legalBase.split(" ").slice(0, 3).join(" ") + "..." : "Não definida"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="body-small">Criado em</p>
                <p className="font-semibold">
                  {rot.createdAt ? new Date(rot.createdAt).toLocaleDateString("pt-BR") : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="detalhes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="dados">Dados Tratados</TabsTrigger>
          <TabsTrigger value="analise">Análise de Risco</TabsTrigger>
          <TabsTrigger value="recomendacoes">Recomendações</TabsTrigger>
          <TabsTrigger value="documentos">Documentos GED</TabsTrigger>
          <TabsTrigger value="contratos">Contratos Vinculados</TabsTrigger>
          <TabsTrigger value="cobertura">Cobertura</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Informações do Tratamento</CardTitle>
                <CardDescription>Detalhes da operação de tratamento de dados</CardDescription>
              </div>
              {!isEditing ? (
                <Button variant="outline" onClick={handleStartEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Descrição da Atividade</h4>
                {isEditing ? (
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={4}
                    placeholder="Descreva a atividade de tratamento..."
                  />
                ) : (
                  <FormattedTextDisplay
                    content={rot.description}
                    variant="card"
                    accentColor="purple"
                    label="Descrição da Atividade"
                    emptyText="Nenhuma descrição fornecida."
                  />
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Base Legal (LGPD)</h4>
                {isEditing ? (
                  <BaseLegalSelector
                    value={editedBaseLegal as any}
                    onChange={setEditedBaseLegal as any}
                    hasDadosSensiveis={Array.isArray(rot.dataCategories) && (rot.dataCategories as any[]).some((cat: any) => cat.sensivel) || false}
                  />
                ) : (
                  <BaseLegalDisplay
                    content={rot.legalBase}
                    variant="card"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Finalidade</h4>
                  <FormattedTextDisplay
                    content={rot.purpose}
                    variant="card"
                    accentColor="teal"
                    emptyText="Não informada"
                  />
                </div>
                <div>
                  <h4 className="font-medium mb-2">Requer Consentimento</h4>
                  <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg">
                    {rot.requiresConsent ? "Sim" : "Não"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dados">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Categorias de Dados Tratados</CardTitle>
                <CardDescription>Dados pessoais coletados e processados nesta operação</CardDescription>
              </div>
              {isEditing && (
                <Button variant="outline" size="sm" onClick={() => {
                  const currentData = Array.isArray(rot.dataCategories) ? (rot.dataCategories as any[]).map((cat: any) => cat.name) : [];
                  setEditedDadosPessoais(currentData);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Dados
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditing && editedDadosPessoais.length === 0 ? (
                <div className="space-y-4">
                  <p className="body-small mb-4">
                    Selecione os dados pessoais tratados nesta operação:
                  </p>
                  <DadosPessoaisSelector
                    value={editedDadosPessoais as any}
                    onChange={setEditedDadosPessoais as any}
                  />
                </div>
              ) : rot.dataCategories && Array.isArray(rot.dataCategories) && (rot.dataCategories as any[]).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(rot.dataCategories as any[]).map((cat: { name: string; sensivel: boolean }, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border ${
                        cat.sensivel 
                          ? "bg-red-50 border-red-200" 
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{cat.name}</span>
                        {cat.sensivel && (
                          <Badge variant="destructive" className="text-xs">
                            Sensível
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma categoria de dados registrada.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analise">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Risco</CardTitle>
              <CardDescription>Avaliação de riscos associados ao tratamento</CardDescription>
            </CardHeader>
            <CardContent>
              {rot.aiAnalysis ? (
                <div className="space-y-4">
                  <AnaliseRiscoFormatada aiAnalysis={rot.aiAnalysis} />
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => generateBaseLegalMutation.mutate({ id: rot.id })}
                      disabled={generateBaseLegalMutation.isPending}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {generateBaseLegalMutation.isPending ? "Gerando..." : "Regenerar Análise com IA"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Análise de risco ainda não realizada.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => generateBaseLegalMutation.mutate({ id: rot.id })}
                    disabled={generateBaseLegalMutation.isPending}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {generateBaseLegalMutation.isPending ? "Gerando..." : "Gerar Análise com IA"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recomendacoes">
          <RecomendacoesTab rotId={rotId!} />
        </TabsContent>

        <TabsContent value="documentos">
          <DocumentosGedTab rotId={rotId!} organizationId={rot.organizationId} />
        </TabsContent>

        <TabsContent value="contratos">
          <ContratosVinculadosTab responseId={rotId!} />
        </TabsContent>

        <TabsContent value="cobertura">
          <CoverageTab organizationId={rot.organizationId} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab organizationId={rot.organizationId} />
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <p className="body-small">
              Criado por: ID #{rot.createdById || "Sistema"} • 
              Última atualização: {rot.updatedAt ? new Date(rot.updatedAt).toLocaleString("pt-BR") : "N/A"}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => handleGenerateRotPremium()}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar ROT Premium
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleGeneratePopPremium()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar POP Premium
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = `/rot/${rotId}`}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Documento
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para formatar a análise de risco (JSON da IA)
function AnaliseRiscoFormatada({ aiAnalysis }: { aiAnalysis: any }) {
  if (!aiAnalysis) return null;

  const analysis = typeof aiAnalysis === 'string' ? (() => { try { return JSON.parse(aiAnalysis); } catch { return null; } })() : aiAnalysis;
  if (!analysis || typeof analysis !== 'object') {
    return (
      <FormattedTextDisplay
        content={String(aiAnalysis)}
        variant="card"
        accentColor="amber"
        label="Análise de Risco"
      />
    );
  }

  const riskLevelColors: Record<string, string> = {
    baixo: "bg-green-100 text-green-800 border-green-300",
    medio: "bg-yellow-100 text-yellow-800 border-yellow-300",
    alto: "bg-orange-100 text-orange-800 border-orange-300",
    critico: "bg-red-100 text-red-800 border-red-300",
  };

  const riskLevelLabels: Record<string, string> = {
    baixo: "Baixo",
    medio: "Médio",
    alto: "Alto",
    critico: "Crítico",
  };

  return (
    <div className="space-y-4">
      {/* Nível de Risco */}
      {analysis.riskLevel && (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-medium text-sm ${riskLevelColors[analysis.riskLevel] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
          <AlertTriangle className="h-4 w-4" />
          Nível de Risco: {riskLevelLabels[analysis.riskLevel] || analysis.riskLevel}
        </div>
      )}

      {/* Justificativa do Risco */}
      {analysis.riskJustification && (
        <FormattedTextDisplay
          content={analysis.riskJustification}
          variant="card"
          accentColor="amber"
          label="Justificativa do Risco"
        />
      )}

      {/* Base Legal Sugerida */}
      {analysis.suggestedLegalBase && (
        <FormattedTextDisplay
          content={analysis.suggestedLegalBase}
          variant="card"
          accentColor="blue"
          label="Base Legal Sugerida"
        />
      )}

      {/* Justificativa da Base Legal */}
      {analysis.legalBaseJustification && (
        <FormattedTextDisplay
          content={analysis.legalBaseJustification}
          variant="card"
          accentColor="purple"
          label="Justificativa da Base Legal"
        />
      )}

      {/* Recomendações */}
      {analysis.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
        <div className="rounded-lg border-l-4 border-l-teal-500 bg-teal-50/50 dark:bg-teal-950/20 p-4">
          <span className="label-visual-law text-teal-700 dark:text-teal-400">Recomendações</span>
          <ul className="mt-3 space-y-2">
            {analysis.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2.5 font-extralight text-sm text-[var(--text-primary)] leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Campos adicionais genéricos */}
      {Object.entries(analysis)
        .filter(([key]) => !['riskLevel', 'riskJustification', 'suggestedLegalBase', 'legalBaseJustification', 'recommendations'].includes(key))
        .map(([key, value]) => {
          if (typeof value === 'string' && value.length > 10) {
            const label = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, s => s.toUpperCase())
              .trim();
            return (
              <FormattedTextDisplay
                key={key}
                content={value}
                variant="card"
                accentColor="gray"
                label={label}
              />
            );
          }
          return null;
        })}
    </div>
  );
}

// Componente para a tab de Recomendações
function RecomendacoesTab({ rotId }: { rotId: number }) {
  const { data: recommendations, isLoading } = trpc.rot.getRecommendations.useQuery({ rotId });
  
  const priorityColors: Record<string, string> = {
    baixa: "bg-blue-100 text-blue-800",
    media: "bg-yellow-100 text-yellow-800",
    alta: "bg-orange-100 text-orange-800",
    critica: "bg-red-100 text-red-800",
  };
  
  const priorityLabels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica",
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recomendações</CardTitle>
          <CardDescription>Sugestões para adequação e melhoria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recomendações</CardTitle>
        <CardDescription>Sugestões para adequação e melhoria baseadas na análise de risco</CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations && recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((rec: any, index: number) => (
              <div key={rec.id || index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <h4 className="font-medium">{rec.title}</h4>
                    </div>
                    <FormattedTextDisplay
                      content={rec.description}
                      variant="compact"
                      maxLines={3}
                      className="mb-3"
                    />
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[rec.priority] || "bg-gray-100"}>
                        {priorityLabels[rec.priority] || rec.priority}
                      </Badge>
                      <Badge variant="outline">{rec.status}</Badge>
                      {rec.riskLevel && (
                        <Badge variant="secondary">Risco: {rec.riskLevel}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhuma recomendação adicional no momento.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente para a tab de Documentos GED
function DocumentosGedTab({ rotId, organizationId }: { rotId: number; organizationId: number }) {
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<"rot" | "pop" | "ropa" | "evidence">("rot");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);

  const { data: linkedDocs, isLoading, refetch } = trpc.rot.getLinkedDocuments.useQuery(
    { rotId },
    { enabled: !!rotId }
  );

  const { data: docCounts } = trpc.rot.countDocumentsByType.useQuery(
    { rotId },
    { enabled: !!rotId }
  );

  const { data: versionHistory } = trpc.rot.getDocumentVersionHistory.useQuery(
    { rotId, documentType: selectedDocType },
    { enabled: showVersionHistory }
  );

  const { data: comparisonResult } = trpc.rot.compareVersions.useQuery(
    { versionId1: selectedVersions[0], versionId2: selectedVersions[1] },
    { enabled: compareMode && selectedVersions.length === 2 }
  );

  const generateAndSaveMutation = trpc.rot.generateAndSaveToGed.useMutation({
    onSuccess: () => {
      toast.success("Documento ROT salvo no GED com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar no GED: ${error.message}`);
    },
  });

  const generatePOPMutation = trpc.rot.generatePOPAndSaveToGed.useMutation({
    onSuccess: () => {
      toast.success("POP gerado e salvo no GED com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao gerar POP: ${error.message}`);
    },
  });

  const documentTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    rot: { label: "ROT", icon: <FileText className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
    pop: { label: "POP", icon: <FileCheck className="h-4 w-4" />, color: "bg-green-100 text-green-800" },
    ropa: { label: "ROPA", icon: <Database className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-800" },
    evidence: { label: "Evidência", icon: <FolderOpen className="h-4 w-4" />, color: "bg-purple-100 text-purple-800" },
  };

  const handleGenerateAndSave = () => {
    generateAndSaveMutation.mutate({ rotId, organizationId });
  };

  const handleGeneratePOP = () => {
    generatePOPMutation.mutate({ rotId, organizationId });
  };

  const handleVersionSelect = (versionId: number) => {
    if (compareMode) {
      if (selectedVersions.includes(versionId)) {
        setSelectedVersions(selectedVersions.filter(v => v !== versionId));
      } else if (selectedVersions.length < 2) {
        setSelectedVersions([...selectedVersions, versionId]);
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando documentos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo de Documentos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(documentTypeLabels).map(([type, config]) => (
          <Card key={type}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  {config.icon}
                </div>
                <div>
                  <p className="body-small">{config.label}</p>
                  <p className="text-2xl font-bold">{docCounts?.[type as keyof typeof docCounts] || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Documentos Vinculados ao GED
              </CardTitle>
              <CardDescription>
                Documentos gerados automaticamente e armazenados no sistema de Gestão Eletrônica de Documentos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleGenerateAndSave}
                disabled={generateAndSaveMutation.isPending}
                className="gap-2"
              >
                {generateAndSaveMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Gerar ROT
              </Button>
              <Button 
                onClick={handleGeneratePOP}
                disabled={generatePOPMutation.isPending}
                variant="outline"
                className="gap-2"
              >
                {generatePOPMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4" />
                )}
                Gerar POP
              </Button>
              <Button 
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                variant="ghost"
                className="gap-2"
              >
                <History className="h-4 w-4" />
                Histórico
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {linkedDocs && linkedDocs.length > 0 ? (
            <div className="space-y-3">
              {linkedDocs.map((doc) => {
                const typeConfig = documentTypeLabels[doc.documentType] || documentTypeLabels.rot;
                return (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                        {typeConfig.icon}
                      </div>
                      <div>
                        <p className="font-medium">{doc.gedDocument?.name || `Documento ${doc.documentType.toUpperCase()}`}</p>
                        <div className="flex items-center gap-2 body-small">
                          <Badge variant="outline" className="text-xs">
                            v{doc.version}
                          </Badge>
                          <span>•</span>
                          <span>{new Date(doc.generatedAt).toLocaleString("pt-BR")}</span>
                          {doc.isLatest && (
                            <>
                              <span>•</span>
                              <Badge className="bg-green-100 text-green-800 text-xs">Mais recente</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.gedDocument?.fileUrl && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(doc.gedDocument?.fileUrl, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir
                        </Button>
                      )}
                      <Link href={`/ged-cliente?documentId=${doc.gedDocumentId}`}>
                        <Button variant="ghost" size="sm">
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Ver no GED
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Nenhum documento vinculado
              </p>
              <p className="body-small mb-4">
                Clique no botão acima para gerar e salvar o documento ROT no GED automaticamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Versões */}
      {showVersionHistory && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Versões
                </CardTitle>
                <CardDescription>
                  Visualize e compare diferentes versões dos documentos
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select 
                  value={selectedDocType} 
                  onValueChange={(v: "rot" | "pop" | "ropa" | "evidence") => {
                    setSelectedDocType(v);
                    setSelectedVersions([]);
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rot">ROT</SelectItem>
                    <SelectItem value="pop">POP</SelectItem>
                    <SelectItem value="ropa">ROPA</SelectItem>
                    <SelectItem value="evidence">Evidências</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={compareMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCompareMode(!compareMode);
                    setSelectedVersions([]);
                  }}
                  className="gap-2"
                >
                  <GitCompare className="h-4 w-4" />
                  {compareMode ? "Cancelar" : "Comparar"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {versionHistory && versionHistory.length > 0 ? (
              <div className="space-y-3">
                {compareMode && selectedVersions.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg mb-4">
                    <p className="text-sm text-blue-800">
                      Selecione {2 - selectedVersions.length} vers{selectedVersions.length === 1 ? "ão" : "ões"} para comparar
                    </p>
                  </div>
                )}
                {versionHistory.map((version) => (
                  <div 
                    key={version.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors cursor-pointer ${
                      selectedVersions.includes(version.id) 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleVersionSelect(version.id)}
                  >
                    <div className="flex items-center gap-4">
                      {compareMode && (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedVersions.includes(version.id) 
                            ? "border-primary bg-primary text-primary-foreground" 
                            : "border-muted-foreground"
                        }`}>
                          {selectedVersions.includes(version.id) && (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Versão {version.version}</p>
                          {version.isLatest && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Atual</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 body-small">
                          <span>{new Date(version.generatedAt).toLocaleString("pt-BR")}</span>
                          {version.generatedByName && (
                            <>
                              <span>•</span>
                              <span>por {version.generatedByName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {!compareMode && version.gedDocument?.fileUrl && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(version.gedDocument?.fileUrl, "_blank");
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir
                      </Button>
                    )}
                  </div>
                ))}

                {/* Resultado da Comparação */}
                {compareMode && comparisonResult && (
                  <Card className="mt-4 border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg">Resultado da Comparação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">+{comparisonResult.differences.added}</p>
                          <p className="text-sm text-green-700">Linhas adicionadas</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">-{comparisonResult.differences.removed}</p>
                          <p className="text-sm text-red-700">Linhas removidas</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-2xl font-bold text-gray-600">{comparisonResult.differences.unchanged}</p>
                          <p className="text-sm text-gray-700">Linhas inalteradas</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(comparisonResult.version1.metadata.gedDocument?.fileUrl, "_blank")}
                        >
                          Ver v{comparisonResult.version1.metadata.version}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(comparisonResult.version2.metadata.gedDocument?.fileUrl, "_blank")}
                        >
                          Ver v{comparisonResult.version2.metadata.version}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma versão encontrada para este tipo de documento</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informações sobre a pasta no GED */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FolderOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">Localização no GED</p>
              <p className="body-small">
                Os documentos são salvos automaticamente na pasta <strong>Mapeamentos LGPD</strong> do GED da organização,
                organizados por tipo (ROT, POP, ROPA, Evidências) com versionamento automático.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// Componente para a tab de Contratos Vinculados (integração reversa)
function ContratosVinculadosTab({ responseId }: { responseId: number }) {
  const { data: linkedContracts, isLoading } = trpc.mapeamento.getLinkedContracts.useQuery(
    { responseId },
    { enabled: !!responseId }
  );
  
  const statusColors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-800",
    analyzing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };
  
  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    analyzing: "Em Análise",
    completed: "Concluída",
    error: "Erro",
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando contratos vinculados...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Scale className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>Contratos Vinculados</CardTitle>
            <CardDescription>
              Contratos que geraram informações para este mapeamento de dados
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {linkedContracts && linkedContracts.length > 0 ? (
          <div className="space-y-4">
            {linkedContracts.map((contract: any) => (
              <div 
                key={contract.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{contract.contractName}</p>
                      <Badge className={statusColors[contract.analysisStatus] || statusColors.pending}>
                        {statusLabels[contract.analysisStatus] || "Pendente"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 body-small mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {contract.partnerName}
                      </span>
                      <span>•</span>
                      <span>{contract.contractType}</span>
                      <span>•</span>
                      <span>Progresso: {contract.progress}%</span>
                    </div>
                    {contract.extractedData && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {contract.extractedData.dataCategories?.slice(0, 3).map((cat: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {cat.name}
                          </Badge>
                        ))}
                        {contract.extractedData.dataCategories?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{contract.extractedData.dataCategories.length - 3} mais
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/analise-contratos/${contract.contractAnalysisId}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ver Análise
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            
            {/* Informativo sobre a integração */}
            <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="flex items-start gap-3">
                <Link2 className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-medium text-indigo-900">Integração Automática</p>
                  <p className="text-sm text-indigo-700 mt-1">
                    As informações deste mapeamento foram extraídas automaticamente dos contratos listados acima.
                    Ao clicar em "Ver Análise", você pode acessar os detalhes completos de cada contrato.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Nenhum contrato vinculado</p>
            <p className="text-sm mt-1">
              Este mapeamento não foi gerado a partir de análises de contratos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


const eventTypeLabels: Record<string, string> = {
  respondent_created: "Responsável cadastrado",
  invite_sent: "Convite enviado",
  token_opened: "Entrevista aberta",
  response_saved: "Resposta salva",
  finalized: "Entrevista finalizada",
  reassigned: "Processo reatribuído",
};

const eventTypeColors: Record<string, string> = {
  respondent_created: "bg-blue-100 text-blue-800 border-blue-200",
  invite_sent: "bg-indigo-100 text-indigo-800 border-indigo-200",
  token_opened: "bg-yellow-100 text-yellow-800 border-yellow-200",
  response_saved: "bg-green-100 text-green-800 border-green-200",
  finalized: "bg-emerald-100 text-emerald-800 border-emerald-200",
  reassigned: "bg-orange-100 text-orange-800 border-orange-200",
};

const eventTypeIcons: Record<string, any> = {
  respondent_created: Users,
  invite_sent: Bell,
  token_opened: Eye,
  response_saved: Save,
  finalized: CheckCircle2,
  reassigned: RefreshCw,
};

function TimelineTab({ organizationId }: { organizationId: number }) {
  const { data, isLoading } = trpc.mapeamento.listTimeline.useQuery(
    { organizationId, limit: 100 },
    { enabled: !!organizationId }
  );

  const events = data?.events || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-3 animate-spin opacity-50" />
          <p>Carregando linha do tempo...</p>
        </CardContent>
      </Card>
    );
  }

  if (!events.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Nenhum evento registrado</p>
          <p className="text-sm mt-1">
            Os eventos serão registrados automaticamente conforme o mapeamento avança.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Linha do Tempo do Mapeamento
        </CardTitle>
        <CardDescription>
          Registro cronológico de todas as ações realizadas neste mapeamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {events.map((ev: any, idx: number) => {
              const IconComp = eventTypeIcons[ev.eventType] || Clock;
              const colorClass = eventTypeColors[ev.eventType] || "bg-gray-100 text-gray-800 border-gray-200";
              const label = eventTypeLabels[ev.eventType] || ev.eventType;
              const meta = typeof ev.metadata === "string" ? (() => { try { return JSON.parse(ev.metadata); } catch { return null; } })() : ev.metadata;

              return (
                <div key={ev.id || idx} className="relative pl-12">
                  {/* Ícone no eixo */}
                  <div className={`absolute left-2 top-1 w-7 h-7 rounded-full flex items-center justify-center border ${colorClass}`}>
                    <IconComp className="h-3.5 w-3.5" />
                  </div>

                  <div className="p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{ev.title || label}</span>
                          <Badge variant="outline" className="text-xs">{label}</Badge>
                        </div>
                        {ev.message && (
                          <p className="text-sm text-muted-foreground mt-1 font-extralight">{ev.message}</p>
                        )}
                        {meta && ev.eventType === "reassigned" && meta.old && (
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                            <span>De: {meta.old.email}</span>
                            <ChevronRight className="inline h-3 w-3 mx-1" />
                            <span>Para: {meta.new?.email}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {ev.createdAt ? new Date(ev.createdAt).toLocaleString("pt-BR") : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// ==================== ABA DE COBERTURA ====================

function CoverageTab({ organizationId }: { organizationId: number }) {
  const { data: coverage, isLoading } = trpc.mapeamento.getCoverageSummary.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground font-light">Carregando estatísticas de cobertura...</p>
        </CardContent>
      </Card>
    );
  }

  if (!coverage) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground font-light">Nenhum dado de cobertura disponível.</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, areasCoverage, legalBaseDistribution, riskDistribution, topPurposes, rotsByStatus } = coverage;

  const riskColors: Record<string, string> = {
    baixa: "bg-green-500",
    media: "bg-yellow-500",
    alta: "bg-orange-500",
    extrema: "bg-red-500",
  };

  const riskLabelsMap: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    extrema: "Extrema",
  };

  const statusLabelsMap: Record<string, string> = {
    rascunho: "Rascunho",
    em_revisao: "Em revisão",
    aprovado: "Aprovado",
    arquivado: "Arquivado",
  };

  const statusColorsMap: Record<string, string> = {
    rascunho: "bg-gray-400",
    em_revisao: "bg-yellow-500",
    aprovado: "bg-green-500",
    arquivado: "bg-blue-400",
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{summary.overallCoverage}%</p>
                <p className="text-xs text-muted-foreground font-light">Cobertura geral</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{summary.totalDataCategories}</p>
                <p className="text-xs text-muted-foreground font-light">Categorias de dados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{summary.validatedDataUses}/{summary.totalDataUses}</p>
                <p className="text-xs text-muted-foreground font-light">Finalidades validadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{summary.totalRots}</p>
                <p className="text-xs text-muted-foreground font-light">ROTs gerados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cobertura por área */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Cobertura por Área
          </CardTitle>
          <CardDescription className="font-light">
            Percentual de processos com entrevista concluída em cada área.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {areasCoverage.length === 0 ? (
            <p className="text-muted-foreground text-sm font-light">Nenhuma área cadastrada.</p>
          ) : (
            <div className="space-y-4">
              {areasCoverage.map((area: any) => (
                <div key={area.areaId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{area.areaName}</span>
                    <span className="text-muted-foreground font-light">
                      {area.completedInterviews}/{area.totalProcesses} processos ({area.coveragePercent}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${area.coveragePercent}%`,
                        backgroundColor: area.coveragePercent === 100 ? '#22c55e' : area.coveragePercent >= 50 ? '#eab308' : '#ef4444',
                      }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground font-extralight">
                    <span>{area.respondentsCompleted}/{area.respondentsCount} respondentes</span>
                    <span>{area.rotsGenerated} ROTs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid com distribuições */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Distribuição de bases legais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="h-5 w-5" />
              Bases Legais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {legalBaseDistribution.length === 0 ? (
              <p className="text-muted-foreground text-sm font-light">Nenhuma base legal identificada.</p>
            ) : (
              <div className="space-y-3">
                {legalBaseDistribution.map((lb: any) => {
                  const maxCount = Math.max(...legalBaseDistribution.map((l: any) => l.count));
                  const pct = maxCount > 0 ? Math.round((lb.count / maxCount) * 100) : 0;
                  return (
                    <div key={lb.code} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-light">{lb.label}</span>
                        <Badge variant="outline" className="text-xs">{lb.count}</Badge>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de risco */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5" />
              Distribuição de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(riskDistribution).map(([level, count]) => {
                const total = Object.values(riskDistribution).reduce((a: number, b: number) => a + b, 0);
                const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                return (
                  <div key={level} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${riskColors[level] || 'bg-gray-400'}`} />
                        <span className="font-light">{riskLabelsMap[level] || level}</span>
                      </div>
                      <span className="text-muted-foreground font-light">{count as number} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${riskColors[level] || 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid com finalidades e status ROT */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top finalidades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Finalidades Mais Frequentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPurposes.length === 0 ? (
              <p className="text-muted-foreground text-sm font-light">Nenhuma finalidade mapeada.</p>
            ) : (
              <div className="space-y-2">
                {topPurposes.map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <span className="text-sm font-light truncate max-w-[70%]">{p.label}</span>
                    <Badge variant="secondary" className="text-xs">{p.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status dos ROTs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck className="h-5 w-5" />
              Status dos ROTs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(rotsByStatus).map(([status, count]) => {
                const total = Object.values(rotsByStatus).reduce((a: number, b: number) => a + b, 0);
                const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusColorsMap[status] || 'bg-gray-400'}`} />
                        <span className="font-light">{statusLabelsMap[status] || status}</span>
                      </div>
                      <span className="text-muted-foreground font-light">{count as number} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${statusColorsMap[status] || 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
