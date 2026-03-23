import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Search, 
  Filter, 
  Ticket, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Paperclip,
  Eye,
  Building2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LayoutGrid,
  List,
  Timer,
  Calendar,
  User,
  ChevronRight,
  RefreshCw,
  FileText,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { DynamicBreadcrumbs } from "@/components/DynamicBreadcrumbs";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Importar componentes MeuDPO Premium
import {
  SLAIndicator,
  StatusBadge,
  PriorityBadge,
  TicketTypeBadge,
  MetricCard,
  AnimatedCounter,
  TICKET_TYPE_CONFIG,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  type TicketType,
  type TicketPriority,
  type TicketStatus
} from "@/components/MeuDPO/UIComponents";

// Tipos de ticket
const TICKET_TYPES = [
  { value: "solicitacao_titular", label: "Solicitação de Titular" },
  { value: "incidente_seguranca", label: "Incidente de Segurança" },
  { value: "duvida_juridica", label: "Dúvida Jurídica" },
  { value: "consultoria_geral", label: "Consultoria Geral" },
  { value: "auditoria", label: "Auditoria" },
  { value: "treinamento", label: "Treinamento" },
  { value: "documentacao", label: "Documentação" }
];

// Prioridades
const PRIORITIES = [
  { value: "baixa", label: "Baixa", color: "bg-gray-500" },
  { value: "media", label: "Média", color: "bg-blue-500" },
  { value: "alta", label: "Alta", color: "bg-orange-500" },
  { value: "critica", label: "Crítica", color: "bg-red-500" }
];

// Status
const STATUSES = [
  { value: "novo", label: "Novo", color: "bg-blue-500", icon: Ticket },
  { value: "em_analise", label: "Em Análise", color: "bg-yellow-500", icon: Clock },
  { value: "aguardando_cliente", label: "Aguardando Cliente", color: "bg-purple-500", icon: MessageSquare },
  { value: "aguardando_terceiro", label: "Aguardando Terceiro", color: "bg-indigo-500", icon: Building2 },
  { value: "resolvido", label: "Resolvido", color: "bg-green-500", icon: CheckCircle },
  { value: "cancelado", label: "Cancelado", color: "bg-gray-500", icon: XCircle }
];

// Componente de Card de Ticket Premium
function TicketCard({ 
  ticket, 
  onClick,
  isDragging = false
}: { 
  ticket: any; 
  onClick: () => void;
  isDragging?: boolean;
}) {
  const isOverdue = ticket.deadline && new Date(ticket.deadline) < new Date() && 
    ticket.status !== 'resolvido' && ticket.status !== 'cancelado';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: isDragging ? 1 : 1.01 }}
      className={`
        border rounded-xl p-4 cursor-pointer transition-all duration-200
        hover:shadow-md hover:border-primary/30
        ${isOverdue ? 'border-red-200 bg-red-50/30' : 'bg-card'}
        ${isDragging ? 'shadow-xl ring-2 ring-primary/50 opacity-90' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header do ticket */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {ticket.ticketNumber ? `#${ticket.ticketNumber.toString().padStart(6, '0')}` : `#${ticket.id}`}
            </span>
            <TicketTypeBadge type={ticket.ticketType as TicketType} size="sm" />
            <PriorityBadge priority={ticket.priority as TicketPriority} size="sm" />
          </div>
          
          {/* Título */}
          <h3 className="font-semibold text-foreground line-clamp-1">
            {ticket.title}
          </h3>
          
          {/* Descrição */}
          <p className="body-small line-clamp-2">
            {ticket.description}
          </p>
          
          {/* Footer com status e SLA */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <StatusBadge status={ticket.status as TicketStatus} size="sm" />
            
            {/* SLA para tickets em andamento */}
            {ticket.deadline && ticket.status !== 'resolvido' && ticket.status !== 'cancelado' && (
              <div className="flex-1 max-w-[200px]">
                <SLAIndicator 
                  deadline={ticket.deadline} 
                  status={ticket.status as TicketStatus}
                  size="sm"
                  showLabel={false}
                />
              </div>
            )}
            
            {/* Indicador de tempo de resolução para tickets resolvidos */}
            {ticket.status === 'resolvido' && ticket.resolvedAt && ticket.createdAt && (
              <div className="flex items-center gap-1.5 text-xs">
                <Timer className="h-3 w-3 text-green-600" />
                <span className="text-green-600 font-medium">
                  {(() => {
                    const created = new Date(ticket.createdAt);
                    const resolved = new Date(ticket.resolvedAt);
                    const diffMs = resolved.getTime() - created.getTime();
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffHours / 24);
                    const remainingHours = diffHours % 24;
                    
                    if (diffDays > 0) {
                      return `${diffDays}d ${remainingHours}h`;
                    }
                    return `${diffHours}h`;
                  })()}
                </span>
                {ticket.deadline && (
                  <span className={`text-xs ${
                    new Date(ticket.resolvedAt) <= new Date(ticket.deadline) 
                      ? 'text-green-600' 
                      : 'text-red-500'
                  }`}>
                    {new Date(ticket.resolvedAt) <= new Date(ticket.deadline) 
                      ? '✓ No prazo' 
                      : '✗ Fora do SLA'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Coluna direita - data e ações */}
        <div className="flex flex-col items-end gap-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="text-xs">
              {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
          
          {ticket.assignedTo && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="text-xs truncate max-w-[100px]">
                {ticket.assignedTo.name?.split(' ')[0] || 'Atribuído'}
              </span>
            </div>
          )}
          
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}

// Componente de Ticket Sortable para drag-and-drop
function SortableTicketCard({ 
  ticket, 
  onTicketClick 
}: { 
  ticket: any; 
  onTicketClick: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard 
        ticket={ticket} 
        onClick={() => onTicketClick(ticket.id)}
        isDragging={isDragging}
      />
    </div>
  );
}

// Componente de Kanban Column com drag-and-drop
function KanbanColumn({ 
  status, 
  tickets, 
  onTicketClick,
  isOver = false
}: { 
  status: typeof STATUSES[0]; 
  tickets: any[]; 
  onTicketClick: (id: number) => void;
  isOver?: boolean;
}) {
  const statusConfig = STATUS_CONFIG[status.value as TicketStatus];
  const ticketIds = tickets.map(t => t.id);
  
  return (
    <div className={`flex-shrink-0 w-[320px] transition-all duration-200 ${isOver ? 'scale-[1.02]' : ''}`}>
      <div className={`rounded-t-lg px-3 py-2 ${statusConfig?.bgColor || 'bg-muted'} ${isOver ? 'ring-2 ring-primary' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <status.icon className={`h-4 w-4 ${statusConfig?.color || ''}`} />
            <span className={`font-medium text-sm ${statusConfig?.color || ''}`}>
              {status.label}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {tickets.length}
          </Badge>
        </div>
      </div>
      
      <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
        <ScrollArea className={`h-[calc(100vh-400px)] border border-t-0 rounded-b-lg bg-muted/20 ${isOver ? 'bg-primary/5' : ''}`}>
          <div className="p-2 space-y-2 min-h-[100px]">
            {tickets.map((ticket) => (
              <SortableTicketCard
                key={ticket.id}
                ticket={ticket}
                onTicketClick={onTicketClick}
              />
            ))}
            
            {tickets.length === 0 && (
              <div className={`text-center py-8 body-small ${isOver ? 'text-primary' : ''}`}>
                {isOver ? 'Solte aqui para mover' : 'Nenhum ticket'}
              </div>
            )}
          </div>
        </ScrollArea>
      </SortableContext>
    </div>
  );
}

export default function Tickets() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const selectedOrganizationId = selectedOrganization?.id || null;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [blockFilter, setBlockFilter] = useState<string>("all"); // Filtro por bloco de serviço CSC
  
  // Query para buscar blocos do catálogo de serviços
  const { data: serviceCatalog } = trpc.serviceCatalog.getFullCatalog.useQuery();
  
  // Sensores para drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mínimo de 8px para iniciar drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Form state
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    ticketType: "consultoria_geral",
    priority: "media"
  });

  const userRole = user?.role || 'sponsor';
  const canManageTickets = userRole === 'admin_global' || userRole === 'consultor';
  
  // Determinar organização para consulta
  const queryOrgId = canManageTickets ? selectedOrganizationId : user?.organizationId;

  // Query para listar tickets
  const { data: ticketsData, isLoading, refetch } = trpc.tickets.list.useQuery({
    organizationId: queryOrgId || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    ticketType: typeFilter !== "all" ? typeFilter as any : undefined,
    priority: priorityFilter !== "all" ? priorityFilter as any : undefined,
    search: debouncedSearch || undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    page: currentPage,
    pageSize: 50 // Aumentado para Kanban
  }, {
    enabled: !!queryOrgId || canManageTickets
  });

  // Query para métricas
  const { data: metrics, isLoading: metricsLoading } = trpc.tickets.getDashboardMetrics.useQuery({
    organizationId: queryOrgId || undefined,
    period: "ultimos_30_dias"
  }, {
    enabled: !!queryOrgId || canManageTickets
  });

  // Mutation para criar ticket
  const createTicketMutation = trpc.tickets.create.useMutation({
    onSuccess: (data) => {
      const ticketNum = data.ticketNumber ? `#${data.ticketNumber.toString().padStart(6, '0')}` : `#${data.id}`;
      toast.success(`Chamado ${ticketNum} criado com sucesso! SLA: ${data.slaLevel}`);
      setIsCreateDialogOpen(false);
      setNewTicket({ title: "", description: "", ticketType: "consultoria_geral", priority: "media" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar ticket: ${error.message}`);
    }
  });

  // Mutation para atualizar status (drag-and-drop) com optimistic update
  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.tickets.updateStatus.useMutation({
    onMutate: async (newData) => {
      // Cancelar queries em andamento
      await utils.tickets.list.cancel();
      
      // Snapshot do estado anterior
      const previousTickets = utils.tickets.list.getData();
      
      // Atualizar otimisticamente
      utils.tickets.list.setData(undefined, (old: any) => {
        if (!old) return old;
        return old.map((ticket: any) => 
          ticket.id === (newData as any).id 
            ? { ...ticket, status: (newData as any).status }
            : ticket
        );
      });
      
      return { previousTickets };
    },
    onSuccess: (data) => {
      if (!data) return;
      const ticketNum = data.ticketNumber ? `#${data.ticketNumber.toString().padStart(6, '0')}` : `#${data.id}`;
      toast.success(`Status do chamado ${ticketNum} atualizado para ${STATUS_CONFIG[data.status as TicketStatus]?.label || data.status}`);
    },
    onError: (error, _newData, context) => {
      // Rollback em caso de erro
      if (context?.previousTickets) {
        utils.tickets.list.setData(undefined, context.previousTickets);
      }
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
    onSettled: () => {
      // Revalidar para garantir sincronização
      utils.tickets.list.invalidate();
    }
  });

  const handleCreateTicket = () => {
    if (!queryOrgId) {
      toast.error("Selecione uma organização primeiro");
      return;
    }
    
    createTicketMutation.mutate({
      organizationId: queryOrgId,
      title: newTicket.title,
      description: newTicket.description,
      ticketType: newTicket.ticketType as any,
      priority: newTicket.priority as any
    });
  };

  // Handlers de drag-and-drop
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveTicketId(active.id as number);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // Identificar a coluna sobre a qual está o drag
      const overId = over.id.toString();
      // Verificar se é um status válido
      const isStatusColumn = STATUSES.some(s => s.value === overId);
      if (isStatusColumn) {
        setOverColumnId(overId);
      } else {
        // Encontrar o status do ticket sobre o qual está o drag
        const overTicket = filteredTickets.find(t => t.id === over.id);
        if (overTicket) {
          setOverColumnId(overTicket.status);
        }
      }
    } else {
      setOverColumnId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicketId(null);
    setOverColumnId(null);
    
    if (!over) return;
    
    const activeTicket = filteredTickets.find(t => t.id === active.id);
    if (!activeTicket) return;
    
    // Determinar o novo status
    let newStatus: string | null = null;
    
    // Verificar se soltou em uma coluna de status
    const isStatusColumn = STATUSES.some(s => s.value === over.id.toString());
    if (isStatusColumn) {
      newStatus = over.id.toString();
    } else {
      // Soltou sobre outro ticket - pegar o status desse ticket
      const overTicket = filteredTickets.find(t => t.id === over.id);
      if (overTicket) {
        newStatus = overTicket.status;
      }
    }
    
    // Se o status mudou, atualizar
    if (newStatus && newStatus !== activeTicket.status) {
      updateStatusMutation.mutate({
        id: activeTicket.id,
        status: newStatus as any
      });
    }
  };

  // Tickets já filtrados pelo backend
  const backendFilteredTickets = ticketsData?.tickets || [];
  
  // Filtrar por bloco de serviço CSC (frontend)
  const filteredTickets = blockFilter === "all" 
    ? backendFilteredTickets 
    : backendFilteredTickets.filter(t => {
        if (!t.serviceCatalogItemId) return false;
        // Encontrar o serviço no catálogo e verificar se pertence ao bloco
        const block = serviceCatalog?.find(b => 
          b.services?.some(s => s.id === t.serviceCatalogItemId)
        );
        return block?.id.toString() === blockFilter;
      });

  // Agrupar tickets por status para Kanban
  const ticketsByStatus = STATUSES.reduce((acc, status) => {
    acc[status.value] = filteredTickets.filter(t => t.status === status.value);
    return acc;
  }, {} as Record<string, any[]>);

  // Contadores de filtro
  const getFilterCount = (filterType: string, value: string) => {
    if (filterType === 'status') {
      return filteredTickets.filter(t => t.status === value).length;
    }
    if (filterType === 'type') {
      return filteredTickets.filter(t => t.ticketType === value).length;
    }
    if (filterType === 'priority') {
      return filteredTickets.filter(t => t.priority === value).length;
    }
    return 0;
  };

  // Se não há organização selecionada e usuário é admin/consultor
  if (canManageTickets && !selectedOrganizationId) {
    return (
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="heading-3 tracking-tight">
                MeuDPO - Central de Atendimento
              </h1>
              <p className="body-small">
                Sistema de gestão de tickets para atendimento jurídico-compliance
              </p>
            </div>
          </div>
        </div>
        
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-800">Selecione uma Organização</h3>
                <p className="text-sm text-amber-700">
                  Para visualizar e gerenciar tickets, selecione uma organização no menu lateral.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumbs />
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="heading-3 tracking-tight">
              MeuDPO - Central de Atendimento
            </h1>
            <p className="body-small">
              {filteredTickets.length} ticket(s) • {metrics?.openTickets || 0} aberto(s)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Toggle de visualização */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-1"
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="gap-1"
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600">
                <Plus className="h-4 w-4" />
                Novo Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-violet-600" />
                  Criar Novo Ticket
                </DialogTitle>
                <DialogDescription>
                  Abra um novo chamado para atendimento do DPO
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    placeholder="Descreva brevemente o assunto"
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva detalhadamente sua solicitação..."
                    rows={4}
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Select
                      value={newTicket.ticketType}
                      onValueChange={(value) => setNewTicket({ ...newTicket, ticketType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newTicket.ticketType === 'incidente_seguranca' && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-semibold text-red-800">Protocolo de Incidente</p>
                            <p className="text-red-700 mt-1">
                              Ao criar este chamado, um <strong>Protocolo de Incidente LGPD</strong> será automaticamente iniciado.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map(priority => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateTicket}
                  disabled={!newTicket.title || !newTicket.description || createTicketMutation.isPending}
                  className="bg-gradient-to-r from-violet-600 to-violet-500"
                >
                  {createTicketMutation.isPending ? "Criando..." : "Criar Ticket"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Métricas Premium */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Tickets Abertos"
          value={metrics?.openTickets || 0}
          icon={Ticket}
          color="info"
          loading={metricsLoading}
        />
        
        <MetricCard
          title="Em Atraso"
          value={metrics?.overdueTickets || 0}
          icon={AlertTriangle}
          color="danger"
          loading={metricsLoading}
        />
        
        <MetricCard
          title="Resolvidos (30d)"
          value={metrics?.resolvedInPeriod || 0}
          icon={CheckCircle}
          color="success"
          loading={metricsLoading}
        />
        
        <MetricCard
          title="Total (30d)"
          value={metrics?.totalInPeriod || 0}
          icon={BarChart3}
          color="primary"
          loading={metricsLoading}
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Linha 1: Busca e filtros principais */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{status.label}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {getFilterCount('status', status.value)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  {TICKET_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Prioridades</SelectItem>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Filtro por Bloco de Serviço CSC */}
              {serviceCatalog && serviceCatalog.length > 0 && (
                <Select value={blockFilter} onValueChange={(v) => { setBlockFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Bloco CSC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Blocos</SelectItem>
                    {serviceCatalog.map(block => (
                      <SelectItem key={block.id} value={block.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{block.code}</Badge>
                          <span>{block.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {/* Linha 2: Filtros de data e botão limpar */}
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex gap-2 items-center">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">De:</label>
                  <Input
                    type="date"
                    className="w-[160px]"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Até:</label>
                  <Input
                    type="date"
                    className="w-[160px]"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>
              
              {(statusFilter !== "all" || typeFilter !== "all" || priorityFilter !== "all" || blockFilter !== "all" || dateFrom || dateTo || searchTerm) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setTypeFilter("all");
                    setPriorityFilter("all");
                    setBlockFilter("all");
                    setDateFrom("");
                    setDateTo("");
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualização de Tickets */}
      <AnimatePresence mode="wait">
        {viewMode === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Tickets</CardTitle>
                <CardDescription>
                  {ticketsData?.total || 0} ticket(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin opacity-50" />
                    <p>Carregando tickets...</p>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <h3 className="font-semibold text-lg mb-2">Nenhum ticket encontrado</h3>
                    <p className="text-sm mb-4">Crie um novo ticket para começar</p>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Criar Primeiro Ticket
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredTickets.map((ticket) => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          onClick={() => navigate(`/meudpo/${ticket.id}`)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
                
                {/* Paginação */}
                {ticketsData && ticketsData.total > 50 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center px-4 body-small">
                      Página {currentPage} de {Math.ceil(ticketsData.total / 50)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= Math.ceil(ticketsData.total / 50)}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {STATUSES.filter(s => s.value !== 'cancelado').map((status) => (
                    <KanbanColumn
                      key={status.value}
                      status={status}
                      tickets={ticketsByStatus[status.value] || []}
                      onTicketClick={(id) => navigate(`/meudpo/${id}`)}
                      isOver={overColumnId === status.value}
                    />
                  ))}
                </div>
              </div>
              
              {/* Overlay do ticket sendo arrastado */}
              <DragOverlay>
                {activeTicketId ? (
                  <div className="opacity-80">
                    <TicketCard
                      ticket={filteredTickets.find(t => t.id === activeTicketId)!}
                      onClick={() => {}}
                      isDragging={true}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
