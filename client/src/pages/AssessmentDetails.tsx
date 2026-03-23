import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceUploadModal } from "@/components/assessments/EvidenceUploadModal";
import {
  ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Shield,
  Database, Users, Lock, Bell, Building, GraduationCap, Lightbulb,
  Loader2, FileText, Paperclip, Eye, Info, ChevronDown, ChevronUp,
  AlertTriangle
} from "lucide-react";
import { SEUSDADOS_FRAMEWORK, QUESTION_OPTIONS, MATURITY_LEVELS } from "../../../shared/frameworkSeusdados";
import { EVIDENCE_SUGGESTIONS_FRAMEWORK } from "../../../shared/evidenceSuggestionsFramework";

// Ícones por domínio
const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  "IA-01": <Shield className="w-5 h-5" />,
  "IA-02": <Database className="w-5 h-5" />,
  "IA-03": <CheckCircle className="w-5 h-5" />,
  "IA-04": <Users className="w-5 h-5" />,
  "IA-05": <Lock className="w-5 h-5" />,
  "IA-06": <Bell className="w-5 h-5" />,
  "IA-07": <Building className="w-5 h-5" />,
  "IA-08": <GraduationCap className="w-5 h-5" />,
  "IA-09": <Lightbulb className="w-5 h-5" />,
};

const LEVEL_COLORS = [
  "",
  "bg-red-100 text-red-800 border-red-300",
  "bg-orange-100 text-orange-800 border-orange-300",
  "bg-yellow-100 text-yellow-800 border-yellow-300",
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-green-100 text-green-800 border-green-300",
];

interface LocalResponse {
  questionId: string;
  selectedLevel: number;
  notes: string;
  savedAt?: string;
}

export default function AssessmentDetails() {
  const params = useParams() as { id?: string };
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const assessmentId = params.id ? parseInt(params.id) : null;

  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceQuestionId, setEvidenceQuestionId] = useState("");

  // Respostas locais (cache para UI)
  const [localResponses, setLocalResponses] = useState<Record<string, LocalResponse>>({});
  const [savingQuestion, setSavingQuestion] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Debounce ref para salvamento automático
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ========== QUERIES ==========

  const { data: assessment, isLoading: loadingAssessment } = trpc.assessments.get.useQuery(
    { id: assessmentId! },
    { enabled: !!assessmentId }
  );

  const { data: accessData, isLoading: loadingAccess } = trpc.assessments.getMyAssignedDomains.useQuery(
    { assessmentId: assessmentId! },
    { enabled: !!assessmentId }
  );

  const { data: savedResponses, isLoading: loadingResponses } = trpc.assessments.getResponsesFiltered.useQuery(
    { assessmentId: assessmentId! },
    { enabled: !!assessmentId }
  );

  // Verificar se todos os domínios estão atribuídos (para Sponsor)
  const isSponsor = user?.role === 'sponsor';
  const { data: assignmentCheck, isLoading: loadingAssignmentCheck } = trpc.assessments.checkAllDomainsAssigned.useQuery(
    { assessmentId: assessmentId! },
    { enabled: !!assessmentId && isSponsor }
  );

  // Estado para controlar se o Sponsor precisa ser redirecionado
  const [sponsorRedirecting, setSponsorRedirecting] = useState(false);

  // Redirecionar Sponsor para tela de atribuição se há domínios não atribuídos
  useEffect(() => {
    if (isSponsor && assignmentCheck && !assignmentCheck.allAssigned && assessmentId) {
      setSponsorRedirecting(true);
      navigate(`/avaliacoes/${assessmentId}/atribuir`);
    }
  }, [isSponsor, assignmentCheck, assessmentId, navigate]);

  // ========== MUTATIONS ==========

  const saveMutation = trpc.assessments.saveResponseWithAccess.useMutation();
  const completeDomainMutation = trpc.assessments.completeDomain.useMutation();
  const utils = trpc.useUtils();

  // ========== DERIVED STATE ==========

  const isAdmin = accessData?.isAdmin ?? false;
  const isSponsorAccess = (accessData as any)?.isSponsor ?? false;
  const allowedDomainIds = accessData?.domains ?? [];

  // Perfis Cliente que têm regra de evidências obrigatórias
  const isClientWithEvidenceRule = ['sponsor', 'comite'].includes(user?.role || '');

  const visibleDomains = useMemo(() => {
    if (!accessData) return [];
    if (isAdmin || isSponsorAccess) return SEUSDADOS_FRAMEWORK;
    return SEUSDADOS_FRAMEWORK.filter(d => allowedDomainIds.includes(d.id));
  }, [accessData, isAdmin, isSponsorAccess, allowedDomainIds]);

  const currentDomain = visibleDomains[currentDomainIndex];
  const currentQuestions = currentDomain?.questions ?? [];

  // Buscar resumo de evidências do domínio atual (apenas para perfis Cliente)
  const { data: evidenceSummary, refetch: refetchEvidences } = trpc.assessments.getDomainEvidenceSummary.useQuery(
    { assessmentId: assessmentId!, domainId: currentDomain?.id || "" },
    { enabled: !!assessmentId && !!currentDomain && isClientWithEvidenceRule }
  );

  const evidencesByQuestion = evidenceSummary?.evidencesByQuestion ?? {};

  // Carregar respostas salvas no estado local
  useEffect(() => {
    if (savedResponses && savedResponses.length > 0) {
      const map: Record<string, LocalResponse> = {};
      savedResponses.forEach((r: any) => {
        map[r.questionId] = {
          questionId: r.questionId,
          selectedLevel: r.selectedLevel,
          notes: r.notes || "",
          savedAt: r.respondedAt,
        };
      });
      setLocalResponses(prev => ({ ...prev, ...map }));
    }
  }, [savedResponses]);

  // ========== AUTO-SAVE ==========

  const autoSave = useCallback(async (questionId: string, level: number, notes: string) => {
    if (!assessmentId || isAdmin) return;

    const question = SEUSDADOS_FRAMEWORK
      .flatMap(d => d.questions)
      .find(q => q.id === questionId);

    if (!question || level < 1) return;

    setSavingQuestion(questionId);
    try {
      await saveMutation.mutateAsync({
        assessmentId,
        questionId,
        questionText: question.text,
        selectedLevel: level,
        notes: notes || undefined,
      });
      const now = new Date().toLocaleTimeString("pt-BR");
      setLastSavedAt(now);
      setLocalResponses(prev => ({
        ...prev,
        [questionId]: { ...prev[questionId], savedAt: now },
      }));
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar", error?.message || "Tente novamente.");
    } finally {
      setSavingQuestion(null);
    }
  }, [assessmentId, isAdmin, saveMutation, toast]);

  const debouncedSave = useCallback((questionId: string, level: number, notes: string) => {
    if (saveTimerRef.current[questionId]) {
      clearTimeout(saveTimerRef.current[questionId]);
    }
    saveTimerRef.current[questionId] = setTimeout(() => {
      autoSave(questionId, level, notes);
    }, 1500);
  }, [autoSave]);

  // Cancelar todos os timers pendentes e executar os saves imediatamente
  // Usado antes de concluir o domínio para garantir que todas as respostas estão salvas no servidor
  const flushPendingSaves = useCallback(async () => {
    const pendingEntries = Object.entries(saveTimerRef.current);
    if (pendingEntries.length === 0) return;

    const savePromises: Promise<void>[] = [];
    pendingEntries.forEach(([questionId, timer]) => {
      clearTimeout(timer);
      delete saveTimerRef.current[questionId];
      const response = localResponses[questionId];
      if (response && response.selectedLevel > 0) {
        savePromises.push(autoSave(questionId, response.selectedLevel, response.notes || ''));
      }
    });

    if (savePromises.length > 0) {
      await Promise.all(savePromises);
    }
  }, [localResponses, autoSave]);

  // ========== HANDLERS ==========

  const handleSelectLevel = (questionId: string, level: number) => {
    if (isAdmin) return;
    const current = localResponses[questionId];
    const notes = current?.notes || "";
    setLocalResponses(prev => ({
      ...prev,
      [questionId]: { questionId, selectedLevel: level, notes, savedAt: prev[questionId]?.savedAt },
    }));
    debouncedSave(questionId, level, notes);
  };

  const handleNotesChange = (questionId: string, notes: string) => {
    if (isAdmin) return;
    const current = localResponses[questionId];
    const level = current?.selectedLevel || 0;
    setLocalResponses(prev => ({
      ...prev,
      [questionId]: { questionId, selectedLevel: level, notes, savedAt: prev[questionId]?.savedAt },
    }));
    if (level > 0) {
      debouncedSave(questionId, level, notes);
    }
  };

  // Verificar quais perguntas do domínio atual estão sem evidência obrigatória
  const getQuestionsWithMissingEvidence = useCallback((): string[] => {
    if (!isClientWithEvidenceRule || !currentQuestions.length) return [];
    
    const missing: string[] = [];
    currentQuestions.forEach(question => {
      const response = localResponses[question.id];
      // Só exige evidência se respondida com nível > 1 (não é "Não/Não se aplica")
      if (response && response.selectedLevel > 1) {
        const evidenceCount = evidencesByQuestion[question.id] || 0;
        if (evidenceCount === 0) {
          missing.push(question.id);
        }
      }
    });
    return missing;
  }, [isClientWithEvidenceRule, currentQuestions, localResponses, evidencesByQuestion]);

  const handleCompleteDomain = async () => {
    if (!assessmentId || !currentDomain || isAdmin) return;

    // Garantir que todos os saves com debounce pendentes sejam enviados ao servidor
    // antes de qualquer validação ou chamada ao backend
    await flushPendingSaves();

    // Validar evidências obrigatórias para perfis Cliente (Sponsor e Comitê)
    if (isClientWithEvidenceRule) {
      // Forçar atualização do cache de evidências antes de validar
      // Isso evita falsos positivos quando o cache está desatualizado após anexar evidências
      let freshEvidencesByQuestion = evidencesByQuestion;
      try {
        const freshResult = await refetchEvidences();
        freshEvidencesByQuestion = freshResult.data?.evidencesByQuestion ?? evidencesByQuestion;
      } catch {
        // Se o refetch falhar, usa o cache atual
      }

      // Verificar pendências com dados frescos
      const missingQuestionIds: string[] = [];
      currentQuestions.forEach(question => {
        const response = localResponses[question.id];
        if (response && response.selectedLevel > 1) {
          const evidenceCount = freshEvidencesByQuestion[question.id] || 0;
          if (evidenceCount === 0) {
            missingQuestionIds.push(question.id);
          }
        }
      });

      if (missingQuestionIds.length > 0) {
        toast.error(
          "Evidências obrigatórias pendentes",
          `Este domínio ainda não pode ser concluído. Ainda faltam evidências obrigatórias em ${missingQuestionIds.length} pergunta(s) aplicável(is). Anexe as evidências e tente novamente.`
        );
        // Expandir a primeira pergunta sem evidência para facilitar o acesso
        setExpandedQuestion(missingQuestionIds[0]);
        return;
      }
    }

    try {
      const result = await completeDomainMutation.mutateAsync({
        assessmentId,
        domainId: currentDomain.id,
      });
      if (result.assessmentCompleted) {
        toast.success("Avaliação concluída", "Todos os domínios foram finalizados. A avaliação foi marcada como concluída.");
        utils.assessments.get.invalidate({ id: assessmentId });
        navigate("/avaliacoes");
      } else {
        toast.success("Domínio concluído", `Domínio "${currentDomain.name}" finalizado. Restam ${result.pendingDomains} domínio(s).`);
        if (currentDomainIndex < visibleDomains.length - 1) {
          setCurrentDomainIndex(prev => prev + 1);
          setExpandedQuestion(null);
        }
      }
      utils.assessments.getMyAssignedDomains.invalidate({ assessmentId });
      utils.assessments.getResponsesFiltered.invalidate({ assessmentId });
    } catch (error: any) {
      toast.error("Erro", error?.message || "Não foi possível concluir o domínio.");
    }
  };

  const openEvidenceModal = (questionId: string) => {
    setEvidenceQuestionId(questionId);
    setShowEvidenceModal(true);
  };

  // ========== PROGRESS ==========

  const getDomainProgress = (domain: typeof SEUSDADOS_FRAMEWORK[0]) => {
    const answered = domain.questions.filter(q => localResponses[q.id]?.selectedLevel > 0).length;
    return { answered, total: domain.questions.length, percent: Math.round((answered / domain.questions.length) * 100) };
  };

  // Ajuste SOMENTE VISUAL: exibe 99% quando todas as perguntas estão respondidas
  // mas ainda existem evidências obrigatórias pendentes para perfis Cliente.
  // Não altera nenhuma lógica de negócio, cálculo real ou estado do domínio.
  const getDisplayPercent = (realPercent: number, domainId: string): number => {
    if (
      isClientWithEvidenceRule &&
      realPercent === 100 &&
      domainId === currentDomain?.id &&
      hasMissingEvidence
    ) {
      return 99;
    }
    return realPercent;
  };

  const overallProgress = useMemo(() => {
    const totalQ = visibleDomains.reduce((sum, d) => sum + d.questions.length, 0);
    const answeredQ = visibleDomains.reduce((sum, d) =>
      sum + d.questions.filter(q => localResponses[q.id]?.selectedLevel > 0).length, 0);
    return totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0;
  }, [visibleDomains, localResponses]);

  // ========== LOADING / GUARDS ==========

  // Bloquear renderização se Sponsor está sendo redirecionado para atribuição
  if (sponsorRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Redirecionando para atribuição de domínios...</p>
        </div>
      </div>
    );
  }

  if (loadingAssessment || loadingAccess || loadingResponses || (isSponsor && loadingAssignmentCheck)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Carregando avaliação...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Avaliação não encontrada</h2>
          <p className="text-gray-600 mb-4">A avaliação solicitada não existe ou foi removida.</p>
          <Button onClick={() => navigate("/avaliacoes")}>Voltar às Avaliações</Button>
        </Card>
      </div>
    );
  }

  if (!isAdmin && visibleDomains.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-4">
            Você não possui domínios atribuídos nesta avaliação.
            Entre em contato com o administrador para solicitar acesso.
          </p>
          <Button onClick={() => navigate("/avaliacoes")}>Voltar às Avaliações</Button>
        </Card>
      </div>
    );
  }

  if (!currentDomain) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum domínio disponível</h2>
          <Button onClick={() => navigate("/avaliacoes")}>Voltar às Avaliações</Button>
        </Card>
      </div>
    );
  }

  const domainProgress = getDomainProgress(currentDomain);
  const currentAssignment = accessData?.assignments?.find((a: any) => a.domainId === currentDomain.id);
  const isDomainCompleted = currentAssignment?.status === "concluida";

  // Sponsor pode editar APENAS os domínios atribuídos a ele; demais são somente-leitura
  const isSponsorAssignedToCurrentDomain = isSponsorAccess && currentAssignment && currentAssignment.assignedToUserId === user?.id;
  const isReadOnly = isAdmin
    || (isSponsorAccess && !isSponsorAssignedToCurrentDomain)
    || assessment.status === "concluida"
    || assessment.status === "arquivada";

  // Para perfis Cliente: domínio concluído NÃO bloqueia edição se ainda há evidências pendentes
  // O bloqueio só acontece se o domínio está concluído E não há evidências pendentes
  const missingEvidenceIds = getQuestionsWithMissingEvidence();
  const hasMissingEvidence = missingEvidenceIds.length > 0;

  // Bloquear edição somente se: domínio concluído E sem pendências de evidência
  // OU se é admin/somente-leitura por outro motivo
  const effectivelyCompleted = isDomainCompleted && (!isClientWithEvidenceRule || !hasMissingEvidence);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/avaliacoes")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {assessment.assessmentCode || `Avaliação #${assessment.id}`}
            </h1>
            <p className="text-sm text-gray-500">
              {isAdmin ? "Modo Visualização (Administrador)"
                : isSponsorAccess && !isSponsorAssignedToCurrentDomain
                  ? `Acompanhamento: ${currentDomain.name}`
                  : `Respondendo: ${currentDomain.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {savingQuestion && (
            <div className="flex items-center gap-1 text-sm text-amber-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              Salvando...
            </div>
          )}
          {lastSavedAt && !savingQuestion && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="w-3 h-3" />
              Salvo às {lastSavedAt}
            </div>
          )}
          <Badge className={
            assessment.status === "concluida" ? "bg-green-100 text-green-800" :
            (assessment.status === "em_andamento" || assessment.status === "iniciada") ? "bg-blue-100 text-blue-800" :
            (assessment.status === "pendente_atribuicao" || assessment.status === "programada") ? "bg-amber-100 text-amber-800" :
            "bg-gray-100 text-gray-800"
          }>
            {assessment.status === "concluida" ? "Concluída" :
             (assessment.status === "em_andamento" || assessment.status === "iniciada") ? "Em Andamento" :
             (assessment.status === "pendente_atribuicao" || assessment.status === "programada") ? "Pendente de Atribuição" :
             assessment.status === "arquivada" ? "Arquivada" : assessment.status}
          </Badge>
        </div>
      </div>

      {/* Banner Admin */}
      {isAdmin && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-600" />
          <span className="text-sm text-amber-800">
            Modo visualização: você está vendo todos os domínios como administrador. As respostas não podem ser editadas.
            Para análise detalhada, acesse a{" "}
            <button onClick={() => navigate(`/avaliacoes/${assessmentId}/consultor`)} className="underline font-medium">
              aba de Análise
            </button>.
          </span>
        </div>
      )}

      {/* Banner evidências obrigatórias (para perfis Cliente) */}
      {isClientWithEvidenceRule && !isAdmin && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-blue-800">
            <strong>Evidências obrigatórias:</strong> Para concluir cada domínio, todas as perguntas respondidas com nível acima de "Não se aplica" precisam ter pelo menos uma evidência anexada. Você pode salvar suas respostas e voltar depois para anexar as evidências.
          </span>
        </div>
      )}

      {/* Banner domínio concluído (sem pendências) */}
      {effectivelyCompleted && !isAdmin && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800">
            Este domínio já foi concluído. As respostas estão bloqueadas para edição.
          </span>
        </div>
      )}

      {/* Banner domínio concluído mas com evidências pendentes (Cliente) */}
      {isDomainCompleted && isClientWithEvidenceRule && hasMissingEvidence && !isAdmin && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-amber-800">
            <strong>Evidências pendentes:</strong> Este domínio possui {missingEvidenceIds.length} pergunta(s) sem evidência obrigatória. Você ainda pode editar as respostas e anexar as evidências faltantes.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Navegação por domínios */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Domínios</CardTitle>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progresso geral</span>
                  <span>{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {visibleDomains.map((domain, idx) => {
                const progress = getDomainProgress(domain);
                const assignment = accessData?.assignments?.find((a: any) => a.domainId === domain.id);
                const isCompleted = assignment?.status === "concluida";
                const isActive = idx === currentDomainIndex;
                const isSponsorOwner = isSponsorAccess && assignment && assignment.assignedToUserId === user?.id;
                return (
                  <button
                    key={domain.id}
                    onClick={() => { setCurrentDomainIndex(idx); setExpandedQuestion(null); }}
                    className={`w-full text-left p-2.5 rounded-lg transition-all text-sm ${
                      isActive
                        ? "bg-indigo-50 border border-indigo-200 text-indigo-900"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{DOMAIN_ICONS[domain.id]}</span>
                      <span className="flex-1 font-medium truncate">{domain.name}</span>
                      {isCompleted && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                      {isSponsorAccess && !isCompleted && (
                        isSponsorOwner
                          ? <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded flex-shrink-0">Responder</span>
                          : <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">Acompanhar</span>
                      )}
                    </div>
                    <div className="mt-1.5 ml-7">
                      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                        <span>{progress.answered}/{progress.total}</span>
                        <span>{getDisplayPercent(progress.percent, domain.id)}%</span>
                      </div>
                      <Progress value={getDisplayPercent(progress.percent, domain.id)} className="h-1" />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main content: Questões */}
        <div className="lg:col-span-3">
          {/* Cabeçalho do domínio */}
          <Card className="mb-4">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-indigo-600">{DOMAIN_ICONS[currentDomain.id]}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{currentDomain.name}</h2>
                    <p className="text-sm text-gray-500">{currentDomain.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {domainProgress.answered}/{domainProgress.total} respondidas
                  </Badge>
                  {isClientWithEvidenceRule && hasMissingEvidence && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {missingEvidenceIds.length} sem evidência
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={getDisplayPercent(domainProgress.percent, currentDomain.id)} className="mt-3 h-2" />
            </CardContent>
          </Card>

          {/* Lista de questões do domínio */}
          <div className="space-y-3">
            {currentQuestions.map((question, qIdx) => {
              const response = localResponses[question.id];
              const options = QUESTION_OPTIONS[question.id] || [];
              const isSaving = savingQuestion === question.id;
              const isExpanded = expandedQuestion === question.id;

              // Para perfis Cliente: não bloquear edição se há evidências pendentes
              // O bloqueio só acontece se o domínio está realmente concluído (sem pendências)
              const effectiveReadOnly = isReadOnly || effectivelyCompleted;

              // Verificar se esta pergunta específica está sem evidência obrigatória
              const isMissingEvidence = isClientWithEvidenceRule
                && response?.selectedLevel > 1
                && (evidencesByQuestion[question.id] || 0) === 0;

              return (
                <Card key={question.id} className={`transition-all ${
                  isMissingEvidence
                    ? "border-amber-300 bg-amber-50/30"
                    : response?.selectedLevel ? "border-green-200" : "border-gray-200"
                }`}>
                  <CardContent className="py-4">
                    {/* Cabeçalho da questão */}
                    <button
                      onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            isMissingEvidence
                              ? "bg-amber-100 text-amber-700"
                              : response?.selectedLevel
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                          }`}>
                            {qIdx + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{question.text}</p>
                            {response?.selectedLevel && (
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <Badge className={`text-xs ${LEVEL_COLORS[response.selectedLevel]}`}>
                                  Nível {response.selectedLevel} - {MATURITY_LEVELS[response.selectedLevel - 1]?.title}
                                </Badge>
                                {isSaving && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
                                {response.savedAt && !isSaving && (
                                  <span className="text-xs text-green-600 flex items-center gap-0.5">
                                    <CheckCircle className="w-3 h-3" /> Salvo
                                  </span>
                                )}
                                {isMissingEvidence && (
                                  <span className="text-xs text-amber-700 flex items-center gap-0.5 font-medium">
                                    <AlertTriangle className="w-3 h-3" /> Evidência obrigatória pendente
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {question.requiresEvidence && (
                            <Paperclip className={`w-4 h-4 ${isMissingEvidence ? "text-amber-500" : "text-gray-400"}`} />
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>

                    {/* Conteúdo expandido */}
                    {isExpanded && (
                      <div className="mt-4 ml-11 space-y-4">
                        {/* Descrição da questão */}
                        {question.description && (
                          <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-800">{question.description}</p>
                          </div>
                        )}

                        {/* Referências normativas */}
                        {(question.lgpdArticles?.length || question.isoControls?.length || question.nistControls?.length) && (
                          <div className="flex flex-wrap gap-1.5">
                            {question.lgpdArticles?.map(art => (
                              <Badge key={art} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                LGPD {art}
                              </Badge>
                            ))}
                            {question.isoControls?.map(ctrl => (
                              <Badge key={ctrl} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                ISO {ctrl}
                              </Badge>
                            ))}
                            {question.nistControls?.map(ctrl => (
                              <Badge key={ctrl} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                NIST {ctrl}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Opções de nível */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 uppercase">Selecione o nível de maturidade:</p>
                          {options.map((opt: any) => (
                            <button
                              key={opt.level}
                              disabled={effectiveReadOnly}
                              onClick={() => handleSelectLevel(question.id, opt.level)}
                              className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${
                                response?.selectedLevel === opt.level
                                  ? LEVEL_COLORS[opt.level] + " border-2"
                                  : effectiveReadOnly
                                    ? "border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  response?.selectedLevel === opt.level
                                    ? "bg-white/50"
                                    : "bg-gray-100"
                                }`}>
                                  {opt.level}
                                </span>
                                <span className="flex-1">{opt.text}</span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Sugestão de evidência para o nível selecionado */}
                        {response?.selectedLevel && EVIDENCE_SUGGESTIONS_FRAMEWORK[question.id] && (() => {
                          const sugestao = EVIDENCE_SUGGESTIONS_FRAMEWORK[question.id].find(s => s.level === response.selectedLevel);
                          if (!sugestao) return null;
                          return (
                            <div className="mt-1 mb-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Sugestão de evidência para este nível</p>
                              <ul className="space-y-1">
                                {sugestao.suggestions.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                                    <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })()}

                        {/* Observações */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase block mb-1">
                            Observações (opcional)
                          </label>
                          <Textarea
                            value={response?.notes || ""}
                            onChange={(e) => handleNotesChange(question.id, e.target.value)}
                            placeholder="Adicione observações, justificativas ou comentários..."
                            disabled={effectiveReadOnly}
                            className="text-sm min-h-[80px]"
                          />
                        </div>

                        {/* Evidências */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className={`text-xs font-medium uppercase flex items-center gap-1 ${
                              isMissingEvidence ? "text-amber-600" : "text-gray-500"
                            }`}>
                              {isMissingEvidence && <AlertTriangle className="w-3 h-3" />}
                              Evidências
                              {isMissingEvidence && " (obrigatória)"}
                              {question.evidenceType && ` — ${question.evidenceType === "both" ? "Documento ou Link" : question.evidenceType === "pdf" ? "Documento" : "Link"}`}
                            </label>
                            {!effectiveReadOnly && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEvidenceModal(question.id)}
                                className={`text-xs ${isMissingEvidence ? "border-amber-400 text-amber-700 hover:bg-amber-50" : ""}`}
                              >
                                <Paperclip className="w-3 h-3 mr-1" /> Anexar
                              </Button>
                            )}
                          </div>
                          <EvidenceList
                            assessmentId={assessmentId!}
                            questionId={question.id}
                            onEvidenceChange={() => refetchEvidences()}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Navegação entre domínios e botão de concluir */}
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={currentDomainIndex === 0}
              onClick={() => { setCurrentDomainIndex(prev => prev - 1); setExpandedQuestion(null); }}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Domínio Anterior
            </Button>

            <div className="flex gap-2">
              {/* Botão de concluir: aparece quando todas as perguntas estão respondidas e domínio não está concluído */}
              {!isReadOnly && !effectivelyCompleted && domainProgress.percent === 100 && (
                <Button
                  onClick={handleCompleteDomain}
                  disabled={completeDomainMutation.isPending}
                  className={`text-white ${
                    isClientWithEvidenceRule && hasMissingEvidence
                      ? "bg-amber-500 hover:bg-amber-600 cursor-not-allowed opacity-70"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                  title={isClientWithEvidenceRule && hasMissingEvidence
                    ? `Ainda faltam evidências em ${missingEvidenceIds.length} pergunta(s)`
                    : "Concluir este domínio"}
                >
                  {completeDomainMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : isClientWithEvidenceRule && hasMissingEvidence ? (
                    <AlertTriangle className="w-4 h-4 mr-1" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  )}
                  {isClientWithEvidenceRule && hasMissingEvidence
                    ? `Concluir (${missingEvidenceIds.length} evidência(s) pendente(s))`
                    : "Concluir Domínio"}
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              disabled={currentDomainIndex === visibleDomains.length - 1}
              onClick={() => { setCurrentDomainIndex(prev => prev + 1); setExpandedQuestion(null); }}
            >
              Próximo Domínio <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de evidências */}
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <EvidenceUploadModal
              assessmentId={assessmentId!}
              questionId={evidenceQuestionId}
              questionTitle={
                SEUSDADOS_FRAMEWORK
                  .flatMap(d => d.questions)
                  .find(q => q.id === evidenceQuestionId)?.text || ""
              }
              requiredType="all"
              onUpload={() => {
                setShowEvidenceModal(false);
                utils.assessments.getEvidences.invalidate({ assessmentId: assessmentId!, questionId: evidenceQuestionId });
                refetchEvidences();
                toast.success("Evidência anexada", "O arquivo foi salvo com sucesso.");
              }}
              onClose={() => setShowEvidenceModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Sub-componente: Lista de evidências ==========
function EvidenceList({
  assessmentId,
  questionId,
  onEvidenceChange
}: {
  assessmentId: number;
  questionId: string;
  onEvidenceChange?: () => void;
}) {
  const { data: evidences = [] } = trpc.assessments.getEvidences.useQuery(
    { assessmentId, questionId },
    { enabled: !!assessmentId && !!questionId }
  );

  if (evidences.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">Nenhuma evidência anexada.</p>
    );
  }

  return (
    <div className="space-y-1">
      {evidences.map((ev: any) => (
        <div key={ev.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
          {ev.type === "pdf" ? (
            <FileText className="w-4 h-4 text-red-500" />
          ) : (
            <Info className="w-4 h-4 text-blue-500" />
          )}
          <a
            href={ev.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex-1 truncate"
          >
            {ev.fileName || ev.fileUrl}
          </a>
        </div>
      ))}
    </div>
  );
}
