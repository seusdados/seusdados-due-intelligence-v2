import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Headphones,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Upload,
  Plus,
  ListTodo,
  Paperclip
} from "lucide-react";

interface GerenciarComoDPOProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  buttonText?: string;
}

export function GerenciarComoDPO({ 
  variant = "outline",
  buttonText = "Gerenciar como DPO"
}: GerenciarComoDPOProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pendentes");
  const [showNovaAcaoDialog, setShowNovaAcaoDialog] = useState(false);
  const [novaAcao, setNovaAcao] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media",
    prazo: "",
    responsavel: ""
  });
  
  const { selectedOrganization } = useOrganization();

  const acoesPendentes = [
    { id: 1, titulo: "Revisar política de privacidade", prazo: "2025-01-15", prioridade: "alta", status: "pendente" },
    { id: 2, titulo: "Atualizar ROPA", prazo: "2025-01-20", prioridade: "media", status: "pendente" },
    { id: 3, titulo: "Treinamento LGPD equipe TI", prazo: "2025-02-01", prioridade: "baixa", status: "pendente" },
  ];

  const documentosAtrasados = [
    { id: 1, titulo: "Relatório de Impacto (RIPD)", vencimento: "2024-12-01", diasAtraso: 13 },
    { id: 2, titulo: "Termo de Consentimento - Marketing", vencimento: "2024-12-10", diasAtraso: 4 },
  ];

  const tarefasRecentes = [
    { id: 1, titulo: "Responder solicitação de acesso", status: "concluido", data: "2024-12-12" },
    { id: 2, titulo: "Análise de contrato fornecedor X", status: "em_andamento", data: "2024-12-13" },
    { id: 3, titulo: "Due diligence parceiro Y", status: "em_andamento", data: "2024-12-14" },
  ];

  const handleCriarAcao = () => {
    if (!novaAcao.titulo || !novaAcao.prazo) {
      toast.error("Preencha o título e prazo da ação");
      return;
    }
    toast.success("Ação criada com sucesso!");
    setShowNovaAcaoDialog(false);
    setNovaAcao({ titulo: "", descricao: "", prioridade: "media", prazo: "", responsavel: "" });
  };

  const handleResolver = (id: number) => {
    toast.success("Ação marcada como resolvida!");
  };

  const handleAnexar = (id: number) => {
    toast.info("Funcionalidade de anexo em desenvolvimento");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={variant} className="gap-2">
            <Headphones className="h-4 w-4" />
            {buttonText}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-indigo-600" />
              Painel de Gestão DPO
            </DialogTitle>
            <DialogDescription>
              Gerencie ações, documentos e tarefas como DPO
              {selectedOrganization && ` - ${selectedOrganization.name}`}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pendentes" className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Pendentes
              </TabsTrigger>
              <TabsTrigger value="atrasados" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Atrasados
              </TabsTrigger>
              <TabsTrigger value="tarefas" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tarefas
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendentes" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Ações Pendentes</h3>
                <Button size="sm" onClick={() => setShowNovaAcaoDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Ação
                </Button>
              </div>
              <div className="space-y-3">
                {acoesPendentes.map((acao) => (
                  <Card key={acao.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          acao.prioridade === "alta" ? "bg-red-100" :
                          acao.prioridade === "media" ? "bg-yellow-100" : "bg-green-100"
                        }`}>
                          <Clock className={`h-5 w-5 ${
                            acao.prioridade === "alta" ? "text-red-600" :
                            acao.prioridade === "media" ? "text-yellow-600" : "text-green-600"
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium">{acao.titulo}</h4>
                          <p className="text-sm text-muted-foreground">
                            Prazo: {new Date(acao.prazo).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          acao.prioridade === "alta" ? "destructive" :
                          acao.prioridade === "media" ? "default" : "secondary"
                        }>
                          {acao.prioridade.charAt(0).toUpperCase() + acao.prioridade.slice(1)}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleAnexar(acao.id)}>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleResolver(acao.id)}>
                          Resolver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="atrasados" className="space-y-4">
              <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Documentos Atrasados
              </h3>
              <div className="space-y-3">
                {documentosAtrasados.map((doc) => (
                  <Card key={doc.id} className="border-red-200 bg-red-50/50">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-red-100">
                          <FileText className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{doc.titulo}</h4>
                          <p className="text-sm text-red-600">
                            Vencido em: {new Date(doc.vencimento).toLocaleDateString("pt-BR")} ({doc.diasAtraso} dias)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleAnexar(doc.id)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Anexar
                        </Button>
                        <Button size="sm" onClick={() => handleResolver(doc.id)}>
                          Resolver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="tarefas" className="space-y-4">
              <h3 className="text-lg font-semibold">Tarefas Recentes</h3>
              <div className="space-y-3">
                {tarefasRecentes.map((tarefa) => (
                  <Card key={tarefa.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          tarefa.status === "concluido" ? "bg-green-100" : "bg-blue-100"
                        }`}>
                          {tarefa.status === "concluido" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{tarefa.titulo}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tarefa.data).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <Badge variant={tarefa.status === "concluido" ? "default" : "secondary"}>
                        {tarefa.status === "concluido" ? "Concluído" : "Em Andamento"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <h3 className="text-lg font-semibold">Upload de Documentos</h3>
              <Card>
                <CardContent className="py-8">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Arraste arquivos aqui ou clique para selecionar
                    </p>
                    <Button variant="outline">
                      Selecionar Arquivos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNovaAcaoDialog} onOpenChange={setShowNovaAcaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Ação</DialogTitle>
            <DialogDescription>
              Crie uma nova ação para acompanhamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={novaAcao.titulo}
                onChange={(e) => setNovaAcao({ ...novaAcao, titulo: e.target.value })}
                placeholder="Ex: Revisar contrato fornecedor"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={novaAcao.descricao}
                onChange={(e) => setNovaAcao({ ...novaAcao, descricao: e.target.value })}
                placeholder="Descreva a ação..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={novaAcao.prioridade}
                  onValueChange={(v) => setNovaAcao({ ...novaAcao, prioridade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={novaAcao.prazo}
                  onChange={(e) => setNovaAcao({ ...novaAcao, prazo: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaAcaoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarAcao}>
              Criar Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
