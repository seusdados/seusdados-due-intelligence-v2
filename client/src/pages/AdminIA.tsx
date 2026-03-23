import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { 
  Bot,
  Settings,
  MessageSquare,
  FileText,
  Building2,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Sparkles,
  Zap,
  Brain,
  Search,
  Clock,
  Archive,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const PROVIDER_INFO = {
  openai: { name: "OpenAI", icon: "🤖", color: "bg-green-500" },
  gemini: { name: "Google Gemini", icon: "✨", color: "bg-blue-500" },
  claude: { name: "Anthropic Claude", icon: "🧠", color: "bg-orange-500" },
  perplexity: { name: "Perplexity", icon: "🔍", color: "bg-purple-500" },
};

const MODULE_LABELS = {
  compliance: "Conformidade PPPD",
  due_diligence: "Due Diligence",
  action_plans: "Planos de Ação",
  general: "Geral",
};

const STYLE_LABELS = {
  formal: "Formal",
  tecnico: "Técnico",
  executivo: "Executivo",
  simplificado: "Simplificado",
};

export default function AdminIA() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [showNewInstructionDialog, setShowNewInstructionDialog] = useState(false);
  const [newInstruction, setNewInstruction] = useState({
    module: "general" as const,
    systemPrompt: "",
    contextInstructions: "",
    responseStyle: "formal" as const,
    includeRecommendations: true,
    includeRiskAnalysis: true,
    includeActionPlan: true,
  });

  const isConsultor = user?.role === 'admin_global' || user?.role === 'consultor';

  // Queries
  const { data: organizations } = trpc.organization.list.useQuery();
  const { data: chatSessions, isLoading: loadingSessions } = trpc.ai.getChatSessions.useQuery(
    { organizationId: selectedOrg || undefined },
    { enabled: isConsultor }
  );
  const { data: orgInstructions, refetch: refetchInstructions } = trpc.ai.getOrganizationInstructions.useQuery(
    { organizationId: selectedOrg || 0 },
    { enabled: isConsultor && !!selectedOrg }
  );
  const { data: promptTemplates } = trpc.ai.getPromptTemplates.useQuery(
    {},
    { enabled: isConsultor }
  );

  // Mutations
  const createInstructionMutation = trpc.ai.createOrganizationInstruction.useMutation({
    onSuccess: () => {
      toast.success("Instruções personalizadas criadas com sucesso");
      setShowNewInstructionDialog(false);
      refetchInstructions();
    },
    onError: (error) => {
      toast.error(`Erro ao criar instruções: ${error.message}`);
    },
  });

  const deleteInstructionMutation = trpc.ai.deleteOrganizationInstruction.useMutation({
    onSuccess: () => {
      toast.success("Instruções removidas com sucesso");
      refetchInstructions();
    },
  });

  const archiveSessionMutation = trpc.ai.archiveChatSession.useMutation({
    onSuccess: () => {
      toast.success("Sessão arquivada");
    },
  });

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

  const handleCreateInstruction = () => {
    if (!selectedOrg) {
      toast.error("Selecione uma organização primeiro");
      return;
    }
    createInstructionMutation.mutate({
      organizationId: selectedOrg,
      ...newInstruction,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-slate-800 flex items-center gap-3">
            <Bot className="h-7 w-7 text-violet-500" />
            Integração com IA
          </h1>
          <p className="text-slate-500 mt-1">
            Configure agentes de IA para análise de resultados e geração de recomendações
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0">
          <Sparkles className="h-3 w-3 mr-1" />
          Consultores Seusdados
        </Badge>
      </div>

      {/* Provider Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(PROVIDER_INFO).map(([key, info]) => (
          <Card key={key} className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${info.color} flex items-center justify-center text-white text-xl`}>
                  {info.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{info.name}</p>
                  <p className="text-xs text-slate-500">
                    {key === 'gemini' ? 'Ativo via Manus Forge' : 'Configurável'}
                  </p>
                </div>
                {key === 'gemini' && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Check className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="bg-white">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat com IA
          </TabsTrigger>
          <TabsTrigger value="instructions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Instruções por Cliente
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Templates de Prompts
          </TabsTrigger>
        </TabsList>

        {/* Chat Sessions Tab */}
        <TabsContent value="chat">
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Sessões de Chat</CardTitle>
                  <CardDescription>Histórico de conversas com agentes de IA</CardDescription>
                </div>
                <Button 
                  className="btn-gradient-seusdados text-white"
                  onClick={() => setLocation("/admin/ia/chat")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conversa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filter by Organization */}
              <div className="mb-4">
                <Label className="text-sm text-slate-600">Filtrar por organização</Label>
                <Select
                  value={selectedOrg?.toString() || "all"}
                  onValueChange={(v) => setSelectedOrg(v === "all" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-64 mt-1">
                    <SelectValue placeholder="Todas as organizações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as organizações</SelectItem>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.tradeName || org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loadingSessions ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : chatSessions && chatSessions.length > 0 ? (
                <div className="space-y-2">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/admin/ia/chat/${session.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                          <Brain className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{session.title}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Badge variant="outline" className="text-xs">
                              {MODULE_LABELS[session.module as keyof typeof MODULE_LABELS]}
                            </Badge>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            {new Date(session.updatedAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveSessionMutation.mutate({ id: session.id });
                          }}
                        >
                          <Archive className="h-4 w-4 text-slate-400" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma sessão de chat encontrada</p>
                  <p className="text-sm mt-1">Inicie uma nova conversa com o agente de IA</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Instructions Tab */}
        <TabsContent value="instructions">
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Instruções Personalizadas</CardTitle>
                  <CardDescription>Configure como a IA deve responder para cada cliente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Organization Selector */}
              <div className="mb-6">
                <Label className="text-sm text-slate-600">Selecione a organização</Label>
                <Select
                  value={selectedOrg?.toString() || ""}
                  onValueChange={(v) => setSelectedOrg(parseInt(v))}
                >
                  <SelectTrigger className="w-full md:w-96 mt-1">
                    <SelectValue placeholder="Escolha uma organização" />
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

              {selectedOrg ? (
                <>
                  {/* Add New Instruction Button */}
                  <div className="mb-4">
                    <Dialog open={showNewInstructionDialog} onOpenChange={setShowNewInstructionDialog}>
                      <DialogTrigger asChild>
                        <Button className="btn-gradient-seusdados text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Instrução
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Nova Instrução Personalizada</DialogTitle>
                          <DialogDescription>
                            Configure como a IA deve responder para este cliente
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Módulo</Label>
                              <Select
                                value={newInstruction.module}
                                onValueChange={(v: any) => setNewInstruction({ ...newInstruction, module: v })}
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
                              <Label>Estilo de Resposta</Label>
                              <Select
                                value={newInstruction.responseStyle}
                                onValueChange={(v: any) => setNewInstruction({ ...newInstruction, responseStyle: v })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="formal">Formal</SelectItem>
                                  <SelectItem value="tecnico">Técnico</SelectItem>
                                  <SelectItem value="executivo">Executivo</SelectItem>
                                  <SelectItem value="simplificado">Simplificado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label>Instruções do Sistema</Label>
                            <Textarea
                              className="mt-1"
                              placeholder="Instruções adicionais para o agente de IA..."
                              rows={4}
                              value={newInstruction.systemPrompt}
                              onChange={(e) => setNewInstruction({ ...newInstruction, systemPrompt: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label>Contexto do Cliente</Label>
                            <Textarea
                              className="mt-1"
                              placeholder="Informações específicas sobre o cliente que a IA deve considerar..."
                              rows={3}
                              value={newInstruction.contextInstructions}
                              onChange={(e) => setNewInstruction({ ...newInstruction, contextInstructions: e.target.value })}
                            />
                          </div>

                          <div className="space-y-3">
                            <Label>Incluir nas respostas</Label>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Recomendações</span>
                              <Switch
                                checked={newInstruction.includeRecommendations}
                                onCheckedChange={(v) => setNewInstruction({ ...newInstruction, includeRecommendations: v })}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Análise de Riscos</span>
                              <Switch
                                checked={newInstruction.includeRiskAnalysis}
                                onCheckedChange={(v) => setNewInstruction({ ...newInstruction, includeRiskAnalysis: v })}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Plano de Ação</span>
                              <Switch
                                checked={newInstruction.includeActionPlan}
                                onCheckedChange={(v) => setNewInstruction({ ...newInstruction, includeActionPlan: v })}
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowNewInstructionDialog(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            className="btn-gradient-seusdados text-white"
                            onClick={handleCreateInstruction}
                            disabled={createInstructionMutation.isPending}
                          >
                            {createInstructionMutation.isPending ? "Salvando..." : "Salvar Instruções"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Instructions List */}
                  {orgInstructions && orgInstructions.length > 0 ? (
                    <div className="space-y-3">
                      {orgInstructions.map((inst) => (
                        <div
                          key={inst.id}
                          className="p-4 rounded-lg border bg-slate-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {MODULE_LABELS[inst.module as keyof typeof MODULE_LABELS]}
                                </Badge>
                                <Badge variant="outline" className="bg-violet-50 text-violet-700">
                                  {STYLE_LABELS[inst.responseStyle as keyof typeof STYLE_LABELS]}
                                </Badge>
                              </div>
                              {inst.systemPrompt && (
                                <p className="text-sm text-slate-600 mb-2">
                                  <strong>Instruções:</strong> {inst.systemPrompt.substring(0, 150)}...
                                </p>
                              )}
                              {inst.contextInstructions && (
                                <p className="text-sm text-slate-500">
                                  <strong>Contexto:</strong> {inst.contextInstructions.substring(0, 100)}...
                                </p>
                              )}
                              <div className="flex gap-4 mt-2 text-xs text-slate-400">
                                {inst.includeRecommendations && <span>✓ Recomendações</span>}
                                {inst.includeRiskAnalysis && <span>✓ Análise de Riscos</span>}
                                {inst.includeActionPlan && <span>✓ Plano de Ação</span>}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4 text-slate-400" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteInstructionMutation.mutate({ id: inst.id })}
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma instrução configurada para esta organização</p>
                      <p className="text-sm mt-1">Adicione instruções personalizadas para melhorar as respostas da IA</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Selecione uma organização para gerenciar as instruções</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Templates de Prompts</CardTitle>
                  <CardDescription>Prompts pré-configurados para análises rápidas</CardDescription>
                </div>
                <Button className="btn-gradient-seusdados text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {promptTemplates && promptTemplates.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {promptTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-slate-800">{template.name}</h4>
                          <Badge variant="outline" className="mt-1">
                            {MODULE_LABELS[template.module as keyof typeof MODULE_LABELS]}
                          </Badge>
                        </div>
                        {template.isSystem && (
                          <Badge className="bg-violet-100 text-violet-700">Sistema</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-slate-500 mt-2">{template.description}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm">
                          <Zap className="h-3 w-3 mr-1" />
                          Usar
                        </Button>
                        {!template.isSystem && (
                          <>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum template disponível</p>
                  <p className="text-sm mt-1">Crie templates para agilizar suas análises</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
