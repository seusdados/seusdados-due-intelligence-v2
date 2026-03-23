import { useState } from 'react';
import { ACTION_STATUS_COLORS, ACTION_STATUS_LABELS, ACTION_PRIORITY_COLORS, ACTION_PRIORITY_LABELS } from '@/lib/statusConstants';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ClipboardCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Building2,
  Calendar,
} from 'lucide-react';

type ValidationStatus = 'aguardando_validacao' | 'aguardando_nova_validacao' | 'em_validacao' | 'ajustes_solicitados' | 'concluida' | 'all';

interface ValidationPanelProps {
  onNavigateToAssessment?: (assessmentId: number) => void;
}

const STATUS_TABS: { key: ValidationStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: 'Todos', icon: <ClipboardCheck className="h-4 w-4" />, color: 'text-slate-600' },
  { key: 'aguardando_validacao', label: 'Aguardando', icon: <Clock className="h-4 w-4" />, color: 'text-amber-600' },
  { key: 'em_validacao', label: 'Em Validação', icon: <UserCheck className="h-4 w-4" />, color: 'text-blue-600' },
  { key: 'ajustes_solicitados', label: 'Ajustes', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-600' },
  { key: 'aguardando_nova_validacao', label: 'Nova Validação', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-indigo-600' },
  { key: 'concluida', label: 'Validadas', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600' },
];

const getStatusBadge = (status: string) => ({
  label: ACTION_STATUS_LABELS[status] ?? status,
  className: ACTION_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-200',
});

const getPriorityBadge = (priority: string) => ({
  label: ACTION_PRIORITY_LABELS[priority] ?? priority,
  className: ACTION_PRIORITY_COLORS[priority] ?? 'bg-gray-100 text-gray-600 border-gray-200',
});

export default function ValidationPanel({ onNavigateToAssessment }: ValidationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ValidationStatus>('aguardando_validacao');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const utils = trpc.useUtils();

  const { data: queue = [], isLoading, refetch } = trpc.assessments.getValidationQueue.useQuery(
    { statusFilter: activeTab },
    { refetchInterval: 30000 } // atualiza a cada 30s
  );

  const assumeMutation = trpc.assessments.assumeValidation.useMutation({
    onSuccess: () => {
      toast.success('Validação assumida. Você é o responsável por esta revisão.');
      utils.assessments.getValidationQueue.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const approveMutation = trpc.assessments.approveValidation.useMutation({
    onSuccess: () => {
      toast.success('Ação aprovada com sucesso.');
      setApproveDialogOpen(false);
      setApprovalNotes('');
      utils.assessments.getValidationQueue.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.assessments.rejectValidation.useMutation({
    onSuccess: () => {
      toast.success('Ajustes solicitados. O responsável será notificado.');
      setRejectDialogOpen(false);
      setRejectionReason('');
      utils.assessments.getValidationQueue.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Contar itens aguardando para exibir badge
  const { data: pendingQueue = [] } = trpc.assessments.getValidationQueue.useQuery(
    { statusFilter: 'aguardando_validacao' },
    { refetchInterval: 60000 }
  );
  const pendingCount = pendingQueue.length;

  const handleAssume = (actionId: number) => {
    assumeMutation.mutate({ actionId });
  };

  const handleApproveClick = (actionId: number) => {
    setSelectedActionId(actionId);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (actionId: number) => {
    setSelectedActionId(actionId);
    setRejectDialogOpen(true);
  };

  const handleApproveConfirm = () => {
    if (!selectedActionId) return;
    approveMutation.mutate({ actionId: selectedActionId, validationNotes: approvalNotes });
  };

  const handleRejectConfirm = () => {
    if (!selectedActionId || rejectionReason.length < 10) {
      toast.error('Informe o motivo da recusa (mínimo 10 caracteres)');
      return;
    }
    rejectMutation.mutate({ actionId: selectedActionId, rejectionReason });
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="mb-6">
      {/* Cabeçalho do painel — clicável para expandir/recolher */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-sm hover:from-violet-700 hover:to-indigo-700 transition-all"
      >
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-5 w-5" />
          <span className="font-semibold text-sm">Painel de Validação do Consultor</span>
          {pendingCount > 0 && (
            <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount} aguardando
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Conteúdo expansível */}
      {isExpanded && (
        <div className="border border-slate-200 rounded-b-xl bg-white shadow-sm -mt-1 pt-1">
          {/* Abas de status */}
          <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-slate-100 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white border border-b-white border-slate-200 text-violet-700 -mb-px'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className={activeTab === tab.key ? 'text-violet-600' : tab.color}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Lista de ações */}
          <div className="p-4 max-h-[480px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando fila de validação...</span>
              </div>
            ) : queue.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma ação nesta categoria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(queue as any[]).map((action) => {
                  const statusInfo = getStatusBadge(action.status);
                  const priorityInfo = getPriorityBadge(action.priority);
                  const isMyValidation = action.validatorId && action.status === 'em_validacao';

                  return (
                    <Card key={action.id} className="border border-slate-200 hover:border-violet-200 transition-colors">
                      <CardContent className="pt-4 pb-3 px-4">
                        {/* Linha 1: badges + organização */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
                              {statusInfo.label}
                            </Badge>
                            {action.priority && (
                              <Badge variant="outline" className={`text-xs ${priorityInfo.className}`}>
                                {priorityInfo.label}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                            <Building2 className="h-3 w-3" />
                            <span>{action.organizationName}</span>
                          </div>
                        </div>

                        {/* Título da ação */}
                        <p className="text-sm font-semibold text-slate-800 mb-1 line-clamp-2">
                          {action.title || 'Ação sem título'}
                        </p>

                        {/* Avaliação + datas */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                          <span className="font-mono">{action.assessmentCode}</span>
                          {action.submittedForValidationAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Enviado em {formatDate(action.submittedForValidationAt)}
                            </span>
                          )}
                          {action.validatorName && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <UserCheck className="h-3 w-3" />
                              {action.validatorName}
                            </span>
                          )}
                        </div>

                        {/* Observações do responsável */}
                        {action.observations && (
                          <div className="bg-slate-50 rounded-lg px-3 py-2 mb-2 text-xs text-slate-600 border border-slate-100">
                            <span className="font-medium text-slate-700">Observações: </span>
                            {action.observations}
                          </div>
                        )}

                        {/* Motivo de recusa anterior */}
                        {action.validationRejectionReason && action.status === 'ajustes_solicitados' && (
                          <div className="bg-orange-50 rounded-lg px-3 py-2 mb-2 text-xs text-orange-700 border border-orange-100">
                            <span className="font-medium">Motivo da recusa: </span>
                            {action.validationRejectionReason}
                          </div>
                        )}

                        {/* Notas de validação aprovada */}
                        {action.validationNotes && action.status === 'concluida' && (
                          <div className="bg-green-50 rounded-lg px-3 py-2 mb-2 text-xs text-green-700 border border-green-100">
                            <span className="font-medium">Nota do consultor: </span>
                            {action.validationNotes}
                          </div>
                        )}

                        {/* Botões de ação */}
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                          {action.status === 'aguardando_validacao' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleAssume(action.id)}
                              disabled={assumeMutation.isPending}
                            >
                              {assumeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserCheck className="h-3 w-3 mr-1" />}
                              Assumir Validação
                            </Button>
                          )}
                          {/* Nova validação após ajustes: aviso de reenvio */}
                          {action.status === 'aguardando_nova_validacao' && (
                            <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Reenviado após ajustes
                            </span>
                          )}
                          {(action.status === 'em_validacao' || action.status === 'aguardando_validacao' || action.status === 'aguardando_nova_validacao') && (
                            <>
                              <Button
                                size="sm"
                                className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApproveClick(action.id)}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-orange-200 text-orange-700 hover:bg-orange-50"
                                onClick={() => handleRejectClick(action.id)}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Solicitar Ajustes
                              </Button>
                            </>
                          )}
                          {onNavigateToAssessment && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 text-slate-500 hover:text-slate-700 ml-auto"
                              onClick={() => onNavigateToAssessment(action.assessmentId)}
                            >
                              Ver avaliação
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diálogo de Aprovação */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Aprovar Ação
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm text-slate-700 mb-2 block">
              Observações do consultor (opcional)
            </Label>
            <Textarea
              placeholder="Adicione comentários ou orientações finais para o responsável..."
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="resize-none h-24 text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApproveConfirm}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Recusa */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Solicitar Ajustes
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm text-slate-700 mb-2 block">
              Motivo e orientações para o responsável <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Descreva o que precisa ser ajustado e como o responsável deve proceder..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="resize-none h-28 text-sm"
            />
            {rejectionReason.length > 0 && rejectionReason.length < 10 && (
              <p className="text-xs text-red-500 mt-1">Mínimo de 10 caracteres.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending || rejectionReason.length < 10}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
              Solicitar Ajustes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
