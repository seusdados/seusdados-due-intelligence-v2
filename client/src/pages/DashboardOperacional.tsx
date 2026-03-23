import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar,
  TrendingUp,
  Users,
  FileText,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Activity,
  Target,
  Zap
} from "lucide-react";
import { Link } from "wouter";
import { DynamicBreadcrumbs } from "@/components/DynamicBreadcrumbs";
import { StatCard, InfoCard, ActionCard, CardGrid, SectionHeader } from "@/components/DashboardCard";

export default function DashboardOperacional() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [viewMode, setViewMode] = useState<"seusdados" | "organizacao">("seusdados");
  const [periodFilter, setPeriodFilter] = useState<"7" | "30" | "90" | "all">("30");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed" | "overdue">("all");
  
  const isAdminOrConsultor = user?.role === "admin_global" || user?.role === "consultor";
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.system.getDashboardStats.useQuery(
    { organizationId: viewMode === "organizacao" ? selectedOrganization?.id : undefined },
    { refetchInterval: 60000 }
  );
  
  const { data: pendingCounts } = trpc.system.getPendingCounts.useQuery(
    { organizationId: viewMode === "organizacao" ? selectedOrganization?.id : undefined },
    { refetchInterval: 30000 }
  );
  
  const { data: recentTickets } = trpc.tickets.list.useQuery(
    { 
      organizationId: viewMode === "organizacao" ? selectedOrganization?.id : undefined,
      pageSize: 5,
      status: "novo"
    },
    { enabled: isAdminOrConsultor }
  );
  
  const performanceMetrics = useMemo(() => {
    if (!stats) return null;
    
    const totalAssessments = (stats.complianceAssessments || 0) + (stats.thirdPartyAssessments || 0);
    const completedAssessments = stats.completedAssessments || 0;
    const completionRate = totalAssessments > 0 ? Math.round((completedAssessments / totalAssessments) * 100) : 0;
    
    return {
      totalAssessments,
      completedAssessments,
      completionRate,
      pendingActions: stats.pendingActions || 0,
      overdueActions: stats.overdueActions || 0,
      avgResponseTime: (stats as any).avgResponseTime || "N/A",
    };
  }, [stats]);

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumbs />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-foreground">Painel Operacional</h1>
            <p className="text-muted-foreground font-extralight">Gestão à vista e acompanhamento em tempo real</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isAdminOrConsultor && (
            <Select value={viewMode} onValueChange={(v: "seusdados" | "organizacao") => setViewMode(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seusdados">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Visão Seusdados
                  </div>
                </SelectItem>
                <SelectItem value="organizacao" disabled={!selectedOrganization}>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {selectedOrganization?.name || "Selecione Organização"}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
          
          <Button variant="outline" size="icon" onClick={() => refetchStats()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Período:</span>
          <Select value={periodFilter} onValueChange={(v: "7" | "30" | "90" | "all") => setPeriodFilter(v)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Situação:</span>
          <Select value={statusFilter} onValueChange={(v: "all" | "pending" | "completed" | "overdue") => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="overdue">Atrasados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Badge variant="outline" className="ml-auto">
          Atualizado: {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Badge>
      </div>

      {/* Cards de Status Rápido — Padronizados */}
      <SectionHeader title="Situação Geral" subtitle="Indicadores de atenção imediata" />
      <CardGrid columns={4}>
        <StatCard 
          icon={MessageSquare} 
          iconGradient="blue" 
          value={pendingCounts?.unreadTickets || 0} 
          label="Chamados Abertos"
          subtitle={(pendingCounts?.unreadTickets || 0) > 5 ? "Requer atenção" : undefined}
          onClick={() => window.location.href = '/meudpo'}
        />
        <StatCard 
          icon={FileText} 
          iconGradient="amber" 
          value={pendingCounts?.expiringContracts || 0} 
          label="Contratos Expirando"
          subtitle={(pendingCounts?.expiringContracts || 0) > 0 ? "Requer atenção" : undefined}
          onClick={() => window.location.href = '/analise-contratos'}
        />
        <StatCard 
          icon={Users} 
          iconGradient="violet" 
          value={pendingCounts?.pendingDueDiligence || 0} 
          label="Avaliações Pendentes"
          subtitle={(pendingCounts?.pendingDueDiligence || 0) > 3 ? "Requer atenção" : undefined}
          onClick={() => window.location.href = '/due-diligence'}
        />
        <StatCard 
          icon={AlertTriangle} 
          iconGradient="red" 
          value={performanceMetrics?.overdueActions || 0} 
          label="Ações Atrasadas"
          subtitle={(performanceMetrics?.overdueActions || 0) > 0 ? "Requer atenção" : undefined}
          onClick={() => window.location.href = '/avaliacoes'}
        />
      </CardGrid>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - Performance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progresso Geral */}
          <InfoCard icon={TrendingUp} iconGradient="emerald" title="Progresso do Programa" 
            subtitle="Acompanhamento das avaliações e ações do programa de privacidade"
            className="!min-h-0 !h-auto">
            <div className="space-y-6">
              <CardGrid columns={3}>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-light text-primary">
                    {performanceMetrics?.totalAssessments || 0}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Total Avaliações</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-light text-emerald-600">
                    {performanceMetrics?.completedAssessments || 0}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Concluídas</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-light text-amber-600">
                    {performanceMetrics?.pendingActions || 0}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Ações Pendentes</p>
                </div>
              </CardGrid>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-light">Taxa de Conclusão</span>
                  <span className="font-medium">{performanceMetrics?.completionRate || 0}%</span>
                </div>
                <Progress value={performanceMetrics?.completionRate || 0} className="h-3" />
              </div>
            </div>
          </InfoCard>

          {/* Ações Rápidas */}
          <SectionHeader title="Ações Rápidas" subtitle="Acesso direto às operações mais comuns" />
          <CardGrid columns={4}>
            <ActionCard icon={CheckCircle2} iconGradient="violet" title="Nova Avaliação"
              description="Iniciar avaliação de conformidade"
              onClick={() => window.location.href = '/avaliacoes'} />
            <ActionCard icon={Users} iconGradient="blue" title="Nova Diligência"
              description="Avaliar terceiro ou fornecedor"
              onClick={() => window.location.href = '/due-diligence/nova'} />
            <ActionCard icon={MessageSquare} iconGradient="pink" title="Novo Chamado"
              description="Abrir chamado no MeuDPO"
              onClick={() => window.location.href = '/meudpo'} />
            <ActionCard icon={FileText} iconGradient="emerald" title="Novo Mapeamento"
              description="Registrar tratamento de dados"
              onClick={() => window.location.href = '/mapeamentos'} />
          </CardGrid>
        </div>

        {/* Coluna Lateral - Tickets e Alertas */}
        <div className="space-y-6">
          {/* Tickets Recentes */}
          <InfoCard icon={MessageSquare} iconGradient="blue" title="Chamados Recentes"
            headerAction={
              <Link href="/meudpo">
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todos <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            }
            className="!min-h-0 !h-auto"
          >
            <ScrollArea className="h-[250px]">
              {recentTickets?.tickets && recentTickets.tickets.length > 0 ? (
                <div className="space-y-3">
                  {recentTickets.tickets.map((ticket: any) => (
                    <div key={ticket.id} className="p-3 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {ticket.organizationName}
                          </p>
                        </div>
                        <Badge variant={ticket.priority === "alta" ? "destructive" : "secondary"} className="text-xs shrink-0">
                          {ticket.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-light">Nenhum chamado aberto</p>
                </div>
              )}
            </ScrollArea>
          </InfoCard>

          {/* Próximas Reuniões */}
          <InfoCard icon={Calendar} iconGradient="teal" title="Próximas Reuniões"
            headerAction={
              <Link href="/governanca">
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver agenda <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            }
            className="!min-h-0 !h-auto"
          >
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-light">Configure o CPPD para ver reuniões</p>
              <Link href="/governanca">
                <Button variant="link" size="sm" className="mt-2">
                  Configurar agora
                </Button>
              </Link>
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
