import { useState, useMemo } from 'react';
import { ACTION_STATUS_COLORS, ACTION_STATUS_LABELS, ACTION_PRIORITY_COLORS, ACTION_PRIORITY_LABELS } from '@/lib/statusConstants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users,
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Search,
  TrendingUp,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { ActionPlanAssignModal } from '@/components/ActionPlanAssignModal';
import { useToast } from '@/contexts/ToastContext';
import { useLocation } from 'wouter';

interface ActionPlanItem {
  id: number;
  title: string;
  description: string | null;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  dueDate: string | null;
  responsibleId?: number | null;
  assessmentType: string;
  assessmentId: number;
  originName?: string | null;
  createdAt: string;
}

export default function ActionPlanDueDiligencePage() {
  const { selectedOrganization } = useOrganization();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<ActionPlanItem | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const toastCtx = useToast();

  // Verificar se o usuário tem acesso (apenas Equipe Interna)
  const isInternalUser = user?.role === 'admin_global' || user?.role === 'consultor';
  const isClientUser = user?.role === 'sponsor' || user?.role === 'comite' || user?.role === 'lider_processo' || user?.role === 'gestor_area' || user?.role === 'respondente';

  // Carregar apenas planos de ação de Due Diligence
  const { data: actionsData, refetch } = trpc.actionPlan.listByType.useQuery(
    { organizationId: selectedOrganization?.id || 0, assessmentType: 'third_party' },
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

  // Dados já vêm filtrados do backend
  const actions = useMemo(() => {
    return (actionsData || []) as ActionPlanItem[];
  }, [actionsData]);

  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      const matchesSearch = !searchTerm || 
        action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        action.originName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || action.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || action.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [actions, searchTerm, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    const total = actions.length;
    const pendentes = actions.filter(a => a.status === 'pendente').length;
    const emAndamento = actions.filter(a => a.status === 'em_andamento').length;
    const concluidas = actions.filter(a => a.status === 'concluida').length;
    const criticas = actions.filter(a => a.priority === 'critica' && a.status !== 'concluida').length;
    const now = new Date();
    const atrasadas = actions.filter(a => {
      if (!a.dueDate || a.status === 'concluida') return false;
      return new Date(a.dueDate) < now;
    }).length;
    const progressoGeral = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    return { total, pendentes, emAndamento, concluidas, criticas, atrasadas, progressoGeral };
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

  const handleStatusChange = (actionId: number, newStatus: string) => {
    updateStatus.mutate({
      id: actionId,
      status: newStatus as any,
    });
  };

  // Se não for usuário interno, mostrar mensagem de acesso restrito
  if (isClientUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>

          <Card className="bg-white border-slate-200">
            <CardContent className="pt-12 pb-12 text-center">
              <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
              <p className="text-slate-600 text-lg">
                Este módulo está disponível apenas para a Equipe Interna Seusdados.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-cyan-600" />
              <h1 className="text-3xl font-bold text-slate-900">
                Plano de Ação – Due Diligence
              </h1>
            </div>
            <p className="text-slate-600">
              Ações originadas de avaliações de terceiros e fornecedores
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-600">{stats.total}</div>
                <div className="text-sm text-slate-600 mt-1">Total de Ações</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-600">{stats.pendentes}</div>
                <div className="text-sm text-slate-600 mt-1">Pendentes</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{stats.criticas}</div>
                <div className="text-sm text-slate-600 mt-1">Críticas</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.concluidas}</div>
                <div className="text-sm text-slate-600 mt-1">Concluídas</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white border-slate-200 mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar ações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Prioridades</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions List */}
        <div className="space-y-4">
          {filteredActions.length === 0 ? (
            <Card className="bg-white border-slate-200">
              <CardContent className="pt-12 pb-12 text-center">
                <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">Nenhuma ação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            filteredActions.map(action => (
              <Card key={action.id} className="bg-white border-slate-200 hover:border-cyan-300 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{action.title}</h3>
                      {action.description && (
                        <p className="text-slate-600 text-sm mb-3">{action.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={getPriorityBadge(action.priority).class}>
                          {getPriorityBadge(action.priority).label}
                        </Badge>
                        <Badge className={getStatusBadge(action.status).class}>
                          {getStatusBadge(action.status).label}
                        </Badge>
                        {action.originName && (
                          <Badge variant="outline" className="text-cyan-600 border-cyan-200">
                            {action.originName}
                          </Badge>
                        )}
                      </div>
                      {action.dueDate && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4" />
                          Prazo: {new Date(action.dueDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Select 
                        value={action.status} 
                        onValueChange={(value) => handleStatusChange(action.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="concluida">Concluída</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssign(action)}
                      >
                        Atribuir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {selectedAction && (
        <ActionPlanAssignModal
          action={selectedAction}
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedAction(null);
          }}
          onSuccess={() => {
            refetch();
            setAssignModalOpen(false);
            setSelectedAction(null);
          }}
        />
      )}
    </div>
  );
}
