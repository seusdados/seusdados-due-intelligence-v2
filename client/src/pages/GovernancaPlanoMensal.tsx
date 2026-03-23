import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Target,
  TrendingUp,
  Building2,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ListTodo,
  Package,
  ArrowLeft,
  Play,
  Pause,
  Check,
  FileSearch,
  Database,
  Scale,
  Users,
  Lightbulb,
  Globe,
  Shield,
  GraduationCap,
  UserCheck,
  ClipboardCheck,
  Award,
  RefreshCw,
} from "lucide-react";

// Mapeamento de ícones
const iconMap: Record<string, any> = {
  FileSearch, Database, Scale, Users, AlertTriangle, FileText, GraduationCap, Shield, UserCheck, ClipboardCheck,
  Calendar, Lightbulb, Globe, Award, RefreshCw, Target,
};

// Cores dos blocos macro
const blockColors: Record<string, string> = {
  "#5f29cc": "from-purple-500 to-indigo-600",
  "#0ea5e9": "from-sky-500 to-blue-600",
  "#f59e0b": "from-amber-500 to-orange-600",
  "#10b981": "from-emerald-500 to-green-600",
  "#ec4899": "from-pink-500 to-rose-600",
};

// Status badges
const statusBadges: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pendente: { label: "Pendente", variant: "outline" },
  em_andamento: { label: "Em Andamento", variant: "secondary" },
  concluida: { label: "Concluída", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
  em_elaboracao: { label: "Em Elaboração", variant: "secondary" },
  em_revisao: { label: "Em Revisão", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  arquivado: { label: "Arquivado", variant: "outline" },
  nao_iniciado: { label: "Não Iniciado", variant: "outline" },
};

export default function GovernancaPlanoMensal() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [, navigate] = useLocation();
  const params = useParams<{ planoId: string }>();
  const planoId = Number(params.planoId);

  const selectedOrgId = selectedOrganization?.id ?? user?.organizationId ?? null;
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set([1]));
  const [activeTab, setActiveTab] = useState("timeline");

  // Buscar plano completo
  const { data: planoData, isLoading, refetch } = trpc.governanca.getPlanoAnualCompleto.useQuery(
    { organizationId: selectedOrgId!, planoId },
    { enabled: !!selectedOrgId && !!planoId }
  );

  // Mutations
  const updateAtividadeStatus = trpc.governanca.updateAtividadeStatus.useMutation({
    onSuccess: () => {
      toast.success("Atividade atualizada!");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateEntregavelStatus = trpc.governanca.updateEntregavelStatus.useMutation({
    onSuccess: () => {
      toast.success("Entregável atualizado!");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMesStatus = trpc.governanca.updateMesStatus.useMutation({
    onSuccess: () => {
      toast.success("Status do mês atualizado!");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMonth = (monthNumber: number) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthNumber)) {
        newSet.delete(monthNumber);
      } else {
        newSet.add(monthNumber);
      }
      return newSet;
    });
  };

  const handleAtividadeToggle = (atividadeId: number, currentStatus: string) => {
    if (!selectedOrgId) return;
    const newStatus = currentStatus === "concluida" ? "pendente" : "concluida";
    updateAtividadeStatus.mutate({
      organizationId: selectedOrgId,
      atividadeId,
      status: newStatus,
    });
  };

  const handleEntregavelStatusChange = (entregavelId: number, newStatus: string) => {
    if (!selectedOrgId) return;
    updateEntregavelStatus.mutate({
      organizationId: selectedOrgId,
      entregavelId,
      status: newStatus as any,
    });
  };

  const handleMesStatusChange = (mesId: number, newStatus: string) => {
    if (!selectedOrgId) return;
    updateMesStatus.mutate({
      organizationId: selectedOrgId,
      mesId,
      status: newStatus as any,
    });
  };

  // Agrupar meses por bloco macro
  const mesesPorBloco = useMemo(() => {
    if (!planoData?.meses) return [];
    
    const blocos: Record<string, typeof planoData.meses> = {};
    for (const mes of planoData.meses) {
      const block = mes.template?.macroBlock || "Outros";
      if (!blocos[block]) blocos[block] = [];
      blocos[block].push(mes);
    }
    
    return Object.entries(blocos).map(([name, meses]) => ({
      name,
      color: meses[0]?.template?.blockColor || "#5f29cc",
      meses,
    }));
  }, [planoData?.meses]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!planoData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Plano não encontrado</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/governanca")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { plano, template, meses, progresso } = planoData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/governanca")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{template?.label || "Plano de Governança"}</h1>
            <p className="text-muted-foreground">
              {selectedOrganization?.name} • {plano?.year}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={plano?.status === "em_execucao" ? "default" : "outline"} className="px-3 py-1">
            {plano?.status === "planejado" ? "Planejado" : 
             plano?.status === "em_execucao" ? "Em Execução" : 
             plano?.status === "concluido" ? "Concluído" : "Pausado"}
          </Badge>
        </div>
      </div>

      {/* Cards de Progresso */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="body-small">Progresso Geral</p>
                <p className="text-2xl font-bold">{progresso?.percentualGeral}%</p>
                <Progress value={progresso?.percentualGeral} className="mt-2 h-2" />
              </div>
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="body-small">Atividades</p>
                <p className="text-2xl font-bold">
                  {progresso?.atividadesConcluidas}/{progresso?.totalAtividades}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {progresso?.percentualAtividades}% concluídas
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <ListTodo className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="body-small">Entregáveis</p>
                <p className="text-2xl font-bold">
                  {progresso?.entregaveisConcluidos}/{progresso?.totalEntregaveis}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {progresso?.percentualEntregaveis}% aprovados
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="body-small">Meses</p>
                <p className="text-2xl font-bold">{meses?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {meses?.filter((m: any) => m.mes?.status === "concluido").length || 0} concluídos
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="blocos" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Por Bloco
          </TabsTrigger>
          <TabsTrigger value="entregaveis" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Entregáveis
          </TabsTrigger>
        </TabsList>

        {/* Tab Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          {meses?.map((mesData: any) => {
            const { mes, template: mesTemplate, atividades, entregaveis } = mesData;
            const isExpanded = expandedMonths.has(mes.monthNumber);
            const atividadesConcluidas = atividades.filter((a: any) => a.status === "concluida").length;
            const entregaveisAprovados = entregaveis.filter((e: any) => e.status === "aprovado").length;
            const IconComponent = iconMap[mesTemplate?.icon] || Target;
            const gradientClass = blockColors[mesTemplate?.blockColor] || "from-purple-500 to-indigo-600";

            return (
              <Card key={mes.id} className="overflow-hidden">
                <div
                  className="cursor-pointer"
                  onClick={() => toggleMonth(mes.monthNumber)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientClass} text-white`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Mês {mes.monthNumber}</Badge>
                            <Badge 
                              variant={statusBadges[mes.status]?.variant || "outline"}
                              className="text-xs"
                            >
                              {statusBadges[mes.status]?.label || mes.status}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg mt-1">{mesTemplate?.title}</CardTitle>
                          <p className="body-small">{mesTemplate?.theme}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">
                            {atividadesConcluidas}/{atividades.length} atividades
                          </p>
                          <p className="text-muted-foreground">
                            {entregaveisAprovados}/{entregaveis.length} entregáveis
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </div>

                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    <div className="grid md:grid-cols-2 gap-6 pt-4">
                      {/* Atividades */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <ListTodo className="h-4 w-4" />
                          Atividades
                        </h4>
                        <div className="space-y-2">
                          {atividades.map((atividade: any) => (
                            <div
                              key={atividade.id}
                              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                checked={atividade.status === "concluida"}
                                onCheckedChange={() => handleAtividadeToggle(atividade.id, atividade.status)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <p className={`text-sm ${atividade.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                                  {atividade.description}
                                </p>
                                {atividade.assignedToName && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Responsável: {atividade.assignedToName}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Entregáveis */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Entregáveis
                        </h4>
                        <div className="space-y-2">
                          {entregaveis.map((entregavel: any) => (
                            <div
                              key={entregavel.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{entregavel.name}</span>
                              </div>
                              <Select
                                value={entregavel.status}
                                onValueChange={(value) => handleEntregavelStatusChange(entregavel.id, value)}
                              >
                                <SelectTrigger className="w-[140px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendente">Pendente</SelectItem>
                                  <SelectItem value="em_elaboracao">Em Elaboração</SelectItem>
                                  <SelectItem value="em_revisao">Em Revisão</SelectItem>
                                  <SelectItem value="aprovado">Aprovado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Ações do Mês */}
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
                      {mes.status === "nao_iniciado" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMesStatusChange(mes.id, "em_andamento");
                          }}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Iniciar Mês
                        </Button>
                      )}
                      {mes.status === "em_andamento" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMesStatusChange(mes.id, "nao_iniciado");
                            }}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pausar
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMesStatusChange(mes.id, "concluido");
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Concluir Mês
                          </Button>
                        </>
                      )}
                      {mes.status === "concluido" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMesStatusChange(mes.id, "em_andamento");
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* Tab Por Bloco */}
        <TabsContent value="blocos" className="space-y-6">
          {mesesPorBloco.map((bloco) => {
            const gradientClass = blockColors[bloco.color] || "from-purple-500 to-indigo-600";
            
            return (
              <div key={bloco.name} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${gradientClass}`} />
                  <h3 className="text-lg font-semibold">{bloco.name}</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 ml-4">
                  {bloco.meses.map((mesData: any) => {
                    const { mes, template: mesTemplate, atividades, entregaveis } = mesData;
                    const atividadesConcluidas = atividades.filter((a: any) => a.status === "concluida").length;
                    const entregaveisAprovados = entregaveis.filter((e: any) => e.status === "aprovado").length;
                    const progressoMes = Math.round(
                      ((atividadesConcluidas / Math.max(atividades.length, 1)) * 50) +
                      ((entregaveisAprovados / Math.max(entregaveis.length, 1)) * 50)
                    );

                    return (
                      <Card 
                        key={mes.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          setActiveTab("timeline");
                          setExpandedMonths(new Set([mes.monthNumber]));
                        }}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">Mês {mes.monthNumber}</Badge>
                            <Badge variant={statusBadges[mes.status]?.variant || "outline"}>
                              {statusBadges[mes.status]?.label || mes.status}
                            </Badge>
                          </div>
                          <h4 className="font-medium">{mesTemplate?.title}</h4>
                          <p className="body-small mt-1">{mesTemplate?.theme}</p>
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Progresso</span>
                              <span>{progressoMes}%</span>
                            </div>
                            <Progress value={progressoMes} className="h-1.5" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Tab Entregáveis */}
        <TabsContent value="entregaveis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Entregáveis</CardTitle>
              <CardDescription>
                Lista consolidada de todos os entregáveis do programa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {meses?.flatMap((mesData: any) => 
                  mesData.entregaveis.map((entregavel: any) => ({
                    ...entregavel,
                    mesNumber: mesData.mes.monthNumber,
                    mesTitle: mesData.template?.title,
                  }))
                ).map((entregavel: any) => (
                  <div
                    key={entregavel.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        Mês {entregavel.mesNumber}
                      </Badge>
                      <div>
                        <p className="font-medium">{entregavel.name}</p>
                        <p className="text-xs text-muted-foreground">{entregavel.mesTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {entregavel.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Prazo: {new Date(entregavel.dueDate).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      <Badge variant={statusBadges[entregavel.status]?.variant || "outline"}>
                        {statusBadges[entregavel.status]?.label || entregavel.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
