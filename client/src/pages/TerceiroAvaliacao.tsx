import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { 
  Shield,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  MessageSquare,
  User,
  Mail,
  Briefcase,
  Loader2,
  PartyPopper
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";
import { DUE_DILIGENCE_FRAMEWORK } from "@shared/frameworkDueDiligence";
import { useAutoSave } from "@/hooks/useAutoSave";

export default function TerceiroAvaliacao() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [expandedInfo, setExpandedInfo] = useState(false);
  const [showCommentField, setShowCommentField] = useState(false);
  const [showEvidenceField, setShowEvidenceField] = useState(false);
  const [currentNotes, setCurrentNotes] = useState("");
  const [currentEvidence, setCurrentEvidence] = useState("");
  const [responderInfo, setResponderInfo] = useState({ name: "", email: "", role: "" });
  const [showResponderForm, setShowResponderForm] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [pendingAutoSave, setPendingAutoSave] = useState(false);

  // Buscar estado consolidado via endpoint público
  const { data: stateData, isLoading: loadingState, error: stateError, refetch: refetchState } = 
    trpc.accessLink.getDueDiligenceState.useQuery(
      { token },
      { enabled: !!token, retry: false }
    );

  // Mutation para salvar resposta (público, sem login)
  const saveMutation = trpc.accessLink.saveDueDiligenceResponse.useMutation({
    onSuccess: (data) => {
      toast.success('Resposta salva!', { duration: 1500 });
      refetchState();
      // Auto-avançar para próxima questão
      if (currentQuestionIndex < DUE_DILIGENCE_FRAMEWORK.length - 1) {
        setTimeout(() => {
          setCurrentQuestionIndex(prev => prev + 1);
          setShowCommentField(false);
          setShowEvidenceField(false);
          setCurrentNotes("");
          setCurrentEvidence("");
        }, 300);
      }
    },
    onError: (error) => {
      const msg = error.message || 'Erro ao salvar resposta';
      // Mensagem legível sem jargão técnico
      if (msg.includes('NOT_FOUND') || msg.includes('inválido')) {
        toast.error('Este link não é mais válido. Por favor, solicite um novo link.');
      } else if (msg.includes('FORBIDDEN') || msg.includes('expirado')) {
        toast.error('O prazo para responder expirou. Por favor, solicite um novo link.');
      } else if (msg.includes('concluída')) {
        toast.error('Esta avaliação já foi finalizada.');
      } else {
        toast.error('Não foi possível salvar. Tente novamente em alguns instantes.');
      }
    },
  });

  // Mutation para concluir avaliação (público, sem login)
  const completeMutation = trpc.accessLink.completeDueDiligence.useMutation({
    onSuccess: () => {
      setIsCompleted(true);
      toast.success('Avaliação concluída com sucesso!');
    },
    onError: (error) => {
      const msg = error.message || 'Erro ao concluir';
      if (msg.includes('Nenhuma resposta')) {
        toast.error('Por favor, responda pelo menos uma questão antes de concluir.');
      } else {
        toast.error('Não foi possível concluir. Tente novamente.');
      }
    },
  });

  // Respostas já salvas (vindas do servidor)
  const savedResponses = useMemo(() => {
    const map: Record<number, { level: number; notes?: string; evidenceUrls?: string[] }> = {};
    if (stateData?.responses) {
      for (const r of stateData.responses) {
        map[r.questionId!] = { 
          level: r.answer || 0, 
          notes: r.notes || undefined,
          evidenceUrls: Array.isArray(r.evidence) ? r.evidence as string[] : []
        };
      }
    }
    return map;
  }, [stateData?.responses]);

  const currentQuestion = DUE_DILIGENCE_FRAMEWORK[currentQuestionIndex];
  const currentSection = currentQuestion?.section || '';
  const answeredCount = Object.keys(savedResponses).length;
  const totalQuestions = DUE_DILIGENCE_FRAMEWORK.length;
  const currentSavedResponse = currentQuestion ? savedResponses[currentQuestion.id] : null;

  // Carregar notas/evidência quando mudar de questão
  useEffect(() => {
    if (currentSavedResponse) {
      setCurrentNotes(currentSavedResponse.notes || "");
      setCurrentEvidence(currentSavedResponse.evidenceUrls?.[0] || "");
    } else {
      setCurrentNotes("");
      setCurrentEvidence("");
    }
  }, [currentQuestionIndex, currentSavedResponse]);

  // Handler: 1 clique = salva e avança
  const handleSelectLevel = useCallback((level: number) => {
    if (!currentQuestion || saveMutation.isPending) return;
    
    saveMutation.mutate({
      token,
      questionId: currentQuestion.number,
      answer: level,
      notes: currentNotes || undefined,
      evidence: currentEvidence || undefined,
      responderName: responderInfo.name || undefined,
      responderEmail: responderInfo.email || undefined,
      responderRole: responderInfo.role || undefined,
    });
  }, [currentQuestion, token, currentNotes, currentEvidence, responderInfo, saveMutation]);

  // Atualizar resposta existente (quando adiciona comentário/evidência)
  const handleUpdateResponse = useCallback(() => {
    if (!currentQuestion || !currentSavedResponse) return;
    
    saveMutation.mutate({
      token,
      questionId: currentQuestion.number,
      answer: currentSavedResponse.level,
      notes: currentNotes || undefined,
      evidence: currentEvidence || undefined,
      responderName: responderInfo.name || undefined,
      responderEmail: responderInfo.email || undefined,
      responderRole: responderInfo.role || undefined,
    });
  }, [currentQuestion, currentSavedResponse, token, currentNotes, currentEvidence, responderInfo, saveMutation]);

  const handleComplete = useCallback(() => {
    if (answeredCount < totalQuestions) {
      toast.error(`Por favor, responda todas as ${totalQuestions} questões antes de concluir.`);
      return;
    }
    completeMutation.mutate({ token });
  }, [answeredCount, totalQuestions, token, completeMutation]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowCommentField(false);
      setShowEvidenceField(false);
    }
  }, [currentQuestionIndex]);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < DUE_DILIGENCE_FRAMEWORK.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowCommentField(false);
      setShowEvidenceField(false);
    }
  }, [currentQuestionIndex]);

  // Loading state
  if (loadingState) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-gradient-to-r from-violet-600 to-blue-600 py-4 px-6">
          <Skeleton className="h-8 w-48 bg-white/20" />
        </div>
        <div className="max-w-5xl mx-auto p-6">
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Error state - mensagem legível
  if (stateError || !stateData) {
    const errorMsg = stateError?.message || '';
    let userMessage = 'Este link não é válido ou já expirou.';
    if (errorMsg.includes('expirado')) {
      userMessage = 'O prazo para responder esta avaliação expirou.';
    } else if (errorMsg.includes('inválido')) {
      userMessage = 'Este link de avaliação não é válido.';
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold mb-2">Link Inválido ou Expirado</h2>
            <p className="text-slate-500 mb-4">{userMessage}</p>
            <p className="text-sm text-slate-400">
              Por favor, entre em contato com a empresa que enviou o link para solicitar um novo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed state
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <PartyPopper className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-lg font-semibold mb-2">Avaliação Concluída!</h2>
            <p className="text-slate-500 mb-4">
              Obrigado por responder a avaliação de conformidade. 
              Suas respostas foram registradas com sucesso.
            </p>
            <p className="text-sm text-slate-400">
              A empresa {stateData.organizationName} receberá os resultados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-blue-600 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <img 
            src="/logo-seusdados.png" 
            alt="Seusdados" 
            className="h-8 brightness-0 invert"
          />
          <div className="flex items-center gap-4">
            <span className="text-white/80 text-sm">
              {answeredCount} de {totalQuestions} questões
            </span>
            <Badge className="bg-white/20 text-white">
              {Math.round((answeredCount / totalQuestions) * 100)}% completo
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <div 
          className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-300"
          style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Questions List */}
          <div className="col-span-3">
            <div className="sticky top-6">
              <div className="mb-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Avaliação para</p>
                <p className="font-medium text-violet-600">{stateData.thirdPartyName}</p>
                <p className="text-sm text-slate-500">Solicitado por {stateData.organizationName}</p>
              </div>

              {/* Responder info toggle */}
              <button
                onClick={() => setShowResponderForm(!showResponderForm)}
                className="w-full text-left text-xs text-violet-600 hover:text-violet-700 mb-4 flex items-center gap-1"
              >
                <User className="h-3 w-3" />
                {showResponderForm ? 'Ocultar identificação' : 'Identificar-se (opcional)'}
              </button>

              {showResponderForm && (
                <div className="mb-4 p-3 bg-violet-50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-violet-500" />
                    <Input
                      placeholder="Seu nome"
                      value={responderInfo.name}
                      onChange={(e) => setResponderInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-violet-500" />
                    <Input
                      placeholder="Seu e-mail"
                      type="email"
                      value={responderInfo.email}
                      onChange={(e) => setResponderInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-violet-500" />
                    <Input
                      placeholder="Seu cargo"
                      value={responderInfo.role}
                      onChange={(e) => setResponderInfo(prev => ({ ...prev, role: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Questões</p>
              
              <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2">
                {Array.from(new Set(DUE_DILIGENCE_FRAMEWORK.map(q => q.section))).map((secao, sectionIndex) => {
                  const sectionQuestions = DUE_DILIGENCE_FRAMEWORK.filter(q => q.section === secao);
                  const sectionColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'];
                  const sectionColor = sectionColors[sectionIndex % sectionColors.length];
                  return (
                    <div key={secao} className="mb-3">
                      <div 
                        className="flex items-center gap-2 mb-1"
                        style={{ borderLeft: `3px solid ${sectionColor}`, paddingLeft: '8px' }}
                      >
                        <span className="text-xs font-medium" style={{ color: sectionColor }}>
                          {secao}
                        </span>
                      </div>
                      {sectionQuestions.map((q) => {
                        const isAnswered = !!savedResponses[q.id];
                        const isCurrent = currentQuestionIndex === DUE_DILIGENCE_FRAMEWORK.indexOf(q);
                        return (
                          <button
                            key={q.id}
                            onClick={() => {
                              setCurrentQuestionIndex(DUE_DILIGENCE_FRAMEWORK.indexOf(q));
                              setShowCommentField(false);
                              setShowEvidenceField(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                              isCurrent 
                                ? 'bg-violet-100 text-violet-700' 
                                : isAnswered 
                                  ? 'text-slate-600 hover:bg-slate-100' 
                                  : 'text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isAnswered && <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />}
                              <span className="truncate">Questão {q.number}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content - Question Card */}
          <div className="col-span-9">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                {/* Question Header */}
                <div className="mb-6">
                  <Badge 
                    className="mb-3"
                    style={{ backgroundColor: '#d4a853', color: '#1a2744' }}
                  >
                    QUESTÃO {currentQuestionIndex + 1} DE {totalQuestions}
                  </Badge>
                  
                  <p className="text-sm font-medium mb-2 text-violet-600">
                    {currentSection}
                  </p>
                  
                  <h2 className="text-2xl font-light text-slate-800 mb-4">
                    Questão {currentQuestion?.number}
                  </h2>
                  
                  <p className="text-slate-600 font-light leading-relaxed">
                    {currentQuestion?.question}
                  </p>
                </div>

                {/* Legal Info Toggle */}
                <div className="mb-6">
                  <button
                    onClick={() => setExpandedInfo(!expandedInfo)}
                    className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                  >
                    {expandedInfo ? '▼' : '▶'} Ver Fundamento Legal e Evidência Requerida
                  </button>
                  
                  {expandedInfo && (
                    <div className="mt-4 p-4 bg-violet-50 rounded-lg space-y-3">
                      <div>
                        <p className="text-sm font-medium text-amber-600">Fundamento Legal:</p>
                        <p className="text-sm text-slate-600">{currentQuestion?.intent}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-600">Evidência Requerida:</p>
                        <p className="text-sm text-slate-600">{currentQuestion?.help}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Response Options - Cards com 1 clique */}
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 mb-2">
                    Clique na opção que melhor descreve sua situação:
                  </p>
                  {currentQuestion?.options.map((opcao, index) => {
                    const level = opcao.level;
                    const isSelected = currentSavedResponse?.level === level;
                    
                    const levelColors = [
                      { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', badge: 'bg-green-500', hover: 'hover:border-green-400 hover:bg-green-50/50' },
                      { bg: 'bg-lime-50', border: 'border-lime-300', text: 'text-lime-700', badge: 'bg-lime-500', hover: 'hover:border-lime-400 hover:bg-lime-50/50' },
                      { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', badge: 'bg-yellow-500', hover: 'hover:border-yellow-400 hover:bg-yellow-50/50' },
                      { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-500', hover: 'hover:border-orange-400 hover:bg-orange-50/50' },
                      { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-500', hover: 'hover:border-red-400 hover:bg-red-50/50' },
                    ];
                    const colors = levelColors[index] || levelColors[4];
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleSelectLevel(level)}
                        disabled={saveMutation.isPending}
                        className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected 
                            ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-violet-300` 
                            : `bg-white border-slate-200 ${colors.hover}`
                        } ${saveMutation.isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                      >
                        <div 
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg ${colors.badge}`}
                        >
                          {String.fromCharCode(96 + level)}
                        </div>
                        <span className={`flex-1 ${isSelected ? colors.text : 'text-slate-600'}`}>
                          {opcao.text}
                        </span>
                        {isSelected && (
                          <CheckCircle className={`h-6 w-6 ${colors.text}`} />
                        )}
                        {saveMutation.isPending && !isSelected && (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Optional fields - Comment and Evidence */}
                {currentSavedResponse && (
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="flex gap-4 mb-3">
                      <button
                        onClick={() => setShowCommentField(!showCommentField)}
                        className={`text-sm flex items-center gap-1 ${showCommentField ? 'text-violet-600' : 'text-slate-500 hover:text-violet-600'}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {currentNotes ? 'Editar comentário' : 'Adicionar comentário (opcional)'}
                      </button>
                      <button
                        onClick={() => setShowEvidenceField(!showEvidenceField)}
                        className={`text-sm flex items-center gap-1 ${showEvidenceField ? 'text-violet-600' : 'text-slate-500 hover:text-violet-600'}`}
                      >
                        <LinkIcon className="h-4 w-4" />
                        {currentEvidence ? 'Editar evidência' : 'Adicionar evidência (opcional)'}
                      </button>
                    </div>

                    {showCommentField && (
                      <div className="mb-3">
                        <Textarea
                          placeholder="Adicione um comentário ou observação sobre esta resposta..."
                          value={currentNotes}
                          onChange={(e) => setCurrentNotes(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleUpdateResponse}
                          disabled={saveMutation.isPending}
                          className="mt-2"
                        >
                          Salvar comentário
                        </Button>
                      </div>
                    )}

                    {showEvidenceField && (
                      <div className="mb-3">
                        <Input
                          placeholder="URL da evidência (ex: link para documento, site, etc.)"
                          value={currentEvidence}
                          onChange={(e) => setCurrentEvidence(e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleUpdateResponse}
                          disabled={saveMutation.isPending}
                          className="mt-2"
                        >
                          Salvar evidência
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="border-violet-200 text-violet-600 hover:bg-violet-50"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>

                  <div className="flex gap-2">
                    {currentQuestionIndex === DUE_DILIGENCE_FRAMEWORK.length - 1 ? (
                      <Button
                        onClick={handleComplete}
                        disabled={completeMutation.isPending || answeredCount < totalQuestions}
                        className="bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                      >
                        {completeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Concluindo...
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Concluir Avaliação
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                      >
                        Próxima
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help text */}
            <p className="text-center text-sm text-slate-400 mt-4">
              Suas respostas são salvas automaticamente. Você pode fechar e retomar a qualquer momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
