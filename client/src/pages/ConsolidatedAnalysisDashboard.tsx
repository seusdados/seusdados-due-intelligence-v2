import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, AlertCircle, Target, CheckCircle, Shield, Filter } from 'lucide-react';
import { StatCard, InfoCard, CardGrid, SectionHeader } from '@/components/DashboardCard';

interface Assessment {
  id: string;
  code: string;
  title: string;
  status: 'draft' | 'in_progress' | 'completed' | 'released';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  maturityScore: number;
  domain: string;
  createdAt: string;
  dueDate: string;
  respondents: number;
  completionPercentage: number;
}

const mockAssessments: Assessment[] = [
  {
    id: '1',
    code: 'AC#100001ABC',
    title: 'Avaliação LGPD - Departamento TI',
    status: 'completed',
    riskLevel: 'medium',
    maturityScore: 72,
    domain: 'Inteligência Artificial',
    createdAt: '2026-01-15',
    dueDate: '2026-02-15',
    respondents: 5,
    completionPercentage: 100,
  },
  {
    id: '2',
    code: 'AC#100002ABC',
    title: 'Avaliação Conformidade - RH',
    status: 'in_progress',
    riskLevel: 'high',
    maturityScore: 45,
    domain: 'Governança',
    createdAt: '2026-01-16',
    dueDate: '2026-02-01',
    respondents: 3,
    completionPercentage: 60,
  },
  {
    id: '3',
    code: 'AC#100003ABC',
    title: 'Avaliação Segurança - Infraestrutura',
    status: 'draft',
    riskLevel: 'critical',
    maturityScore: 28,
    domain: 'Segurança da Informação',
    createdAt: '2026-01-17',
    dueDate: '2026-02-20',
    respondents: 0,
    completionPercentage: 0,
  },
];

export function ConsolidatedAnalysisDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');

  const filteredAssessments = useMemo(() => {
    return mockAssessments.filter((assessment) => {
      if (statusFilter !== 'all' && assessment.status !== statusFilter) return false;
      if (riskFilter !== 'all' && assessment.riskLevel !== riskFilter) return false;
      if (domainFilter !== 'all' && assessment.domain !== domainFilter) return false;
      return true;
    });
  }, [statusFilter, riskFilter, domainFilter]);

  const kpis = useMemo(() => {
    const total = mockAssessments.length;
    const completed = mockAssessments.filter((a) => a.status === 'completed').length;
    const criticalRisks = mockAssessments.filter((a) => a.riskLevel === 'critical').length;
    const avgMaturity = Math.round(
      mockAssessments.reduce((sum, a) => sum + a.maturityScore, 0) / total
    );
    return { total, completed, criticalRisks, avgMaturity };
  }, []);

  const chartData = useMemo(() => {
    const domainStats = mockAssessments.reduce(
      (acc, assessment) => {
        const existing = acc.find((d) => d.domain === assessment.domain);
        if (existing) {
          existing.count += 1;
          existing.avgMaturity = (existing.avgMaturity + assessment.maturityScore) / 2;
        } else {
          acc.push({
            domain: assessment.domain,
            count: 1,
            avgMaturity: assessment.maturityScore,
          });
        }
        return acc;
      },
      [] as Array<{ domain: string; count: number; avgMaturity: number }>
    );
    return domainStats;
  }, []);

  const riskDistribution = useMemo(() => {
    const risks = { low: 0, medium: 0, high: 0, critical: 0 };
    mockAssessments.forEach((a) => {
      risks[a.riskLevel]++;
    });
    return [
      { name: 'Baixo', value: risks.low, color: '#10b981' },
      { name: 'Médio', value: risks.medium, color: '#f59e0b' },
      { name: 'Alto', value: risks.high, color: '#f97316' },
      { name: 'Crítico', value: risks.critical, color: '#dc2626' },
    ];
  }, []);

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[risk] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      released: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Análise Consolidada"
        subtitle="Panorama completo de conformidade da sua organização"
      />

      {/* KPIs */}
      <CardGrid columns={4}>
        <StatCard
          icon={BarChart3}
          iconGradient="blue"
          value={kpis.total}
          label="Total de Avaliações"
        />
        <StatCard
          icon={CheckCircle}
          iconGradient="emerald"
          value={kpis.completed}
          label="Concluídas"
        />
        <StatCard
          icon={AlertCircle}
          iconGradient="red"
          value={kpis.criticalRisks}
          label="Riscos Críticos"
        />
        <StatCard
          icon={Target}
          iconGradient="violet"
          value={`${kpis.avgMaturity}%`}
          label="Maturidade Média"
        />
      </CardGrid>

      {/* Filtros */}
      <InfoCard
        icon={Filter}
        iconGradient="slate"
        title="Filtros"
        subtitle="Refine a visualização"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="in_progress">Em Progresso</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="released">Liberado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Nível de Risco</label>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Domínio</label>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Inteligência Artificial">Inteligência Artificial</SelectItem>
                <SelectItem value="Governança">Governança</SelectItem>
                <SelectItem value="Segurança da Informação">Segurança da Informação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </InfoCard>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InfoCard
          icon={BarChart3}
          iconGradient="blue"
          title="Maturidade por Domínio"
          subtitle="Média de maturidade por área"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="domain" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgMaturity" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </InfoCard>

        <InfoCard
          icon={Shield}
          iconGradient="amber"
          title="Distribuição de Riscos"
          subtitle="Classificação por nível"
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </InfoCard>
      </div>

      {/* Tabela de Avaliações */}
      <InfoCard
        icon={BarChart3}
        iconGradient="indigo"
        title={`Avaliações (${filteredAssessments.length})`}
        subtitle="Lista de avaliações filtradas"
      >
        <div className="overflow-x-auto">
          <table className="table-executive w-full">
            <thead>
              <tr>
                <th>Código</th>
                <th>Título</th>
                <th>Domínio</th>
                <th>Status</th>
                <th>Risco</th>
                <th>Maturidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssessments.map((assessment) => (
                <tr key={assessment.id}>
                  <td className="font-mono text-sm">{assessment.code}</td>
                  <td>{assessment.title}</td>
                  <td className="text-muted-foreground">{assessment.domain}</td>
                  <td>
                    <Badge className={getStatusColor(assessment.status)}>
                      {assessment.status === 'draft' && 'Rascunho'}
                      {assessment.status === 'in_progress' && 'Em Progresso'}
                      {assessment.status === 'completed' && 'Concluído'}
                      {assessment.status === 'released' && 'Liberado'}
                    </Badge>
                  </td>
                  <td>
                    <Badge className={getRiskColor(assessment.riskLevel)}>
                      {assessment.riskLevel === 'low' && 'Baixo'}
                      {assessment.riskLevel === 'medium' && 'Médio'}
                      {assessment.riskLevel === 'high' && 'Alto'}
                      {assessment.riskLevel === 'critical' && 'Crítico'}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full"
                          style={{ width: `${assessment.maturityScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold">{assessment.maturityScore}%</span>
                    </div>
                  </td>
                  <td>
                    <Button variant="outline" size="sm">Ver Detalhes</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoCard>
    </div>
  );
}
