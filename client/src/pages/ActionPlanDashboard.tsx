import { useState, useMemo } from 'react';
import { ACTION_STATUS_COLORS, ACTION_STATUS_LABELS, ACTION_PRIORITY_COLORS, ACTION_PRIORITY_LABELS } from '@/lib/statusConstants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User,
  Calendar,
  Search,
  Ticket,
  TrendingUp,
  Briefcase,
  LayoutList,
  Columns3,
  GripVertical,
  ArrowRight,
  Shield,
  FileCheck,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ActionPlanAssignModal } from '@/components/ActionPlanAssignModal';
import { useToast } from '@/contexts/ToastContext';

interface ActionPlanItem {
  id: number;
  title: string;
  description: string | null;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  dueDate: string | null;
  actionCategory?: 'contratual' | 'operacional' | null;
  outputType?: string | null;
  linkedClauseId?: string | null;
  convertedToTicketId?: number | null;
  responsibleId?: number | null;
  assessmentType: string;
  assessmentId: number;
  originName?: string | null;
  createdAt: string;
}

type ViewMode = 'lista' | 'kanban';

// Configuração dos tipos de plano (assessmentType)
const ASSESSMENT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; badgeClass: string; description: string }> = {
  compliance: {
    label: 'Avaliação de Maturidade',
    icon: Shield,
    color: 'text-violet-700',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    description: 'Ações originadas de avaliações de conformidade e maturidade',
  },
  contract_analysis: {
    label: 'Análise de Contratos',
    icon: FileCheck,
    color: 'text-blue-700',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Ações originadas de análises contratuais',
  },
  third_party: {
    label: 'Gestão de Terceiros',
    icon: Users,
    color: 'text-cyan-700',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Ações originadas de avaliações de terceiros',
  },
  dpia: {
    label: 'Relatório de Impacto (RIPD)',
    icon: FileText,
    color: 'text-amber-700',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Ações originadas de relatórios de impacto à proteção de dados',
  },
};

const KANBAN_COLUMNS = [
  { key: 'pendente', label: 'Pendente', color: 'bg-gray-100 border-gray-300', headerColor: 'bg-gray-500', icon: Clock },
  { key: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-50 border-blue-300', headerColor: 'bg-blue-500', icon: TrendingUp },
  { key: 'concluida', label: 'Concluída', color: 'bg-green-50 border-green-300', headerColor: 'bg-green-500', icon: CheckCircle },
  { key: 'cancelada', label: 'Cancelada', color: 'bg-red-50 border-red-300', headerColor: 'bg-red-500', icon: AlertTriangle },
];

export default function ActionPlanDashboard() {
  const { selectedOrganization } = useOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<ActionPlanItem | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [draggedItem, setDraggedItem] = useState<ActionPlanItem | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toastCtx = useToast();

  const { data: actionsData, refetch } = trpc.actionPlan.list.useQuery(
    { organizationId: selectedOrganization?.id || 0 },
    { enabled: !!selectedOrganization?.id, staleTime: 30000 }
  );

  const updateStatus = trpc.actionPlan.update.useMutation({
    onSuccess: () => {
      refetch();
      toastCtx.success('Situação atualizada', 'A ação foi movida com sucesso.');
    },
    onError: () => {
      toastCtx.error('Erro', 'Não foi possível atualizar a situação.');
    },
  });

  const actions = (actionsData || []) as ActionPlanItem[];

  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      const matchesSearch = !searchTerm || 
        action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.originName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || action.assessmentType === typeFilter;
      const matchesCategory = categoryFilter === 'all' || 
        action.actionCategory === categoryFilter ||
        (!action.actionCategory && categoryFilter === 'contratual');
      const matchesStatus = statusFilter === 'all' || action.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || action.priority === priorityFilter;
      return matchesSearch && matchesType && matchesCategory && matchesStatus && matchesPriority;
    });
  }, [actions, searchTerm, typeFilter, categoryFilter, statusFilter, priorityFilter]);

  // Agrupar ações por assessmentType
  const groupedByType = useMemo(() => {
    const groups: Record<string, ActionPlanItem[]> = {};
    filteredActions.forEach(action => {
      const key = action.assessmentType || 'outros';
      if (!groups[key]) groups[key] = [];
      groups[key].push(action);
    });
    // Ordenar cada grupo por prioridade e data
    const priorityOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
    Object.values(groups).forEach(group => {
      group.sort((a, b) => {
        // Atrasadas primeiro
        const now = new Date();
        const aOverdue = a.dueDate && new Date(a.dueDate) < now && a.status !== 'concluida' ? 0 : 1;
        const bOverdue = b.dueDate && new Date(b.dueDate) < now && b.status !== 'concluida' ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        // Depois por prioridade
        const aPrio = priorityOrder[a.priority] ?? 2;
        const bPrio = priorityOrder[b.priority] ?? 2;
        if (aPrio !== bPrio) return aPrio - bPrio;
        // Depois por data
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return 0;
      });
    });
    return groups;
  }, [filteredActions]);

  // Tipos presentes nos dados (para tabs)
  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(actions.map(a => a.assessmentType)));
    return types.sort((a, b) => {
      const order = ['compliance', 'contract_analysis', 'third_party', 'dpia'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [actions]);

  const stats = useMemo(() => {
    const total = actions.length;
    const byType: Record<string, number> = {};
    actions.forEach(a => {
      byType[a.assessmentType] = (byType[a.assessmentType] || 0) + 1;
    });
    const pendentes = actions.filter(a => a.status === 'pendente').length;
    const emAndamento = actions.filter(a => a.status === 'em_andamento').length;
    const concluidas = actions.filter(a => a.status === 'concluida').length;
    const criticas = actions.filter(a => a.priority === 'critica' && a.status !== 'concluida').length;
    const now = new Date();
    const prazoProximo = actions.filter(a => {
      if (!a.dueDate || a.status === 'concluida') return false;
      const due = new Date(a.dueDate);
      const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7 && diff >= 0;
    }).length;
    const atrasadas = actions.filter(a => {
      if (!a.dueDate || a.status === 'concluida') return false;
      return new Date(a.dueDate) < now;
    }).length;
    const progressoGeral = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    return { total, byType, pendentes, emAndamento, concluidas, criticas, prazoProximo, atrasadas, progressoGeral };
  }, [actions]);

  const getPriorityBadge = (priority: string) => ({
    label: ACTION_PRIORITY_LABELS[priority] ?? priority,
    class: ACTION_PRIORITY_COLORS[priority] ?? 'bg-gray-100 text-gray-600 border-gray-200',
  });

  const getStatusBadge = (status: string) => ({
    label: ACTION_STATUS_LABELS[status] ?? status,
    class: ACTION_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-200',
  });

  const handleAssign = (action: ActionPlanItem) => {
    setSelectedAction(action);
    setAssignModalOpen(true);
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Drag and Drop handlers para Kanban
  const handleDragStart = (e: React.DragEvent, action: ActionPlanItem) => {
    setDraggedItem(action);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', action.id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.status === newStatus) {
      setDraggedItem(null);
      return;
    }
    updateStatus.mutate({
      id: draggedItem.id,
      status: newStatus as any,
    });
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Agrupar ações por status para o Kanban
  const actionsByStatus = useMemo(() => {
    const grouped: Record<string, ActionPlanItem[]> = {
      pendente: [],
      em_andamento: [],
      concluida: [],
      cancelada: [],
    };
    filteredActions.forEach(action => {
      if (grouped[action.status]) {
        grouped[action.status].push(action);
      }
    });
    return grouped;
  }, [filteredActions]);

  return (
      <div className="space-y-6">
        {/* Header com toggle de visualização */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-gray-900">Plano de Ação</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe e gerencie as ações de conformidade, contratuais e operacionais
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedOrganization && (
              <Badge variant="outline" className="w-fit">
                {selectedOrganization.name}
              </Badge>
            )}
            {/* Toggle Lista / Kanban */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'lista' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('lista')}
                className="gap-1.5"
              >
                <LayoutList className="h-4 w-4" />
                Lista
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="gap-1.5"
              >
                <Columns3 className="h-4 w-4" />
                Quadro
              </Button>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas por Tipo */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          <StatCard icon={ClipboardList} iconGradient="violet" value={stats.total} label="Total" />
          {availableTypes.map(type => {
            const config = ASSESSMENT_TYPE_CONFIG[type];
            if (!config) return null;
            const gradient = type === 'compliance' ? 'violet' : type === 'contract_analysis' ? 'blue' : type === 'third_party' ? 'teal' : 'amber';
            return (
              <StatCard key={type} icon={config.icon} iconGradient={gradient as any} value={stats.byType[type] || 0} label={config.label.split(' ').slice(0, 2).join(' ')} />
            );
          })}
          <StatCard icon={AlertTriangle} iconGradient="red" value={stats.criticas} label="Críticas" />
          <StatCard icon={CheckCircle} iconGradient="emerald" value={stats.concluidas} label="Concluídas" />
        </div>

        {/* Alertas de Prazo */}
        {(stats.atrasadas > 0 || stats.prazoProximo > 0) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-4 w-4" />
                Alertas de Prazo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {stats.atrasadas > 0 && (
                  <div className="flex items-center gap-2 text-red-700">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{stats.atrasadas}</span>
                    <span className="text-sm">ação(ões) atrasada(s)</span>
                  </div>
                )}
                {stats.prazoProximo > 0 && (
                  <div className="flex items-center gap-2 text-orange-700">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">{stats.prazoProximo}</span>
                    <span className="text-sm">ação(ões) vencem em até 7 dias</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progresso Geral */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{stats.concluidas} de {stats.total} ações concluídas</span>
                <span className="font-medium">{stats.progressoGeral}%</span>
              </div>
              <Progress value={stats.progressoGeral} className="h-2" />
              {stats.atrasadas > 0 && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.atrasadas} ação(ões) atrasada(s)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Tipo de Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  {availableTypes.map(type => {
                    const config = ASSESSMENT_TYPE_CONFIG[type];
                    return config ? (
                      <SelectItem key={type} value={type}>{config.label}</SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="contratual">Contratuais</SelectItem>
                  <SelectItem value="operacional">Operacionais</SelectItem>
                </SelectContent>
              </Select>
              {viewMode === 'lista' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Situações</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida_cliente">Concluída (Cliente)</SelectItem>
                    <SelectItem value="pendente_validacao_dpo">Aguardando Validação</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Prioridades</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo: Lista agrupada por tipo ou Kanban */}
        {viewMode === 'lista' ? (
          <div className="space-y-6">
            {Object.entries(groupedByType).length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma ação encontrada</p>
                </CardContent>
              </Card>
            )}
            {/* Renderizar cada grupo de assessmentType como seção distinta */}
            {Object.entries(groupedByType).map(([type, groupActions]) => {
              const config = ASSESSMENT_TYPE_CONFIG[type] || {
                label: type,
                icon: ClipboardList,
                color: 'text-gray-700',
                badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
                description: '',
              };
              const Icon = config.icon;
              const isCollapsed = collapsedGroups[type] || false;
              const groupConcluidas = groupActions.filter(a => a.status === 'concluida').length;
              const groupProgress = groupActions.length > 0 ? Math.round((groupConcluidas / groupActions.length) * 100) : 0;

              // Agrupar por origem (assessmentId) dentro do tipo
              const byOrigin: Record<string, { name: string; actions: ActionPlanItem[] }> = {};
              groupActions.forEach(a => {
                const key = `${a.assessmentId}`;
                if (!byOrigin[key]) {
                  byOrigin[key] = { name: a.originName || `#${a.assessmentId}`, actions: [] };
                }
                byOrigin[key].actions.push(a);
              });

              return (
                <div key={type} className="space-y-3">
                  {/* Cabeçalho do grupo */}
                  <div
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => toggleGroup(type)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.badgeClass}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                          {config.label}
                          <Badge variant="outline" className="text-xs font-normal">
                            {groupActions.length} ação(ões)
                          </Badge>
                        </h2>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{groupProgress}% concluído</span>
                        <div className="w-24">
                          <Progress value={groupProgress} className="h-1.5" />
                        </div>
                      </div>
                      {isCollapsed ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-gray-700 transition-colors" />
                      ) : (
                        <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-gray-700 transition-colors" />
                      )}
                    </div>
                  </div>

                  {/* Conteúdo do grupo */}
                  {!isCollapsed && (
                    <div className="space-y-4 pl-2 border-l-2 border-gray-100 ml-4">
                      {Object.entries(byOrigin).map(([originKey, origin]) => (
                        <div key={originKey} className="space-y-2">
                          {/* Sub-cabeçalho: nome da origem */}
                          <div className="flex items-center gap-2 pl-3 pt-1">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium text-gray-600">{origin.name}</span>
                            <Badge variant="outline" className="text-[10px]">{origin.actions.length}</Badge>
                          </div>
                          {/* Lista de ações desta origem */}
                          <div className="space-y-2 pl-3">
                            {origin.actions.map(action => (
                              <ActionCard
                                key={action.id}
                                action={action}
                                onAssign={handleAssign}
                                getPriorityBadge={getPriorityBadge}
                                getStatusBadge={getStatusBadge}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Visualização Kanban */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map(column => {
              const columnActions = actionsByStatus[column.key] || [];
              const Icon = column.icon;
              return (
                <div
                  key={column.key}
                  className={`rounded-lg border-2 ${column.color} min-h-[400px] flex flex-col`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.key)}
                >
                  {/* Cabeçalho da coluna */}
                  <div className={`${column.headerColor} text-white px-4 py-3 rounded-t-md flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{column.label}</span>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                      {columnActions.length}
                    </Badge>
                  </div>

                  {/* Cards da coluna */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
                    {columnActions.length === 0 && (
                      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground opacity-60">
                        Arraste ações para cá
                      </div>
                    )}
                    {columnActions.map(action => {
                      const priority = getPriorityBadge(action.priority);
                      const typeConfig = ASSESSMENT_TYPE_CONFIG[action.assessmentType];
                      const isOverdue = action.dueDate && new Date(action.dueDate) < new Date() && action.status !== 'concluida';
                      return (
                        <div
                          key={action.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, action)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-md border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow ${
                            isOverdue ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                          } ${draggedItem?.id === action.id ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">{action.title}</h4>
                              {action.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{action.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-1 mt-2">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priority.class}`}>
                                  {priority.label}
                                </Badge>
                                {typeConfig && (
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeConfig.badgeClass}`}>
                                    {typeConfig.label.split(' ').slice(0, 2).join(' ')}
                                  </Badge>
                                )}
                              </div>
                              {action.dueDate && (
                                <div className={`flex items-center gap-1 mt-2 text-[11px] ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                  <Calendar className="h-3 w-3" />
                                  {new Date(action.dueDate).toLocaleDateString('pt-BR')}
                                  {isOverdue && ' (Atrasado)'}
                                </div>
                              )}
                              {action.convertedToTicketId && (
                                <div className="flex items-center gap-1 mt-1 text-[11px] text-green-700">
                                  <Ticket className="h-3 w-3" />
                                  Chamado #{action.convertedToTicketId}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => handleAssign(action)}
                              disabled={action.status === 'concluida'}
                            >
                              <User className="h-3 w-3 mr-1" />
                              Atribuir
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Atribuição */}
        <ActionPlanAssignModal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          action={selectedAction}
          organizationId={selectedOrganization?.id || 0}
          onSuccess={() => refetch()}
        />
      </div>
  );
}

// Componente de Card de Ação individual
function ActionCard({ 
  action, 
  onAssign,
  getPriorityBadge,
  getStatusBadge,
}: { 
  action: ActionPlanItem;
  onAssign: (action: ActionPlanItem) => void;
  getPriorityBadge: (priority: string) => { label: string; class: string };
  getStatusBadge: (status: string) => { label: string; class: string };
}) {
  const priority = getPriorityBadge(action.priority);
  const status = getStatusBadge(action.status);
  const isOverdue = action.dueDate && new Date(action.dueDate) < new Date() && action.status !== 'concluida';
  
  return (
    <Card className={isOverdue ? 'border-red-200 bg-red-50/50' : ''}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{action.title}</h4>
              {action.convertedToTicketId && (
                <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                  <Ticket className="h-3 w-3 mr-1" />
                  Chamado #{action.convertedToTicketId}
                </Badge>
              )}
            </div>
            {action.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{action.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={priority.class}>{priority.label}</Badge>
              <Badge variant="outline" className={status.class}>{status.label}</Badge>
              <Badge variant="outline" className={action.actionCategory === 'operacional' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}>
                {action.actionCategory === 'operacional' ? 'Operacional' : 'Contratual'}
              </Badge>
              {action.dueDate && (
                <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                  <Calendar className="h-3 w-3" />
                  {new Date(action.dueDate).toLocaleDateString('pt-BR')}
                  {isOverdue && ' (Atrasado)'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onAssign(action)} disabled={action.status === 'concluida'}>
              <User className="h-4 w-4 mr-1" />
              Atribuir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
