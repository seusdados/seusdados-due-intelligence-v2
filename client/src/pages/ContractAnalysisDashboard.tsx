import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, CheckCircle, AlertCircle, Clock, RefreshCw, BarChart3, Search } from 'lucide-react';
import { StatCard, InfoCard, CardGrid, SectionHeader } from '@/components/DashboardCard';

const STATUS_COLORS: Record<string, string> = {
  queued: '#f59e0b',
  analyzing: '#3b82f6',
  completed: '#10b981',
  error: '#ef4444',
  canceled: '#6b7280',
  pending: '#f59e0b',
};

const STATUS_LABELS: Record<string, string> = {
  queued: 'Enfileirada',
  analyzing: 'Analisando',
  completed: 'Concluída',
  error: 'Erro',
  canceled: 'Cancelada',
  pending: 'Pendente',
};

export function ContractAnalysisDashboard() {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('week');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: analyses, isLoading, refetch } = trpc.contractAnalysis.list.useQuery(
    {
      organizationId: user?.organizationId,
      limit: 100,
      offset: 0,
    },
    {
      refetchInterval: 5000,
    }
  );

  const filteredAnalyses = useMemo(() => {
    if (!analyses) return [];
    return (analyses as any[]).filter((analysis) => {
      if (statusFilter !== 'all' && analysis.contractAnalysisStatus !== statusFilter) return false;
      if (searchTerm && !analysis.contractName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      const createdAt = new Date(analysis.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (dateFilter === 'today' && daysDiff > 0) return false;
      if (dateFilter === 'week' && daysDiff > 7) return false;
      if (dateFilter === 'month' && daysDiff > 30) return false;
      return true;
    });
  }, [analyses, statusFilter, searchTerm, dateFilter]);

  const stats = useMemo(() => {
    if (!analyses) return { total: 0, completed: 0, error: 0, analyzing: 0, avgTime: 0 };
    const completed = (analyses as any[]).filter((a) => a.contractAnalysisStatus === 'completed').length;
    const error = (analyses as any[]).filter((a) => a.contractAnalysisStatus === 'error').length;
    const analyzing = (analyses as any[]).filter((a) => a.contractAnalysisStatus === 'analyzing').length;
    let totalTime = 0;
    let completedCount = 0;
    (analyses as any[]).forEach((a) => {
      if (a.contractAnalysisStatus === 'completed' && a.startedAt && a.finishedAt) {
        const diff = new Date(a.finishedAt).getTime() - new Date(a.startedAt).getTime();
        totalTime += diff;
        completedCount++;
      }
    });
    const avgTime = completedCount > 0 ? Math.round(totalTime / completedCount / 1000 / 60) : 0;
    return { total: (analyses as any[]).length, completed, error, analyzing, avgTime };
  }, [analyses]);

  const statusChartData = useMemo(() => {
    if (!analyses) return [];
    const statusCounts = (analyses as any[]).reduce((acc, a) => {
      const status = a.contractAnalysisStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      fill: STATUS_COLORS[status],
    }));
  }, [analyses]);

  const timeChartData = useMemo(() => {
    if (!analyses) return [];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });
    return last7Days.map((date) => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      const dayAnalyses = (analyses as any[]).filter((a) => {
        const createdAt = new Date(a.createdAt);
        return createdAt >= dayStart && createdAt <= dayEnd;
      });
      return {
        date: format(date, 'dd/MM', { locale: ptBR }),
        total: dayAnalyses.length,
        completed: dayAnalyses.filter((a) => a.contractAnalysisStatus === 'completed').length,
        error: dayAnalyses.filter((a) => a.contractAnalysisStatus === 'error').length,
      };
    });
  }, [analyses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Análises Contratuais"
        subtitle="Monitoramento em tempo real de análises LGPD"
        action={
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        }
      />

      {/* KPIs */}
      <CardGrid columns={4}>
        <StatCard icon={FileText} iconGradient="indigo" value={stats.total} label="Total de Análises" />
        <StatCard icon={CheckCircle} iconGradient="emerald" value={stats.completed} label="Concluídas" />
        <StatCard icon={AlertCircle} iconGradient="blue" value={stats.analyzing} label="Analisando" />
        <StatCard icon={Clock} iconGradient="amber" value={`${stats.avgTime}min`} label="Tempo Médio" />
      </CardGrid>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InfoCard icon={BarChart3} iconGradient="violet" title="Distribuição de Status" subtitle="Por situação da análise">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusChartData} cx="50%" cy="50%" labelLine={false}
                label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </InfoCard>

        <InfoCard icon={BarChart3} iconGradient="blue" title="Últimos 7 Dias" subtitle="Volume de análises por dia">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={timeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#8b5cf6" name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="#10b981" name="Concluídas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="error" fill="#ef4444" name="Erros" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </InfoCard>
      </div>

      {/* Tabela de Análises */}
      <InfoCard icon={Search} iconGradient="indigo" title="Análises Recentes" subtitle="Filtre e monitore análises em tempo real">
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-4 flex-wrap">
            <Input
              placeholder="Buscar por nome do contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="queued">Enfileirada</SelectItem>
                <SelectItem value="analyzing">Analisando</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="canceled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="table-executive w-full">
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Status</th>
                  <th>Progresso</th>
                  <th>Tentativas</th>
                  <th>Data</th>
                  <th>Tempo</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">Carregando...</td></tr>
                ) : filteredAnalyses.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">Nenhuma análise encontrada</td></tr>
                ) : (
                  filteredAnalyses.slice(0, 10).map((analysis: any) => {
                    const startTime = analysis.startedAt ? new Date(analysis.startedAt) : null;
                    const endTime = analysis.finishedAt ? new Date(analysis.finishedAt) : null;
                    const duration = startTime && endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60) : null;
                    return (
                      <tr key={analysis.id}>
                        <td className="font-medium">{analysis.contractName}</td>
                        <td>
                          <Badge style={{ backgroundColor: STATUS_COLORS[analysis.contractAnalysisStatus], color: 'white' }}>
                            {STATUS_LABELS[analysis.contractAnalysisStatus] || analysis.contractAnalysisStatus}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-violet-500 transition-all" style={{ width: `${analysis.progress || 0}%` }} />
                            </div>
                            <span className="text-xs">{analysis.progress || 0}%</span>
                          </div>
                        </td>
                        <td>{analysis.attempts}/{analysis.maxAttempts || 3}</td>
                        <td className="text-xs text-muted-foreground">
                          {format(new Date(analysis.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                        </td>
                        <td className="text-xs text-muted-foreground">{duration ? `${duration}min` : '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredAnalyses.length > 10 && (
            <div className="text-center text-sm text-muted-foreground mt-4">
              Mostrando 10 de {filteredAnalyses.length} análises
            </div>
          )}
        </div>
      </InfoCard>
    </div>
  );
}
