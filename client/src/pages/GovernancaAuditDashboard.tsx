/**
 * Dashboard de Auditoria do CPPD
 * 
 * Exibe a trilha de eventos do módulo de Governança e Gestão (CPPD)
 * com filtros por período, tipo de evento e reunião.
 * 
 * Segue o padrão visual padronizado (DashboardCard + StatCard + CardGrid).
 */

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { StatCard, CardGrid, InfoCard } from '@/components/DashboardCard';
import {
  Shield, FileText, PenTool, Mail, Calendar,
  ChevronLeft, ChevronRight, Search, Filter, X,
  ClipboardList, CheckCircle2, Archive, Send,
  Users, Settings, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Mapeamento de ícones por tipo de ação
const actionIcons: Record<string, typeof Shield> = {
  'ata_gerada': FileText,
  'ata_aprovada': CheckCircle2,
  'ata_armazenada_ged': Archive,
  'ata_enviada_assinatura': Send,
  'emails_assinatura_enviados': Mail,
  'documento_assinado_enviado': PenTool,
  'assinatura_finalizada': Shield,
  'reuniao_criada': Calendar,
  'reuniao_cancelada': AlertTriangle,
  'membro_adicionado': Users,
  'membro_removido': Users,
  'configuracao_alterada': Settings,
};

// Cores por tipo de ação (para badges)
const actionColors: Record<string, string> = {
  'ata_gerada': 'bg-blue-100 text-blue-700',
  'ata_aprovada': 'bg-green-100 text-green-700',
  'ata_armazenada_ged': 'bg-purple-100 text-purple-700',
  'ata_enviada_assinatura': 'bg-amber-100 text-amber-700',
  'emails_assinatura_enviados': 'bg-cyan-100 text-cyan-700',
  'documento_assinado_enviado': 'bg-indigo-100 text-indigo-700',
  'assinatura_finalizada': 'bg-emerald-100 text-emerald-700',
  'reuniao_criada': 'bg-violet-100 text-violet-700',
  'reuniao_cancelada': 'bg-red-100 text-red-700',
  'membro_adicionado': 'bg-teal-100 text-teal-700',
  'membro_removido': 'bg-rose-100 text-rose-700',
  'configuracao_alterada': 'bg-gray-100 text-gray-700',
};

// Opções de filtro de ação
const actionOptions = [
  { value: 'ata_gerada', label: 'Ata gerada' },
  { value: 'ata_aprovada', label: 'Ata aprovada' },
  { value: 'ata_armazenada_ged', label: 'Ata armazenada no GED' },
  { value: 'ata_enviada_assinatura', label: 'Ata enviada para assinatura' },
  { value: 'emails_assinatura_enviados', label: 'Convites enviados' },
  { value: 'documento_assinado_enviado', label: 'Documento assinado' },
  { value: 'assinatura_finalizada', label: 'Assinatura finalizada' },
  { value: 'reuniao_criada', label: 'Reunião criada' },
  { value: 'reuniao_cancelada', label: 'Reunião cancelada' },
  { value: 'membro_adicionado', label: 'Membro adicionado' },
  { value: 'membro_removido', label: 'Membro removido' },
  { value: 'configuracao_alterada', label: 'Configuração alterada' },
];

export default function GovernancaAuditDashboard() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  // Estado dos filtros
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Buscar estatísticas
  const { data: stats, isLoading: statsLoading } = trpc.governanca.getAuditStats.useQuery(
    {
      organizationId: organizationId || 0,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { enabled: !!organizationId }
  );

  // Buscar eventos paginados
  const { data: eventsData, isLoading: eventsLoading } = trpc.governanca.listAuditEvents.useQuery(
    {
      organizationId: organizationId || 0,
      page,
      pageSize,
      action: actionFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { enabled: !!organizationId }
  );

  // Limpar filtros
  const clearFilters = () => {
    setActionFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = actionFilter || dateFrom || dateTo;

  // Formatar data
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Formatar detalhes do evento
  const formatDetails = (details: unknown): string => {
    if (!details) return '';
    if (typeof details === 'string') {
      try {
        const parsed = JSON.parse(details);
        return formatDetailsObj(parsed);
      } catch {
        return details;
      }
    }
    return formatDetailsObj(details as Record<string, unknown>);
  };

  const formatDetailsObj = (obj: Record<string, unknown>): string => {
    const parts: string[] = [];
    if (obj.gedKey) parts.push(`GED: ${String(obj.gedKey).split('/').pop()}`);
    if (obj.provider) parts.push(`Provedor: ${obj.provider}`);
    if (obj.signers && Array.isArray(obj.signers)) parts.push(`Signatários: ${(obj.signers as string[]).join(', ')}`);
    if (obj.sent !== undefined) parts.push(`Enviados: ${obj.sent}`);
    if (obj.failed !== undefined && Number(obj.failed) > 0) parts.push(`Falhas: ${obj.failed}`);
    if (obj.fileName) parts.push(`Arquivo: ${obj.fileName}`);
    if (parts.length === 0) return JSON.stringify(obj).slice(0, 100);
    return parts.join(' | ');
  };

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma organização para visualizar a auditoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extralight tracking-tight text-foreground">
          Trilha de Auditoria do CPPD
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro completo de todas as ações realizadas no módulo de Governança e Gestão
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <CardGrid columns={4}>
        <StatCard
          label="Total de Eventos"
          value={statsLoading ? '...' : String(stats?.totalEvents || 0)}
          icon={ClipboardList}
          iconGradient="violet"
        />
        <StatCard
          label="Atas Geradas"
          value={statsLoading ? '...' : String(stats?.atasGeradas || 0)}
          icon={FileText}
          iconGradient="blue"
        />
        <StatCard
          label="Atas Assinadas"
          value={statsLoading ? '...' : String(stats?.assinaturasFinalizadas || 0)}
          icon={PenTool}
          iconGradient="emerald"
        />
        <StatCard
          label="Convites Enviados"
          value={statsLoading ? '...' : String(stats?.emailsEnviados || 0)}
          icon={Mail}
          iconGradient="amber"
        />
      </CardGrid>

      {/* Filtros */}
      <InfoCard title="Filtros" icon={Filter}>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de Evento</label>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos os eventos" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Inicial</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="h-9"
            />
          </div>

          <div className="min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Final</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="h-9"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1">
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </InfoCard>

      {/* Tabela de Eventos */}
      <InfoCard title="Eventos Registrados" icon={ClipboardList}>
        {eventsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Carregando eventos...</div>
          </div>
        ) : !eventsData?.events?.length ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Search className="h-8 w-8 mb-2 opacity-40" />
            <p>Nenhum evento encontrado{hasFilters ? ' com os filtros aplicados' : ''}.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Data</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Evento</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Usuário</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Entidade</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsData.events.map((event) => {
                    const IconComp = actionIcons[event.action] || ClipboardList;
                    const colorClass = actionColors[event.action] || 'bg-gray-100 text-gray-700';
                    return (
                      <tr key={event.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(event.createdAt)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <IconComp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                              {event.actionLabel}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm">{event.userName}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">
                          {event.entityType}{event.entityId ? ` #${event.entityId}` : ''}
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground max-w-[300px] truncate">
                          {formatDetails(event.details)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {eventsData.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  Mostrando {((eventsData.page - 1) * eventsData.pageSize) + 1} a{' '}
                  {Math.min(eventsData.page * eventsData.pageSize, eventsData.total)} de {eventsData.total} eventos
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {eventsData.page} / {eventsData.totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.min(eventsData.totalPages, p + 1))}
                    disabled={page >= eventsData.totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </InfoCard>
    </div>
  );
}
