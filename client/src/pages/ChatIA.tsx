import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { 
  Bot,
  Send,
  ArrowLeft,
  User,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Building2,
  FileText,
  AlertCircle,
  Loader2,
  MessageSquare,
  Brain
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface ChatMessage {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
  isLoading?: boolean;
}

const MODULE_LABELS = {
  compliance: "Conformidade PPPD",
  due_diligence: "Due Diligence",
  action_plans: "Planos de Ação",
  general: "Geral",
};

export default function ChatIA() {
  const { user } = useAuth();
  const params = useParams<{ sessionId?: string }>();
  const [, setLocation] = useLocation();
  const sessionId = params.sessionId ? parseInt(params.sessionId) : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(!sessionId);
  const [newSessionConfig, setNewSessionConfig] = useState({
    organizationId: null as number | null,
    module: "general" as const,
    entityType: "" as string,
    entityId: null as number | null,
    title: "",
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isConsultor = user?.role === 'admin_global' || user?.role === 'consultor';

  // Queries
  const { data: organizations } = trpc.organization.list.useQuery();
  const { data: sessionData, isLoading: loadingSession } = trpc.ai.getChatSession.useQuery(
    { id: sessionId! },
    { enabled: !!sessionId && isConsultor }
  );
  const { data: complianceAssessments } = trpc.compliance.list.useQuery(
    { organizationId: newSessionConfig.organizationId! },
    { enabled: !!newSessionConfig.organizationId && newSessionConfig.entityType === 'compliance_assessment' }
  );
  const { data: thirdPartyAssessments } = trpc.thirdPartyAssessment.list.useQuery(
    { organizationId: newSessionConfig.organizationId! },
    { enabled: !!newSessionConfig.organizationId && newSessionConfig.entityType === 'third_party_assessment' }
  );

  // Mutations
  const createSessionMutation = trpc.ai.createChatSession.useMutation({
    onSuccess: (data) => {
      setLocation(`/admin/ia/chat/${data.id}`);
      setIsCreatingSession(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar sessão: ${error.message}`);
    },
  });

  const sendMessageMutation = trpc.ai.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages(prev => prev.map(m => 
        m.isLoading ? { ...m, isLoading: false, content: data.content, id: data.messageId ?? undefined } : m
      ));
    },
    onError: (error) => {
      setMessages(prev => prev.filter(m => !m.isLoading));
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });

  // Load session messages
  useEffect(() => {
    if (sessionData?.messages) {
      setMessages(sessionData.messages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        createdAt: new Date(m.createdAt),
      })));
    }
  }, [sessionData]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCreateSession = () => {
    if (!newSessionConfig.organizationId) {
      toast.error("Selecione uma organização");
      return;
    }
    createSessionMutation.mutate({
      organizationId: newSessionConfig.organizationId,
      module: newSessionConfig.module,
      entityType: newSessionConfig.entityType || undefined,
      entityId: newSessionConfig.entityId || undefined,
      title: newSessionConfig.title || undefined,
    });
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !sessionId) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage,
      createdAt: new Date(),
    };

    const loadingMessage: ChatMessage = {
      role: "assistant",
      content: "",
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputMessage("");

    sendMessageMutation.mutate({
      sessionId,
      content: inputMessage,
      isRefinement: messages.length > 0,
    });
  };

  const handleCopy = (content: string, id?: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id || null);
    toast.success("Copiado para a área de transferência");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefine = (originalContent: string) => {
    setInputMessage(`Por favor, refine a resposta anterior considerando: `);
  };

  if (!isConsultor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-slate-600 mb-4">
              Esta funcionalidade está disponível apenas para consultores Seusdados.
            </p>
            <Button onClick={() => setLocation("/")}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // New Session Creation Form
  if (isCreatingSession) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/ia")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-light text-slate-800 flex items-center gap-3">
              <Bot className="h-7 w-7 text-violet-500" />
              Nova Conversa com IA
            </h1>
            <p className="text-slate-500 mt-1">Configure o contexto para iniciar a análise</p>
          </div>
        </div>

        <Card className="bg-white max-w-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Configuração da Sessão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Organização *</Label>
              <Select
                value={newSessionConfig.organizationId?.toString() || ""}
                onValueChange={(v) => setNewSessionConfig({ 
                  ...newSessionConfig, 
                  organizationId: parseInt(v),
                  entityId: null 
                })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a organização" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {org.tradeName || org.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Módulo</Label>
              <Select
                value={newSessionConfig.module}
                onValueChange={(v: any) => setNewSessionConfig({ ...newSessionConfig, module: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="compliance">Conformidade PPPD</SelectItem>
                  <SelectItem value="due_diligence">Due Diligence</SelectItem>
                  <SelectItem value="action_plans">Planos de Ação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vincular a uma avaliação (opcional)</Label>
              <Select
                value={newSessionConfig.entityType || 'none'}
                onValueChange={(v) => setNewSessionConfig({ 
                  ...newSessionConfig, 
                  entityType: v === 'none' ? '' : v,
                  entityId: null 
                })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Nenhuma - conversa livre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma - conversa livre</SelectItem>
                  <SelectItem value="compliance_assessment">Avaliação de Conformidade</SelectItem>
                  <SelectItem value="third_party_assessment">Avaliação de Terceiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newSessionConfig.entityType === 'compliance_assessment' && complianceAssessments && (
              <div>
                <Label>Avaliação de Conformidade</Label>
                <Select
                  value={newSessionConfig.entityId?.toString() || ""}
                  onValueChange={(v) => setNewSessionConfig({ ...newSessionConfig, entityId: parseInt(v) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a avaliação" />
                  </SelectTrigger>
                  <SelectContent>
                    {complianceAssessments.map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newSessionConfig.entityType === 'third_party_assessment' && thirdPartyAssessments && (
              <div>
                <Label>Avaliação de Terceiro</Label>
                <Select
                  value={newSessionConfig.entityId?.toString() || ""}
                  onValueChange={(v) => setNewSessionConfig({ ...newSessionConfig, entityId: parseInt(v) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a avaliação" />
                  </SelectTrigger>
                  <SelectContent>
                    {thirdPartyAssessments.map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Título da conversa (opcional)</Label>
              <Input
                className="mt-1"
                placeholder="Ex: Análise de maturidade LGPD 2025"
                value={newSessionConfig.title}
                onChange={(e) => setNewSessionConfig({ ...newSessionConfig, title: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setLocation("/admin/ia")}>
                Cancelar
              </Button>
              <Button 
                className="btn-gradient-seusdados text-white"
                onClick={handleCreateSession}
                disabled={createSessionMutation.isPending || !newSessionConfig.organizationId}
              >
                {createSessionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Iniciar Conversa
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loadingSession) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  // Chat Interface
  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/ia")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-light text-slate-800 flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-500" />
              {sessionData?.session?.title || "Chat com IA"}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Badge variant="outline" className="text-xs">
                {MODULE_LABELS[sessionData?.session?.module as keyof typeof MODULE_LABELS] || "Geral"}
              </Badge>
              {sessionData?.session?.organizationId && (
                <>
                  <span>•</span>
                  <Building2 className="h-3 w-3" />
                  <span>Org #{sessionData.session.organizationId}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0">
          <Sparkles className="h-3 w-3 mr-1" />
          Gemini via Manus Forge
        </Badge>
      </div>

      {/* Chat Messages */}
      <Card className="flex-1 bg-white overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg">Inicie a conversa</p>
              <p className="text-sm mt-1">
                Faça perguntas sobre a avaliação ou peça análises e recomendações
              </p>
              <div className="grid grid-cols-2 gap-3 mt-6 max-w-lg">
                <Button 
                  variant="outline" 
                  className="h-auto py-3 px-4 text-left"
                  onClick={() => setInputMessage("Faça uma análise completa desta avaliação e identifique os principais gaps e riscos.")}
                >
                  <div>
                    <p className="font-medium text-slate-700">Análise Completa</p>
                    <p className="text-xs text-slate-500">Gaps e riscos identificados</p>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-3 px-4 text-left"
                  onClick={() => setInputMessage("Gere um resumo executivo desta avaliação para apresentar à diretoria.")}
                >
                  <div>
                    <p className="font-medium text-slate-700">Resumo Executivo</p>
                    <p className="text-xs text-slate-500">Para apresentação</p>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-3 px-4 text-left"
                  onClick={() => setInputMessage("Sugira um plano de ação priorizado para remediar os gaps identificados.")}
                >
                  <div>
                    <p className="font-medium text-slate-700">Plano de Ação</p>
                    <p className="text-xs text-slate-500">Ações priorizadas</p>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-3 px-4 text-left"
                  onClick={() => setInputMessage("Quais são as principais recomendações para melhorar a maturidade em proteção de dados?")}
                >
                  <div>
                    <p className="font-medium text-slate-700">Recomendações</p>
                    <p className="text-xs text-slate-500">Melhorias sugeridas</p>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Analisando...</span>
                      </div>
                    ) : msg.role === 'assistant' ? (
                      <>
                        <div className="prose prose-sm max-w-none prose-slate">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleCopy(msg.content, msg.id)}
                          >
                            {copiedId === msg.id ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            Copiar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleRefine(msg.content)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refinar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Input Area */}
      <div className="mt-4">
        <div className="flex gap-3">
          <Textarea
            placeholder="Digite sua mensagem ou pergunta... (refinamentos ilimitados disponíveis)"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="min-h-[60px] resize-none"
          />
          <Button
            className="btn-gradient-seusdados text-white h-auto px-6"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Pressione Enter para enviar • Shift+Enter para nova linha • Refinamentos ilimitados disponíveis
        </p>
      </div>
    </div>
  );
}
