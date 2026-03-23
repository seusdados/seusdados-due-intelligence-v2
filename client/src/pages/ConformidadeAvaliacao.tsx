import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Upload,
  X,
  File,
  Users
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { dominiosConformidade, niveisMaturidade, frameworksDisponiveis } from "@shared/assessmentData";
import { EVIDENCE_SUGGESTIONS_CONFORMIDADE } from "@shared/evidenceSuggestionsConformidade";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAutoSave, getAutoSaveStatusDisplay } from "@/hooks/useAutoSave";
import { DomainProgressChart } from "@/components/DomainProgressChart";
import { SyncIndicator, useSyncStatus } from "@/components/SyncIndicator";
import { Lock, Shield } from "lucide-react";

const maturityColors: Record<number, string> = {
  0: "bg-gray-400",
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-green-500",
  5: "bg-blue-500",
};

export default function ConformidadeAvaliacao() {
  const params = useParams<{ id: string }>();
  const assessmentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, { level: number; notes: string; attachments?: any[] }>>({});
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedKey, setLastSavedKey] = useState<string | null>(null);
  const [showEvidencesTab, setShowEvidencesTab] = useState(false);
  const syncStatus = useSyncStatus();
  const { user: currentUser } = useAuth();

  const utils = trpc.useUtils();

  // Função para verificar se resposta é "Não/Não se aplica"
  const isNegativeResponse = (level: number): boolean => {
    // Nível 0 = não respondido
    // Nível 1 = Não / Não possui / Não se aplica
    return level === 1;
  };

  // Função para verificar se pergunta exige evidência
  const requiresEvidence = (level: number): boolean => {
    return level > 1; // Apenas respostas "Sim", "Parcial", etc. exigem evidência
  };

  // Função para validar evidências de um domínio
  const validateDomainEvidence = (domainId: number): { isValid: boolean; missingQuestions: string[] } => {
    const domainQuestions = currentDomain?.questoes || [];
    const missingQuestions: string[] = [];

    domainQuestions.forEach(q => {
      const questionKey = `${domainId}-${q.id}`;
      const response = responses[questionKey];
      
      if (response && response.level > 0) {
        // Se exige evidência e não tem, adicionar à lista
        if (requiresEvidence(response.level) && (!response.attachments || response.attachments.length === 0)) {
          missingQuestions.push(q.questao);
        }
      }
    });

    return {
      isValid: missingQuestions.length === 0,
      missingQuestions
    };
  };

  const { data: assessment, isLoading: loadingAssessment } = trpc.compliance.getById.useQuery(
    { id: assessmentId },
    { enabled: !!assessmentId }
  );

  // Verificar domínios atribuídos ao usuário logado
  const { data: myDomainAccess, isLoading: loadingAccess } = trpc.compliance.getMyAssignedDomains.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );

  // Usar endpoint filtrado para respostas (respeita controle de acesso)
  const { data: savedResponses, isLoading: loadingResponses } = trpc.compliance.getResponsesFiltered.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );

  // ✅ Carregar dados do SeusDados se framework for 'seusdados'
  const { data: seusdadosData, isLoading: loadingSeusdados } = trpc.seusdados.getFrameworkData.useQuery(
    undefined,
    { enabled: assessment?.framework === 'seusdados' }
  );

  const saveMutation = trpc.compliance.saveResponseWithAccess.useMutation();
  const updateMutation = trpc.compliance.update.useMutation();
  const uploadEvidenceMutation = trpc.evidence.upload.useMutation();

  // Redirecionar Sponsor para tela de atribuição se ainda há domínios não atribuídos
  const { data: assignmentStatus } = trpc.compliance.checkAllDomainsAssigned.useQuery(
    { assessmentId },
    { enabled: !!assessmentId && currentUser?.role === 'sponsor' }
  );

  useEffect(() => {
    if (currentUser?.role === 'sponsor' && assessment && assignmentStatus) {
      if (assessment.organizationId === currentUser?.organizationId) {
        if (!assignmentStatus.allAssigned) {
          setLocation(`/conformidade/${assessmentId}/atribuir`);
        }
      }
    }
  }, [assessment, currentUser, assessmentId, assignmentStatus, setLocation]);

  const { status: autoSaveStatus, save: triggerAutoSave } = useAutoSave({
    debounceMs: 2000,
    onSave: async () => {
      if (!currentQuestion || !currentDomain) return;
      
      const response = responses[questionKey];
      if (!response || response.level === 0) return;

      await saveMutation.mutateAsync({
        assessmentId,
        domainId: currentDomain.id,
        questionId: currentQuestion.id,
        selectedLevel: response.level,
        notes: response.notes || undefined,
        attachments: response.attachments || [],
      });
      
      setLastSavedKey(questionKey);
      utils.compliance.getResponsesFiltered.invalidate({ assessmentId });
    }
  });

  // Load domains based on framework AND filter by user access
  const allDomains = useMemo(() => {
    // Se framework é SeusDados, converter dados para formato compatível
    if (assessment?.framework === 'seusdados' && seusdadosData?.domains) {
      return seusdadosData.domains.map((domain: any) => ({
        id: domain.id,
        titulo: domain.label,
        questoes: (domain.questions || []).map((q: any) => ({
          id: q.id,
          questao: q.prompt,
          opcoes: (q.options || []).map((opt: any) => ({
            nivel: opt.level,
            texto: opt.text
          })),
          frameworks: {
            sgd: {
              fundamento: 'Framework SeusDados - Maturidade LGPD'
            }
          }
        }))
      }));
    }
    return dominiosConformidade;
  }, [assessment?.framework, seusdadosData]);

  // Filtrar domínios visíveis conforme atribuição do usuário
  const domains = useMemo(() => {
    if (!myDomainAccess) return allDomains;
    // Admin vê todos os domínios
    if (myDomainAccess.isAdmin) return allDomains;
    // Usuário comum: apenas domínios atribuídos
    if (myDomainAccess.assignedDomainIds.length === 0) return [];
    return allDomains.filter(d => myDomainAccess.assignedDomainIds.includes(d.id));
  }, [allDomains, myDomainAccess]);

  // Verificar se o usuário pode responder (não é admin)
  const canRespond = myDomainAccess?.canRespond ?? false;
  const isAdminViewing = myDomainAccess?.isAdmin ?? false;


  const currentDomain = domains[currentDomainIndex];
  const currentQuestion = currentDomain?.questoes[currentQuestionIndex];
  const questionKey = currentQuestion ? `${currentDomain.id}-${currentQuestion.id}` : "";

  // Query de evidências por questão - carrega automaticamente quando questionId muda
  const { data: questionEvidences, refetch: refetchEvidences } = trpc.evidence.listByQuestion.useQuery(
    { 
      assessmentType: 'compliance', 
      assessmentId, 
      questionId: currentQuestion?.id || '' 
    },
    { 
      enabled: !!assessmentId && !!currentQuestion?.id,
      staleTime: 0, // Sempre buscar dados frescos
    }
  );

  // Handler para seleção de arquivo
  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploadingFile(true);
    
    for (const file of files) {
      try {
        // Validar tamanho (máx 50MB)
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`Arquivo "${file.name}" excede o tamanho máximo de 50MB`);
          continue;
        }

        // Converter para base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const base64 = (event.target?.result as string).split(',')[1];
            
            // Upload para S3
            const result = await uploadEvidenceMutation.mutateAsync({
              organizationId: assessment?.organizationId || 0,
              assessmentType: 'compliance',
              assessmentId,
              questionId: currentQuestion?.id,
              fileName: file.name,
              fileData: base64,
              mimeType: file.type,
              description: `Evidência para pergunta: ${currentQuestion?.questao}`,
            });

            // Adicionar ao estado local
            setResponses(prev => ({
              ...prev,
              [questionKey]: {
                ...prev[questionKey],
                attachments: [
                  ...(prev[questionKey]?.attachments || []),
                  {
                    fileName: file.name,
                    fileUrl: result.url,
                    fileSize: file.size,
                    fileType: file.type,
                    uploadedAt: new Date().toISOString(),
                  }
                ]
              }
            }));

            toast.success(`Arquivo "${file.name}" enviado com sucesso`);
            // Recarregar evidências da questão atual
            refetchEvidences();
          } catch (error) {
            toast.error(`Erro ao enviar "${file.name}". Tente novamente.`);
            console.error('Upload error:', error);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        toast.error(`Erro ao processar "${file.name}"`);
      }
    }
    setIsUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Carregar anexos quando pergunta muda ou evidências são carregadas
  useEffect(() => {
    if (questionEvidences && questionEvidences.length > 0) {
      setResponses(prev => ({
        ...prev,
        [questionKey]: {
          ...prev[questionKey],
          attachments: questionEvidences.map((evidence: any) => ({
            id: evidence.id,
            fileName: evidence.fileName,
            fileUrl: evidence.fileUrl,
            fileSize: evidence.fileSize,
            fileType: evidence.mimeType,
            uploadedAt: evidence.createdAt,
          }))
        }
      }));
    }
  }, [questionEvidences, questionKey]);

  useEffect(() => {
    if (savedResponses) {
      setResponses(prev => {
        const loaded: Record<string, { level: number; notes: string; attachments?: any[] }> = { ...prev };
        savedResponses.forEach((r: any) => {
          const key = `${r.domainId}-${r.questionId}`;
          loaded[key] = {
            ...loaded[key],
            level: r.selectedLevel,
            notes: r.notes || ""
          };
        });
        return loaded;
      });
    }
  }, [savedResponses]);

  // Calculate total questions and progress
  const totalQuestions = domains.reduce((acc, d) => acc + d.questoes.length, 0);
  const answeredQuestions = Object.keys(responses).filter(k => responses[k].level > 0).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // Calculate current question number
  const currentQuestionNumber = domains
    .slice(0, currentDomainIndex)
    .reduce((acc, d) => acc + d.questoes.length, 0) + currentQuestionIndex + 1;

  const handleSelectLevel = (level: number) => {
    setResponses(prev => ({
      ...prev,
      [questionKey]: { ...prev[questionKey], level, notes: prev[questionKey]?.notes || "" }
    }));
    triggerAutoSave();
  };

  const handleNotesChange = (notes: string) => {
    setResponses(prev => ({
      ...prev,
      [questionKey]: { ...prev[questionKey], notes, level: prev[questionKey]?.level || 0 }
    }));
    triggerAutoSave();
  };

  const handleSaveResponse = async () => {
    if (!currentQuestion || !currentDomain) return;
    
    const response = responses[questionKey];
    if (!response || response.level === 0) {
      toast.error("Selecione um nível de maturidade");
      return;
    }

    const responseRequiresEvidence = requiresEvidence(response.level);

    if (responseRequiresEvidence && (!response.notes || response.notes.trim().length === 0)) {
      toast.error('O campo "Observações e Evidências" é obrigatório para respostas que exigem comprovação.');
      return;
    }

    if (responseRequiresEvidence && (!response.attachments || response.attachments.length === 0)) {
      toast.error('Adicione pelo menos um anexo como evidência para respostas que exigem comprovação.');
      return;
    }

    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        assessmentId,
        domainId: currentDomain.id,
        questionId: currentQuestion.id,
        selectedLevel: response.level,
        notes: response.notes,
        attachments: response.attachments || [],
      });
      
      // Update assessment progress
      await updateMutation.mutateAsync({
        id: assessmentId,
        status: 'em_andamento',
        totalQuestions,
        answeredQuestions: answeredQuestions + (responses[questionKey]?.level ? 0 : 1),
      });

      toast.success("Resposta salva!");
      utils.compliance.getResponsesFiltered.invalidate({ assessmentId });
    } catch (error) {
      toast.error("Erro ao salvar resposta");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    // ✅ Validar apenas nível de maturidade
    const response = responses[questionKey];
    if (!response || response.level === 0) {
      toast.error("Selecione um nível de maturidade");
      return;
    }
    await handleSaveResponse();
    
    if (currentQuestionIndex < currentDomain.questoes.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentDomainIndex < domains.length - 1) {
      setCurrentDomainIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentDomainIndex > 0) {
      setCurrentDomainIndex(prev => prev - 1);
      setCurrentQuestionIndex(domains[currentDomainIndex - 1].questoes.length - 1);
    }
  };

  const handleFinish = async () => {
    // ✅ Validar apenas nível de maturidade
    const response = responses[questionKey];
    if (!response || response.level === 0) {
      toast.error("Selecione um nível de maturidade para a última pergunta");
      return;
    }
    await handleSaveResponse();
    
    // Ir para aba de evidências em vez de finalizar direto
    setShowEvidencesTab(true);
  };

  const isLastQuestion = currentDomainIndex === domains.length - 1 && 
    currentQuestionIndex === currentDomain?.questoes.length - 1;

  if (loadingAssessment || loadingResponses || loadingAccess || (assessment?.framework === 'seusdados' && loadingSeusdados)) {
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
            <Button onClick={() => setLocation('/conformidade')}>
              Voltar para listagem
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificar se o usuário tem acesso a algum domínio
  if (!isAdminViewing && domains.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Você não possui domínios atribuídos nesta avaliação.
              Entre em contato com o administrador para solicitar acesso.
            </p>
            <Button onClick={() => setLocation('/conformidade')}>
              Voltar para listagem
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fw = frameworksDisponiveis[assessment.framework as keyof typeof frameworksDisponiveis];

  // Se showEvidencesTab for true, renderizar aba de evidências
  if (showEvidencesTab) {
    const allResponses = Object.entries(responses).map(([key, resp]) => {
      const [domainId, questionId] = key.split('-');
      const domain = domains.find(d => d.id === parseInt(domainId));
      const question = domain?.questoes.find(q => q.id === questionId);
      return { domain, question, response: resp, key };
    }).filter(r => r.question);

    // Calcular apenas perguntas que exigem evidência
    const questionsRequiringEvidence = allResponses.filter(r => requiresEvidence(r.response.level));
    const completedEvidence = questionsRequiringEvidence.filter(r => r.response.attachments?.length > 0).length;
    const totalQuestionsRequiringEvidence = questionsRequiringEvidence.length;
    const progressPercent = totalQuestionsRequiringEvidence > 0 ? Math.round((completedEvidence / totalQuestionsRequiringEvidence) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Header da Aba de Evidências */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowEvidencesTab(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Evidências - Recibo de Respostas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Anexe evidências para cada pergunta respondida. Este é um passo obrigatório para acessar os resultados.
            </p>
          </div>
        </div>

        {/* Indicador de Progresso */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso de Evidências</span>
              <span className="body-small">{progressPercent}% completo</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>

        {/* Checklist de Evidências */}
        <div className="space-y-4">
          {domains.map((domain) => {
            const domainQuestions = domain.questoes.filter(q => responses[`${domain.id}-${q.id}`]);
            if (domainQuestions.length === 0) return null;
            
            return (
              <Card key={domain.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{domain.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {domainQuestions.map((questao) => {
                    const questionKey = `${domain.id}-${questao.id}`;
                    const response = responses[questionKey];
                    const requiresEvidenceForQuestion = requiresEvidence(response?.level || 0);
                    const hasEvidence = response?.attachments?.length > 0;
                    
                    return (
                      <div key={questao.id} className="p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-start gap-3">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            !requiresEvidenceForQuestion ? 'bg-gray-100 text-gray-700' : hasEvidence ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {!requiresEvidenceForQuestion ? '◯' : hasEvidence ? '✓' : '✕'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{questao.questao}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Resposta: <span className="font-semibold">{response?.level || 0}</span>
                            </p>
                            {response?.notes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                Observações: {response.notes}
                              </p>
                            )}
                            
                            {/* Campo de Anexo - Mostrar apenas se exige evidência */}
                            {requiresEvidenceForQuestion && (
                            <div className="mt-3 p-3 border-2 border-dashed rounded-lg bg-white">
                              {!hasEvidence ? (
                                <div className="text-center">
                                  <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                                  <p className="text-xs font-medium text-red-600 mb-2">Anexo obrigatório *</p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = '.pdf,.doc,.docx,.odt,.rtf,.txt,.md,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.tif,.zip,.rar,.7z,.tar,.gz,.json,.xml,.html';
                                      input.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) {
                                          const newAttachments = [
                                            ...(response?.attachments || []),
                                            {
                                              fileName: file.name,
                                              fileUrl: URL.createObjectURL(file),
                                              fileSize: file.size,
                                              fileType: file.type,
                                              uploadedAt: new Date().toISOString()
                                            }
                                          ];
                                          setResponses(prev => ({
                                            ...prev,
                                            [questionKey]: {
                                              ...response,
                                              attachments: newAttachments
                                            }
                                          }));
                                          toast.success('Arquivo anexado com sucesso!');
                                        }
                                      };
                                      input.click();
                                    }}
                                  >
                                    Selecionar Arquivo
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {response.attachments.map((att, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <File className="h-4 w-4 text-green-600 shrink-0" />
                                        <span className="text-xs font-medium text-green-700 truncate">{att.fileName}</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() => {
                                          const newAttachments = response.attachments.filter((_, i) => i !== idx);
                                          setResponses(prev => ({
                                            ...prev,
                                            [questionKey]: {
                                              ...response,
                                              attachments: newAttachments
                                            }
                                          }));
                                          toast.success('Arquivo removido');
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>                                  ))})
                                </div>
                              )}
                            </div>
                            )}
                            {/* Indicador para respostas que não exigem evidência */}
                            {!requiresEvidenceForQuestion && (
                              <div className="mt-3 p-3 border rounded-lg bg-gray-50 text-center">
                                <p className="text-xs text-gray-600 font-medium">Evidência não exigida para esta resposta</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 justify-between">
          <Button variant="outline" onClick={() => setShowEvidencesTab(false)}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={async () => {
              // Validar apenas perguntas que exigem evidência
              const missingEvidence = questionsRequiringEvidence.filter(r => !r.response.attachments?.length > 0);
              if (missingEvidence.length > 0) {
                const missingQuestions = missingEvidence.map(r => `- ${r.question.questao}`).join('\n');
                toast.error(`Para concluir este domínio, é obrigatório anexar evidências nas perguntas aplicáveis:\n${missingQuestions}`);
                return;
              }
              
              const scores = Object.values(responses).map(r => r.level).filter(l => l > 0);
              const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
              const maturityLevel = Math.round(avgScore);

              try {
                await updateMutation.mutateAsync({
                  id: assessmentId,
                  status: 'concluida',
                  totalQuestions,
                  answeredQuestions: scores.length,
                  maturityLevel,
                  overallScore: Math.round(avgScore * 20),
                });
                
                toast.success('Avaliação concluída com sucesso!');
                setLocation(`/conformidade/resultado/${assessmentId}`);
              } catch (error) {
                toast.error('Erro ao finalizar avaliação');
              }
            }}
          >
            Finalizar e Acessar Resultados
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Mensagem Informativa sobre Evidências (apenas para Cliente) */}
        {!isAdminViewing && ['sponsor', 'comite', 'lider_processo', 'gestor_area'].includes(currentUser?.role || '') && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">⚠️ Regra de Evidências</p>
              <p className="text-xs text-amber-800 mt-1">
                Para concluir um domínio, é obrigatório anexar evidências nas perguntas respondidas como "Sim" ou equivalentes. 
                Perguntas respondidas como "Não" ou "Não se aplica" não exigem evidência. 
                O progresso é salvo automaticamente e você pode anexar evidências depois.
              </p>
            </div>
          </div>
        )}

        {/* Banner para Admin que está apenas visualizando */}
        {isAdminViewing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">Modo de Visualização (Administrador)</p>
            <p className="text-xs text-blue-700">
              Você está visualizando todas as respostas como administrador. 
              Para que os domínios sejam respondidos, atribua responsáveis na tela de atribuição.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/conformidade')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{assessment.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="gap-1">
              <span>{fw?.icone}</span>
              {fw?.nome}
            </Badge>
            <span className="body-small">
              Questão {currentQuestionNumber} de {totalQuestions}
            </span>
          </div>
        </div>
        {/* Botão de Atribuição para Admin e Sponsor */}
        {(isAdminViewing || (currentUser?.role === 'sponsor' && assessment?.organizationId === currentUser?.organizationId)) && assessment?.status !== 'concluida' && (
          <Button 
            onClick={() => setLocation(`/conformidade/${assessmentId}/atribuir`)}
            variant="outline"
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Atribuir Domínios
          </Button>
        )}
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
            <span className="body-small">{progressPercent}% concluído</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2 flex-wrap">
            {domains.map((domain, idx) => {
              const domainAnswered = domain.questoes.filter(q => 
                responses[`${domain.id}-${q.id}`]?.level > 0
              ).length;
              const domainTotal = domain.questoes.length;
              const isComplete = domainAnswered === domainTotal;
              const isInProgress = domainAnswered > 0 && !isComplete;
              const isCurrent = idx === currentDomainIndex;
              
              let statusBadgeColor = 'bg-muted text-foreground';
              let statusIcon = '○';
              if (isInProgress) {
                statusBadgeColor = 'bg-yellow-200 text-yellow-700';
                statusIcon = '◐';
              }
              if (isComplete) {
                statusBadgeColor = 'bg-green-200 text-green-700';
                statusIcon = '✓';
              }
              
              return (
                <div key={domain.id} className="relative">
                  <Button
                    variant={isCurrent ? "default" : isComplete ? "secondary" : "outline"}
                    size="sm"
                    className="shrink-0 text-xs relative"
                    onClick={() => {
                      setCurrentDomainIndex(idx);
                      setCurrentQuestionIndex(0);
                    }}
                  >
                    <span className="font-semibold">{idx + 1}</span>
                  </Button>
                  <Badge 
                    className={`absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold ` + statusBadgeColor}
                    variant="outline"
                  >
                    {statusIcon}
                  </Badge>
                  {(isInProgress || isComplete) && (
                    <div className="text-xs text-center mt-1 font-medium">
                      {domainAnswered}/{domainTotal}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 body-small mb-2">
                <Badge variant="secondary">Domínio {currentDomain?.id}</Badge>
                <span>{currentDomain?.titulo}</span>
              </div>
              <CardTitle className="text-lg">{currentQuestion?.questao}</CardTitle>
              {currentQuestion?.frameworks?.sgd && (
                <CardDescription className="flex items-start gap-2 mt-2 p-3 bg-muted rounded-lg">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="text-xs">{currentQuestion.frameworks.sgd.fundamento}</span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={responses[questionKey]?.level?.toString() || ""}
                onValueChange={(v) => handleSelectLevel(parseInt(v))}
                className="space-y-3"
              >
                {currentQuestion?.opcoes.map((opcao, index) => {
                  const alternativaLetra = String.fromCharCode(97 + index); // a, b, c, d, e
                  const isSelected = responses[questionKey]?.level === opcao.nivel;
                  // Sugestões de evidência para este nível
                  const evidenceSuggestions = currentQuestion
                    ? (EVIDENCE_SUGGESTIONS_CONFORMIDADE[currentQuestion.id]?.find(s => s.nivel === opcao.nivel)?.sugestoes || [])
                    : [];
                  return (
                    <div key={opcao.nivel}>
                      <div
                        className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                          isSelected ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => handleSelectLevel(opcao.nivel)}
                      >
                        <RadioGroupItem value={opcao.nivel.toString()} id={`level-${opcao.nivel}`} className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor={`level-${opcao.nivel}`} className="flex items-start gap-2 cursor-pointer">
                            <span className="font-semibold text-primary min-w-[24px]">{alternativaLetra})</span>
                            <span className="text-foreground">{opcao.texto}</span>
                          </Label>
                        </div>
                      </div>
                      {/* Sugestão de evidência — exibida apenas quando esta opção está selecionada */}
                      {isSelected && evidenceSuggestions.length > 0 && (
                        <div className="mt-2 ml-1 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                              Sugestão de evidência para este nível
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {evidenceSuggestions.map((sugestao, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-amber-900">
                                <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                                <span>{sugestao}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </RadioGroup>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label htmlFor="notes">
                  Observações e Evidências {requiresEvidence(responses[questionKey]?.level || 0) ? <span className="text-red-500">*</span> : null} ({requiresEvidence(responses[questionKey]?.level || 0) ? 'Obrigatório para respostas aplicáveis' : 'Opcional para respostas negativas'})
                </Label>
                <Textarea
                  id="notes"
                  value={responses[questionKey]?.notes || ""}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder={requiresEvidence(responses[questionKey]?.level || 0) ? 'Adicione observações, evidências ou justificativas...' : 'Opcional: detalhe a negativa ou o contexto da resposta...'}
                  rows={3}
                  className={requiresEvidence(responses[questionKey]?.level || 0) && !responses[questionKey]?.notes ? 'border-2 border-red-500 bg-red-50/30 focus:border-red-600' : ''}
                />
                {requiresEvidence(responses[questionKey]?.level || 0) && !responses[questionKey]?.notes && (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-700 font-medium">
                      O campo "Observações e Evidências" é obrigatório quando a resposta exige comprovação.
                    </p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label>
                  Anexar Evidências {requiresEvidence(responses[questionKey]?.level || 0) ? <span className="text-red-500">*</span> : null} ({requiresEvidence(responses[questionKey]?.level || 0) ? 'Obrigatório' : 'Opcional'})
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.tif,.zip,.rar,.7z,.tar,.gz,.json,.xml,.html"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      // Handler será implementado em função separada
                      handleFileSelect(files);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFile}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploadingFile ? 'Enviando...' : 'Selecionar Arquivo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1 text-center">Documentos, planilhas, imagens, apresentações, compactados e dados (até 50MB)</p>
                </div>
                
                {responses[questionKey]?.attachments && responses[questionKey].attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">Anexos enviados:</p>
                    {responses[questionKey].attachments.map((attachment: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm text-foreground truncate">{attachment.fileName}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResponses(prev => ({
                              ...prev,
                              [questionKey]: {
                                ...prev[questionKey],
                                attachments: prev[questionKey].attachments.filter((_: any, i: number) => i !== idx)
                              }
                            }));
                          }}
                          className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentDomainIndex === 0 && currentQuestionIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSaveResponse} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
              {autoSaveStatus !== 'idle' && (
                <div className={`text-xs font-medium ${getAutoSaveStatusDisplay(autoSaveStatus).color}`}>
                  {getAutoSaveStatusDisplay(autoSaveStatus).icon} {getAutoSaveStatusDisplay(autoSaveStatus).text}
                </div>
              )}
            </div>

            {isLastQuestion ? (
              <Button onClick={handleFinish} disabled={answeredQuestions < totalQuestions}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Finalizar
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!responses[questionKey] || responses[questionKey].level === 0}>
                Próxima
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar - Domain Overview */}
        <div className="space-y-4">
          {/* Domain Progress Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Progresso por Domínio</CardTitle>
            </CardHeader>
            <CardContent>
              <DomainProgressChart domains={domains} responses={responses} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Questões do Domínio</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {currentDomain?.questoes.map((q, idx) => {
                    const key = `${currentDomain.id}-${q.id}`;
                    const response = responses[key];
                    const isAnswered = response?.level > 0;
                    const isCurrent = idx === currentQuestionIndex;

                    return (
                      <Button
                        key={q.id}
                        variant={isCurrent ? "default" : "ghost"}
                        size="sm"
                        className={`w-full justify-start text-left h-auto py-2 ${
                          isAnswered && !isCurrent ? 'text-muted-foreground' : ''
                        }`}
                        onClick={() => setCurrentQuestionIndex(idx)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {isAnswered ? (
                            <div className={`w-3 h-3 rounded-full shrink-0 ${maturityColors[response.level]}`} />
                          ) : (
                            <div className="w-3 h-3 rounded-full shrink-0 border-2 border-muted-foreground/30" />
                          )}
                          <span className="truncate text-xs">{idx + 1}. {q.questao.substring(0, 35)}...</span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Legenda de Maturidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {niveisMaturidade.map((nivel) => (
                  <div key={nivel.nivel} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded-full ${maturityColors[nivel.nivel]}`} />
                    <span>{nivel.nome}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
