/**
 * SeusdadosAvaliacaoExecucao.tsx
 * Página de execução da avaliação do Framework SeusDados
 * 
 * Funcionalidades:
 * - Navegação por domínios
 * - Responder perguntas com 5 níveis
 * - Salvar respostas automaticamente
 * - Visualizar progresso
 * - Ver resultados e relatórios
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import MainLayout from "@/components/MainLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  FileText,
  ClipboardList,
  Shield,
  Brain,
  Building2,
  Server,
  Lock,
  ChevronLeft,
  ChevronRight,
  Download
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

const MATURITY_TEXT_COLORS: Record<number, string> = {
  1: 'text-red-600',
  2: 'text-orange-600',
  3: 'text-yellow-600',
  4: 'text-blue-600',
  5: 'text-green-600'
};

export default function SeusdadosAvaliacaoExecucao() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const assessmentId = parseInt(id || "0");

  const [activeTab, setActiveTab] = useState("questionnaire");
  const [activeDomainIndex, setActiveDomainIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState<{
    selectedOptionCode: string;
    selectedLevel: number;
    observations: string;
  } | null>(null);

  // Queries
  const { data: assessment, isLoading: isLoadingAssessment, refetch: refetchAssessment } = trpc.seusdados.get.useQuery(
    { id: assessmentId },
    { enabled: assessmentId > 0 }
  );

  const { data: frameworkData } = trpc.seusdados.getFrameworkData.useQuery();
  
  const { data: executiveReport, refetch: refetchExecutiveReport } = trpc.seusdados.getExecutiveReport.useQuery(
    { assessmentId },
    { enabled: assessmentId > 0 && activeTab === 'results' }
  );

  const { data: technicalReport, refetch: refetchTechnicalReport } = trpc.seusdados.getTechnicalReport.useQuery(
    { assessmentId },
    { enabled: assessmentId > 0 && activeTab === 'results' }
  );

  const { data: actionPlan, refetch: refetchActionPlan } = trpc.seusdados.getActionPlan.useQuery(
    { assessmentId },
    { enabled: assessmentId > 0 && activeTab === 'results' }
  );

  // Mutations
  const saveAnswerMutation = trpc.seusdados.saveAnswer.useMutation({
    onSuccess: () => {
      toast.success("Resposta salva!");
      refetchAssessment();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  });

  const updateStatusMutation = trpc.seusdados.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      refetchAssessment();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  });

  // Dados do domínio e pergunta atual
  const currentDomain = frameworkData?.domains[activeDomainIndex];
  const currentQuestion = currentDomain?.questions[activeQuestionIndex];

  // Carregar resposta existente quando mudar de pergunta
  useEffect(() => {
    if (currentQuestion && assessment?.answers) {
      const existingAnswer = assessment.answers.find(
        a => a.questionCode === currentQuestion.id
      );
      if (existingAnswer) {
        setCurrentAnswer({
          selectedOptionCode: existingAnswer.selectedOptionCode,
          selectedLevel: existingAnswer.selectedLevel,
          observations: existingAnswer.observations || ""
        });
      } else {
        setCurrentAnswer(null);
      }
    }
  }, [currentQuestion, assessment?.answers]);

  const handleSelectOption = (optionCode: string, level: number) => {
    setCurrentAnswer(prev => ({
      selectedOptionCode: optionCode,
      selectedLevel: level,
      observations: prev?.observations || ""
    }));
  };

  const handleSaveAnswer = () => {
    if (!currentQuestion || !currentAnswer) return;

    saveAnswerMutation.mutate({
      assessmentId,
      questionCode: currentQuestion.id,
      selectedOptionCode: currentAnswer.selectedOptionCode,
      selectedLevel: currentAnswer.selectedLevel,
      observations: currentAnswer.observations || undefined
    });
  };

  const handleNextQuestion = () => {
    if (!frameworkData) return;

    // Salvar resposta atual se houver
    if (currentAnswer) {
      handleSaveAnswer();
    }

    // Próxima pergunta no domínio atual
    if (currentDomain && activeQuestionIndex < currentDomain.questions.length - 1) {
      setActiveQuestionIndex(prev => prev + 1);
    } 
    // Próximo domínio
    else if (activeDomainIndex < frameworkData.domains.length - 1) {
      setActiveDomainIndex(prev => prev + 1);
      setActiveQuestionIndex(0);
    }
  };

  const handlePrevQuestion = () => {
    // Pergunta anterior no domínio atual
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex(prev => prev - 1);
    }
    // Domínio anterior
    else if (activeDomainIndex > 0) {
      setActiveDomainIndex(prev => prev - 1);
      const prevDomain = frameworkData?.domains[activeDomainIndex - 1];
      setActiveQuestionIndex(prevDomain ? prevDomain.questions.length - 1 : 0);
    }
  };

  const handleFinishAssessment = () => {
    if (confirm("Deseja finalizar a avaliação? Você ainda poderá editar as respostas depois.")) {
      updateStatusMutation.mutate({ id: assessmentId, status: 'concluida' });
      setActiveTab('results');
    }
  };

  const getProgressPercentage = () => {
    if (!assessment) return 0;
    const total = assessment.totalQuestions || 39;
    const answered = assessment.answeredQuestions || 0;
    return Math.round((answered / total) * 100);
  };

  const isQuestionAnswered = (questionCode: string) => {
    return assessment?.answers?.some(a => a.questionCode === questionCode);
  };

  const getDomainProgress = (domainCode: string) => {
    if (!frameworkData || !assessment?.answers) return { answered: 0, total: 0 };
    const domain = frameworkData.domains.find(d => d.code === domainCode);
    if (!domain) return { answered: 0, total: 0 };
    
    const answered = domain.questions.filter(q => 
      assessment.answers.some(a => a.questionCode === q.id)
    ).length;
    
    return { answered, total: domain.questions.length };
  };

  if (isLoadingAssessment || !frameworkData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!assessment) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Avaliação não encontrada</h2>
          <Button onClick={() => navigate('/seusdados')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header removido - já renderizado por NavMain */}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="questionnaire">
              <ClipboardList className="h-4 w-4 mr-2" />
              Questionário
            </TabsTrigger>
            <TabsTrigger value="results">
              <BarChart3 className="h-4 w-4 mr-2" />
              Resultados
            </TabsTrigger>
          </TabsList>

          {/* Questionário */}
          <TabsContent value="questionnaire" className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              {/* Sidebar - Navegação por Domínios */}
              <div className="col-span-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Domínios</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ScrollArea className="h-[500px]">
                      {frameworkData.domains.map((domain, domainIdx) => {
                        const progress = getDomainProgress(domain.code);
                        const isActive = domainIdx === activeDomainIndex;
                        
                        return (
                          <div key={domain.id} className="mb-2">
                            <button
                              onClick={() => {
                                setActiveDomainIndex(domainIdx);
                                setActiveQuestionIndex(0);
                              }}
                              className={`w-full text-left p-2 rounded-lg transition-colors ${
                                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {DOMAIN_ICONS[domain.code]}
                                <span className="text-sm font-medium truncate">{domain.label}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress 
                                  value={(progress.answered / progress.total) * 100} 
                                  className="h-1 flex-1"
                                />
                                <span className="text-xs">
                                  {progress.answered}/{progress.total}
                                </span>
                              </div>
                            </button>
                            
                            {/* Lista de perguntas do domínio ativo */}
                            {isActive && (
                              <div className="ml-4 mt-1 space-y-1">
                                {domain.questions.map((q, qIdx) => {
                                  const isAnswered = isQuestionAnswered(q.id);
                                  const isCurrentQuestion = qIdx === activeQuestionIndex;
                                  
                                  return (
                                    <button
                                      key={q.id}
                                      onClick={() => setActiveQuestionIndex(qIdx)}
                                      className={`w-full text-left p-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                                        isCurrentQuestion 
                                          ? 'bg-primary/20 font-medium' 
                                          : 'hover:bg-muted/50'
                                      }`}
                                    >
                                      {isAnswered ? (
                                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                      ) : (
                                        <div className="h-3 w-3 rounded-full border flex-shrink-0" />
                                      )}
                                      <span className="truncate">{q.id}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Área Principal - Pergunta Atual */}
              <div className="col-span-9">
                {currentQuestion && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{currentQuestion.id}</Badge>
                          <div className="flex gap-1">
                            {currentQuestion.frameworkTags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handlePrevQuestion}
                            disabled={activeDomainIndex === 0 && activeQuestionIndex === 0}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {activeQuestionIndex + 1}/{currentDomain?.questions.length}
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleNextQuestion}
                            disabled={
                              activeDomainIndex === frameworkData.domains.length - 1 && 
                              activeQuestionIndex === (currentDomain?.questions.length || 1) - 1
                            }
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg mt-4">
                        {currentQuestion.prompt}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Opções de Resposta */}
                      <RadioGroup
                        value={currentAnswer?.selectedOptionCode || ""}
                        onValueChange={(value) => {
                          const option = currentQuestion.options.find(o => o.id === value);
                          if (option) {
                            handleSelectOption(option.id, option.level);
                          }
                        }}
                      >
                        {currentQuestion.options.map((option) => (
                          <div 
                            key={option.id}
                            className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                              currentAnswer?.selectedOptionCode === option.id 
                                ? 'border-primary bg-primary/5' 
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor={option.id} className="cursor-pointer">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-3 h-3 rounded-full ${MATURITY_COLORS[option.level]}`} />
                                  <span className={`font-medium ${MATURITY_TEXT_COLORS[option.level]}`}>
                                    Nível {option.level}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{option.text}</p>
                              </Label>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>

                      {/* Observações */}
                      <div className="space-y-2">
                        <Label htmlFor="observations">Observações (opcional)</Label>
                        <Textarea
                          id="observations"
                          placeholder="Adicione observações ou justificativas para esta resposta..."
                          value={currentAnswer?.observations || ""}
                          onChange={(e) => setCurrentAnswer(prev => ({
                            selectedOptionCode: prev?.selectedOptionCode || "",
                            selectedLevel: prev?.selectedLevel || 0,
                            observations: e.target.value
                          }))}
                          rows={3}
                        />
                      </div>

                      {/* Ações */}
                      <div className="flex justify-between pt-4">
                        <Button 
                          variant="outline"
                          onClick={handleSaveAnswer}
                          disabled={!currentAnswer?.selectedOptionCode || saveAnswerMutation.isPending}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saveAnswerMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button 
                          onClick={handleNextQuestion}
                          disabled={
                            !currentAnswer?.selectedOptionCode || 
                            (activeDomainIndex === frameworkData.domains.length - 1 && 
                            activeQuestionIndex === (currentDomain?.questions.length || 1) - 1)
                          }
                        >
                          Próxima
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Resultados */}
          <TabsContent value="results" className="space-y-4">
            {/* Score Geral */}
            <Card>
              <CardHeader>
                <CardTitle>Resultado Geral</CardTitle>
                <CardDescription>
                  Nível de maturidade consolidado da avaliação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold ${
                      MATURITY_COLORS[executiveReport?.overallMaturity.levelRounded || 1]
                    }`}>
                      {executiveReport?.overallMaturity.levelRounded || "-"}
                    </div>
                    <p className="mt-2 font-medium">{executiveReport?.overallMaturity.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Média: {executiveReport?.overallMaturity.scoreAvg?.toFixed(2) || "-"}
                    </p>
                  </div>
                  <div className="flex-1 grid grid-cols-5 gap-2">
                    {frameworkData.maturityLevels.map(level => (
                      <div 
                        key={level.level}
                        className={`p-3 rounded-lg text-center ${
                          executiveReport?.overallMaturity.levelRounded === level.level
                            ? `${MATURITY_COLORS[level.level]} text-white`
                            : 'bg-muted'
                        }`}
                      >
                        <p className="font-bold">{level.level}</p>
                        <p className="text-xs">{level.label.replace(`Nível ${level.level} - `, '')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scores por Domínio */}
            <Card>
              <CardHeader>
                <CardTitle>Resultados por Domínio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {executiveReport?.domainSummary.map(domain => (
                    <div key={domain.domainCode} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {DOMAIN_ICONS[domain.domainCode]}
                          <span className="font-medium">{domain.domainLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${MATURITY_COLORS[domain.levelRounded]}`} />
                          <span className="font-medium">{domain.levelLabel}</span>
                          <span className="text-sm text-muted-foreground">
                            ({domain.scoreAvg.toFixed(2)})
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={(domain.scoreAvg / 5) * 100} 
                        className="h-2"
                      />
                      {domain.topGaps.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <span className="text-destructive">Gaps:</span> {domain.topGaps.length} itens a melhorar
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Plano de Ação */}
            {actionPlan && actionPlan.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Plano de Ação Prioritário</CardTitle>
                  <CardDescription>
                    Ações recomendadas ordenadas por prioridade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {actionPlan.items.slice(0, 10).map((item, idx) => (
                      <div 
                        key={item.actionId}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        <Badge 
                          variant={
                            item.priority === 'P0' ? 'destructive' : 
                            item.priority === 'P1' ? 'default' : 'secondary'
                          }
                        >
                          {item.priority}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">{item.title}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Nível atual: {item.currentLevel}</span>
                            <span>Meta: {item.targetLevel}</span>
                            <span>Esforço: {item.effort}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Próximos 30/60/90 dias */}
            {executiveReport?.next30_60_90Days && (
              <Card>
                <CardHeader>
                  <CardTitle>Roadmap 30/60/90 Dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950">
                      <h4 className="font-bold text-red-600 mb-2">30 Dias (Urgente)</h4>
                      <ul className="space-y-1 text-sm">
                        {executiveReport.next30_60_90Days.d30.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                        {executiveReport.next30_60_90Days.d30.length === 0 && (
                          <li className="text-muted-foreground">Nenhuma ação urgente</li>
                        )}
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                      <h4 className="font-bold text-yellow-600 mb-2">60 Dias (Importante)</h4>
                      <ul className="space-y-1 text-sm">
                        {executiveReport.next30_60_90Days.d60.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                        {executiveReport.next30_60_90Days.d60.length === 0 && (
                          <li className="text-muted-foreground">Nenhuma ação neste período</li>
                        )}
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <h4 className="font-bold text-blue-600 mb-2">90 Dias (Planejado)</h4>
                      <ul className="space-y-1 text-sm">
                        {executiveReport.next30_60_90Days.d90.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                        {executiveReport.next30_60_90Days.d90.length === 0 && (
                          <li className="text-muted-foreground">Nenhuma ação neste período</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
