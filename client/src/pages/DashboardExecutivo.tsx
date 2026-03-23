import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft,
  AlertTriangle,
  Shield,
  FileCheck,
  Users,
  Clock,
  CheckCircle,
  BarChart3,
  Activity,
  Target,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { useMemo } from "react";
import { StatCard, InfoCard, CardGrid, SectionHeader } from "@/components/DashboardCard";

/* =============================================
   Gráfico de barras simples
   ============================================= */
function SimpleBarChart({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue?: number }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-light">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =============================================
   Gráfico de linha simples
   ============================================= */
function SimpleLineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d.value), 5);
  const minValue = Math.min(...data.map(d => d.value), 1);
  const range = maxValue - minValue || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = 100 - ((d.value - minValue) / range) * 80 - 10;
    return { x, y, ...d };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <div className="relative h-48">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" className="text-muted" strokeWidth="0.3" />
        ))}
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L 100 100 L 0 100 Z`} fill="url(#areaGradient)" />
        <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="#8b5cf6" stroke="white" strokeWidth="0.5" />
        ))}
      </svg>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        {data.map((d, i) => (
          <span key={i} className="text-center" style={{ width: `${100 / data.length}%` }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/* =============================================
   Indicador de maturidade
   ============================================= */
function MaturityIndicator({ level, score }: { level: number | null; score: number | null }) {
  const levels = [
    { name: 'Inicial', color: '#ef4444', bg: '#fef2f2' },
    { name: 'Básico', color: '#f97316', bg: '#fff7ed' },
    { name: 'Definido', color: '#eab308', bg: '#fefce8' },
    { name: 'Gerenciado', color: '#22c55e', bg: '#f0fdf4' },
    { name: 'Otimizado', color: '#3b82f6', bg: '#eff6ff' },
  ];
  const currentLevel = level ? levels[level - 1] : null;
  return (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center border-4"
          style={{ borderColor: currentLevel?.color || '#e2e8f0', backgroundColor: currentLevel?.bg || '#f8fafc' }}>
          <span className="text-4xl font-extralight" style={{ color: currentLevel?.color || '#64748b' }}>
            {level || '-'}
          </span>
        </div>
        <p className="mt-2 text-sm font-medium" style={{ color: currentLevel?.color || '#64748b' }}>
          {currentLevel?.name || 'Não avaliado'}
        </p>
      </div>
      <div className="flex-1">
        <div className="flex gap-1">
          {levels.map((l, i) => (
            <div key={i} className="flex-1 h-3 rounded-full transition-all"
              style={{ backgroundColor: level && i < level ? l.color : '#e2e8f0', opacity: level && i < level ? 1 : 0.3 }} />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
        </div>
        {score !== null && (
          <p className="mt-3 text-sm text-muted-foreground">
            Pontuação geral: <span className="font-medium text-foreground">{score}%</span>
          </p>
        )}
      </div>
    </div>
  );
}

/* =============================================
   Dashboard Executivo
   ============================================= */
export default function DashboardExecutivo() {
  const { user } = useAuth();
  const params = useParams<{ organizationId: string }>();
  const organizationId = parseInt(params.organizationId || "0");
  const [, setLocation] = useLocation();

  const { data: organization, isLoading: loadingOrg } = trpc.organization.getById.useQuery(
    { id: organizationId },
    { enabled: !!organizationId }
  );

  const { data: dashboardData, isLoading: loadingDashboard } = trpc.executiveDashboard.getData.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: recentAssessments } = trpc.executiveDashboard.getRecentAssessments.useQuery(
    { organizationId, limit: 5 },
    { enabled: !!organizationId }
  );

  // Preparar dados para gráficos
  const riskDistributionData = useMemo(() => {
    if (!dashboardData?.riskDistribution) return [];
    const colors: Record<string, string> = { baixo: '#22c55e', moderado: '#eab308', alto: '#f97316', critico: '#ef4444' };
    const labels: Record<string, string> = { baixo: 'Baixo', moderado: 'Moderado', alto: 'Alto', critico: 'Crítico' };
    return Object.entries(dashboardData.riskDistribution.thirdParties || {}).map(([key, value]) => ({
      label: labels[key] || key, value: value as number, color: colors[key] || '#64748b',
    }));
  }, [dashboardData]);

  const maturityEvolutionData = useMemo(() => {
    if (!dashboardData?.maturityEvolution) return [];
    return dashboardData.maturityEvolution.map(item => ({
      label: new Date(item.completedAt!).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      value: item.maturityLevel || 0,
    }));
  }, [dashboardData]);

  const pendingActionsByPriorityData = useMemo(() => {
    if (!dashboardData?.pendingActions?.byPriority) return [];
    const colors: Record<string, string> = { critica: '#ef4444', alta: '#f97316', media: '#eab308', baixa: '#22c55e' };
    const labels: Record<string, string> = { critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
    return Object.entries(dashboardData.pendingActions.byPriority).map(([key, value]) => ({
      label: labels[key] || key, value: value as number, color: colors[key] || '#64748b',
    }));
  }, [dashboardData]);

  if (loadingOrg || loadingDashboard) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64 mb-8" />
        <CardGrid columns={4}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </CardGrid>
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!organization || !dashboardData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-lg font-semibold mb-2">Dados não disponíveis</h2>
            <Button onClick={() => setLocation(`/cliente/${organizationId}`)}>
              Voltar ao Painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { kpis, criticalRiskThirdParties, pendingActions } = dashboardData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/cliente/${organizationId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-lg">
            <BarChart3 className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Painel Executivo</p>
            <h1 className="text-2xl font-light">{organization.tradeName || organization.name}</h1>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-violet-500 to-blue-500 text-white border-0">
          Visão Executiva
        </Badge>
      </div>

      {/* KPI Cards — Padronizados */}
      <SectionHeader title="Indicadores Principais" subtitle="Resumo executivo do programa de privacidade" />
      <CardGrid columns={4}>
        <StatCard icon={FileCheck} iconGradient="violet"
          value={`${kpis.completedComplianceAssessments}/${kpis.totalComplianceAssessments}`}
          label="Conformidade" subtitle="avaliações concluídas" />
        <StatCard icon={Shield} iconGradient="blue"
          value={`${kpis.completedThirdPartyAssessments}/${kpis.totalThirdPartyAssessments}`}
          label="Diligência" subtitle="avaliações concluídas" />
        <StatCard icon={Users} iconGradient="teal"
          value={kpis.totalThirdParties} label="Terceiros" subtitle="cadastrados" />
        <StatCard icon={Clock} iconGradient="amber"
          value={kpis.pendingLinks} label="Vínculos Pendentes" subtitle="aguardando resposta" />
      </CardGrid>

      {/* Maturidade */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard icon={Target} iconGradient="violet" title="Nível de Maturidade Atual"
          subtitle="Baseado na última avaliação de conformidade" className="!min-h-0 !h-auto">
          <MaturityIndicator level={kpis.currentMaturityLevel} score={kpis.currentMaturityScore} />
        </InfoCard>

        <InfoCard icon={Activity} iconGradient="blue" title="Evolução da Maturidade"
          subtitle="Histórico das últimas avaliações" className="!min-h-0 !h-auto">
          {maturityEvolutionData.length > 0 ? (
            <SimpleLineChart data={maturityEvolutionData} />
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Nenhuma avaliação concluída ainda
            </div>
          )}
        </InfoCard>
      </div>

      {/* Riscos e Terceiros Críticos */}
      <div className="grid gap-6 lg:grid-cols-3">
        <InfoCard icon={BarChart3} iconGradient="amber" title="Distribuição de Riscos"
          subtitle="Terceiros por classificação" className="!min-h-0 !h-auto">
          {riskDistributionData.length > 0 ? (
            <SimpleBarChart data={riskDistributionData} />
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
              Nenhum terceiro classificado
            </div>
          )}
        </InfoCard>

        <InfoCard icon={AlertTriangle} iconGradient="red" title="Terceiros com Risco Crítico/Alto"
          badge={{ text: `${criticalRiskThirdParties.length} encontrados`, variant: 'danger' }}
          className="lg:col-span-2 !min-h-0 !h-auto">
          {criticalRiskThirdParties.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {criticalRiskThirdParties.map((tp) => (
                <div key={tp.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${tp.riskLevel === 'critico' ? 'bg-red-500' : 'bg-orange-500'}`} />
                    <div>
                      <p className="text-sm font-medium">{tp.name}</p>
                      <p className="text-xs text-muted-foreground">{tp.cnpj || 'Documento não informado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline"
                      className={tp.riskLevel === 'critico' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>
                      {tp.riskLevel === 'critico' ? 'Crítico' : 'Alto'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 text-green-400" />
              <p className="text-sm">Nenhum terceiro com risco crítico ou alto</p>
            </div>
          )}
        </InfoCard>
      </div>

      {/* Ações Pendentes */}
      <div className="grid gap-6 lg:grid-cols-3">
        <InfoCard icon={AlertCircle} iconGradient="amber" title="Ações Pendentes"
          subtitle="Por nível de prioridade" className="!min-h-0 !h-auto">
          {pendingActionsByPriorityData.length > 0 ? (
            <SimpleBarChart data={pendingActionsByPriorityData} />
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 text-green-400" />
              <p className="text-sm">Nenhuma ação pendente</p>
            </div>
          )}
        </InfoCard>

        <InfoCard icon={Clock} iconGradient="blue" title="Ações com Prazo Próximo"
          badge={{ text: 'Próximos 30 dias', variant: 'default' }}
          className="lg:col-span-2 !min-h-0 !h-auto">
          {pendingActions.upcoming && pendingActions.upcoming.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingActions.upcoming.map((action) => {
                const dueDate = new Date(action.dueDate!);
                const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntilDue < 0;
                const isUrgent = daysUntilDue <= 7 && !isOverdue;
                return (
                  <div key={action.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div>
                        <p className="text-sm font-medium">{action.title}</p>
                        <p className="text-xs text-muted-foreground">Prazo: {dueDate.toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <Badge variant="outline"
                      className={isOverdue ? 'bg-red-50 text-red-700 border-red-200' : isUrgent ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                      {isOverdue ? `${Math.abs(daysUntilDue)} dias atrasado` : `${daysUntilDue} dias`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 text-green-400" />
              <p className="text-sm">Nenhuma ação com prazo próximo</p>
            </div>
          )}
        </InfoCard>
      </div>

      {/* Avaliações Recentes */}
      <InfoCard icon={FileCheck} iconGradient="violet" title="Avaliações Recentes"
        headerAction={
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/cliente/${organizationId}/historico`)}>
            Ver histórico completo <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        }
        className="!min-h-0 !h-auto">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Conformidade</p>
            {recentAssessments?.compliance && recentAssessments.compliance.length > 0 ? (
              <div className="space-y-2">
                {recentAssessments.compliance.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <Badge variant="outline"
                      className={a.status === 'concluida' ? 'bg-green-50 text-green-700 border-green-200' : a.status === 'em_andamento' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-muted text-muted-foreground'}>
                      {a.status === 'concluida' ? 'Concluída' : a.status === 'em_andamento' ? 'Em andamento' : 'Rascunho'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma avaliação</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Diligência</p>
            {recentAssessments?.thirdParty && recentAssessments.thirdParty.length > 0 ? (
              <div className="space-y-2">
                {recentAssessments.thirdParty.slice(0, 3).map((item) => (
                  <div key={item.assessment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{item.thirdParty?.name || 'Terceiro'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.assessment.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <Badge variant="outline"
                      className={item.assessment.status === 'concluida' ? 'bg-green-50 text-green-700 border-green-200' : item.assessment.status === 'em_andamento' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-muted text-muted-foreground'}>
                      {item.assessment.status === 'concluida' ? 'Concluída' : item.assessment.status === 'em_andamento' ? 'Em andamento' : 'Rascunho'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma avaliação</p>
            )}
          </div>
        </div>
      </InfoCard>
    </div>
  );
}
