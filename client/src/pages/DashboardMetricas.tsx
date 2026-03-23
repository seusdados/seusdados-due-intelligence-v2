import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Shield, FileText, Users, AlertTriangle, Loader2, Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Filter, CalendarIcon, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { StatCard, InfoCard, CardGrid, SectionHeader } from "@/components/DashboardCard";

const COLORS_STATUS = ['#94a3b8', '#f59e0b', '#10b981', '#3b82f6'];
const COLORS_RISK = ['#10b981', '#f59e0b', '#ef4444', '#7c3aed'];

export default function DashboardMetricas() {
  const { selectedOrganization } = useOrganization();
  const selectedOrganizationId = selectedOrganization?.id;
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState<'7' | '30' | '90' | '365'>('30');
  const [filtroOrganizacao, setFiltroOrganizacao] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  const isAdminGlobal = user?.role === 'admin_global';
  const { data: organizations } = trpc.organization.list.useQuery(undefined, { enabled: isAdminGlobal });

  const organizacaoFiltrada = filtroOrganizacao === 'all' ? selectedOrganizationId : parseInt(filtroOrganizacao);

  const { data: rotStats, isLoading: loadingRot } = trpc.rot.getDashboardStats.useQuery(
    { organizationId: organizacaoFiltrada || 0 },
    { enabled: !!organizacaoFiltrada }
  );

  const { data: orgStats, isLoading: loadingOrg } = trpc.organization.getStats.useQuery(
    { id: organizacaoFiltrada || 0 },
    { enabled: !!organizacaoFiltrada }
  );

  const { data: deadlinesReport, isLoading: loadingDeadlines } = trpc.actionPlan.getDeadlinesReport.useQuery(
    { organizationId: organizacaoFiltrada, daysThreshold: parseInt(periodo) },
    { enabled: !!organizacaoFiltrada }
  );

  const currentYear = new Date().getFullYear();
  const { data: govData, isLoading: loadingGov } = trpc.governanca.overview.useQuery(
    { organizationId: organizacaoFiltrada || 0, year: currentYear },
    { enabled: !!organizacaoFiltrada }
  );

  const isLoading = loadingRot || loadingOrg || loadingDeadlines || loadingGov;

  const rotsPorStatus = useMemo(() => {
    if (!rotStats?.porStatus) return [];
    const statusLabels: Record<string, string> = {
      rascunho: 'Rascunho', em_revisao: 'Em Revisão', aprovado: 'Aprovado',
      arquivado: 'Arquivado', pendente: 'Pendente',
    };
    return rotStats.porStatus.map((s: any, i: number) => ({
      name: statusLabels[s.status] || s.status,
      value: s.count,
      color: COLORS_STATUS[i % COLORS_STATUS.length],
    }));
  }, [rotStats]);

  const rotsPorRisco = useMemo(() => {
    if (!rotStats?.porNivelRisco) return [];
    const riskLabels: Record<string, string> = {
      baixo: 'Baixo', medio: 'Médio', alto: 'Alto', critico: 'Crítico',
    };
    return rotStats.porNivelRisco.map((r: any, i: number) => ({
      name: riskLabels[r.nivel] || r.nivel,
      value: r.count,
      color: COLORS_RISK[i % COLORS_RISK.length],
    }));
  }, [rotStats]);

  const rotsPorDepartamento = useMemo(() => {
    if (!rotStats?.porDepartamento) return [];
    return rotStats.porDepartamento.map((d: any) => ({
      departamento: d.departamento.length > 20 ? d.departamento.substring(0, 20) + '...' : d.departamento,
      quantidade: d.count,
    }));
  }, [rotStats]);

  const deadlineSummary = deadlinesReport?.summary || { totalOverdue: 0, totalDueToday: 0, totalDueSoon: 0, criticalCount: 0 };
  const totalAcoesComPrazo = deadlineSummary.totalOverdue + deadlineSummary.totalDueToday + deadlineSummary.totalDueSoon;

  const { data: unifiedDeadlines } = trpc.deadlines.list.useQuery(
    { organizationId: organizacaoFiltrada, rangeDays: parseInt(periodo) },
    { enabled: true }
  );
  const dlSummary = unifiedDeadlines?.summary || { total: 0, overdue: 0, dueSoon: 0, ok: 0, critical: 0 };
  const topUrgent = (unifiedDeadlines?.items || []).slice(0, 5);

  const totalReunioes = govData?.meetings?.length || 0;
  const reunioesRealizadas = govData?.meetings?.filter((m: any) => m.status === 'realizada' || m.status === 'concluida')?.length || 0;
  const reunioesPendentes = totalReunioes - reunioesRealizadas;
  const progressoGeral = rotStats?.progressoGeral || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <span className="ml-3 text-muted-foreground">Carregando métricas...</span>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-foreground">Painel de Métricas</h1>
            <p className="text-muted-foreground font-extralight">
              Visualização consolidada do progresso de conformidade
              {selectedOrganization && <span className="ml-1">— {selectedOrganization.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" /> Filtros
          </Button>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtros Avançados */}
      {showFilters && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isAdminGlobal && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Organização</Label>
                  <Select value={filtroOrganizacao} onValueChange={setFiltroOrganizacao}>
                    <SelectTrigger><SelectValue placeholder="Todas as organizações" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Organização selecionada</SelectItem>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataFim} onSelect={setDataFim} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => { setFiltroOrganizacao('all'); setDataInicio(undefined); setDataFim(undefined); }}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo - Padronizados com DashboardCard */}
      <SectionHeader title="Indicadores" subtitle="Resumo dos principais indicadores de conformidade" />
      <CardGrid columns={4}>
        <StatCard label="Mapeamentos" value={rotStats?.totalMapeamentos || 0} icon={FileText} iconGradient="violet"
          subtitle={`${rotStats?.entrevistasConcluidas || 0} entrevistas concluídas`} />
        <StatCard label="Reuniões Comitê" value={totalReunioes} icon={Users} iconGradient="blue"
          subtitle={`${reunioesRealizadas} realizadas, ${reunioesPendentes} pendentes`} />
        <StatCard label="Progresso Geral" value={`${progressoGeral}%`} icon={Shield} iconGradient="emerald"
          subtitle={`${(orgStats as any)?.complianceAssessments || 0} avaliações realizadas`} />
        <StatCard label="Ações Pendentes" value={(orgStats as any)?.pendingActions || 0} icon={AlertTriangle} iconGradient="red"
          subtitle={deadlineSummary.totalOverdue > 0 ? `${deadlineSummary.totalOverdue} vencidas` : 'Nenhuma vencida'} />
      </CardGrid>

      {/* Card de Prazos Unificados - Padronizado */}
      <InfoCard icon={Clock} iconGradient="red" title="Prazos Consolidados"
        subtitle="Visão unificada de todos os prazos: planos de ação, processos ANPD e tarefas CPPD"
        headerAction={
          <Link href="/pendencias">
            <button className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 font-medium">
              Ver todos <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        }
        className="!min-h-0 !h-auto"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <div className="text-2xl font-light">{dlSummary.total}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50">
            <div className="text-2xl font-light text-red-600">{dlSummary.overdue}</div>
            <div className="text-xs text-red-600 uppercase tracking-wide">Vencidos</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50">
            <div className="text-2xl font-light text-red-700">{dlSummary.critical}</div>
            <div className="text-xs text-red-700 uppercase tracking-wide">Críticos</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-orange-50">
            <div className="text-2xl font-light text-orange-600">{dlSummary.dueSoon}</div>
            <div className="text-xs text-orange-600 uppercase tracking-wide">Próximos</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50">
            <div className="text-2xl font-light text-green-600">{dlSummary.ok}</div>
            <div className="text-xs text-green-600 uppercase tracking-wide">No Prazo</div>
          </div>
        </div>
        {topUrgent.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Mais urgentes:</p>
            {topUrgent.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                    item.severity === 'VENCIDO' ? 'bg-red-500' :
                    item.severity === 'CRITICO' ? 'bg-red-600' :
                    item.severity === 'URGENTE' ? 'bg-orange-500' :
                    item.severity === 'ATENCAO' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="truncate text-foreground">{item.title}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-xs text-muted-foreground">{item.related?.module}</span>
                  <span className={`font-semibold ${
                    item.daysUntilDue <= 0 ? 'text-red-600' :
                    item.daysUntilDue <= 2 ? 'text-orange-600' : 'text-foreground'
                  }`}>
                    {item.daysUntilDue <= 0 ? `${Math.abs(item.daysUntilDue)}d atrás` : `${item.daysUntilDue}d`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum prazo pendente no período selecionado.
          </div>
        )}
      </InfoCard>

      {/* Gráficos - Dados Reais */}
      <SectionHeader title="Análises Visuais" subtitle="Gráficos de distribuição e tendências" className="mt-4" />
      <div className="grid gap-6 md:grid-cols-2">
        <InfoCard icon={FileText} iconGradient="violet" title="Mapeamentos por Situação" subtitle="Distribuição dos registros de tratamento" className="!min-h-0 !h-auto">
          {rotsPorStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={rotsPorStatus} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80} fill="#8884d8" dataKey="value">
                  {rotsPorStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">Nenhum mapeamento registrado</div>
          )}
        </InfoCard>

        <InfoCard icon={Shield} iconGradient="amber" title="Nível de Risco" subtitle="Classificação de risco dos mapeamentos" className="!min-h-0 !h-auto">
          {rotsPorRisco.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={rotsPorRisco} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80} fill="#8884d8" dataKey="value">
                  {rotsPorRisco.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">Nenhuma análise de risco disponível</div>
          )}
        </InfoCard>

        <InfoCard icon={Building2} iconGradient="blue" title="Mapeamentos por Departamento" subtitle="Distribuição por área da organização" className="!min-h-0 !h-auto">
          {rotsPorDepartamento.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rotsPorDepartamento} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="departamento" type="category" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#8b5cf6" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">Nenhum departamento registrado</div>
          )}
        </InfoCard>

        <InfoCard icon={Clock} iconGradient="red" title="Situação dos Prazos" subtitle={`Ações com prazo nos próximos ${periodo} dias`} className="!min-h-0 !h-auto">
          {totalAcoesComPrazo > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Vencidas', value: deadlineSummary.totalOverdue, color: '#ef4444' },
                    { name: 'Vencem Hoje', value: deadlineSummary.totalDueToday, color: '#f59e0b' },
                    { name: 'Próximas', value: deadlineSummary.totalDueSoon, color: '#10b981' },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80} fill="#8884d8" dataKey="value">
                  {[
                    { name: 'Vencidas', value: deadlineSummary.totalOverdue, color: '#ef4444' },
                    { name: 'Vencem Hoje', value: deadlineSummary.totalDueToday, color: '#f59e0b' },
                    { name: 'Próximas', value: deadlineSummary.totalDueSoon, color: '#10b981' },
                  ].filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">Nenhuma ação com prazo definido</div>
          )}
        </InfoCard>
      </div>
    </div>
  );
}
