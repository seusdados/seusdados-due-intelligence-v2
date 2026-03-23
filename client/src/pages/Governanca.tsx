// client/src/pages/Governanca.tsx
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Settings,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  FileText,
  Target,
  TrendingUp,
  Building2,
  Plus,
  ChevronRight,
  Video,
  CalendarDays,
  ListTodo,
  BarChart3,
  Package,
  UserCheck,
  UserX,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";
import { DynamicBreadcrumbs } from "@/components/DynamicBreadcrumbs";
import { PlanoCPPDContinuoTab } from "@/components/PlanoCPPDContinuoTab";
import { PageHeader } from "@/components/PageHeader";
import { KPICards, KPICardData } from "@/components/KPICards";

const CURRENT_YEAR = new Date().getFullYear();

// Componente para a tab de Presenças
function PresencasTab({ organizationId, year }: { organizationId: number; year: number }) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [showJustificationDialog, setShowJustificationDialog] = useState(false);
  const [justificationText, setJustificationText] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);

  // Buscar relatório de presenças
  const { data: attendanceReport, isLoading: loadingReport } = trpc.governanca.attendanceReport.useQuery(
    { organizationId, year },
    { enabled: !!organizationId }
  );

  // Buscar reuniões do ano
  const { data: overview } = trpc.governanca.overview.useQuery(
    { organizationId, year },
    { enabled: !!organizationId }
  );

  // Buscar participantes da reunião selecionada
  const { data: participants, refetch: refetchParticipants } = trpc.governanca.listMeetingParticipants.useQuery(
    { organizationId, meetingId: selectedMeetingId! },
    { enabled: !!selectedMeetingId }
  );

  // Mutation para atualizar presença
  const updateAttendance = trpc.governanca.updateParticipantAttendance.useMutation({
    onSuccess: () => {
      toast.success('Presença atualizada com sucesso!');
      refetchParticipants();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Mutation para verificar baixa presença e enviar notificações
  const checkLowAttendance = trpc.governanca.checkLowAttendance.useMutation({
    onSuccess: (data) => {
      if (data.lowAttendanceUsers.length > 0) {
        toast.warning(`Encontrados ${data.lowAttendanceUsers.length} membro(s) com baixa presença`);
        if (data.notificationsSent > 0) {
          toast.success('Notificação enviada ao administrador');
        }
      } else {
        toast.success('Todos os membros estão com presença adequada!');
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Mutation para enviar alerta individual
  const sendLowAttendanceAlert = trpc.governanca.sendLowAttendanceAlert.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleUpdateAttendance = (participantId: number, status: 'presente' | 'ausente' | 'justificado') => {
    if (!selectedMeetingId) return;
    
    if (status === 'justificado') {
      setSelectedParticipantId(participantId);
      setShowJustificationDialog(true);
      return;
    }

    updateAttendance.mutate({
      organizationId,
      meetingId: selectedMeetingId,
      participantId,
      attendanceStatus: status,
      joinTime: status === 'presente' ? new Date().toISOString() : undefined,
    });
  };

  const handleJustification = () => {
    if (!selectedMeetingId || !selectedParticipantId) return;
    
    updateAttendance.mutate({
      organizationId,
      meetingId: selectedMeetingId,
      participantId: selectedParticipantId,
      attendanceStatus: 'justificado',
      notes: justificationText,
    });
    
    setShowJustificationDialog(false);
    setJustificationText('');
    setSelectedParticipantId(null);
  };

  // Calcular estatísticas de presença
  const presenceStats = useMemo(() => {
    if (!attendanceReport || !Array.isArray(attendanceReport)) return { total: 0, presentes: 0, ausentes: 0, justificados: 0, taxa: 0 };
    
    const total = attendanceReport.length;
    const presentes = attendanceReport.filter((r: any) => r.attendanceStatus === 'presente').length;
    const ausentes = attendanceReport.filter((r: any) => r.attendanceStatus === 'ausente').length;
    const justificados = attendanceReport.filter((r: any) => r.attendanceStatus === 'justificado').length;
    const taxa = total > 0 ? Math.round((presentes / total) * 100) : 0;
    
    return { total, presentes, ausentes, justificados, taxa };
  }, [attendanceReport]);

  // Agrupar presenças por usuário
  const presenceByUser = useMemo(() => {
    if (!attendanceReport || !Array.isArray(attendanceReport)) return [];
    
    const userMap = new Map<number, { name: string; email: string; total: number; presentes: number; ausentes: number; justificados: number }>();
    
    attendanceReport.forEach((record: any) => {
      const userId = record.userId;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          name: record.nameSnapshot || 'Usuário',
          email: record.emailSnapshot || '',
          total: 0,
          presentes: 0,
          ausentes: 0,
          justificados: 0,
        });
      }
      const user = userMap.get(userId)!;
      user.total++;
      if (record.attendanceStatus === 'presente') user.presentes++;
      else if (record.attendanceStatus === 'ausente') user.ausentes++;
      else if (record.attendanceStatus === 'justificado') user.justificados++;
    });
    
    return Array.from(userMap.values()).sort((a, b) => {
      const taxaA = a.total > 0 ? a.presentes / a.total : 0;
      const taxaB = b.total > 0 ? b.presentes / b.total : 0;
      return taxaB - taxaA;
    });
  }, [attendanceReport]);

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="body-small">Taxa de Presença</p>
                <p className="text-2xl font-bold text-green-600">{presenceStats.taxa}%</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="body-small">Presenças</p>
                <p className="text-2xl font-bold">{presenceStats.presentes}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="body-small">Ausências</p>
                <p className="text-2xl font-bold text-red-600">{presenceStats.ausentes}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="body-small">Justificadas</p>
                <p className="text-2xl font-bold text-amber-600">{presenceStats.justificados}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registro de Presença por Reunião */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Registro de Presença
              </CardTitle>
              <CardDescription>
                Selecione uma reunião para registrar presenças
              </CardDescription>
            </div>
            <Select value={selectedMeetingId?.toString() || ''} onValueChange={(v) => setSelectedMeetingId(Number(v))}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Selecione uma reunião" />
              </SelectTrigger>
              <SelectContent>
                {overview?.meetings?.map((meeting: any) => (
                  <SelectItem key={meeting.id} value={meeting.id.toString()}>
                    Reunião #{meeting.sequence} - {new Date(meeting.date).toLocaleDateString('pt-BR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedMeetingId ? (
            participants && participants.length > 0 ? (
              <div className="space-y-3">
                {participants.map((participant: any) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      participant.attendanceStatus === 'presente'
                        ? 'bg-green-50 border-green-200'
                        : participant.attendanceStatus === 'ausente'
                        ? 'bg-red-50 border-red-200'
                        : participant.attendanceStatus === 'justificado'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        participant.attendanceStatus === 'presente'
                          ? 'bg-green-500 text-white'
                          : participant.attendanceStatus === 'ausente'
                          ? 'bg-red-500 text-white'
                          : participant.attendanceStatus === 'justificado'
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {participant.nameSnapshot?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium">{participant.nameSnapshot}</p>
                        <p className="body-small">{participant.role} • {participant.emailSnapshot}</p>
                        {participant.notes && (
                          <p className="text-xs text-amber-600 mt-1">
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            {participant.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={participant.attendanceStatus === 'presente' ? 'default' : 
                                participant.attendanceStatus === 'ausente' ? 'destructive' :
                                participant.attendanceStatus === 'justificado' ? 'secondary' : 'outline'}
                      >
                        {participant.attendanceStatus === 'presente' ? 'Presente' :
                         participant.attendanceStatus === 'ausente' ? 'Ausente' :
                         participant.attendanceStatus === 'justificado' ? 'Justificado' : 'Não Confirmado'}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={participant.attendanceStatus === 'presente' ? 'default' : 'outline'}
                          className={participant.attendanceStatus === 'presente' ? 'bg-green-600 hover:bg-green-700' : ''}
                          onClick={() => handleUpdateAttendance(participant.id, 'presente')}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={participant.attendanceStatus === 'ausente' ? 'destructive' : 'outline'}
                          onClick={() => handleUpdateAttendance(participant.id, 'ausente')}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={participant.attendanceStatus === 'justificado' ? 'secondary' : 'outline'}
                          onClick={() => handleUpdateAttendance(participant.id, 'justificado')}
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum participante cadastrado para esta reunião
              </p>
            )
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Selecione uma reunião para visualizar e registrar presenças
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ranking de Presenças por Usuário */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ranking de Presenças por Membro
              </CardTitle>
              <CardDescription>
                Taxa de presença de cada membro do CPPD em {year}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkLowAttendance.mutate({ organizationId, year, threshold: 70 })}
              disabled={checkLowAttendance.isPending}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              {checkLowAttendance.isPending ? 'Verificando...' : 'Verificar Baixa Presença'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {presenceByUser.length > 0 ? (
            <div className="space-y-3">
              {presenceByUser.map((user, index) => {
                const taxa = user.total > 0 ? Math.round((user.presentes / user.total) * 100) : 0;
                const isLowAttendance = taxa < 70;
                
                return (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name}</p>
                        {isLowAttendance && (
                          <Badge variant="destructive" className="text-xs">
                            Baixa Presença
                          </Badge>
                        )}
                      </div>
                      <p className="body-small">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isLowAttendance ? 'text-red-600' : 'text-green-600'}`}>
                        {taxa}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.presentes}/{user.total} reuniões
                      </p>
                    </div>
                    <div className="w-24">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${isLowAttendance ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${taxa}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhum registro de presença encontrado para {year}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Justificativa */}
      <Dialog open={showJustificationDialog} onOpenChange={setShowJustificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justificativa de Ausência</DialogTitle>
            <DialogDescription>
              Informe o motivo da ausência do participante
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={justificationText}
              onChange={(e) => setJustificationText(e.target.value)}
              placeholder="Digite a justificativa..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJustificationDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleJustification} disabled={!justificationText.trim()}>
              Salvar Justificativa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para a tab de Planos Mensais
function PlanosMensaisTab({ organizationId, year }: { organizationId: number; year: number }) {
  const [, navigate] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");

  // Buscar templates disponíveis
  const { data: templates } = trpc.governanca.listPlanoAnualTemplates.useQuery();

  // Buscar planos da organização
  const { data: planos, refetch } = trpc.governanca.listPlanosAnuaisOrganizacao.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  // Mutation para criar plano
  const createPlano = trpc.governanca.instanciarPlanoAnual.useMutation({
    onSuccess: (result) => {
      toast.success(`Plano criado com ${result.mesesCriados} meses!`);
      setShowCreateDialog(false);
      refetch();
      navigate(`/governanca/plano/${result.planoId}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleCreatePlano = () => {
    if (!selectedTemplateId || !startDate) {
      toast.error("Selecione um template e data de início");
      return;
    }
    createPlano.mutate({
      organizationId,
      templateId: selectedTemplateId,
      year,
      startDate,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Planos de Atividades Mensais</CardTitle>
              <CardDescription>
                Gerencie os planos de atividades e entregáveis mensais do programa de governança
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Plano
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Plano de Atividades</DialogTitle>
                  <DialogDescription>
                    Selecione o modelo e a data de início do programa
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Modelo do Programa</Label>
                    <Select
                      value={selectedTemplateId?.toString() || ""}
                      onValueChange={(v) => setSelectedTemplateId(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((t: any) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreatePlano} disabled={createPlano.isPending}>
                    {createPlano.isPending ? "Criando..." : "Criar Plano"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {planos && planos.length > 0 ? (
            <div className="space-y-3">
              {planos.map((plano: any) => (
                <div
                  key={plano.id}
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/governanca/plano/${plano.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{plano.templateLabel}</h4>
                      <p className="body-small">
                        {plano.year} • Início: {new Date(plano.startDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        plano.status === "em_execucao"
                          ? "default"
                          : plano.status === "concluido"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {plano.status === "planejado"
                        ? "Planejado"
                        : plano.status === "em_execucao"
                        ? "Em Execução"
                        : plano.status === "concluido"
                        ? "Concluído"
                        : "Pausado"}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhum plano de atividades criado ainda.
              </p>
              <p className="body-small">
                Crie um plano para acompanhar as atividades e entregáveis mensais do programa de governança.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface GovernancaProps {
  initialTab?: string;
  showCreateDialog?: boolean;
}

export default function Governanca({ initialTab, showCreateDialog: initialShowCreateDialog }: GovernancaProps = {}) {
  const { user } = useAuth();
  const { selectedOrganization, isOrganizationRequired } = useOrganization();
  const [, navigate] = useLocation();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [showConfigDialog, setShowConfigDialog] = useState(initialShowCreateDialog || false);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  
  // Usar a organização do contexto global (selecionada no sidebar)
  const selectedOrgId = selectedOrganization?.id ?? user?.organizationId ?? null;

  // Buscar organizações para admin/consultor
  const { data: organizations } = trpc.organization.list.useQuery(undefined, {
    enabled: user?.role === "admin_global" || user?.role === "consultor",
  });

  // Buscar visão geral do ano
  const { data: overview, isLoading, refetch } = trpc.governanca.overview.useQuery(
    { organizationId: selectedOrgId!, year: selectedYear },
    { enabled: !!selectedOrgId }
  );

  // Mutation para configurar CPPD
  const configureMutation = trpc.governanca.configureCppd.useMutation({
    onSuccess: () => {
      toast.success("CPPD configurado com sucesso! Reuniões geradas.");
      setShowConfigDialog(false);
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Form state para configuração
  const [configForm, setConfigForm] = useState({
    programType: "ano1" as "ano1" | "em_curso",
    regime: "mensal" as "quinzenal" | "mensal" | "bimestral",
    dayOfWeek: "quinta" as "domingo" | "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado",
    time: "14:00",
    meetingLocationType: "teams" as "teams" | "meet" | "outlook" | "google" | "outro",
    defaultMeetingUrl: "",
    secretariatModel: "seusdados" as "seusdados" | "grupo" | "cliente",
    secretariatProviderName: "",
  });

  // Capabilities do usuário (vem do overview)
  const capabilities = overview?.capabilities;
  const secretariat = overview?.secretariat;

  const handleConfigSubmit = () => {
    if (!selectedOrgId) return;
    configureMutation.mutate({
      organizationId: selectedOrgId,
      year: selectedYear,
      ...configForm,
    });
  };

  // Estatísticas das reuniões
  const meetingStats = useMemo(() => {
    if (!overview?.meetings) return { total: 0, realizadas: 0, pendentes: 0, proxima: null };
    const meetings = overview.meetings;
    const realizadas = meetings.filter((m: any) => m.status === "realizada").length;
    const pendentes = meetings.filter((m: any) => m.status === "agendada").length;
    const proxima = meetings.find((m: any) => m.status === "agendada" && new Date(m.date) >= new Date());
    return { total: meetings.length, realizadas, pendentes, proxima };
  }, [overview?.meetings]);

  // Estatísticas das ações
  const actionStats = useMemo(() => {
    if (!overview?.openActions) return { abertas: 0, emAndamento: 0, atrasadas: 0 };
    const actions = overview.openActions;
    const abertas = actions.filter((a: any) => a.status === "aberta").length;
    const emAndamento = actions.filter((a: any) => a.status === "em_andamento").length;
    const atrasadas = actions.filter((a: any) => a.dueDate && new Date(a.dueDate) < new Date()).length;
    return { abertas, emAndamento, atrasadas };
  }, [overview?.openActions]);

  // Progresso do programa
  const programProgress = useMemo(() => {
    if (!overview?.milestones || overview.milestones.length === 0) return 0;
    const completed = overview.milestones.filter((m: any) => m.isCompleted).length;
    return Math.round((completed / overview.milestones.length) * 100);
  }, [overview?.milestones]);

  // Se não há organização selecionada e é necessário, mostrar mensagem
  if (!selectedOrgId && isOrganizationRequired) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Governança PPPD</h1>
            <p className="text-muted-foreground">Selecione uma organização no menu lateral para continuar</p>
          </div>
        </div>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Organização Não Selecionada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Use o seletor de organização no menu lateral esquerdo para escolher a organização que deseja gerenciar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <DynamicBreadcrumbs />
      {/* Header - Usando componente PageHeader padronizado */}
      <PageHeader
        title="Governança PPPD"
        subtitle="Comitê de Privacidade e Proteção de Dados"
        icon={Building2}
        showBack={false}
        showDPOButton={true}
        dpoContext={{
          module: "Governança PPPD",
          page: "Comitê de Privacidade"
        }}
        actions={
          <div className="flex items-center gap-3">
            {/* Organização selecionada no sidebar */}
            {selectedOrganization && (
              <Badge variant="outline" className="px-3 py-1">
                <Building2 className="h-3 w-3 mr-1" />
                {selectedOrganization.name}
              </Badge>
            )}

            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

          {!overview?.cppdConfig && (
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar CPPD
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Configurar CPPD - {selectedYear}</DialogTitle>
                  <DialogDescription>
                    Configure o regime de reuniões e gere automaticamente o calendário anual.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Programa</Label>
                    <Select
                      value={configForm.programType}
                      onValueChange={(v: "ano1" | "em_curso") =>
                        setConfigForm({ ...configForm, programType: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ano1">Ano 1 - Implementação (10 fases)</SelectItem>
                        <SelectItem value="em_curso">Em Curso - Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Regime de Reuniões</Label>
                    <Select
                      value={configForm.regime}
                      onValueChange={(v: "quinzenal" | "mensal" | "bimestral") =>
                        setConfigForm({ ...configForm, regime: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quinzenal">Quinzenal (24 reuniões/ano)</SelectItem>
                        <SelectItem value="mensal">Mensal (12 reuniões/ano)</SelectItem>
                        <SelectItem value="bimestral">Bimestral (6 reuniões/ano)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dia da Semana</Label>
                      <Select
                        value={configForm.dayOfWeek}
                        onValueChange={(v: "domingo" | "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado") => setConfigForm({ ...configForm, dayOfWeek: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="segunda">Segunda-feira</SelectItem>
                          <SelectItem value="terca">Terça-feira</SelectItem>
                          <SelectItem value="quarta">Quarta-feira</SelectItem>
                          <SelectItem value="quinta">Quinta-feira</SelectItem>
                          <SelectItem value="sexta">Sexta-feira</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Horário</Label>
                      <Input
                        type="time"
                        value={configForm.time}
                        onChange={(e) => setConfigForm({ ...configForm, time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Plataforma de Reunião</Label>
                    <Select
                      value={configForm.meetingLocationType}
                      onValueChange={(v: "teams" | "meet" | "outlook" | "google" | "outro") => setConfigForm({ ...configForm, meetingLocationType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                        <SelectItem value="meet">Google Meet</SelectItem>
                        <SelectItem value="outlook">Outlook</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>URL Padrão da Reunião (opcional)</Label>
                    <Input
                      placeholder="https://teams.microsoft.com/..."
                      value={configForm.defaultMeetingUrl}
                      onChange={(e) => setConfigForm({ ...configForm, defaultMeetingUrl: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label className="font-semibold">Secretaria do CPPD</Label>
                    <p className="text-xs text-muted-foreground">Quem será responsável por operar o comitê (agendar reuniões, gerar atas, enviar convites).</p>
                    <Select
                      value={configForm.secretariatModel}
                      onValueChange={(v: "seusdados" | "grupo" | "cliente") =>
                        setConfigForm({ ...configForm, secretariatModel: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seusdados">Seusdados (consultoria)</SelectItem>
                        <SelectItem value="grupo">Empresa do grupo</SelectItem>
                        <SelectItem value="cliente">Própria organização (secretaria interna)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {configForm.secretariatModel === "grupo" && (
                    <div className="space-y-2">
                      <Label>Nome da empresa do grupo (opcional)</Label>
                      <Input
                        placeholder="Nome da empresa..."
                        value={configForm.secretariatProviderName}
                        onChange={(e) => setConfigForm({ ...configForm, secretariatProviderName: e.target.value })}
                      />
                    </div>
                  )}

                  {configForm.secretariatModel === "cliente" && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Quando a secretaria é interna, o coordenador e o secretário do CPPD terão permissão para operar o comitê (agendar reuniões, gerar atas, enviar convites, etc).
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleConfigSubmit} disabled={configureMutation.isPending}>
                    {configureMutation.isPending ? "Configurando..." : "Configurar e Gerar Reuniões"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
             )}
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !overview?.cppdConfig ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">CPPD não configurado para {selectedYear}</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Configure o Comitê de Privacidade e Proteção de Dados para gerar automaticamente
              o calendário de reuniões e acompanhar o programa de governança.
            </p>
            <Button onClick={() => setShowConfigDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Configurar CPPD
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Card de Secretaria do CPPD */}
          {secretariat && (
            <Card className="border-l-4 border-l-indigo-500">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-indigo-500" />
                  <div>
                    <span className="text-sm font-medium">Secretaria do CPPD: </span>
                    <Badge variant="outline" className="ml-1">
                      {secretariat.model === 'seusdados' ? 'Seusdados (consultoria)' :
                       secretariat.model === 'grupo' ? `Empresa do grupo${secretariat.providerName ? ` - ${secretariat.providerName}` : ''}` :
                       'Própria organização (interna)'}
                    </Badge>
                  </div>
                </div>
                {!capabilities?.canConfigureCppd && (
                  <Badge variant="secondary" className="text-xs">
                    Somente visualização
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats Cards - Usando componente KPICards padronizado */}
          <KPICards
            columns={4}
            cards={[
              {
                title: `Reuniões ${selectedYear}`,
                value: `${meetingStats.realizadas}/${meetingStats.total}`,
                subtitle: `${meetingStats.pendentes} pendentes`,
                icon: Calendar,
                color: "violet"
              },
              {
                title: "Progresso do Programa",
                value: `${programProgress}%`,
                subtitle: "Marcos concluídos",
                icon: TrendingUp,
                color: "purple"
              },
              {
                title: "Ações Abertas",
                value: actionStats.abertas + actionStats.emAndamento,
                subtitle: actionStats.atrasadas > 0 ? `${actionStats.atrasadas} atrasadas` : "Em dia",
                icon: ListTodo,
                color: actionStats.atrasadas > 0 ? "amber" : "emerald"
              },
              {
                title: "Próxima Reunião",
                value: meetingStats.proxima 
                  ? new Date(meetingStats.proxima.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                  : "--",
                subtitle: meetingStats.proxima?.agendaTitle || "Nenhuma agendada",
                icon: CalendarDays,
                color: "blue"
              }
            ] as KPICardData[]}
          />



          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="border-b">
              <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
                <TabsTrigger 
                  value="calendario" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendário</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="programa" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Programa</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="acoes" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <ListTodo className="h-4 w-4" />
                  <span className="hidden sm:inline">Ações</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="membros" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Membros</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="planos" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Planos</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="cppd-continuo" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">CPPD Contínuo</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="presencas" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Presenças</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Calendário */}
            <TabsContent value="calendario" className="space-y-4">
              <div className="grid gap-4">
                {overview.meetings?.map((meeting: any, index: number) => (
                  <Card
                    key={meeting.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      meeting.status === "realizada" ? "opacity-70" : ""
                    }`}
                    onClick={() => navigate(`/governanca/reuniao/${meeting.id}?org=${selectedOrgId}`)}
                  >
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                          <span className="text-xs font-medium">
                            {new Date(meeting.date).toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()}
                          </span>
                          <span className="text-xl font-bold">
                            {new Date(meeting.date).getDate()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              Reunião #{meeting.sequence}
                            </h3>
                            <Badge
                              variant={
                                meeting.status === "realizada"
                                  ? "default"
                                  : meeting.status === "agendada"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {meeting.status === "realizada" ? "Realizada" : "Agendada"}
                            </Badge>
                          </div>
                          <p className="body-small">
                            {meeting.agendaTitle || "Pauta a definir"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(meeting.date).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} • {meeting.durationMinutes} min
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {meeting.status === "agendada" && new Date(meeting.date) <= new Date() && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <Play className="h-4 w-4 mr-1" />
                            Iniciar
                          </Button>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tab Programa */}
            <TabsContent value="programa" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Programa de Governança - {overview.cppdConfig?.programType === "ano1" ? "Ano 1 (Implementação)" : "Em Curso"}</CardTitle>
                  <CardDescription>
                    Acompanhe o progresso das fases e marcos do programa de privacidade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {overview.phases?.length > 0 ? (
                    <div className="space-y-4">
                      {overview.phases.map((phase: any) => (
                        <div key={phase.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Fase {phase.phaseNumber}</Badge>
                              <h4 className="font-medium">{phase.name}</h4>
                            </div>
                            <Badge
                              variant={
                                phase.status === "concluida"
                                  ? "default"
                                  : phase.status === "em_andamento"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {phase.status === "concluida" ? "Concluída" : phase.status === "em_andamento" ? "Em Andamento" : "Pendente"}
                            </Badge>
                          </div>
                          <p className="body-small">{phase.theme}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {phase.quarter} • Meses {phase.startMonth}-{phase.endMonth}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhuma fase configurada ainda
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Ações */}
            <TabsContent value="acoes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ações Pendentes</CardTitle>
                  <CardDescription>
                    Tarefas e deliberações das reuniões do CPPD
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {overview.openActions?.length > 0 ? (
                    <div className="space-y-3">
                      {overview.openActions.map((action: any) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                action.priority === "critica"
                                  ? "bg-red-500"
                                  : action.priority === "alta"
                                  ? "bg-orange-500"
                                  : action.priority === "media"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                            />
                            <div>
                              <p className="font-medium">{action.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {action.dueDate
                                  ? `Prazo: ${new Date(action.dueDate).toLocaleDateString("pt-BR")}`
                                  : "Sem prazo definido"}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              action.status === "em_andamento" ? "secondary" : "outline"
                            }
                          >
                            {action.status === "em_andamento" ? "Em Andamento" : "Aberta"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhuma ação pendente
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Membros */}
            <TabsContent value="membros" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Membros do CPPD</CardTitle>
                      <CardDescription>
                        Composição do Comitê de Privacidade e Proteção de Dados
                      </CardDescription>
                    </div>
                    {capabilities?.canManageMembers && (
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Membro
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum membro cadastrado ainda. Adicione os membros do comitê.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Planos Mensais */}
            <TabsContent value="planos" className="space-y-4">
              <PlanosMensaisTab organizationId={selectedOrgId!} year={selectedYear} />
            </TabsContent>

            {/* Tab Plano CPPD Contínuo */}
            <TabsContent value="cppd-continuo" className="space-y-6">
              {selectedOrganization && (
                <PlanoCPPDContinuoTab
                  organizationId={selectedOrganization.id}
                  selectedYear={selectedYear}
                />
              )}
            </TabsContent>

            {/* Tab Presenças */}
            <TabsContent value="presencas" className="space-y-4">
              <PresencasTab organizationId={selectedOrgId!} year={selectedYear} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
