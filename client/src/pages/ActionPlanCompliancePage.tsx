import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/contexts/ToastContext';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ActionPlanCompliancePage() {
  const { selectedOrganization } = useOrganization();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const toastCtx = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Determinar o organizationId efectivo: priorizar selectedOrganization, fallback para user.organizationId
  const effectiveOrgId = selectedOrganization?.id ?? user?.organizationId ?? null;

  // Carregar avaliações filtradas pela organização activa (endpoint exclusivo)
  const {
    data: assessmentsData,
    isLoading: assessmentsLoading,
    error: assessmentsError,
    refetch: refetchAssessments,
  } = trpc.assessments.listByOrganization.useQuery(
    { organizationId: effectiveOrgId! },
    { enabled: !!effectiveOrgId }
  );

  // Filtrar apenas avaliações de conformidade (compliance)
  const assessments = useMemo(() => {
    if (!assessmentsData) return [];
    
    const data = Array.isArray(assessmentsData) ? assessmentsData : (assessmentsData as any).json || [];
    
    return (data as any[]).filter(a => {
      return a.framework === 'seusdados' || a.framework === 'conformidade_lgpd' || a.framework === 'misto' || !a.type || a.type === 'compliance';
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [assessmentsData]);

  // Filtrar por termo de busca
  const filteredAssessments = useMemo(() => {
    if (!searchTerm) return assessments;
    
    const term = searchTerm.toLowerCase();
    return assessments.filter(a => 
      a.assessmentCode?.toLowerCase().includes(term) || 
      a.name?.toLowerCase().includes(term)
    );
  }, [assessments, searchTerm]);

  // Seleção automática se houver apenas 1 avaliação
  useEffect(() => {
    if (assessments.length === 1) {
      setLocation(`/avaliacoes/${assessments[0].id}/consultor?tab=plano-de-acao`);
    }
  }, [assessments, setLocation]);

  const handleRetry = () => {
    refetchAssessments();
  };

  const handleSelectAssessment = (assessmentId: number) => {
    setLocation(`/avaliacoes/${assessmentId}/consultor?tab=plano-de-acao`);
  };

  const isConsultor = ['admin_global', 'consultor'].includes(user?.role || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'bg-green-50 border-green-200';
      case 'em_andamento':
        return 'bg-blue-50 border-blue-200';
      case 'pendente_atribuicao':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'Concluída';
      case 'em_andamento':
        return 'Em andamento';
      case 'pendente_atribuicao':
        return 'Pendente';
      default:
        return status;
    }
  };

  // Estado sem organização seleccionada
  if (!effectiveOrgId) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              Selecione uma organização no seletor acima para visualizar as avaliações de conformidade.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Avaliações Seletor */}
        <>
          {/* Search Bar */}
          {assessments.length > 0 && (
            <div className="mb-6">
              <input
                type="text"
                placeholder="Buscar avaliação por código ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Loading State */}
          {assessmentsLoading ? (
            <Card className="bg-white border-slate-200">
              <CardContent className="pt-12 pb-12 flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-slate-600">Carregando avaliações...</span>
              </CardContent>
            </Card>
          ) : assessmentsError ? (
            /* Error State */
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <div className="flex items-center justify-between">
                  <span>Erro ao carregar avaliações. Tente novamente.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="ml-4"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : assessments.length === 0 ? (
            /* Empty State */
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                Nenhuma avaliação de conformidade disponível para esta organização. Crie uma avaliação para visualizar o plano de ação.
              </AlertDescription>
            </Alert>
          ) : (
            /* Avaliações Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssessments.map((assessment) => (
                <Card
                  key={assessment.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${getStatusColor(assessment.status)}`}
                  onClick={() => handleSelectAssessment(assessment.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{assessment.assessmentCode}</p>
                        <p className="text-sm text-slate-600 mt-1">{assessment.name}</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 ml-2" />
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <span className="text-xs font-medium text-slate-600">{getStatusLabel(assessment.status)}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(assessment.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      </div>
    </div>
  );
}
