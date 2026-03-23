import { useState, useCallback } from 'react';

interface Evidence {
  id: string;
  type: 'pdf' | 'link';
  value: string;
  fileName?: string;
  uploadedAt: Date;
}

interface Question {
  id: string;
  domain: string;
  title: string;
  requiredEvidenceType: 'pdf' | 'link' | 'both';
  requiredEvidenceCount: number;
  evidences: Evidence[];
}

interface FinalizationState {
  canFinalize: boolean;
  pendingQuestions: Question[];
  totalEvidencesRequired: number;
  totalEvidencesUploaded: number;
  progressPercent: number;
}

/**
 * Hook para gerenciar o fluxo de finalização de avaliações
 * Valida se todas as evidências obrigatórias foram anexadas
 */
export function useAssessmentFinalization(questions: Question[]) {
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  /**
   * Calcular estado de finalização
   */
  const calculateFinalizationState = useCallback((): FinalizationState => {
    const pendingQuestions = questions.filter(q => q.evidences.length < q.requiredEvidenceCount);

    const totalEvidencesRequired = questions.reduce((sum, q) => sum + q.requiredEvidenceCount, 0);
    const totalEvidencesUploaded = questions.reduce((sum, q) => sum + q.evidences.length, 0);

    const progressPercent =
      totalEvidencesRequired > 0 ? Math.round((totalEvidencesUploaded / totalEvidencesRequired) * 100) : 100;

    return {
      canFinalize: pendingQuestions.length === 0,
      pendingQuestions,
      totalEvidencesRequired,
      totalEvidencesUploaded,
      progressPercent,
    };
  }, [questions]);

  /**
   * Tentar finalizar avaliação
   * Se houver pendências, mostra modal bloqueado
   */
  const tryFinalize = useCallback(
    (onSuccess?: () => void) => {
      const state = calculateFinalizationState();

      if (state.canFinalize) {
        // Todas as evidências foram anexadas
        onSuccess?.();
        return true;
      } else {
        // Mostrar modal bloqueado
        setShowBlockedModal(true);
        return false;
      }
    },
    [calculateFinalizationState]
  );

  /**
   * Adicionar evidência a uma questão
   */
  const addEvidence = useCallback(
    (questionId: string, evidence: Omit<Evidence, 'uploadedAt'>) => {
      const question = questions.find(q => q.id === questionId);
      if (question) {
        question.evidences.push({
          ...evidence,
          uploadedAt: new Date(),
        });
      }
    },
    [questions]
  );

  /**
   * Remover evidência de uma questão
   */
  const removeEvidence = useCallback(
    (questionId: string, evidenceId: string) => {
      const question = questions.find(q => q.id === questionId);
      if (question) {
        question.evidences = question.evidences.filter(e => e.id !== evidenceId);
      }
    },
    [questions]
  );

  /**
   * Validar se uma questão tem todas as evidências obrigatórias
   */
  const isQuestionComplete = useCallback(
    (questionId: string): boolean => {
      const question = questions.find(q => q.id === questionId);
      if (!question) return false;

      return question.evidences.length >= question.requiredEvidenceCount;
    },
    [questions]
  );

  /**
   * Obter lista de questões pendentes
   */
  const getPendingQuestions = useCallback(() => {
    return questions.filter(q => q.evidences.length < q.requiredEvidenceCount);
  }, [questions]);

  /**
   * Obter progresso geral
   */
  const getProgress = useCallback(() => {
    return calculateFinalizationState();
  }, [calculateFinalizationState]);

  return {
    // Estado
    showBlockedModal,
    setShowBlockedModal,

    // Métodos
    tryFinalize,
    addEvidence,
    removeEvidence,
    isQuestionComplete,
    getPendingQuestions,
    getProgress,

    // Dados computados
    finalizationState: calculateFinalizationState(),
  };
}

/**
 * Hook para gerenciar upload de evidências
 */
export function useEvidenceUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Upload de arquivo PDF
   */
  const uploadPDF = async (file: File, questionId: string): Promise<string | null> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Validar arquivo
      if (file.type !== 'application/pdf') {
        throw new Error('Apenas arquivos PDF são aceitos');
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo: 10MB');
      }

      // Simular upload para S3
      // Em produção, isso chamaria um endpoint tRPC
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Retornar URL do S3
      const s3Url = `s3://meudpo/avaliacoes/${questionId}/${file.name}`;
      return s3Url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer upload';
      setUploadError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Validar link
   */
  const validateLink = (link: string): boolean => {
    try {
      new URL(link);
      return true;
    } catch {
      setUploadError('URL inválida. Certifique-se de incluir http:// ou https://');
      return false;
    }
  };

  /**
   * Limpar erro
   */
  const clearError = () => {
    setUploadError(null);
  };

  return {
    isUploading,
    uploadError,
    uploadPDF,
    validateLink,
    clearError,
  };
}
