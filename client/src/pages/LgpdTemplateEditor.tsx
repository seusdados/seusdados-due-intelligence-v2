import { useState, useEffect } from "react";
import { useLocation } from "wouter";
// DashboardLayout removido - já é aplicado no App.tsx
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  FileText, 
  Edit3, 
  Save, 
  RotateCcw, 
  Eye, 
  History, 
  Copy, 
  Check,
  ChevronLeft,
  Info,
  Code,
  Sparkles
} from "lucide-react";

export default function LgpdTemplateEditor() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Queries
  const { data: organizations } = trpc.organization.list.useQuery();
  const { data: templates, refetch: refetchTemplates } = trpc.lgpdTemplate.list.useQuery(
    { organizationId: selectedOrg ? parseInt(selectedOrg) : undefined },
    { enabled: !!selectedOrg }
  );
  const { data: templateDetail, refetch: refetchDetail } = trpc.lgpdTemplate.get.useQuery(
    { templateId: selectedTemplate || "", organizationId: selectedOrg ? parseInt(selectedOrg) : undefined },
    { enabled: !!selectedTemplate && !!selectedOrg }
  );
  const { data: variables } = trpc.lgpdTemplate.variables.useQuery();
  const { data: history } = trpc.lgpdTemplate.history.useQuery(
    { customTemplateId: templateDetail?.customTemplateId || 0 },
    { enabled: !!templateDetail?.customTemplateId && showHistory }
  );
  
  // Mutations
  const saveMutation = trpc.lgpdTemplate.save.useMutation({
    onSuccess: () => {
      toast.success("Template salvo com sucesso!");
      refetchTemplates();
      refetchDetail();
      setChangeReason("");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  });
  
  const restoreMutation = trpc.lgpdTemplate.restore.useMutation({
    onSuccess: () => {
      toast.success("Template restaurado ao padrão!");
      refetchTemplates();
      refetchDetail();
    },
    onError: (error) => {
      toast.error(`Erro ao restaurar: ${error.message}`);
    }
  });
  
  const previewMutation = trpc.lgpdTemplate.preview.useMutation({
    onSuccess: (data) => {
      if (data.success && data.rendered) {
        setPreviewContent(data.rendered);
        setShowPreview(true);
      } else {
        toast.error(`Erro no preview: ${data.error}`);
      }
    }
  });
  
  // Atualiza conteúdo editado quando template muda
  useEffect(() => {
    if (templateDetail?.content) {
      setEditedContent(templateDetail.content);
    }
  }, [templateDetail]);
  
  // Verifica permissão
  if (user?.role !== "admin_global" && user?.role !== "consultor") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Acesso restrito a consultores.</p>
      </div>
    );
  }
  
  const handleSave = () => {
    if (!selectedOrg || !selectedTemplate) return;
    
    saveMutation.mutate({
      templateId: selectedTemplate,
      organizationId: parseInt(selectedOrg),
      content: editedContent,
      changeReason: changeReason || undefined,
    });
  };
  
  const handleRestore = () => {
    if (!selectedOrg || !selectedTemplate) return;
    
    restoreMutation.mutate({
      templateId: selectedTemplate,
      organizationId: parseInt(selectedOrg),
    });
  };
  
  const handlePreview = () => {
    previewMutation.mutate({
      templateId: selectedTemplate || "",
      content: editedContent,
    });
  };
  
  const insertVariable = (varName: string) => {
    const textarea = document.getElementById("template-editor") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = editedContent.substring(0, start) + `{{${varName}}}` + editedContent.substring(end);
      setEditedContent(newContent);
      
      // Reposiciona cursor
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4);
      }, 0);
    }
  };
  
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copiado para a área de transferência!");
  };
  
  const hasChanges = templateDetail?.content !== editedContent;
  
  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/analise-contratos")}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-emerald-600" />
                Editor de Templates LGPD
              </h1>
              <p className="text-muted-foreground">
                Personalize os templates de cláusulas contratuais por organização
              </p>
            </div>
          </div>
        </div>
        
        {/* Seleção de Organização */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Selecione a Organização</CardTitle>
            <CardDescription>
              Os templates personalizados são salvos por organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedOrg} onValueChange={(v) => { setSelectedOrg(v); setSelectedTemplate(null); }}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecione uma organização..." />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        {selectedOrg && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Lista de Templates */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Templates</CardTitle>
                <CardDescription>18 blocos de cláusulas</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-1 p-3">
                    {templates?.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedTemplate === template.id
                            ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{template.name}</span>
                          {template.isCustomized && (
                            <Badge variant="secondary" className="text-xs">
                              <Edit3 className="h-3 w-3 mr-1" />
                              Personalizado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            {/* Editor */}
            <Card className="lg:col-span-3">
              {selectedTemplate ? (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {templateDetail?.name}
                          {templateDetail?.isCustomized && (
                            <Badge variant="outline" className="ml-2">
                              v{templateDetail.version}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{templateDetail?.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowVariables(true)}
                        >
                          <Code className="h-4 w-4 mr-1" />
                          Variáveis
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreview}
                          disabled={previewMutation.isPending}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        {templateDetail?.customTemplateId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowHistory(true)}
                          >
                            <History className="h-4 w-4 mr-1" />
                            Histórico
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs defaultValue="edit">
                      <TabsList>
                        <TabsTrigger value="edit">
                          <Edit3 className="h-4 w-4 mr-1" />
                          Editar
                        </TabsTrigger>
                        <TabsTrigger value="help">
                          <Info className="h-4 w-4 mr-1" />
                          Ajuda
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="edit" className="space-y-4">
                        <div>
                          <Label htmlFor="template-editor">Conteúdo do Template</Label>
                          <Textarea
                            id="template-editor"
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="font-mono text-sm min-h-[400px] mt-2"
                            placeholder="Digite o conteúdo do template..."
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="change-reason">Motivo da Alteração (opcional)</Label>
                          <Input
                            id="change-reason"
                            value={changeReason}
                            onChange={(e) => setChangeReason(e.target.value)}
                            placeholder="Ex: Ajuste de redação conforme orientação jurídica"
                            className="mt-2"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between pt-4">
                          <div className="flex items-center gap-2">
                            {templateDetail?.isCustomized && (
                              <Button
                                variant="outline"
                                onClick={handleRestore}
                                disabled={restoreMutation.isPending}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restaurar Padrão
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {hasChanges && (
                              <Badge variant="secondary">Alterações não salvas</Badge>
                            )}
                            <Button
                              onClick={handleSave}
                              disabled={!hasChanges || saveMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              {saveMutation.isPending ? "Salvando..." : "Salvar Template"}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="help" className="space-y-4">
                        <div className="prose dark:prose-invert max-w-none">
                          <h4>Como usar variáveis</h4>
                          <p>Use a sintaxe <code>{"{{nome_variavel}}"}</code> para inserir valores dinâmicos.</p>
                          
                          <h4>Blocos condicionais</h4>
                          <pre className="bg-muted p-3 rounded text-sm">
{`{{#if B6_trata_criancas}}
  Este texto aparece apenas se tratar crianças
{{/if}}`}
                          </pre>
                          
                          <h4>Listas</h4>
                          <pre className="bg-muted p-3 rounded text-sm">
{`{{#each B2_finalidades}}
  - {{this}}
{{/each}}`}
                          </pre>
                          
                          <h4>Dicas</h4>
                          <ul>
                            <li>Use o botão "Variáveis" para ver todas as variáveis disponíveis</li>
                            <li>Use o botão "Preview" para visualizar o resultado com dados de exemplo</li>
                            <li>O histórico de alterações é mantido para auditoria</li>
                          </ul>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </>
              ) : (
                <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                  <div className="text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Selecione um template para editar</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      
      {/* Modal de Preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview do Template</DialogTitle>
            <DialogDescription>
              Visualização com dados de exemplo
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] mt-4">
            <div className="prose dark:prose-invert max-w-none p-4 bg-muted rounded-lg">
              <div dangerouslySetInnerHTML={{ __html: previewContent.replace(/\n/g, '<br/>') }} />
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => copyToClipboard(previewContent)}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
            <Button onClick={() => setShowPreview(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Variáveis */}
      <Dialog open={showVariables} onOpenChange={setShowVariables}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Variáveis Disponíveis</DialogTitle>
            <DialogDescription>
              Clique em uma variável para inseri-la no editor
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] mt-4">
            <div className="space-y-2">
              {variables && Object.entries(variables).map(([key, description]) => (
                <button
                  key={key}
                  onClick={() => { insertVariable(key); setShowVariables(false); }}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <code className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {`{{${key}}}`}
                  </code>
                  <p className="body-small mt-1">{description}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Histórico */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Histórico de Alterações</DialogTitle>
            <DialogDescription>
              Versões anteriores do template
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] mt-4">
            {history && history.length > 0 ? (
              <div className="space-y-4">
                {history.map((item, index) => (
                  <Card key={item.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Versão {item.version}</Badge>
                        <span className="body-small">
                          {new Date(item.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {item.changeReason && (
                        <p className="text-sm mb-2">
                          <strong>Motivo:</strong> {item.changeReason}
                        </p>
                      )}
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Ver conteúdo anterior
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                          {item.previousContent}
                        </pre>
                      </details>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum histórico disponível
              </p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
