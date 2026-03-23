import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  ArrowLeft, Play, Pause, Square, Clock, Users, FileText, 
  CheckCircle2, Circle, Plus, Save, Download, Send, 
  Calendar, Timer, MessageSquare, ClipboardList, UserCheck
} from "lucide-react";

interface AgendaItem {
  id: number;
  title: string;
  description: string;
  duration: number;
  status: 'pending' | 'in_progress' | 'completed';
  notes: string;
  decisions: string[];
  elapsedTime: number;
}

interface Participant {
  id: number;
  name: string;
  role: string;
  email: string;
  present: boolean;
  arrivedAt?: string;
}

interface ActionItem {
  id: number;
  title: string;
  responsible: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
}

export default function GovernancaMeetingRoom() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Extrair organizationId da query string ou do user
  const orgIdFromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('org') : null;
  const orgId = orgIdFromUrl ? Number(orgIdFromUrl) : user?.organizationId;

  // Buscar capabilities do usuário para esta organização
  const { data: capabilities } = trpc.governanca.getMyCapabilities.useQuery(
    { organizationId: orgId! },
    { enabled: !!orgId }
  );

  // Buscar dados reais da reunião via meetingRoom endpoint
  const { data: meetingData } = trpc.governanca.meetingRoom.useQuery(
    { organizationId: orgId!, meetingId: Number(id) },
    { enabled: !!orgId && !!id }
  );
  
  // Meeting state
  const [meetingStatus, setMeetingStatus] = useState<'not_started' | 'in_progress' | 'paused' | 'finished'>('not_started');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [totalElapsed, setTotalElapsed] = useState(0);
  
  // Current agenda item
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [itemTimer, setItemTimer] = useState(0);
  const [isItemTimerRunning, setIsItemTimerRunning] = useState(false);
  
  // Agenda items
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    { id: 1, title: "Abertura e Verificação de Quórum", description: "Verificar presença dos membros e declarar abertura da reunião", duration: 5, status: 'pending', notes: '', decisions: [], elapsedTime: 0 },
    { id: 2, title: "Aprovação da Ata Anterior", description: "Leitura e aprovação da ata da reunião anterior", duration: 10, status: 'pending', notes: '', decisions: [], elapsedTime: 0 },
    { id: 3, title: "Informes e Comunicações", description: "Informes gerais sobre privacidade e proteção de dados", duration: 15, status: 'pending', notes: '', decisions: [], elapsedTime: 0 },
    { id: 4, title: "Análise de Incidentes", description: "Revisão de incidentes de segurança e privacidade do período", duration: 20, status: 'pending', notes: '', decisions: [], elapsedTime: 0 },
    { id: 5, title: "Status do Programa de Conformidade", description: "Acompanhamento das fases do programa de implementação", duration: 15, status: 'pending', notes: '', decisions: [], elapsedTime: 0 },
    { id: 6, title: "Deliberações e Votações", description: "Itens que requerem decisão do comitê", duration: 20, status: 'pending', notes: '', decisions: [], elapsedTime: 0 },
    { id: 7, title: "Encerramento", description: "Definição de próximos passos e encerramento", duration: 5, status: 'pending', notes: '', decisions: [], elapsedTime: 0 },
  ]);
  
  // Participants - inicializa vazio, carrega do backend
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoaded, setParticipantsLoaded] = useState(false);

  // Carregar participantes reais do meetingData quando disponível
  useEffect(() => {
    if (meetingData?.participants && !participantsLoaded) {
      const realParticipants = meetingData.participants.map((p: any) => ({
        id: p.id || p.memberId,
        name: p.name || p.memberName || 'Participante',
        role: p.role || p.memberRole || p.roleInCommittee || 'membro',
        email: p.email || '',
        present: p.present || p.attended || false,
        arrivedAt: p.arrivedAt || undefined,
      }));
      if (realParticipants.length > 0) {
        setParticipants(realParticipants);
        setParticipantsLoaded(true);
      }
    }
  }, [meetingData?.participants, participantsLoaded]);
  
  // Action items
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newActionItem, setNewActionItem] = useState<{ title: string; responsible: string; dueDate: string; priority: 'low' | 'medium' | 'high' | 'critical' }>({ title: '', responsible: '', dueDate: '', priority: 'medium' });
  
  // Dialogs
  const [showNewActionDialog, setShowNewActionDialog] = useState(false);
  const [showGenerateMinutesDialog, setShowGenerateMinutesDialog] = useState(false);
  const [generatedMinutes, setGeneratedMinutes] = useState('');
  const [isGeneratingMinutes, setIsGeneratingMinutes] = useState(false);
  
  // Notes for current item
  const [currentNotes, setCurrentNotes] = useState('');
  const [currentDecision, setCurrentDecision] = useState('');
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (meetingStatus === 'in_progress') {
      interval = setInterval(() => {
        setTotalElapsed(prev => prev + 1);
        if (isItemTimerRunning) {
          setItemTimer(prev => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meetingStatus, isItemTimerRunning]);
  
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startMeeting = () => {
    setMeetingStatus('in_progress');
    setStartTime(new Date());
    setIsItemTimerRunning(true);
    setAgendaItems(prev => prev.map((item, idx) => 
      idx === 0 ? { ...item, status: 'in_progress' } : item
    ));
    toast.success("Reunião iniciada!");
  };
  
  const pauseMeeting = () => {
    setMeetingStatus('paused');
    setIsItemTimerRunning(false);
    toast.info("Reunião pausada");
  };
  
  const resumeMeeting = () => {
    setMeetingStatus('in_progress');
    setIsItemTimerRunning(true);
    toast.info("Reunião retomada");
  };
  
  const finishMeeting = () => {
    setMeetingStatus('finished');
    setIsItemTimerRunning(false);
    // Mark all remaining items as completed
    setAgendaItems(prev => prev.map(item => ({ ...item, status: 'completed' })));
    toast.success("Reunião finalizada!");
    setShowGenerateMinutesDialog(true);
  };
  
  const nextAgendaItem = () => {
    // Save current item notes and time
    setAgendaItems(prev => prev.map((item, idx) => {
      if (idx === currentItemIndex) {
        return { ...item, status: 'completed', notes: currentNotes, elapsedTime: itemTimer };
      }
      if (idx === currentItemIndex + 1) {
        return { ...item, status: 'in_progress' };
      }
      return item;
    }));
    
    setCurrentItemIndex(prev => Math.min(prev + 1, agendaItems.length - 1));
    setItemTimer(0);
    setCurrentNotes('');
    setCurrentDecision('');
  };
  
  const toggleParticipantPresence = (participantId: number) => {
    setParticipants(prev => prev.map(p => {
      if (p.id === participantId) {
        return { 
          ...p, 
          present: !p.present,
          arrivedAt: !p.present ? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined
        };
      }
      return p;
    }));
  };
  
  const addDecision = () => {
    if (!currentDecision.trim()) return;
    setAgendaItems(prev => prev.map((item, idx) => {
      if (idx === currentItemIndex) {
        return { ...item, decisions: [...item.decisions, currentDecision] };
      }
      return item;
    }));
    setCurrentDecision('');
    toast.success("Deliberação registrada");
  };
  
  const addActionItem = () => {
    if (!newActionItem.title || !newActionItem.responsible) {
      toast.error("Preencha título e responsável");
      return;
    }
    setActionItems(prev => [...prev, {
      id: Date.now(),
      ...newActionItem,
      status: 'pending'
    }]);
    setNewActionItem({ title: '', responsible: '', dueDate: '', priority: 'medium' });
    setShowNewActionDialog(false);
    toast.success("Ação adicionada");
  };
  
  // ─── Ata: estado e mutações ───
  const [minutesStatus, setMinutesStatus] = useState<string>('nao_gerada');
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [selectedSigners, setSelectedSigners] = useState<number[]>([]);
  const [uploadingSignedDoc, setUploadingSignedDoc] = useState(false);
  const [invitesSending, setInvitesSending] = useState(false);
  const [invitesResult, setInvitesResult] = useState<{ sent: number; failed: string[] } | null>(null);

  const sendInvitesMutation = trpc.governanca.sendMeetingInvitations.useMutation({
    onSuccess: (data) => {
      setInvitesSending(false);
      const failedEmails = data.details?.filter((r) => !r.success).map((r) => r.email) || [];
      setInvitesResult({ sent: data.sent || 0, failed: failedEmails });
      if (failedEmails.length === 0) {
        toast.success(`${data.sent} convite(s) enviado(s) com sucesso`);
      } else {
        toast.warning(`${data.sent} enviado(s), ${failedEmails.length} falha(s)`);
      }
    },
    onError: (err) => {
      setInvitesSending(false);
      toast.error('Erro ao enviar convites: ' + err.message);
    },
  });

  const handleSendInvites = () => {
    if (!orgId || !id || invitesSending) return;
    setInvitesSending(true);
    setInvitesResult(null);
    sendInvitesMutation.mutate({
      organizationId: orgId,
      meetingId: Number(id),
    });
  };

  const generateMinutesMutation = trpc.governanca.generateMinutes.useMutation({
    onSuccess: (data) => {
      setGeneratedMinutes(data.minutes);
      setMinutesStatus('em_validacao');
      setIsGeneratingMinutes(false);
      toast.success('Ata gerada com sucesso');
    },
    onError: (err) => {
      setIsGeneratingMinutes(false);
      toast.error('Erro ao gerar ata: ' + err.message);
    },
  });

  const approveMinutesMutation = trpc.governanca.approveMinutes.useMutation({
    onSuccess: () => {
      setMinutesStatus('em_assinatura');
      toast.success('Ata aprovada e pronta para assinatura');
    },
    onError: (err) => toast.error('Erro ao aprovar ata: ' + err.message),
  });

  const storeInGedMutation = trpc.governanca.storeMinutesInGed.useMutation({
    onSuccess: (data) => {
      toast.success('Ata armazenada no GED');
    },
    onError: (err) => toast.error('Erro ao armazenar no GED: ' + err.message),
  });

  const sendForSignatureMutation = trpc.governanca.sendForSignature.useMutation({
    onSuccess: (data) => {
      setMinutesStatus('em_assinatura');
      setShowSignatureDialog(false);
      toast.success(data.message);
    },
    onError: (err) => toast.error('Erro ao enviar para assinatura: ' + err.message),
  });

  const uploadSignedMutation = trpc.governanca.uploadSignedDocument.useMutation({
    onSuccess: () => {
      setUploadingSignedDoc(false);
      toast.success('Documento assinado enviado com sucesso');
    },
    onError: (err) => {
      setUploadingSignedDoc(false);
      toast.error('Erro ao enviar documento: ' + err.message);
    },
  });

  const finalizeSignatureMutation = trpc.governanca.finalizeSignature.useMutation({
    onSuccess: () => {
      setMinutesStatus('assinada');
      toast.success('Processo de assinatura finalizado');
    },
    onError: (err) => toast.error('Erro ao finalizar: ' + err.message),
  });

  const generateMinutes = async () => {
    if (!orgId || !id) return;
    setIsGeneratingMinutes(true);
    
    generateMinutesMutation.mutate({
      organizationId: orgId,
      meetingId: Number(id),
      participants: participants.map(p => ({
        name: p.name,
        role: p.role,
        present: p.present,
        arrivedAt: p.arrivedAt,
      })),
      agendaItems: agendaItems.map(item => ({
        title: item.title,
        notes: item.notes,
        decisions: item.decisions,
        elapsedTime: item.elapsedTime,
      })),
      actionItems: actionItems.map(a => ({
        title: a.title,
        responsible: a.responsible,
        dueDate: a.dueDate || undefined,
        priority: a.priority,
      })),
      totalDuration: totalElapsed,
      startTime: startTime?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '',
      endTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  const handleApproveMinutes = () => {
    if (!orgId || !id) return;
    approveMinutesMutation.mutate({
      organizationId: orgId,
      meetingId: Number(id),
    });
  };

  const handleStoreInGed = () => {
    if (!orgId || !id) return;
    storeInGedMutation.mutate({
      organizationId: orgId,
      meetingId: Number(id),
    });
  };

  const handleSendForSignature = () => {
    if (!orgId || !id) return;
    const signers = participants
      .filter(p => selectedSigners.includes(p.id))
      .map(p => ({ userId: p.id, name: p.name, role: p.role, email: p.email }));
    
    if (signers.length === 0) {
      toast.error('Selecione ao menos um signatário');
      return;
    }

    sendForSignatureMutation.mutate({
      organizationId: orgId,
      meetingId: Number(id),
      signers,
    });
  };

  const handleUploadSignedDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId || !id) return;
    setUploadingSignedDoc(true);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadSignedMutation.mutate({
        organizationId: orgId!,
        meetingId: Number(id),
        fileBase64: base64,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFinalizeSignature = () => {
    if (!orgId || !id) return;
    finalizeSignatureMutation.mutate({
      organizationId: orgId,
      meetingId: Number(id),
    });
  };

  const toggleSigner = (participantId: number) => {
    setSelectedSigners(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };
  
  const currentItem = agendaItems[currentItemIndex];
  const presentCount = participants.filter(p => p.present).length;
  const hasQuorum = presentCount >= Math.ceil(participants.length / 2);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={() => navigate('/governanca')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-white/70 text-sm font-medium">SALA DE REUNIÃO</p>
                <h1 className="text-2xl font-light text-white">Reunião Ordinária do CPPD</h1>
                <p className="text-white/80 text-sm">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Meeting Timer */}
              <div className="bg-white/10 rounded-lg px-4 py-2 flex items-center gap-3">
                <Timer className="h-5 w-5" />
                <div>
                  <p className="text-xs text-white/70">Tempo Total</p>
                  <p className="text-xl font-mono font-bold">{formatTime(totalElapsed)}</p>
                </div>
              </div>
              
              {/* Meeting Controls */}
              <div className="flex gap-2">
                {meetingStatus === 'not_started' && (
                  <Button 
                    onClick={startMeeting}
                    className="bg-green-500 hover:bg-green-600"
                    disabled={!hasQuorum}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Reunião
                  </Button>
                )}
                {meetingStatus === 'in_progress' && (
                  <>
                    <Button onClick={pauseMeeting} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </Button>
                    <Button onClick={finishMeeting} className="bg-red-500 hover:bg-red-600">
                      <Square className="h-4 w-4 mr-2" />
                      Encerrar
                    </Button>
                  </>
                )}
                {meetingStatus === 'paused' && (
                  <>
                    <Button onClick={resumeMeeting} className="bg-green-500 hover:bg-green-600">
                      <Play className="h-4 w-4 mr-2" />
                      Retomar
                    </Button>
                    <Button onClick={finishMeeting} className="bg-red-500 hover:bg-red-600">
                      <Square className="h-4 w-4 mr-2" />
                      Encerrar
                    </Button>
                  </>
                )}
                {meetingStatus === 'finished' && (
                  <Badge className="bg-green-500 text-white text-lg px-4 py-2">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Reunião Finalizada
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Agenda & Current Item */}
          <div className="col-span-8 space-y-6">
            {/* Current Agenda Item */}
            {currentItem && meetingStatus !== 'not_started' && (
              <Card className="border-2 border-indigo-200 bg-indigo-50/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        {currentItemIndex + 1}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{currentItem.title}</CardTitle>
                        <CardDescription>{currentItem.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Tempo do Item</p>
                        <p className={`text-2xl font-mono font-bold ${itemTimer > currentItem.duration * 60 ? 'text-red-500' : 'text-indigo-600'}`}>
                          {formatTime(itemTimer)}
                        </p>
                        <p className="text-xs text-muted-foreground">Previsto: {currentItem.duration} min</p>
                      </div>
                      {currentItemIndex < agendaItems.length - 1 && meetingStatus === 'in_progress' && (
                        <Button onClick={nextAgendaItem} className="bg-indigo-600 hover:bg-indigo-700">
                          Próximo Item
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Anotações</label>
                    <Textarea 
                      value={currentNotes}
                      onChange={(e) => setCurrentNotes(e.target.value)}
                      placeholder="Registre discussões e observações..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Registrar Deliberação</label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        value={currentDecision}
                        onChange={(e) => setCurrentDecision(e.target.value)}
                        placeholder="Digite a deliberação ou decisão..."
                        onKeyDown={(e) => e.key === 'Enter' && addDecision()}
                      />
                      <Button onClick={addDecision} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {currentItem.decisions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Deliberações Registradas:</p>
                      <ul className="space-y-1">
                        {currentItem.decisions.map((d, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm bg-white p-2 rounded">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Agenda List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Pauta da Reunião
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {agendaItems.map((item, idx) => (
                    <div 
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        idx === currentItemIndex && meetingStatus !== 'not_started' && meetingStatus !== 'finished'
                          ? 'bg-indigo-50 border-indigo-300'
                          : item.status === 'completed'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        item.status === 'completed' 
                          ? 'bg-green-500 text-white'
                          : item.status === 'in_progress'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {item.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="body-small">{item.duration} min previstos</p>
                      </div>
                      {item.elapsedTime > 0 && (
                        <Badge variant="outline">{formatTime(item.elapsedTime)}</Badge>
                      )}
                      {item.decisions.length > 0 && (
                        <Badge className="bg-green-100 text-green-700">{item.decisions.length} deliberação(ões)</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Action Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Plano de Ação
                  </CardTitle>
                  <Button onClick={() => setShowNewActionDialog(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Ação
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {actionItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhuma ação definida ainda</p>
                ) : (
                  <div className="space-y-2">
                    {actionItems.map((action, idx) => (
                      <div key={action.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium">{action.title}</p>
                          <p className="body-small">
                            {action.responsible} • {action.dueDate || 'Prazo a definir'}
                          </p>
                        </div>
                        <Badge variant={
                          action.priority === 'critical' ? 'destructive' :
                          action.priority === 'high' ? 'default' :
                          action.priority === 'medium' ? 'secondary' : 'outline'
                        }>
                          {action.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Participants */}
          <div className="col-span-4 space-y-6">
            {/* Quorum Status */}
            <Card className={hasQuorum ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status do Quórum</p>
                    <p className={`text-2xl font-bold ${hasQuorum ? 'text-green-600' : 'text-amber-600'}`}>
                      {presentCount}/{participants.length}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${hasQuorum ? 'bg-green-100' : 'bg-amber-100'}`}>
                    <Users className={`h-6 w-6 ${hasQuorum ? 'text-green-600' : 'text-amber-600'}`} />
                  </div>
                </div>
                <p className={`text-sm mt-2 ${hasQuorum ? 'text-green-600' : 'text-amber-600'}`}>
                  {hasQuorum ? '✓ Quórum atingido' : '⚠ Aguardando quórum mínimo'}
                </p>
              </CardContent>
            </Card>
            
            {/* Participants List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Lista de Presença
                  </CardTitle>
                  {capabilities?.canSendInvitations && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSendInvites}
                      disabled={invitesSending || meetingStatus === 'finished'}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {invitesSending ? 'Enviando...' : 'Enviar Convites'}
                    </Button>
                  )}
                </div>
                {invitesResult && (
                  <div className={`mt-2 p-2 rounded text-sm ${
                    invitesResult.failed.length === 0 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}>
                    <p className="font-medium">
                      {invitesResult.sent} convite(s) enviado(s) com sucesso
                    </p>
                    {invitesResult.failed.length > 0 && (
                      <p className="mt-1">
                        Falha no envio para: {invitesResult.failed.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {participants.map(participant => (
                    <div 
                      key={participant.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        participant.present ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleParticipantPresence(participant.id)}
                    >
                      <Checkbox 
                        checked={participant.present}
                        onCheckedChange={() => toggleParticipantPresence(participant.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{participant.name}</p>
                        <p className="body-small">{participant.role}</p>
                      </div>
                      {participant.present && participant.arrivedAt && (
                        <Badge variant="outline" className="text-green-600">
                          {participant.arrivedAt}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            {meetingStatus === 'finished' && (
              <Card>
                <CardHeader>
                  <CardTitle>Ata e Assinatura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Status da ata */}
                  <div className="flex items-center gap-2 mb-3 p-2 rounded bg-slate-50">
                    <span className="text-xs font-medium text-muted-foreground">Status:</span>
                    <Badge variant={minutesStatus === 'assinada' ? 'default' : minutesStatus === 'em_assinatura' ? 'secondary' : 'outline'}>
                      {minutesStatus === 'nao_gerada' ? 'Não gerada' :
                       minutesStatus === 'em_validacao' ? 'Em validação' :
                       minutesStatus === 'em_assinatura' ? 'Em assinatura' : 'Assinada'}
                    </Badge>
                  </div>

                  {/* 1. Gerar Ata (requer canGenerateMinutes) */}
                  {capabilities?.canGenerateMinutes && (
                    <Button className="w-full" onClick={() => setShowGenerateMinutesDialog(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      {generatedMinutes ? 'Ver / Editar Ata' : 'Gerar Ata com IA'}
                    </Button>
                  )}

                  {/* 2. Aprovar Ata (requer canApproveMinutes) */}
                  {minutesStatus === 'em_validacao' && capabilities?.canApproveMinutes && (
                    <Button variant="outline" className="w-full" onClick={handleApproveMinutes}
                      disabled={approveMinutesMutation.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {approveMinutesMutation.isPending ? 'Aprovando...' : 'Aprovar Ata'}
                    </Button>
                  )}

                  {/* 3. Salvar no GED (requer canStoreInGed) */}
                  {generatedMinutes && capabilities?.canStoreInGed && (
                    <Button variant="outline" className="w-full" onClick={handleStoreInGed}
                      disabled={storeInGedMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {storeInGedMutation.isPending ? 'Salvando...' : 'Salvar no GED'}
                    </Button>
                  )}

                  {/* 4. Enviar para Assinatura (requer canSendForSignature) */}
                  {(minutesStatus === 'em_validacao' || minutesStatus === 'em_assinatura') && capabilities?.canSendForSignature && (
                    <Button variant="outline" className="w-full" onClick={() => setShowSignatureDialog(true)}>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar para Assinatura
                    </Button>
                  )}

                  {/* 5. Upload de documento assinado (requer canUploadSignedDocument) */}
                  {minutesStatus === 'em_assinatura' && capabilities?.canUploadSignedDocument && (
                    <div>
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-slate-50 transition-colors w-full justify-center">
                          <Download className="h-4 w-4" />
                          {uploadingSignedDoc ? 'Enviando...' : 'Enviar Documento Assinado'}
                        </div>
                        <input type="file" accept=".pdf" className="hidden" onChange={handleUploadSignedDoc} disabled={uploadingSignedDoc} />
                      </label>
                    </div>
                  )}

                  {/* 6. Finalizar Assinatura (requer canFinalizeSignature) */}
                  {minutesStatus === 'em_assinatura' && capabilities?.canFinalizeSignature && (
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleFinalizeSignature}
                      disabled={finalizeSignatureMutation.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {finalizeSignatureMutation.isPending ? 'Finalizando...' : 'Finalizar Assinatura'}
                    </Button>
                  )}

                  {/* Ata assinada */}
                  {minutesStatus === 'assinada' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="text-sm font-medium text-green-700">Ata assinada e arquivada</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* New Action Dialog */}
      <Dialog open={showNewActionDialog} onOpenChange={setShowNewActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Ação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título da Ação</label>
              <Input 
                value={newActionItem.title}
                onChange={(e) => setNewActionItem(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Descreva a ação..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Responsável</label>
              <Select 
                value={newActionItem.responsible}
                onValueChange={(value) => setNewActionItem(prev => ({ ...prev, responsible: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name} - {p.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Prazo</label>
              <Input 
                type="date"
                value={newActionItem.dueDate}
                onChange={(e) => setNewActionItem(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Prioridade</label>
              <Select 
                value={newActionItem.priority}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setNewActionItem(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewActionDialog(false)}>Cancelar</Button>
            <Button onClick={addActionItem}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Generate Minutes Dialog */}
      <Dialog open={showGenerateMinutesDialog} onOpenChange={setShowGenerateMinutesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ata da Reunião</DialogTitle>
          </DialogHeader>
          {!generatedMinutes ? (
            <div className="text-center py-8">
              <Button onClick={generateMinutes} disabled={isGeneratingMinutes}>
                {isGeneratingMinutes ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Gerando ata com IA...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Ata Automaticamente
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">{generatedMinutes}</pre>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGeneratedMinutes('')}>
                  Regenerar
                </Button>
                <Button variant="outline" onClick={handleStoreInGed} disabled={storeInGedMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {storeInGedMutation.isPending ? 'Salvando...' : 'Salvar no GED'}
                </Button>
                <Button onClick={handleApproveMinutes} disabled={approveMinutesMutation.isPending || minutesStatus !== 'em_validacao'}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {approveMinutesMutation.isPending ? 'Aprovando...' : 'Aprovar Ata'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Signature Dialog - Seleção de Signatários */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione os membros que devem assinar a ata desta reunião.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {participants.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSigners.includes(p.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleSigner(p.id)}
                >
                  <Checkbox checked={selectedSigners.includes(p.id)} onCheckedChange={() => toggleSigner(p.id)} />
                  <div className="flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.role} • {p.email}</p>
                  </div>
                  {p.present && <Badge variant="outline" className="text-green-600">Presente</Badge>}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedSigners.length} signatário(s) selecionado(s)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>Cancelar</Button>
            <Button onClick={handleSendForSignature} disabled={sendForSignatureMutation.isPending || selectedSigners.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              {sendForSignatureMutation.isPending ? 'Enviando...' : 'Enviar para Assinatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
