import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, Plus, Search, Edit, Eye, MoreHorizontal, FileSearch, AlertTriangle, 
  RefreshCw, TrendingUp, TrendingDown, Minus, Building2, Shield, CheckCircle2,
  AlertCircle, Clock
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KPICards, KPICardData } from "@/components/KPICards";
import { AcionarDPO } from "@/components/AcionarDPO";
import { DynamicBreadcrumbs } from "@/components/DynamicBreadcrumbs";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Cores do tema
const THEME_COLORS = {
  primary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#64748b'
};

const riskColors: Record<string, { bg: string; text: string; label: string }> = {
  baixo: { bg: '#f0fdf4', text: '#16a34a', label: 'Baixo' },
  moderado: { bg: '#fefce8', text: '#ca8a04', label: 'Moderado' },
  alto: { bg: '#fff7ed', text: '#ea580c', label: 'Alto' },
  critico: { bg: '#fef2f2', text: '#dc2626', label: 'Crítico' },
};

const typeLabels: Record<string, { label: string; color: string }> = {
  fornecedor: { label: "Fornecedor", color: THEME_COLORS.info },
  parceiro: { label: "Parceiro", color: THEME_COLORS.success },
  suboperador: { label: "Suboperador", color: THEME_COLORS.warning },
  outro: { label: "Outro", color: THEME_COLORS.muted },
};

// Hook para animação de contagem
function useCountAnimation(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  
  return count;
}

// Componente KPI Card
function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  gradient,
  onClick,
  tooltip
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  gradient: string;
  onClick?: () => void;
  tooltip?: string;
}) {
  const animatedValue = useCountAnimation(value);
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent><p>{tooltip}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <>{children}</>;
  };
  
  return (
    <CardWrapper>
      <Card 
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-0 ${gradient}`}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 label-executive">{title}</p>
              <p className="text-4xl font-bold text-white mt-2">{animatedValue}</p>
              <p className="text-white/70 text-sm mt-1">{subtitle}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4">
            <TrendIcon className={`w-4 h-4 ${trend === 'up' ? 'text-white' : trend === 'down' ? 'text-red-200' : 'text-white/60'}`} />
            <span className="text-white/80 text-xs">{trendValue}</span>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}

export default function Terceiros() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const { selectedOrganization } = useOrganization();
  const selectedOrgId = selectedOrganization?.id || null;
  const [newThirdParty, setNewThirdParty] = useState({
    name: "",
    tradeName: "",
    cnpj: "",
    type: "fornecedor" as const,
    category: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    description: "",
  });

  const utils = trpc.useUtils();
  const isAdminOrConsultor = user?.role === 'admin_global' || user?.role === 'consultor';
  
  const effectiveOrgId = isAdminOrConsultor ? selectedOrgId : user?.organizationId;

  const { data: thirdParties, isLoading, refetch } = trpc.thirdParty.list.useQuery(
    { organizationId: effectiveOrgId! },
    { enabled: !!effectiveOrgId }
  );

  const createMutation = trpc.thirdParty.create.useMutation({
    onSuccess: () => {
      toast.success("Terceiro cadastrado com sucesso!");
      utils.thirdParty.list.invalidate();
      setIsCreateOpen(false);
      setNewThirdParty({
        name: "", tradeName: "", cnpj: "", type: "fornecedor",
        category: "", contactName: "", contactEmail: "", contactPhone: "", description: ""
      });
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar terceiro: " + error.message);
    }
  });

  // Estatísticas calculadas
  const stats = useMemo(() => {
    if (!thirdParties) return { total: 0, fornecedores: 0, avaliados: 0, riscoCritico: 0 };
    
    return {
      total: thirdParties.length,
      fornecedores: thirdParties.filter((tp: any) => tp.type === 'fornecedor').length,
      avaliados: thirdParties.filter((tp: any) => tp.riskLevel).length,
      riscoCritico: thirdParties.filter((tp: any) => tp.riskLevel === 'critico' || tp.riskLevel === 'alto').length
    };
  }, [thirdParties]);

  const filteredThirdParties = useMemo(() => {
    return thirdParties?.filter((tp: any) => {
      const matchesSearch = tp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tp.cnpj?.includes(searchTerm) ||
        tp.tradeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tp.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || tp.type === typeFilter;
      const matchesRisk = riskFilter === 'all' || tp.riskLevel === riskFilter || (riskFilter === 'nao_avaliado' && !tp.riskLevel);
      return matchesSearch && matchesType && matchesRisk;
    }) || [];
  }, [thirdParties, searchTerm, typeFilter, riskFilter]);

  const handleCreate = () => {
    if (!newThirdParty.name) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!effectiveOrgId) {
      toast.error("Selecione uma organização");
      return;
    }
    createMutation.mutate({
      ...newThirdParty,
      organizationId: effectiveOrgId,
    });
  };

  // KPI data para o componente reutilizável
  const kpiData: KPICardData[] = [
    { 
      title: "Total de Terceiros", 
      value: stats.total, 
      subtitle: `${stats.fornecedores} fornecedores`, 
      icon: Users, 
      color: "cyan",
      onClick: () => { setTypeFilter('all'); setRiskFilter('all'); },
      tooltip: "Clique para ver todos os terceiros"
    },
    { 
      title: "Avaliados", 
      value: stats.avaliados, 
      subtitle: "Com due diligence", 
      icon: CheckCircle2, 
      color: "emerald",
      onClick: () => { setTypeFilter('all'); setRiskFilter('all'); toast.info('Filtro: Terceiros avaliados'); },
      tooltip: "Clique para filtrar terceiros avaliados"
    },
    { 
      title: "Pendentes", 
      value: stats.total - stats.avaliados, 
      subtitle: "Sem avaliação", 
      icon: Clock, 
      color: "amber",
      onClick: () => { setTypeFilter('all'); setRiskFilter('all'); toast.info('Filtro: Terceiros pendentes de avaliação'); },
      tooltip: "Clique para filtrar terceiros pendentes"
    },
    { 
      title: "Risco Elevado", 
      value: stats.riscoCritico, 
      subtitle: "Alto ou crítico", 
      icon: AlertCircle, 
      color: "red",
      onClick: () => { setRiskFilter('alto'); toast.info('Filtro: Risco alto ou crítico'); },
      tooltip: "Clique para filtrar por risco elevado"
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Terceiros"
        subtitle="Gerencie parceiros e fornecedores para avaliação de maturidade"
        icon={Users}
        showBack={false}
        showDPOButton={true}
        dpoContext={{ module: "Terceiros", page: "Lista de Terceiros" }}
        actions={
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-cyan-600 hover:bg-cyan-50">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Terceiro
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Novo Terceiro</DialogTitle>
                    <DialogDescription>
                      Cadastre um novo parceiro ou fornecedor para avaliação.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                    {isAdminOrConsultor && selectedOrganization && (
                      <div className="grid gap-2">
                        <Label>Organização</Label>
                        <div className="p-2 border rounded-md bg-muted/50">
                          <p className="font-medium">{selectedOrganization.name}</p>
                          {selectedOrganization.tradeName && (
                            <p className="body-small">{selectedOrganization.tradeName}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Razão Social *</Label>
                        <Input
                          id="name"
                          value={newThirdParty.name}
                          onChange={(e) => setNewThirdParty({ ...newThirdParty, name: e.target.value })}
                          placeholder="Nome da empresa"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="tradeName">Nome Fantasia</Label>
                        <Input
                          id="tradeName"
                          value={newThirdParty.tradeName}
                          onChange={(e) => setNewThirdParty({ ...newThirdParty, tradeName: e.target.value })}
                          placeholder="Nome fantasia"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input
                          id="cnpj"
                          value={newThirdParty.cnpj}
                          onChange={(e) => setNewThirdParty({ ...newThirdParty, cnpj: e.target.value })}
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Tipo</Label>
                        <Select
                          value={newThirdParty.type}
                          onValueChange={(v: any) => setNewThirdParty({ ...newThirdParty, type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fornecedor">Fornecedor</SelectItem>
                            <SelectItem value="parceiro">Parceiro</SelectItem>
                            <SelectItem value="suboperador">Suboperador</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Categoria/Segmento</Label>
                      <Input
                        id="category"
                        value={newThirdParty.category}
                        onChange={(e) => setNewThirdParty({ ...newThirdParty, category: e.target.value })}
                        placeholder="Ex: TI, RH, Marketing, Logística"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contactName">Nome do Contato</Label>
                      <Input
                        id="contactName"
                        value={newThirdParty.contactName}
                        onChange={(e) => setNewThirdParty({ ...newThirdParty, contactName: e.target.value })}
                        placeholder="Nome do responsável"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="contactEmail">E-mail</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={newThirdParty.contactEmail}
                          onChange={(e) => setNewThirdParty({ ...newThirdParty, contactEmail: e.target.value })}
                          placeholder="contato@empresa.com"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contactPhone">Telefone</Label>
                        <Input
                          id="contactPhone"
                          value={newThirdParty.contactPhone}
                          onChange={(e) => setNewThirdParty({ ...newThirdParty, contactPhone: e.target.value })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={newThirdParty.description}
                        onChange={(e) => setNewThirdParty({ ...newThirdParty, description: e.target.value })}
                        placeholder="Descreva os serviços prestados e dados tratados..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Cadastrando..." : "Cadastrar Terceiro"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        }
      />

      <KPICards cards={kpiData} />

      {/* Conteúdo Principal */}
      <div>
        {isAdminOrConsultor && !selectedOrganization && (
          <Card className="border-yellow-200 bg-yellow-50 mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Selecione uma organização no menu lateral para visualizar e gerenciar terceiros.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Lista de Terceiros</CardTitle>
                <CardDescription>Gerencie seus parceiros, fornecedores e suboperadores</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar terceiros..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="parceiro">Parceiro</SelectItem>
                    <SelectItem value="suboperador">Suboperador</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Risco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Riscos</SelectItem>
                    <SelectItem value="baixo">Baixo</SelectItem>
                    <SelectItem value="moderado">Moderado</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="critico">Crítico</SelectItem>
                    <SelectItem value="nao_avaliado">Não Avaliado</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="px-3 py-1">
                  {filteredThirdParties.length} {filteredThirdParties.length === 1 ? 'terceiro' : 'terceiros'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!effectiveOrgId ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <h3 className="text-lg font-medium mb-1">Selecione uma organização</h3>
                <p className="body-small">
                  Escolha uma organização para visualizar seus terceiros
                </p>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredThirdParties.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-1">Nenhum terceiro encontrado</h3>
                <p className="body-small">
                  {searchTerm ? "Tente ajustar sua busca" : "Comece cadastrando um novo terceiro"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="font-semibold">Terceiro</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Categoria</TableHead>
                    <TableHead className="font-semibold">Contato</TableHead>
                    <TableHead className="font-semibold">Risco</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredThirdParties.map((tp: any) => {
                    const risk = tp.riskLevel ? riskColors[tp.riskLevel] : null;
                    const typeInfo = typeLabels[tp.type];
                    
                    return (
                      <TableRow 
                        key={tp.id} 
                        className="cursor-pointer hover:bg-cyan-50/50 transition-colors"
                        onClick={() => setLocation(`/terceiros/${tp.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-cyan-100">
                              <Building2 className="h-4 w-4 text-cyan-600" />
                            </div>
                            <div>
                              <p className="font-medium">{tp.name}</p>
                              {tp.tradeName && (
                                <p className="body-small">{tp.tradeName}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            style={{ borderColor: typeInfo.color, color: typeInfo.color }}
                          >
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{tp.category || "-"}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{tp.contactName || "-"}</p>
                            <p className="text-muted-foreground">{tp.contactEmail || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {risk ? (
                            <div 
                              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: risk.bg, color: risk.text }}
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: risk.text }} />
                              {risk.label}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Não avaliado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setLocation(`/terceiros/${tp.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setLocation(`/terceiros/${tp.id}/editar`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setLocation(`/due-diligence/nova?terceiro=${tp.id}`)}>
                                <FileSearch className="mr-2 h-4 w-4" />
                                Nova Avaliação
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
