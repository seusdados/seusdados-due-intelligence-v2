import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

// Constantes
const TICKET_TYPES: Record<string, string> = {
  solicitacao_titular: "Solicitação de Titular",
  incidente_seguranca: "Incidente de Segurança",
  duvida_juridica: "Dúvida Jurídica",
  consultoria_geral: "Consultoria Geral",
  auditoria: "Auditoria",
  treinamento: "Treinamento",
  documentacao: "Documentação"
};

const PRIORITIES: Record<string, { label: string; color: string; bgColor: string }> = {
  baixa: { label: "Baixa", color: "text-gray-600", bgColor: "bg-gray-100" },
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
  cancelado: { label: "Cancelado", color: "text-gray-600", bgColor: "bg-gray-100", icon: XCircle }
};

const SLA_LEVELS: Record<string, { label: string; hours: number; color: string }> = {
  prioritario: { label: "Prioritário", hours: 4, color: "text-red-600" },
  urgente: { label: "Urgente", hours: 8, color: "text-orange-600" },
  normal: { label: "Normal", hours: 24, color: "text-blue-600" },
  baixo: { label: "Baixo", hours: 72, color: "text-gray-600" }
};

export default function TicketDetail() {
  const params = useParams<{ id: string }>();
  const ticketId = parseInt(params.id || "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Estados
  const [activeTab, setActiveTab] = useState("detalhes");
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRole = user?.role || 'sponsor';
  const canManage = userRole === 'admin_global' || userRole === 'consultor';

  // Query para buscar ticket
  const { data: ticket, isLoading, refetch } = trpc.tickets.getById.useQuery(
    { id: ticketId },
    { enabled: ticketId > 0 }
  );

  // Query para comentários
  const { data: comments, refetch: refetchComments } = trpc.tickets.getComments.useQuery(
    { ticketId },
    { enabled: ticketId > 0 }
  );

  // Query para anexos
  const { data: attachments, refetch: refetchAttachments } = trpc.tickets.getAttachments.useQuery(
    { ticketId },
    { enabled: ticketId > 0 }
  );

  // Query para templates de resposta
  const { data: templates } = trpc.tickets.getResponseTemplates.useQuery(
    { organizationId: ticket?.organizationId },
    { enabled: !!ticket?.organizationId && canManage }
  );

  // Query para status do SLA
  const { data: slaStatus } = trpc.tickets.getSLAStatus.useQuery(
    { ticketId },
    { enabled: ticketId > 0 }
  );

  // Atualizar estados de edição quando ticket carrega
  useEffect(() => {
    if (ticket) {
      setEditTitle(ticket.title);
      setEditDescription(ticket.description);
      setResolution(ticket.resolution || "");
      setLegalBasis(ticket.legalBasis || "");
      setApplicableArticles((ticket.applicableArticles as string[] | undefined)?.join(", ") || "");
    }
  }, [ticket]);

  // Mutation para adicionar comentário
  const addCommentMutation = trpc.tickets.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comentário adicionado");
      setNewComment("");
      setIsInternal(false);
      refetchComments();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Mutation para atualizar status
  const updateStatusMutation = trpc.tickets.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      setNewStatus("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Mutation para atualizar ticket (usando updateStatus com campos adicionais)
  const updateTicketMutation = trpc.tickets.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Ticket atualizado");
      setIsEditing(false);
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Mutation para upload de anexo
  const uploadAttachmentMutation = trpc.tickets.uploadAttachment.useMutation({
    onSuccess: () => {
      toast.success("Anexo enviado");
      refetchAttachments();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    addCommentMutation.mutate({
      ticketId,
      content: newComment,
      isInternal
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
    // Usar updateStatus para atualizar campos do ticket
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
      uploadAttachmentMutation.mutate({
        ticketId,
        fileName: file.name,
        mimeType: file.type,
        fileContent: base64
      });
    };
    reader.readAsDataURL(file);
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

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>Ticket não encontrado</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/meudpo")}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = STATUSES[ticket.status] || { label: ticket.status, color: "text-gray-600", bgColor: "bg-gray-100", icon: Clock };
  const priorityInfo = PRIORITIES[ticket.priority] || { label: ticket.priority, color: "text-gray-600", bgColor: "bg-gray-100" };
  const slaInfo = SLA_LEVELS[ticket.slaLevel || "normal"] || SLA_LEVELS.normal;
  const isOverdue = ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== 'resolvido' && ticket.status !== 'cancelado';
  const StatusIcon = statusInfo.icon;

  // Gerar timeline de eventos
  const generateTimeline = () => {
    const events: Array<{ date: Date; type: string; title: string; description: string; icon: any; color: string }> = [];
    
    // Evento de criação
    events.push({
      date: new Date(ticket.createdAt),
      type: "created",
      title: "Ticket Criado",
      description: `Criado por ${ticket.createdByName || "Sistema"}`,
      icon: Play,
      color: "text-blue-600"
    });
    
    // Eventos de comentários
    comments?.forEach(comment => {
      events.push({
        date: new Date(comment.createdAt),
        type: comment.isInternal ? "internal_comment" : "comment",
        title: comment.isInternal ? "Comentário Interno" : "Comentário",
        description: `${comment.authorName}: ${comment.content.substring(0, 50)}...`,
        icon: comment.isInternal ? EyeOff : MessageSquare,
        color: comment.isInternal ? "text-amber-600" : "text-purple-600"
      });
    });
    
    // Eventos de anexos
    attachments?.forEach(attachment => {
      events.push({
        date: new Date(attachment.createdAt),
        type: "attachment",
        title: "Anexo Adicionado",
        description: attachment.originalFilename,
        icon: Paperclip,
        color: "text-green-600"
      });
    });
    
    // Ordenar por data
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const timeline = generateTimeline();

  return (
    <div className="p-6 space-y-6">
      {/* Header Compacto */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/meudpo")} className="mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono body-small">
              {ticket.ticketNumber ? `#${ticket.ticketNumber.toString().padStart(6, '0')}` : `#${ticket.id}`}
            </span>
            {isEditing ? (
              <Input 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold max-w-md"
              />
            ) : (
              <h1 className="text-2xl font-bold">{ticket.title}</h1>
            )}
            {canManage && !isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={updateTicketMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
            <Badge variant="outline">{TICKET_TYPES[ticket.ticketType] || ticket.ticketType}</Badge>
            <Badge className={`${priorityInfo.bgColor} ${priorityInfo.color} border-0`}>
              {priorityInfo.label}
            </Badge>
            <Badge variant="outline" className={slaInfo.color}>
              <Shield className="h-3 w-3 mr-1" />
              SLA {slaInfo.label}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Em Atraso
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Progresso do SLA */}
      {ticket.deadline && ticket.status !== 'resolvido' && ticket.status !== 'cancelado' && (
        <Card className={`border-2 ${
          slaProgress.status === 'expired' ? 'border-red-500 bg-red-50' :
          slaProgress.status === 'critical' ? 'border-orange-500 bg-orange-50' :
          slaProgress.status === 'warning' ? 'border-yellow-500 bg-yellow-50' :
          'border-green-500 bg-green-50'
        }`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer className={`h-5 w-5 ${
                  slaProgress.status === 'expired' ? 'text-red-600' :
                  slaProgress.status === 'critical' ? 'text-orange-600' :
                  slaProgress.status === 'warning' ? 'text-yellow-600' :
                  'text-green-600'
                }`} />
                <span className="font-medium">Controle de Prazo SLA</span>
              </div>
              <div className="text-right">
                <p className={`font-bold ${
                  slaProgress.status === 'expired' ? 'text-red-600' :
                  slaProgress.status === 'critical' ? 'text-orange-600' :
                  slaProgress.status === 'warning' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {slaProgress.remaining}
                </p>
                <p className="text-xs text-muted-foreground">
                  Prazo: {new Date(ticket.deadline).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            <Progress 
              value={slaProgress.progress} 
              className={`h-3 ${
                slaProgress.status === 'expired' ? '[&>div]:bg-red-500' :
                slaProgress.status === 'critical' ? '[&>div]:bg-orange-500' :
                slaProgress.status === 'warning' ? '[&>div]:bg-yellow-500' :
                '[&>div]:bg-green-500'
              }`}
            />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>Criado: {new Date(ticket.createdAt).toLocaleString('pt-BR')}</span>
              <span>{Math.round(slaProgress.progress)}% do tempo utilizado</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="detalhes" className="gap-2">
            <FileText className="h-4 w-4" />
            Detalhes
          </TabsTrigger>
          <TabsTrigger value="comentarios" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Comentários ({comments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Documentos ({attachments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <History className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="acoes" className="gap-2">
              <Zap className="h-4 w-4" />
              Ações
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab Detalhes */}
        <TabsContent value="detalhes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Descrição */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Descrição do Chamado</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea 
                      value={editDescription} 
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={6}
                      className="font-normal"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{ticket.description}</p>
                  )}
                  
                  {ticket.sourceContext && (() => {
                    const ctx = ticket.sourceContext as { module?: string; page?: string; entityType?: string; entityName?: string };
                    return (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Contexto de Origem
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {ctx.module && (
                          <div>
                            <span className="text-muted-foreground">Módulo:</span>{" "}
                            <span className="font-medium">{ctx.module}</span>
                          </div>
                        )}
                        {ctx.page && (
                          <div>
                            <span className="text-muted-foreground">Página:</span>{" "}
                            <span className="font-medium">{ctx.page}</span>
                          </div>
                        )}
                        {ctx.entityType && (
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>{" "}
                            <span className="font-medium">{ctx.entityType}</span>
                          </div>
                        )}
                        {ctx.entityName && (
                          <div>
                            <span className="text-muted-foreground">Entidade:</span>{" "}
                            <span className="font-medium">{ctx.entityName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                </CardContent>
              </Card>

              {/* Fundamentação Legal (se resolvido ou em edição) */}
              {(ticket.resolution || isEditing) && (
                <Card className={ticket.status === 'resolvido' ? "border-green-200 bg-green-50" : ""}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Scale className="h-5 w-5" />
                      Resolução e Fundamentação Legal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Resolução</Label>
                      {isEditing ? (
                        <Textarea 
                          value={resolution} 
                          onChange={(e) => setResolution(e.target.value)}
                          rows={4}
                          placeholder="Descreva a resolução do chamado..."
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap mt-1">{ticket.resolution || "Não informada"}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Fundamentação Legal</Label>
                      {isEditing ? (
                        <Textarea 
                          value={legalBasis} 
                          onChange={(e) => setLegalBasis(e.target.value)}
                          rows={2}
                          placeholder="Ex: Art. 18 da LGPD..."
                        />
                      ) : (
                        <p className="text-sm mt-1">{ticket.legalBasis || "Não informada"}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Artigos Aplicáveis</Label>
                      {isEditing ? (
                        <Input 
                          value={applicableArticles} 
                          onChange={(e) => setApplicableArticles(e.target.value)}
                          placeholder="Art. 18, Art. 19, Art. 20 (separados por vírgula)"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ticket.applicableArticles && (ticket.applicableArticles as string[]).length > 0 ? (
                            (ticket.applicableArticles as string[]).map((article, idx) => (
                              <Badge key={idx} variant="outline" className="text-green-700 border-green-300">
                                {article}
                              </Badge>
                            ))
                          ) : (
                            <span className="body-small">Nenhum artigo informado</span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Coluna Lateral - Informações */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="body-small">Criado em</p>
                      <p className="font-medium">{new Date(ticket.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  
                  {ticket.deadline && (
                    <div className="flex items-center gap-3">
                      <Clock className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="body-small">Prazo (SLA)</p>
                        <p className={`font-medium ${isOverdue ? 'text-red-500' : ''}`}>
                          {new Date(ticket.deadline).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="body-small">Criado por</p>
                      <p className="font-medium">{ticket.createdByName || 'Não informado'}</p>
                    </div>
                  </div>
                  
                  {ticket.assignedToName && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="body-small">Responsável</p>
                        <p className="font-medium">{ticket.assignedToName}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="body-small">Organização</p>
                      <p className="font-medium">{ticket.organizationName || 'Não informado'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab Comentários */}
        <TabsContent value="comentarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comentários
                </span>
                {canManage && templates && templates.length > 0 && (
                  <Select value={selectedTemplate} onValueChange={handleApplyTemplate}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Usar template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template: { id: number; title: string }) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de Comentários */}
              {comments && comments.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {comments.map((comment) => (
                    <div 
                      key={comment.id} 
                      className={`p-4 rounded-lg ${comment.isInternal ? 'bg-amber-50 border border-amber-200' : 'bg-muted'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {comment.authorName?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{comment.authorName || 'Usuário'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        {comment.isInternal && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Interno
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum comentário ainda
                </p>
              )}

              <Separator />

              {/* Novo Comentário */}
              <div className="space-y-3">
                <Textarea
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="internal"
                        checked={isInternal}
                        onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                      />
                      <Label htmlFor="internal" className="body-small">
                        Comentário interno (não visível para o cliente)
                      </Label>
                    </div>
                  )}
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Documentos */}
        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Documentos e Anexos
              </CardTitle>
              <CardDescription>
                Arquivos relacionados a este chamado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {attachments && attachments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attachments.map((attachment) => (
                    <div 
                      key={attachment.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{attachment.originalFilename}</p>
                          <p className="text-xs text-muted-foreground">
                            {attachment.mimeType} • {new Date(attachment.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={attachment.storageUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum documento anexado
                </p>
              )}

              <Separator />

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAttachmentMutation.isPending}
              >
                <Upload className="h-4 w-4" />
                {uploadAttachmentMutation.isPending ? "Enviando..." : "Adicionar Documento"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Atividades
              </CardTitle>
              <CardDescription>
                Linha do tempo de todos os eventos do chamado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-6">
                  {timeline.map((event, index) => {
                    const EventIcon = event.icon;
                    return (
                      <div key={index} className="relative flex gap-4 pl-10">
                        <div className={`absolute left-2 w-5 h-5 rounded-full bg-background border-2 flex items-center justify-center ${event.color}`}>
                          <EventIcon className="h-3 w-3" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.date.toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <p className="body-small mt-1">{event.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Ações (apenas para admin/consultor) */}
        {canManage && (
          <TabsContent value="acoes" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Alterar Status */}
              {ticket.status !== 'resolvido' && ticket.status !== 'cancelado' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Alterar Status</CardTitle>
                    <CardDescription>
                      Atualize o status do chamado
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Novo Status</Label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUSES).map(([value, info]) => (
                            <SelectItem key={value} value={value}>
                              {info.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(newStatus === 'resolvido' || newStatus === 'cancelado') && (
                      <div className="space-y-2">
                        <Label>Resolução</Label>
                        <Textarea
                          placeholder="Descreva a resolução..."
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          rows={4}
                        />
                      </div>
                    )}
                    
                    <Button 
                      className="w-full"
                      onClick={handleUpdateStatus}
                      disabled={!newStatus || updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? "Atualizando..." : "Atualizar Status"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Ações Rápidas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                  <CardDescription>
                    Atalhos para ações comuns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar Informações
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("comentarios")}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Adicionar Comentário
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Anexar Documento
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
