import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck, Clock, AlertTriangle, CheckCircle2,
  Building2, Calendar, Shield, Users, FileText, History,
  ThumbsUp, ThumbsDown, Loader2, ExternalLink, ChevronLeft,
  UserCheck, X, Info, CheckSquare, AlertCircle, RotateCcw,
  Activity, ArrowLeft, ArrowRightLeft
} from "lucide-react";
import { toast } from "sonner";
import { ACTION_STATUS_COLORS, ACTION_STATUS_LABELS, ACTION_PRIORITY_COLORS, ACTION_PRIORITY_LABELS } from "@/lib/statusConstants";

/* ─── Mapeamentos visuais (constantes compartilhadas para consistência visual) ─── */
const STATUS_LABELS = ACTION_STATUS_LABELS;
const STATUS_COLORS = ACTION_STATUS_COLORS;
const PRIORITY_LABELS = ACTION_PRIORITY_LABELS;
const PRIORITY_COLORS = ACTION_PRIORITY_COLORS;

const HISTORY_LABELS: Record<string, string> = {
  atribuicao: "Atribuição", reatribuicao: "Reatribuição", aceite: "Aceite",
  recusa: "Recusa", status: "Mudança de Status", prazo: "Alteração de Prazo",
  edicao: "Edição", envio_validacao: "Enviado para Validação",
  validacao_aprovada: "Validação Aprovada", validacao_recusada: "Ajustes Solicitados",
  ajustes_solicitados: "Ajustes Solicitados",
  transferencia_validacao: "Transferência de Validação",
};

const HISTORY_COLORS: Record<string, string> = {
  envio_validacao: "bg-amber-100 text-amber-700",
  validacao_aprovada: "bg-green-100 text-green-700",
  validacao_recusada: "bg-orange-100 text-orange-700",
  ajustes_solicitados: "bg-orange-100 text-orange-700",
  status: "bg-blue-100 text-blue-700",
  atribuicao: "bg-purple-100 text-purple-700",
  aceite: "bg-green-100 text-green-700",
  recusa: "bg-red-100 text-red-700",
  transferencia_validacao: "bg-slate-100 text-slate-700",
};

const HISTORY_ICONS: Record<string, any> = {
  envio_validacao: Clock,
  validacao_aprovada: CheckCircle2,
  validacao_recusada: AlertTriangle,
  ajustes_solicitados: RotateCcw,
  status: Activity,
  atribuicao: UserCheck,
  aceite: CheckSquare,
  recusa: X,
  transferencia_validacao: ArrowRightLeft,
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate) return false;
  if (["concluida", "concluida_cliente", "cancelada"].includes(status)) return false;
  return new Date(dueDate) < new Date();
}

/* ─── Seção de Evidências ─── */
function EvidencesSection({ evidences }: { evidences: any[] }) {
  if (!evidences || evidences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-gray-200 mb-3" />
        <p className="text-gray-400 text-sm font-medium">Nenhuma evidência anexada</p>
        <p className="text-gray-300 text-xs mt-1">O responsável deve anexar documentos comprobatórios antes de enviar para validação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {evidences.map((ev: any) => (
        <div key={ev.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-purple-50 rounded-lg shrink-0">
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{ev.documentName || ev.fileName || ev.description || "Evidência"}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {ev.addedByName ? `Enviado por ${ev.addedByName}` : 'Enviado'}
                {ev.createdAt && <span> · {formatDateTime(ev.createdAt)}</span>}
              </p>
            </div>
          </div>
          {ev.fileUrl && (
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Visualizar
                </Button>
              </a>
              <a href={ev.fileUrl} download={ev.fileName || ev.documentName || 'evidencia'}>
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs gap-1.5 border-gray-200 text-gray-600 hover:bg-gray-50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar
                </Button>
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Seção de Observações de Andamento (histórico incremental) ─── */
function ObservationsSection({ actionPlanId }: { actionPlanId: number }) {
  const [newText, setNewText] = React.useState('');
  const utils = trpc.useUtils();
  const { data: observations, isLoading } = trpc.actionPlan.listObservations.useQuery(
    { actionPlanId },
    { enabled: actionPlanId > 0 }
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
    admin_global: 'Admin', consultor: 'Consultor', sponsor: 'Sponsor',
    comite: 'Comitê', lider_processo: 'Líder', gestor_area: 'Gestor', respondente: 'Respondente',
  };

  const formatObsDate = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleDateString('pt-BR') + ' — ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-50 rounded-lg">
            <Activity className="h-4 w-4 text-violet-600" />
          </div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Observações de Andamento</h2>
        </div>
        {observations && observations.length > 0 && (
          <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2.5 py-1 rounded-full">
            {observations.length} {observations.length === 1 ? 'registro' : 'registros'}
          </span>
        )}
      </div>
      {/* Campo para nova observação */}
      <div className="space-y-2 mb-4">
        <Textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Adicione uma nova observação de andamento..."
          rows={3}
          className="text-sm border-gray-200 resize-none rounded-xl"
        />
        <Button
          size="sm"
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
          disabled={!newText.trim() || addMutation.isPending}
          onClick={() => addMutation.mutate({ actionPlanId, text: newText.trim() })}
        >
          {addMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
          Salvar atualização
        </Button>
      </div>
      {/* Histórico de observações */}
      {isLoading ? (
        <p className="text-xs text-gray-400">Carregando histórico...</p>
      ) : observations && observations.length > 0 ? (
        <div className="space-y-3">
          {observations.map((obs: any) => (
            <div key={obs.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-violet-700">{obs.userName}</span>
                <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{roleLabel[obs.userRole] || obs.userRole}</span>
                <span className="text-xs text-gray-400 ml-auto">{formatObsDate(obs.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{obs.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic text-center py-4">Nenhuma observação registrada ainda.</p>
      )}
    </div>
  );
}

/* ─── Seção de Histórico (Timeline) ─── */
function HistorySection({ history }: { history: any[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="h-12 w-12 text-gray-200 mb-3" />
        <p className="text-gray-400 text-sm font-medium">Nenhum histórico registrado</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Linha vertical da timeline */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
      <div className="space-y-4">
        {history.map((h: any, idx: number) => {
          const IconComp = HISTORY_ICONS[h.changeType] || Activity;
          const colorClass = HISTORY_COLORS[h.changeType] || "bg-gray-100 text-gray-600";
          return (
            <div key={h.id} className="relative flex items-start gap-4 pl-12">
              {/* Ícone na timeline */}
              <div className={`absolute left-0 flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-sm ${colorClass}`}>
                <IconComp className="h-4 w-4" />
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                      {HISTORY_LABELS[h.changeType] || h.changeType}
                    </span>
                    {h.notes && (
                      <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{h.notes}</p>
                    )}
                    {(h.previousValue || h.newValue) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {h.previousValue && (
                          <span className="line-through mr-1.5">{STATUS_LABELS[h.previousValue] || h.previousValue}</span>
                        )}
                        {h.newValue && (
                          <span className="font-medium text-gray-600">→ {STATUS_LABELS[h.newValue] || h.newValue}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500 font-medium">{h.changedByName || "Sistema"}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(h.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Página principal ─── */
export default function ActionValidationPage() {
  const [, params] = useRoute("/plano-acao/validacao/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const actionId = params?.id ? parseInt(params.id, 10) : null;
  const searchParams = new URLSearchParams(window.location.search);
  const sourceTable = searchParams.get('source') || 'action_plans';

  const [approveNotes, setApproveNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedNewValidatorId, setSelectedNewValidatorId] = useState<string>("");
  const [transferReason, setTransferReason] = useState("");

  const canValidate = ["admin_global", "consultor"].includes(user?.role || "");

  const { data: action, isLoading, refetch } = trpc.assessments.getActionDetails.useQuery(
    { actionId: actionId!, sourceTable },
    { enabled: !!actionId && canValidate }
  );

  const assumeMutation = trpc.assessments.assumeActionValidation.useMutation({
    onSuccess: () => {
      toast.success("Você assumiu a validação desta ação.");
      refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const approveMutation = trpc.assessments.approveActionValidation.useMutation({
    onSuccess: () => {
      toast.success("Ação aprovada com sucesso!");
      navigate("/painel-global");
    },
    onError: (err) => toast.error(`Erro ao aprovar: ${err.message}`),
  });

  const rejectMutation = trpc.assessments.rejectActionValidation.useMutation({
    onSuccess: () => {
      toast.success("Ajustes solicitados. O responsável será notificado.");
      navigate("/painel-global");
    },
    onError: (err) => toast.error(`Erro ao solicitar ajustes: ${err.message}`),
  });

  const { data: consultors } = trpc.assessments.listConsultors.useQuery(
    undefined,
    { enabled: canValidate && showTransferModal }
  );

  const transferMutation = trpc.assessments.transferActionValidation.useMutation({
    onSuccess: (data) => {
      toast.success(`Validação transferida para ${data.newValidatorName} com sucesso.`);
      setShowTransferModal(false);
      setSelectedNewValidatorId("");
      setTransferReason("");
      refetch();
    },
    onError: (err) => toast.error(`Erro ao transferir: ${err.message}`),
  });

  if (!canValidate) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Acesso restrito à Equipe Interna.</p>
        </div>
      </div>
    );
  }

  if (!actionId || isNaN(actionId)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Identificador de ação inválido.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/painel-global")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à Central
          </Button>
        </div>
      </div>
    );
  }

  const isInValidation = ["em_validacao", "aguardando_validacao", "aguardando_nova_validacao"].includes(action?.status || "");
  // isMyValidation: verdadeiro quando o consultor logado é o responsável pela validação
  const isMyValidation = !!action?.validatorId && action?.validatorId === user?.id;
  // Para nova validação após ajustes, o consultor original pode decidir diretamente
  const isNewValidation = action?.status === "aguardando_nova_validacao";
  // hasValidator: verdadeiro quando há um consultor vinculado à validação
  const hasValidator = !!action?.validatorId;
  // needsAssume: ação aguardando validação e sem consultor vinculado
  const needsAssume = canValidate && isInValidation && !hasValidator;
  // canDecide: consultor pode aprovar/rejeitar/transferir apenas quando ELE MESMO é o validador vinculado
  // Isso garante que apenas o consultor vinculado pode tomar decisões sobre a ação
  const canDecide = canValidate && isInValidation && isMyValidation;
  const overdue = isOverdue(action?.dueDate, action?.status || "");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de navegação superior */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-gray-600 hover:text-gray-900"
              onClick={() => navigate("/painel-global")}
            >
              <ArrowLeft className="h-4 w-4" />
              Central Global
            </Button>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-gray-800">Validação de Ação</span>
            </div>
          </div>
          {action && (
            <div className="flex items-center gap-2">
              <Badge className={`text-xs border ${STATUS_COLORS[action.status] || "bg-gray-100"}`}>
                {STATUS_LABELS[action.status] || action.status}
              </Badge>
              {overdue && (
                <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Vencido</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !action ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Ação não encontrada</p>
          <p className="text-gray-400 text-sm mt-1">Verifique se você tem permissão para acessar esta ação.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/painel-global")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à Central
          </Button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 py-6">

          {/* Cabeçalho da ação */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded">
                    #{action.id}
                  </span>
                  {action.assessmentCode && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {action.assessmentCode}
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-gray-900 leading-snug mb-3">{action.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`text-xs border ${STATUS_COLORS[action.status] || "bg-gray-100"}`}>
                    {STATUS_LABELS[action.status] || action.status}
                  </Badge>
                  <Badge className={`text-xs ${PRIORITY_COLORS[action.priority] || "bg-gray-100"}`}>
                    {PRIORITY_LABELS[action.priority] || action.priority}
                  </Badge>
                  {overdue && (
                    <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Vencido</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Metadados em grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Cliente</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{action.organizationName || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <Users className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Responsável</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{action.responsibleUserName || action.responsibleName || "Sem responsável"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${overdue ? "bg-red-50" : "bg-amber-50"}`}>
                  <Calendar className={`h-4 w-4 ${overdue ? "text-red-600" : "text-amber-600"}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Prazo</p>
                  <p className={`text-sm font-medium ${overdue ? "text-red-600" : "text-gray-800"}`}>
                    {formatDate(action.dueDate)}
                  </p>
                </div>
              </div>
              {action.validatorName ? (
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-purple-50 rounded-lg">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Consultor</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{action.validatorName}</p>
                  </div>
                </div>
              ) : action.submittedForValidationAt ? (
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Enviado em</p>
                    <p className="text-sm font-medium text-gray-800">{formatDate(action.submittedForValidationAt)}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Aviso de ajustes anteriores */}
          {action.status === "ajustes_solicitados" && action.validationRejectionReason && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-800">Ajustes solicitados anteriormente</p>
                  <p className="text-sm text-orange-700 mt-1 leading-relaxed">{action.validationRejectionReason}</p>
                  {action.validatorName && (
                    <p className="text-xs text-orange-500 mt-2">Solicitado por: {action.validatorName}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Ação já concluída */}
          {action.status === "concluida" && action.validatedAt && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-800">Ação validada e concluída</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Aprovada por {action.validatorName} em {formatDateTime(action.validatedAt)}
                  </p>
                  {action.validationNotes && (
                    <p className="text-sm text-green-700 mt-2 leading-relaxed">{action.validationNotes}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Layout em duas colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Coluna esquerda — conteúdo principal (2/3) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Seção 1: O que precisa ser feito */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-purple-50 rounded-lg">
                    <Info className="h-4 w-4 text-purple-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">O que precisa ser feito</h2>
                </div>

                {/* Avaliação de origem */}
                {(action.assessmentCode || action.assessmentId) && (
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avaliação de origem:</span>
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-mono">
                      {action.assessmentCode || `AC#${action.assessmentId}`}
                    </span>
                  </div>
                )}

                {action.description ? (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{action.description}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Nenhuma descrição registrada para esta ação.</p>
                )}
                {action.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notas Internas</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{action.notes}</p>
                  </div>
                )}
                {action.observations && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Observações do Responsável</p>
                    <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed">{action.observations}</p>
                  </div>
                )}
              </div>

              {/* Seção 1b: Observações de Andamento (histórico incremental) */}
              <ObservationsSection actionPlanId={action.id} />

              {/* Seção 2: Evidências */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                      Evidências Anexadas
                    </h2>
                  </div>
                  {action.evidences?.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
                      {action.evidences.length} {action.evidences.length === 1 ? "arquivo" : "arquivos"}
                    </span>
                  )}
                </div>
                <EvidencesSection evidences={action.evidences || []} />
              </div>

              {/* Seção 3: Histórico */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-50 rounded-lg">
                      <History className="h-4 w-4 text-green-600" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                      Histórico da Ação
                    </h2>
                  </div>
                  {action.history?.length > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">
                      {action.history.length} {action.history.length === 1 ? "evento" : "eventos"}
                    </span>
                  )}
                </div>
                <HistorySection history={action.history || []} />
              </div>
            </div>

            {/* Coluna direita — decisão do consultor (1/3) */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">

                {/* Card de decisão */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-1.5 bg-purple-50 rounded-lg">
                      <Shield className="h-4 w-4 text-purple-600" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Decisão do Consultor</h2>
                  </div>

                  {/* Assumir validação — aparece quando a ação está em validação mas ainda não há consultor vinculado */}
                  {needsAssume && !showApproveForm && !showRejectForm && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Esta ação está aguardando um consultor para assumir a validação.
                      </p>
                      <Button
                        className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white h-11"
                        disabled={assumeMutation.isPending}
                        onClick={() => assumeMutation.mutate({ actionId: actionId! })}
                      >
                        {assumeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                        Assumir Validação
                      </Button>
                    </div>
                  )}

                  {/* Aviso informativo quando outro consultor já está vinculado e o usuário atual não é ele */}
                  {canValidate && isInValidation && hasValidator && !isMyValidation && !showApproveForm && !showRejectForm && (
                    <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-start gap-2">
                        <UserCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-amber-800">Consultor vinculado: {action.validatorName}</p>
                          <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                            Você está visualizando esta validação. Para assumir, use a opção de transferência.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Aviso de nova validação após ajustes */}
                  {canValidate && isNewValidation && !showApproveForm && !showRejectForm && (
                    <div className="mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                      <div className="flex items-start gap-2">
                        <RotateCcw className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-indigo-800">Reenvio após ajustes</p>
                          <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">
                            O responsável realizou os ajustes solicitados e reenviou a ação para nova validação.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botões de aprovação/rejeição/transferência — quando o consultor pode decidir */}
                  {canDecide && !showApproveForm && !showRejectForm && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Revise as evidências e o histórico antes de tomar uma decisão.
                      </p>
                      <Button
                        className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white h-11"
                        onClick={() => { setShowApproveForm(true); setShowRejectForm(false); }}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Aprovar Ação
                      </Button>
                      <Button
                        className="w-full gap-2 bg-orange-600 hover:bg-orange-700 text-white h-11"
                        onClick={() => { setShowRejectForm(true); setShowApproveForm(false); }}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        Solicitar Ajustes
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-slate-300 text-slate-600 hover:bg-slate-50 h-10"
                        onClick={() => setShowTransferModal(true)}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        Transferir Validação
                      </Button>
                    </div>
                  )}

                  {/* Formulário de aprovação */}
                  {showApproveForm && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        <p className="text-sm font-semibold text-green-800">Aprovar esta ação</p>
                      </div>
                      <Textarea
                        placeholder="Observações da validação (opcional)..."
                        value={approveNotes}
                        onChange={e => setApproveNotes(e.target.value)}
                        className="text-sm min-h-[100px] bg-gray-50 resize-none"
                      />
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 h-11"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate({
                          actionId: actionId!,
                          validationNotes: approveNotes || undefined
                        })}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Confirmar Aprovação
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-9"
                        onClick={() => { setShowApproveForm(false); setApproveNotes(""); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {/* Formulário de rejeição */}
                  {showRejectForm && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl border border-orange-200">
                        <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                        <p className="text-sm font-semibold text-orange-800">Solicitar ajustes</p>
                      </div>
                      <Textarea
                        placeholder="Descreva o que precisa ser ajustado. O responsável receberá esta mensagem por e-mail. (mínimo 10 caracteres)"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="text-sm min-h-[120px] bg-gray-50 resize-none"
                      />
                      {rejectReason.length > 0 && rejectReason.length < 10 && (
                        <p className="text-xs text-orange-600 font-medium">
                          Mínimo de 10 caracteres ({rejectReason.length}/10)
                        </p>
                      )}
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2 h-11"
                        disabled={rejectMutation.isPending || rejectReason.length < 10}
                        onClick={() => rejectMutation.mutate({
                          actionId: actionId!,
                          rejectionReason: rejectReason
                        })}
                      >
                        {rejectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        Confirmar Solicitação
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-9"
                        onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {/* Bloco antigo removido — substituído pelo aviso âmbar acima */}

                  {/* Status: ação não está em validação */}
                  {!isInValidation && action.status !== "concluida" && (
                    <div className="text-center py-4">
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Esta ação está com status <strong>{STATUS_LABELS[action.status] || action.status}</strong> e não está disponível para validação no momento.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Status: ação concluída */}
                  {action.status === "concluida" && (
                    <div className="text-center py-4">
                      <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                        <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
                        <p className="text-xs text-green-700 font-medium">Ação validada e concluída</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card de informações rápidas */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Informações Rápidas</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Evidências</span>
                      <span className={`text-xs font-bold ${(action.evidences?.length || 0) > 0 ? "text-blue-600" : "text-gray-400"}`}>
                        {action.evidences?.length || 0} {(action.evidences?.length || 0) === 1 ? "arquivo" : "arquivos"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Eventos no histórico</span>
                      <span className="text-xs font-bold text-gray-700">{action.history?.length || 0}</span>
                    </div>
                    {action.submittedForValidationAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Enviado para validação</span>
                        <span className="text-xs font-medium text-gray-700">{formatDate(action.submittedForValidationAt)}</span>
                      </div>
                    )}
                    {action.assessmentType && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Módulo de origem</span>
                        <span className="text-xs font-medium text-gray-700 capitalize">
                          {action.assessmentType === "compliance" ? "Maturidade" :
                           action.assessmentType === "contract_analysis" ? "Contratos" :
                           action.assessmentType === "third_party" ? "Due Diligence" :
                           action.assessmentType}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão voltar */}
                <Button
                  variant="outline"
                  className="w-full gap-2 text-gray-600"
                  onClick={() => navigate("/painel-global")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar à Central Global
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência de Validação */}
      <Dialog open={showTransferModal} onOpenChange={(open) => {
        if (!open) {
          setShowTransferModal(false);
          setSelectedNewValidatorId("");
          setTransferReason("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-5 w-5 text-slate-600" />
              Transferir validação para outro consultor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Selecionar consultor</label>
              <Select
                value={selectedNewValidatorId}
                onValueChange={setSelectedNewValidatorId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um consultor..." />
                </SelectTrigger>
                <SelectContent>
                  {(consultors || []).filter((c: any) => c.id !== user?.id).map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name || c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Motivo da transferência <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <Textarea
                placeholder="Ex.: Redistribuição de tarefas, ausência do consultor..."
                value={transferReason}
                onChange={e => setTransferReason(e.target.value)}
                className="text-sm min-h-[80px] resize-none bg-gray-50"
              />
            </div>
            {selectedNewValidatorId && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 leading-relaxed">
                  O novo consultor será notificado por e-mail e a transferência será registrada no histórico da ação. O status da ação não será alterado.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowTransferModal(false);
                setSelectedNewValidatorId("");
                setTransferReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-slate-700 hover:bg-slate-800 text-white gap-2"
              disabled={!selectedNewValidatorId || transferMutation.isPending}
              onClick={() => transferMutation.mutate({
                actionId: actionId!,
                newValidatorId: parseInt(selectedNewValidatorId, 10),
                transferReason: transferReason || undefined,
              })}
            >
              {transferMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4" />
              )}
              Confirmar Transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
