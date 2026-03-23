import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, InfoCard, CardGrid, SectionHeader } from "@/components/DashboardCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  RefreshCw,
  Timer,
  Target,
  AlertCircle
} from "lucide-react";

// Tipos
type SLAAlertLevel = 'warning' | 'critical' | 'breached';

interface SLAAlert {
  ticketId?: number;
  ticketNumber?: string;
  title?: string;
  organizationName?: string;
  assignedTo?: string;
  deadline?: string;
  hoursRemaining?: number;
  alertLevel?: SLAAlertLevel;
  slaLevel?: string;
  priority?: string;
}

interface SLAMetrics {
  total: number;
  onTime: number;
  atRisk: number;
  breached: number;
  averageResponseTime: number;
  complianceRate: number;
}

// MetricCard removido - usando StatCard do DashboardCard

// Componente de gráfico de pizza simples (CSS)
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Sem dados disponíveis
      </div>
    );
  }

  let currentAngle = 0;
  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const startAngle = currentAngle;
    currentAngle += (percentage / 100) * 360;
    return { ...item, percentage, startAngle, endAngle: currentAngle };
  });

  // Criar gradiente cônico para o gráfico
  const conicGradient = segments
    .map((seg) => `${seg.color} ${seg.startAngle}deg ${seg.endAngle}deg`)
    .join(", ");

  return (
    <div className="flex items-center gap-6">
      <div
        className="w-32 h-32 rounded-full"
        style={{
          background: `conic-gradient(${conicGradient})`,
        }}
      />
      <div className="space-y-2">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-medium">{seg.value} ({seg.percentage.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de barra de progresso
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

// Componente de alerta de SLA
function AlertItem({ alert }: { alert: SLAAlert }) {
  const getAlertStyle = (level: SLAAlertLevel) => {
    switch (level) {
      case 'breached':
        return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500', badge: 'destructive' as const };
      case 'critical':
        return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500', badge: 'default' as const };
      case 'warning':
        return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-500', badge: 'secondary' as const };
    }
  };

  const style = getAlertStyle(alert.alertLevel);
  const Icon = alert.alertLevel === 'breached' ? XCircle : alert.alertLevel === 'critical' ? AlertTriangle : Clock;

  return (
    <div className={`p-4 rounded-lg border ${style.bg} ${style.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 ${style.text}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{alert.ticketNumber}</span>
              <Badge variant={style.badge} className="text-xs">
                {alert.alertLevel === 'breached' ? 'Estourado' : alert.alertLevel === 'critical' ? 'Crítico' : 'Atenção'}
              </Badge>
            </div>
            <p className="body-small mt-1 line-clamp-1">{alert.title}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{alert.organizationName}</span>
              {alert.assignedTo && <span>• {alert.assignedTo}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${style.text}`}>
            {alert.hoursRemaining <= 0 
              ? 'Vencido' 
              : `${alert.hoursRemaining.toFixed(1)}h restantes`}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            SLA: {alert.slaLevel}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente principal do Dashboard SLA
export default function SLADashboard() {
  const [periodDays, setPeriodDays] = useState(30);

  const { data: dashboard, isLoading, refetch, isRefetching } = trpc.tickets.getSLADashboard.useQuery(
    undefined,
    { refetchInterval: 60000 } // Atualiza a cada minuto
  );

  const metrics = dashboard?.metrics;
  const alerts = dashboard?.alerts || [];

  // Dados para o gráfico de pizza
  const pieData = metrics ? [
    { label: 'No Prazo', value: metrics.onTime, color: '#22c55e' },
    { label: 'Em Risco', value: metrics.atRisk, color: '#f59e0b' },
    { label: 'Estourado', value: metrics.breached, color: '#ef4444' },
  ] : [];

  // Separar alertas por nível
  const breachedAlerts = alerts.filter(a => a.alertLevel === 'breached');
  const criticalAlerts = alerts.filter(a => a.alertLevel === 'critical');
  const warningAlerts = alerts.filter(a => a.alertLevel === 'warning');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de SLA</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real dos acordos de nível de serviço
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Métricas principais */}
      <SectionHeader title="Indicadores de SLA" subtitle="Métricas em tempo real" />
      <CardGrid columns={4}>
        <StatCard icon={Target} iconGradient="blue"
          value={metrics?.total || 0}
          label="Total de Tickets"
          subtitle={`Período: ${periodDays} dias`} />
        <StatCard icon={TrendingUp} iconGradient={metrics && metrics.complianceRate >= 90 ? 'emerald' : metrics && metrics.complianceRate >= 70 ? 'amber' : 'red'}
          value={`${metrics?.complianceRate || 0}%`}
          label="Taxa de Conformidade"
          subtitle="Tickets dentro do SLA" />
        <StatCard icon={Timer} iconGradient="violet"
          value={`${metrics?.averageResponseTime || 0}h`}
          label="Tempo Médio"
          subtitle="Média de resolução" />
        <StatCard icon={AlertCircle} iconGradient={alerts.length > 0 ? 'red' : 'emerald'}
          value={alerts.length}
          label="Tickets em Risco"
          subtitle={`${breachedAlerts.length} estourados`} />
      </CardGrid>

      {/* Gráficos e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de distribuição */}
        <InfoCard icon={Target} iconGradient="blue" title="Distribuição de Status SLA" subtitle="Visão geral dos tickets por status de SLA" className="!min-h-0 !h-auto">
            <PieChart data={pieData} />
        </InfoCard>

        {/* Barras de progresso por prioridade */}
        <InfoCard icon={TrendingUp} iconGradient="emerald" title="Conformidade por Status" subtitle="Taxa de cumprimento do SLA" className="!min-h-0 !h-auto">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  No Prazo
                </span>
                <span className="body-small">{metrics?.onTime || 0}</span>
              </div>
              <ProgressBar value={metrics?.onTime || 0} max={metrics?.total || 1} color="bg-green-500" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Em Risco
                </span>
                <span className="body-small">{metrics?.atRisk || 0}</span>
              </div>
              <ProgressBar value={metrics?.atRisk || 0} max={metrics?.total || 1} color="bg-yellow-500" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Estourado
                </span>
                <span className="body-small">{metrics?.breached || 0}</span>
              </div>
              <ProgressBar value={metrics?.breached || 0} max={metrics?.total || 1} color="bg-red-500" />
            </div>
          </div>
        </InfoCard>
      </div>

      {/* Lista de Alertas */}
      <InfoCard icon={AlertTriangle} iconGradient="amber" title="Alertas de SLA"
        badge={{ text: `${alerts.length} alertas`, variant: alerts.length > 0 ? 'danger' : 'success' }}
        className="!min-h-0 !h-auto">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium">Tudo em dia!</h3>
              <p className="text-muted-foreground">Não há tickets em risco de SLA no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Estourados primeiro */}
              {breachedAlerts.map((alert) => (
                <AlertItem key={alert.ticketId} alert={alert} />
              ))}
              {/* Críticos */}
              {criticalAlerts.map((alert) => (
                <AlertItem key={alert.ticketId} alert={alert} />
              ))}
              {/* Avisos */}
              {warningAlerts.map((alert) => (
                <AlertItem key={alert.ticketId} alert={alert} />
              ))}
            </div>
          )}
      </InfoCard>

      {/* Última atualização */}
      {dashboard?.lastUpdated && (
        <p className="text-xs text-muted-foreground text-center">
          Última atualização: {new Date(dashboard.lastUpdated).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}
