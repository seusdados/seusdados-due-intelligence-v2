import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Loader2, Send, FileText, AlertCircle } from "lucide-react";

interface CriarDemandaDPOProps {
  sourceContext?: {
    module?: string;
    page?: string;
    entityId?: number;
    entityType?: string;
  };
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  buttonText?: string;
}

/**
 * Componente para DPO (admin/consultor) criar demandas ativas
 * para serem tratadas pela organização cliente
 */
export function CriarDemandaDPO({ 
  sourceContext,
  variant = "outline",
  buttonText = "Criar Demanda do DPO"
}: CriarDemandaDPOProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { selectedOrganization } = useOrganization();
  
  const [demanda, setDemanda] = useState({
    titulo: "",
    descricao: "",
    tipo: "acao_corretiva",
    prioridade: "media",
    prazo: "",
    observacoes: ""
  });

  // Mutation para criar ticket como demanda do DPO
  const createTicket = trpc.tickets.create.useMutation({
    onSuccess: () => {
      toast.success("Demanda criada com sucesso!", {
        description: "A organização será notificada sobre esta demanda."
      });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar demanda", {
        description: error.message
      });
    }
  });

  const resetForm = () => {
    setDemanda({
      titulo: "",
      descricao: "",
      tipo: "acao_corretiva",
      prioridade: "media",
      prazo: "",
      observacoes: ""
    });
  };

  const handleSubmit = async () => {
    if (!demanda.titulo.trim()) {
      toast.error("Preencha o título da demanda");
      return;
    }
    
    if (!selectedOrganization?.id) {
      toast.error("Selecione uma organização");
      return;
    }

    setIsSubmitting(true);
    
    // Construir descrição completa com contexto
    let descricaoCompleta = demanda.descricao;
    if (sourceContext) {
      descricaoCompleta += `\n\n---\n**Origem da Demanda:**\n`;
      if (sourceContext.module) descricaoCompleta += `- Módulo: ${sourceContext.module}\n`;
      if (sourceContext.page) descricaoCompleta += `- Página: ${sourceContext.page}\n`;
      if (sourceContext.entityType && sourceContext.entityId) {
        descricaoCompleta += `- Referência: ${sourceContext.entityType} #${sourceContext.entityId}\n`;
      }
    }
    if (demanda.observacoes) {
      descricaoCompleta += `\n**Observações do DPO:**\n${demanda.observacoes}`;
    }

    try {
      await createTicket.mutateAsync({
        organizationId: selectedOrganization.id,
        title: `[Demanda DPO] ${demanda.titulo}`,
        description: descricaoCompleta,
        ticketType: 'consultoria_geral' as const,
        priority: (demanda.prioridade || 'media') as 'baixa' | 'media' | 'alta' | 'critica',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tiposDemanda = [
    { value: "acao_corretiva", label: "Ação Corretiva" },
    { value: "acao_preventiva", label: "Ação Preventiva" },
    { value: "documentacao", label: "Documentação Pendente" },
    { value: "treinamento", label: "Treinamento Necessário" },
    { value: "revisao_processo", label: "Revisão de Processo" },
    { value: "adequacao_lgpd", label: "Adequação LGPD" },
    { value: "incidente", label: "Tratamento de Incidente" },
    { value: "outros", label: "Outros" }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className="gap-2">
          <Send className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            Criar Demanda do DPO
          </DialogTitle>
          <DialogDescription>
            Crie uma demanda ativa para a organização cliente tratar.
            {selectedOrganization && (
              <span className="block mt-1 font-medium text-foreground">
                Organização: {selectedOrganization.name}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!selectedOrganization ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <p className="text-muted-foreground">
              Selecione uma organização no seletor acima para criar uma demanda.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título da Demanda *</Label>
              <Input
                id="titulo"
                value={demanda.titulo}
                onChange={(e) => setDemanda({ ...demanda, titulo: e.target.value })}
                placeholder="Ex: Atualizar política de privacidade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={demanda.descricao}
                onChange={(e) => setDemanda({ ...demanda, descricao: e.target.value })}
                placeholder="Descreva o que precisa ser feito..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Demanda</Label>
                <Select
                  value={demanda.tipo}
                  onValueChange={(v) => setDemanda({ ...demanda, tipo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposDemanda.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={demanda.prioridade}
                  onValueChange={(v) => setDemanda({ ...demanda, prioridade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo para Conclusão</Label>
              <Input
                id="prazo"
                type="date"
                value={demanda.prazo}
                onChange={(e) => setDemanda({ ...demanda, prazo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações do DPO</Label>
              <Textarea
                id="observacoes"
                value={demanda.observacoes}
                onChange={(e) => setDemanda({ ...demanda, observacoes: e.target.value })}
                placeholder="Orientações adicionais para a organização..."
                rows={2}
              />
            </div>

            {sourceContext && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium text-muted-foreground mb-1">Contexto da Demanda:</p>
                <p className="text-xs text-muted-foreground">
                  {sourceContext.module && `Módulo: ${sourceContext.module}`}
                  {sourceContext.page && ` • Página: ${sourceContext.page}`}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedOrganization}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Criar Demanda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
