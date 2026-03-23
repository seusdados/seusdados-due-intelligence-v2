import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock, AlertTriangle, CheckCircle, Calendar, RefreshCw, Loader2,
  FileText, Shield, Briefcase, ArrowRight, User, AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/contexts/ToastContext";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

/* ─── Configurações de fonte ─── */
const SOURCE_LABELS: Record<string, { label: string; icon: typeof FileText; color: string; actionLabel: string }> = {
  action_plan: { label: 'Plano de Ação', icon: FileText, color: 'bg-violet-100 text-violet-800', actionLabel: 'Definir responsável e iniciar implementação' },
  incident_deadline: { label: 'Processo ANPD', icon: Shield, color: 'bg-red-100 text-red-800', actionLabel: 'Verificar prazo legal e atualizar processo' },
  cppd_task: { label: 'Plano de Conformidade', icon: Briefcase, color: 'bg-blue-100 text-blue-800', actionLabel: 'Concluir tarefa do plano de conformidade' },
};

/* ─── Configurações de severidade ─── */
const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  VENCIDO:  { label: 'VENCIDO',  color: 'bg-red-100 text-red-800 border border-red-200' },
  CRITICO:  { label: 'CRÍTICO',  color: 'bg-red-100 text-red-800 border border-red-200' },
  URGENTE:  { label: 'URGENTE',  color: 'bg-orange-100 text-orange-800 border border-orange-200' },
  ATENCAO:  { label: 'ATENÇÃO',  color: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
  NO_PRAZO: { label: 'NO PRAZO', color: 'bg-green-100 text-green-800 border border-green-200' },
};

/* ─── Urgência em linguagem humana ─── */
function urgencyLabel(daysUntilDue: number): { text: string; color: string; dot: string } {
  if (daysUntilDue < 0)  return { text: `Atrasada há ${Math.abs(daysUntilDue)} ${Math.abs(daysUntilDue) === 1 ? 'dia' : 'dias'}`, color: 'text-red-600 font-bold', dot: 'bg-red-500' };
  if (daysUntilDue === 0) return { text: 'Vence hoje', color: 'text-red-600 font-bold', dot: 'bg-red-500' };
  if (daysUntilDue <= 3)  return { text: `Vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'}`, color: 'text-orange-600 font-semibold', dot: 'bg-orange-400' };
  if (daysUntilDue <= 7)  return { text: `Vence em ${daysUntilDue} dias`, color: 'text-yellow-600 font-semibold', dot: 'bg-yellow-400' };
  return { text: `Vence em ${daysUntilDue} dias`, color: 'text-green-700', dot: 'bg-green-400' };
}

/* ─── Card de pendência ─── */
function PendencyCard({ item, onNavigate }: { item: any; onNavigate: (route?: string) => void }) {
  const sourceInfo = SOURCE_LABELS[item.source] || SOURCE_LABELS.action_plan;
  const severityInfo = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.NO_PRAZO;
  const SourceIcon = sourceInfo.icon;
  const urgency = urgencyLabel(item.daysUntilDue);
  const hasRoute = !!item.related?.route;

  const priorityMap: Record<string, string> = {
    critica: 'bg-red-600 text-white',
    alta: 'bg-orange-500 text-white',
    media: 'bg-yellow-500 text-white',
    baixa: 'bg-gray-400 text-white',
  };
  const priorityLabels: Record<string, string> = {
    critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa',
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-150 ${hasRoute ? 'cursor-pointer hover:shadow-md hover:border-violet-300 hover:-translate-y-0.5' : ''}`}
      onClick={() => hasRoute && onNavigate(item.related.route)}
    >
      <div className="p-5">
        {/* Linha superior: badges + urgência */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs font-semibold ${severityInfo.color}`}>{severityInfo.label}</Badge>
            {item.priority && (
              <Badge className={`text-xs ${priorityMap[item.priority] || 'bg-gray-400 text-white'}`}>
                {priorityLabels[item.priority] || item.priority}
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs ${sourceInfo.color}`}>
              <SourceIcon className="h-3 w-3 mr-1" />
              {sourceInfo.label}
            </Badge>
          </div>
          {/* Urgência com ponto colorido */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${urgency.dot}`} />
            <span className={`text-xs ${urgency.color}`}>{urgency.text}</span>
          </div>
        </div>

        {/* Título */}
        <p className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{item.title}</p>

        {/* Ação necessária */}
        <p className="text-xs text-violet-700 font-medium mb-3">
          Ação necessária: {sourceInfo.actionLabel}
        </p>

        {/* Metadados em linha */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 flex-wrap">
          {/* Responsável */}
          <div className="flex items-center gap-1">
            {item.ownerUserName ? (
              <>
                <User className="h-3 w-3 text-gray-400" />
                <span className="text-gray-700 font-medium">{item.ownerUserName}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <span className="text-amber-600 font-semibold">Responsável não definido</span>
              </>
            )}
          </div>
          {/* Organização */}
          {item.organizationName && (
            <span className="text-gray-500">{item.organizationName}</span>
          )}
          {/* Prazo */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span>Prazo: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
          </div>
        </div>

        {/* Descrição resumida */}
        {item.description && (
          <p className="text-xs text-gray-400 line-clamp-1 mb-3">{item.description}</p>
        )}

        {/* Botão de ação */}
        {hasRoute && (
          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-xl px-4"
              onClick={(e) => { e.stopPropagation(); onNavigate(item.related.route); }}
            >
              <ArrowRight className="h-3 w-3 mr-1.5" />
              Resolver pendência
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Grupo de pendências ─── */
function PendencyGroup({
  title, icon: Icon, iconColor, items, onNavigate, borderColor,
}: {
  title: string; icon: typeof AlertTriangle; iconColor: string;
  items: any[]; onNavigate: (r?: string) => void; borderColor: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 px-1 pb-1 border-b ${borderColor}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className={`text-sm font-bold ${iconColor}`}>{title}</span>
        <span className="text-xs text-gray-400 ml-auto">{items.length} {items.length === 1 ? 'pendência' : 'pendências'}</span>
      </div>
      {items.map((item: any) => (
        <PendencyCard key={item.id} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

/* ─── Componente principal ─── */
export default function DeadlineManager() {
  const { selectedOrganization } = useOrganization();
  const toastCtx = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [rangeDays, setRangeDays] = useState(90);
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'due_soon' | 'ok'>('all');
  const [myPendenciesOnly, setMyPendenciesOnly] = useState(false);

  const { data, isLoading, refetch } = trpc.deadlines.list.useQuery(
    { organizationId: selectedOrganization?.id, rangeDays, statusFilter },
    { enabled: true, refetchInterval: 60000 }
  );

  const triggerCheck = trpc.actionPlan.triggerManualCheck.useMutation({
    onSuccess: () => {
      toastCtx.success("Verificação concluída", "Prazos verificados e notificações enviadas.");
      refetch();
    },
    onError: () => toastCtx.error("Erro", "Não foi possível executar a verificação."),
  });

  const allItems = data?.items || [];
  const summary = data?.summary || { total: 0, overdue: 0, dueSoon: 0, ok: 0, critical: 0 };

  /* Filtro "Minhas Pendências" */
  const items = useMemo(() => {
    if (!myPendenciesOnly || !user) return allItems;
    return allItems.filter((i: any) => i.ownerUserId === user.id || i.ownerUserName === user.name);
  }, [allItems, myPendenciesOnly, user]);

  /* Agrupamento por prioridade */
  const overdueItems  = useMemo(() => items.filter((i: any) => i.status === 'overdue'), [items]);
  const dueSoonItems  = useMemo(() => items.filter((i: any) => i.status === 'due_soon'), [items]);
  const okItems       = useMemo(() => items.filter((i: any) => i.status === 'ok'), [items]);

  /* Contagem por fonte */
  const sourceStats = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i: any) => { counts[i.source] = (counts[i.source] || 0) + 1; });
    return counts;
  }, [items]);

  const handleNavigate = (route?: string) => {
    if (!route) return;
    // Wouter não suporta query strings via navigate() — usar window.location.href para rotas com parâmetros
    if (route.includes('?')) {
      window.location.href = route;
    } else {
      navigate(route);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <span className="ml-3 text-gray-500">Carregando pendências...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-violet-600 to-blue-600 text-white p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Central de Pendências</h1>
            <p className="text-violet-100 mt-1 text-sm font-light">
              Tudo que precisa da sua atenção em um só lugar
              {selectedOrganization && <span className="ml-1">— {selectedOrganization.name}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro "Minhas Pendências" */}
            <Button
              variant="outline"
              size="sm"
              className={`text-xs rounded-xl border-white/40 ${myPendenciesOnly ? 'bg-white text-violet-700 font-bold' : 'bg-white/20 text-white hover:bg-white/30'}`}
              onClick={() => setMyPendenciesOnly(!myPendenciesOnly)}
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Minhas Pendências
            </Button>
            <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
              <SelectTrigger className="w-[120px] bg-white/20 border-white/30 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="365">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px] bg-white/20 border-white/30 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
                <SelectItem value="due_soon">Próximos</SelectItem>
                <SelectItem value="ok">No Prazo</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 text-xs rounded-xl"
              onClick={() => triggerCheck.mutate()}
              disabled={triggerCheck.isPending}
            >
              {triggerCheck.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="ml-1">Verificar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: summary.total, sub: 'Todas as fontes', color: 'text-gray-900' },
          { label: 'Vencidos', value: summary.overdue, sub: 'Prazo expirado', color: 'text-red-600' },
          { label: 'Próximos', value: summary.dueSoon, sub: 'Vencem em breve', color: 'text-orange-600' },
          { label: 'No Prazo', value: summary.ok, sub: 'Dentro do prazo', color: 'text-green-600' },
          { label: 'Críticos', value: summary.critical, sub: 'Vencidos + 1 dia', color: 'text-red-600' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Badges por fonte ── */}
      {Object.keys(sourceStats).length > 1 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(sourceStats).map(([source, count]) => {
            const info = SOURCE_LABELS[source] || SOURCE_LABELS.action_plan;
            const Icon = info.icon;
            return (
              <Badge key={source} variant="outline" className={`text-xs py-1 px-3 ${info.color}`}>
                <Icon className="h-3 w-3 mr-1.5" />
                {info.label}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* ── Alerta de vencidos ── */}
      {summary.overdue > 0 && (
        <Alert className="border-red-200 bg-red-50 rounded-2xl">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{summary.overdue} {summary.overdue === 1 ? 'pendência vencida' : 'pendências vencidas'}</strong> — Resolva agora para evitar impacto na conformidade.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Bloco "O que precisa da sua ação" ── */}
      {(overdueItems.length > 0 || dueSoonItems.filter((i: any) => i.daysUntilDue <= 3).length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-800">
              {overdueItems.length + dueSoonItems.filter((i: any) => i.daysUntilDue <= 3).length} {overdueItems.length + dueSoonItems.filter((i: any) => i.daysUntilDue <= 3).length === 1 ? 'pendência precisa' : 'pendências precisam'} da sua atenção imediata
            </span>
          </div>
          <p className="text-xs text-amber-700">Vencidas ou com prazo nos próximos 3 dias.</p>
        </div>
      )}

      {/* ── Lista agrupada por prioridade ── */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle className="h-14 w-14 mx-auto mb-4 text-green-400" />
          <p className="text-lg font-semibold text-gray-600">Nenhuma pendência encontrada</p>
          <p className="text-sm mt-1">Todas as ações estão dentro do prazo ou já foram concluídas.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <PendencyGroup
            title="Atrasadas"
            icon={AlertTriangle}
            iconColor="text-red-600"
            borderColor="border-red-200"
            items={overdueItems}
            onNavigate={handleNavigate}
          />
          <PendencyGroup
            title="Vencem em breve"
            icon={Clock}
            iconColor="text-orange-500"
            borderColor="border-orange-200"
            items={dueSoonItems}
            onNavigate={handleNavigate}
          />
          <PendencyGroup
            title="No prazo"
            icon={CheckCircle}
            iconColor="text-green-600"
            borderColor="border-green-200"
            items={okItems}
            onNavigate={handleNavigate}
          />
        </div>
      )}
    </div>
  );
}
