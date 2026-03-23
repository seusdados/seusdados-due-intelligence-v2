/**
 * SeusdadosAvaliacao.tsx
 * Página principal do Framework SeusDados - Maturidade LGPD
 * 
 * Funcionalidades:
 * - Listar avaliações existentes
 * - Criar nova avaliação
 * - Acessar avaliação para responder
 * - Visualizar resultados e relatórios
 */

import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  FileText, 
  BarChart3, 
  ClipboardList, 
  Trash2, 
  Play, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  Brain,
  Building2,
  Server,
  Lock
} from "lucide-react";
import { toast } from "sonner";

// Ícones por domínio
const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  'CULTURA_ORGANIZACIONAL': <Building2 className="h-5 w-5" />,
  'PROCESSOS_DE_NEGOCIO': <ClipboardList className="h-5 w-5" />,
  'GOVERNANCA_DE_TI': <Server className="h-5 w-5" />,
  'SEGURANCA_DA_INFORMACAO': <Lock className="h-5 w-5" />,
  'INTELIGENCIA_ARTIFICIAL': <Brain className="h-5 w-5" />
};

// Cores por nível de maturidade
const MATURITY_COLORS: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-blue-500',
  5: 'bg-green-500'
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  'rascunho': { label: 'Rascunho', variant: 'secondary' },
  'em_andamento': { label: 'Em Andamento', variant: 'default' },
  'concluida': { label: 'Concluída', variant: 'outline' },
  'arquivada': { label: 'Arquivada', variant: 'destructive' }
};

export default function SeusdadosAvaliacao() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAssessmentTitle, setNewAssessmentTitle] = useState("");
  const [activeTab, setActiveTab] = useState("assessments");

  // Queries
  const { data: assessments, isLoading: isLoadingAssessments, refetch: refetchAssessments } = trpc.seusdados.list.useQuery(
    { organizationId: selectedOrganization?.id || 0 },
    { enabled: !!selectedOrganization?.id }
  );

  const { data: frameworkData } = trpc.seusdados.getFrameworkData.useQuery();

  // Mutations
  const createMutation = trpc.seusdados.create.useMutation({
    onSuccess: (data) => {
      toast.success("Avaliação criada com sucesso! O Sponsor será notificado para realizar a vinculação de domínios.");
      setIsCreateDialogOpen(false);
      setNewAssessmentTitle("");
      refetchAssessments();
      // Não redirecionar - deixar que o Sponsor seja notificado e realize a vinculação
    },
    onError: (error) => {
      toast.error(`Erro ao criar avaliação: ${error.message}`);
    }
  });

  const deleteMutation = trpc.seusdados.delete.useMutation({
    onSuccess: () => {
      toast.success("Avaliação excluída com sucesso!");
      refetchAssessments();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir avaliação: ${error.message}`);
    }
  });

  const seedMutation = trpc.seusdados.seedFramework.useMutation({
    onSuccess: (data) => {
      toast.success(`Framework populado: ${data.domains} domínios, ${data.questions} perguntas, ${data.options} opções`);
    },
    onError: (error) => {
      toast.error(`Erro ao popular framework: ${error.message}`);
    }
  });

  const handleCreateAssessment = () => {
    if (!selectedOrganization?.id) {
      toast.error("Selecione uma organização primeiro");
      return;
    }
    if (!newAssessmentTitle.trim()) {
      toast.error("Digite um título para a avaliação");
      return;
    }
    createMutation.mutate({
      organizationId: selectedOrganization.id,
      title: newAssessmentTitle.trim()
    });
  };

  const handleDeleteAssessment = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate({ id });
    }
  };

  const getProgressPercentage = (answered: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((answered / total) * 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="assessments">
              <ClipboardList className="h-4 w-4 mr-2" />
              Avaliações
            </TabsTrigger>
            <TabsTrigger value="framework">
              <FileText className="h-4 w-4 mr-2" />
              Framework
            </TabsTrigger>
          </TabsList>

          {/* Lista de Avaliações */}
          <TabsContent value="assessments" className="space-y-4">
            {/* Header - Movido para dentro da aba */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  Framework SeusDados
                </h1>
                <p className="text-muted-foreground">
                  Avaliação de Maturidade em Privacidade, Segurança e IA
                </p>
              </div>
              <div className="flex gap-2">
                {user?.role === 'admin_global' && (
                  <Button 
                    variant="outline" 
                    onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                  >
                    {seedMutation.isPending ? "Populando..." : "Popular Framework"}
                  </Button>
                )}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Avaliação
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Avaliação de Maturidade</DialogTitle>
                      <DialogDescription>
                        Crie uma nova avaliação usando o Framework SeusDados com 39 perguntas em 5 domínios.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Título da Avaliação</Label>
                        <Input
                          id="title"
                          placeholder="Ex: Avaliação de Maturidade LGPD 2026"
                          value={newAssessmentTitle}
                          onChange={(e) => setNewAssessmentTitle(e.target.value)}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Organização:</strong> {selectedOrganization?.name || "Nenhuma selecionada"}</p>
                        <p><strong>Domínios:</strong> {frameworkData?.domains.length || 5}</p>
                        <p><strong>Perguntas:</strong> {frameworkData?.totalQuestions || 39}</p>
                        <p><strong>Níveis de Maturidade:</strong> 5 (Não Iniciado → Otimizado)</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleCreateAssessment}
                        disabled={createMutation.isPending || !newAssessmentTitle.trim()}
                      >
                        {createMutation.isPending ? "Criando..." : "Criar Avaliação"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {isLoadingAssessments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : assessments && assessments.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {assessments.map((assessment) => (
                  <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg line-clamp-2">{assessment.title}</CardTitle>
                        <Badge variant={STATUS_BADGES[assessment.status]?.variant || 'secondary'}>
                          {STATUS_BADGES[assessment.status]?.label || assessment.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Criada em {new Date(assessment.createdAt).toLocaleDateString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progresso */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">
                            {assessment.answeredQuestions}/{assessment.totalQuestions} perguntas
                          </span>
                        </div>
                        <Progress 
                          value={getProgressPercentage(assessment.answeredQuestions || 0, assessment.totalQuestions || 39)} 
                        />
                      </div>

                      {/* Score */}
                      {assessment.overallLevelRounded && (
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${MATURITY_COLORS[assessment.overallLevelRounded]}`} />
                          <span className="text-sm font-medium">
                            {assessment.maturityLevelLabel}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            (Média: {Number(assessment.overallScoreAvg).toFixed(2)})
                          </span>
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => navigate(`/seusdados/avaliacao/${assessment.id}`)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Continuar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAssessment(assessment.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma avaliação encontrada</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Crie sua primeira avaliação de maturidade usando o Framework SeusDados.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Avaliação
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Informações do Framework */}
          <TabsContent value="framework" className="space-y-4">
            {/* Níveis de Maturidade */}
            <Card>
              <CardHeader>
                <CardTitle>Níveis de Maturidade</CardTitle>
                <CardDescription>
                  O framework utiliza 5 níveis de maturidade para avaliar cada controle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-5">
                  {frameworkData?.maturityLevels.map((level) => (
                    <div 
                      key={level.level} 
                      className="flex items-center gap-2 p-3 rounded-lg border"
                    >
                      <div className={`w-4 h-4 rounded-full ${MATURITY_COLORS[level.level]}`} />
                      <div>
                        <p className="font-medium text-sm">{level.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Domínios */}
            <Card>
              <CardHeader>
                <CardTitle>Domínios de Avaliação</CardTitle>
                <CardDescription>
                  O framework abrange 5 domínios com {frameworkData?.totalQuestions || 39} perguntas no total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {frameworkData?.domains.map((domain) => (
                    <div 
                      key={domain.id} 
                      className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {DOMAIN_ICONS[domain.code] || <Shield className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="font-medium">{domain.label}</h4>
                        <p className="text-sm text-muted-foreground">
                          {domain.questions.length} perguntas
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Frameworks Mapeados */}
            <Card>
              <CardHeader>
                <CardTitle>Frameworks e Normas Mapeados</CardTitle>
                <CardDescription>
                  Cada pergunta está mapeada para frameworks e normas de referência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg border text-center">
                    <h4 className="font-bold text-lg">ISO</h4>
                    <p className="text-sm text-muted-foreground">27001, 27002, 27701, 42001</p>
                  </div>
                  <div className="p-4 rounded-lg border text-center">
                    <h4 className="font-bold text-lg">NIST</h4>
                    <p className="text-sm text-muted-foreground">Privacy Framework</p>
                  </div>
                  <div className="p-4 rounded-lg border text-center">
                    <h4 className="font-bold text-lg">LGPD</h4>
                    <p className="text-sm text-muted-foreground">Lei Geral de Proteção de Dados</p>
                  </div>
                  <div className="p-4 rounded-lg border text-center">
                    <h4 className="font-bold text-lg">GDPR</h4>
                    <p className="text-sm text-muted-foreground">General Data Protection Regulation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
