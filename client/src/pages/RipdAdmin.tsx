/**
 * Painel de Administração de RIPDs
 * 
 * Visualização e gerenciamento de todos os Relatórios de Impacto à Proteção de Dados
 * gerados automaticamente ou manualmente.
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Building2,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Archive,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  ClipboardCheck,
  BarChart3,
  TrendingUp,
  Layers,
  FileCheck,
  Paperclip,
  Activity,
  Zap,
  ListChecks,
  ArrowRight,
  Ticket,
  GitBranch,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Mapeamento de status
const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  in_progress: 'Em Andamento',
  pending_review: 'Aguardando Revisão',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  archived: 'Arquivado',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const RISK_LABELS: Record<string, string> = {
  baixo: 'Baixo',
  moderado: 'Moderado',
  alto: 'Alto',
  critico: 'Crítico',
};

const RISK_COLORS: Record<string, string> = {
  baixo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  moderado: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  alto: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critico: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  mapeamento: 'Mapeamento',
  contrato: 'Contrato',
  incidente: 'Incidente',
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  manual: <FileText className="w-3.5 h-3.5" />,
  mapeamento: <Zap className="w-3.5 h-3.5" />,
  contrato: <FileCheck className="w-3.5 h-3.5" />,
  incidente: <AlertTriangle className="w-3.5 h-3.5" />,
};

export default function RipdAdmin() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchAction, setBatchAction] = useState<string>('');

  // Buscar estatísticas
  const { data: stats, isLoading: statsLoading } = trpc.ripdAdmin.getStats.useQuery();

  // Buscar lista de RIPDs
  const { data: ripdList, isLoading: listLoading, refetch: refetchList } = trpc.ripdAdmin.listAll.useQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    riskLevel: riskFilter !== 'all' ? riskFilter : undefined,
    sourceType: sourceFilter !== 'all' ? sourceFilter : undefined,
    search: searchTerm || undefined,
    page,
    pageSize: 15,
  });

  // Buscar timeline
  const { data: timeline } = trpc.ripdAdmin.getTimeline.useQuery();

  // Buscar organizações
  const { data: organizations } = trpc.ripdAdmin.getOrganizations.useQuery();

  // Estado para rastreabilidade
  const [selectedDpiaId, setSelectedDpiaId] = useState<number | null>(null);
  const [expandedRisks, setExpandedRisks] = useState<Set<number>>(new Set());

  // Buscar rastreabilidade quando um DPIA é selecionado
  const { data: traceData, isLoading: traceLoading, refetch: refetchTrace } = trpc.ripdWorkflowPremium.getTraceability.useQuery(
    { dpiaId: selectedDpiaId! },
    { enabled: !!selectedDpiaId }
  );

  // Mutation para gerar planos de ação
  const syncActionPlansMutation = trpc.ripdWorkflowPremium.syncActionPlansFromDpia.useMutation({
    onSuccess: (data) => {
      toast.success(`Planos de ação sincronizados: ${data.created} criados, ${data.skipped} já existiam`);
      refetchTrace();
    },
    onError: (error) => {
      toast.error(`Erro ao gerar planos de ação: ${error.message}`);
    }
  });

  // Mutation para converter action plan em ticket
  const convertToTicketMutation = trpc.ripdWorkflowPremium.convertActionPlanToTicket.useMutation({
    onSuccess: () => {
      toast.success('Plano de ação convertido em ticket com sucesso');
      refetchTrace();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Toggle risco expandido
  const toggleRiskExpanded = (riskId: number) => {
    setExpandedRisks(prev => {
      const next = new Set(prev);
      if (next.has(riskId)) next.delete(riskId);
      else next.add(riskId);
      return next;
    });
  };

  // Ação em lote
  const batchMutation = trpc.ripdAdmin.batchAction.useMutation({
    onSuccess: (data) => {
      toast.success(`Ação realizada com sucesso em ${data.count} RIPD(s)`);
      setSelectedIds([]);
      setBatchDialogOpen(false);
      refetchList();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Toggle seleção
  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!ripdList?.items) return;
    const allIds = ripdList.items.map((r: any) => r.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const handleBatchAction = (action: string) => {
    if (selectedIds.length === 0) {
      toast.error('Selecione ao menos um RIPD');
      return;
    }
    setBatchAction(action);
    setBatchDialogOpen(true);
  };

  const confirmBatchAction = () => {
    batchMutation.mutate({
      ids: selectedIds,
      action: batchAction as any
    });
  };

  const batchActionLabels: Record<string, string> = {
    approve: 'Aprovar',
    reject: 'Rejeitar',
    archive: 'Arquivar',
    reopen: 'Reabrir',
    start_review: 'Enviar para Revisão',
  };

  // Skeleton de carregamento
  if (statsLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="heading-3 tracking-tight">
                Painel de RIPDs
              </h1>
              <p className="body-small">
                Relatórios de Impacto à Proteção de Dados Pessoais
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/dpia')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Ir para DPIA
            </Button>
            <Button
              className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 shadow-lg shadow-violet-500/25"
              onClick={() => navigate('/dpia')}
            >
              <Shield className="w-4 h-4 mr-2" />
              Novo RIPD
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-600" />
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-medium">
                Total de RIPDs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-2xl">{stats?.total || 0}</p>
                  <p className="text-muted-foreground text-xs">
                    {stats?.recentCount || 0} nos últimos 30 dias
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aprovados */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-medium">
                Aprovados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-2xl">{stats?.byStatus.approved || 0}</p>
                  <p className="text-muted-foreground text-xs">
                    {stats?.total ? Math.round((stats.byStatus.approved / stats.total) * 100) : 0}% do total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Em Andamento */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-medium">
                Em Andamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-2xl">
                    {(stats?.byStatus.in_progress || 0) + (stats?.byStatus.draft || 0)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {stats?.byStatus.pending_review || 0} aguardando revisão
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risco Alto/Crítico */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-medium">
                Risco Alto / Crítico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/25">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-2xl">
                    {(stats?.byRisk.alto || 0) + (stats?.byRisk.critico || 0)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {stats?.byRisk.critico || 0} críticos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evidências */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="h-1 bg-gradient-to-r from-cyan-500 to-cyan-600" />
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-medium">
                Evidências Vinculadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Paperclip className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-2xl">{stats?.totalEvidences || 0}</p>
                  <p className="text-muted-foreground text-xs">
                    {stats?.organizationsCount || 0} organizações
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribuição por Risco e Origem */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Distribuição por Risco */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-600" />
                Distribuição por Nível de Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(['baixo', 'moderado', 'alto', 'critico'] as const).map(level => {
                  const count = stats?.byRisk[level] || 0;
                  const total = stats?.total || 1;
                  const pct = Math.round((count / total) * 100);
                  const colors: Record<string, string> = {
                    baixo: '[&>div]:bg-emerald-500',
                    moderado: '[&>div]:bg-amber-500',
                    alto: '[&>div]:bg-orange-500',
                    critico: '[&>div]:bg-red-500',
                  };
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{RISK_LABELS[level]}</span>
                        <span className="font-medium">{count} ({pct}%)</span>
                      </div>
                      <Progress value={pct} className={`h-2 ${colors[level]}`} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Distribuição por Origem */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-600" />
                Distribuição por Origem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(['mapeamento', 'manual', 'contrato', 'incidente'] as const).map(source => {
                  const count = stats?.bySource[source] || 0;
                  const total = stats?.total || 1;
                  const pct = Math.round((count / total) * 100);
                  const colors: Record<string, string> = {
                    mapeamento: '[&>div]:bg-violet-500',
                    manual: '[&>div]:bg-blue-500',
                    contrato: '[&>div]:bg-cyan-500',
                    incidente: '[&>div]:bg-red-500',
                  };
                  return (
                    <div key={source} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {SOURCE_ICONS[source]}
                          <span>{SOURCE_LABELS[source]}</span>
                        </div>
                        <span className="font-medium">{count} ({pct}%)</span>
                      </div>
                      <Progress value={pct} className={`h-2 ${colors[source]}`} />
                    </div>
                  );
                })}
              </div>
              {stats && stats.total > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pontuação média</span>
                    <span className="font-semibold text-violet-600">{stats.avgScore}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Abas: Lista e Organizações */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="lista" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Todos os RIPDs
            </TabsTrigger>
            <TabsTrigger value="organizacoes" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Por Organização
            </TabsTrigger>
            <TabsTrigger value="rastreabilidade" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Rastreabilidade
            </TabsTrigger>
          </TabsList>

          {/* Aba Lista */}
          <TabsContent value="lista" className="space-y-4">
            {/* Filtros */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por título ou descrição..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-full md:w-[160px]">
                      <SelectValue placeholder="Risco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Riscos</SelectItem>
                      {Object.entries(RISK_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-full md:w-[160px]">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Origens</SelectItem>
                      {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ações em lote */}
                {selectedIds.length > 0 && (
                  <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.length} selecionado(s)
                    </span>
                    <Button size="sm" variant="outline" onClick={() => handleBatchAction('approve')}>
                      <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBatchAction('start_review')}>
                      <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Enviar p/ Revisão
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBatchAction('reject')}>
                      <ThumbsDown className="w-3.5 h-3.5 mr-1" /> Rejeitar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBatchAction('archive')}>
                      <Archive className="w-3.5 h-3.5 mr-1" /> Arquivar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBatchAction('reopen')}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reabrir
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                      Limpar seleção
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabela de RIPDs */}
            {listLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : !ripdList?.items?.length ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <Shield className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium">Nenhum RIPD encontrado</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Ajuste os filtros ou crie um novo RIPD a partir do módulo de mapeamento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Cabeçalho da tabela */}
                <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1 flex items-center">
                    <Checkbox
                      checked={selectedIds.length === ripdList.items.length && ripdList.items.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </div>
                  <div className="col-span-3">Título</div>
                  <div className="col-span-2">Organização</div>
                  <div className="col-span-1">Origem</div>
                  <div className="col-span-1">Risco</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Score</div>
                  <div className="col-span-1">Data</div>
                  <div className="col-span-1">Ações</div>
                </div>

                {/* Linhas */}
                <div className="space-y-2">
                  {ripdList.items.map((ripd: any) => (
                    <Card
                      key={ripd.id}
                      className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
                        selectedIds.includes(ripd.id) ? 'ring-2 ring-violet-500/50' : ''
                      }`}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          {/* Checkbox */}
                          <div className="col-span-1 flex items-center">
                            <Checkbox
                              checked={selectedIds.includes(ripd.id)}
                              onCheckedChange={() => toggleSelection(ripd.id)}
                            />
                          </div>

                          {/* Título */}
                          <div className="col-span-3">
                            <p className="font-light text-sm truncate" title={ripd.title}>
                              {ripd.title}
                            </p>
                            {ripd.description && (
                              <p className="text-xs font-extralight text-muted-foreground truncate mt-0.5" title={ripd.description}>
                                {ripd.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 md:hidden">
                              <Badge className={`text-[10px] ${RISK_COLORS[ripd.riskLevel] || ''}`}>
                                {RISK_LABELS[ripd.riskLevel] || ripd.riskLevel}
                              </Badge>
                              <Badge className={`text-[10px] ${STATUS_COLORS[ripd.status] || ''}`}>
                                {STATUS_LABELS[ripd.status] || ripd.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Organização */}
                          <div className="col-span-2 hidden md:block">
                            <p className="text-sm font-light truncate">{ripd.organizationName || '---'}</p>
                            <p className="text-xs font-extralight text-muted-foreground">{ripd.organizationCnpj || ''}</p>
                          </div>

                          {/* Origem */}
                          <div className="col-span-1 hidden md:flex items-center gap-1">
                            {SOURCE_ICONS[ripd.sourceType]}
                            <span className="text-xs">{SOURCE_LABELS[ripd.sourceType] || ripd.sourceType}</span>
                          </div>

                          {/* Risco */}
                          <div className="col-span-1 hidden md:block">
                            <Badge className={`text-[10px] ${RISK_COLORS[ripd.riskLevel] || ''}`}>
                              {RISK_LABELS[ripd.riskLevel] || ripd.riskLevel}
                            </Badge>
                          </div>

                          {/* Status */}
                          <div className="col-span-1 hidden md:block">
                            <Badge className={`text-[10px] ${STATUS_COLORS[ripd.status] || ''}`}>
                              {STATUS_LABELS[ripd.status] || ripd.status}
                            </Badge>
                          </div>

                          {/* Score */}
                          <div className="col-span-1 hidden md:block">
                            <div className="flex items-center gap-1.5">
                              <Progress
                                value={ripd.overallScore || 0}
                                className={`h-1.5 flex-1 ${
                                  (ripd.overallScore || 0) >= 75 ? '[&>div]:bg-red-500' :
                                  (ripd.overallScore || 0) >= 50 ? '[&>div]:bg-orange-500' :
                                  (ripd.overallScore || 0) >= 25 ? '[&>div]:bg-amber-500' :
                                  '[&>div]:bg-emerald-500'
                                }`}
                              />
                              <span className="text-xs font-medium w-8 text-right">{ripd.overallScore || 0}%</span>
                            </div>
                            <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                              <span title="Riscos">{ripd.risksCount || 0} riscos</span>
                              <span title="Evidências">{ripd.evidencesCount || 0} evid.</span>
                            </div>
                          </div>

                          {/* Data */}
                          <div className="col-span-1 hidden md:block">
                            <p className="text-xs">
                              {ripd.createdAt ? new Date(ripd.createdAt).toLocaleDateString('pt-BR') : '---'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {ripd.createdByName || ''}
                            </p>
                          </div>

                          {/* Ações */}
                          <div className="col-span-1 flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => navigate(`/dpia/${ripd.id}`)}
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Paginação */}
                {ripdList.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((page - 1) * 15) + 1} a {Math.min(page * 15, ripdList.total)} de {ripdList.total} RIPDs
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium">
                        {page} / {ripdList.totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page >= ripdList.totalPages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Aba Rastreabilidade */}
          <TabsContent value="rastreabilidade" className="space-y-4">
            {/* Seletor de DPIA */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Selecione o RIPD/DPIA</label>
                    <Select
                      value={selectedDpiaId?.toString() || ''}
                      onValueChange={(v) => {
                        setSelectedDpiaId(Number(v));
                        setExpandedRisks(new Set());
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um RIPD para visualizar a rastreabilidade..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ripdList?.items?.map((ripd: any) => (
                          <SelectItem key={ripd.id} value={ripd.id.toString()}>
                            {ripd.title} - {ripd.organizationName || 'Sem organização'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedDpiaId && (
                    <Button
                      onClick={() => syncActionPlansMutation.mutate({ dpiaId: selectedDpiaId })}
                      disabled={syncActionPlansMutation.isPending}
                      className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 shadow-lg shadow-violet-500/25"
                    >
                      {syncActionPlansMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ListChecks className="w-4 h-4 mr-2" />
                      )}
                      Gerar Planos de Ação
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Conteúdo de rastreabilidade */}
            {!selectedDpiaId ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <GitBranch className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium">Selecione um RIPD</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Escolha um RIPD/DPIA acima para visualizar a cadeia completa de rastreabilidade.
                  </p>
                </CardContent>
              </Card>
            ) : traceLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : traceData ? (
              <>
                {/* Resumo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="text-2xl font-semibold">{traceData.summary.totalRisks}</p>
                          <p className="text-xs text-muted-foreground">Riscos Identificados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-2xl font-semibold">{traceData.summary.totalMitigations}</p>
                          <p className="text-xs text-muted-foreground">Mitigações</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-violet-500" />
                        <div>
                          <p className="text-2xl font-semibold">{traceData.summary.totalActionPlans}</p>
                          <p className="text-xs text-muted-foreground">Planos de Ação</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-2xl font-semibold">{traceData.summary.totalTickets}</p>
                          <p className="text-xs text-muted-foreground">Tickets Gerados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progresso dos Planos de Ação */}
                {traceData.summary.totalActionPlans > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Progresso dos Planos de Ação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-gray-500">{traceData.summary.actionPlansByStatus.pendente}</p>
                          <p className="text-xs text-muted-foreground">Pendentes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-blue-500">{traceData.summary.actionPlansByStatus.em_andamento}</p>
                          <p className="text-xs text-muted-foreground">Em Andamento</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-amber-500">{traceData.summary.actionPlansByStatus.pendente_validacao}</p>
                          <p className="text-xs text-muted-foreground">Aguardando Validação</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-emerald-500">{traceData.summary.actionPlansByStatus.concluida}</p>
                          <p className="text-xs text-muted-foreground">Concluídas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Árvore de Rastreabilidade */}
                <div className="space-y-3">
                  {traceData.traceTree.length === 0 ? (
                    <Card className="border-0 shadow-lg">
                      <CardContent className="py-8 text-center">
                        <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <h3 className="font-medium">Nenhum risco encontrado</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Este RIPD ainda não possui riscos identificados.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    traceData.traceTree.map((node: any, idx: number) => {
                      const isExpanded = expandedRisks.has(node.risk.id);
                      return (
                        <Card key={node.risk.id} className="border-0 shadow-sm overflow-hidden">
                          {/* Cabeçalho do Risco */}
                          <div
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleRiskExpanded(node.risk.id)}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                              <div className={`w-2 h-2 rounded-full shrink-0 ${
                                node.risk.riskLevel === 'critico' ? 'bg-red-500' :
                                node.risk.riskLevel === 'alto' ? 'bg-orange-500' :
                                node.risk.riskLevel === 'moderado' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} />
                              <span className="font-medium text-sm truncate">{node.risk.title}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={`text-[10px] ${RISK_COLORS[node.risk.riskLevel] || ''}`}>
                                {RISK_LABELS[node.risk.riskLevel] || node.risk.riskLevel}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {node.mitigations.length} mitigações · {node.actionPlans.length} ações
                              </span>
                            </div>
                          </div>

                          {/* Conteúdo expandido */}
                          {isExpanded && (
                            <div className="border-t px-4 py-3 space-y-4">
                              {/* Mitigações */}
                              {node.mitigations.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Shield className="w-3.5 h-3.5" /> Mitigações
                                  </h4>
                                  <div className="space-y-1.5 ml-4">
                                    {node.mitigations.map((m: any) => (
                                      <div key={m.id} className="flex items-center gap-2 text-sm">
                                        <ArrowRight className="w-3 h-3 text-blue-400 shrink-0" />
                                        <span className="truncate">{m.title}</span>
                                        <Badge variant="outline" className="text-[10px] shrink-0">
                                          {m.mitigationType || 'preventiva'}
                                        </Badge>
                                        <Badge variant="outline" className={`text-[10px] shrink-0 ${
                                          m.status === 'implementada' ? 'border-emerald-300 text-emerald-600' :
                                          m.status === 'em_implementacao' ? 'border-blue-300 text-blue-600' :
                                          'border-gray-300 text-gray-600'
                                        }`}>
                                          {m.status || 'pendente'}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Planos de Ação */}
                              {node.actionPlans.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <ListChecks className="w-3.5 h-3.5" /> Planos de Ação
                                  </h4>
                                  <div className="space-y-2 ml-4">
                                    {node.actionPlans.map((ap: any) => (
                                      <div key={ap.id} className="bg-muted/30 rounded-lg p-3">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
                                            <span className="text-sm font-light truncate">{ap.title}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <Badge variant="outline" className={`text-[10px] ${
                                              ap.priority === 'critica' ? 'border-red-300 text-red-600' :
                                              ap.priority === 'alta' ? 'border-orange-300 text-orange-600' :
                                              ap.priority === 'media' ? 'border-amber-300 text-amber-600' :
                                              'border-gray-300 text-gray-600'
                                            }`}>
                                              {ap.priority}
                                            </Badge>
                                            <Badge variant="outline" className={`text-[10px] ${
                                              ap.status === 'concluida' ? 'border-emerald-300 text-emerald-600' :
                                              ap.status === 'em_andamento' ? 'border-blue-300 text-blue-600' :
                                              ap.status === 'pendente_validacao_dpo' ? 'border-amber-300 text-amber-600' :
                                              'border-gray-300 text-gray-600'
                                            }`}>
                                              {ap.status?.replace(/_/g, ' ')}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                          {ap.responsibleName && <span>Responsável: {ap.responsibleName}</span>}
                                          {ap.dueDate && <span>Prazo: {new Date(ap.dueDate).toLocaleDateString('pt-BR')}</span>}
                                          {ap.outputType && <span>Tipo: {ap.outputType?.replace(/_/g, ' ')}</span>}
                                        </div>

                                        {/* Ticket vinculado */}
                                        {ap.ticket ? (
                                          <div className="mt-2 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 py-1">
                                            <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                                            <span className="text-xs text-emerald-700 dark:text-emerald-400">
                                              Ticket #{ap.ticket.id}: {ap.ticket.title} ({ap.ticket.status})
                                            </span>
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="mt-2 h-7 text-xs"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              convertToTicketMutation.mutate({ actionPlanId: ap.id });
                                            }}
                                            disabled={convertToTicketMutation.isPending}
                                          >
                                            <Ticket className="w-3 h-3 mr-1" />
                                            Converter em Ticket
                                          </Button>
                                        )}

                                        {/* Ticket de validação DPO */}
                                        {ap.dpoValidationTicket && (
                                          <div className="mt-1 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
                                            <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />
                                            <span className="text-xs text-amber-700 dark:text-amber-400">
                                              Validação DPO #{ap.dpoValidationTicket.id}: {ap.dpoValidationTicket.status}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Sem mitigações nem ações */}
                              {node.mitigations.length === 0 && node.actionPlans.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">
                                  Nenhuma mitigação ou plano de ação vinculado a este risco.
                                </p>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* Aba Organizações */}
          <TabsContent value="organizacoes" className="space-y-4">
            {!organizations?.length ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma organização com RIPD</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Os RIPDs serão listados aqui quando forem criados para organizações.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.map((org: any) => (
                  <Card key={org.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => { setStatusFilter('all'); setRiskFilter('all'); setSourceFilter('all'); setSearchTerm(org.name); setActiveTab('lista'); setPage(1); }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/10 to-violet-600/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-medium truncate">{org.name}</CardTitle>
                          {org.cnpj && (
                            <CardDescription className="text-xs">{org.cnpj}</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-violet-500" />
                          <span className="text-sm font-medium">{org.ripdCount} RIPD(s)</span>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Diálogo de confirmação de ação em lote */}
        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Ação em Lote</DialogTitle>
              <DialogDescription>
                Você está prestes a <strong>{batchActionLabels[batchAction] || batchAction}</strong> {selectedIds.length} RIPD(s).
                Esta ação será aplicada a todos os itens selecionados.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmBatchAction}
                disabled={batchMutation.isPending}
                className={
                  batchAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  batchAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-violet-600 hover:bg-violet-700'
                }
              >
                {batchMutation.isPending ? 'Processando...' : `Confirmar ${batchActionLabels[batchAction] || ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
