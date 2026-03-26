/**
 * ActionPlanTab - Componente compartilhado para aba Plano de Ação
 * Utilizado tanto no ConsultantPanel (Avaliação de Maturidade) quanto no ContractAnalysisDetail (Análise de Contratos)
 * Garante paridade visual e funcional entre os módulos, mantendo dados isolados.
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  ClipboardList, Sparkles, Edit, ChevronDown, Calendar,
  MessageSquare, X, Check, Clock, Upload, Trash2, UserPlus,
  Paperclip, Eye, Loader2, RefreshCw, FileText, Database, AlertTriangle,
  Star, User, UserX, History, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { ACTION_STATUS_COLORS, ACTION_STATUS_LABELS, ACTION_PRIORITY_COLORS, ACTION_PRIORITY_LABELS } from "@/lib/statusConstants";

// ==================== SUBCOMPONENTE: HISTÓRICO DE OBSERVAÇÕES ====================
function ObservationsHistory({ actionPlanId, isExpanded, readOnly = false }: { actionPlanId: number; isExpanded: boolean; readOnly?: boolean }) {
  const [newText, setNewText] = useState('');
  const utils = trpc.useUtils();
  const { data: observations, isLoading } = trpc.actionPlan.listObservations.useQuery(
    { actionPlanId },
    { enabled: isExpanded && actionPlanId > 0 }
  );
  const addMutation = trpc.actionPlan.addObservation.useMutation({
    onSuccess: () => {
      setNewText('');
      utils.actionPlan.listObservations.invalidate({ actionPlanId });
      toast.success('Observação registrada com sucesso');
    },
    onError: (err) => toast.error(`Erro ao registrar observação: ${err.message}`),
  });

  const roleLabel: Record<string, string> = {
    admin_global: 'Admin',
    consultor: 'Consultor',
    sponsor: 'Sponsor',
    comite: 'Comitê',
    lider_processo: 'Líder',
    gestor_area: 'Gestor',
    respondente: 'Respondente',
  };

  const formatDate = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleDateString('pt-BR') + ' — ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-3">
      {/* Campo para nova observação */}
      {!readOnly && (
      <div className="space-y-2">
        <Textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Adicione uma nova observação de andamento..."
          rows={3}
          className="text-sm border-slate-200 resize-none"
        />
        <Button
          size="sm"
          className="bg-violet-500 hover:bg-violet-600 text-white"
          disabled={!newText.trim() || addMutation.isPending}
          onClick={() => addMutation.mutate({ actionPlanId, text: newText.trim() })}
        >
          {addMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
          Salvar atualização
        </Button>
      </div>
      )}
      {/* Histórico */}
      {isLoading ? (
        <p className="text-xs text-slate-400">Carregando histórico...</p>
      ) : observations && observations.length > 0 ? (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Histórico</p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {observations.map((obs) => (
              <div key={obs.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-violet-700">{obs.userName}</span>
                  <span className="text-xs text-slate-400">{roleLabel[obs.userRole] || obs.userRole}</span>
                  <span className="text-xs text-slate-400 ml-auto">{formatDate(obs.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{obs.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Nenhuma observação registrada ainda.</p>
      )}
    </div>
  );
}

// ==================== SUBCOMPONENTE: HISTÓRICO DA AÇÃO (TIMELINE) ====================
function ActionHistorySection({ actionPlanId, isExpanded }: { actionPlanId: number; isExpanded: boolean }) {
  const { data: history, isLoading } = trpc.actionPlan.getHistory.useQuery(
    { actionPlanId },
    { enabled: isExpanded && actionPlanId > 0 }
  );

  const changeTypeLabel: Record<string, string> = {
    atribuicao: 'Atribuição',
    status: 'Mudança de Status',
    prazo: 'Alteração de Prazo',
    envio_validacao: 'Envio para Validação',
    aprovacao: 'Aprovação da Ação',
    rejeicao: 'Solicitação de Ajustes',
    transferencia: 'Transferência de Consultor',
    aceite: 'Aceite da Ação',
    recusa: 'Recusa da Ação',
    conclusao: 'Conclusão da Ação',
  };

  const changeTypeIcon: Record<string, React.ReactNode> = {
    atribuicao: <User className="w-3 h-3" />,
    status: <ArrowRight className="w-3 h-3" />,
    prazo: <Calendar className="w-3 h-3" />,
    envio_validacao: <Clock className="w-3 h-3" />,
    aprovacao: <Check className="w-3 h-3" />,
    rejeicao: <X className="w-3 h-3" />,
    transferencia: <UserPlus className="w-3 h-3" />,
    aceite: <Check className="w-3 h-3" />,
    recusa: <X className="w-3 h-3" />,
    conclusao: <Check className="w-3 h-3" />,
  };

  const changeTypeColor: Record<string, string> = {
    atribuicao: 'bg-blue-100 text-blue-700',
    status: 'bg-slate-100 text-slate-700',
    prazo: 'bg-amber-100 text-amber-700',
    envio_validacao: 'bg-violet-100 text-violet-700',
    aprovacao: 'bg-green-100 text-green-700',
    rejeicao: 'bg-red-100 text-red-700',
    transferencia: 'bg-cyan-100 text-cyan-700',
    aceite: 'bg-green-100 text-green-700',
    recusa: 'bg-red-100 text-red-700',
    conclusao: 'bg-emerald-100 text-emerald-700',
  };

  const formatDate = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isExpanded) return null;

  return (
    <div className="px-4 pb-4 pt-2 border-t">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Histórico da Ação</p>
        {history && history.length > 0 && (
          <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{history.length} {history.length === 1 ? 'evento' : 'eventos'}</span>
        )}
      </div>
      {isLoading ? (
        <p className="text-xs text-slate-400">Carregando histórico...</p>
      ) : history && history.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {history.map((h: any) => (
            <div key={h.id} className="flex gap-3 items-start">
              <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${changeTypeColor[h.changeType] || 'bg-slate-100 text-slate-500'}`}>
                {changeTypeIcon[h.changeType] || <History className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">{changeTypeLabel[h.changeType] || h.changeType}</span>
                  {h.changedByName && <span className="text-xs text-slate-400">{h.changedByName}</span>}
                  <span className="text-xs text-slate-400 ml-auto">{formatDate(h.createdAt)}</span>
                </div>
                {h.notes && <p className="text-xs text-slate-600 mt-0.5">{h.notes}</p>}
                {(h.previousValue || h.newValue) && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {h.previousValue && <span className="line-through mr-1">{h.previousValue}</span>}
                    {h.previousValue && h.newValue && <ArrowRight className="w-3 h-3 inline mx-1" />}
                    {h.newValue && <span className="text-slate-600">{h.newValue}</span>}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Nenhum evento registrado ainda.</p>
      )}
    </div>
  );
}

// ==================== SUBCOMPONENTE: LISTA DE EVIDÊNCIAS ====================
function ActionEvidencesList({ actionPlanId, isExpanded }: { actionPlanId: number; isExpanded: boolean }) {
  const { data: evidences, isLoading } = trpc.actionPlan.getActionEvidences.useQuery(
    { actionPlanId },
    { enabled: isExpanded && actionPlanId > 0 }
  );

  if (!isExpanded) return null;
  if (isLoading) return (
    <div className="px-4 pb-3 pt-2 border-t">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin" /> Carregando evidências...
      </div>
    </div>
  );
  if (!evidences || evidences.length === 0) return (
    <div className="px-4 pb-3 pt-2 border-t">
      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <Paperclip className="w-3 h-3" /> Nenhuma evidência anexada ainda
      </p>
    </div>
  );

  return (
    <div className="px-4 pb-3 pt-2 border-t">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Paperclip className="w-3 h-3" /> Evidências Anexadas ({evidences.length})
      </p>
      <div className="space-y-1.5">
        {evidences.map((ev: any) => (
          <div key={ev.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate text-slate-700">{ev.documentName || ev.fileName || 'Documento'}</p>
                <p className="text-xs text-slate-400">
                  {ev.addedByName ? `Enviado por ${ev.addedByName}` : 'Enviado'}
                  {ev.createdAt ? ` · ${new Date(ev.createdAt).toLocaleDateString('pt-BR')}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {ev.fileUrl && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                    <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer" title="Visualizar">
                      <Eye className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                    <a href={ev.fileUrl} download={ev.fileName || ev.documentName || 'evidencia'} title="Baixar">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== TIPOS ====================
interface ActionPlanTabProps {
  /** Tipo da avaliação: 'compliance' para Maturidade, 'contract_analysis' para Contratos */
  assessmentType: 'compliance' | 'third_party' | 'contract_analysis';
  /** ID da avaliação */
  assessmentId: number;
  /** ID da organização */
  organizationId: number;
  /** Se o usuário é interno (admin/consultor) */
  isInternal: boolean;
  /** Ações existentes (já carregadas pelo componente pai) */
  actions: any[];
  /** Callback para recarregar ações */
  onRefreshActions: () => void;
  /** Se deve mostrar o botão de gerar plano */
  showGenerateButton?: boolean;
  /** Callback para gerar plano de ação */
  onGeneratePlan?: () => void;
  /** Se a geração está em andamento */
  isGenerating?: boolean;
  /** Callback para refinar ação com IA */
  onRefineAction?: (actionId: number, instruction: string) => void;
  /** Se o refinamento está em andamento */
  isRefining?: boolean;
  /** Componentes extras no header (ex: botão XAI) */
  headerExtra?: React.ReactNode;
  /** ID da ação a destacar e rolar até (vindo da URL via ?actionId=) */
  highlightedActionId?: number | null;
}

// ==================== CONSTANTES ====================
const PRIORITY_COLORS: Record<string, string> = {
  critica: 'border-l-red-500',
  alta: 'border-l-orange-500',
  media: 'border-l-yellow-500',
  baixa: 'border-l-blue-500',
  // Compat inglês
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
};

const PRIORITY_LABELS: Record<string, string> = {
  critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa',
  critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa',
};

// PRIORITY_BADGE_COLORS agora usa as constantes compartilhadas (ACTION_PRIORITY_COLORS)
const PRIORITY_BADGE_COLORS: Record<string, string> = {
  ...ACTION_PRIORITY_COLORS,
  critical: ACTION_PRIORITY_COLORS.critica,
  high: ACTION_PRIORITY_COLORS.alta,
  medium: ACTION_PRIORITY_COLORS.media,
  low: ACTION_PRIORITY_COLORS.baixa,
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente', em_andamento: 'Em Andamento',
  concluida_cliente: 'Concluída (Cliente)', pendente_validacao_dpo: 'Aguardando Validação',
  concluida: 'Concluída', cancelada: 'Cancelada', recusada_cliente: 'Recusada',
  aguardando_validacao: 'Aguardando Validação',
  aguardando_nova_validacao: 'Aguardando Nova Validação',
  em_validacao: 'Em Validação',
  ajustes_solicitados: 'Ajustes Solicitados',
  // Compat inglês
  pending: 'Pendente', in_progress: 'Em Andamento',
  completed: 'Concluída', rejected: 'Recusada',
};

// STATUS_BADGE_COLORS agora usa as constantes compartilhadas (ACTION_STATUS_COLORS)
const STATUS_BADGE_COLORS: Record<string, string> = {
  ...ACTION_STATUS_COLORS,
  recusada_cliente: 'bg-red-100 text-red-800 border-red-200',
  pending: ACTION_STATUS_COLORS.pendente,
  in_progress: ACTION_STATUS_COLORS.em_andamento,
  completed: ACTION_STATUS_COLORS.concluida,
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

// ==================== STATUS SIMPLIFICADO PARA CLIENTE ====================
/** Traduz status técnico interno para rótulo simplificado visível ao cliente */
function getClientStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    in_progress: 'Em andamento',
    concluida_cliente: 'Enviado para validação',
    aguardando_validacao: 'Enviado para validação',
    aguardando_nova_validacao: 'Reenviado após ajustes',
    em_validacao: 'Enviado para validação',
    pendente_validacao_dpo: 'Enviado para validação',
    ajustes_solicitados: 'Ajustando',
    concluida: 'Concluído',
    completed: 'Concluído',
    cancelada: 'Cancelada',
    recusada_cliente: 'Recusada',
    rejected: 'Recusada',
  };
  return map[status] || status;
}

/** Retorna as classes CSS do badge para o status simplificado do cliente */
function getClientStatusBadgeColors(status: string): string {
  if (['pendente', 'pending'].includes(status)) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (['em_andamento', 'in_progress'].includes(status)) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (['concluida_cliente', 'aguardando_validacao', 'em_validacao', 'pendente_validacao_dpo'].includes(status)) return 'bg-violet-100 text-violet-800 border-violet-200';
  if (['aguardando_nova_validacao'].includes(status)) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  if (['ajustes_solicitados'].includes(status)) return 'bg-orange-100 text-orange-800 border-orange-200';
  if (['concluida', 'completed'].includes(status)) return 'bg-green-100 text-green-800 border-green-200';
  if (['cancelada', 'recusada_cliente', 'rejected'].includes(status)) return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

/** Normaliza status para o formato do banco (português) */
function normalizeStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'pendente',
    in_progress: 'em_andamento',
    completed: 'concluida',
    rejected: 'recusada_cliente',
  };
  return map[status] || status;
}

/** Verifica se o status indica que a ação foi aceita */
function isAccepted(status: string): boolean {
  return ['em_andamento', 'in_progress', 'concluida_cliente', 'concluida', 'completed', 'pendente_validacao_dpo', 'aguardando_validacao', 'aguardando_nova_validacao', 'em_validacao', 'ajustes_solicitados'].includes(status);
}

/** Verifica se o status é pendente */
function isPending(status: string): boolean {
  return ['pendente', 'pending'].includes(status);
}

/** Verifica se a ação está atrasada */
function isOverdue(action: any): boolean {
  if (!action.dueDate) return false;
  return new Date(action.dueDate) < new Date() && !['concluida', 'concluida_cliente', 'completed', 'cancelada'].includes(action.status);
}

// ==================== COMPONENTE PRINCIPAL ====================
export function ActionPlanTab({
  assessmentType,
  assessmentId,
  organizationId,
  isInternal,
  actions,
  onRefreshActions,
  showGenerateButton = false,
  onGeneratePlan,
  isGenerating = false,
  onRefineAction,
  isRefining = false,
  headerExtra,
  highlightedActionId,
}: ActionPlanTabProps) {
  const { user } = useAuth();
  // Controle de permissões por perfil
  const isSponsor = user?.role === 'sponsor';
  const isAdminGlobal = user?.role === 'admin_global';
  const isConsultor = user?.role === 'consultor';
  const isComite = user?.role === 'comite';
  // Sponsor, Admin Global e Consultor podem vincular/alterar responsável
  const canAssignResponsible = isSponsor || isAdminGlobal || isConsultor;
  // Admin Global, Sponsor e Comitê podem editar prazo
  const canEditDueDate = isAdminGlobal || isSponsor || isComite;
  // Helper: verifica se o usuário é o responsável vinculado a uma ação específica
  const isResponsibleFor = (action: any) => action.responsibleId === user?.id;

  // ==================== ESTADOS ====================
  const [expandedActions, setExpandedActions] = useState<Set<number>>(
    highlightedActionId ? new Set([highlightedActionId]) : new Set()
  );
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  // Scroll automático até a ação destacada quando a página carrega
  useEffect(() => {
    if (!highlightedActionId) return;
    const timer = setTimeout(() => {
      if (highlightedRef.current) {
        highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [highlightedActionId]);
  const [rejectingActionId, setRejectingActionId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editingObservations, setEditingObservations] = useState<Record<number, string>>({});
  const [editingStatus, setEditingStatus] = useState<Record<number, string>>({});
  const [refineInputs, setRefineInputs] = useState<Record<number, string | undefined>>({});
  const [editingAction, setEditingAction] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedActionForEvidence, setSelectedActionForEvidence] = useState<any>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceTab, setEvidenceTab] = useState<'upload' | 'ged'>('upload');
  const [gedBrowseFolderId, setGedBrowseFolderId] = useState<number | null>(null);
  const [gedBreadcrumb, setGedBreadcrumb] = useState<{ id: number | null; name: string }[]>([{ id: null, name: 'Raiz' }]);


  // ==================== QUERIES ====================
  const { data: orgUsers } = trpc.user.listByOrganization.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: actionEvidences, refetch: refetchEvidences } = trpc.actionPlan.getActionEvidences.useQuery(
    { actionPlanId: selectedActionForEvidence?.id || 0 },
    { enabled: !!selectedActionForEvidence?.id }
  );

  const { data: gedFolders } = trpc.actionPlan.listGedFoldersForEvidence.useQuery(
    { organizationId, parentFolderId: gedBrowseFolderId },
    { enabled: !!organizationId && evidenceTab === 'ged' && evidenceModalOpen }
  );

  const { data: gedDocuments } = trpc.actionPlan.listGedDocumentsForEvidence.useQuery(
    { organizationId, folderId: gedBrowseFolderId || undefined },
    { enabled: !!organizationId && evidenceTab === 'ged' && evidenceModalOpen }
  );

  // ==================== MUTATIONS ====================
  const updateActionMutation = trpc.actionPlan.update.useMutation({
    onSuccess: () => { toast.success('Ação atualizada com sucesso'); onRefreshActions(); },
    onError: (err) => toast.error(`Erro ao atualizar: ${err.message}`),
  });

  const acceptActionMutation = trpc.actionPlan.update.useMutation({
    onSuccess: () => { toast.success('Ação aceita com sucesso'); onRefreshActions(); },
    onError: (err) => toast.error(`Erro ao aceitar: ${err.message}`),
  });

  const rejectActionMutation = trpc.actionPlan.rejectByClient.useMutation({
    onSuccess: () => {
      toast.success('Ação recusada com justificativa registrada');
      setRejectingActionId(null);
      setRejectReason('');
      onRefreshActions();
    },
    onError: (err) => toast.error(`Erro ao recusar: ${err.message}`),
  });

  const assignResponsibleMutation = trpc.actionPlan.assignResponsible.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Responsável ${data.responsibleName} atribuído e notificado por e-mail`);
      onRefreshActions();
    },
    onError: (err) => toast.error(`Erro ao atribuir responsável: ${err.message}`),
  });

  const updateObservationsMutation = trpc.actionPlan.update.useMutation({
    onSuccess: () => { toast.success('Observações salvas'); onRefreshActions(); },
    onError: (err) => toast.error(`Erro ao salvar observações: ${err.message}`),
  });
  const submitForValidationMutation = trpc.assessments.submitActionForValidation.useMutation({
    onSuccess: () => {
      toast.success('Ação enviada para validação. Os consultores serão notificados.');
      onRefreshActions();
    },
    onError: (err) => toast.error(`Erro ao enviar para validação: ${err.message}`),
  });

  const uploadEvidenceMutation = trpc.actionPlan.uploadEvidence.useMutation({
    onSuccess: () => {
      toast.success('Evidência enviada e salva no GED');
      setEvidenceFile(null);
      setEvidenceDescription('');
      refetchEvidences();
      onRefreshActions();
    },
    onError: (err) => toast.error(`Erro ao enviar: ${err.message}`),
  });

  const removeEvidenceMutation = trpc.actionPlan.removeEvidence.useMutation({
    onSuccess: () => { toast.success('Evidência removida'); refetchEvidences(); },
    onError: (err) => toast.error(`Erro ao remover: ${err.message}`),
  });

  const linkGedDocumentMutation = trpc.actionPlan.linkGedDocument.useMutation({
    onSuccess: () => { toast.success('Documento vinculado como evidência'); refetchEvidences(); },
    onError: (err) => toast.error(`Erro ao vincular: ${err.message}`),
  });

  const [deletingActionId, setDeletingActionId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const deleteActionMutation = trpc.assessments.deleteActionPlanItem.useMutation({
    onSuccess: () => {
      toast.success('Ação excluída com sucesso');
      setConfirmDeleteId(null);
      setDeletingActionId(null);
      onRefreshActions();
    },
    onError: (err) => {
      toast.error(`Erro ao excluir: ${err.message}`);
      setDeletingActionId(null);
    },
  });

  // ==================== INDICADORES ====================
  const stats = useMemo(() => {
    const items = actions || [];
    const total = items.length;
    const pendentes = items.filter((a: any) => isPending(a.status)).length;
    const emAndamento = items.filter((a: any) => ['em_andamento', 'in_progress'].includes(a.status)).length;
    const concluidas = items.filter((a: any) => ['concluida', 'concluida_cliente', 'completed'].includes(a.status)).length;
    const atrasadas = items.filter((a: any) => isOverdue(a)).length;
    return { total, pendentes, emAndamento, concluidas, atrasadas };
  }, [actions]);

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b" style={{ background: '#f8f5ff' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
                <ClipboardList className="h-4 w-4" style={{ color: '#ffffff' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e1b4b', lineHeight: 1.3 }}>Plano de Ação</div>
                <div style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '2px' }}>Ações de mitigação para os riscos identificados</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {headerExtra}
              {showGenerateButton && (isInternal || isSponsor) && actions.length === 0 && (
                <Button
                  onClick={onGeneratePlan}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                  ) : (
                    <><ClipboardList className="w-4 h-4 mr-2" />Gerar Plano de Ação</>
                  )}
                </Button>
              )}

            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {actions.length > 0 ? (
            <div className="space-y-4">
              {/* Indicadores de Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="p-4 bg-violet-50 rounded-lg text-center">
                  <p className="text-2xl font-light text-violet-700">{stats.total}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg text-center">
                  <p className="text-2xl font-light text-amber-700">{stats.pendentes}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-light text-blue-700">{stats.emAndamento}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Em Andamento</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-light text-green-700">{stats.concluidas}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Concluídas</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className={`text-2xl font-light ${stats.atrasadas > 0 ? 'text-red-700' : 'text-gray-400'}`}>{stats.atrasadas}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Atrasadas</p>
                </div>
              </div>

              {/* Lista de Ações */}
              <div className="space-y-3">
                {actions.map((action: any, index: number) => {
                  const expanded = expandedActions.has(action.id);
                  const overdue = isOverdue(action);
                  const actionIsPending = isPending(action.status);
                  const actionIsAccepted = isAccepted(action.status);
                  const hasResponsible = !!action.responsibleId;
                  // Vínculo do usuário logado com esta ação (funciona para todos os perfis)
                  const isMyAction = !!user?.id && action.responsibleId === user.id;
                  const isOtherResponsible = !!action.responsibleId && action.responsibleId !== user?.id;
                  const isUnassigned = !action.responsibleId;
                  // Permissão de interação: interno, sponsor ou responsável vinculado
                  const canInteract = isInternal || isSponsor || isMyAction;

                  // === PARSER DE CONTEÚDO: detecta formato novo (LLM) e formato antigo ===
                  const rawDesc = action.description || '';
                  // Formato novo: gerado pelo LLM com marcadores estruturados
                  const newRecursosMatch = rawDesc.match(/\n\nRecursos necessários:\s*([\s\S]*?)(?=\n\nCritério de sucesso:|$)/);
                  const newCriterioMatch = rawDesc.match(/\n\nCritério de sucesso:\s*([\s\S]*)$/);
                  const newMainDesc = rawDesc.replace(/\n\nRecursos necessários:[\s\S]*$/, '').trim();
                  const isNewFormat = !!(newRecursosMatch || newCriterioMatch);
                  // Formato antigo: texto com "Titulo da Ação:", "Descrição:", etc.
                  const oldTitleMatch = rawDesc.match(/T[ií]tulo da Ação:\s*([^\n]+)/);
                  const oldDescMatch = rawDesc.match(/Descrição:\s*([\s\S]*?)(?=Área\/Dom[ií]nio:|Recursos:|Crit[eé]rios?|$)/);
                  const oldAreaMatch = rawDesc.match(/Área\/Dom[ií]nio:\s*([^\n]+)/);
                  const oldRecursosMatch = rawDesc.match(/Recursos:\s*([\s\S]*?)(?=Crit[eé]rios?|$)/);
                  const oldCriterioMatch = rawDesc.match(/Crit[eé]rios? de sucesso:\s*([\s\S]*)$/);
                  const isOldFormat = !!(oldTitleMatch || oldDescMatch);
                  // Extrair conteúdo limpo conforme formato detectado
                  const cleanTitle = isOldFormat ? (oldTitleMatch?.[1]?.trim() || action.title) : action.title;
                  const cleanDesc = isOldFormat
                    ? (oldDescMatch?.[1]?.trim() || rawDesc)
                    : (isNewFormat ? newMainDesc : rawDesc);
                  const cleanArea = isOldFormat ? oldAreaMatch?.[1]?.trim() : undefined;
                  const cleanRecursos = isOldFormat ? oldRecursosMatch?.[1]?.trim() : newRecursosMatch?.[1]?.trim();
                  const cleanCriterio = isOldFormat ? oldCriterioMatch?.[1]?.trim() : newCriterioMatch?.[1]?.trim();

                  return (
                    <div
                      key={action.id}
                      ref={highlightedActionId === action.id ? highlightedRef : undefined}
                    >
                    <Card
                      className={`border-l-4 cursor-pointer hover:shadow-md transition-all ${
                        PRIORITY_COLORS[action.priority] || 'border-l-blue-500'
                      } ${expanded ? 'ring-2 ring-violet-400 shadow-md' : ''} ${
                        (!isInternal && isMyAction) ? 'ring-1 ring-violet-300 bg-violet-50/30' : ''
                      } ${highlightedActionId === action.id ? 'ring-2 ring-violet-500 shadow-lg bg-violet-50/40' : ''}`}
                      onClick={() => {
                        const next = new Set(expandedActions);
                        if (expanded) next.delete(action.id); else next.add(action.id);
                        setExpandedActions(next);
                      }}
                    >
                      <CardContent className="p-0">
                        {/* === CABEÇALHO DO CARD (sempre visível) === */}
                        <div className="px-4 pt-4 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Faixa de vínculo do usuário logado (apenas para perfis cliente) */}
                              {isMyAction && (
                                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-violet-600 text-white rounded-md w-fit">
                                  <Star className="w-3 h-3 fill-white" />
                                  <span className="text-xs font-semibold tracking-wide">Vinculada a você</span>
                                </div>
                              )}
                              {isOtherResponsible && (
                                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-slate-100 text-slate-600 rounded-md w-fit border border-slate-200">
                                  <User className="w-3 h-3" />
                                  <span className="text-xs font-medium">Responsável: {action.responsibleName || 'Não identificado'}</span>
                                </div>
                              )}
                              {isUnassigned && (
                                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-amber-50 text-amber-700 rounded-md w-fit border border-amber-200">
                                  <UserX className="w-3 h-3" />
                                  <span className="text-xs font-medium">Sem responsável definido</span>
                                </div>
                              )}
                              {/* Linha de badges */}
                              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                <span className="text-xs font-mono text-slate-400">
                                  #{String(index + 1).padStart(2, '0')}
                                </span>
                                <Badge className={`text-xs px-2 py-0.5 ${PRIORITY_BADGE_COLORS[action.priority] || 'bg-gray-100'}`}>
                                  {PRIORITY_LABELS[action.priority] || action.priority}
                                </Badge>
                                <Badge className={`text-xs px-2 py-0.5 ${isInternal ? (STATUS_BADGE_COLORS[action.status] || 'bg-gray-100') : getClientStatusBadgeColors(action.status)}`}>
                                  {isInternal ? (STATUS_LABELS[action.status] || action.status) : getClientStatusLabel(action.status)}
                                </Badge>
                                {overdue && (
                                  <Badge variant="destructive" className="text-xs px-2 py-0.5">Atrasada</Badge>
                                )}
                              </div>
                              {/* Título limpo (sem repetição do formato antigo) */}
                              <h4 className="font-semibold text-sm text-slate-800 leading-snug">{cleanTitle}</h4>
                              {/* Metadados compactos em linha */}
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {action.dueDate && (
                                  <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                    <Clock className="w-3 h-3" />
                                    {new Date(action.dueDate).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                                {action.responsibleName && (
                                  <span className={`text-xs flex items-center gap-1 ${
                                    isMyAction
                                      ? 'text-violet-700 font-semibold'
                                      : 'text-slate-400'
                                  }`}>
                                    <UserPlus className="w-3 h-3" />
                                    {isMyAction ? 'Você' : action.responsibleName}
                                  </span>
                                )}
                                {isUnassigned && (
                                  <span className="text-xs flex items-center gap-1 text-amber-500">
                                    <UserX className="w-3 h-3" />
                                    A definir
                                  </span>
                                )}
                                {cleanArea && (
                                  <span className="text-xs text-slate-400 italic">{cleanArea}</span>
                                )}
                              </div>
                            </div>
                            {/* Botões de ação + chevron */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isInternal && (
                                confirmDeleteId === action.id ? (
                                  <div
                                    className="flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="text-xs text-red-600 font-medium">Confirmar exclusão?</span>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-6 px-2 text-xs"
                                      disabled={deletingActionId === action.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingActionId(action.id);
                                        deleteActionMutation.mutate({ actionId: action.id });
                                      }}
                                    >
                                      {deletingActionId === action.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        'Sim, excluir'
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs"
                                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                    title="Excluir ação"
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(action.id); }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )
                              )}
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {/* Justificativa de Recusa - visível no cabeçalho */}
                          {/* Banner de Ajustes Solicitados pelo Consultor */}
                          {action.status === 'ajustes_solicitados' && (
                              <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Ajustes Solicitados pelo Consultor</p>
                                    {action.validationRejectionReason && (
                                      <p className="text-sm text-orange-800 whitespace-pre-wrap mb-2">{action.validationRejectionReason}</p>
                                    )}
                                    {action.validatorName && (
                                      <p className="text-xs text-orange-500 mb-3">Solicitado por: {action.validatorName}</p>
                                    )}
                                    {/* Botão de reenvio direto no banner — visível sem expandir */}
                                    {canInteract && (isResponsibleFor(action) || isInternal) && (
                                      <Button
                                        size="sm"
                                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7 px-3"
                                        disabled={submitForValidationMutation.isPending}
                                        onClick={() => {
                                          submitForValidationMutation.mutate({ actionId: action.id });
                                        }}
                                      >
                                        {submitForValidationMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />} Reenviar para Validação
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          {(action.status === 'recusada_cliente' || action.status === 'rejected') && action.clientRejectionReason && (
                              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Justificativa da Recusa</p>
                                    <p className="text-sm text-red-800 whitespace-pre-wrap">{action.clientRejectionReason}</p>
                                    {action.clientCompletedAt && (
                                      <p className="text-xs text-red-500 mt-2">
                                        Recusada em {new Date(action.clientCompletedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                        {/* === PAINEL EXPANDIDO === */}
                        {expanded && (
                          <div className="border-t" onClick={(e) => e.stopPropagation()}>

                            {/* Bloco: Pergunta da Avaliação de Origem */}
                            {action.sourceQuestionText && (
                              <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Pergunta da Avaliação</p>
                                <div className="space-y-2">
                                  {action.sourceDomainName && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{action.sourceDomainName}</span>
                                    </div>
                                  )}
                                  <p className="text-sm text-indigo-900 font-medium leading-snug">“{action.sourceQuestionText}”</p>
                                  {action.sourceSelectedLevel !== null && action.sourceSelectedLevel !== undefined && (
                                    <div className="mt-1.5 p-2 bg-white rounded border border-indigo-200">
                                      <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">
                                        Resposta selecionada — Nível {action.sourceSelectedLevel}
                                      </p>
                                      {action.sourceSelectedAnswer && (
                                        <p className="text-sm text-slate-700 leading-snug">{action.sourceSelectedAnswer}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Bloco: O que precisa ser feito */}
                            {cleanDesc && (
                              <div className="px-4 py-3 bg-slate-50 border-b">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">O que precisa ser feito</p>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{cleanDesc}</p>
                              </div>
                            )}

                            {/* Bloco: Recursos + Critério lado a lado */}
                            {(cleanRecursos || cleanCriterio) && (
                              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b">
                                {cleanRecursos && (
                                  <div className="px-4 py-3 bg-blue-50">
                                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">Recursos necessários</p>
                                    <p className="text-sm text-blue-800 leading-relaxed">{cleanRecursos}</p>
                                  </div>
                                )}
                                {cleanCriterio && (
                                  <div className="px-4 py-3 bg-green-50">
                                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">Critério de sucesso</p>
                                    <p className="text-sm text-green-800 leading-relaxed">{cleanCriterio}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Bloco: Metadados + Operações */}
                            <div className="px-4 py-3">
                              <div className="grid md:grid-cols-2 gap-4">
                                {/* Coluna Esquerda: Observações + Mensagens de estado */}
                                <div className="space-y-3">

                                {/* Observações de Andamento — histórico incremental (somente após aceite) */}
                                {actionIsAccepted && (
                                  <div className="mt-3 space-y-2">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Observações de Andamento</label>
                                    <ObservationsHistory actionPlanId={action.id} isExpanded={expandedActions.has(action.id)} readOnly={!canInteract} />
                                  </div>
                                )}

                                {/* Mensagem quando ação está pendente de aceite */}
                                {actionIsPending && hasResponsible && (
                                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <p className="text-xs text-amber-700 font-medium">Aguardando aceite do responsável</p>
                                    <p className="text-xs text-amber-600 mt-1">
                                      As observações, atualização de status e evidências ficarão disponíveis após o responsável aceitar a ação.
                                    </p>
                                  </div>
                                )}

                                {actionIsPending && !hasResponsible && (
                                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <p className="text-xs text-slate-600 font-medium">Selecione um responsável</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Delegue esta ação a um responsável. Após o aceite, será possível atualizar status, observações e evidências.
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Coluna Direita: Prazo, Responsável, Status */}
                              <div className="space-y-3">
                                {/* Prazo: editável apenas por quem pode interagir E tem permissão de edição de prazo */}
                                <div>
                                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Prazo</label>
                                  {canInteract && canEditDueDate ? (
                                    <Input
                                      type="date"
                                      defaultValue={action.dueDate ? new Date(action.dueDate).toISOString().split('T')[0] : ''}
                                      className="mt-1 h-8 text-sm"
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          updateActionMutation.mutate({
                                            id: action.id,
                                            dueDate: new Date(e.target.value),
                                          });
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Calendar className="w-4 h-4 text-gray-400" />
                                      <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                                        {action.dueDate ? new Date(action.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo definido'}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Responsável: vinculação apenas por Sponsor, Admin Global e Consultor */}
                                <div>
                                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Responsável</label>
                                  {canInteract && canAssignResponsible ? (
                                    <Select
                                      defaultValue={action.responsibleId ? String(action.responsibleId) : ''}
                                      onValueChange={(val) => {
                                        if (val) {
                                          assignResponsibleMutation.mutate({
                                            actionPlanId: action.id,
                                            responsibleId: Number(val),
                                          });
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="mt-1 h-8 text-sm">
                                        <SelectValue placeholder="Selecionar responsável" />
                                      </SelectTrigger>
                                      <SelectContent className="z-[10001]">
                                        {orgUsers && orgUsers.length > 0 ? (
                                          orgUsers.map((u: any) => (
                                            <SelectItem key={u.id} value={String(u.id)}>
                                              {u.name || u.email}
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <SelectItem value="_none" disabled>Nenhum usuário vinculado</SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <div className="mt-1 text-sm text-slate-700">
                                      {action.responsibleName || action.responsibleId ? (
                                        <span className="flex items-center gap-1">
                                          <UserPlus className="w-3 h-3 text-slate-400" />
                                          {action.responsibleName || `Usuário #${action.responsibleId}`}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">Sem responsável definido</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Botão Enviar/Reenviar para Validação — apenas um botão por vez, dependendo do status */}
                                {actionIsAccepted && canInteract && (isResponsibleFor(action) || isInternal) && action.status === 'em_andamento' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2 border-violet-300 text-violet-700 hover:bg-violet-50 text-xs"
                                    disabled={submitForValidationMutation.isPending}
                                    onClick={() => {
                                      submitForValidationMutation.mutate({ actionId: action.id });
                                    }}
                                  >
                                    {submitForValidationMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />} Enviar para Validação
                                  </Button>
                                )}
                                {/* Reenvio após ajustes — somente quando status é ajustes_solicitados (o botão no banner já cobre este caso, mas também exibimos aqui no painel expandido) */}
                                {actionIsAccepted && canInteract && (isResponsibleFor(action) || isInternal) && action.status === 'ajustes_solicitados' && (
                                  <Button
                                    size="sm"
                                    className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white text-xs"
                                    disabled={submitForValidationMutation.isPending}
                                    onClick={() => {
                                      submitForValidationMutation.mutate({ actionId: action.id });
                                    }}
                                  >
                                    {submitForValidationMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />} Reenviar para Validação
                                  </Button>
                                )}

                                {/* Atualizar Status — apenas para internos (consultores/admin). Clientes atualizam via botões de ação */}
                                {actionIsAccepted && isInternal && (
                                  <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Atualizar Status</label>
                                    <Select
                                      value={editingStatus[action.id] || normalizeStatus(action.status)}
                                      onValueChange={(val) => {
                                        setEditingStatus(prev => ({ ...prev, [action.id]: val }));
                                        updateActionMutation.mutate({
                                          id: action.id,
                                          status: val as any,
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="mt-1 h-8 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-[10001]">
                                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                        <SelectItem value="aguardando_validacao">Enviado para Validação</SelectItem>
                                        <SelectItem value="ajustes_solicitados">Ajustes Solicitados</SelectItem>
                                        <SelectItem value="concluida">Concluída</SelectItem>
                                        <SelectItem value="cancelada">Cancelada</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            </div>
                            </div>

                            {/* Ações de Governança */}
                            <div className="px-4 pb-3 flex flex-wrap gap-2 pt-3 border-t">
                              {actionIsPending && canInteract && (isInternal || isResponsibleFor(action)) && !(isComite && !isResponsibleFor(action)) && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                    onClick={() => acceptActionMutation.mutate({ id: action.id, status: 'em_andamento' })}
                                  >
                                    <Check className="w-3 h-3 mr-1" /> Aceitar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => setRejectingActionId(action.id)}
                                  >
                                    <X className="w-3 h-3 mr-1" /> Recusar
                                  </Button>
                                </>
                              )}
                              <div className="flex-1" />
                              {isInternal && (
                                <>
                                  {onRefineAction && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-violet-300 text-violet-600 hover:bg-violet-50"
                                      onClick={() => {
                                        setRefineInputs(prev => ({
                                          ...prev,
                                          [action.id]: prev[action.id] !== undefined ? prev[action.id] : '',
                                        }));
                                      }}
                                    >
                                      <Sparkles className="w-3 h-3 mr-1" /> Refinar com IA
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-slate-300 text-slate-600 hover:bg-slate-50"
                                    onClick={() => {
                                      setEditingAction(action);
                                      setIsEditModalOpen(true);
                                    }}
                                  >
                                    <Edit className="w-3 h-3 mr-1" /> Editar
                                  </Button>
                                </>
                              )}
                              {/* Evidência: somente após aceite e com permissão de interação */}
                              {actionIsAccepted && canInteract && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-300 text-green-600 hover:bg-green-50"
                                  onClick={() => {
                                    setSelectedActionForEvidence(action);
                                    setEvidenceModalOpen(true);
                                  }}
                                >
                                  <Paperclip className="w-3 h-3 mr-1" /> Evidência
                                </Button>
                              )}
                            </div>

                            {/* Área de recusa/justificativa */}
                            {rejectingActionId === action.id && (
                              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                <label className="text-xs font-medium text-red-700">Motivo da Recusa (obrigatório)</label>
                                <Textarea
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Descreva o motivo da recusa (mínimo 10 caracteres)..."
                                  rows={3}
                                  className="mt-2 border-red-200"
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={rejectReason.length < 10 || rejectActionMutation.isPending}
                                    onClick={() => rejectActionMutation.mutate({ id: action.id, reason: rejectReason })}
                                  >
                                    {rejectActionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                    Confirmar Recusa
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { setRejectingActionId(null); setRejectReason(''); }}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Área de Refinamento com IA */}
                            {refineInputs[action.id] !== undefined && onRefineAction && (
                              <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="w-4 h-4 text-violet-600" />
                                  <label className="text-xs font-medium text-violet-700">Refinar Ação com IA</label>
                                </div>
                                <div className="flex gap-2">
                                  <Textarea
                                    value={refineInputs[action.id] || ''}
                                    onChange={(e) => setRefineInputs(prev => ({ ...prev, [action.id]: e.target.value }))}
                                    placeholder="Instruções para refinar... Ex: Detalhar passos de implementação"
                                    rows={2}
                                    className="flex-1 text-sm border-violet-200"
                                  />
                                  <Button
                                    size="sm"
                                    className="bg-violet-500 hover:bg-violet-600"
                                    disabled={!refineInputs[action.id]?.trim() || isRefining}
                                    onClick={() => {
                                      onRefineAction(action.id, refineInputs[action.id] || '');
                                    }}
                                  >
                                    {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Histórico da Ação — visível quando o card está expandido */}
                        <ActionHistorySection
                          actionPlanId={action.id}
                          isExpanded={expanded}
                        />
                        {/* Seção de evidências — visível quando o card está expandido */}
                        <ActionEvidencesList
                          actionPlanId={action.id}
                          isExpanded={expanded}
                        />
                      </CardContent>
                    </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <ClipboardList className="w-16 h-16 mb-5 opacity-25 text-violet-400" />
              <p className="font-medium text-base text-slate-600">Nenhum plano de ação gerado</p>
              {(isInternal || isSponsor) ? (
                <p className="text-sm font-light mt-2 max-w-xs text-slate-400">
                  Clique em &ldquo;Gerar Plano de Ação&rdquo; para criar ações de mitigação baseadas nos riscos identificados
                </p>
              ) : (
                <p className="text-sm font-light mt-2 max-w-xs text-slate-400">
                  O plano de ação ainda não foi gerado para esta avaliação.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Ação</DialogTitle>
          </DialogHeader>
          {editingAction && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={editingAction.title}
                  onChange={(e) => setEditingAction({ ...editingAction, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={editingAction.description || ''}
                  onChange={(e) => setEditingAction({ ...editingAction, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select
                    value={editingAction.priority}
                    onValueChange={(v) => setEditingAction({ ...editingAction, priority: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critica">Crítica</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={normalizeStatus(editingAction.status)}
                    onValueChange={(v) => setEditingAction({ ...editingAction, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida_cliente">Concluída (Cliente)</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Prazo</label>
                <Input
                  type="date"
                  value={editingAction.dueDate ? new Date(editingAction.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingAction({ ...editingAction, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!editingAction) return;
                updateActionMutation.mutate({
                  id: editingAction.id,
                  title: editingAction.title,
                  description: editingAction.description,
                  priority: editingAction.priority,
                  status: normalizeStatus(editingAction.status) as any,
                  dueDate: editingAction.dueDate ? new Date(editingAction.dueDate) : undefined,
                });
                setIsEditModalOpen(false);
              }}
              disabled={updateActionMutation.isPending}
            >
              {updateActionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Evidências */}
      <Dialog open={evidenceModalOpen} onOpenChange={(open) => {
        setEvidenceModalOpen(open);
        if (!open) {
          setSelectedActionForEvidence(null);
          setEvidenceFile(null);
          setEvidenceDescription('');
          setEvidenceTab('upload');
          setGedBrowseFolderId(null);
          setGedBreadcrumb([{ id: null, name: 'Raiz' }]);
        }
      }}>
        <DialogContent className="max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-6 h-5 text-green-600" />
              Evidências da Ação
            </DialogTitle>
            <DialogDescription>
              Anexe arquivos do computador ou selecione documentos existentes no GED da organização
            </DialogDescription>
          </DialogHeader>
          {selectedActionForEvidence && (
            <div className="space-y-4">
              {/* Info da ação */}
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">{selectedActionForEvidence.title}</p>
                <p className="text-xs text-green-600 mt-1">
                  Prazo: {selectedActionForEvidence.dueDate ? new Date(selectedActionForEvidence.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo'}
                </p>
              </div>

              {/* Lista de evidências já anexadas */}
              {actionEvidences && actionEvidences.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Evidências Anexadas ({actionEvidences.length})</label>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {actionEvidences.map((ev: any) => (
                      <div key={ev.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm truncate">{ev.documentName || 'Documento'}</p>
                            <p className="text-xs text-slate-400">{ev.createdAt ? new Date(ev.createdAt).toLocaleDateString('pt-BR') : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {ev.fileUrl && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="w-3 h-3" />
                              </a>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => removeEvidenceMutation.mutate({ evidenceId: ev.id })}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abas: Upload / GED */}
              <div className="pt-3 border-t">
                <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-lg">
                  <button
                    className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                      evidenceTab === 'upload' ? 'bg-white shadow text-violet-700 font-medium' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => setEvidenceTab('upload')}
                  >
                    <Upload className="w-4 h-4 inline mr-1.5" />Enviar do Computador
                  </button>
                  <button
                    className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                      evidenceTab === 'ged' ? 'bg-white shadow text-violet-700 font-medium' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    onClick={() => setEvidenceTab('ged')}
                  >
                    <Database className="w-4 h-4 inline mr-1.5" />Selecionar do GED
                  </button>
                </div>

                {/* Aba Upload */}
                {evidenceTab === 'upload' && (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:border-violet-300 transition-colors">
                      <input
                        type="file"
                        id="evidence-upload-shared"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.tif,.zip,.rar,.7z,.tar,.gz,.json,.xml,.html"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error('O tamanho máximo é 50 MB.');
                              return;
                            }
                            setEvidenceFile(file);
                          }
                        }}
                      />
                      {evidenceFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="w-5 h-5 text-violet-500" />
                          <span className="text-sm font-medium">{evidenceFile.name}</span>
                          <span className="text-xs text-slate-400">({(evidenceFile.size / 1024).toFixed(0)} KB)</span>
                          <Button size="sm" variant="ghost" onClick={() => setEvidenceFile(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <label htmlFor="evidence-upload-shared" className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-sm text-slate-500">Clique para selecionar um arquivo</p>
                          <p className="text-xs text-slate-400 mt-1">Documentos, planilhas, imagens, apresentações (até 16 MB)</p>
                        </label>
                      )}
                    </div>
                    <Textarea
                      value={evidenceDescription}
                      onChange={(e) => setEvidenceDescription(e.target.value)}
                      placeholder="Descrição da evidência (opcional)..."
                      rows={2}
                      className="text-sm"
                    />
                    <Button
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      disabled={!evidenceFile || uploadEvidenceMutation.isPending}
                      onClick={async () => {
                        if (!evidenceFile || !selectedActionForEvidence) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const base64 = (reader.result as string).split(',')[1];
                          uploadEvidenceMutation.mutate({
                            actionPlanId: selectedActionForEvidence.id,
                            fileName: evidenceFile.name,
                            fileData: base64,
                            mimeType: evidenceFile.type || 'application/octet-stream',
                            description: evidenceDescription || undefined,
                          });
                        };
                        reader.readAsDataURL(evidenceFile);
                      }}
                    >
                      {uploadEvidenceMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando e salvando no GED...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" />Enviar Evidência</>
                      )}
                    </Button>
                    <p className="text-xs text-slate-400 text-center">
                      O arquivo será automaticamente salvo no GED da organização, na pasta da avaliação
                    </p>
                  </div>
                )}

                {/* Aba GED */}
                {evidenceTab === 'ged' && (
                  <div className="space-y-3">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1 text-xs text-slate-500 flex-wrap">
                      {gedBreadcrumb.map((crumb, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                          {idx > 0 && <span className="text-slate-300">/</span>}
                          <button
                            className="hover:text-violet-600 hover:underline"
                            onClick={() => {
                              setGedBrowseFolderId(crumb.id);
                              setGedBreadcrumb(prev => prev.slice(0, idx + 1));
                            }}
                          >
                            {crumb.name}
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Pastas */}
                    {gedFolders && gedFolders.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pastas</label>
                        {gedFolders.map((folder: any) => (
                          <button
                            key={folder.id}
                            className="w-full flex items-center gap-2 p-2 rounded border hover:bg-violet-50 hover:border-violet-200 transition-colors text-left"
                            onClick={() => {
                              setGedBrowseFolderId(folder.id);
                              setGedBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
                            }}
                          >
                            <Database className="w-4 h-4 text-violet-500 shrink-0" />
                            <span className="text-sm">{folder.name}</span>
                            <ChevronDown className="w-3 h-3 text-slate-300 ml-auto -rotate-90" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Documentos */}
                    {gedDocuments && gedDocuments.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Documentos</label>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {gedDocuments.map((doc: any) => {
                            const isAlreadyLinked = actionEvidences?.some((ev: any) => ev.documentId === doc.id);
                            return (
                              <div
                                key={doc.id}
                                className={`flex items-center justify-between p-2 rounded border ${
                                  isAlreadyLinked ? 'bg-green-50 border-green-200' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm truncate">{doc.name}</p>
                                    <p className="text-xs text-slate-400">
                                      {doc.mimeType} - {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('pt-BR') : ''}
                                    </p>
                                  </div>
                                </div>
                                {isAlreadyLinked ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">Vinculado</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-violet-200 text-violet-600 hover:bg-violet-50"
                                    disabled={linkGedDocumentMutation.isPending}
                                    onClick={() => {
                                      linkGedDocumentMutation.mutate({
                                        actionPlanId: selectedActionForEvidence.id,
                                        documentId: doc.id,
                                        description: doc.name,
                                      });
                                    }}
                                  >
                                    {linkGedDocumentMutation.isPending ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <><Paperclip className="w-3 h-3 mr-1" />Vincular</>
                                    )}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(!gedFolders || gedFolders.length === 0) && (!gedDocuments || gedDocuments.length === 0) && (
                      <div className="py-8 text-center text-slate-400">
                        <Database className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhum documento encontrado nesta pasta</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}
