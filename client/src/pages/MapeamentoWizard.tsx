import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Users, 
  ClipboardList, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Mail,
  Plus,
  Trash2,
  Send,
  AlertTriangle,
  Clock,
  Target,
  RefreshCw,
  MoreVertical,
  Copy,
  ExternalLink,
  RotateCcw
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/contexts/ToastContext";
import React from "react";
import { toast as sonnerToast } from "sonner";

// Premium: catálogos vêm do backend (taxonomy). Mantemos fallback para evitar travar caso API falhe.

const employeesOptions = [
  { value: "ate_10", label: "Até 10 colaboradores" },
  { value: "11_50", label: "11 a 50 colaboradores" },
  { value: "51_200", label: "51 a 200 colaboradores" },
  { value: "201_1000", label: "201 a 1000 colaboradores" },
  { value: "+1000", label: "Mais de 1000 colaboradores" },
];

export default function MapeamentoWizard() {
  const { selectedOrganization } = useOrganization();
  const organizationId = selectedOrganization?.id;
  const orgId = selectedOrganization?.id;
  const orgSyncQ = trpc.orgSync.getProfile.useQuery({ organizationId: orgId! }, { enabled: !!orgId });
  const orgSyncUpdateM = trpc.orgSync.updateProfile.useMutation();

  const toast = useToast();
  
  // Estado do wizard
  const [currentPhase, setCurrentPhase] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fase 0 - Contexto
  const [context, setContext] = useState({
    segment: "",
    businessType: "",
    employeesRange: "",
    unitsCount: 1,
    hasDataProtectionOfficer: false,
    dataProtectionOfficerName: "",
    dataProtectionOfficerEmail: "",
  });
  
  // Fase 0 - Áreas
  const [selectedAreas, setSelectedAreas] = useState<Record<string, boolean>>({});
  const [customArea, setCustomArea] = useState("");

  const segmentsQ = trpc.taxonomy.listSegments.useQuery(undefined, { enabled: true });
  const businessTypesQ = trpc.taxonomy.listBusinessTypes.useQuery(
    { segment: context.segment || null },
    { enabled: !!context.segment }
  );
  
  // Fase 1 - Respondentes
  const [delegationMode, setDelegationMode] = useState<"area" | "processo">("area");
  const [newRespondent, setNewRespondent] = useState({
    areaId: 0,
    processId: null as number | null,
    name: "",
    email: "",
    phone: "",
    role: "",
  });

  // Queries
  const { data: stats, refetch: refetchStats } = trpc.mapeamento.getStats.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId }
  );

  const { data: existingContext, refetch: refetchContext } = trpc.mapeamento.getContext.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId }
  );

  const { data: taxonomySuggestion } = trpc.taxonomy.suggestAreasAndProcesses.useQuery(
    { segment: context.segment || null, businessType: context.businessType || null },
    { enabled: !!context.segment && !!context.businessType }
  );
  const suggestedAreas = taxonomySuggestion?.areas ?? [];

  const { data: areas, refetch: refetchAreas } = trpc.mapeamento.listAreas.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId }
  );

  const { data: respondents, refetch: refetchRespondents } = trpc.mapeamento.listRespondents.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId }
  );

  const { data: actionPlans } = trpc.mapeamento.listActionPlans.useQuery(
    { organizationId: organizationId!, status: "pendente" },
    { enabled: !!organizationId }
  );

  // Mutations
  const saveContextMutation = trpc.mapeamento.saveContext.useMutation({
    onSuccess: () => {
      refetchContext();
      refetchStats();
      toast.success("Contexto salvo com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar contexto: ${error.message}`);
    },
  });

  const confirmAreasMutation = trpc.mapeamento.confirmAreas.useMutation({
    onSuccess: () => {
      refetchAreas();
      refetchStats();
      setCurrentPhase(1);
      setActiveTab("fase1");
      toast.success("Áreas confirmadas! Avançando para Fase 1.");
    },
    onError: (error) => {
      toast.error(`Erro ao confirmar áreas: ${error.message}`);
    },
  });

  // Query de processos por área (para delegação por processo)
  const { data: processesByArea } = trpc.mapeamento.listProcessesByAreas.useQuery(
    { organizationId: organizationId!, contextId: existingContext?.id || 0, areaIds: newRespondent.areaId ? [newRespondent.areaId] : [] },
    { enabled: !!organizationId && !!existingContext?.id && !!newRespondent.areaId && delegationMode === "processo" }
  );
  const processesForSelectedArea = processesByArea?.items?.[0]?.processes || [];

  const createRespondentMutation = trpc.mapeamento.createRespondent.useMutation({
    onSuccess: () => {
      refetchRespondents();
      refetchStats();
      setNewRespondent({ areaId: 0, processId: null, name: "", email: "", phone: "", role: "" });
      toast.success("Responsável cadastrado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar responsável: ${error.message}`);
    },
  });

  const markInviteSentMutation = trpc.mapeamento.markInviteSent.useMutation({
    onSuccess: () => {
      refetchRespondents();
      toast.success("Convite marcado como enviado!");
    },
    onError: (error) => {
      toast.error(`Erro ao marcar convite: ${error.message}`);
    },
  });

  const sendInvitationMutation = trpc.mapeamento.sendInterviewInvitation.useMutation({
    onSuccess: (result) => {
      refetchRespondents();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao enviar convite: ${error.message}`);
    }
  });

  const renewTokenMutation = trpc.mapeamento.renewToken.useMutation({
    onSuccess: (result) => {
      refetchRespondents();
      toast.success("Token renovado com sucesso! Novo link gerado.");
    },
    onError: (error) => {
      toast.error(`Erro ao renovar token: ${error.message}`);
    }
  });

  const resendInviteMutation = trpc.mapeamento.resendInvite.useMutation({
    onSuccess: (result) => {
      refetchRespondents();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao reenviar convite: ${error.message}`);
    }
  });

  const deleteRespondentMutation = trpc.mapeamento.deleteRespondent.useMutation({
    onSuccess: (result) => {
      refetchRespondents();
      refetchStats();
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });

  const reopenInterviewMutation = trpc.mapeamento.reopenInterview.useMutation({
    onSuccess: (result) => {
      refetchRespondents();
      refetchStats();
      toast.success(result.message);
    },
    onError: (error: any) => {
      toast.error(`Erro ao reabrir: ${error.message}`);
    }
  });

  // Premium: aplicar defaults do cadastro da organização quando carregar
  useEffect(() => {
    const profile = orgSyncQ.data?.profile;
    if (!profile) return;
    setContext((prev) => {
      const next = { ...prev };
      if (!next.segment && profile.segment) next.segment = profile.segment;
      if (!next.businessType && profile.businessType) next.businessType = profile.businessType;
      if (!next.employeesRange && profile.employeesRange) next.employeesRange = profile.employeesRange;
      if (!next.unitsCount && profile.units) next.unitsCount = Number(profile.units);
      if (!next.hasDataProtectionOfficer && profile.hasDpo !== undefined && profile.hasDpo !== null) next.hasDataProtectionOfficer = !!profile.hasDpo;
      if (!next.dataProtectionOfficerName && profile.dpoName) next.dataProtectionOfficerName = profile.dpoName;
      if (!next.dataProtectionOfficerEmail && profile.dpoEmail) next.dataProtectionOfficerEmail = profile.dpoEmail;
      return next;
    });
  }, [orgSyncQ.data?.profile]);

  // Efeitos
  useEffect(() => {
    if (existingContext) {
      setContext({
        segment: existingContext.segment || "",
        businessType: existingContext.businessType || "",
        employeesRange: existingContext.employeesRange || "",
        unitsCount: existingContext.unitsCount || 1,
        hasDataProtectionOfficer: !!existingContext.hasDataProtectionOfficer,
        dataProtectionOfficerName: existingContext.dataProtectionOfficerName || "",
        dataProtectionOfficerEmail: existingContext.dataProtectionOfficerEmail || "",
      });
    }
  }, [existingContext]);

  useEffect(() => {
    if (stats) {
      setCurrentPhase(stats.phase || 0);
    }
  }, [stats]);

  useEffect(() => {
    if (suggestedAreas.length > 0 && Object.keys(selectedAreas).length === 0) {
      const initial: Record<string, boolean> = {};
      suggestedAreas.forEach(a => {
        initial[a.code] = true;
      });
      setSelectedAreas(initial);
    }
  }, [suggestedAreas]);

  // Handlers
  const handleSaveContext = async () => {
    if (!organizationId) {
      toast.error('Selecione uma organização');
      return;
    }
    try {
      await saveContextMutation.mutateAsync({
        organizationId,
        ...context,
      });
      // Premium: sincroniza para o cadastro da organização (duas mãos)
      try {
        await orgSyncUpdateM.mutateAsync({ organizationId: orgId!, patch: {
          segment: context.segment || null,
          businessType: context.businessType || null,
          units: context.unitsCount ? Number(context.unitsCount) : null,
          employeesRange: context.employeesRange || null,
          hasDpo: context.hasDataProtectionOfficer ?? null,
          dpoName: context.dataProtectionOfficerName || null,
          dpoEmail: context.dataProtectionOfficerEmail || null,
        }});
      } catch (e) { console.warn('orgSync.updateProfile falhou (não bloqueante):', e); }
      toast.success('Contexto salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar contexto');
    }
  };

  const handleConfirmAreas = async () => {
    if (!organizationId || !existingContext) return;
    
    const areasToConfirm = Object.entries(selectedAreas)
      .filter(([_, selected]) => selected)
      .map(([code]) => {
        const found = suggestedAreas.find(a => a.code === code);
        return { name: found?.label || code, isCustom: false };
      });
    
    if (customArea.trim()) {
      areasToConfirm.push({ name: customArea.trim(), isCustom: true });
    }

    try {
      await confirmAreasMutation.mutateAsync({
        organizationId,
        contextId: existingContext.id,
        areas: areasToConfirm,
      });
      // Forçar mudança de aba após sucesso
      setCurrentPhase(1);
      setActiveTab("fase1");
      toast.success("Áreas confirmadas! Avançando para Fase 1.");
    } catch (error: any) {
      toast.error(`Erro ao confirmar áreas: ${error.message}`);
    }
  };

  const handleAddRespondent = async () => {
    if (!organizationId || !newRespondent.areaId || !newRespondent.name || !newRespondent.email) return;
    if (delegationMode === "processo" && !newRespondent.processId) {
      toast.error("Selecione um processo para delegar.");
      return;
    }
    await createRespondentMutation.mutateAsync({
      organizationId,
      areaId: newRespondent.areaId,
      name: newRespondent.name,
      email: newRespondent.email,
      phone: newRespondent.phone,
      role: newRespondent.role,
      ...(delegationMode === "processo" && newRespondent.processId ? { processId: newRespondent.processId } : {}),
    });
  };

  const handleSendInvite = async (respondentId: number) => {
    const baseUrl = window.location.origin;
    await sendInvitationMutation.mutateAsync({ respondentId, baseUrl });
  };

  const toggleArea = (area: string) => {
    setSelectedAreas(prev => ({ ...prev, [area]: !prev[area] }));
  };

  const addCustomArea = () => {
    if (customArea.trim()) {
      setSelectedAreas(prev => ({ ...prev, [customArea.trim()]: true }));
      setCustomArea("");
    }
  };

  if (!organizationId) {
    return (
      <div className="p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800">
                Selecione uma organização no menu lateral para acessar o mapeamento.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = stats ? Math.round((stats.respondentsCompleted / Math.max(stats.respondentsCount, 1)) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary uppercase tracking-wider">Intelliconformidade</p>
          <h1 className="text-2xl font-light text-foreground">Mapeamento de Processos e Dados</h1>
          <p className="text-muted-foreground">
            Identifique e documente todas as operações de tratamento de dados pessoais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/mapeamentos">
            <Button variant="outline" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Ver ROTs
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={currentPhase === 0 ? "border-primary" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                stats?.hasContext ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
              }`}>
                {stats?.hasContext ? <CheckCircle2 className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-medium">Fase 0</p>
                <p className="text-xs text-muted-foreground">Estrutura Organizacional</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={currentPhase === 1 ? "border-primary" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                (stats?.respondentsCount || 0) > 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
              }`}>
                {(stats?.respondentsCount || 0) > 0 ? <CheckCircle2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-medium">Fase 1</p>
                <p className="text-xs text-muted-foreground">Delegação ({stats?.respondentsCount || 0} responsáveis)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={currentPhase === 2 ? "border-primary" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                (stats?.respondentsCompleted || 0) > 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
              }`}>
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Fase 2</p>
                <p className="text-xs text-muted-foreground">
                  Entrevistas ({stats?.respondentsCompleted || 0}/{stats?.respondentsCount || 0})
                </p>
              </div>
            </div>
            {(stats?.respondentsCount || 0) > 0 && (
              <Progress value={progress} className="mt-2 h-1" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                (stats?.pendingActionsCount || 0) > 0 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-400"
              }`}>
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Plano de Ação</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.pendingActionsCount || 0} pendentes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="fase0">Fase 0 - Estrutura</TabsTrigger>
          <TabsTrigger value="fase1">Fase 1 - Delegação</TabsTrigger>
          <TabsTrigger value="fase2">Fase 2 - Entrevistas</TabsTrigger>
          <TabsTrigger value="acoes">Plano de Ação</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Atual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status do Mapeamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Áreas mapeadas</span>
                  <Badge variant="secondary">{stats?.areasCount || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Responsáveis cadastrados</span>
                  <Badge variant="secondary">{stats?.respondentsCount || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entrevistas concluídas</span>
                  <Badge variant="secondary">{stats?.respondentsCompleted || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Processos com risco</span>
                  <Badge variant={stats?.responsesWithRisk ? "destructive" : "secondary"}>
                    {stats?.responsesWithRisk || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Próximos Passos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Próximos Passos</CardTitle>
              </CardHeader>
              <CardContent>
                {!stats?.hasContext && (
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Fase 0:</strong> Configure a estrutura organizacional para começar o mapeamento.
                      <Button 
                        variant="link" 
                        className="p-0 h-auto ml-2"
                        onClick={() => setActiveTab("fase0")}
                      >
                        Iniciar →
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {stats?.hasContext && stats.areasCount === 0 && (
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Fase 0:</strong> Confirme as áreas da organização.
                      <Button 
                        variant="link" 
                        className="p-0 h-auto ml-2"
                        onClick={() => setActiveTab("fase0")}
                      >
                        Continuar →
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {stats?.hasContext && stats.areasCount > 0 && stats.respondentsCount === 0 && (
                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Fase 1:</strong> Cadastre os responsáveis por cada área.
                      <Button 
                        variant="link" 
                        className="p-0 h-auto ml-2"
                        onClick={() => setActiveTab("fase1")}
                      >
                        Cadastrar →
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {(stats?.respondentsCount ?? 0) > 0 && (stats?.respondentsCompleted ?? 0) < (stats?.respondentsCount ?? 0) && (
                  <Alert>
                    <ClipboardList className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Fase 2:</strong> Aguardando {(stats?.respondentsCount ?? 0) - (stats?.respondentsCompleted ?? 0)} entrevistas.
                      <Button 
                        variant="link" 
                        className="p-0 h-auto ml-2"
                        onClick={() => setActiveTab("fase2")}
                      >
                        Ver status →
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {(stats?.pendingActionsCount ?? 0) > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{stats?.pendingActionsCount ?? 0} ações pendentes</strong> de mitigação de riscos.
                      <Button 
                        variant="link" 
                        className="p-0 h-auto ml-2 text-destructive-foreground"
                        onClick={() => setActiveTab("acoes")}
                      >
                        Ver ações →
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fase 0 Tab */}
        <TabsContent value="fase0" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações da Organização
              </CardTitle>
              <CardDescription>
                Defina o contexto da sua organização para receber sugestões personalizadas de áreas e processos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Segmento de Atividade *</Label>
                  <Select 
                    value={context.segment} 
                    onValueChange={(v) => setContext({ ...context, segment: v, businessType: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {(segmentsQ.data?.length ? segmentsQ.data : [
                        { value: "saude", label: "Saúde" },
                        { value: "educacao", label: "Educação" },
                        { value: "varejo", label: "Varejo" },
                        { value: "financas", label: "Finanças" },
                        { value: "industria", label: "Indústria" },
                        { value: "servicos", label: "Serviços" },
                        { value: "tecnologia", label: "Tecnologia" },
                      ]).map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {context.segment && (
                  <div className="space-y-2">
                    <Label>Tipo de Negócio *</Label>
                    <Select 
                      value={context.businessType} 
                      onValueChange={(v) => setContext({ ...context, businessType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {(businessTypesQ.data?.length ? businessTypesQ.data : []).map((type: any) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Número de Colaboradores</Label>
                  <Select 
                    value={context.employeesRange} 
                    onValueChange={(v) => setContext({ ...context, employeesRange: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a faixa" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeesOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Número de Unidades</Label>
                  <Input
                    type="number"
                    min="1"
                    value={context.unitsCount}
                    onChange={(e) => setContext({ ...context, unitsCount: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <Checkbox
                  id="hasDpo"
                  checked={context.hasDataProtectionOfficer}
                  onCheckedChange={(checked) => 
                    setContext({ ...context, hasDataProtectionOfficer: !!checked })
                  }
                />
                <Label htmlFor="hasDpo">A organização possui Encarregado de Proteção de Dados (DPO)?</Label>
              </div>

              {context.hasDataProtectionOfficer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label>Nome do DPO</Label>
                    <Input
                      value={context.dataProtectionOfficerName}
                      onChange={(e) => setContext({ ...context, dataProtectionOfficerName: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail do DPO</Label>
                    <Input
                      type="email"
                      value={context.dataProtectionOfficerEmail}
                      onChange={(e) => setContext({ ...context, dataProtectionOfficerEmail: e.target.value })}
                      placeholder="dpo@empresa.com"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveContext}
                  disabled={!context.segment || !context.businessType || saveContextMutation.isPending}
                >
                  {saveContextMutation.isPending ? "Salvando..." : "Salvar Contexto"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Áreas */}
          {existingContext && suggestedAreas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Áreas Sugeridas
                </CardTitle>
                <CardDescription>
                  Com base no segmento "{(segmentsQ.data || []).find((s: any) => s.value === context.segment)?.label || context.segment}" e tipo "{context.businessType}", 
                  sugerimos as seguintes áreas. Marque as que existem na sua organização.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {suggestedAreas.map((area) => (
                    <div 
                      key={area.code}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAreas[area.code] 
                          ? "bg-primary/10 border-primary" 
                          : "bg-background hover:bg-muted"
                      }`}
                      onClick={() => toggleArea(area.code)}
                    >
                      <Checkbox checked={!!selectedAreas[area.code]} />
                      <span className="text-sm">{area.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Input
                    placeholder="Adicionar outra área..."
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomArea()}
                  />
                  <Button variant="outline" onClick={addCustomArea}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {Object.values(selectedAreas).filter(Boolean).length === 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>Selecione pelo menos uma área para continuar.</AlertDescription>
                  </Alert>
                )}

                {/* Processos sugeridos por área selecionada */}
                {Object.entries(selectedAreas).filter(([_, sel]) => sel).length > 0 && taxonomySuggestion?.processesByArea && (
                  <div className="pt-4 border-t space-y-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Processos sugeridos por área</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Para cada área selecionada, listamos os processos de tratamento de dados mais comuns.
                      Esses processos serão usados como base para as entrevistas de mapeamento.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedAreas)
                        .filter(([_, sel]) => sel)
                        .map(([areaCode]) => {
                          const areaLabel = suggestedAreas.find(a => a.code === areaCode)?.label || areaCode;
                          const procs = taxonomySuggestion.processesByArea[areaCode] || [];
                          return (
                            <div key={areaCode} className="p-4 rounded-lg border bg-muted/30">
                              <div className="flex items-center gap-2 mb-3">
                                <Target className="h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">{areaLabel}</span>
                                <Badge variant="outline" className="ml-auto">{procs.length} processos</Badge>
                              </div>
                              {procs.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {procs.map((proc: any) => (
                                    <Badge key={proc.code} variant="secondary" className="text-xs">
                                      {proc.label}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">
                                  Nenhum processo padrão. Os processos serão identificados na entrevista.
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button 
                    onClick={handleConfirmAreas}
                    disabled={Object.values(selectedAreas).filter(Boolean).length === 0 || confirmAreasMutation.isPending}
                  >
                    {confirmAreasMutation.isPending ? "Confirmando..." : "Confirmar Áreas e Avançar"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Fase 1 Tab */}
        <TabsContent value="fase1" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Cadastro de Responsáveis
              </CardTitle>
              <CardDescription>
                Cadastre os responsáveis por cada área que irão responder a entrevista de mapeamento.
              </CardDescription>

{/* DELEGACAO_PREMIUM_PANEL: sugestões automáticas por área + fallback sponsor + criar usuário */}
<DelegacaoPremiumPanel
  organizationId={orgId}
  selectedAreaId={Number(newRespondent?.areaId || 0)}
  areas={areas || []}
  onPickSuggested={(u: any) => {
    setNewRespondent((prev) => ({
      ...prev,
      name: u?.name || prev.name,
      email: u?.email || prev.email,
      role: prev.role || u?.role,
    }));
  }}
  onPickSponsor={(u: any) => {
    setNewRespondent((prev) => ({
      ...prev,
      name: u?.name || prev.name,
      email: u?.email || prev.email,
    }));
  }}
  onCreateUser={(u: any) => {
    setNewRespondent((prev) => ({
      ...prev,
      name: u?.name || prev.name,
      email: u?.email || prev.email,
    }));
  }}
/>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seletor de modo de delegação */}
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border">
                <span className="text-sm font-medium">Modo de delegação:</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={delegationMode === "area" ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setDelegationMode("area"); setNewRespondent(prev => ({ ...prev, processId: null })); }}
                  >
                    Por Área
                  </Button>
                  <Button
                    type="button"
                    variant={delegationMode === "processo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDelegationMode("processo")}
                  >
                    Por Processo
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground ml-auto">
                  {delegationMode === "area"
                    ? "O responsável responde todos os processos da área."
                    : "O responsável responde apenas o processo selecionado."}
                </span>
              </div>

              <div className={`grid grid-cols-1 ${delegationMode === "processo" ? "md:grid-cols-6" : "md:grid-cols-5"} gap-4 p-4 bg-muted/50 rounded-lg`}>
                <div className="space-y-2">
                  <Label>Área *</Label>
                  <Select 
                    value={newRespondent.areaId ? String(newRespondent.areaId) : ""} 
                    onValueChange={(v) => setNewRespondent({ ...newRespondent, areaId: Number(v), processId: null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas?.map((area) => (
                        <SelectItem key={area.id} value={String(area.id)}>{area.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {delegationMode === "processo" && (
                  <div className="space-y-2">
                    <Label>Processo *</Label>
                    <Select
                      value={newRespondent.processId ? String(newRespondent.processId) : ""}
                      onValueChange={(v) => setNewRespondent({ ...newRespondent, processId: Number(v) })}
                      disabled={!newRespondent.areaId || processesForSelectedArea.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!newRespondent.areaId ? "Selecione a área" : processesForSelectedArea.length === 0 ? "Sem processos" : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent>
                        {processesForSelectedArea.map((proc: any) => (
                          <SelectItem key={proc.id} value={String(proc.id)}>{proc.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={newRespondent.name}
                    onChange={(e) => setNewRespondent({ ...newRespondent, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={newRespondent.email}
                    onChange={(e) => setNewRespondent({ ...newRespondent, email: e.target.value })}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={newRespondent.role}
                    onChange={(e) => setNewRespondent({ ...newRespondent, role: e.target.value })}
                    placeholder="Ex: Gerente"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddRespondent}
                    disabled={!newRespondent.areaId || !newRespondent.name || !newRespondent.email || (delegationMode === "processo" && !newRespondent.processId) || createRespondentMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Lista de Respondentes */}
              {respondents && respondents.length > 0 ? (
                <div className="space-y-2">
                  {respondents.map((resp: any) => {
                    const isExpired = resp.inviteExpiresAt && new Date(resp.inviteExpiresAt) < new Date();
                    const canDelete = resp.status === "pendente" || resp.status === "convidado";
                    
                    return (
                      <div 
                        key={resp.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{resp.name}</p>
                            <p className="text-sm text-muted-foreground">{resp.email}</p>
                          </div>
                          <Badge variant="outline">{resp.areaName}</Badge>
                          <Badge variant={
                            resp.status === "concluiu" ? "default" :
                            resp.status === "em_andamento" ? "secondary" :
                            resp.status === "convidado" ? "outline" : "destructive"
                          }>
                            {resp.status === "concluiu" ? "Concluído" :
                             resp.status === "em_andamento" ? "Em andamento" :
                             resp.status === "convidado" ? "Convidado" : "Pendente"}
                          </Badge>
                          {isExpired && resp.status !== "concluiu" && (
                            <Badge variant="destructive" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Link Expirado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Botão principal baseado no status */}
                          {resp.status === "pendente" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSendInvite(resp.id)}
                              disabled={sendInvitationMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Enviar Convite
                            </Button>
                          )}
                          
                          {/* Menu de ações */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {resp.inviteToken && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `${window.location.origin}/entrevista/${resp.inviteToken}`
                                      );
                                      toast.success("Link copiado para a área de transferência!");
                                    }}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copiar Link
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => window.open(`/entrevista/${resp.inviteToken}`, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Abrir Link
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>  
                              )}
                              
                              {resp.status === "concluiu" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (confirm('Deseja reabrir esta entrevista para edição? O respondente poderá acessar novamente o link original.')) {
                                        reopenInterviewMutation.mutate({
                                          respondentId: resp.id,
                                          organizationId: selectedOrg!,
                                          reason: 'Reaberta pelo consultor para edição',
                                        });
                                      }
                                    }}
                                    disabled={reopenInterviewMutation.isPending}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reabrir Entrevista
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>  
                              )}

                              {resp.status !== "concluiu" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => resendInviteMutation.mutate({ respondentId: resp.id })}
                                    disabled={resendInviteMutation.isPending}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Reenviar Convite
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => renewTokenMutation.mutate({ respondentId: resp.id })}
                                    disabled={renewTokenMutation.isPending}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Renovar Link
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>  
                              )}
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                    disabled={!canDelete}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Responsável</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir {resp.name}? Esta ação não pode ser desfeita.
                                      {!canDelete && (
                                        <span className="block mt-2 text-destructive">
                                          Não é possível excluir respondentes que já possuem respostas.
                                        </span>
                                      )}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteRespondentMutation.mutate({ respondentId: resp.id })}
                                      disabled={!canDelete || deleteRespondentMutation.isPending}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum responsável cadastrado ainda.</p>
                  <p className="text-sm">Adicione os responsáveis por cada área acima.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fase 2 Tab */}
        <TabsContent value="fase2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Status das Entrevistas
              </CardTitle>
              <CardDescription>
                Acompanhe o progresso das entrevistas de mapeamento por área.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {respondents && respondents.length > 0 ? (
                <div className="space-y-4">
                  {/* Agrupado por área */}
                  {areas?.map((area) => {
                    const areaRespondents = respondents.filter((r: any) => r.areaId === area.id);
                    const completed = areaRespondents.filter((r: any) => r.status === "concluiu").length;
                    const total = areaRespondents.length;
                    
                    return (
                      <div key={area.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{area.name}</h4>
                          <Badge variant={completed === total && total > 0 ? "default" : "secondary"}>
                            {completed}/{total} concluídos
                          </Badge>
                        </div>
                        <Progress value={total > 0 ? (completed / total) * 100 : 0} className="h-2" />
                        {areaRespondents.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {areaRespondents.map((r: any) => (
                              <div key={r.id} className="flex items-center gap-2 text-sm">
                                {r.status === "concluiu" ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : r.status === "em_andamento" ? (
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-gray-400" />
                                )}
                                <span>{r.name}</span>
                                <span className="text-muted-foreground">({r.email})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma entrevista em andamento.</p>
                  <p className="text-sm">Cadastre responsáveis na Fase 1 para iniciar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plano de Ação Tab */}
        <TabsContent value="acoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Plano de Ação
              </CardTitle>
              <CardDescription>
                Ações de mitigação de riscos identificados no mapeamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionPlans && actionPlans.length > 0 ? (
                <div className="space-y-4">
                  {actionPlans.map((action: any) => (
                    <div 
                      key={action.id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-light">{action.title}</h4>
                          <p className="body-small font-extralight mt-1">{action.description}</p>
                        </div>
                        <Badge variant={
                          action.priority === "critica" ? "destructive" :
                          action.priority === "alta" ? "destructive" :
                          action.priority === "media" ? "secondary" : "outline"
                        }>
                          {action.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-3 body-small">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Prazo: {action.dueDate ? new Date(action.dueDate).toLocaleDateString("pt-BR") : "Não definido"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          Responsável: {action.assigneeRole || "Não atribuído"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma ação pendente.</p>
                  <p className="text-sm">As ações serão geradas automaticamente após as entrevistas.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


function DelegacaoPremiumPanel({ organizationId, selectedAreaId, onPickSuggested, onPickSponsor, onCreateUser, areas }: any) {
  const utils = trpc.useUtils();
  // Buscar sugestões por área (quando área selecionada)
  const areaEnabled = !!organizationId && !!selectedAreaId;
  const q = trpc.orgSync.suggestDelegatesByArea.useQuery(
    { organizationId: organizationId!, areaId: selectedAreaId! },
    { enabled: areaEnabled }
  );
  // Buscar sponsor sempre (independente da área)
  const sponsorQ = trpc.orgSync.getProfile.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId }
  );
  const createM = trpc.orgSync.createUserQuick.useMutation({
    onSuccess: () => {
      // Invalidar cache para que o novo usuário apareça imediatamente
      if (areaEnabled) {
        utils.orgSync.suggestDelegatesByArea.invalidate({ organizationId: organizationId!, areaId: selectedAreaId! });
      }
      utils.user.listByOrganization.invalidate();
    },
  });

  const sponsor = q.data?.sponsor || sponsorQ.data?.sponsor;
  const suggested = q.data?.suggested || [];

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [newUserAreaId, setNewUserAreaId] = React.useState<number | null>(selectedAreaId || null);

  // Atualizar área padrão quando a área selecionada mudar
  React.useEffect(() => {
    if (selectedAreaId) setNewUserAreaId(selectedAreaId);
  }, [selectedAreaId]);

  const create = async () => {
    if (!organizationId || !name || !email) return;
    try {
      const res = await createM.mutateAsync({ organizationId, areaId: newUserAreaId, name, email, role: 'client_user' });
      onCreateUser(res.user);
      setOpen(false);
      setName('');
      setEmail('');
      sonnerToast.success('Usuário criado com sucesso! Um e-mail de boas-vindas foi enviado.');
    } catch (e: any) {
      sonnerToast.error(e.message || 'Erro ao criar usuário');
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="font-medium">Sugestões automáticas</div>
          <div className="text-sm text-muted-foreground">
            Selecione um usuário sugerido para preencher automaticamente. Se não houver, delegue ao responsável principal ou crie um usuário agora.
          </div>
        </div>
        <div className="flex gap-2">
          {sponsor ? (
            <Button type="button" variant="secondary" onClick={() => onPickSponsor(sponsor)}>
              Delegar ao Responsável Principal
            </Button>
          ) : null}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button">+ Criar Usuário</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Criar novo usuário</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nome *</Label>
                  <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-1">
                  <Label>E-mail *</Label>
                  <Input value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="email@empresa.com" />
                </div>
                {areas && areas.length > 0 && (
                  <div className="space-y-1">
                    <Label>Área</Label>
                    <Select value={newUserAreaId ? String(newUserAreaId) : ''} onValueChange={(v) => setNewUserAreaId(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Selecione a área" /></SelectTrigger>
                      <SelectContent>
                        {areas.map((a: any) => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="button" onClick={create} disabled={!name || !email || createM.isPending}>
                    {createM.isPending ? 'Criando...' : 'Criar e Enviar Convite'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {suggested.length > 0 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {suggested.map((u: any) => (
            <button
              key={u.id}
              type="button"
              className="p-3 rounded-lg border bg-background text-left hover:bg-muted/40 transition-colors"
              onClick={() => onPickSuggested(u)}
            >
              <div className="font-medium text-sm">{u.name}</div>
              <div className="text-xs text-muted-foreground">{u.email} • {u.role}</div>
            </button>
          ))}
        </div>
      )}

      {!suggested.length && areaEnabled && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Nenhum usuário cadastrado nessa área.{sponsor ? ' Você pode delegar ao responsável principal ou criar um usuário agora.' : ' Crie um usuário agora para continuar.'}
        </div>
      )}

      {!selectedAreaId && (
        <div className="mt-3 text-sm text-muted-foreground">
          Selecione uma área acima para ver sugestões de usuários.{sponsor ? ' Enquanto isso, você pode delegar ao responsável principal.' : ''}
        </div>
      )}
    </div>
  );
}
