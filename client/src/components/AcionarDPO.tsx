/**
 * Componente AcionarDPO - Botão global para abertura de tickets
 * 
 * Este componente permite que usuários de qualquer módulo abram um ticket
 * diretamente para o DPO, coletando automaticamente o contexto de origem.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Headphones, AlertTriangle, HelpCircle, FileText, Shield, Send, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

// Tipos de ticket disponíveis
const TICKET_TYPES = [
  { value: "solicitacao_titular", label: "Solicitação de Titular", icon: Shield, description: "Exercício de direitos LGPD (acesso, correção, exclusão)" },
  { value: "incidente_seguranca", label: "Incidente de Segurança", icon: AlertTriangle, description: "Vazamento de dados, acesso não autorizado" },
  { value: "duvida_juridica", label: "Dúvida Jurídica", icon: HelpCircle, description: "Interpretação de leis, compliance" },
  { value: "consultoria_geral", label: "Consultoria Geral", icon: Headphones, description: "Orientações sobre proteção de dados" },
  { value: "documentacao", label: "Documentação", icon: FileText, description: "Políticas, termos, contratos" }
];

// Prioridades
const PRIORITIES = [
  { value: "baixa", label: "Baixa", description: "Sem urgência, pode aguardar" },
  { value: "media", label: "Média", description: "Importante, mas não urgente" },
  { value: "alta", label: "Alta", description: "Requer atenção prioritária" },
  { value: "critica", label: "Crítica", description: "Urgente, impacto imediato" }
];

// Props do componente
interface AcionarDPOProps {
  // Contexto de origem (módulo, página, entidade)
  sourceContext?: {
    module?: string;
    page?: string;
    entityType?: string;
    entityId?: number;
    entityName?: string;
    additionalData?: Record<string, unknown>;
  };
  // Variante do botão
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  // Tamanho do botão
  size?: "default" | "sm" | "lg" | "icon";
  // Classe CSS adicional
  className?: string;
  // Texto do botão (opcional)
  buttonText?: string;
  // Mostrar apenas ícone
  iconOnly?: boolean;
  // Tipo de ticket pré-selecionado
  defaultTicketType?: string;
  // Prioridade pré-selecionada
  defaultPriority?: string;
  // Título pré-preenchido
  defaultTitle?: string;
  // Descrição pré-preenchida
  defaultDescription?: string;
  // Callback após criação do ticket
  onTicketCreated?: (ticketId: number) => void;
  // ✅ ID da organização (opcional - sobrescreve lógica de detecção automática)
  organizationId?: number;
}

export function AcionarDPO({
  sourceContext,
  variant = "default",
  size = "default",
  className = "",
  buttonText = "Acionar DPO",
  iconOnly = false,
  defaultTicketType = "consultoria_geral",
  defaultPriority = "media",
  defaultTitle = "",
  defaultDescription = "",
  onTicketCreated,
  organizationId: propOrganizationId
}: AcionarDPOProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [ticketType, setTicketType] = useState(defaultTicketType);
  const [priority, setPriority] = useState(defaultPriority);

  // ✅ Determinar organização - usar prop se fornecida, senão usar lógica automática
  const organizationId = propOrganizationId || selectedOrganization?.id || user?.organizationId;

  // Mutation para criar ticket
  const createTicketMutation = trpc.tickets.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Ticket #${data.id} criado com sucesso!`, {
        description: `SLA: ${data.slaLevel}. Você será notificado sobre atualizações.`,
        action: {
          label: "Ver Ticket",
          onClick: () => navigate(`/meudpo/${data.id}`)
        }
      });
      setIsOpen(false);
      resetForm();
      onTicketCreated?.(data.id);
    },
    onError: (error) => {
      toast.error(`Erro ao criar ticket: ${error.message}`);
    }
  });

  const resetForm = () => {
    setTitle(defaultTitle);
    setDescription(defaultDescription);
    setTicketType(defaultTicketType);
    setPriority(defaultPriority);
  };

  const handleSubmit = () => {
    if (!organizationId) {
      toast.error("Selecione uma organização primeiro");
      return;
    }

    if (!title.trim()) {
      toast.error("Informe um título para o ticket");
      return;
    }

    if (!description.trim()) {
      toast.error("Descreva sua solicitação");
      return;
    }

    createTicketMutation.mutate({
      organizationId,
      title: title.trim(),
      description: description.trim(),
      ticketType: ticketType as any,
      priority: priority as any,
      sourceContext: sourceContext ? {
        module: sourceContext.module,
        page: sourceContext.page,
        entityType: sourceContext.entityType,
        entityId: sourceContext.entityId,
        entityName: sourceContext.entityName,
        additionalData: sourceContext.additionalData
      } : undefined
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Headphones className="h-4 w-4" />
          {!iconOnly && <span className="ml-2">{buttonText}</span>}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            Acionar DPO
          </DialogTitle>
          <DialogDescription>
            Abra um chamado para o Encarregado de Proteção de Dados (DPO)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Contexto de Origem */}
          {sourceContext && (sourceContext.module || sourceContext.entityName) && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Contexto do Chamado</p>
                    <div className="text-muted-foreground mt-1 space-y-0.5">
                      {sourceContext.module && <p>Módulo: {sourceContext.module}</p>}
                      {sourceContext.page && <p>Página: {sourceContext.page}</p>}
                      {sourceContext.entityType && sourceContext.entityName && (
                        <p>{sourceContext.entityType}: {sourceContext.entityName}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tipo de Ticket */}
          <div className="grid gap-2">
            <Label>Tipo de Solicitação</Label>
            <Select value={ticketType} onValueChange={setTicketType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {TICKET_TYPES.find(t => t.value === ticketType)?.description}
            </p>
          </div>

          {/* Título */}
          <div className="grid gap-2">
            <Label htmlFor="ticket-title">Título</Label>
            <Input
              id="ticket-title"
              placeholder="Descreva brevemente o assunto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Descrição */}
          <div className="grid gap-2">
            <Label htmlFor="ticket-description">Descrição</Label>
            <Textarea
              id="ticket-description"
              placeholder="Descreva detalhadamente sua solicitação, incluindo todas as informações relevantes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Prioridade */}
          <div className="grid gap-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {PRIORITIES.find(p => p.value === priority)?.description}
            </p>
          </div>

          {/* Aviso de Incidente */}
          {ticketType === "incidente_seguranca" && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Incidente de Segurança</p>
                    <p className="mt-1">
                      Este tipo de chamado será tratado com prioridade máxima. 
                      Inclua todas as informações disponíveis sobre o incidente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || createTicketMutation.isPending}
            className="gap-2"
          >
            {createTicketMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Chamado
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Botão flutuante para acionar DPO
 * Pode ser adicionado em qualquer página
 */
export function AcionarDPOFloating(props: Omit<AcionarDPOProps, "variant" | "size" | "className">) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AcionarDPO
        {...props}
        variant="default"
        size="lg"
        className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
      />
    </div>
  );
}

/**
 * Botão compacto para header/toolbar
 */
export function AcionarDPOCompact(props: Omit<AcionarDPOProps, "variant" | "size">) {
  return (
    <AcionarDPO
      {...props}
      variant="outline"
      size="sm"
    />
  );
}

export default AcionarDPO;
