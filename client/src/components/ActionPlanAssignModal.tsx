import { useState } from 'react';
import { ACTION_PRIORITY_COLORS, ACTION_PRIORITY_LABELS } from '@/lib/statusConstants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, User, FileText, AlertTriangle, CheckCircle, Clock, Ticket, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { SmartDPOButton } from './SmartDPOButton';

interface ActionPlanItem {
  id: number;
  title: string;
  description: string | null;
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  dueDate: string | null;
  actionCategory?: 'contratual' | 'operacional' | null;
  outputType?: string | null;
  linkedClauseId?: string | null;
  convertedToTicketId?: number | null;
  responsibleId?: number | null;
}

interface ActionPlanAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionPlanItem | null;
  organizationId: number;
  onSuccess?: () => void;
}

export function ActionPlanAssignModal({
  open,
  onOpenChange,
  action,
  organizationId,
  onSuccess,
}: ActionPlanAssignModalProps) {

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(action?.dueDate?.split('T')[0] || '');
  const [notes, setNotes] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);

  // Buscar usuários da organização
  const { data: usersData } = trpc.user.listByOrganization.useQuery(
    { organizationId },
    { enabled: open && organizationId > 0 }
  );

  // Mutation para converter em ticket
  const convertToTicketMutation = trpc.contractAnalysis.convertActionToTicket.useMutation({
    onSuccess: (data) => {
      toast.success('Ticket criado com sucesso', {
        description: data.message,
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Erro ao criar ticket', {
        description: error.message,
      });
    },
  });

  // Mutation para atualizar responsável
  const updateActionMutation = trpc.actionPlan.update.useMutation({
    onSuccess: () => {
      toast.success('Ação atualizada', {
        description: 'Responsável atribuído com sucesso',
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar ação', {
        description: error.message,
      });
    },
  });

  const handleAssign = () => {
    if (!action || !selectedUserId) return;
    
    updateActionMutation.mutate({
      id: action.id,
      responsibleId: parseInt(selectedUserId),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes: notes || undefined,
    });
  };

  const handleConvertToTicket = () => {
    if (!action) return;
    setIsConverting(true);
    
    convertToTicketMutation.mutate({
      actionPlanId: action.id,
      assignedToUserId: selectedUserId ? parseInt(selectedUserId) : undefined,
      dueDate: dueDate || undefined,
    });
  };

  const getPriorityBadge = (priority: string) => ACTION_PRIORITY_COLORS[priority] ?? 'bg-gray-100 text-gray-600 border-gray-200';

  const getCategoryBadge = (category: string | null | undefined) => {
    if (category === 'operacional') {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Atribuir Responsável
          </DialogTitle>
          <DialogDescription>
            Atribua um responsável para esta ação ou converta em ticket para acompanhamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Detalhes da Ação */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-sm">{action.title}</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={getPriorityBadge(action.priority)}>
                      {ACTION_PRIORITY_LABELS[action.priority] ?? action.priority}
                    </Badge>
                    <Badge variant="outline" className={getCategoryBadge(action.actionCategory)}>
                      {action.actionCategory === 'operacional' ? 'Operacional' : 'Contratual'}
                    </Badge>
                  </div>
                </div>
                
                {action.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {action.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {action.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Prazo: {new Date(action.dueDate).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  {action.outputType && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {action.outputType === 'clausula_contrato' ? 'Cláusula Contrato' :
                       action.outputType === 'clausula_aditivo' ? 'Cláusula Aditivo' :
                       action.outputType === 'acordo_tratamento_dados' ? 'Acordo DPA' :
                       'Tarefa Operacional'}
                    </span>
                  )}
                </div>

                {action.convertedToTicketId && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Já convertido em Ticket #{action.convertedToTicketId}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Formulário de Atribuição */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {usersData?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Prazo</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações ou instruções..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleAssign}
            disabled={!selectedUserId || updateActionMutation.isPending}
          >
            <User className="h-4 w-4 mr-2" />
            Apenas Atribuir
          </Button>

          {!action.convertedToTicketId && (
            <Button
              onClick={handleConvertToTicket}
              disabled={convertToTicketMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Ticket className="h-4 w-4 mr-2" />
              {convertToTicketMutation.isPending ? 'Criando...' : 'Converter em Ticket'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          <SmartDPOButton
            context={{
              module: 'Due Diligence',
              page: 'Plano de Ação',
              entityType: 'action_item',
              entityId: action.id,
              entityName: action.title,
              deepLink: `${window.location.pathname}#acao-${action.id}`,
              snapshot: {
                title: action.title,
                description: action.description,
                priority: action.priority,
                status: action.status,
                dueDate: action.dueDate,
                actionCategory: action.actionCategory,
              },
            }}
            variant="outline"
            size="sm"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
