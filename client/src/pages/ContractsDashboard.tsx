import { useState, useEffect, useMemo } from "react";
// DashboardLayout removido - já é aplicado no App.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  FileText, Clock, Eye, Download, Filter, Search, ArrowUpRight,
  ArrowDownRight, Shield, FileWarning, Scale, Zap, Target,
  Calendar, Building2, ChevronRight, MoreHorizontal, RefreshCw,
  PieChart as PieChartIcon, Activity, Layers, AlertCircle, CheckCheck,
  XCircle, Minus, ArrowRight, Sparkles, LayoutGrid, List, X
} from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, RadarChart, Radar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, ComposedChart
} from "recharts";
import { Link, useLocation } from "wouter";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Plus } from "lucide-react";
import { StatCard, InfoCard, CardGrid, SectionHeader } from '@/components/DashboardCard';

// Cores do tema
const THEME_COLORS = {
  primary: '#8b5cf6',
  primaryLight: '#a78bfa',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#64748b'
};

const RISK_COLORS = {
  critical: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', fill: '#ef4444' },
  high: { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', fill: '#f97316' },
  medium: { bg: '#fefce8', border: '#fef08a', text: '#ca8a04', fill: '#eab308' },
  low: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', fill: '#3b82f6' },
  veryLow: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', fill: '#22c55e' }
};

// Hook para animação de contagem
function useCountAnimation(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  
  return count;
}

// Componente de KPI Card Premium
function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  gradient,
  onClick,
  tooltip
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  gradient: string;
  onClick?: () => void;
  tooltip?: string;
}) {
  const animatedValue = useCountAnimation(value);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={`relative overflow-hidden border-0 shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${gradient}`}
            onClick={onClick}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
            
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/80 uppercase tracking-wider mb-1">
                    {title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white tabular-nums">
                      {animatedValue}
                    </span>
                    {trend && (
                      <div className={`flex items-center gap-1 text-sm ${
                        trend === 'up' ? 'text-emerald-200' : 
                        trend === 'down' ? 'text-red-200' : 'text-white/60'
                      }`}>
                        {trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                        {trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                        {trend === 'stable' && <Minus className="w-4 h-4" />}
                        <span>{trendValue}</span>
                      </div>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-sm text-white/70 mt-1 font-light">{subtitle}</p>
                  )}
                </div>
                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent side="bottom" className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// Componente de Card de Contrato Premium
function ContractCard({ contract, onView }: { contract: any; onView: () => void }) {
  const riskLevel = contract.riskLevel || 'low';
  const colors = RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] || RISK_COLORS.low;
  
  const statusConfig = {
    completed: { label: 'Concluído', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    in_progress: { label: 'Em Análise', icon: Clock, color: 'text-amber-600 bg-amber-50' },
    pending: { label: 'Pendente', icon: AlertCircle, color: 'text-slate-600 bg-slate-50' },
    critical: { label: 'Crítico', icon: AlertTriangle, color: 'text-red-600 bg-red-50' }
  };
  
  const status = statusConfig[contract.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;
  
  return (
    <Card className="group relative overflow-hidden border border-slate-200 hover:border-violet-300 transition-all duration-300 hover:shadow-lg">
      {/* Risk indicator bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: colors.fill }}
      />
      
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 truncate">{contract.name}</h3>
              <Badge 
                variant="outline" 
                className={`${status.color} border-0 text-xs font-medium`}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 font-light truncate">
              {contract.counterparty || 'Contraparte não informada'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onView}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-slate-50">
            <p className="text-xs text-slate-500 mb-1">Conformidade</p>
            <p className="text-lg font-semibold text-slate-900">{contract.conformity || 0}%</p>
          </div>
          <div className="text-center p-2 rounded-lg" style={{ backgroundColor: colors.bg }}>
            <p className="text-xs text-slate-500 mb-1">Riscos</p>
            <p className="text-lg font-semibold" style={{ color: colors.text }}>
              {contract.totalRisks || 0}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-violet-50">
            <p className="text-xs text-slate-500 mb-1">Ações</p>
            <p className="text-lg font-semibold text-violet-600">{contract.pendingActions || 0}</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Progresso da análise</span>
            <span className="font-medium text-slate-700">{contract.progress || 0}%</span>
          </div>
          <Progress value={contract.progress || 0} className="h-2" />
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs"
            onClick={onView}
          >
            <Eye className="w-3 h-3 mr-1" />
            Ver Detalhes
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de Recomendação vs Realização
function RecommendationCard({ item }: { item: any }) {
  const completionRate = item.completed / item.total * 100 || 0;
  
  return (
    <div className="p-4 rounded-xl border border-slate-200 hover:border-violet-200 transition-colors bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            completionRate >= 80 ? 'bg-emerald-100' :
            completionRate >= 50 ? 'bg-amber-100' : 'bg-red-100'
          }`}>
            {completionRate >= 80 ? (
              <CheckCheck className="w-4 h-4 text-emerald-600" />
            ) : completionRate >= 50 ? (
              <Clock className="w-4 h-4 text-amber-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-slate-900">{item.category}</h4>
            <p className="text-xs text-slate-500">{item.description}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {item.completed}/{item.total}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Implementação</span>
          <span className={`font-medium ${
            completionRate >= 80 ? 'text-emerald-600' :
            completionRate >= 50 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {completionRate.toFixed(0)}%
          </span>
        </div>
        <Progress 
          value={completionRate} 
          className={`h-2 ${
            completionRate >= 80 ? '[&>div]:bg-emerald-500' :
            completionRate >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
          }`}
        />
      </div>
    </div>
  );
}

// Custom Tooltip para gráficos
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-xl p-3">
      <p className="font-medium text-slate-900 mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-medium text-slate-900">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ContractsDashboard() {
  const [, setLocation] = useLocation();
  const { selectedOrganization } = useOrganization();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(selectedOrganization?.id || null);
  
  // Sincronizar com organização selecionada globalmente
  useEffect(() => {
    if (selectedOrganization?.id) {
      setSelectedOrgId(selectedOrganization.id);
    }
  }, [selectedOrganization?.id]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  
  // Estado para drill-down interativo
  const [drillDownRisk, setDrillDownRisk] = useState<string | null>(null);
  const [drillDownArea, setDrillDownArea] = useState<string | null>(null);
  const [showDrillDownModal, setShowDrillDownModal] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState<string>('');
  
  // Função para drill-down no heatmap de riscos
  const handleRiskDrillDown = (riskLevel: string) => {
    setDrillDownRisk(riskLevel);
    setDrillDownArea(null);
    setDrillDownTitle(`Contratos com Risco ${riskLevel}`);
    setActiveTab('contracts');
    setSelectedRiskFilter(riskLevel.toLowerCase());
  };
  
  // Função para drill-down na conformidade por área
  const handleAreaDrillDown = (area: string) => {
    setDrillDownArea(area);
    setDrillDownRisk(null);
    setDrillDownTitle(`Contratos da Área: ${area}`);
    setActiveTab('contracts');
    setSearchQuery(area);
  };
  
  // Função para limpar drill-down
  const clearDrillDown = () => {
    setDrillDownRisk(null);
    setDrillDownArea(null);
    setDrillDownTitle('');
    setSelectedRiskFilter('all');
    setSearchQuery('');
  };

  // Query para organizações
  const { data: organizations } = trpc.organization.list.useQuery();

  // Query para dados consolidados do dashboard
  const { data: dashboardData, isLoading, refetch } = trpc.contractAnalysis.getConsolidatedDashboard.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  // Query para lista de contratos
  const { data: contractsList } = trpc.contractAnalysis.list.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  // Dados processados para gráficos (agora usando dados reais do backend)
  const processedData = useMemo(() => {
    if (!dashboardData) return null;

    return {
      // Dados reais de timeline do backend
      timelineData: dashboardData.timelineData || [],
      // Dados reais de radar do backend
      radarData: dashboardData.radarData || [],
      // Dados reais de recomendações do backend
      recommendations: dashboardData.recommendations || [],
      // Distribuição de riscos do backend
      riskDistribution: dashboardData.riskDistribution || [],
      // Conformidade por área do backend
      conformityByArea: dashboardData.conformityByArea || [],
      // Histórico de aditamentos do backend
      amendments: dashboardData.amendments || []
    };
  }, [dashboardData]);

  // Filtrar contratos
  const filteredContracts = useMemo(() => {
    if (!contractsList) return [];
    
    return contractsList.filter((contract: any) => {
      const matchesSearch = !searchQuery || 
        contract.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.counterparty?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRisk = selectedRiskFilter === 'all' || contract.riskLevel === selectedRiskFilter;
      const matchesStatus = selectedStatusFilter === 'all' || contract.status === selectedStatusFilter;
      
      return matchesSearch && matchesRisk && matchesStatus;
    });
  }, [contractsList, searchQuery, selectedRiskFilter, selectedStatusFilter]);

  return (
    <div className="space-y-6 pb-8">
        {/* Header Premium */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-48 translate-x-48" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-32 -translate-x-32" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Scale className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                  Centro de Controle
                </Badge>
              </div>
              <h1 className="heading-2 text-white mb-2">
                Análise de Contratos LGPD
              </h1>
              <p className="text-white/80 font-light max-w-xl">
                Gestão inteligente de conformidade contratual com análise de riscos, 
                recomendações automatizadas e acompanhamento de implementações.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Select
                value={selectedOrgId?.toString() || ""}
                onValueChange={(value) => setSelectedOrgId(parseInt(value))}
              >
                <SelectTrigger className="w-[280px] bg-white/10 border-white/20 text-white backdrop-blur-sm">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Selecione uma organização" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="secondary" 
                size="icon"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              
              <Button 
                className="bg-white text-violet-600 hover:bg-white/90"
                onClick={() => setLocation('/analise-contratos/lista')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Análise
              </Button>
            </div>
          </div>
        </div>

        {!selectedOrgId ? (
          <Card className="border-dashed border-2 border-slate-300">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="p-4 rounded-full bg-violet-100 mb-4">
                <Building2 className="w-12 h-12 text-violet-600" />
              </div>
              <h3 className="heading-4 text-slate-900 mb-2">
                Selecione uma Organização
              </h3>
              <p className="text-slate-500 font-light text-center max-w-md">
                Escolha uma organização no seletor acima para visualizar o dashboard 
                completo de análise de contratos e conformidade LGPD.
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
                  <div className="h-8 bg-slate-200 rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* KPIs Premium - Padronizado com DashboardCard */}
            <CardGrid columns={4}>
              <StatCard
                icon={FileText}
                iconGradient="violet"
                value={dashboardData?.summary?.total || 0}
                label="Total de Contratos"
                subtitle="Contratos analisados"
                trend={{ value: '+12%', positive: true }}
              />
              <StatCard
                icon={Shield}
                iconGradient="emerald"
                value={`${dashboardData?.avgConformity ?? 0}%`}
                label="Taxa de Conformidade"
                subtitle="Média geral"
                trend={{ value: '+5%', positive: true }}
              />
              <StatCard
                icon={AlertTriangle}
                iconGradient="red"
                value={dashboardData?.summary?.criticalRisks || 0}
                label="Riscos Críticos"
                subtitle="Requerem ação imediata"
              />
              <StatCard
                icon={Target}
                iconGradient="amber"
                value={dashboardData?.pendingActions?.total ?? 0}
                label="Ações Pendentes"
                subtitle={`${dashboardData?.pendingActions?.analysesInProgress ?? 0} análises + ${dashboardData?.pendingActions?.criticalRisks ?? 0} riscos`}
              />
            </CardGrid>

            {/* Tabs de Navegação */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList className="bg-slate-100 p-1">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-white">
                    <Activity className="w-4 h-4 mr-2" />
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="contracts" className="data-[state=active]:bg-white">
                    <FileText className="w-4 h-4 mr-2" />
                    Contratos
                  </TabsTrigger>
                  <TabsTrigger value="risks" className="data-[state=active]:bg-white">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Riscos
                  </TabsTrigger>
                  <TabsTrigger value="recommendations" className="data-[state=active]:bg-white">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Recomendações
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[150px]">
                      <Calendar className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Últimos 7 dias</SelectItem>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                      <SelectItem value="365">Último ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tab: Visão Geral */}
              <TabsContent value="overview" className="space-y-8">
                {/* Resumo Executivo */}
                <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-violet-50">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                        <div className="text-3xl font-bold text-violet-600 mb-1">
                          {dashboardData?.summary?.total || 0}
                        </div>
                        <div className="text-sm text-slate-600">Contratos Analisados</div>
                        <div className="text-xs text-emerald-600 mt-1">
                          {dashboardData?.summary?.completed || 0} concluídos
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                        <div className="text-3xl font-bold text-emerald-600 mb-1">
                          {dashboardData?.avgConformity ?? 0}%
                        </div>
                        <div className="text-sm text-slate-600">Conformidade Média</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Meta: 85%
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                        <div className="text-3xl font-bold text-red-600 mb-1">
                          {dashboardData?.summary?.criticalRisks || 0}
                        </div>
                        <div className="text-sm text-slate-600">Riscos Críticos</div>
                        <div className="text-xs text-amber-600 mt-1">
                          {dashboardData?.pendingActions?.total || 0} ações pendentes
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráficos Principais - Layout 2x2 proporcional */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Timeline de Atividades */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                            <Activity className="w-5 h-5 text-violet-600" />
                            Timeline de Atividades
                          </CardTitle>
                          <CardDescription className="font-light">
                            Análises, riscos identificados e resoluções
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Últimos {dateRange} dias
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={processedData?.timelineData || []}>
                          <defs>
                            <linearGradient id="colorAnalyses" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRisks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="analyses" 
                            name="Análises"
                            stroke="#8b5cf6" 
                            fillOpacity={1}
                            fill="url(#colorAnalyses)"
                            strokeWidth={2}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="risks" 
                            name="Riscos"
                            stroke="#ef4444" 
                            fillOpacity={1}
                            fill="url(#colorRisks)"
                            strokeWidth={2}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="resolved" 
                            name="Resolvidos"
                            stroke="#10b981" 
                            fillOpacity={1}
                            fill="url(#colorResolved)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Distribuição de Riscos - Compacto */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <PieChartIcon className="w-4 h-4 text-red-600" />
                            Distribuição de Riscos
                          </CardTitle>
                          <CardDescription className="font-light text-xs">
                            Por nível de severidade
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4">
                        <ResponsiveContainer width="55%" height={240}>
                          <PieChart>
                            <Pie
                              data={processedData?.riskDistribution || []}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {(processedData?.riskDistribution || []).map((entry: any, index: number) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={RISK_COLORS[entry.level as keyof typeof RISK_COLORS]?.fill || '#8884d8'}
                                  stroke="white"
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Legend - Compacta */}
                        <div className="flex-1 space-y-1.5">
                          {(processedData?.riskDistribution || []).map((entry: any, index: number) => {
                            const colors = RISK_COLORS[entry.level as keyof typeof RISK_COLORS];
                            return (
                              <div 
                                key={index}
                                className="flex items-center justify-between p-1.5 rounded-md text-xs"
                                style={{ backgroundColor: colors?.bg }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <div 
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: colors?.fill }}
                                  />
                                  <span className="font-medium" style={{ color: colors?.text }}>
                                    {entry.name}
                                  </span>
                                </div>
                                <span className="font-bold" style={{ color: colors?.text }}>
                                  {entry.value}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Segunda linha de gráficos - Proporcional */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Radar de Cobertura de Cláusulas */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <Layers className="w-5 h-5 text-cyan-600" />
                        Cobertura de Cláusulas LGPD
                      </CardTitle>
                      <CardDescription className="font-light">
                        Análise de completude por categoria
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <RadarChart data={processedData?.radarData || []}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fontSize: 11, fill: '#64748b' }}
                          />
                          <PolarRadiusAxis 
                            angle={30} 
                            domain={[0, 100]}
                            tick={{ fontSize: 10 }}
                          />
                          <Radar
                            name="Cobertura"
                            dataKey="A"
                            stroke="#06b6d4"
                            fill="#06b6d4"
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Conformidade por Área */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                        <BarChart3 className="w-5 h-5 text-emerald-600" />
                        Conformidade por Área
                      </CardTitle>
                      <CardDescription className="font-light">
                        Percentual de conformidade por departamento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={processedData?.conformityByArea || []} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <YAxis 
                            dataKey="area" 
                            type="category" 
                            tick={{ fontSize: 11 }}
                            width={80}
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Bar 
                            dataKey="conformity" 
                            name="Conformidade %"
                            fill="#10b981" 
                            radius={[0, 8, 8, 0]}
                            barSize={20}
                            cursor="pointer"
                            onClick={(data: any) => {
                              if (data && data.area) {
                                handleAreaDrillDown(data.area);
                              }
                            }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Pontos de Atenção */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          Pontos de Atenção Prioritários
                        </CardTitle>
                        <CardDescription className="font-light">
                          Contratos que requerem ação imediata
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTab('contracts')}
                      >
                        Ver Todos
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(dashboardData?.attentionPoints || []).length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                          <p className="font-medium">Nenhum ponto de atenção crítico</p>
                          <p className="text-sm font-light">Todos os contratos estão dentro dos parâmetros aceitáveis</p>
                        </div>
                      ) : (dashboardData?.attentionPoints || []).map((contract: any) => (
                        <Link 
                          key={contract.id} 
                          href={`/analise-contratos/${contract.id}`}
                          className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all cursor-pointer group block"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-red-100">
                              <FileWarning className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-slate-900">{contract.name}</h4>
                                <Badge variant="destructive" className="text-xs">
                                  {contract.criticalRisks} críticos
                                </Badge>
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                  {contract.conformity}% conformidade
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-500 font-light">
                                {contract.reason}
                              </p>
                            </div>
                          </div>
                          <div 
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-violet-600"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </div>
                        </Link>
                       ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Contratos */}
              <TabsContent value="contracts" className="space-y-6">
                {/* Indicador de Drill-Down Ativo */}
                {(drillDownRisk || drillDownArea) && (
                  <div className="flex items-center justify-between p-4 bg-violet-50 border border-violet-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
                        <Filter className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-violet-900">{drillDownTitle}</p>
                        <p className="text-sm text-violet-600">Filtrando por {drillDownRisk ? `nível de risco: ${drillDownRisk}` : `área: ${drillDownArea}`}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearDrillDown}
                      className="border-violet-300 text-violet-700 hover:bg-violet-100"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpar Filtro
                    </Button>
                  </div>
                )}
                
                {/* Filtros */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder="Buscar por nome, contraparte ou cláusula..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <Select value={selectedRiskFilter} onValueChange={setSelectedRiskFilter}>
                        <SelectTrigger className="w-[150px]">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Risco" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Riscos</SelectItem>
                          <SelectItem value="critical">Crítico</SelectItem>
                          <SelectItem value="high">Alto</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="low">Baixo</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Status</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="in_progress">Em Análise</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center border rounded-lg p-1">
                        <Button
                          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de Contratos */}
                {filteredContracts.length === 0 ? (
                  <Card className="border-dashed border-2 border-slate-300">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="w-16 h-16 text-slate-300 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhum contrato encontrado</h3>
                      <p className="text-sm text-slate-500 text-center max-w-md mb-4">
                        {searchQuery || selectedRiskFilter !== 'all' || selectedStatusFilter !== 'all'
                          ? 'Nenhum contrato corresponde aos filtros selecionados. Tente ajustar os critérios de busca.'
                          : 'Ainda não há análises de contratos para esta organização. Clique em "Nova Análise" para começar.'}
                      </p>
                      <Button onClick={() => setLocation('/analise-contratos/lista')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Análise
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                  }>
                    {filteredContracts.map((contract: any) => (
                      <ContractCard 
                        key={contract.id}
                        contract={contract}
                        onView={() => setLocation(`/analise-contratos/${contract.id}`)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Riscos */}
              <TabsContent value="risks" className="space-y-6">
                {/* Matriz de Risco Visual */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Matriz de Risco Consolidada
                    </CardTitle>
                    <CardDescription className="font-light">
                      Posicionamento de riscos por probabilidade vs impacto
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {/* Labels */}
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-500 font-medium">
                        PROBABILIDADE →
                      </div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 text-xs text-slate-500 font-medium">
                        IMPACTO →
                      </div>
                      
                      {/* Grid 5x5 */}
                      <div className="grid grid-cols-5 gap-1 max-w-2xl mx-auto ml-8 mb-8">
                        {Array.from({ length: 25 }).map((_, index) => {
                          const row = 4 - Math.floor(index / 5); // Inverter para probabilidade crescer para cima
                          const col = index % 5;
                          const riskScore = (row + 1) * (col + 1);
                          
                          let bgColor = 'bg-emerald-100 hover:bg-emerald-200';
                          let textColor = 'text-emerald-700';
                          if (riskScore >= 16) {
                            bgColor = 'bg-red-100 hover:bg-red-200';
                            textColor = 'text-red-700';
                          } else if (riskScore >= 10) {
                            bgColor = 'bg-orange-100 hover:bg-orange-200';
                            textColor = 'text-orange-700';
                          } else if (riskScore >= 5) {
                            bgColor = 'bg-amber-100 hover:bg-amber-200';
                            textColor = 'text-amber-700';
                          }
                          
                          // Calcular contratos posicionados baseado nos dados reais
                          // Mapear riscos reais para posições na matriz
                          const contractsInCell = (dashboardData?.riskDistribution || []).reduce((count: number, risk: any) => {
                            // Mapear nível de risco para posição na matriz
                            const riskPositions: Record<string, number[]> = {
                              'critical': [20, 21, 22, 23, 24], // Linha superior (alta probabilidade, alto impacto)
                              'high': [15, 16, 17, 18, 19],
                              'medium': [10, 11, 12, 13, 14],
                              'low': [5, 6, 7, 8, 9],
                              'veryLow': [0, 1, 2, 3, 4]
                            };
                            const positions = riskPositions[risk.level] || [];
                            if (positions.includes(index)) {
                              return count + Math.ceil(risk.value / positions.length);
                            }
                            return count;
                          }, 0);
                          const hasContract = contractsInCell > 0;
                          
                          return (
                            <TooltipProvider key={index}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className={`aspect-square ${bgColor} rounded-lg flex items-center justify-center cursor-pointer transition-all relative hover:scale-105 hover:shadow-lg`}
                                    onClick={() => {
                                      const riskLevel = riskScore >= 16 ? 'Crítico' : riskScore >= 10 ? 'Alto' : riskScore >= 5 ? 'Médio' : 'Baixo';
                                      handleRiskDrillDown(riskLevel);
                                    }}
                                  >
                                    <span className={`text-xs font-medium ${textColor}`}>
                                      {riskScore}
                                    </span>
                                    {hasContract && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center">
                                        <span className="text-[10px] text-white font-bold">
                                          {contractsInCell}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Probabilidade: {row + 1} | Impacto: {col + 1}</p>
                                  <p className="font-medium">Score de Risco: {riskScore}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                      
                      {/* Escala de impacto */}
                      <div className="flex justify-between max-w-2xl mx-auto ml-8 text-xs text-slate-500">
                        <span>Muito Baixo</span>
                        <span>Baixo</span>
                        <span>Médio</span>
                        <span>Alto</span>
                        <span>Muito Alto</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de Riscos por Categoria */}
                {(dashboardData?.riskDistribution || []).length === 0 ? (
                  <Card className="border-dashed border-2 border-slate-300">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Shield className="w-16 h-16 text-slate-300 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhum risco identificado</h3>
                      <p className="text-sm text-slate-500 text-center max-w-md">
                        Ainda não há riscos catalogados para os contratos desta organização.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(dashboardData?.riskDistribution || []).map((risk: any, index: number) => {
                      // Calcular distribuição proporcional
                      const total = risk.value || 1;
                      const critical = risk.level === 'critical' ? total : 0;
                      const high = risk.level === 'high' ? total : 0;
                      const medium = risk.level === 'medium' ? total : 0;
                      const low = risk.level === 'low' || risk.level === 'veryLow' ? total : 0;
                      
                      return (
                        <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-slate-900">{risk.name}</h3>
                              <Badge variant="outline">{risk.value} riscos</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                <div 
                                  className="h-full"
                                  style={{ 
                                    width: '100%',
                                    backgroundColor: risk.level === 'critical' ? '#ef4444' : 
                                                     risk.level === 'high' ? '#f97316' : 
                                                     risk.level === 'medium' ? '#eab308' : 
                                                     risk.level === 'low' ? '#3b82f6' : '#22c55e'
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 text-xs">
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ 
                                  backgroundColor: risk.level === 'critical' ? '#ef4444' : 
                                                   risk.level === 'high' ? '#f97316' : 
                                                   risk.level === 'medium' ? '#eab308' : 
                                                   risk.level === 'low' ? '#3b82f6' : '#22c55e'
                                }} />
                                {risk.name}: {risk.value}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Recomendações */}
              <TabsContent value="recommendations" className="space-y-6">
                {/* Resumo de Implementação */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-sm bg-emerald-50">
                    <CardContent className="p-4 text-center">
                      <CheckCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-emerald-700">35</p>
                      <p className="text-sm text-emerald-600">Implementadas</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-amber-50">
                    <CardContent className="p-4 text-center">
                      <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-amber-700">18</p>
                      <p className="text-sm text-amber-600">Em Andamento</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-red-50">
                    <CardContent className="p-4 text-center">
                      <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-700">12</p>
                      <p className="text-sm text-red-600">Pendentes</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-violet-50">
                    <CardContent className="p-4 text-center">
                      <Target className="w-8 h-8 text-violet-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-violet-700">54%</p>
                      <p className="text-sm text-violet-600">Taxa de Conclusão</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista de Recomendações */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                          <Sparkles className="w-5 h-5 text-violet-600" />
                          Recomendações vs Realizações
                        </CardTitle>
                        <CardDescription className="font-light">
                          Acompanhamento de implementação por categoria
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(processedData?.recommendations || []).map((item: any, index: number) => (
                        <RecommendationCard key={index} item={item} />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Histórico de Aditamentos */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Histórico de Aditamentos
                    </CardTitle>
                    <CardDescription className="font-light">
                      Alterações contratuais realizadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { date: '15/12/2024', contract: 'Contrato TechCorp', type: 'Inclusão de DPA', status: 'approved' },
                        { date: '10/12/2024', contract: 'Acordo DataFlow', type: 'Cláusula de Segurança', status: 'pending' },
                        { date: '05/12/2024', contract: 'Contrato CloudServices', type: 'Atualização de Retenção', status: 'approved' },
                        { date: '01/12/2024', contract: 'DPA Marketing', type: 'Direitos do Titular', status: 'rejected' }
                      ].map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-xs text-slate-500">{item.date.split('/')[1]}/{item.date.split('/')[2]}</p>
                              <p className="text-lg font-bold text-slate-900">{item.date.split('/')[0]}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-900">{item.contract}</h4>
                              <p className="text-sm text-slate-500">{item.type}</p>
                            </div>
                          </div>
                          <Badge 
                            variant={item.status === 'approved' ? 'default' : item.status === 'pending' ? 'secondary' : 'destructive'}
                            className={
                              item.status === 'approved' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                              item.status === 'pending' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                              'bg-red-100 text-red-700 hover:bg-red-100'
                            }
                          >
                            {item.status === 'approved' ? 'Aprovado' : item.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
    </div>
  );
}
