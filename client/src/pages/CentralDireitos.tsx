// client/src/pages/CentralDireitos.tsx
// Fase 3 - Central de Direitos do Titular
// Interface para gestão de solicitações LGPD

import { useState, useEffect } from "react";
// DashboardLayout removido - já é aplicado no App.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  UserCheck, 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Plus,
  Download,
  RefreshCw,
  Users,
  Shield,
  Database,
  ExternalLink,
  Info,
  Eye,
  Trash2,
  Send,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KPICards, KPICardData } from "@/components/KPICards";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { DynamicBreadcrumbs } from "@/components/DynamicBreadcrumbs";

// Tipos de solicitação LGPD
const REQUEST_TYPES = [
  { value: "acesso", label: "Acesso aos Dados", icon: Eye, description: "Art. 18, II - Confirmação e acesso aos dados" },
  { value: "retificacao", label: "Retificação", icon: FileText, description: "Art. 18, III - Correção de dados incompletos ou desatualizados" },
  { value: "exclusao", label: "Exclusão", icon: Trash2, description: "Art. 18, VI - Eliminação dos dados pessoais" },
  { value: "portabilidade", label: "Portabilidade", icon: Send, description: "Art. 18, V - Portabilidade dos dados a outro fornecedor" },
  { value: "revogacao_consentimento", label: "Revogação de Consentimento", icon: XCircle, description: "Art. 18, IX - Revogação do consentimento" },
  { value: "oposicao", label: "Oposição", icon: Shield, description: "Art. 18, § 2º - Oposição ao tratamento" },
  { value: "informacao", label: "Informação", icon: Info, description: "Art. 18, I - Informações sobre o tratamento" },
];

// Status das solicitações
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  recebida: { label: "Recebida", color: "bg-blue-100 text-blue-800", icon: Clock },
  em_analise: { label: "Em Análise", color: "bg-yellow-100 text-yellow-800", icon: Search },
  aguardando_info: { label: "Aguardando Info", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  respondida: { label: "Respondida", color: "bg-green-100 text-green-800", icon: CheckCircle },
  negada: { label: "Negada", color: "bg-red-100 text-red-800", icon: XCircle },
  arquivada: { label: "Arquivada", color: "bg-gray-100 text-gray-800", icon: FileText },
};

export default function CentralDireitos() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const organizationId = selectedOrganization?.id;
  
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  // Form state para nova solicitação
  const [newRequest, setNewRequest] = useState({
    titularName: "",
    titularEmail: "",
    titularDocument: "",
    requestType: "",
    description: "",
    receivedVia: "formulario",
    externalProtocol: "",
  });

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.fase3.getStats.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId }
  );

  const { data: requests, isLoading: requestsLoading, refetch: refetchRequests } = trpc.fase3.listRequests.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId }
  );

  const { data: categories, refetch: refetchCategories } = trpc.fase3.listTitularCategories.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId }
  );

  const { data: searchResults, isLoading: searchLoading } = trpc.fase3.searchTitular.useQuery(
    { organizationId: organizationId!, query: searchQuery },
    { enabled: !!organizationId && searchQuery.length >= 2 }
  );

  // Mutations
  const consolidateMutation = trpc.fase3.consolidate.useMutation({
    onSuccess: (data) => {
      toast.success(`Consolidação concluída! ${data.instancesCreated} instâncias criadas.`);
      refetchCategories();
    },
    onError: (error) => {
      toast.error("Erro ao consolidar: " + error.message);
    },
  });

  const createRequestMutation = trpc.fase3.createRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitação criada com sucesso!");
      setShowNewRequestDialog(false);
      setNewRequest({
        titularName: "",
        titularEmail: "",
        titularDocument: "",
        requestType: "",
        description: "",
        receivedVia: "formulario",
        externalProtocol: "",
      });
      refetchRequests();
      refetchStats();
    },
    onError: (error) => {
      toast.error("Erro ao criar solicitação: " + error.message);
    },
  });

  const updateStatusMutation = trpc.fase3.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      refetchRequests();
      refetchStats();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const generateReportMutation = trpc.fase3.generateDataReport.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório gerado com sucesso!");
      window.open(data.reportUrl, "_blank");
    },
    onError: (error) => {
      toast.error("Erro ao gerar relatório: " + error.message);
    },
  });

  const handleCreateRequest = () => {
    if (!organizationId || !newRequest.titularName || !newRequest.requestType) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    createRequestMutation.mutate({
      organizationId,
      ...newRequest,
      requestType: newRequest.requestType as any,
    });
  };

  const handleGenerateReport = (titularName: string, titularEmail?: string, titularDocument?: string, requestId?: number) => {
    if (!organizationId) return;
    generateReportMutation.mutate({
      organizationId,
      titularName,
      titularEmail,
      titularDocument,
      requestId,
    });
  };

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma organização para continuar.</p>
      </div>
    );
  }

  // KPI data para o componente reutilizável
  const kpiData: KPICardData[] = [
    { title: "Total", value: stats?.total || 0, subtitle: "solicitações", icon: FileText, color: "violet" },
    { title: "Em Análise", value: (stats?.byStatus?.recebida || 0) + (stats?.byStatus?.em_analise || 0), subtitle: "pendentes", icon: Clock, color: "amber" },
    { title: "Respondidas", value: stats?.byStatus?.respondida || 0, subtitle: "finalizadas", icon: CheckCircle, color: "emerald" },
    { title: "Atrasadas", value: stats?.overdue || 0, subtitle: "fora do prazo", icon: AlertTriangle, color: "red" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
          title="Central de Direitos do Titular"
          subtitle="Gestão de solicitações LGPD e atendimento aos direitos dos titulares (Art. 18)"
          icon={Users}
          showBack={false}
          showDPOButton={true}
          dpoContext={{ module: "Central de Direitos", page: "Solicitações" }}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => consolidateMutation.mutate({ organizationId })}
                disabled={consolidateMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${consolidateMutation.isPending ? 'animate-spin' : ''}`} />
                Consolidar
              </Button>
              <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Solicitação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Registrar Solicitação de Direito</DialogTitle>
                  <DialogDescription>
                    Registre uma nova solicitação de exercício de direito do titular conforme Art. 18 da LGPD.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="titularName">Nome do Titular *</Label>
                      <Input
                        id="titularName"
                        value={newRequest.titularName}
                        onChange={(e) => setNewRequest({ ...newRequest, titularName: e.target.value })}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="titularEmail">E-mail</Label>
                      <Input
                        id="titularEmail"
                        type="email"
                        value={newRequest.titularEmail}
                        onChange={(e) => setNewRequest({ ...newRequest, titularEmail: e.target.value })}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="titularDocument">CPF/Documento</Label>
                      <Input
                        id="titularDocument"
                        value={newRequest.titularDocument}
                        onChange={(e) => setNewRequest({ ...newRequest, titularDocument: e.target.value })}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receivedVia">Canal de Recebimento</Label>
                      <Select
                        value={newRequest.receivedVia}
                        onValueChange={(v) => setNewRequest({ ...newRequest, receivedVia: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="formulario">Formulário Web</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="telefone">Telefone</SelectItem>
                          <SelectItem value="presencial">Presencial</SelectItem>
                          <SelectItem value="carta">Carta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Solicitação *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {REQUEST_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setNewRequest({ ...newRequest, requestType: type.value })}
                          className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                            newRequest.requestType === type.value
                              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                              : "border-border hover:border-purple-300"
                          }`}
                        >
                          <type.icon className={`h-5 w-5 mt-0.5 ${
                            newRequest.requestType === type.value ? "text-purple-600" : "text-muted-foreground"
                          }`} />
                          <div>
                            <p className="font-medium text-sm">{type.label}</p>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição / Observações</Label>
                    <Textarea
                      id="description"
                      value={newRequest.description}
                      onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                      placeholder="Detalhes adicionais sobre a solicitação..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewRequestDialog(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateRequest}
                    disabled={createRequestMutation.isPending}
                    className="bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    {createRequestMutation.isPending ? "Criando..." : "Criar Solicitação"}
                  </Button>
                </DialogFooter>
              </DialogContent>
              </Dialog>
            </div>
          }
        />

        <KPICards cards={kpiData} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Solicitações</TabsTrigger>
            <TabsTrigger value="search">Buscar Titular</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
          </TabsList>

          {/* Tab: Solicitações */}
          <TabsContent value="dashboard" className="space-y-4">
            {requestsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : requests && requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((req: any) => {
                  const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.recebida;
                  const StatusIcon = statusConfig.icon;
                  const typeConfig = REQUEST_TYPES.find(t => t.value === req.requestType);
                  const TypeIcon = typeConfig?.icon || FileText;

                  return (
                    <Card 
                      key={req.id} 
                      className={`cursor-pointer hover:border-purple-300 transition-colors ${req.isOverdue ? 'border-red-300 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowDetailDialog(true);
                      }}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center">
                              <TypeIcon className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{req.titularName}</p>
                                <Badge className={statusConfig.color}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                                {req.isOverdue && (
                                  <Badge variant="destructive">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Atrasada
                                  </Badge>
                                )}
                              </div>
                              <p className="body-small">
                                {typeConfig?.label} • {req.titularEmail || req.titularDocument || "Sem contato"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Recebida em {new Date(req.receivedAt).toLocaleDateString('pt-BR')}
                                {req.daysRemaining !== null && (
                                  <span className={req.daysRemaining < 0 ? 'text-red-600' : req.daysRemaining <= 3 ? 'text-yellow-600' : ''}>
                                    {' '}• {req.daysRemaining < 0 ? `${Math.abs(req.daysRemaining)} dias de atraso` : `${req.daysRemaining} dias restantes`}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {req.requestType === 'acesso' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateReport(req.titularName, req.titularEmail, req.titularDocument, req.id);
                                }}
                                disabled={generateReportMutation.isPending}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Gerar Relatório
                              </Button>
                            )}
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={req.status}
                                onValueChange={(v) => updateStatusMutation.mutate({ requestId: req.id, status: v as any })}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="recebida">Recebida</SelectItem>
                                  <SelectItem value="em_analise">Em Análise</SelectItem>
                                  <SelectItem value="aguardando_info">Aguardando Info</SelectItem>
                                  <SelectItem value="respondida">Respondida</SelectItem>
                                  <SelectItem value="negada">Negada</SelectItem>
                                  <SelectItem value="arquivada">Arquivada</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma solicitação registrada.</p>
                  <Button
                    className="mt-4"
                    onClick={() => setShowNewRequestDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Primeira Solicitação
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Buscar Titular */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar Dados do Titular
                </CardTitle>
                <CardDescription>
                  Localize todos os dados de um titular em todos os processos mapeados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Digite nome, e-mail, CPF ou categoria do titular..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    disabled={!searchQuery}
                  >
                    Limpar
                  </Button>
                </div>

                {searchQuery.length >= 2 && (
                  <div className="mt-6">
                    {searchLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : searchResults && searchResults.length > 0 ? (
                      <div className="space-y-3">
                        <p className="body-small mb-4">
                          {searchResults.length} resultado(s) encontrado(s)
                        </p>
                        {searchResults.map((result: any, idx: number) => (
                          <Card key={idx} className="border-l-4 border-l-purple-500">
                            <CardContent className="py-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline">{result.titularCategory}</Badge>
                                    {result.hasSensitiveData && (
                                      <Badge variant="destructive">Dados Sensíveis</Badge>
                                    )}
                                  </div>
                                  <p className="font-medium">{result.processTitle}</p>
                                  <p className="body-small">
                                    Área: {result.areaName} • Sistema: {result.systemName}
                                  </p>
                                  <div className="mt-2 text-sm">
                                    <span className="text-muted-foreground">Base Legal:</span> {result.legalBasis}
                                    <span className="mx-2">•</span>
                                    <span className="text-muted-foreground">Retenção:</span> {result.retentionPeriod}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleGenerateReport(result.titularCategory || result.titularName)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Nenhum resultado encontrado para "{searchQuery}"</p>
                        <p className="body-small mt-2">
                          Certifique-se de que os dados foram consolidados após a conclusão das entrevistas.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Categorias */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Categorias de Titulares
                </CardTitle>
                <CardDescription>
                  Visão consolidada por categoria de titular identificada nos mapeamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categories && categories.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categories.map((category: string) => (
                      <Card
                        key={category}
                        className="cursor-pointer hover:border-purple-300 transition-colors"
                        onClick={() => {
                          setSearchQuery(category);
                          setActiveTab("search");
                        }}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center">
                              <UserCheck className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium">{category}</p>
                              <p className="text-xs text-muted-foreground">Ver dados</p>
                            </div>
                            <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma categoria de titular identificada.</p>
                    <p className="body-small mt-2">
                      Execute a consolidação após concluir as entrevistas de mapeamento.
                    </p>
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => consolidateMutation.mutate({ organizationId })}
                      disabled={consolidateMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${consolidateMutation.isPending ? 'animate-spin' : ''}`} />
                      Consolidar Agora
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alerta LGPD */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Art. 18 - LGPD:</strong> O titular dos dados pessoais tem direito a obter do controlador, 
                a qualquer momento e mediante requisição, confirmação da existência de tratamento, acesso aos dados, 
                correção, portabilidade, eliminação e informações sobre compartilhamento. O prazo para resposta é de 15 dias.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

      {/* Dialog de Detalhes da Solicitação */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              Detalhes da Solicitação
            </DialogTitle>
            <DialogDescription>
              Visualize e gerencie a solicitação do titular de dados
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Informações do Titular */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Nome do Titular</Label>
                  <p className="font-medium">{selectedRequest.titularName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">E-mail</Label>
                  <p className="font-medium">{selectedRequest.titularEmail || "Não informado"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Documento</Label>
                  <p className="font-medium">{selectedRequest.titularDocument || "Não informado"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Telefone</Label>
                  <p className="font-medium">{selectedRequest.titularPhone || "Não informado"}</p>
                </div>
              </div>

              {/* Tipo e Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo de Solicitação</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const typeConfig = REQUEST_TYPES.find(t => t.value === selectedRequest.requestType);
                      const TypeIcon = typeConfig?.icon || FileText;
                      return (
                        <>
                          <TypeIcon className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">{typeConfig?.label || selectedRequest.requestType}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status Atual</Label>
                  <div className="mt-1">
                    <Select
                      value={selectedRequest.status}
                      onValueChange={(v) => {
                        updateStatusMutation.mutate({ requestId: selectedRequest.id, status: v as any });
                        setSelectedRequest({ ...selectedRequest, status: v });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recebida">Recebida</SelectItem>
                        <SelectItem value="em_analise">Em Análise</SelectItem>
                        <SelectItem value="aguardando_info">Aguardando Info</SelectItem>
                        <SelectItem value="respondida">Respondida</SelectItem>
                        <SelectItem value="negada">Negada</SelectItem>
                        <SelectItem value="arquivada">Arquivada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Recebimento</Label>
                  <p className="font-medium">
                    {new Date(selectedRequest.receivedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Prazo LGPD (15 dias)</Label>
                  <p className={`font-medium ${selectedRequest.daysRemaining < 0 ? 'text-red-600' : selectedRequest.daysRemaining <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {selectedRequest.daysRemaining < 0 
                      ? `${Math.abs(selectedRequest.daysRemaining)} dias de atraso` 
                      : `${selectedRequest.daysRemaining} dias restantes`}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data de Resposta</Label>
                  <p className="font-medium">
                    {selectedRequest.respondedAt 
                      ? new Date(selectedRequest.respondedAt).toLocaleDateString('pt-BR')
                      : "Aguardando resposta"}
                  </p>
                </div>
              </div>

              {/* Descrição/Mensagem */}
              {selectedRequest.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Mensagem do Titular</Label>
                  <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
                  </div>
                </div>
              )}

              {/* Canal de Origem */}
              {selectedRequest.channel && (
                <div>
                  <Label className="text-muted-foreground text-xs">Canal de Origem</Label>
                  <p className="font-medium capitalize">{selectedRequest.channel}</p>
                </div>
              )}

              {/* Área de Resposta */}
              <div className="border-t pt-4">
                <Label className="text-muted-foreground text-xs mb-2 block">Resposta ao Titular</Label>
                <Textarea
                  placeholder="Digite a resposta para o titular..."
                  className="min-h-[120px]"
                  value={selectedRequest.response || ""}
                  onChange={(e) => setSelectedRequest({ ...selectedRequest, response: e.target.value })}
                />
              </div>

              {/* Ações */}
              <DialogFooter className="flex gap-2">
                {selectedRequest.requestType === 'acesso' && (
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateReport(
                      selectedRequest.titularName, 
                      selectedRequest.titularEmail, 
                      selectedRequest.titularDocument, 
                      selectedRequest.id
                    )}
                    disabled={generateReportMutation.isPending}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Gerar Relatório de Dados
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowDetailDialog(false)}
                >
                  Fechar
                </Button>
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                  onClick={() => {
                    if (selectedRequest.response) {
                      updateStatusMutation.mutate({ 
                        requestId: selectedRequest.id, 
                        status: 'respondida',
                        notes: selectedRequest.response
                      });
                      toast.success("Resposta enviada com sucesso!");
                      setShowDetailDialog(false);
                    } else {
                      toast.error("Digite uma resposta antes de enviar.");
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Resposta
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
