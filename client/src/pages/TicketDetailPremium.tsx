// client/src/pages/TicketDetailPremium.tsx
import { useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Paperclip,
  Send,
  User,
  Building2,
  Calendar,
  FileText,
  Download,
  Upload,
  Shield,
  Loader2,
  Edit3,
  Save,
  History,
  Timer,
  AlertCircle,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Scale,
  BookOpen,
  Zap,
  Eye,
  EyeOff,
  MoreHorizontal,
  Trash2,
  Printer,
  ClockIcon,
  ListOrdered,
  RefreshCw,
  Tag,
  Mail,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  X
} from "lucide-react";
import { toast } from "sonner";

// Constantes
const TICKET_TYPES: Record<string, { label: string; color: string }> = {
  solicitacao_titular: { label: "Solicitação de Titular", color: "bg-rose-500" },
  incidente_seguranca: { label: "Incidente de Segurança", color: "bg-red-600" },
  duvida_juridica: { label: "Dúvida Jurídica", color: "bg-amber-500" },
  consultoria_geral: { label: "Consultoria Geral", color: "bg-blue-500" },
  auditoria: { label: "Auditoria", color: "bg-purple-500" },
  treinamento: { label: "Treinamento", color: "bg-green-500" },
  documentacao: { label: "Documentação", color: "bg-indigo-500" }
};

const PRIORITIES: Record<string, { label: string; color: string; bgColor: string }> = {
  baixa: { label: "Baixa", color: "text-slate-600", bgColor: "bg-slate-100" },
  media: { label: "Média", color: "text-blue-600", bgColor: "bg-blue-100" },
  alta: { label: "Alta", color: "text-orange-600", bgColor: "bg-orange-100" },
  critica: { label: "Crítica", color: "text-red-600", bgColor: "bg-red-100" }
};

const STATUSES: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  novo: { label: "Novo", color: "text-blue-600", bgColor: "bg-blue-100", icon: Play },
  em_analise: { label: "Em Análise", color: "text-yellow-600", bgColor: "bg-yellow-100", icon: Clock },
  aguardando_cliente: { label: "Aguardando Cliente", color: "text-purple-600", bgColor: "bg-purple-100", icon: Pause },
  aguardando_terceiro: { label: "Aguardando Terceiro", color: "text-indigo-600", bgColor: "bg-indigo-100", icon: Pause },
  resolvido: { label: "Resolvido", color: "text-green-600", bgColor: "bg-green-100", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "text-slate-600", bgColor: "bg-slate-100", icon: XCircle }
};

const SLA_LEVELS: Record<string, { label: string; hours: number; color: string }> = {
  prioritario: { label: "Prioritário", hours: 4, color: "text-red-600" },
  urgente: { label: "Urgente", hours: 8, color: "text-orange-600" },
  normal: { label: "Normal", hours: 24, color: "text-blue-600" },
  baixo: { label: "Baixo", hours: 72, color: "text-slate-600" }
};

// Sidebar de navegação por status
const SIDEBAR_FILTERS = [
  { id: "todos", label: "Todos", icon: ListOrdered },
  { id: "nao_iniciados", label: "Não Iniciados", icon: Play },
  { id: "abertos", label: "Abertos", icon: Clock },
  { id: "respondidos", label: "Respondidos", icon: MessageSquare },
  { id: "finalizados", label: "Finalizados", icon: CheckCircle },
  { id: "atrasados", label: "Com Deadline Vencido", icon: AlertTriangle },
  { id: "escalonados", label: "Escalonados", icon: Zap },
];

const PRIORITY_FILTERS = [
  { id: "critica", label: "Prioridade Crítica", color: "bg-red-500" },
  { id: "alta", label: "Prioridade Alta", color: "bg-orange-500" },
  { id: "media", label: "Prioridade Normal", color: "bg-blue-500" },
  { id: "baixa", label: "Prioridade Baixa", color: "bg-slate-400" },
];

export default function TicketDetailPremium() {
  const params = useParams<{ id: string }>();
  const ticketId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [resolution, setResolution] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [applicableArticles, setApplicableArticles] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTimeLogDialog, setShowTimeLogDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [timeLogMinutes, setTimeLogMinutes] = useState("");
  const [timeLogDescription, setTimeLogDescription] = useState("");
  const [pendingFiles, setPendingFiles] = useState<{file: File, base64: string}[]>([]);
  const [showMentionAttachment, setShowMentionAttachment] = useState(false);
  const [selectedMentionAttachments, setSelectedMentionAttachments] = useState<number[]>([]);

  // Queries - DashboardLayout já garante que o usuário está autenticado
  const { data: ticket, isLoading, error: ticketError, refetch } = trpc.tickets.getById.useQuery(
    { id: ticketId },
    { enabled: ticketId > 0 }
  );

  const { data: comments } = trpc.tickets.getComments.useQuery(
    { ticketId },
    { enabled: ticketId > 0 }
  );

  const { data: attachments } = trpc.tickets.getAttachments.useQuery(
    { ticketId },
    { enabled: ticketId > 0 }
  );

  const { data: templates } = trpc.tickets.getResponseTemplates.useQuery(
    { organizationId: ticket?.organizationId || 0 },
    { enabled: !!ticket?.organizationId }
  );

  const { data: tags } = trpc.tickets.getTicketTags.useQuery(
    { ticketId },
    { enabled: ticketId > 0 }
  );

  const { data: availableTags } = trpc.tickets.getTags.useQuery(
    { organizationId: ticket?.organizationId || 0 },
    { enabled: !!ticket?.organizationId }
  );

  // Query para buscar incidente vinculado (se for ticket de incidente de segurança)
  const { data: linkedIncident } = trpc.incidents.getByTicketId.useQuery(
    { ticketId },
    { enabled: ticketId > 0 && ticket?.ticketType === 'incidente_seguranca' }
  );

  // Mutations
  const utils = trpc.useUtils();

  const addCommentMutation = trpc.tickets.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comentário adicionado");
      setNewComment("");
      setIsInternal(false);
      setPendingFiles([]);
      setSelectedMentionAttachments([]);
      setShowMentionAttachment(false);
      utils.tickets.getComments.invalidate({ ticketId });
      utils.tickets.getAttachments.invalidate({ ticketId });
    },
    onError: (err) => toast.error(err.message)
  });

  const updateStatusMutation = trpc.tickets.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      setNewStatus("");
      refetch();
    },
    onError: (err) => toast.error(err.message)
  });

  const updateTicketMutation = trpc.tickets.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Ticket atualizado");
      setIsEditing(false);
      refetch();
    },
    onError: (err) => toast.error(err.message)
  });

  const uploadAttachmentMutation = trpc.tickets.uploadAttachment.useMutation({
    onSuccess: () => {
      toast.success("Anexo enviado");
      utils.tickets.getAttachments.invalidate({ ticketId });
    },
    onError: (err) => toast.error(err.message)
  });

  const addTagMutation = trpc.tickets.addTagToTicket.useMutation({
    onSuccess: () => {
      toast.success("Rótulo adicionado");
      utils.tickets.getTicketTags.invalidate({ ticketId });
    },
    onError: (err) => toast.error(err.message)
  });

  const removeTagMutation = trpc.tickets.removeTagFromTicket.useMutation({
    onSuccess: () => {
      toast.success("Rótulo removido");
      utils.tickets.getTicketTags.invalidate({ ticketId });
    },
    onError: (err) => toast.error(err.message)
  });

  // Verificar permissões
  const canManage = user?.role === "admin_global" || user?.role === "consultor";
  const isClient = user?.role === "sponsor";

  // Handlers
  const handleAddComment = async () => {
    if (!newComment.trim() && pendingFiles.length === 0 && selectedMentionAttachments.length === 0) return;
    
    // Criar comentário com menções de anexos existentes
    let commentContent = newComment;
    if (selectedMentionAttachments.length > 0) {
      const mentionedFiles = attachments?.filter((a: any) => selectedMentionAttachments.includes(a.id)) || [];
      const mentions = mentionedFiles.map((a: any) => `[Anexo: ${a.originalFilename}](${a.storageUrl})`).join('\n');
      commentContent = commentContent + (commentContent ? '\n\n' : '') + mentions;
    }
    
    addCommentMutation.mutate({
      ticketId,
      content: commentContent || 'Anexo(s) adicionado(s)',
      isInternal,
      pendingFiles: pendingFiles.map(pf => ({
        fileName: pf.file.name,
        mimeType: pf.file.type,
        fileContent: pf.base64
      }))
    });
  };

  const handleUpdateStatus = () => {
    if (!newStatus) return;
    updateStatusMutation.mutate({
      id: ticketId,
      status: newStatus as any,
      resolution: resolution || undefined
    });
  };

  const handleSaveEdit = () => {
    updateTicketMutation.mutate({
      id: ticketId,
      status: ticket?.status as any || 'em_analise',
      resolution: resolution || undefined,
      legalBasis: legalBasis || undefined,
      applicableArticles: applicableArticles ? applicableArticles.split(",").map((a: string) => a.trim()) : undefined
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = templates?.find((t: { id: number; content: string }) => t.id.toString() === templateId);
    if (template) {
      setNewComment(template.content);
      setSelectedTemplate("");
      toast.success("Template aplicado");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setPendingFiles(prev => [...prev, { file, base64 }]);
      toast.success(`Arquivo "${file.name}" adicionado`);
    };
    reader.readAsDataURL(file);
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleMentionAttachment = (attachmentId: number) => {
    setSelectedMentionAttachments(prev => 
      prev.includes(attachmentId) 
        ? prev.filter(id => id !== attachmentId)
        : [...prev, attachmentId]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddTag = (tagId: number) => {
    addTagMutation.mutate({ ticketId, tagId });
  };

  const handleRemoveTag = (tagId: number) => {
    removeTagMutation.mutate({ ticketId, tagId });
  };

  // Calcular progresso do SLA
  const calculateSLAProgress = () => {
    if (!ticket?.deadline || !ticket?.createdAt) return { progress: 0, remaining: "", status: "normal" };
    
    const created = new Date(ticket.createdAt).getTime();
    const deadline = new Date(ticket.deadline).getTime();
    const now = Date.now();
    
    const total = deadline - created;
    const elapsed = now - created;
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    
    const remainingMs = deadline - now;
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let status = "normal";
    if (remainingMs < 0) status = "expired";
    else if (progress > 80) status = "critical";
    else if (progress > 60) status = "warning";
    
    const remaining = remainingMs < 0 
      ? `Atrasado há ${Math.abs(remainingHours)}h ${Math.abs(remainingMinutes)}min`
      : `${remainingHours}h ${remainingMinutes}min restantes`;
    
    return { progress, remaining, status };
  };

  const slaProgress = calculateSLAProgress();

  // Formatar data
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" />
          </div>
          <p className="text-slate-600 font-medium">Carregando chamado...</p>
        </div>
      </div>
    );
  }

  // Ticket não encontrado ou erro
  if (!ticket || ticketError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Chamado não encontrado</h2>
            <p className="text-muted-foreground mb-4">O chamado solicitado não existe ou você não tem permissão para visualizá-lo.</p>
            <Button onClick={() => navigate("/meudpo")} className="bg-purple-600 hover:bg-purple-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para MeuDPO
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = STATUSES[ticket.status] || { label: ticket.status, color: "text-slate-600", bgColor: "bg-slate-100", icon: Clock };
  const priorityInfo = PRIORITIES[ticket.priority] || { label: ticket.priority, color: "text-slate-600", bgColor: "bg-slate-100" };
  const typeInfo = TICKET_TYPES[ticket.ticketType] || { label: ticket.ticketType, color: "bg-slate-500" };
  const slaInfo = SLA_LEVELS[ticket.slaLevel || "normal"] || SLA_LEVELS.normal;
  const isOverdue = ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== 'resolvido' && ticket.status !== 'cancelado';
  const StatusIcon = statusInfo.icon;
  const isSeusdadosRole = ['admin_global', 'consultor'].includes(user?.role ?? '');
  const deepLink = (ticket as any)?.sourceContext?.deepLink as string | undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      {/* Header Premium */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/meudpo")}
                className="hover:bg-purple-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono body-small">
                    {ticket.ticketNumber ? `#${ticket.ticketNumber.toString().padStart(6, '0')}` : `#${ticket.id}`}
                  </span>
                  <span className="text-slate-300">•</span>
                  <Badge className={`${typeInfo.color} text-white border-0`}>
                    {typeInfo.label}
                  </Badge>
                </div>
                <h1 className="text-xl font-bold text-slate-900 mt-1 line-clamp-1 max-w-2xl">
                  {ticket.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isSeusdadosRole && deepLink && (
                <Dialog open={showContextModal} onOpenChange={setShowContextModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Abrir contexto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[1100px] h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Contexto da organização (ponto exato)</DialogTitle>
                      <DialogDescription>
                        Este painel abre a tela relacionada ao chamado. Use para consultar evidências e status sem perder o fluxo.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="w-full h-[calc(80vh-140px)] border rounded-lg overflow-hidden">
                      <iframe
                        title="MeuDPO Context"
                        src={`${deepLink}${deepLink.includes('?') ? '&' : '?'}meudpo_ticket_id=${ticket.id}`}
                        className="w-full h-full"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {/* Menu de ações */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Mais
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowTimeLogDialog(true)}>
                    <ClockIcon className="h-4 w-4 mr-2" />
                    Horários Cronometrados
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowHistoryDialog(true)}>
                    <History className="h-4 w-4 mr-2" />
                    Log de Alterações
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Botão Reabrir/Cancelar */}
              {ticket.status === 'resolvido' && (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    updateStatusMutation.mutate({
                      id: ticketId,
                      status: 'em_analise'
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reabrir Chamado
                </Button>
              )}
              {ticket.status !== 'cancelado' && ticket.status !== 'resolvido' && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    updateStatusMutation.mutate({
                      id: ticketId,
                      status: 'cancelado'
                    });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Área Principal */}
        <main className="flex-1 p-6 max-w-4xl">
          {/* Banner Visual Premium */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-800 p-8 mb-6 shadow-xl">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-white/70 label-executive mb-2">Programa Privacidade</p>
                <h2 className="heading-2 text-white tracking-tight">meudpo</h2>
              </div>
              <div className="text-right">
                <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0 text-sm px-3 py-1`}>
                  <StatusIcon className="h-4 w-4 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Card de Incidente Vinculado */}
          {ticket.ticketType === 'incidente_seguranca' && linkedIncident && (
            <Card className="mb-6 border-0 shadow-lg overflow-hidden bg-gradient-to-r from-red-50 to-orange-50">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  PROTOCOLO DE INCIDENTE ATIVO
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Status do Incidente</p>
                    <Badge className={`${
                      linkedIncident.status === 'active' ? 'bg-red-500' :
                      linkedIncident.status === 'contained' ? 'bg-yellow-500' :
                      linkedIncident.status === 'remediated' ? 'bg-blue-500' :
                      linkedIncident.status === 'closed' ? 'bg-green-500' :
                      'bg-slate-500'
                    } text-white`}>
                      {linkedIncident.status === 'active' ? '🔴 Ativo' :
                       linkedIncident.status === 'contained' ? '🟡 Contido' :
                       linkedIncident.status === 'remediated' ? '🔵 Remediado' :
                       linkedIncident.status === 'closed' ? '⚫ Encerrado' :
                       '🟢 Standby'}
                    </Badge>
                    <p className="text-sm text-slate-600 mt-4 mb-2">Nível de Risco</p>
                    <Badge className={`${
                      linkedIncident.riskLevel === 'critical' ? 'bg-red-600' :
                      linkedIncident.riskLevel === 'high' ? 'bg-orange-500' :
                      linkedIncident.riskLevel === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    } text-white`}>
                      {linkedIncident.riskLevel === 'critical' ? 'Crítico' :
                       linkedIncident.riskLevel === 'high' ? 'Alto' :
                       linkedIncident.riskLevel === 'medium' ? 'Médio' :
                       'Baixo'}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Fase Atual</p>
                      <p className="font-semibold text-slate-800">
                        Fase {linkedIncident.currentPhaseId}/5
                      </p>
                    </div>
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => navigate('/incidentes')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Painel de Controle
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card de Atualização de Status */}
          {ticket.status === 'resolvido' && (
            <Card className="mb-6 border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  ATUALIZAÇÃO DE STATUS
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-slate-700">
                      Sua solicitação foi <span className="text-green-600 font-semibold">concluída</span> com sucesso.
                    </p>
                  </div>
                  <div className="space-y-3 text-sm text-slate-600">
                    <p>
                      Para melhoria contínua do nosso serviço, pedimos a gentileza de <strong>avaliar nosso atendimento</strong>, informando se sua demanda foi solucionada como esperado.
                    </p>
                    <p>
                      Em caso de dúvidas sobre a orientação apresentada, você também poderá solicitar a <strong>reabertura</strong> do chamado em um prazo de até <strong>5 dias úteis</strong>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card de Serviço do Catálogo CSC Vinculado */}
          {ticket.serviceCatalogItem && (
            <Card className="mb-6 border-0 shadow-lg overflow-hidden bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  SERVIÇO DO CATÁLOGO CSC
                </h3>
              </div>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Código do Serviço</p>
                      <Badge className="bg-purple-100 text-purple-700 font-mono">
                        {ticket.serviceCatalogItem.code}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Nome do Serviço</p>
                      <p className="font-semibold text-slate-800">{ticket.serviceCatalogItem.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Bloco</p>
                      <Badge className="bg-indigo-100 text-indigo-700">
                        {ticket.serviceCatalogItem.blockCode} - {ticket.serviceCatalogItem.blockName}
                      </Badge>
                    </div>
                    {ticket.serviceCatalogItem.description && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Descrição</p>
                        <p className="text-sm text-slate-600">{ticket.serviceCatalogItem.description}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-slate-800">SLA do Serviço</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide">Tempo de Atendimento</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {ticket.serviceCatalogItem.slaHours}h
                          </p>
                          <p className="text-xs text-slate-500">horas úteis</p>
                        </div>
                        {ticket.serviceCatalogItem.legalDeadlineDays && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Prazo Legal</p>
                            <p className="text-2xl font-bold text-indigo-600">
                              {ticket.serviceCatalogItem.legalDeadlineDays}d
                            </p>
                            <p className="text-xs text-slate-500">dias úteis</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1">Prioridade</p>
                        <Badge className={`${
                          ticket.serviceCatalogItem.priority === 'critica' ? 'bg-red-100 text-red-700' :
                          ticket.serviceCatalogItem.priority === 'alta' ? 'bg-orange-100 text-orange-700' :
                          ticket.serviceCatalogItem.priority === 'media' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {ticket.serviceCatalogItem.priority === 'critica' ? 'Crítica' :
                           ticket.serviceCatalogItem.priority === 'alta' ? 'Alta' :
                           ticket.serviceCatalogItem.priority === 'media' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                      {ticket.serviceCatalogItem.deliverable && (
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Entrega</p>
                          <p className="text-sm text-slate-700">{ticket.serviceCatalogItem.deliverable}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Descrição do Ticket */}
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Descrição do Chamado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline de Interações */}
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                Histórico de Interações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-6">
                  {comments && comments.length > 0 ? (
                    comments.map((comment: any, index: number) => (
                      <div key={comment.id} className="relative">
                        {index < comments.length - 1 && (
                          <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-slate-200" />
                        )}
                        <div className="flex gap-4">
                          <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-semibold">
                              {comment.authorName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900">{comment.authorName}</span>
                              {comment.isInternal && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Interno
                                </Badge>
                              )}
                              <span className="body-small">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                              <p className="text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                              {/* Anexos vinculados ao comentário */}
                              {attachments && attachments.filter((a: any) => a.commentId === comment.id).length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                    <Paperclip className="h-3 w-3" />
                                    Anexos desta mensagem:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {attachments.filter((a: any) => a.commentId === comment.id).map((attachment: any) => (
                                      <a
                                        key={attachment.id}
                                        href={attachment.storageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-sm"
                                      >
                                        <FileText className="h-4 w-4 text-slate-500" />
                                        <span className="truncate max-w-[150px]">{attachment.originalFilename}</span>
                                        <Download className="h-3 w-3 text-slate-400" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhuma interação registrada</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Área de novo comentário */}
              <div className="mt-6 pt-6 border-t">
                {canManage && templates && templates.length > 0 && (
                  <div className="mb-4">
                    <Select value={selectedTemplate} onValueChange={handleApplyTemplate}>
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="Usar template de resposta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template: any) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="min-h-[120px] resize-none border-slate-200 focus:border-purple-500 focus:ring-purple-500"
                />
                
                {/* Arquivos pendentes para upload */}
                {pendingFiles.length > 0 && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-600 font-medium mb-2 flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      Arquivos a serem enviados com esta mensagem:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pendingFiles.map((pf, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-purple-200 text-sm"
                        >
                          <FileText className="h-4 w-4 text-purple-500" />
                          <span className="truncate max-w-[150px]">{pf.file.name}</span>
                          <button
                            onClick={() => handleRemovePendingFile(index)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Menções de anexos existentes */}
                {showMentionAttachment && attachments && attachments.length > 0 && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium mb-2 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Selecione anexos existentes para mencionar:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((attachment: any) => (
                        <button
                          key={attachment.id}
                          onClick={() => handleToggleMentionAttachment(attachment.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors ${
                            selectedMentionAttachments.includes(attachment.id)
                              ? 'bg-purple-100 border-purple-300 text-purple-700'
                              : 'bg-white border-slate-200 hover:border-purple-300'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="truncate max-w-[150px]">{attachment.originalFilename}</span>
                          {selectedMentionAttachments.includes(attachment.id) && (
                            <CheckCircle className="h-4 w-4 text-purple-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-4">
                    {canManage && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={isInternal}
                          onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                        />
                        <span className="body-small">Comentário interno</span>
                      </label>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Anexar
                    </Button>
                    {attachments && attachments.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMentionAttachment(!showMentionAttachment)}
                        className={showMentionAttachment ? 'border-purple-300 bg-purple-50' : ''}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Mencionar Anexo
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={handleAddComment}
                    disabled={(!newComment.trim() && pendingFiles.length === 0 && selectedMentionAttachments.length === 0) || addCommentMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anexos */}
          {attachments && attachments.length > 0 && (
            <Card className="mb-6 border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-purple-600" />
                  Anexos ({attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {attachment.originalFilename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(attachment.createdAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={attachment.storageUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>

        {/* Painel Lateral Direito */}
        <aside className="w-80 border-l border-slate-200 bg-white p-6 hidden lg:block">
          {/* Cliente */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Cliente</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClientDetails(!showClientDetails)}
              >
                {showClientDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{ticket.createdByName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organização:</span>
                <span className="font-medium">{ticket.organizationName || 'N/A'}</span>
              </div>
              {showClientDetails && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-xs">N/A</span>
                  </div>
                </>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setShowClientDetails(!showClientDetails)}>
              {showClientDetails ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Rótulos */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 mb-3">Rótulos</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags && tags.length > 0 ? (
                tags.map((tag: any) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color }}
                    className="text-white cursor-pointer hover:opacity-80"
                    onClick={() => handleRemoveTag(tag.id)}
                  >
                    {tag.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))
              ) : (
                <p className="body-small">Nenhum rótulo</p>
              )}
            </div>
            {canManage && availableTags && availableTags.length > 0 && (
              <Select onValueChange={(v) => handleAddTag(parseInt(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Adicionar rótulos" />
                </SelectTrigger>
                <SelectContent>
                  {availableTags
                    .filter((t: any) => !tags?.some((tag: any) => tag.id === t.id))
                    .map((tag: any) => (
                      <SelectItem key={tag.id} value={tag.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator className="my-4" />

          {/* Informações do Chamado */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Informações do Chamado</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTicketDetails(!showTicketDetails)}
              >
                {showTicketDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Responsável:</span>
                <span className="font-medium">{ticket.assignedToName || 'Não atribuído'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categoria:</span>
                <span className="font-medium">{typeInfo.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em:</span>
                <span className="font-medium">{formatDate(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prioridade:</span>
                <Badge className={`${priorityInfo.bgColor} ${priorityInfo.color} border-0`}>
                  {priorityInfo.label}
                </Badge>
              </div>
              {showTicketDetails && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline:</span>
                    <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                      {ticket.deadline ? formatDate(ticket.deadline) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SLA:</span>
                    <span className={`font-medium ${slaInfo.color}`}>{slaInfo.label}</span>
                  </div>
                </>
              )}
            </div>
            
            {/* Barra de progresso do SLA */}
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progresso SLA</span>
                <span className={`font-medium ${
                  slaProgress.status === 'expired' ? 'text-red-600' :
                  slaProgress.status === 'critical' ? 'text-orange-600' :
                  slaProgress.status === 'warning' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {slaProgress.remaining}
                </span>
              </div>
              <Progress 
                value={slaProgress.progress} 
                className={`h-2 ${
                  slaProgress.status === 'expired' ? '[&>div]:bg-red-500' :
                  slaProgress.status === 'critical' ? '[&>div]:bg-orange-500' :
                  slaProgress.status === 'warning' ? '[&>div]:bg-yellow-500' :
                  '[&>div]:bg-green-500'
                }`}
              />
            </div>

            <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setShowTicketDetails(!showTicketDetails)}>
              {showTicketDetails ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
            </Button>
          </div>

          {/* Alterar Status */}
          {canManage && ticket.status !== 'resolvido' && ticket.status !== 'cancelado' && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Alterar Status</h3>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUSES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <value.icon className={`h-4 w-4 ${value.color}`} />
                          {value.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newStatus === 'resolvido' && (
                  <Textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Descreva a resolução..."
                    className="mt-3 min-h-[80px]"
                  />
                )}
                <Button
                  onClick={handleUpdateStatus}
                  disabled={!newStatus || updateStatusMutation.isPending}
                  className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
                >
                  {updateStatusMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Atualizar Status
                </Button>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Dialog de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Chamado</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => {
              toast.info("Funcionalidade em desenvolvimento");
              setShowDeleteDialog(false);
            }}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Horários */}
      <Dialog open={showTimeLogDialog} onOpenChange={setShowTimeLogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Horários Cronometrados</DialogTitle>
            <DialogDescription>
              Registre o tempo de trabalho neste chamado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tempo de Trabalho em Respostas</Label>
                <p className="text-2xl font-bold text-purple-600">0h 00min</p>
              </div>
              <div>
                <Label>Tempo de Trabalho Final</Label>
                <p className="text-2xl font-bold text-purple-600">0h 00min</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label>Adicionar Tempo</Label>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="Minutos"
                  value={timeLogMinutes}
                  onChange={(e) => setTimeLogMinutes(e.target.value)}
                />
                <Input
                  placeholder="Descrição"
                  value={timeLogDescription}
                  onChange={(e) => setTimeLogDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimeLogDialog(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              toast.info("Funcionalidade em desenvolvimento");
            }}>
              Registrar Tempo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log de Alterações</DialogTitle>
            <DialogDescription>
              Histórico completo de alterações neste chamado.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Play className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Chamado criado</p>
                  <p className="body-small">
                    {formatDate(ticket.createdAt)} por {ticket.createdByName || 'Sistema'}
                  </p>
                </div>
              </div>
              {/* Mais eventos seriam listados aqui */}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
