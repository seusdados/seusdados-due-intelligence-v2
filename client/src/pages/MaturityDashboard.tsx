/**
 * Dashboard de Maturidade por Evidências
 * 
 * Exibe indicadores de maturidade LGPD calculados a partir de eventos
 * operacionais rastreáveis, com sugestão de promoção de estágio.
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { StatCard, CardGrid, SectionHeader } from '@/components/DashboardCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Target,
  Activity,
  Calendar,
  Users,
  FileText,
  Building2,
  AlertOctagon,
  ArrowUpCircle,
  Clock,
  BarChart3,
  History,
  Gauge
} from 'lucide-react';

// Nomes dos estágios de maturidade
const STAGE_NAMES = [
  'Inicial',
  'Básico',
  'Intermediário',
  'Avançado',
  'Otimizado'
];

// Cores dos estágios usando a paleta Seusdados
const STAGE_COLORS = [
  'bg-red-500',      // Inicial - vermelho
  'bg-orange-500',   // Básico - laranja
  'bg-amber-500',    // Intermediário - amarelo
  'bg-violet-500',   // Avançado - violeta (cor principal)
  'bg-emerald-500'   // Otimizado - verde
];

const STAGE_GRADIENTS = [
  'from-red-500 to-red-600',
  'from-orange-500 to-orange-600',
  'from-amber-500 to-amber-600',
  'from-violet-500 to-violet-600',
  'from-emerald-500 to-emerald-600'
];

// Ícones dos módulos
const MODULE_ICONS: Record<string, React.ReactNode> = {
  global: <Activity className="w-5 h-5" />,
  cppd: <Users className="w-5 h-5" />,
  dpia: <FileText className="w-5 h-5" />,
  contratos: <FileText className="w-5 h-5" />,
  mapeamentos: <Building2 className="w-5 h-5" />,
  terceiros: <Users className="w-5 h-5" />,
  incidentes: <AlertOctagon className="w-5 h-5" />,
};

export default function MaturityDashboard() {
  
  const { selectedOrganization } = useOrganization();
  const tenantId = selectedOrganization?.id?.toString() || 'default';
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [justification, setJustification] = useState('');

  // Buscar dados do dashboard
  const { data: dashboard, isLoading, refetch } = trpc.maturityEngine.getDashboard.useQuery({
    tenantId
  });

  // Buscar histórico de decisões
  const { data: decisionHistory } = trpc.maturityEngine.getDecisionHistory.useQuery({
    tenantId
  });

  // Mutation para registrar decisão de promoção
  const recordDecisionMutation = trpc.maturityEngine.recordDecision.useMutation({
    onSuccess: () => {
      toast.success('Promoção registrada', {
        description: 'O estágio de maturidade foi atualizado com sucesso.',
      });
      setShowPromotionDialog(false);
      setJustification('');
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao registrar promoção', {
        description: error.message,
      });
    }
  });

  const handlePromote = () => {
    if (!dashboard || !justification.trim()) return;
    
    recordDecisionMutation.mutate({
      tenantId,
      newStage: dashboard.currentStage + 1,
      justification: justification.trim(),
    });
  };

  // Renderizar indicador
  const renderIndicator = (indicator: any) => {
    const percentage = Math.round(indicator.value * 100);
    const cutoffPercentage = Math.round(indicator.cutoff * 100);
    const isPassing = indicator.is_passing;

    return (
      <Card key={indicator.indicator_id} className="border-border/50 hover:border-violet-500/30 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-600">
                {MODULE_ICONS[indicator.module] || <Target className="w-4 h-4" />}
              </div>
              <CardTitle className="text-sm font-medium">
                {indicator.name}
              </CardTitle>
            </div>
            {isPassing ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                OK
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <XCircle className="w-3 h-3 mr-1" />
                Atenção
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Módulo: {indicator.module.toUpperCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Atual</span>
              <span className={isPassing ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                {indicator.cutoff_days !== undefined 
                  ? `${indicator.value.toFixed(0)} dias` 
                  : `${percentage}%`}
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={indicator.cutoff_days !== undefined 
                  ? Math.min(100, (indicator.cutoff_days / Math.max(indicator.value, 1)) * 100)
                  : percentage} 
                className={`h-2 ${isPassing ? '[&>div]:bg-emerald-500' : '[&>div]:bg-red-500'}`}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Meta: {indicator.cutoff_days !== undefined 
                ? `≤ ${indicator.cutoff_days} dias` 
                : `≥ ${cutoffPercentage}%`}</span>
              <span className="font-medium">
                {indicator.details.numerator}/{indicator.details.denominator}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Renderizar tendência
  const renderTrend = (trend: any) => {
    const TrendIcon = trend.direction === 'up' 
      ? TrendingUp 
      : trend.direction === 'down' 
        ? TrendingDown 
        : Minus;
    
    const trendColor = trend.direction === 'up' 
      ? 'text-emerald-600' 
      : trend.direction === 'down' 
        ? 'text-red-600' 
        : 'text-muted-foreground';

    return (
      <div className="flex items-center gap-2">
        <TrendIcon className={`w-5 h-5 ${trendColor}`} />
        <span className={`text-sm font-medium ${trendColor}`}>
          {trend.direction === 'up' ? 'Em alta' : trend.direction === 'down' ? 'Em queda' : 'Estável'}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <CardGrid columns={4}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </CardGrid>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="heading-3 tracking-tight">
                Motor de Maturidade LGPD
              </h1>
              <p className="body-small">
                Indicadores calculados a partir de eventos operacionais rastreáveis
              </p>
            </div>
          </div>
          
          {dashboard?.canSuggestPromotion && (
            <Dialog open={showPromotionDialog} onOpenChange={setShowPromotionDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25">
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Sugerir Promoção
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Promoção de Estágio</DialogTitle>
                  <DialogDescription>
                    Todos os indicadores atendem aos critérios. Registre a justificativa para promover
                    do estágio {dashboard?.currentStage} ({STAGE_NAMES[(dashboard?.currentStage || 1) - 1]}) 
                    para o estágio {(dashboard?.currentStage || 1) + 1} ({STAGE_NAMES[dashboard?.currentStage || 1]}).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="justification">Justificativa</Label>
                    <Textarea
                      id="justification"
                      placeholder="Descreva as evidências e razões para a promoção de estágio..."
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      className="min-h-[120px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPromotionDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handlePromote}
                    disabled={!justification.trim() || recordDecisionMutation.isPending}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600"
                  >
                    {recordDecisionMutation.isPending ? 'Registrando...' : 'Confirmar Promoção'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Alertas de Bloqueio */}
        {dashboard?.blockingReasons && dashboard.blockingReasons.length > 0 && (
          <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-700 dark:text-red-400">Bloqueios Ativos</AlertTitle>
            <AlertDescription className="text-red-600 dark:text-red-300">
              <ul className="list-disc list-inside mt-2">
                {dashboard.blockingReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Cards de Resumo */}
        <SectionHeader title="Visão Geral" subtitle="Indicadores de maturidade calculados por evidências" />
        <CardGrid columns={4}>
          <StatCard icon={Shield} iconGradient="violet"
            value={`${dashboard?.currentStage || 1}`}
            label="Estágio Atual"
            subtitle={STAGE_NAMES[(dashboard?.currentStage || 1) - 1]} />
          <StatCard icon={CheckCircle2} iconGradient="emerald"
            value={`${dashboard?.indicators.filter(i => i.is_passing).length || 0}/${dashboard?.indicators.length || 0}`}
            label="Indicadores OK"
            subtitle="Atingindo meta" />
          <StatCard icon={Activity} iconGradient="violet"
            value={dashboard?.eventStats.total || 0}
            label="Eventos (90 dias)"
            subtitle={`${dashboard?.eventStats.concluidos || 0} concluídos`} />
          <StatCard icon={BarChart3} iconGradient="blue"
            value={dashboard?.trend?.direction === 'up' ? 'Em alta' : dashboard?.trend?.direction === 'down' ? 'Em queda' : 'Estável'}
            label="Tendência"
            subtitle="Últimos 3 períodos" />
        </CardGrid>

        {/* Tabs de Conteúdo */}
        <Tabs defaultValue="indicators" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="indicators" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <Target className="w-4 h-4 mr-2" />
              Indicadores
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Eventos
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <History className="w-4 h-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Tab: Indicadores */}
          <TabsContent value="indicators">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard?.indicators.map(renderIndicator)}
            </div>
          </TabsContent>

          {/* Tab: Eventos */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-violet-500" />
                  Estatísticas de Eventos
                </CardTitle>
                <CardDescription>
                  Resumo dos eventos nos últimos 90 dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                    <p className="text-2xl font-bold text-violet-600">{dashboard?.eventStats.total || 0}</p>
                    <p className="body-small">Total de Eventos</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-2xl font-bold text-emerald-600">{dashboard?.eventStats.concluidos || 0}</p>
                    <p className="body-small">Concluídos</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-2xl font-bold text-amber-600">{dashboard?.eventStats.em_andamento || 0}</p>
                    <p className="body-small">Em Andamento</p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <p className="text-2xl font-bold text-red-600">{dashboard?.eventStats.bloqueados || 0}</p>
                    <p className="body-small">Atrasados</p>
                  </div>
                </div>

                {/* Eventos por Módulo */}
                <div className="mt-6">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-violet-500" />
                    Eventos por Módulo
                  </h4>
                  <div className="space-y-3">
                    {Object.entries((dashboard?.eventStats as any)?.porModulo || {}).map(([modulo, count]) => (
                      <div key={modulo} className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-600">
                          {MODULE_ICONS[modulo] || <Activity className="w-4 h-4" />}
                        </div>
                        <span className="flex-1 text-sm font-medium capitalize">{modulo}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Histórico */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-violet-500" />
                  Histórico de Decisões
                </CardTitle>
                <CardDescription>
                  Registro de promoções e alterações de estágio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {decisionHistory && decisionHistory.length > 0 ? (
                  <div className="space-y-4">
                    {decisionHistory.map((decision: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${STAGE_GRADIENTS[decision.newStage - 1]} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white font-bold">{decision.newStage}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                              Estágio {decision.previousStage} → {decision.newStage}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(decision.decidedAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm mt-2 text-muted-foreground">
                            {decision.justification}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Por: {decision.decidedBy}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma decisão registrada ainda</p>
                    <p className="text-sm">As promoções de estágio aparecerão aqui</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
