import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowLeft,
  FileText,
  Upload,
  HelpCircle,
  Paperclip
} from "lucide-react";
import { EvidenceUploadModal } from "@/components/assessments/EvidenceUploadModal";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SyncIndicator, useSyncStatus } from "@/components/SyncIndicator";
import { 
  DUE_DILIGENCE_FRAMEWORK, 
  DUE_DILIGENCE_SECTIONS,
  DD_QUESTION_OPTIONS,
  getDueDiligenceQuestionById,
  calculateDueDiligenceRiskScore
} from "@shared/frameworkDueDiligence";

const riskColors: Record<string, string> = {
  baixo: "bg-green-500",
  moderado: "bg-yellow-500",
  alto: "bg-orange-500",
  critico: "bg-red-500",
};

const riskLabels: Record<string, string> = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
};

export default function DueDiligenceAvaliacao() {
  const params = useParams<{ id: string }>();
  const assessmentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, { 
    level: number; 
    notes: string;
    evidenceUrl?: string;
  }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [uploadedEvidences, setUploadedEvidences] = useState<Record<string, { type: string; fileName?: string; fileUrl?: string }>>({});
  const syncStatus = useSyncStatus();

  const utils = trpc.useUtils();

  const { data: assessment, isLoading: loadingAssessment } = trpc.thirdPartyAssessment.getById.useQuery(
    { id: assessmentId },
    { enabled: !!assessmentId }
  );

  const { data: savedResponses, isLoading: loadingResponses } = trpc.thirdPartyAssessment.getResponses.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );

  const { data: thirdParty } = trpc.thirdParty.getById.useQuery(
    { id: assessment?.thirdPartyId || 0 },
    { enabled: !!assessment?.thirdPartyId }
  );

  const saveMutation = trpc.thirdPartyAssessment.saveResponse.useMutation();
  const updateMutation = trpc.thirdPartyAssessment.update.useMutation();

  // Auto-save hook
  const { status: autoSaveStatus, save: triggerAutoSave } = useAutoSave({
    debounceMs: 2000,
    onSave: async () => {
      if (!currentQuestion) return;
      
      const response = responses[currentQuestion.id];
      if (!response || response.level === 0) return;

      const option = currentQuestion.options.find(o => o.level === response.level);
      if (!option) return;

      await saveMutation.mutateAsync({
        assessmentId,
        questionId: currentQuestion.number,
        selectedLevel: response.level,
        impactScore: option.impact,
        probabilityScore: option.probability,
        riskScore: option.impact * option.probability,
        notes: response.notes,
      });
      
      utils.thirdPartyAssessment.getResponses.invalidate({ assessmentId });
    }
  });

  const questions = DUE_DILIGENCE_FRAMEWORK;
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Load saved responses
  useEffect(() => {
    if (savedResponses) {
      const loaded: Record<string, { level: number; notes: string; evidenceUrl?: string }> = {};
      savedResponses.forEach((r: any) => {
        // Map old questionId (number) to new format (DD-XX)
        const questionId = typeof r.questionId === 'number' 
          ? `DD-${String(r.questionId).padStart(2, '0')}`
          : r.questionId;
        loaded[questionId] = {
          level: r.selectedLevel || r.impactScore || 0,
          notes: r.notes || "",
          evidenceUrl: r.evidenceUrl
        };
      });
      setResponses(loaded);
    }
  }, [savedResponses]);

  const answeredQuestions = Object.keys(responses).filter(k => 
    responses[k]?.level > 0
  ).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const currentResponse = responses[currentQuestion?.id] || { level: 0, notes: "" };
  
  // Calculate current risk score
  const currentOption = currentQuestion?.options.find(o => o.level === currentResponse.level);
  const currentRiskScore = currentOption ? currentOption.impact * currentOption.probability : 0;

  const handleSelectOption = (level: number) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: { 
        ...prev[currentQuestion.id] || { notes: "" }, 
        level 
      }
    }));
    triggerAutoSave();
  };

  const handleNotesChange = (notes: string) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: { 
        ...prev[currentQuestion.id] || { level: 0 }, 
        notes 
      }
    }));
    triggerAutoSave();
  };

  const handleSaveResponse = async () => {
    if (!currentQuestion) return;
    
    const response = responses[currentQuestion.id];
    if (!response || response.level === 0) {
      toast.error("Selecione uma alternativa");
      return;
    }

    const option = currentQuestion.options.find(o => o.level === response.level);
    if (!option) return;

    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        assessmentId,
        questionId: currentQuestion.number, // Use number for DB compatibility
        selectedLevel: response.level,
        impactScore: option.impact,
        probabilityScore: option.probability,
        riskScore: option.impact * option.probability,
        notes: response.notes,
      });
      
      await updateMutation.mutateAsync({
        id: assessmentId,
        status: 'em_andamento',
        totalQuestions,
        answeredQuestions: Object.keys(responses).filter(k => responses[k]?.level > 0).length,
      });

      toast.success("Resposta salva!");
      utils.thirdPartyAssessment.getResponses.invalidate({ assessmentId });
    } catch (error) {
      toast.error("Erro ao salvar resposta");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentResponse.level > 0) {
      await handleSaveResponse();
    }
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    if (currentResponse.level > 0) {
      await handleSaveResponse();
    }
    
    // Calculate overall risk using the new framework
    const responseMap: Record<string, number> = {};
    Object.entries(responses).forEach(([questionId, response]) => {
      if (response.level > 0) {
        responseMap[questionId] = response.level;
      }
    });

    const riskResult = calculateDueDiligenceRiskScore(responseMap);

    try {
      await updateMutation.mutateAsync({
        id: assessmentId,
        status: 'concluida',
        totalQuestions,
        answeredQuestions: Object.keys(responseMap).length,
        overallRiskScore: Math.round(riskResult.totalScore),
        riskClassification: riskResult.riskLevel,
      });
      
      toast.success("Avaliação concluída!");
      setLocation(`/due-diligence/resultado/${assessmentId}`);
    } catch (error) {
      toast.error("Erro ao finalizar avaliação");
    }
  };

  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  if (loadingAssessment || loadingResponses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[400px] w-full" />
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

  // Get current section
  const currentSection = DUE_DILIGENCE_SECTIONS.find(s => s.id === currentQuestion?.sectionId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/due-diligence')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{assessment.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{thirdParty?.name || "Terceiro"}</Badge>
            <span className="body-small">
              Questão {currentQuestionIndex + 1} de {totalQuestions}
            </span>
          </div>
        </div>
        <SyncIndicator 
          status={syncStatus.status} 
          lastSyncTime={syncStatus.lastSyncTime}
          errorMessage={syncStatus.errorMessage}
          compact={true}
        />
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso da Avaliação</span>
            <span className="body-small">{progressPercent}% concluído ({answeredQuestions}/{totalQuestions})</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Question Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 body-small mb-2">
                <Badge variant="secondary">{currentSection?.name || currentQuestion?.section}</Badge>
                <Badge variant="outline">Pergunta {currentQuestion?.number}</Badge>
              </div>
              <CardTitle className="text-lg leading-relaxed">{currentQuestion?.question}</CardTitle>
              
              {/* Intent/Help */}
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200">O que queremos entender:</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">{currentQuestion?.intent}</p>
                  </div>
                </div>
                {currentQuestion?.help && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">{currentQuestion.help}</p>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Options as Multiple Choice */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Selecione a alternativa que melhor descreve a situação atual:</Label>
                <div className="space-y-2">
                  {currentQuestion?.options.map((option) => {
                    const isSelected = currentResponse.level === option.level;
                    const riskScore = option.impact * option.probability;
                    let riskBadge = '';
                    let riskColor = '';
                    
                    if (riskScore <= 6) {
                      riskBadge = 'Baixo';
                      riskColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
                    } else if (riskScore <= 12) {
                      riskBadge = 'Moderado';
                      riskColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
                    } else if (riskScore <= 18) {
                      riskBadge = 'Alto';
                      riskColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
                    } else {
                      riskBadge = 'Crítico';
                      riskColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
                    }

                    return (
                      <div
                        key={option.level}
                        onClick={() => handleSelectOption(option.level)}
                        className={`
                          p-4 rounded-lg border-2 cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm
                            ${isSelected 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground'
                            }
                          `}>
                            {option.letter})
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${isSelected ? 'font-medium' : ''}`}>
                              {option.text}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className={`text-xs ${riskColor}`}>
                                Risco: {riskBadge}
                              </Badge>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Evidence Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Evidências e Observações</Label>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Evidência esperada:</strong> {currentQuestion?.evidence.prompt}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Exemplos:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {currentQuestion?.evidence.examples.map((ex, idx) => (
                        <li key={idx}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Upload de Arquivo */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEvidenceModal(true)}
                    className="gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    {uploadedEvidences[currentQuestion?.id] ? 'Alterar Arquivo' : 'Anexar Arquivo'}
                  </Button>
                  {uploadedEvidences[currentQuestion?.id] && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {uploadedEvidences[currentQuestion?.id].fileName || 'Arquivo anexado'}
                    </span>
                  )}
                </div>

                <Textarea
                  value={currentResponse.notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Descreva as evidências ou adicione observações relevantes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            <Button variant="outline" onClick={handleSaveResponse} disabled={isSaving || currentResponse.level === 0}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>

            {isLastQuestion ? (
              <Button onClick={handleFinish} disabled={answeredQuestions < totalQuestions}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Finalizar
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Próxima
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Section Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Seções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DUE_DILIGENCE_SECTIONS.map((section) => {
                const sectionQuestions = questions.filter(q => q.sectionId === section.id);
                const sectionAnswered = sectionQuestions.filter(q => responses[q.id]?.level > 0).length;
                const isCurrentSection = section.id === currentQuestion?.sectionId;
                
                return (
                  <div 
                    key={section.id}
                    className={`p-2 rounded-lg text-xs ${isCurrentSection ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={isCurrentSection ? 'font-medium' : ''}>{section.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {sectionAnswered}/{sectionQuestions.length}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Questions List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Questões</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {questions.map((q, idx) => {
                    const response = responses[q.id];
                    const isAnswered = response?.level > 0;
                    const isCurrent = idx === currentQuestionIndex;
                    
                    let statusColor = 'border-muted-foreground/30';
                    if (isAnswered) {
                      const option = q.options.find(o => o.level === response.level);
                      if (option) {
                        const riskScore = option.impact * option.probability;
                        if (riskScore <= 6) statusColor = 'bg-green-500';
                        else if (riskScore <= 12) statusColor = 'bg-yellow-500';
                        else if (riskScore <= 18) statusColor = 'bg-orange-500';
                        else statusColor = 'bg-red-500';
                      }
                    }

                    return (
                      <Button
                        key={q.id}
                        variant={isCurrent ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => setCurrentQuestionIndex(idx)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div 
                            className={`w-3 h-3 rounded-full shrink-0 ${isAnswered ? statusColor : 'border-2 ' + statusColor}`} 
                          />
                          <span className="truncate text-xs">
                            {q.number}. {q.question.substring(0, 25)}...
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Current Risk Summary */}
          {currentResponse.level > 0 && currentOption && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Risco da Questão Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Impacto:</span>
                    <Badge variant="outline">{currentOption.impact}/5</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Probabilidade:</span>
                    <Badge variant="outline">{currentOption.probability}/5</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-xs">
                    <span>Score de Risco:</span>
                    <Badge className={`${
                      currentRiskScore <= 6 ? 'bg-green-500' :
                      currentRiskScore <= 12 ? 'bg-yellow-500' :
                      currentRiskScore <= 18 ? 'bg-orange-500' : 'bg-red-500'
                    } text-white`}>
                      {currentRiskScore}/25
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de Upload de Evidência */}
      {showEvidenceModal && currentQuestion && (
        <EvidenceUploadModal
          assessmentId={assessmentId}
          questionId={currentQuestion.id}
          questionTitle={currentQuestion.question}
          requiredType="all"
          onUpload={(evidence) => {
            setUploadedEvidences(prev => ({
              ...prev,
              [currentQuestion.id]: {
                type: evidence.type,
                fileName: evidence.fileName,
                fileUrl: evidence.value,
              }
            }));
            toast.success('Evidência anexada com sucesso!');
          }}
          onClose={() => setShowEvidenceModal(false)}
        />
      )}
    </div>
  );
}
