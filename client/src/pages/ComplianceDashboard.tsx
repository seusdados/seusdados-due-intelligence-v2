import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  AlertCircle,
  Calendar,
  RefreshCw,
  Activity,
  Target,
  Gauge,
  ArrowRight,
  FileCheck,
  ClipboardList
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { ActivityTimeline, Activity as TimelineActivity } from '@/components/ActivityTimeline';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { StatCard, InfoCard, ModuleCard, ActionCard, CardGrid, SectionHeader } from '@/components/DashboardCard';

export default function ComplianceDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>(
    user?.organizationId || undefined
  );

  // Queries
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = trpc.dpia.getComplianceMetrics.useQuery(
    { organizationId: selectedOrgId },
    { enabled: !!selectedOrgId }
  );

  const { data: activities, isLoading: activitiesLoading } = trpc.dpia.getRecentActivities.useQuery(
    { organizationId: selectedOrgId, limit: 10 },
    { enabled: !!selectedOrgId }
  );

  const { data: organizations } = trpc.organization.list.useQuery(undefined, {
    enabled: user?.role === 'admin_global' || user?.role === 'consultor'
  });

  const getComplianceLevelColor = (level: string) => {
    switch (level) {
      case 'excelente': return 'bg-green-500';
      case 'alto': return 'bg-blue-500';
      case 'moderado': return 'bg-yellow-500';
      case 'baixo': return 'bg-orange-500';
      case 'critico': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplianceLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      excelente: 'Excelente',
      alto: 'Alto',
      moderado: 'Moderado',
      baixo: 'Baixo',
      critico: 'Crítico'
    };
    return labels[level] || level;
  };

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <SectionHeader
          title="Painel de Conformidade"
          subtitle="Visão consolidada de DPIA, ROPA e Revisões Periódicas"
        />
        
        <div className="flex items-center gap-3">
          {(user?.role === 'admin_global' || user?.role === 'consultor') && organizations && (
            <Select
              value={selectedOrgId?.toString()}
              onValueChange={(value) => setSelectedOrgId(parseInt(value))}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecionar organização" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org: any) => (
                  <SelectItem key={org.id} value={org.id.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={() => refetchMetrics()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Score Geral */}
          <InfoCard
            icon={TrendingUp}
            iconGradient="violet"
            title="Nível de Conformidade"
            subtitle="Baseado em DPIAs aprovados, ROTs documentados e revisões em dia"
            badge={{
              text: getComplianceLevelLabel(metrics.complianceLevel),
              variant: metrics.complianceLevel === 'critico' ? 'danger' : 
                       metrics.complianceLevel === 'baixo' ? 'warning' : 'success'
            }}
          >
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="none" className="text-muted/20" />
                    <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="none"
                      strokeDasharray={`${metrics.overallScore * 3.01} 302`}
                      className={getComplianceLevelColor(metrics.complianceLevel).replace('bg-', 'text-')}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-semibold">{metrics.overallScore}%</span>
                    <span className="text-xs text-muted-foreground">Score</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center flex-1">
                <div>
                  <div className="text-2xl font-semibold text-violet-600">{metrics.dpia.total}</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">DPIAs</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-blue-600">{metrics.ropa.total}</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">ROTs</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-emerald-600">{metrics.reviews.completedThisMonth}</div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Revisões/Mês</div>
                </div>
              </div>
            </div>
          </InfoCard>

          {/* Alertas */}
          {(metrics.dpia.criticalRisks > 0 || metrics.reviews.overdue > 0) && (
            <InfoCard
              icon={AlertTriangle}
              iconGradient="red"
              title="Atenção Necessária"
              badge={{ text: 'Urgente', variant: 'danger' }}
            >
              <div className="flex flex-wrap gap-4">
                {metrics.dpia.criticalRisks > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 rounded-lg px-4 py-2 border border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-700">{metrics.dpia.criticalRisks} riscos críticos</span>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/dpia')}>
                      Ver <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
                {metrics.reviews.overdue > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 rounded-lg px-4 py-2 border border-red-200">
                    <Clock className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-700">{metrics.reviews.overdue} revisões vencidas</span>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/dpia')}>
                      Ver <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </InfoCard>
          )}

          {/* Cards de Módulos */}
          <CardGrid columns={3}>
            <ModuleCard
              icon={Shield}
              gradient="conformidade"
              tag="DPIA"
              title="Avaliações de Impacto"
              metrics={[
                { value: metrics.dpia.approved, label: 'Aprovados' },
                { value: metrics.dpia.inProgress, label: 'Em Andamento' },
                { value: metrics.dpia.pendingReview, label: 'Pendentes' },
                { value: metrics.dpia.criticalRisks, label: 'Críticos' },
              ]}
              buttons={[
                { label: 'Acessar', onClick: () => navigate('/dpia') }
              ]}
            />

            <ModuleCard
              icon={FileText}
              gradient="contratos"
              tag="ROPA"
              title="Registros de Tratamento"
              metrics={[
                { value: metrics.ropa.aprovado, label: 'Aprovados' },
                { value: metrics.ropa.emRevisao, label: 'Em Revisão' },
                { value: metrics.ropa.rascunho, label: 'Rascunho' },
                { value: metrics.ropa.withSensitiveData, label: 'Sensíveis' },
              ]}
              buttons={[
                { label: 'Acessar', onClick: () => navigate('/mapeamentos') }
              ]}
            />

            <ModuleCard
              icon={Calendar}
              gradient="maturidade"
              tag="Revisões"
              title="Revisões Periódicas"
              metrics={[
                { value: metrics.reviews.completedThisMonth, label: 'Concluídas' },
                { value: metrics.reviews.pending, label: 'Pendentes' },
                { value: metrics.reviews.overdue, label: 'Vencidas' },
                { value: metrics.reviews.upcomingThisWeek, label: 'Esta Semana' },
              ]}
              buttons={[
                { label: 'Acessar', onClick: () => navigate('/dpia') }
              ]}
            />
          </CardGrid>

          {/* Atividades Recentes */}
          <InfoCard
            icon={Activity}
            iconGradient="indigo"
            title="Atividades Recentes"
            subtitle="Últimas atualizações de conformidade"
          >
            {activitiesLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ActivityTimeline 
                activities={(activities || []).map((activity: any) => ({
                  id: `${activity.type}-${activity.id}`,
                  type: activity.type === 'dpia' ? 'dpia_generated' : 
                        activity.type === 'ropa' ? 'document_uploaded' : 
                        'review_completed',
                  title: activity.title,
                  description: activity.description,
                  date: activity.createdAt,
                } as TimelineActivity))}
                maxItems={10}
                emptyMessage="Nenhuma atividade recente"
              />
            )}
          </InfoCard>

          {/* Ações Rápidas */}
          <SectionHeader title="Ações Rápidas" />
          <CardGrid columns={4}>
            <ActionCard
              icon={Shield}
              iconGradient="violet"
              title="Novo DPIA"
              description="Criar avaliação de impacto"
              actionLabel="Criar"
              onAction={() => navigate('/dpia')}
            />
            <ActionCard
              icon={FileText}
              iconGradient="blue"
              title="Novo ROT"
              description="Registrar tratamento"
              actionLabel="Criar"
              onAction={() => navigate('/mapeamentos/novo')}
            />
            <ActionCard
              icon={FileCheck}
              iconGradient="emerald"
              title="Exportar ROPA"
              description="Gerar relatório"
              actionLabel="Exportar"
              onAction={() => navigate('/mapeamento/ropa-export')}
            />
            <ActionCard
              icon={ClipboardList}
              iconGradient="amber"
              title="Plano de Ação"
              description="Gerenciar planos"
              actionLabel="Acessar"
              onAction={() => navigate('/plano-acao')}
            />
          </CardGrid>
        </>
      )}

      {!selectedOrgId && (
        <InfoCard
          icon={Gauge}
          iconGradient="violet"
          title="Selecione uma Organização"
          subtitle="Escolha uma organização para visualizar as métricas de conformidade"
        >
          <div className="flex items-center justify-center h-32">
            <Gauge className="h-16 w-16 text-muted-foreground opacity-30" />
          </div>
        </InfoCard>
      )}
    </div>
  );
}
