// client/src/pages/MeudpoTemplates.tsx
// Página de Templates de Resposta Rápida do MeuDPO

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Edit2, Trash2, Copy, Search, Tag, MessageSquare, AlertCircle } from "lucide-react";

const TICKET_TYPES = [
  { value: "solicitacao_titular", label: "Solicitação de Titular" },
  { value: "incidente_seguranca", label: "Incidente de Segurança" },
  { value: "duvida_juridica", label: "Dúvida Jurídica" },
  { value: "consultoria_geral", label: "Consultoria Geral" },
  { value: "auditoria", label: "Auditoria" },
  { value: "treinamento", label: "Treinamento" },
  { value: "documentacao", label: "Documentação" }
];

const CATEGORIES = [
  "Resposta Inicial",
  "Solicitação de Informações",
  "Atualização de Status",
  "Resolução",
  "Encerramento",
  "Esclarecimento Jurídico",
  "Orientação Técnica"
];

export default function MeudpoTemplates() {
  const { selectedOrganization } = useOrganization();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formTicketType, setFormTicketType] = useState("");
  
  const templatesQuery = trpc.tickets.getResponseTemplates.useQuery(
    { organizationId: selectedOrganization?.id },
    { enabled: true }
  );
  
  const createMutation = trpc.tickets.createResponseTemplate.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    }
  });
  
  const updateMutation = trpc.tickets.updateResponseTemplate.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
      setEditingTemplate(null);
      resetForm();
    }
  });
  
  const deleteMutation = trpc.tickets.deleteResponseTemplate.useMutation({
    onSuccess: () => {
      templatesQuery.refetch();
    }
  });
  
  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("");
    setFormTicketType("");
  };
  
  const handleCreate = () => {
    createMutation.mutate({
      organizationId: selectedOrganization?.id,
      title: formTitle,
      content: formContent,
      category: formCategory,
      ticketType: formTicketType || undefined
    });
  };
  
  const handleUpdate = () => {
    if (!editingTemplate) return;
    updateMutation.mutate({
      templateId: editingTemplate.id,
      title: formTitle,
      content: formContent,
      category: formCategory,
      ticketType: formTicketType || undefined
    });
  };
  
  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormContent(template.content);
    setFormCategory(template.category || "");
    setFormTicketType(template.ticketType || "");
  };
  
  const handleDelete = (templateId: number) => {
    if (confirm("Tem certeza que deseja excluir este template?")) {
      deleteMutation.mutate({ templateId });
    }
  };
  
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    alert("Template copiado para a área de transferência!");
  };
  
  const templates = templatesQuery.data || [];
  
  const filteredTemplates = templates.filter((t: any) => {
    const matchesSearch = !searchTerm || 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const groupedByCategory = filteredTemplates.reduce((acc: any, template: any) => {
    const category = template.category || "Sem Categoria";
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {});

  if (!selectedOrganization) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <p>Selecione uma organização no menu lateral para gerenciar templates.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates de Resposta Rápida</h1>
          <p className="text-gray-600 mt-1">
            Gerencie templates pré-definidos para agilizar o atendimento de tickets
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Template</DialogTitle>
              <DialogDescription>
                Crie um template de resposta para usar em tickets
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Template</Label>
                <Input
                  id="title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Resposta inicial para solicitação de dados"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Tipo de Ticket (opcional)</Label>
                  <Select value={formTicketType} onValueChange={setFormTicketType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os tipos</SelectItem>
                      {TICKET_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo do Template</Label>
                <Textarea
                  id="content"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Digite o conteúdo do template..."
                  className="min-h-[200px]"
                />
                <p className="text-xs text-gray-500">
                  Dica: Use variáveis como {"{nome_titular}"}, {"{numero_ticket}"}, {"{data_atual}"} para personalização automática
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!formTitle || !formContent || !formCategory}>
                Criar Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory || ""} onValueChange={(v) => setSelectedCategory(v || null)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as categorias</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Lista de Templates */}
      {templatesQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            Carregando templates...
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum template encontrado</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedCategory 
                ? "Tente ajustar os filtros de busca"
                : "Crie seu primeiro template para agilizar o atendimento"}
            </p>
            {!searchTerm && !selectedCategory && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, categoryTemplates]: [string, any]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
                <Badge variant="secondary">{categoryTemplates.length}</Badge>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryTemplates.map((template: any) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{template.title}</CardTitle>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(template.content)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {template.ticketType && (
                        <Badge variant="outline" className="w-fit">
                          {TICKET_TYPES.find(t => t.value === template.ticketType)?.label || template.ticketType}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {template.content}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <MessageSquare className="h-3 w-3" />
                        <span>Usado {template.usageCount || 0} vezes</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Dialog de Edição */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
            <DialogDescription>
              Atualize o conteúdo do template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título do Template</Label>
              <Input
                id="edit-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Ticket</Label>
                <Select value={formTicketType} onValueChange={setFormTicketType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os tipos</SelectItem>
                    {TICKET_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-content">Conteúdo</Label>
              <Textarea
                id="edit-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={!formTitle || !formContent}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
