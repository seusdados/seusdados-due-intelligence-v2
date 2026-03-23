import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  TrendingUp,
  Plus,
  ChevronRight,
  Search,
  Filter,
  Calendar,
  User,
  Loader2,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";

interface PlanoCPPDContinuoTabProps {
  organizationId: number;
  selectedYear: number;
}

type InitiativeStatus = "planned" | "in_progress" | "completed" | "overdue";

const statusConfig: Record<InitiativeStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2; bgColor: string; textColor: string }> = {
  completed: { label: "Concluído", variant: "default", icon: CheckCircle2, bgColor: "bg-green-100", textColor: "text-green-600" },
  in_progress: { label: "Em Andamento", variant: "secondary", icon: Play, bgColor: "bg-blue-100", textColor: "text-blue-600" },
  planned: { label: "Planejado", variant: "outline", icon: Clock, bgColor: "bg-yellow-100", textColor: "text-yellow-600" },
  overdue: { label: "Atrasado", variant: "destructive", icon: AlertTriangle, bgColor: "bg-red-100", textColor: "text-red-600" },
};

export function PlanoCPPDContinuoTab({ organizationId, selectedYear }: PlanoCPPDContinuoTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInitiative, setSelectedInitiative] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>("all");
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    responsible: "",
    status: "planned" as InitiativeStatus,
    startDate: "",
    endDate: "",
    quarter: "Q1",
  });

  // Queries
  const { data: initiatives, isLoading, refetch } = trpc.cppdInitiative.list.useQuery({
    organizationId,
    filters: {
      status: statusFilter !== "all" ? statusFilter as any : undefined,
      search: searchTerm || undefined,
    },
  });

  const { data: stats } = trpc.cppdInitiative.getStats.useQuery({
    organizationId,
  });

  // Mutations
  const createMutation = trpc.cppdInitiative.create.useMutation({
    onSuccess: () => {
      toast.success("Iniciativa criada com sucesso!");
      setShowCreateDialog(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar iniciativa: ${error.message}`);
    },
  });

  const updateMutation = trpc.cppdInitiative.update.useMutation({
    onSuccess: () => {
      toast.success("Iniciativa atualizada com sucesso!");
      setShowDetailDialog(false);
      setSelectedInitiative(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar iniciativa: ${error.message}`);
    },
  });

  const deleteMutation = trpc.cppdInitiative.delete.useMutation({
    onSuccess: () => {
      toast.success("Iniciativa excluída com sucesso!");
      setShowDetailDialog(false);
      setSelectedInitiative(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir iniciativa: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      responsible: "",
      status: "planned",
      startDate: "",
      endDate: "",
      quarter: "Q1",
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      organizationId,
      title: formData.title,
      description: formData.description,
      responsibleId: undefined, // TODO: mapear para ID do responsável
      status: formData.status as any,
      plannedStartDate: formData.startDate,
      plannedEndDate: formData.endDate,
      quarter: formData.quarter as "Q1" | "Q2" | "Q3" | "Q4",
      year: new Date().getFullYear(),
    });
  };

  const handleUpdate = () => {
    if (!selectedInitiative) return;
    updateMutation.mutate({
      id: selectedInitiative.id,
      title: formData.title,
      description: formData.description,
      responsibleId: undefined, // TODO: mapear para ID do responsável
      status: formData.status as any,
      plannedStartDate: formData.startDate,
      plannedEndDate: formData.endDate,
      quarter: formData.quarter as "Q1" | "Q2" | "Q3" | "Q4",
    });
  };

  const handleDelete = () => {
    if (!selectedInitiative) return;
    if (confirm("Tem certeza que deseja excluir esta iniciativa?")) {
      deleteMutation.mutate({ id: selectedInitiative.id });
    }
  };

  const openDetailDialog = (initiative: any) => {
    setSelectedInitiative(initiative);
    setFormData({
      title: initiative.title,
      description: initiative.description || "",
      responsible: initiative.responsible || "",
      status: initiative.status,
      startDate: initiative.startDate || "",
      endDate: initiative.endDate || "",
      quarter: initiative.quarter || "Q1",
    });
    setShowDetailDialog(true);
  };

  // Get unique responsibles for filter
  const uniqueResponsibles: string[] = Array.from(new Set(initiatives?.map(i => String((i as any).responsible || i.responsibleId || '')).filter(Boolean) || []));

  // Group initiatives by quarter for roadmap
  const initiativesByQuarter = initiatives?.reduce((acc, initiative) => {
    const quarter = initiative.quarter || "Q1";
    if (!acc[quarter]) acc[quarter] = [];
    acc[quarter].push(initiative);
    return acc;
  }, {} as Record<string, typeof initiatives>) || {};

  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Plano CPPD Contínuo
          </h3>
          <p className="text-muted-foreground">
            Programa de melhoria contínua do Comitê de Privacidade e Proteção de Dados
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Iniciativa
        </Button>
      </div>

      {/* Visão Geral do Programa */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-700">{stats?.concluido || 0}</p>
                <p className="text-sm text-green-600">Iniciativas Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Play className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-700">{stats?.em_andamento || 0}</p>
                <p className="text-sm text-blue-600">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-700">{stats?.planejado || 0}</p>
                <p className="text-sm text-yellow-600">Planejadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-red-700">{stats?.atrasado || 0}</p>
                <p className="text-sm text-red-600">Atrasadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar iniciativas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="planned">Planejado</SelectItem>
                <SelectItem value="overdue">Atrasado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
              <SelectTrigger className="w-[180px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Responsáveis</SelectItem>
                {uniqueResponsibles.map((responsible) => (
                  <SelectItem key={responsible} value={responsible || ""}>
                    {responsible}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Iniciativas */}
      <Card>
        <CardHeader>
          <CardTitle>Iniciativas do Programa</CardTitle>
          <CardDescription>
            {initiatives?.length || 0} iniciativas encontradas para {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : initiatives?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma iniciativa encontrada.</p>
              <p className="text-sm">Clique em "Nova Iniciativa" para começar.</p>
            </div>
          ) : (
            initiatives?.map((initiative) => {
              const config = statusConfig[initiative.status as InitiativeStatus] || statusConfig.planned;
              const StatusIcon = config.icon;
              const isOverdue = initiative.status === "atrasado";
              
              return (
                <div
                  key={initiative.id}
                  onClick={() => openDetailDialog(initiative)}
                  className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                    isOverdue ? "border-red-200 bg-red-50/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${config.bgColor}`}>
                      <StatusIcon className={`h-5 w-5 ${config.textColor}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{initiative.title}</h4>
                      <p className="text-sm text-muted-foreground">{initiative.description}</p>
                      {(initiative as any).responsible && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <User className="h-3 w-3 inline mr-1" />
                          {(initiative as any).responsible}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    <span className={`text-sm ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                      {initiative.quarter} {initiative.year}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Roadmap Anual */}
      <Card>
        <CardHeader>
          <CardTitle>Roadmap Anual</CardTitle>
          <CardDescription>Visão geral das iniciativas planejadas para {selectedYear}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />
            <div className="space-y-8 ml-8">
              {["Q1", "Q2", "Q3", "Q4"].map((quarter, index) => {
                const quarterInitiatives = initiativesByQuarter[quarter] || [];
                const colors = ["bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-gray-400"];
                const isCurrent = quarter === currentQuarter && selectedYear === new Date().getFullYear();
                
                return (
                  <div key={quarter} className="relative">
                    <div className={`absolute -left-10 w-6 h-6 rounded-full ${colors[index]} flex items-center justify-center text-white text-xs font-bold`}>
                      {quarter}
                    </div>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{quarter} {selectedYear}</h4>
                          {isCurrent && <Badge variant="default">Atual</Badge>}
                        </div>
                        {quarterInitiatives.length > 0 ? (
                          <div className="space-y-2">
                            {quarterInitiatives.map((init: any) => {
                              const config = statusConfig[init.status as InitiativeStatus] || statusConfig.planned;
                              return (
                                <div key={init.id} className="flex items-center gap-2 text-sm">
                                  <Badge variant={config.variant} className="text-xs">
                                    {config.label}
                                  </Badge>
                                  <span>{init.title}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhuma iniciativa planejada</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Criação */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Iniciativa</DialogTitle>
            <DialogDescription>
              Adicione uma nova iniciativa ao Plano CPPD Contínuo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Revisão da Política de Privacidade"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva a iniciativa..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responsible">Responsável</Label>
                <Input
                  id="responsible"
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as InitiativeStatus })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planejado</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quarter">Trimestre</Label>
                <Select value={formData.quarter} onValueChange={(v) => setFormData({ ...formData, quarter: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1</SelectItem>
                    <SelectItem value="Q2">Q2</SelectItem>
                    <SelectItem value="Q3">Q3</SelectItem>
                    <SelectItem value="Q4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startDate">Data Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Data Fim</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!formData.title || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Iniciativa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes/Edição */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Iniciativa</DialogTitle>
            <DialogDescription>
              Visualize e edite os detalhes da iniciativa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-responsible">Responsável</Label>
                <Input
                  id="edit-responsible"
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as InitiativeStatus })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planejado</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-quarter">Trimestre</Label>
                <Select value={formData.quarter} onValueChange={(v) => setFormData({ ...formData, quarter: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1</SelectItem>
                    <SelectItem value="Q2">Q2</SelectItem>
                    <SelectItem value="Q3">Q3</SelectItem>
                    <SelectItem value="Q4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-startDate">Data Início</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-endDate">Data Fim</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.title || updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
