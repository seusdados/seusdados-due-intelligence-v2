import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  ClipboardCheck, Plus, Search, Play, Eye, MoreHorizontal, AlertTriangle, 
  Headphones, RefreshCw, TrendingUp, TrendingDown, Minus, Activity,
  BarChart3, CheckCircle2, Clock, FileText, Shield, ArrowUpRight, Users
} from "lucide-react";
import { DynamicBreadcrumbs } from "@/components/DynamicBreadcrumbs";
import { AcionarDPO } from "@/components/AcionarDPO";
import { PageHeader } from "@/components/PageHeader";
import { KPICards, KPICardData } from "@/components/KPICards";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { frameworksDisponiveis } from "@shared/assessmentData";

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

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
  rascunho: { label: "Rascunho", variant: "outline", color: THEME_COLORS.muted },
  em_andamento: { label: "Em Andamento", variant: "secondary", color: THEME_COLORS.warning },
  concluida: { label: "Concluída", variant: "default", color: THEME_COLORS.success },
  arquivada: { label: "Arquivada", variant: "destructive", color: THEME_COLORS.danger },
};

const maturityColors: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: '#fef2f2', text: '#dc2626', label: 'Inicial' },
  2: { bg: '#fff7ed', text: '#ea580c', label: 'Básico' },
  3: { bg: '#fefce8', text: '#ca8a04', label: 'Definido' },
  4: { bg: '#f0fdf4', text: '#16a34a', label: 'Gerenciado' },
  5: { bg: '#eff6ff', text: '#2563eb', label: 'Otimizado' },
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

// Componente KPI Card
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
  subtitle: string;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  gradient: string;
  onClick?: () => void;
  tooltip?: string;
}) {
  const animatedValue = useCountAnimation(value);
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500';
  
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent><p>{tooltip}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <>{children}</>;
  };
  
  return (
    <CardWrapper>
      <Card 
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-0 ${gradient}`}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-executive text-white/80">{title}</p>
              <p className="stat-large text-white mt-2">{animatedValue}</p>
              <p className="body-small text-white/70 mt-1">{subtitle}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4">
            <TrendIcon className={`w-4 h-4 ${trend === 'up' ? 'text-white' : trend === 'down' ? 'text-red-200' : 'text-white/60'}`} />
            <span className="text-white/80 text-xs">{trendValue}</span>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}

export default function Conformidade() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const { selectedOrganization, isOrganizationRequired } = useOrganization();
  const selectedOrgId = selectedOrganization?.id || null;
  const [newAssessment, setNewAssessment] = useState({
    title: "",
    framework: "misto" as const,
  });

  const utils = trpc.useUtils();
  // Verificar se o usuário é um perfil Cliente
  const isClientRole = ['sponsor', 'comite', 'lider_processo', 'gestor_area'].includes(user?.role || '');
  const isSponsor = user?.role === 'sponsor';
  // ✅ REGRA: Apenas Administradores Globais e Consultores podem criar novas avaliações
  const isAdminGlobal = user?.role === 'admin_global';
  const isAdminOrConsultor = (user?.role === 'admin_global' || user?.role === 'consultor');

  const { data: organizations } = trpc.organization.list.useQuery(undefined, {
    enabled: isAdminOrConsultor
  });

  const effectiveOrgId = (isAdminOrConsultor || isSponsor) ? selectedOrgId : user?.organizationId;

  const { data: assessments, isLoading, refetch } = trpc.compliance.list.useQuery(
    { organizationId: effectiveOrgId! },
    { enabled: !!effectiveOrgId }
  );

  const createMutation = trpc.compliance.create.useMutation({
    onSuccess: (data) => {
      toast.success("Avaliação criada com sucesso! O Sponsor será notificado para realizar a vinculação de domínios.");
      utils.compliance.list.invalidate();
      setIsCreateOpen(false);
      // Não redirecionar - deixar que o Sponsor seja notificado e realize a vinculação
    },
    onError: (error) => {
      toast.error("Erro ao criar avaliação: " + error.message);
    }
  });

  // Estatísticas calculadas
  const stats = useMemo(() => {
    if (!assessments) return { total: 0, concluidas: 0, emAndamento: 0, rascunhos: 0, avgMaturity: 0 };
    
    const concluidas = assessments.filter((a: any) => a.status === 'concluida');
    const avgMaturity = concluidas.length > 0 
      ? concluidas.reduce((acc: number, a: any) => acc + (a.maturityLevel || 0), 0) / concluidas.length 
      : 0;
    
    return {
      total: assessments.length,
      concluidas: concluidas.length,
      emAndamento: assessments.filter((a: any) => a.status === 'em_andamento').length,
      rascunhos: assessments.filter((a: any) => a.status === 'rascunho').length,
      avgMaturity: Math.round(avgMaturity * 10) / 10
    };
  }, [assessments]);

  const filteredAssessments = useMemo(() => {
    return assessments?.filter((a: any) => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) || [];
  }, [assessments, searchTerm, statusFilter]);

  const handleCreate = () => {
    if (!newAssessment.title) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!effectiveOrgId) {
      toast.error("Selecione uma organização");
      return;
    }
    createMutation.mutate({
      ...newAssessment,
      organizationId: effectiveOrgId,
    });
  };

  const getProgressPercent = (answered: number | null, total: number | null) => {
    if (!total || total === 0) return 0;
    return Math.round(((answered || 0) / total) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* Header removido - já renderizado por NavMain */}
      <div className="px-4 py-6">
        <div className="flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3">
              <AcionarDPO
                organizationId={effectiveOrgId || undefined}
                sourceContext={{
                  module: "Conformidade PPPD",
                  page: "Lista de Avaliações"
                }}
                variant="outline"
                size="default"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              />
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              {/* ✅ Botão "Nova Avaliação" - Visível apenas para Admin Global e Consultor (não para Cliente) */}
              {isAdminOrConsultor && (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-white text-violet-600 hover:bg-violet-50">
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Avaliação
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nova Avaliação de Conformidade</DialogTitle>
                    <DialogDescription>
                      Crie uma nova avaliação de maturidade em proteção de dados.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {isAdminOrConsultor && selectedOrganization && (
                      <div className="grid gap-2">
                        <Label>Organização</Label>
                        <div className="p-2 border rounded-md bg-muted/50">
                          <p className="font-medium">{selectedOrganization.name}</p>
                          {selectedOrganization.tradeName && (
                            <p className="body-small">{selectedOrganization.tradeName}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="title">Título da Avaliação *</Label>
                      <Input
                        id="title"
                        value={newAssessment.title}
                        onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                        placeholder="Ex: Avaliação Anual 2024"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Framework de Avaliação</Label>
                      <Select
                        value={newAssessment.framework}
                        onValueChange={(v: any) => setNewAssessment({ ...newAssessment, framework: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(frameworksDisponiveis).map(([key, fw]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <span>{fw.icone}</span>
                                <span>{fw.nome}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {frameworksDisponiveis[newAssessment.framework]?.descricao}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Criando..." : "Criar Avaliação"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              )}
              {/* Botão desabilitado removido - apenas Admin Global e Consultor podem criar */}
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="TOTAL DE AVALIAÇÕES"
            value={stats.total}
            subtitle={`${stats.concluidas} concluídas`}
            icon={ClipboardCheck}
            trend="up"
            trendValue="+12%"
            gradient="bg-gradient-to-br from-violet-500 to-purple-600"
            tooltip="Total de avaliações de conformidade"
          />
          <KPICard
            title="EM ANDAMENTO"
            value={stats.emAndamento}
            subtitle="Avaliações ativas"
            icon={Clock}
            trend={stats.emAndamento > 0 ? "up" : "stable"}
            trendValue={stats.emAndamento > 0 ? "Ativo" : "Nenhuma"}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            tooltip="Avaliações em andamento"
          />
          <KPICard
            title="CONCLUÍDAS"
            value={stats.concluidas}
            subtitle="Avaliações finalizadas"
            icon={CheckCircle2}
            trend="up"
            trendValue="+8%"
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            tooltip="Avaliações concluídas com sucesso"
          />
          <KPICard
            title="MATURIDADE MÉDIA"
            value={stats.avgMaturity}
            subtitle="Nível médio"
            icon={BarChart3}
            trend={stats.avgMaturity >= 3 ? "up" : stats.avgMaturity >= 2 ? "stable" : "down"}
            trendValue={stats.avgMaturity >= 3 ? "Bom" : stats.avgMaturity >= 2 ? "Regular" : "Atenção"}
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            tooltip="Média de maturidade das avaliações concluídas"
          />
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="px-4 py-6">
        {isAdminOrConsultor && !selectedOrganization && (
          <Card className="border-yellow-200 bg-yellow-50 mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Selecione uma organização no menu lateral para visualizar e gerenciar avaliações.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Avaliações de Conformidade</CardTitle>
                <CardDescription>Gerencie suas avaliações de maturidade em proteção de dados</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar avaliações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="arquivada">Arquivada</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="px-3 py-1">
                  {filteredAssessments.length} {filteredAssessments.length === 1 ? 'avaliação' : 'avaliações'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!effectiveOrgId ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <h3 className="text-lg font-medium mb-1">Selecione uma organização</h3>
                <p className="body-small">
                  Escolha uma organização para visualizar suas avaliações
                </p>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-1">Nenhuma avaliação encontrada</h3>
                <p className="body-small">
                  {searchTerm ? "Tente ajustar sua busca" : "Comece criando uma nova avaliação"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="font-semibold">Avaliação</TableHead>
                    <TableHead className="font-semibold">Framework</TableHead>
                    <TableHead className="font-semibold">Progresso</TableHead>
                    <TableHead className="font-semibold">Maturidade</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment: any) => {
                    const progress = getProgressPercent(assessment.answeredQuestions, assessment.totalQuestions);
                    const fw = frameworksDisponiveis[assessment.framework as keyof typeof frameworksDisponiveis];
                    const status = statusLabels[assessment.status];
                    const maturity = assessment.maturityLevel ? maturityColors[assessment.maturityLevel] : null;

                    return (
                      <TableRow 
                        key={assessment.id} 
                        className="cursor-pointer hover:bg-violet-50/50 transition-colors"
                        onClick={() => setLocation(`/conformidade/avaliacao/${assessment.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-violet-100">
                              <FileText className="h-4 w-4 text-violet-600" />
                            </div>
                            <p className="font-medium">{assessment.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <span>{fw?.icone}</span>
                            {fw?.nome || assessment.framework}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {maturity ? (
                            <div 
                              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: maturity.bg, color: maturity.text }}
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: maturity.text }} />
                              Nível {assessment.maturityLevel} - {maturity.label}
                            </div>
                          ) : (
                            <span className="body-small">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={status.variant}
                            className="font-medium"
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="body-small">
                          {new Date(assessment.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Botão de Atribuição para Admin e Sponsor */}
                              {(isAdminOrConsultor || (isSponsor && assessment.organizationId === user?.organizationId)) && assessment.status !== 'concluida' && (
                                <DropdownMenuItem onClick={() => setLocation(`/conformidade/${assessment.id}/atribuir`)}>
                                  <Users className="mr-2 h-4 w-4" />
                                  Atribuir Domínios
                                </DropdownMenuItem>
                              )}
                              {assessment.status !== 'concluida' && (
                                <DropdownMenuItem onClick={() => setLocation(`/conformidade/avaliacao/${assessment.id}`)}
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Continuar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setLocation(`/conformidade/resultado/${assessment.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Resultado
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
