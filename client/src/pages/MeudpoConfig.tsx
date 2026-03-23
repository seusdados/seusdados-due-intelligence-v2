import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Settings,
  Clock,
  Bell,
  FileText,
  Save,
  Building2,
  AlertTriangle,
  Mail,
  Calendar,
  Tag,
  Plus,
  X,
  Loader2,
  Users,
  UserPlus,
} from "lucide-react";

export default function MeudpoConfig() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();


  const isAdminOrConsultor = user?.role === "admin_global" || user?.role === "consultor";
  const effectiveOrgId = isAdminOrConsultor ? selectedOrganization?.id : user?.organizationId;

  // Estados para configurações
  const [slaCritica, setSlaCritica] = useState(4);
  const [slaAlta, setSlaAlta] = useState(8);
  const [slaMedia, setSlaMedia] = useState(24);
  const [slaBaixa, setSlaBaixa] = useState(72);
  const [slaWarningThreshold, setSlaWarningThreshold] = useState(80);

  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const [notifyOnUpdate, setNotifyOnUpdate] = useState(true);
  const [notifyOnComment, setNotifyOnComment] = useState(true);
  const [notifyOnResolve, setNotifyOnResolve] = useState(true);
  const [notifySlaWarning, setNotifySlaWarning] = useState(true);

  const [autoReportEnabled, setAutoReportEnabled] = useState(false);
  const [autoReportFrequency, setAutoReportFrequency] = useState<"diario" | "semanal" | "quinzenal" | "mensal">("semanal");
  const [reportRecipients, setReportRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  // Estados para atribuição automática
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [autoAssignRules, setAutoAssignRules] = useState<{
    ticketType?: string;
    priority?: string;
    assignToUserId?: number;
  }[]>([]);

  // Buscar configurações existentes
  const { data: settings, isLoading } = trpc.notifications.getSettings.useQuery(
    { organizationId: effectiveOrgId! },
    { enabled: !!effectiveOrgId }
  );

  // Buscar consultores disponíveis para atribuição
  const { data: consultants } = trpc.tickets.getAvailableConsultants.useQuery(
    { organizationId: effectiveOrgId! },
    { enabled: !!effectiveOrgId }
  );

  // Carregar configurações quando disponíveis
  useEffect(() => {
    if (settings) {
      setSlaCritica(settings.slaCritica || 4);
      setSlaAlta(settings.slaAlta || 8);
      setSlaMedia(settings.slaMedia || 24);
      setSlaBaixa(settings.slaBaixa || 72);
      setSlaWarningThreshold(settings.slaWarningThreshold || 80);
      setNotifyOnCreate(Boolean(settings.notifyOnCreate ?? true));
      setNotifyOnUpdate(Boolean(settings.notifyOnUpdate ?? true));
      setNotifyOnComment(Boolean(settings.notifyOnComment ?? true));
      setNotifyOnResolve(Boolean(settings.notifyOnResolve ?? true));
      setNotifySlaWarning(Boolean(settings.notifySlaWarning ?? true));
      setAutoReportEnabled(Boolean(settings.autoReportEnabled ?? false));
      setAutoReportFrequency((settings.autoReportFrequency as "diario" | "semanal" | "quinzenal" | "mensal") || "semanal");
      setReportRecipients((settings.reportRecipients as string[]) || []);
      setCustomCategories((settings.customCategories as string[]) || []);
    }
  }, [settings]);

  const saveSettingsMutation = trpc.notifications.saveSettings.useMutation({
    onSuccess: () => {
      alert("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      alert("Erro ao salvar: " + error.message);
    },
  });

  const handleSave = () => {
    if (!effectiveOrgId) return;

    saveSettingsMutation.mutate({
      organizationId: effectiveOrgId,
      slaCritica,
      slaAlta,
      slaMedia,
      slaBaixa,
      slaWarningThreshold,
      notifyOnCreate,
      notifyOnUpdate,
      notifyOnComment,
      notifyOnResolve,
      notifySlaWarning,
      autoReportEnabled,
      autoReportFrequency,
      reportRecipients,
      customCategories,
    });
  };

  const addRecipient = () => {
    if (newRecipient && !reportRecipients.includes(newRecipient)) {
      setReportRecipients([...reportRecipients, newRecipient]);
      setNewRecipient("");
    }
  };

  const removeRecipient = (email: string) => {
    setReportRecipients(reportRecipients.filter((r) => r !== email));
  };

  const addCategory = () => {
    if (newCategory && !customCategories.includes(newCategory)) {
      setCustomCategories([...customCategories, newCategory]);
      setNewCategory("");
    }
  };

  const removeCategory = (category: string) => {
    setCustomCategories(customCategories.filter((c) => c !== category));
  };

  if (!isAdminOrConsultor) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="heading-4 mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-md">
          Apenas administradores e consultores podem acessar as configurações do módulo.
        </p>
      </div>
    );
  }

  if (!effectiveOrgId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="heading-4 mb-2">Selecione uma Organização</h2>
        <p className="text-muted-foreground max-w-md">
          Para configurar o MeuDPO, selecione uma organização no menu lateral.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurações do MeuDPO
          </h1>
          <p className="text-muted-foreground">
            Configure SLA, notificações e relatórios automáticos
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveSettingsMutation.isPending}>
          {saveSettingsMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>

      {/* Organização selecionada */}
      {selectedOrganization && (
        <div className="flex items-center gap-2 body-small">
          <Building2 className="h-4 w-4" />
          <span>Configurando: <strong>{selectedOrganization.name}</strong></span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="sla" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sla">
              <Clock className="h-4 w-4 mr-2" />
              SLA
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="h-4 w-4 mr-2" />
              Relatórios
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Tag className="h-4 w-4 mr-2" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="assignment">
              <Users className="h-4 w-4 mr-2" />
              Atribuição
            </TabsTrigger>
          </TabsList>

          {/* Tab SLA */}
          <TabsContent value="sla" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de SLA</CardTitle>
                <CardDescription>
                  Defina os prazos máximos de resolução para cada nível de prioridade (em horas)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Badge variant="destructive">Crítica</Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        value={slaCritica}
                        onChange={(e) => setSlaCritica(parseInt(e.target.value) || 4)}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">horas</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Incidentes de segurança, vazamentos de dados
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Badge className="bg-orange-500">Alta</Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        value={slaAlta}
                        onChange={(e) => setSlaAlta(parseInt(e.target.value) || 8)}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">horas</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Solicitações de titulares, questões urgentes
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Badge className="bg-blue-500">Média</Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={336}
                        value={slaMedia}
                        onChange={(e) => setSlaMedia(parseInt(e.target.value) || 24)}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">horas</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dúvidas jurídicas, consultorias gerais
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Badge variant="secondary">Baixa</Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={720}
                        value={slaBaixa}
                        onChange={(e) => setSlaBaixa(parseInt(e.target.value) || 72)}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">horas</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Documentação, treinamentos, melhorias
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Limite de Aviso de SLA</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      value={slaWarningThreshold}
                      onChange={(e) => setSlaWarningThreshold(parseInt(e.target.value) || 80)}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">% do tempo de SLA</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uma notificação será enviada quando o ticket atingir este percentual do prazo
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Notificações */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Notificações</CardTitle>
                <CardDescription>
                  Escolha quando os usuários devem receber notificações sobre tickets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Criação de Ticket</Label>
                      <p className="text-xs text-muted-foreground">
                        Notificar quando um novo ticket for criado
                      </p>
                    </div>
                    <Switch
                      checked={notifyOnCreate}
                      onCheckedChange={setNotifyOnCreate}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Atualização de Ticket</Label>
                      <p className="text-xs text-muted-foreground">
                        Notificar quando o status ou prioridade mudar
                      </p>
                    </div>
                    <Switch
                      checked={notifyOnUpdate}
                      onCheckedChange={setNotifyOnUpdate}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Novo Comentário</Label>
                      <p className="text-xs text-muted-foreground">
                        Notificar quando um comentário for adicionado
                      </p>
                    </div>
                    <Switch
                      checked={notifyOnComment}
                      onCheckedChange={setNotifyOnComment}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Resolução de Ticket</Label>
                      <p className="text-xs text-muted-foreground">
                        Notificar quando um ticket for resolvido
                      </p>
                    </div>
                    <Switch
                      checked={notifyOnResolve}
                      onCheckedChange={setNotifyOnResolve}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Aviso de SLA</Label>
                      <p className="text-xs text-muted-foreground">
                        Notificar quando o ticket estiver próximo do prazo
                      </p>
                    </div>
                    <Switch
                      checked={notifySlaWarning}
                      onCheckedChange={setNotifySlaWarning}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Relatórios */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Automáticos</CardTitle>
                <CardDescription>
                  Configure o envio automático de relatórios consolidados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ativar Relatórios Automáticos</Label>
                    <p className="text-xs text-muted-foreground">
                      Enviar relatórios consolidados periodicamente
                    </p>
                  </div>
                  <Switch
                    checked={autoReportEnabled}
                    onCheckedChange={setAutoReportEnabled}
                  />
                </div>

                {autoReportEnabled && (
                  <>
                    <Separator />

                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Select
                        value={autoReportFrequency}
                        onValueChange={(v) => setAutoReportFrequency(v as typeof autoReportFrequency)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diario">Diário</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="quinzenal">Quinzenal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Destinatários</Label>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          value={newRecipient}
                          onChange={(e) => setNewRecipient(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                        />
                        <Button type="button" onClick={addRecipient} size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {reportRecipients.map((email) => (
                          <Badge key={email} variant="secondary" className="gap-1">
                            <Mail className="h-3 w-3" />
                            {email}
                            <button
                              onClick={() => removeRecipient(email)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {reportRecipients.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Nenhum destinatário adicionado
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Categorias */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Categorias Personalizadas</CardTitle>
                <CardDescription>
                  Adicione categorias específicas para sua organização além das padrão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova categoria..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  />
                  <Button type="button" onClick={addCategory}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Categorias Padrão</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Solicitação de Titular</Badge>
                    <Badge variant="outline">Incidente de Segurança</Badge>
                    <Badge variant="outline">Dúvida Jurídica</Badge>
                    <Badge variant="outline">Consultoria Geral</Badge>
                    <Badge variant="outline">Auditoria</Badge>
                    <Badge variant="outline">Treinamento</Badge>
                    <Badge variant="outline">Documentação</Badge>
                  </div>
                </div>

                {customCategories.length > 0 && (
                  <div className="space-y-2">
                    <Label>Categorias Personalizadas</Label>
                    <div className="flex flex-wrap gap-2">
                      {customCategories.map((category) => (
                        <Badge key={category} className="gap-1">
                          <Tag className="h-3 w-3" />
                          {category}
                          <button
                            onClick={() => removeCategory(category)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Atribuição Automática */}
          <TabsContent value="assignment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Atribuição Automática</CardTitle>
                <CardDescription>
                  Configure regras para atribuir tickets automaticamente a consultores
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ativar Atribuição Automática</Label>
                    <p className="body-small">
                      Tickets serão atribuídos automaticamente ao consultor com menos tickets ativos
                    </p>
                  </div>
                  <Switch
                    checked={autoAssignEnabled}
                    onCheckedChange={setAutoAssignEnabled}
                  />
                </div>

                <Separator />

                {autoAssignEnabled && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Consultores Disponíveis</Label>
                      <p className="body-small mb-2">
                        Tickets serão distribuídos entre estes consultores com base na carga de trabalho
                      </p>
                      <div className="grid gap-2">
                        {consultants && consultants.length > 0 ? (
                          consultants.map((consultant) => (
                            <div
                              key={consultant.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{consultant.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {consultant.ticketCount} tickets ativos
                                  </p>
                                </div>
                              </div>
                              <Badge variant={consultant.ticketCount < 5 ? "default" : consultant.ticketCount < 10 ? "secondary" : "destructive"}>
                                {consultant.ticketCount < 5 ? "Disponível" : consultant.ticketCount < 10 ? "Moderado" : "Ocupado"}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <p className="body-small text-center py-4">
                            Nenhum consultor disponível
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Regras de Atribuição</Label>
                      <p className="body-small">
                        Defina regras específicas para tipos de tickets ou prioridades
                      </p>
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 body-small">
                          <UserPlus className="h-4 w-4" />
                          <span>
                            Por padrão, tickets são atribuídos ao consultor com menor carga de trabalho.
                            Regras personalizadas podem ser configuradas em uma atualização futura.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
