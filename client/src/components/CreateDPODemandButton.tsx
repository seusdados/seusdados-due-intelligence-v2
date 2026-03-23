/**
 * Componente Global: Botão "Criar Demanda DPO"
 * Permite consultores criarem demandas ativas para usuários clientes
 * Disponível em todas as páginas da interface de consultores
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Send, Loader2 } from "lucide-react";

// Temas/questões contextuais por tipo de contexto
const contextTopics: Record<string, { value: string; label: string }[]> = {
  contract: [
    { value: "clausula_compartilhamento", label: "Revisar cláusula de compartilhamento de dados" },
    { value: "clausula_retencao", label: "Definir período de retenção de dados" },
    { value: "clausula_seguranca", label: "Validar medidas de segurança" },
    { value: "clausula_incidentes", label: "Revisar procedimento de incidentes" },
    { value: "clausula_direitos", label: "Ajustar cláusula de direitos dos titulares" },
    { value: "clausula_suboperadores", label: "Autorizar suboperadores" },
    { value: "assinatura_contrato", label: "Assinar aditivo contratual LGPD" },
    { value: "outro_contrato", label: "Outro assunto relacionado ao contrato" },
  ],
  third_party: [
    { value: "documentacao_terceiro", label: "Enviar documentação de conformidade" },
    { value: "questionario_terceiro", label: "Responder questionário de due diligence" },
    { value: "evidencias_terceiro", label: "Fornecer evidências de segurança" },
    { value: "contrato_terceiro", label: "Revisar contrato com terceiro" },
    { value: "risco_terceiro", label: "Avaliar risco do terceiro" },
    { value: "outro_terceiro", label: "Outro assunto relacionado ao terceiro" },
  ],
  assessment: [
    { value: "responder_avaliacao", label: "Responder questionário de avaliação" },
    { value: "evidencias_avaliacao", label: "Anexar evidências" },
    { value: "corrigir_nao_conformidade", label: "Corrigir não conformidade identificada" },
    { value: "plano_acao", label: "Implementar plano de ação" },
    { value: "outro_avaliacao", label: "Outro assunto relacionado à avaliação" },
  ],
  mapping: [
    { value: "validar_mapeamento", label: "Validar mapeamento de dados" },
    { value: "completar_mapeamento", label: "Completar informações do mapeamento" },
    { value: "atualizar_mapeamento", label: "Atualizar mapeamento existente" },
    { value: "base_legal", label: "Confirmar base legal do tratamento" },
    { value: "outro_mapeamento", label: "Outro assunto relacionado ao mapeamento" },
  ],
  general: [
    { value: "treinamento", label: "Participar de treinamento LGPD" },
    { value: "politica", label: "Revisar política de privacidade" },
    { value: "consentimento", label: "Implementar gestão de consentimento" },
    { value: "incidente", label: "Reportar incidente de segurança" },
    { value: "direito_titular", label: "Atender solicitação de titular" },
    { value: "outro_geral", label: "Outro assunto" },
  ],
};

interface CreateDPODemandButtonProps {
  organizationId?: number;
  contextType?: "contract" | "third_party" | "assessment" | "mapping" | "general";
  contextId?: number;
  contextName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
}

export default function CreateDPODemandButton({
  organizationId,
  contextType = "general",
  contextId,
  contextName,
  variant = "default",
  size = "default",
  className = "",
  showIcon = true,
}: CreateDPODemandButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta" | "critica">("media");
  const [dueDate, setDueDate] = useState("");

  // Obter tópicos disponíveis para o contexto atual
  const availableTopics = contextTopics[contextType] || contextTopics.general;

  // Quando um tópico é selecionado, preencher o título automaticamente
  const handleTopicChange = (topicValue: string) => {
    setSelectedTopic(topicValue);
    const topic = availableTopics.find(t => t.value === topicValue);
    if (topic && !title) {
      setTitle(topic.label);
    }
  };

  const createDemandMutation = trpc.tickets.createDemandFromConsultor.useMutation({
    onSuccess: () => {
      toast.success("Demanda criada com sucesso! O cliente foi notificado.");
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao criar demanda: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedTopic("");
    setTitle("");
    setDescription("");
    setPriority("media");
    setDueDate("");
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Por favor, informe um título para a demanda");
      return;
    }

    if (!organizationId) {
      toast.error("Selecione uma organização antes de criar a demanda");
      return;
    }

    createDemandMutation.mutate({
      organizationId,
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || undefined,
      contextType,
      contextId,
      contextName,
    });
  };

  const getContextLabel = () => {
    switch (contextType) {
      case "contract":
        return "Análise de Contrato";
      case "third_party":
        return "Terceiro";
      case "assessment":
        return "Avaliação";
      case "mapping":
        return "Mapeamento";
      default:
        return "Geral";
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        {showIcon && <Send className="w-4 h-4 mr-2" />}
        Criar Demanda DPO
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-violet-600" />
              Criar Demanda Ativa para Cliente
            </DialogTitle>
            <DialogDescription>
              Crie uma tarefa ou atividade direcionada para o usuário cliente da organização selecionada.
              O cliente receberá uma notificação automática.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Contexto */}
            {contextType !== "general" && contextName && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                <p className="text-sm text-violet-700">
                  <strong>Contexto:</strong> {getContextLabel()} - {contextName}
                </p>
              </div>
            )}

            {/* Seletor de Tema/Questão */}
            <div className="space-y-2">
              <Label htmlFor="demand-topic">
                Tema da Demanda
              </Label>
              <Select value={selectedTopic} onValueChange={handleTopicChange}>
                <SelectTrigger id="demand-topic" className="w-full">
                  <SelectValue placeholder="Selecione um tema relacionado..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTopics.map((topic) => (
                    <SelectItem key={topic.value} value={topic.value}>
                      {topic.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecione um tema para vincular a demanda ao contexto atual
              </p>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="demand-title">
                Título da Demanda <span className="text-red-500">*</span>
              </Label>
              <Input
                id="demand-title"
                placeholder="Ex: Revisar cláusula de compartilhamento de dados"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/200 caracteres
              </p>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="demand-description">Descrição Detalhada</Label>
              <Textarea
                id="demand-description"
                placeholder="Descreva em detalhes a atividade que o cliente deve realizar..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/2000 caracteres
              </p>
            </div>

            {/* Prioridade e Prazo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demand-priority">Prioridade</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger id="demand-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="demand-duedate">Prazo (opcional)</Label>
                <Input
                  id="demand-duedate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              disabled={createDemandMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createDemandMutation.isPending}
              className="bg-gradient-to-r from-violet-600 to-purple-600"
            >
              {createDemandMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Criar Demanda
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
