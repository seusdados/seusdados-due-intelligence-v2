import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewAssessmentModal } from '@/components/NewAssessmentModal';
import { trpc } from '@/lib/trpc';
import { Plus, Eye, BarChart3, CheckCircle, Clock, AlertCircle, Target, Shield, TrendingUp, RefreshCw, Users } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// Cores dos domínios
const DOMAIN_COLORS: Record<string, string> = {
  'IA-01': '#7c3aed',
  'IA-02': '#2563eb',
  'IA-03': '#059669',
  'IA-04': '#dc2626',
  'IA-05': '#d97706',
  'IA-06': '#7c3aed',
  'IA-07': '#0891b2',
  'IA-08': '#4f46e5',
  'IA-09': '#be185d',
};

export default function UnifiedAssessments() {
  const [modalOpen, setModalOpen] = useState(false);
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { selectedOrganization } = useOrganization();
  const { user } = useAuth();
  const isInternalUser = user && ['admin_global', 'consultor'].includes(user.role);
  const isSponsor = user?.role === 'sponsor';
  const canAssignDomains = isInternalUser || isSponsor;
  
  // Abrir modal automaticamente se query param nova=true
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get('nova') === 'true') {
      setModalOpen(true);
      // Limpar query param da URL
      navigate('/avaliacoes', { replace: true });
    }
  }, [searchString, navigate]);

  // Buscar avaliações filtradas pela organização selecionada
  const { data: assessments = [], isLoading, refetch } = trpc.assessments.list.useQuery(
    selectedOrganization?.id ? { organizationId: selectedOrganization.id } : undefined
  );

  // Buscar média de maturidade por domínio (dados reais) filtrada pela organização
  const { data: maturityData, isLoading: isLoadingMaturity, refetch: refetchMaturity } = trpc.assessments.getDomainMaturityAverages.useQuery(
    selectedOrganization?.id ? { organizationId: selectedOrganization.id } : undefined
  );

  // Buscar estatísticas filtradas pela organização
  const { data: stats } = trpc.assessments.getStats.useQuery(
    selectedOrganization?.id ? { organizationId: selectedOrganization.id } : undefined
  );

  // Extrair dados de maturidade
  const domains = maturityData?.domains || [];
  const overallAverage = maturityData?.overallAverage || 0;
  const totalResponses = maturityData?.totalResponses || 0;

  // Configuração do gráfico radar
  const radarData = {
    labels: domains.map(d => d.name),
    datasets: [
      {
        label: 'Nível de Maturidade',
        data: domains.map(d => d.average),
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
        borderColor: 'rgba(124, 58, 237, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(124, 58, 237, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(124, 58, 237, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 5,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: { size: 10 },
          color: '#6b7280',
          backdropColor: 'transparent',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.3)',
        },
        angleLines: {
          color: 'rgba(156, 163, 175, 0.3)',
        },
        pointLabels: {
          font: { size: 11, weight: 500 },
          color: '#374151',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        titleFont: { size: 13, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const value = context.raw || 0;
            const levelNames = ['Inexistente', 'Inicial', 'Básico', 'Intermediário', 'Avançado', 'Otimizado'];
            const levelIndex = Math.round(value);
            return `Nível ${value.toFixed(1)}: ${levelNames[levelIndex] || 'N/A'}`;
          },
        },
      },
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente_atribuicao':
      case 'programada':
        return 'bg-amber-100 text-amber-800';
      case 'em_andamento':
      case 'iniciada':
        return 'bg-blue-100 text-blue-800';
      case 'concluida':
        return 'bg-green-100 text-green-800';
      case 'arquivada':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente_atribuicao':
      case 'programada':
        return 'Pendente de Atribuição';
      case 'em_andamento':
      case 'iniciada':
        return 'Em Andamento';
      case 'concluida':
        return 'Concluída';
      case 'arquivada':
        return 'Arquivada';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente_atribuicao':
      case 'programada':
        return <Clock className="w-4 h-4" />;
      case 'em_andamento':
      case 'iniciada':
        return <AlertCircle className="w-4 h-4" />;
      case 'concluida':
        return <CheckCircle className="w-4 h-4" />;
      case 'arquivada':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Determinar nível de maturidade geral
  const getMaturityLevel = (avg: number) => {
    if (avg === 0) return { label: 'Não avaliado', color: 'text-gray-500' };
    if (avg < 1) return { label: 'Inexistente', color: 'text-red-600' };
    if (avg < 2) return { label: 'Inicial', color: 'text-orange-600' };
    if (avg < 3) return { label: 'Básico', color: 'text-yellow-600' };
    if (avg < 4) return { label: 'Intermediário', color: 'text-green-600' };
    if (avg < 5) return { label: 'Avançado', color: 'text-blue-600' };
    return { label: 'Otimizado', color: 'text-purple-600' };
  };

  const maturityLevel = getMaturityLevel(overallAverage);

  // Função para atualizar dados
  const handleRefresh = () => {
    refetch();
    refetchMaturity();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Avaliações de Conformidade</h1>
          <p className="text-gray-600 mt-1">
            Gerencie avaliações de maturidade LGPD e conformidade regulatória
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
          {/* Botão "Nova Avaliação" - Visível apenas para Admin Global e Consultor */}
          {isInternalUser && (
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Avaliação
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Pendentes de Atribuição</div>
          <div className="text-2xl font-bold text-amber-600">
            {stats?.pendentes_atribuicao || assessments.filter((a: any) => a.status === 'pendente_atribuicao' || a.status === 'programada').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Em Andamento</div>
          <div className="text-2xl font-bold text-blue-600">
            {stats?.em_andamento || assessments.filter((a: any) => a.status === 'em_andamento' || a.status === 'iniciada').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Concluídas</div>
          <div className="text-2xl font-bold text-green-600">
            {stats?.concluidas || assessments.filter((a: any) => a.status === 'concluida').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Arquivadas</div>
          <div className="text-2xl font-bold text-purple-600">
            {stats?.arquivadas || assessments.filter((a: any) => a.status === 'arquivada').length}
          </div>
        </Card>
      </div>

      {/* Dashboard Section with Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Maturidade por Domínio</h2>
              <p className="text-sm text-gray-500 mt-1">
                {totalResponses === 0 
                  ? 'Crie sua primeira avaliação para visualizar os resultados'
                  : `Baseado em ${totalResponses} respostas de avaliações concluídas`
                }
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <Target className="w-5 h-5 text-purple-600" />
                <span className="text-2xl font-bold text-purple-600">{overallAverage.toFixed(1)}</span>
                <span className="text-sm text-gray-500">/5</span>
              </div>
              <p className={`text-sm font-medium ${maturityLevel.color}`}>
                {maturityLevel.label}
              </p>
            </div>
          </div>
          
          <div className="h-[350px] relative">
            {isLoadingMaturity ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <Radar data={radarData} options={radarOptions} />
            )}
            
            {/* Overlay quando não há dados */}
            {!isLoadingMaturity && totalResponses === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                <div className="text-center">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Nenhuma avaliação concluída</p>
                  <p className="text-sm text-gray-400 mt-1">Os dados aparecerão aqui após concluir uma avaliação</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Legenda dos níveis */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-3 justify-center text-xs">
              {['Inexistente', 'Inicial', 'Básico', 'Intermediário', 'Avançado', 'Otimizado'].map((level, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ 
                      backgroundColor: idx === 0 ? '#ef4444' : 
                                       idx === 1 ? '#f97316' : 
                                       idx === 2 ? '#eab308' : 
                                       idx === 3 ? '#22c55e' : 
                                       idx === 4 ? '#3b82f6' : '#7c3aed' 
                    }}
                  />
                  <span className="text-gray-600">{idx}: {level}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Resumo de Domínios */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Domínios de Avaliação</h2>
            {totalResponses > 0 && (
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                <TrendingUp className="w-3 h-3 mr-1" />
                {totalResponses} respostas
              </Badge>
            )}
          </div>
          <div className="space-y-3">
            {domains.map((domain) => (
              <div key={domain.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: DOMAIN_COLORS[domain.id] || '#6b7280' }}
                  >
                    {domain.id.split('-')[1]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{domain.name}</p>
                    <p className="text-xs text-gray-500">
                      {domain.id} • {domain.responseCount} respostas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Círculos de nível */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          level <= Math.round(domain.average)
                            ? 'bg-purple-600'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-12 text-right">
                    {domain.average.toFixed(1)}/5
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Assessments List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Avaliações</h2>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Carregando avaliações...</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Nenhuma avaliação criada ainda</p>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Criar Primeira Avaliação
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((assessment: any) => (
              <div
                key={assessment.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assessment.assessmentCode || assessment.name}
                      </h3>
                      <Badge className={`flex items-center gap-1 ${getStatusColor(assessment.status)}`}>
                        {getStatusIcon(assessment.status)}
                        {getStatusLabel(assessment.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span>Framework: {assessment.framework}</span>
                      <span>•</span>
                      <span>Prazo: {new Date(assessment.deadline).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 ml-4 flex-wrap">
                    {/* Botão Ver Detalhes - Sempre visível, independente do status */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/avaliacoes/${assessment.id}`)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Detalhes
                    </Button>

                    {/* Botão Atribuir Domínios - Visível para Admin/Consultor e Sponsor */}
                    {canAssignDomains && ['pendente_atribuicao', 'programada', 'aguardando_vinculacao', 'iniciada', 'em_andamento'].includes(assessment.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/avaliacoes/${assessment.id}/atribuir`)}
                        className="flex items-center gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                      >
                        <Users className="w-4 h-4" />
                        Atribuir Domínios
                      </Button>
                    )}

                    {/* Botão Analisar: visível para todos os perfis quando avaliação está concluída */}
                    {assessment.status === 'concluida' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/avaliacoes/${assessment.id}/consultor`)}
                        className="flex items-center gap-1"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Analisar
                      </Button>
                    )}

                    {assessment.status === 'arquivada' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/avaliacoes/${assessment.id}/dashboard`)}
                        className="flex items-center gap-1"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Resultados
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* New Assessment Modal */}
      <NewAssessmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          refetch();
          refetchMaturity();
        }}
      />
    </div>
  );
}
