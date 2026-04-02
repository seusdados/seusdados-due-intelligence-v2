import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  StatCard,
  ModuleCard,
  InfoCard,
  ActionCard,
  CardGrid,
  SectionHeader,
  ICON_GRADIENTS,
} from "@/components/DashboardCard";
import { 
  ClipboardCheck, 
  FileSearch, 
  Building2, 
  Users, 
  Clock,
  TrendingUp,
  Shield,
  Play,
  Headphones,
  Database,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ListTodo,
  Timer,
  ChevronRight,
  Activity,
  Loader2,
  CircleDot,
  Scale,
  CheckSquare,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";
import { SmartDPOButton } from "@/components/SmartDPOButton";
import { useState, useMemo, useCallback } from "react";

/* =============================================
   CONSTANTES DE MAPEAMENTO
   ============================================= */

const activityIcons: Record<string, typeof Activity> = {
  ticket_criado: Headphones,
  ticket_resolvido: CheckCircle2,
  ticket_respondido: Headphones,
  avaliacao_criada: ClipboardCheck,
  avaliacao_concluida: CheckCircle2,
  terceiro_avaliado: FileSearch,
  contrato_enviado: Scale,
  incidente_registrado: AlertTriangle,
  plano_acao_criado: ListTodo,
  tarefa_concluida: CheckSquare,
  reuniao_agendada: CalendarDays,
  documento_ged: Database,
};

const activityColors: Record<string, string> = {
  ticket_criado: 'bg-pink-100 text-pink-600',
  ticket_resolvido: 'bg-green-100 text-green-600',
  ticket_respondido: 'bg-blue-100 text-blue-600',
  avaliacao_criada: 'bg-violet-100 text-violet-600',
  avaliacao_concluida: 'bg-green-100 text-green-600',
  terceiro_avaliado: 'bg-indigo-100 text-indigo-600',
  contrato_enviado: 'bg-emerald-100 text-emerald-600',
  incidente_registrado: 'bg-red-100 text-red-600',
  plano_acao_criado: 'bg-amber-100 text-amber-600',
  tarefa_concluida: 'bg-green-100 text-green-600',
  reuniao_agendada: 'bg-cyan-100 text-cyan-600',
  documento_ged: 'bg-slate-100 text-slate-600',
};

const moduleLabels: Record<string, string> = {
  meudpo: 'MeuDPO',
  conformidade: 'Conformidade',
  due_diligence: 'Due Diligence',
  contratos: 'Contratos',
  incidentes: 'Incidentes',
  plano_acao: 'Plano de Ação',
  governanca: 'Governança',
  ged: 'Documentos',
  administracao: 'Administração',
};

const severityConfig: Record<string, { color: string; bg: string; label: string }> = {
  vencido: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Vencido' },
  critico: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', label: 'Crítico' },
  atencao: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Atenção' },
  normal: { color: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'No prazo' },
};

/* =============================================
   HELPERS
   ============================================= */

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* =============================================
   COMPONENTE PRINCIPAL
   ============================================= */

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [, setLocation] = useLocation();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  const handleNavigate = (path: string) => {
    setNavigatingTo(path);
    setTimeout(() => {
      setLocation(path);
    }, 100);
  };
  
  const isAdminOrConsultor = user?.role === 'admin_global' || user?.role === 'consultor';
  const isSponsor = user?.role === 'sponsor';
  // Perfis de Cliente: sponsor, comite, lider_processo, gestor_area
  const isClientRole = ['sponsor', 'comite', 'lider_processo', 'gestor_area'].includes(user?.role || '');
  // Para clientes, apenas o módulo Conformidade LGPD está ativo
  const clientActiveModules = ['conformidade'];
  
  // DEBUG
  console.log('[Dashboard] User role:', user?.role, 'isClientRole:', isClientRole, 'isAdminOrConsultor:', isAdminOrConsultor);
  const organizationId = isAdminOrConsultor ? selectedOrganization?.id : user?.organizationId;

  // Stats globais apenas para admin quando não há organização selecionada
  const { data: globalStats, isLoading: loadingGlobal } = trpc.admin.getGlobalStats.useQuery(
    undefined,
    { enabled: user?.role === 'admin_global' && !organizationId }
  );

  // Stats da organização selecionada (dados genéricos)
  const { data: orgStats, isLoading: loadingOrg } = trpc.organization.getStats.useQuery(
    { id: organizationId! },
    { enabled: !!organizationId }
  );

  // Dashboard consolidado (dados completos e personalizados)
  const { data: dashSummary, isLoading: loadingSummary } = trpc.dashboardData.getSummary.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId, staleTime: 30_000 }
  );

  // Dashboard data - atividade recente
  const { data: recentActivity, isLoading: loadingActivity } = trpc.dashboardData.getRecentActivity.useQuery(
    { organizationId: organizationId!, limit: 8 },
    { enabled: !!organizationId, staleTime: 30_000 }
  );

  // Dashboard data - minhas tarefas
  const { data: myTasks, isLoading: loadingTasks } = trpc.dashboardData.getMyTasks.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId, staleTime: 30_000 }
  );

  // Dashboard data - agenda
  const { data: agenda, isLoading: loadingAgenda } = trpc.dashboardData.getAgendaItems.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId, staleTime: 30_000 }
  );

  // Dashboard data - resumo SLA
  const { data: slaSummary, isLoading: loadingSLA } = trpc.dashboardData.getSlaOverview.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId, staleTime: 30_000 }
  );

  // Dashboard data - prazos urgentes
  const { data: urgentDeadlines, isLoading: loadingDeadlines } = trpc.dashboardData.getUrgentDeadlines.useQuery(
    { organizationId: organizationId!, limit: 5 },
    { enabled: !!organizationId, staleTime: 30_000 }
  );

  const stats = organizationId ? orgStats : (user?.role === 'admin_global' ? globalStats : null);
  const orgStatsData = orgStats as { complianceAssessments: number; thirdPartyAssessments: number; thirdParties: number; pendingActions: number; } | null;
  const isLoading = organizationId ? (loadingOrg || loadingSummary) : loadingGlobal;

  // Calendário visual - dias do mês atual com eventos
  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();

    const agendaItems = agenda?.items || [];
    const deadlineItems = urgentDeadlines?.items || [];
    const pastItems = agenda?.itemsPast || [];

    const eventDays = new Map<number, { type: string; count: number; items: any[] }>();
    
    [...agendaItems, ...deadlineItems, ...pastItems].forEach((item: any) => {
      const d = new Date(item.date || item.dueDate);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        const existing = eventDays.get(day);
        const diasRestantes = item.diasRestantes != null ? Number(item.diasRestantes) : Math.ceil((d.getTime() - now.getTime()) / 86400000);
        const severity = diasRestantes < 0 ? 'vencido' : diasRestantes <= 3 ? 'critico' : diasRestantes <= 7 ? 'atencao' : 'normal';
        const prevItems = existing?.items || [];
        // Keep the worst severity
        const prevSeverityRank = { vencido: 3, critico: 2, atencao: 1, normal: 0 }[existing?.type || 'normal'] || 0;
        const newSeverityRank = { vencido: 3, critico: 2, atencao: 1, normal: 0 }[severity] || 0;
        eventDays.set(day, {
          type: newSeverityRank > prevSeverityRank ? severity : (existing?.type || severity),
          count: (existing?.count || 0) + 1,
          items: [...prevItems, { ...item, severity }],
        });
      }
    });

    const days: Array<{ day: number | null; isToday: boolean; event?: { type: string; count: number; items: any[] } }> = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, isToday: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, isToday: d === today, event: eventDays.get(d) });
    }
    return days;
  }, [agenda, urgentDeadlines]);

  // Pendências consolidadas para lista
  const pendingItems = useMemo(() => {
    const agendaItems = agenda?.items || [];
    const deadlineItems = urgentDeadlines?.items || [];
    const pastItems = agenda?.itemsPast || [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const all = [...agendaItems, ...deadlineItems, ...pastItems].map((item: any) => {
      const d = new Date(item.date || item.dueDate);
      const diasRestantes = item.diasRestantes != null ? Number(item.diasRestantes) : Math.ceil((d.getTime() - now.getTime()) / 86400000);
      const severity = diasRestantes < 0 ? 'vencido' : diasRestantes === 0 ? 'critico' : diasRestantes <= 3 ? 'critico' : diasRestantes <= 7 ? 'atencao' : 'normal';
      return { ...item, severity, diasRestantes, dateObj: d };
    });

    // Deduplicate by id+type
    const seen = new Set<string>();
    const unique = all.filter((item) => {
      const key = `${item.id}-${item.type || item.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [agenda, urgentDeadlines]);

  // Items for the selected calendar day
  const selectedDayItems = useMemo(() => {
    if (selectedCalendarDay === null) return null;
    const dayData = calendarDays.find(d => d.day === selectedCalendarDay);
    return dayData?.event?.items || [];
  }, [selectedCalendarDay, calendarDays]);

  // Summary counts
  const pendingSummary = useMemo(() => {
    const vencidos = pendingItems.filter(i => i.severity === 'vencido').length;
    const criticos = pendingItems.filter(i => i.severity === 'critico').length;
    const atencao = pendingItems.filter(i => i.severity === 'atencao').length;
    const noPrazo = pendingItems.filter(i => i.severity === 'normal').length;
    return { vencidos, criticos, atencao, noPrazo, total: pendingItems.length };
  }, [pendingItems]);

  // Helper to get route for a pending item
  const getItemRoute = useCallback((item: any): string => {
    const source = item.source || item.type || '';
    if (source === 'plano_acao' || source === 'prazo_acao') return '/prazos';
    if (source === 'ticket' || source === 'prazo_ticket') return '/meudpo';
    if (source === 'incidente' || source === 'prazo_incidente') return '/incidentes';
    if (source === 'reuniao') return '/governanca';
    return '/prazos';
  }, []);

  // Source label
  const getSourceLabel = useCallback((item: any): string => {
    const source = item.source || item.type || '';
    if (source === 'plano_acao' || source === 'prazo_acao') return 'Plano de Ação';
    if (source === 'ticket' || source === 'prazo_ticket') return 'Chamado';
    if (source === 'incidente' || source === 'prazo_incidente') return 'Incidente';
    if (source === 'reuniao') return 'Reunião';
    return 'Pendência';
  }, []);

  /* =============================================
     MÓDULOS
     ============================================= */

  const modules = [
    {
      id: 'conformidade',
      title: 'Conformidade LGPD',
      subtitle: 'Programa de Auditoria e Conformidade Operacional',
      description: 'Sistema integrado de avaliação com matriz de risco 5x5, múltiplos modelos de referência e geração automática de plano de ação priorizado.',
      icon: ClipboardCheck,
      tag: 'LGPD / GDPR / ICO / CNIL',
      gradient: 'conformidade' as const,
      metrics: [
        { value: '09', label: 'Domínios' },
        { value: '21', label: 'Questões' },
        { value: '05', label: 'Maturidade' },
        { value: '5x5', label: 'Matriz' },
      ],
      buttons: isClientRole ? [
        { label: 'Ver Avaliações', onClick: () => handleNavigate('/avaliacoes'), variant: 'secondary' as const },
      ] : [
        { label: 'Nova Avaliação', onClick: () => handleNavigate('/avaliacoes?nova=true') },
        { label: 'Ver Avaliações', onClick: () => handleNavigate('/avaliacoes'), variant: 'secondary' as const },
      ],
      consultorOnly: false,
    },
    {
      id: 'due-diligence',
      title: 'Due Diligence',
      subtitle: 'Avaliação de Terceiros e Fornecedores',
      description: 'Avaliação completa de maturidade e riscos de terceiros com classificação de criticidade, evidências documentais e recomendações personalizadas.',
      icon: FileSearch,
      tag: 'Due Diligence',
      gradient: 'duediligence' as const,
      metrics: [
        { value: '06', label: 'Categorias' },
        { value: '24', label: 'Critérios' },
        { value: '04', label: 'Níveis' },
        { value: '5x5', label: 'Matriz' },
      ],
      buttons: isClientRole ? [
        { label: 'Ver Avaliações', onClick: () => handleNavigate(organizationId ? `/cliente/${organizationId}/due-diligence` : '/due-diligence'), variant: 'secondary' as const },
      ] : [
        { label: 'Nova Avaliação', onClick: () => handleNavigate(organizationId ? `/cliente/${organizationId}/due-diligence/nova` : '/due-diligence/nova') },
        { label: 'Ver Avaliações', onClick: () => handleNavigate(organizationId ? `/cliente/${organizationId}/due-diligence` : '/due-diligence'), variant: 'secondary' as const },
      ],
      consultorOnly: false,
    },
    {
      id: 'analise-contratos',
      title: 'Análise de Contratos',
      subtitle: 'Conformidade Contratual LGPD',
      description: 'Análise automatizada de contratos com IA seguindo 18 blocos de regras LGPD/ANPD, com mapa de análise, checklist e matriz de priorização de riscos.',
      icon: Scale,
      tag: 'LGPD / ANPD',
      gradient: 'contratos' as const,
      customGradient: 'from-emerald-600 via-teal-600 to-cyan-700',
      metrics: [
        { value: '18', label: 'Blocos' },
        { value: '10', label: 'Checklist' },
        { value: '05', label: 'Riscos' },
        { value: '25+', label: 'Campos' },
      ],
      buttons: [
        { label: 'Nova Análise', onClick: () => handleNavigate('/analise-contratos?nova=true') },
        { label: 'Ver Análises', onClick: () => handleNavigate('/analise-contratos'), variant: 'secondary' as const },
      ],
      consultorOnly: true,
    },
    {
      id: 'simulador-cppd',
      title: 'Simulador CPPD',
      subtitle: 'Tabletop de Resposta a Incidentes',
      description: 'Treine sua equipe em cenários realistas de violação de dados com simulações de tabletop, registro de decisões e métricas de desempenho.',
      icon: Play,
      tag: 'CPPD / ANPD',
      gradient: 'governanca' as const,
      customGradient: 'from-orange-600 via-amber-600 to-yellow-600',
      metrics: [
        { value: '04', label: 'Fases' },
        { value: '06', label: 'KPIs' },
        { value: '08', label: 'Perfis' },
        { value: '15', label: 'Checklist' },
      ],
      buttons: [
        { label: 'Nova Simulação', onClick: () => handleNavigate('/simulador-hub') },
        { label: 'Ver Simulações', onClick: () => handleNavigate('/simulador'), variant: 'secondary' as const },
      ],
      consultorOnly: true,
    },
    {
      id: 'governanca-pppd',
      title: 'Comitê de Privacidade',
      subtitle: 'Governança e Proteção de Dados',
      description: 'Gerencie o CPPD com calendário de reuniões, programa de implementação em fases, controle de ações e atas automáticas.',
      icon: Building2,
      tag: 'CPPD / Governança',
      gradient: 'default' as const,
      customGradient: 'from-indigo-600 via-purple-600 to-violet-600',
      metrics: [
        { value: '10', label: 'Fases' },
        { value: '12', label: 'Reuniões' },
        { value: '30', label: 'Marcos' },
        { value: '50', label: 'Controles' },
      ],
      buttons: [
        { label: 'Configurar CPPD', onClick: () => handleNavigate('/governanca?showCreate=true') },
        { label: 'Ver Calendário', onClick: () => handleNavigate('/governanca'), variant: 'secondary' as const },
      ],
      consultorOnly: true,
    },
    {
      id: 'meudpo',
      title: 'MeuDPO',
      subtitle: 'Sistema de Atendimento e Tickets',
      description: 'Central de atendimento para questões de privacidade e proteção de dados com SLA, notificações e relatórios consolidados.',
      icon: Headphones,
      tag: 'Helpdesk / DPO',
      gradient: 'meudpo' as const,
      metrics: [
        { value: '07', label: 'Tipos' },
        { value: '04', label: 'SLA' },
        { value: '05', label: 'Status' },
        { value: '04', label: 'Prioridades' },
      ],
      buttons: [
        { label: 'Novo Chamado', onClick: () => handleNavigate('/meudpo/novo-ticket') },
        { label: 'Ver Chamados', onClick: () => handleNavigate('/meudpo/tickets'), variant: 'secondary' as const },
      ],
      consultorOnly: false,
    },
    {
      id: 'pa-anpd',
      title: 'Gestão de Incidentes + PA ANPD',
      subtitle: 'Resposta a Incidentes e Processos Administrativos',
      description: 'Gestão completa de incidentes de segurança (PAISI) com integração a processos administrativos da ANPD, cálculo automático de prazos em dias úteis, geração de CIS com IA e acompanhamento de evidências.',
      icon: Shield,
      tag: 'ANPD / PAISI / Incidentes',
      gradient: 'incidentes' as const,
      metrics: [
        { value: '\u221E', label: 'Incidentes' },
        { value: '10', label: 'Fases' },
        { value: '\u00DAteis', label: 'Prazos' },
        { value: 'IA', label: 'CIS' },
      ],
      buttons: [
        { label: 'Novo Incidente', onClick: () => handleNavigate('/pa-anpd') },
        { label: 'Ver Incidentes', onClick: () => handleNavigate('/pa-anpd'), variant: 'secondary' as const },
      ],
      consultorOnly: false,
    },
    {
      id: 'mapeamento',
      title: 'Mapeamento de Dados',
      subtitle: 'Inventário e Registro de Operações',
      description: 'Mapeamento completo de operações de tratamento de dados pessoais com entrevistas estruturadas, geração automática de ROT/ROPA e integração com contratos.',
      icon: Database,
      tag: 'LGPD / ROT / ROPA',
      gradient: 'default' as const,
      customGradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      metrics: [
        { value: '\u221E', label: 'Processos' },
        { value: 'Link', label: 'Entrevistas' },
        { value: 'Auto', label: 'ROT' },
        { value: 'Export', label: 'ROPA' },
      ],
      buttons: [
        { label: 'Novo Mapeamento', onClick: () => handleNavigate('/mapeamentos/novo') },
        { label: 'Ver Mapeamentos', onClick: () => handleNavigate('/mapeamentos'), variant: 'secondary' as const },
      ],
      consultorOnly: true,
    },
  ];

  /* =============================================
     RENDER
     ============================================= */

  return (
    <div className="space-y-8">
      {/* ===== HEADER ===== */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.75rem] font-medium uppercase tracking-wider text-violet-600 mb-3">
            Ferramenta de Avaliação
          </p>
          <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] mb-2">
            Bem-vindo, <span className="text-violet-700 dark:text-violet-400 font-semibold">{user?.name?.split(' ')[0] || 'Usuário'}</span>
          </h1>
          <p className="text-[0.9375rem] font-light text-muted-foreground max-w-lg leading-relaxed">
            {isClientRole 
              ? 'Acompanhe seus prazos, tarefas e chamados em um só lugar'
              : user?.role === 'admin_global' && !organizationId
                ? 'Visão geral de todas as organizações e usuários'
                : 'Gerencie avaliações de conformidade e due diligence de terceiros'
            }
          </p>
        </div>
        <SmartDPOButton
          sourceContext={{ module: "Dashboard", page: "Página Inicial" }}
          variant="outline"
        />
      </div>

      {/* ===== INDICADORES RÁPIDOS (StatCards) ===== */}
      <CardGrid columns={isLoading ? 4 : (user?.role === 'admin_global' && !organizationId ? 2 : (isClientRole ? 3 : 4))}>
        {user?.role === 'admin_global' && !organizationId ? (
          <>
            <StatCard
              icon={Building2}
              iconGradient="violet"
              value={isLoading ? '...' : String(globalStats?.organizations || 0).padStart(2, '0')}
              label="Organizações"
              onClick={() => handleNavigate('/organizacoes')}
            />
            <StatCard
              icon={Users}
              iconGradient="blue"
              value={isLoading ? '...' : String(globalStats?.users || 0).padStart(2, '0')}
              label="Usuários"
              onClick={() => handleNavigate('/admin/perfis')}
            />
          </>
        ) : isClientRole ? (
          // Perfis Cliente: apenas Avaliações LGPD, Ações Pendentes e Ações Vencidas
          <>
            <StatCard
              icon={ClipboardCheck}
              iconGradient="emerald"
              value={isLoading ? '...' : String(dashSummary?.avaliacoes?.total || orgStatsData?.complianceAssessments || 0).padStart(2, '0')}
              label="Avaliações LGPD"
              onClick={() => handleNavigate('/avaliacoes')}
            />
            <StatCard
              icon={Clock}
              iconGradient="amber"
              value={isLoading ? '...' : String(dashSummary?.acoes?.pendentes || orgStatsData?.pendingActions || 0).padStart(2, '0')}
              label="Ações Pendentes"
              onClick={() => handleNavigate('/plano-acao/maturidade')}
            />
            <StatCard
              icon={AlertTriangle}
              iconGradient="red"
              value={isLoading ? '...' : String(dashSummary?.acoes?.vencidas || 0).padStart(2, '0')}
              label="Ações Vencidas"
              onClick={() => handleNavigate('/plano-acao/maturidade')}
            />
          </>
        ) : (
          // Admin/Consultor: visão completa
          <>
            <StatCard
              icon={ClipboardCheck}
              iconGradient="emerald"
              value={isLoading ? '...' : String(dashSummary?.avaliacoes?.total ?? orgStatsData?.complianceAssessments ?? 0).padStart(2, '0')}
              label="Avaliações"
              onClick={() => handleNavigate('/avaliacoes')}
            />
            <StatCard
              icon={Clock}
              iconGradient="amber"
              value={isLoading ? '...' : String(dashSummary?.acoes?.pendentes || orgStatsData?.pendingActions || 0).padStart(2, '0')}
              label="Ações Pendentes"
              onClick={() => handleNavigate('/plano-acao/maturidade')}
            />
            <StatCard
              icon={AlertTriangle}
              iconGradient="red"
              value={isLoading ? '...' : String(dashSummary?.acoes?.vencidas || 0).padStart(2, '0')}
              label="Ações Vencidas"
              onClick={() => handleNavigate('/plano-acao/maturidade')}
            />
            <StatCard
              icon={Users}
              iconGradient="violet"
              value={isLoading ? '...' : String(dashSummary?.terceiros?.total || orgStatsData?.thirdParties || 0).padStart(2, '0')}
              label="Terceiros"
              onClick={() => handleNavigate('/terceiros')}
            />
          </>
        )}
      </CardGrid>

      {/* ===== SEÇÃO OPERACIONAL: Prazos + Tarefas + Agenda (InfoCards) ===== */}
      {organizationId && (
        <CardGrid columns={3}>
          {/* Prazos Urgentes */}
          <InfoCard
            icon={AlertTriangle}
            iconGradient="red"
            title={isAdminOrConsultor ? "Prazos da Organização" : "Meus Prazos"}
            subtitle={isAdminOrConsultor ? "Todos os vencimentos" : "Próximos vencimentos"}
            onClick={() => handleNavigate('/prazos')}
            headerAction={<ChevronRight className="h-5 w-5 text-muted-foreground" />}
          >
            {loadingDeadlines ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !(urgentDeadlines?.items?.length) ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-[0.875rem] font-medium">Tudo em dia</p>
                <p className="text-[0.75rem] font-light opacity-70 mt-1">Nenhum prazo urgente no momento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(urgentDeadlines?.items || []).slice(0, 5).map((item: any, idx: number) => {
                  const dias = item.diasRestantes;
                  const sev = dias < 0 ? severityConfig.vencido : dias <= 3 ? severityConfig.critico : dias <= 7 ? severityConfig.atencao : severityConfig.normal;
                  return (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${sev.bg}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.8125rem] font-medium truncate">{item.title}</p>
                        <p className="text-[0.75rem] font-light text-muted-foreground">{formatDate(item.date)}</p>
                      </div>
                      <Badge variant="outline" className={`ml-2 text-[0.6875rem] ${sev.color} border-current`}>
                        {sev.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </InfoCard>

          {/* Minhas Tarefas */}
          <InfoCard
            icon={ListTodo}
            iconGradient="violet"
            title={isAdminOrConsultor ? "Tarefas da Organização" : "Minhas Tarefas"}
            subtitle={isAdminOrConsultor ? "Todas as ações pendentes" : "Ações atribuídas a mim"}
            onClick={() => handleNavigate('/plano-acao/maturidade')}
            headerAction={<ChevronRight className="h-5 w-5 text-muted-foreground" />}
          >
            {loadingTasks ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !myTasks?.totalPending ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-[0.875rem] font-medium">Sem tarefas pendentes</p>
                <p className="text-[0.75rem] font-light opacity-70 mt-1">Suas ações estão em dia</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...(myTasks?.actionPlans || []), ...(myTasks?.tickets || []), ...(myTasks?.cppdTasks || [])].slice(0, 5).map((task: any, idx: number) => {
                  const priorityColors: Record<string, string> = {
                    critica: 'text-red-600 bg-red-50',
                    alta: 'text-orange-600 bg-orange-50',
                    media: 'text-amber-600 bg-amber-50',
                    baixa: 'text-green-600 bg-green-50',
                  };
                  const pColor = priorityColors[task.priority] || priorityColors.media;
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-violet-200 transition-colors">
                      <CircleDot className="h-4 w-4 text-violet-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.8125rem] font-medium truncate">{task.title}</p>
                        {task.dueDate && (
                          <p className="text-[0.75rem] font-light text-muted-foreground">{formatDate(task.dueDate)}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-[0.6875rem] ${pColor} border-current`}>
                        {task.priority || 'média'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </InfoCard>

          {/* Agenda de Pendências */}
          <InfoCard
            icon={CalendarDays}
            iconGradient="blue"
            title="Agenda de Pendências"
            subtitle={new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            headerAction={
              pendingSummary.total > 0 ? (
                <Badge variant="outline" className={`text-[0.6875rem] font-medium ${
                  pendingSummary.vencidos > 0 ? 'bg-red-50 text-red-700 border-red-200' :
                  pendingSummary.criticos > 0 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {pendingSummary.total} {pendingSummary.total === 1 ? 'pendência' : 'pendências'}
                </Badge>
              ) : undefined
            }
          >
            {loadingAgenda || loadingDeadlines ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <>
                {/* Summary badges */}
                {pendingSummary.total > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {pendingSummary.vencidos > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-red-100 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {pendingSummary.vencidos} vencida{pendingSummary.vencidos > 1 ? 's' : ''}
                      </span>
                    )}
                    {pendingSummary.criticos > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-orange-100 text-orange-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        {pendingSummary.criticos} crítica{pendingSummary.criticos > 1 ? 's' : ''}
                      </span>
                    )}
                    {pendingSummary.atencao > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-amber-100 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {pendingSummary.atencao} atenção
                      </span>
                    )}
                    {pendingSummary.noPrazo > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {pendingSummary.noPrazo} no prazo
                      </span>
                    )}
                  </div>
                )}

                {/* Mini calendário compacto */}
                <div className="grid grid-cols-7 gap-0.5 mb-3">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-[0.625rem] font-semibold text-muted-foreground/60 py-0.5 uppercase">{d}</div>
                  ))}
                  {calendarDays.map((d, i) => {
                    const isSelected = selectedCalendarDay === d.day;
                    const dotColor = d.event?.type === 'vencido' ? 'bg-red-500' : 
                                     d.event?.type === 'critico' ? 'bg-orange-500' : 
                                     d.event?.type === 'atencao' ? 'bg-amber-400' : 'bg-emerald-500';
                    return (
                      <button
                        key={i}
                        disabled={!d.day}
                        onClick={() => d.day && setSelectedCalendarDay(isSelected ? null : d.day)}
                        className={`text-center text-[0.6875rem] py-1 rounded-md relative transition-all
                          ${!d.day ? 'cursor-default' : 'cursor-pointer hover:bg-muted/60'}
                          ${d.isToday 
                            ? 'bg-violet-600 text-white font-bold ring-2 ring-violet-300 ring-offset-1' 
                            : isSelected 
                              ? 'bg-violet-100 text-violet-700 font-semibold' 
                              : 'text-card-foreground/70'
                          }
                        `}
                      >
                        {d.day || ''}
                        {d.event && (
                          <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${dotColor} ${
                            d.event.type === 'vencido' ? 'animate-pulse' : ''
                          }`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legenda compacta */}
                <div className="flex items-center gap-3 mb-3 px-1">
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-[0.625rem] text-muted-foreground">Vencido</span></div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /><span className="text-[0.625rem] text-muted-foreground">Crítico</span></div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[0.625rem] text-muted-foreground">Atenção</span></div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[0.625rem] text-muted-foreground">Ok</span></div>
                </div>

                {/* Selected Day items */}
                {selectedDayItems && selectedDayItems.length > 0 && (
                  <div className="border border-violet-200 bg-violet-50/50 rounded-lg p-2.5 mb-3">
                    <p className="text-[0.6875rem] font-semibold text-violet-700 mb-2">
                      📅 Dia {selectedCalendarDay} — {selectedDayItems.length} {selectedDayItems.length === 1 ? 'evento' : 'eventos'}
                    </p>
                    <div className="space-y-1.5">
                      {selectedDayItems.map((item: any, idx: number) => {
                        const sev = severityConfig[item.severity] || severityConfig.normal;
                        return (
                          <div key={idx} className={`flex items-center gap-2 p-1.5 rounded text-[0.75rem] border ${sev.bg}`}>
                            <span className={`font-medium ${sev.color} shrink-0`}>{sev.label}</span>
                            <span className="truncate flex-1">{item.title}</span>
                            <button
                              onClick={() => handleNavigate(getItemRoute(item))}
                              className="text-violet-600 hover:text-violet-800 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedCalendarDay !== null && selectedDayItems && selectedDayItems.length === 0 && (
                  <div className="border border-border/50 bg-muted/30 rounded-lg p-2.5 mb-3 text-center">
                    <p className="text-[0.75rem] text-muted-foreground">Nenhum evento no dia {selectedCalendarDay}</p>
                  </div>
                )}

                {/* Lista de Pendências */}
                <div className="border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wide">📌 Próximos Prazos</p>
                  </div>

                  {pendingItems.length > 0 ? (
                    <div className="space-y-1.5">
                      {pendingItems.slice(0, 5).map((item: any, idx: number) => {
                        const sev = severityConfig[item.severity] || severityConfig.normal;
                        const diasLabel = item.diasRestantes < 0 
                          ? `venceu há ${Math.abs(item.diasRestantes)}d` 
                          : item.diasRestantes === 0 
                            ? 'vence hoje' 
                            : item.diasRestantes === 1 
                              ? 'vence amanhã' 
                              : `vence em ${item.diasRestantes}d`;
                        
                        return (
                          <div 
                            key={idx} 
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-colors hover:shadow-sm cursor-pointer ${sev.bg}`}
                            onClick={() => handleNavigate(getItemRoute(item))}
                          >
                            <div className={`w-1.5 h-8 rounded-full shrink-0 ${
                              item.severity === 'vencido' ? 'bg-red-500' : 
                              item.severity === 'critico' ? 'bg-orange-500' : 
                              item.severity === 'atencao' ? 'bg-amber-400' : 'bg-emerald-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[0.8125rem] font-medium truncate">{item.title}</p>
                              <div className="flex items-center gap-2">
                                <span className={`text-[0.6875rem] font-medium ${sev.color}`}>{diasLabel}</span>
                                <span className="text-[0.625rem] text-muted-foreground">• {getSourceLabel(item)}</span>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-1.5" />
                      <p className="text-[0.8125rem] font-medium text-emerald-700">Tudo em dia!</p>
                      <p className="text-[0.6875rem] text-muted-foreground mt-0.5">Você não possui pendências neste período</p>
                    </div>
                  )}
                </div>

                {/* Botão de ação */}
                {pendingItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 text-[0.75rem] text-violet-700 border-violet-200 hover:bg-violet-50"
                    onClick={() => handleNavigate('/prazos')}
                  >
                    Ver todos os prazos
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                )}
              </>
            )}
          </InfoCard>
        </CardGrid>
      )}

      {/* ===== INDICADORES DE SLA ===== */}
      {organizationId && !isClientRole && (
        <InfoCard
          icon={Timer}
          iconGradient="pink"
          title="Indicadores de Atendimento"
          subtitle="Resumo de chamados e SLA"
          onClick={() => handleNavigate('/meudpo/sla')}
          headerAction={<ChevronRight className="h-5 w-5 text-muted-foreground" />}
          className="min-h-0"
        >
          {loadingSLA ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : !slaSummary || (slaSummary as any).total === 0 ? (
            <div className="flex items-center gap-4 py-3 px-4 rounded-lg bg-muted/30 border border-border/50">
              <Headphones className="h-10 w-10 text-muted-foreground/30 shrink-0" />
              <div>
                <p className="text-[0.8125rem] font-medium text-muted-foreground">Sem chamados registrados</p>
                <p className="text-[0.75rem] font-light text-muted-foreground/70 mt-0.5">Os indicadores aparecerão quando houver chamados abertos</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 ml-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { value: (slaSummary as any).total || 0, label: 'Total', bg: 'bg-slate-50 dark:bg-slate-900/30', color: 'text-slate-700 dark:text-slate-300' },
                { value: (slaSummary as any).abertos || 0, label: 'Abertos', bg: 'bg-blue-50 dark:bg-blue-900/30', color: 'text-blue-700 dark:text-blue-300' },
                { value: (slaSummary as any).resolvidos || 0, label: 'Resolvidos', bg: 'bg-green-50 dark:bg-green-900/30', color: 'text-green-700 dark:text-green-300' },
                { value: (slaSummary as any).violados || 0, label: 'SLA Violado', bg: 'bg-red-50 dark:bg-red-900/30', color: 'text-red-700 dark:text-red-300' },
                { value: `${(slaSummary as any).tempoMedioResolucaoHoras || '\u2014'}h`, label: 'Tempo Médio', bg: 'bg-violet-50 dark:bg-violet-900/30', color: 'text-violet-700 dark:text-violet-300' },
              ].map((item, idx) => (
                <div key={idx} className={`text-center p-3 rounded-lg ${item.bg}`}>
                  <p className={`text-[1.5rem] font-semibold ${item.color}`}>{item.value}</p>
                  <p className="text-[0.6875rem] font-medium text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </InfoCard>
      )}

      {/* ===== MÓDULOS (ModuleCards) ===== */}
      <SectionHeader title="Módulos" subtitle="Acesse as ferramentas disponíveis" />
      <CardGrid columns={3}>
        {modules
          .filter(m => {
            // Para clientes: mostrar TODOS os módulos (ativos e desabilitados)
            if (isClientRole) return true;
            // Para consultores/admin: manter filtro original
            return !m.consultorOnly || isAdminOrConsultor;
          })
          .map((module) => {
            // Para clientes, desabilitar todos exceto os módulos ativos
            const isDisabledForClient = isClientRole && !clientActiveModules.includes(module.id);
            return (
              <ModuleCard
                key={module.id}
                tag={module.tag}
                title={module.title}
                subtitle={module.subtitle}
                description={module.description}
                icon={module.icon}
                gradient={module.gradient}
                customGradient={module.customGradient}
                metrics={module.metrics}
                buttons={isDisabledForClient ? [] : module.buttons}
                disabled={isDisabledForClient}
                disabledTooltip="Em breve"
              />
            );
          })}
      </CardGrid>

      {/* ===== AÇÕES RÁPIDAS (admin/consultor) ===== */}
      {isAdminOrConsultor && (
        <InfoCard
          icon={Shield}
          iconGradient="violet"
          title="Ações Rápidas"
          subtitle="Acesso direto às principais funcionalidades"
          className="min-h-0"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Building2, label: 'Nova Organização', path: '/organizacoes' },
              { icon: Users, label: 'Novo Terceiro', path: '/terceiros/novo' },
              { icon: ClipboardCheck, label: 'Nova Avaliação Maturidade', path: '/avaliacoes' },
              { icon: FileSearch, label: 'Nova Due Diligence', path: '/due-diligence/nova' },
            ].map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-12 border-border/50 hover:border-violet-200 hover:bg-violet-50/50 font-light text-[0.8125rem] transition-all"
                onClick={() => setLocation(action.path)}
              >
                <action.icon className="mr-2 h-4 w-4 text-violet-600" />
                {action.label}
              </Button>
            ))}
          </div>
        </InfoCard>
      )}

      {/* ===== ATIVIDADE RECENTE ===== Visível apenas para equipe interna (Admin Global e Consultor) */}
      {isAdminOrConsultor && (
        <InfoCard
          icon={TrendingUp}
          iconGradient="blue"
          title="Atividade Recente"
          subtitle="Últimas ações realizadas na plataforma"
          className="min-h-0"
        >
        {loadingActivity ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !recentActivity?.length ? (
          <div className="text-center py-10 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-[1.125rem] font-semibold text-muted-foreground">Nenhuma atividade recente</p>
            <p className="text-[0.875rem] font-light opacity-70 mt-1">As ações realizadas na plataforma aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(recentActivity as any[]).map((activity: any, idx: number) => {
              const IconComp = activityIcons[activity.activityType] || Activity;
              const colorClass = activityColors[activity.activityType] || 'bg-slate-100 text-slate-600';
              return (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] font-medium truncate">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[0.6875rem] text-muted-foreground">{activity.userName}</span>
                      {activity.module && (
                        <>
                          <span className="text-[0.6875rem] text-muted-foreground">\u00B7</span>
                          <Badge variant="outline" className="text-[0.6875rem] h-5 px-1.5">
                            {moduleLabels[activity.module] || activity.module}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-[0.6875rem] text-muted-foreground shrink-0">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        </InfoCard>
      )}
    </div>
  );
}
