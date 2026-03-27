import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardCheck, Clock, AlertTriangle, CheckCircle2,
  Search, Filter, RefreshCw, ExternalLink, ChevronLeft,
  ChevronRight, Users, Building2, Calendar, Shield,
  AlertCircle, Activity, RotateCcw, CheckSquare,
  Loader2, FileText, History, Eye, ThumbsUp, ThumbsDown,
  UserCheck, X, Info
} from "lucide-react";
import { toast } from "sonner";
import { ACTION_STATUS_COLORS, ACTION_STATUS_LABELS, ACTION_PRIORITY_COLORS, ACTION_PRIORITY_LABELS } from "@/lib/statusConstants";

/* ─── Mapeamentos visuais ─── */
// Constantes de status e prioridade — importadas do módulo compartilhado para consistência visual
const STATUS_LABELS = ACTION_STATUS_LABELS;
const STATUS_COLORS = ACTION_STATUS_COLORS;
const PRIORITY_LABELS = ACTION_PRIORITY_LABELS;
const PRIORITY_COLORS = ACTION_PRIORITY_COLORS;

const PRIORITY_DOT: Record<string, string> = {
  baixa: "bg-slate-400", media: "bg-yellow-500", alta: "bg-orange-500", critica: "bg-red-600",
};

const HISTORY_LABELS: Record<string, string> = {
  atribuicao: "Atribuição", reatribuicao: "Reatribuição", aceite: "Aceite",
  recusa: "Recusa", status: "Mudança de Status", prazo: "Alteração de Prazo",
  edicao: "Edição", envio_validacao: "Enviado para Validação",
  validacao_aprovada: "Validação Aprovada", validacao_recusada: "Ajustes Solicitados",
  ajustes_solicitados: "Ajustes Solicitados",
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
};

/* ─── Abas de navegação ─── */
const TABS = [
  { id: "aguardando_validacao", label: "Aguardando Validação", icon: Clock, color: "text-amber-600" },
  { id: "aguardando_nova_validacao", label: "Nova Validação", icon: RotateCcw, color: "text-indigo-600" },
  { id: "em_validacao", label: "Em Validação", icon: Shield, color: "text-purple-600" },
  { id: "ajustes_solicitados", label: "Ajustes Solicitados", icon: RotateCcw, color: "text-orange-600" },
  { id: "pendente", label: "Pendentes", icon: AlertCircle, color: "text-slate-600" },
  { id: "em_andamento", label: "Em Andamento", icon: Activity, color: "text-blue-600" },
  { id: "concluida", label: "Validadas", icon: CheckSquare, color: "text-green-600" },
  { id: "all", label: "Todas", icon: ClipboardCheck, color: "text-gray-600" },
];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate) return false;
  if (["concluida", "concluida_cliente", "cancelada"].includes(status)) return false;
  return new Date(dueDate) < new Date();
}

/* ─── Card de Estatística ─── */
function StatCard({ label, value, icon: Icon, color, bg, onClick, active }: {
  label: string; value: number; icon: any; color: string; bg: string; onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left w-full ${active ? "ring-2 ring-offset-1 ring-purple-400 shadow-md" : "hover:shadow-sm"} ${bg}`}
    >
      <div className={`p-2 rounded-lg ${color} bg-white/60`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
      </div>
    </button>
  );
}

/* ─── Linha da tabela ─── */
function ActionRow({ action, onOpen }: { action: any; onOpen: (a: any) => void }) {
  const overdue = isOverdue(action.dueDate, action.status);
  return (
    <tr
      className="border-b border-gray-100 hover:bg-purple-50 transition-colors cursor-pointer"
      onClick={() => onOpen(action)}
    >
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-mono text-purple-700 font-semibold">{action.assessmentCode}</span>
          <span className="text-xs text-gray-500">#{action.id}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-sm text-gray-700 font-medium truncate max-w-[160px]">{action.organizationName || "—"}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-800 font-medium line-clamp-2 max-w-[280px]">{action.title}</span>
          <span className="text-xs text-gray-400">{action.domainId}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge className={`text-xs border ${STATUS_COLORS[action.status] || "bg-gray-100 text-gray-600"}`}>
          {STATUS_LABELS[action.status] || action.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[action.priority] || "bg-gray-400"}`} />
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[action.priority] || "bg-gray-100 text-gray-600"}`}>
            {PRIORITY_LABELS[action.priority] || action.priority}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className={`flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(action.dueDate)}
          {overdue && <span className="ml-1 text-red-500">(vencido)</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Users className="h-3.5 w-3.5" />
          <span className="truncate max-w-[120px]">{action.responsibleName || "Sem responsável"}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-gray-500">
          {action.validatorName ? (
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-purple-500" />
              {action.validatorName}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-gray-400">{formatDateTime(action.submittedForValidationAt)}</div>
      </td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-3 text-purple-600 hover:bg-purple-100 gap-1.5 text-xs font-medium"
          onClick={() => onOpen(action)}
          title="Abrir tela de validação"
        >
          <Eye className="h-3.5 w-3.5" />
          Validar
        </Button>
      </td>
    </tr>
  );
}

/* ─── Modal de Detalhes da Ação ─── */
function ActionDetailModal({
  actionId,
  onClose,
  onActionUpdated,
}: {
  actionId: number;
  onClose: () => void;
  onActionUpdated: () => void;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("detalhes");
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data: action, isLoading, refetch } = trpc.assessments.getActionDetails.useQuery(
    { actionId },
    { enabled: !!actionId }
  );

  const assumeMutation = trpc.assessments.assumeActionValidation.useMutation({
    onSuccess: () => {
      toast.success("Você assumiu a validação desta ação.");
      refetch();
      onActionUpdated();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const approveMutation = trpc.assessments.approveActionValidation.useMutation({
    onSuccess: () => {
      toast.success("Ação aprovada com sucesso!");
      setShowApproveForm(false);
      setApproveNotes("");
      refetch();
      onActionUpdated();
    },
    onError: (err) => toast.error(`Erro ao aprovar: ${err.message}`),
  });

  const rejectMutation = trpc.assessments.rejectActionValidation.useMutation({
    onSuccess: () => {
      toast.success("Ajustes solicitados. O responsável será notificado.");
      setShowRejectForm(false);
      setRejectReason("");
      refetch();
      onActionUpdated();
    },
    onError: (err) => toast.error(`Erro ao solicitar ajustes: ${err.message}`),
  });

  const isInValidation = ["em_validacao", "aguardando_validacao", "aguardando_nova_validacao"].includes(action?.status || "");
  const canValidate = ["admin_global", "consultor"].includes(user?.role || "");
  const isMyValidation = action?.validatorId === user?.id || !action?.validatorId;
  const isNewValidation = action?.status === "aguardando_nova_validacao";

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5 text-purple-600" />
            Detalhes da Ação
          </DialogTitle>
          <DialogDescription>
            Revise os detalhes, evidências e histórico antes de tomar uma decisão.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : !action ? (
          <div className="py-8 text-center text-gray-400">Ação não encontrada.</div>
        ) : (
          <>
            {/* Cabeçalho da ação */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base leading-snug">{action.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={`text-xs border ${STATUS_COLORS[action.status] || "bg-gray-100"}`}>
                      {STATUS_LABELS[action.status] || action.status}
                    </Badge>
                    <Badge className={`text-xs ${PRIORITY_COLORS[action.priority] || "bg-gray-100"}`}>
                      {PRIORITY_LABELS[action.priority] || action.priority}
                    </Badge>
                    {isOverdue(action.dueDate, action.status) && (
                      <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Vencido</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-gray-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  <span>{action.organizationName || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  <span>{action.responsibleName || action.responsibleUserName || "Sem responsável"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span>Prazo: {formatDate(action.dueDate)}</span>
                </div>
                {action.validatorName && (
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-purple-500" />
                    <span>Consultor: {action.validatorName}</span>
                  </div>
                )}
                {action.submittedForValidationAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Enviado: {formatDateTime(action.submittedForValidationAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Aviso de ajustes solicitados */}
            {action.status === "ajustes_solicitados" && action.validationRejectionReason && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-800">Ajustes solicitados pelo consultor</p>
                    <p className="text-sm text-orange-700 mt-1">{action.validationRejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Abas */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="detalhes" className="gap-1.5 text-xs">
                  <Info className="h-3.5 w-3.5" /> Detalhes
                </TabsTrigger>
                <TabsTrigger value="evidencias" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  Evidências {action.evidences?.length > 0 && `(${action.evidences.length})`}
                </TabsTrigger>
                <TabsTrigger value="historico" className="gap-1.5 text-xs">
                  <History className="h-3.5 w-3.5" />
                  Histórico {action.history?.length > 0 && `(${action.history.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Aba Detalhes */}
              <TabsContent value="detalhes" className="space-y-4 pt-2">
                {action.description && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descrição</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{action.description}</p>
                  </div>
                )}
                {action.notes && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas Internas</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{action.notes}</p>
                  </div>
                )}
                {action.observations && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Observações do Responsável</p>
                    <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-lg p-3 leading-relaxed">{action.observations}</p>
                  </div>
                )}
                {action.validationNotes && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas da Validação</p>
                    <p className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-lg p-3 leading-relaxed">{action.validationNotes}</p>
                  </div>
                )}
                {!action.description && !action.notes && !action.observations && (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhum detalhe adicional registrado.</p>
                )}
              </TabsContent>

              {/* Aba Evidências */}
              <TabsContent value="evidencias" className="pt-2">
                {!action.evidences || action.evidences.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FileText className="h-10 w-10 text-gray-200 mb-2" />
                    <p className="text-gray-400 text-sm">Nenhuma evidência anexada ainda.</p>
                    <p className="text-gray-300 text-xs mt-1">O responsável deve anexar documentos comprobatórios.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {action.evidences.map((ev: any) => (
                      <div key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-purple-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{ev.documentName || ev.description || "Evidência"}</p>
                            <p className="text-xs text-gray-400">{formatDateTime(ev.createdAt)}</p>
                          </div>
                        </div>
                        {ev.fileUrl && (
                          <a
                            href={ev.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 ml-2"
                          >
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
                              <ExternalLink className="h-3 w-3" /> Ver
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Aba Histórico */}
              <TabsContent value="historico" className="pt-2">
                {!action.history || action.history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <History className="h-10 w-10 text-gray-200 mb-2" />
                    <p className="text-gray-400 text-sm">Nenhum histórico registrado.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {action.history.map((h: any) => (
                      <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${HISTORY_COLORS[h.changeType] || "bg-gray-100 text-gray-600"}`}>
                          {HISTORY_LABELS[h.changeType] || h.changeType}
                        </div>
                        <div className="min-w-0 flex-1">
                          {h.notes && <p className="text-sm text-gray-700">{h.notes}</p>}
                          {(h.previousValue || h.newValue) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {h.previousValue && <span className="line-through mr-1">{STATUS_LABELS[h.previousValue] || h.previousValue}</span>}
                              {h.newValue && <span className="font-medium text-gray-600">{STATUS_LABELS[h.newValue] || h.newValue}</span>}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {h.changedByName || "Sistema"} · {formatDateTime(h.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Área de decisão do consultor */}
            {canValidate && isInValidation && (
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Decisão do Consultor</p>

                {/* Assumir validação */}
                {action.status === "aguardando_validacao" && !action.validatorId && (
                  <Button
                    className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={assumeMutation.isPending}
                    onClick={() => assumeMutation.mutate({ actionId })}
                  >
                    {assumeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                    Assumir Validação
                  </Button>
                )}

                {/* Aviso de reenvio após ajustes */}
                {isNewValidation && (
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex items-start gap-2">
                    <RotateCcw className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-800">Reenvio após ajustes</p>
                      <p className="text-xs text-indigo-600 mt-0.5">O responsável realizou os ajustes e reenviou para nova validação.</p>
                    </div>
                  </div>
                )}

                {/* Aprovar */}
                {(action.status === "em_validacao" || (action.status === "aguardando_validacao" && isMyValidation) || isNewValidation) && (
                  <>
                    {!showApproveForm && !showRejectForm && (
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => { setShowApproveForm(true); setShowRejectForm(false); }}
                        >
                          <ThumbsUp className="h-4 w-4" /> Aprovar Ação
                        </Button>
                        <Button
                          className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={() => { setShowRejectForm(true); setShowApproveForm(false); }}
                        >
                          <ThumbsDown className="h-4 w-4" /> Solicitar Ajustes
                        </Button>
                      </div>
                    )}

                    {showApproveForm && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-green-800">Aprovar esta ação</p>
                        <Textarea
                          placeholder="Observações da validação (opcional)..."
                          value={approveNotes}
                          onChange={e => setApproveNotes(e.target.value)}
                          className="text-sm min-h-[80px] bg-white"
                        />
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate({ actionId, validationNotes: approveNotes || undefined })}
                          >
                            {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Confirmar Aprovação
                          </Button>
                          <Button variant="outline" onClick={() => setShowApproveForm(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {showRejectForm && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-orange-800">Solicitar ajustes</p>
                        <Textarea
                          placeholder="Descreva o que precisa ser ajustado (mínimo 10 caracteres)..."
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          className="text-sm min-h-[100px] bg-white"
                        />
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-2"
                            disabled={rejectMutation.isPending || rejectReason.length < 10}
                            onClick={() => rejectMutation.mutate({ actionId, rejectionReason: rejectReason })}
                          >
                            {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                            Solicitar Ajustes
                          </Button>
                          <Button variant="outline" onClick={() => setShowRejectForm(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {rejectReason.length > 0 && rejectReason.length < 10 && (
                          <p className="text-xs text-orange-600">Mínimo de 10 caracteres ({rejectReason.length}/10)</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Ação já concluída */}
            {action.status === "concluida" && action.validatedAt && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Ação validada e concluída</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      Aprovada por {action.validatorName} em {formatDateTime(action.validatedAt)}
                    </p>
                    {action.validationNotes && (
                      <p className="text-sm text-green-700 mt-2">{action.validationNotes}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Componente principal ─── */
export default function GlobalActionPanel() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("aguardando_validacao");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const isInternal = user?.role === "admin_global" || user?.role === "consultor";

  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = trpc.assessments.getGlobalActionStats.useQuery(
    undefined,
    { enabled: isInternal }
  );

  const { data: orgsData } = trpc.assessments.getOrganizationsWithActions.useQuery(
    undefined,
    { enabled: isInternal }
  );

  const { data: queueData, isLoading: loadingQueue, refetch: refetchQueue } = trpc.assessments.getGlobalActionQueue.useQuery(
    {
      statusFilter: activeTab,
      priorityFilter,
      organizationId: orgFilter,
      search: search || undefined,
      page,
      pageSize: PAGE_SIZE,
    },
    { enabled: isInternal, keepPreviousData: true }
  );

  const items = queueData?.items || [];
  const total = queueData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleRefresh = () => {
    refetchStats();
    refetchQueue();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handleOpenAction = (action: any) => {
    const source = action.sourceTable || 'action_plans';
    navigate(`/plano-acao/validacao/${action.id}?source=${source}`);
  };

  if (!isInternal) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Acesso restrito à Equipe Interna.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Central Global de Acompanhamento</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Visão consolidada de todas as ações — todos os clientes
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 text-gray-600"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Indicadores de resumo */}
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatCard
              label="Aguardando Validação"
              value={stats?.aguardando_validacao || 0}
              icon={Clock}
              color="text-amber-600"
              bg="bg-amber-50 border-amber-200"
              active={activeTab === "aguardando_validacao"}
              onClick={() => handleTabChange("aguardando_validacao")}
            />
            <StatCard
              label="Nova Validação"
              value={stats?.aguardando_nova_validacao || 0}
              icon={RotateCcw}
              color="text-indigo-600"
              bg="bg-indigo-50 border-indigo-200"
              active={activeTab === "aguardando_nova_validacao"}
              onClick={() => handleTabChange("aguardando_nova_validacao")}
            />
            <StatCard
              label="Em Validação"
              value={stats?.em_validacao || 0}
              icon={Shield}
              color="text-purple-600"
              bg="bg-purple-50 border-purple-200"
              active={activeTab === "em_validacao"}
              onClick={() => handleTabChange("em_validacao")}
            />
            <StatCard
              label="Ajustes Solicitados"
              value={stats?.ajustes_solicitados || 0}
              icon={RotateCcw}
              color="text-orange-600"
              bg="bg-orange-50 border-orange-200"
              active={activeTab === "ajustes_solicitados"}
              onClick={() => handleTabChange("ajustes_solicitados")}
            />
            <StatCard
              label="Pendentes"
              value={stats?.pendente || 0}
              icon={AlertCircle}
              color="text-slate-600"
              bg="bg-slate-50 border-slate-200"
              active={activeTab === "pendente"}
              onClick={() => handleTabChange("pendente")}
            />
            <StatCard
              label="Em Andamento"
              value={stats?.em_andamento || 0}
              icon={Activity}
              color="text-blue-600"
              bg="bg-blue-50 border-blue-200"
              active={activeTab === "em_andamento"}
              onClick={() => handleTabChange("em_andamento")}
            />
            <StatCard
              label="Validadas"
              value={stats?.concluida || 0}
              icon={CheckCircle2}
              color="text-green-600"
              bg="bg-green-50 border-green-200"
              active={activeTab === "concluida"}
              onClick={() => handleTabChange("concluida")}
            />
            <StatCard
              label="Vencidas"
              value={stats?.vencidas || 0}
              icon={AlertTriangle}
              color="text-red-600"
              bg="bg-red-50 border-red-200"
              active={false}
            />
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtros</span>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por título, avaliação, cliente, responsável..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={orgFilter ? String(orgFilter) : "all"} onValueChange={v => { setOrgFilter(v === "all" ? undefined : Number(v)); setPage(1); }}>
              <SelectTrigger className="h-9 w-[180px] text-sm">
                <SelectValue placeholder="Cliente / Organização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {(orgsData || []).map((org: any) => (
                  <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-[140px] text-sm">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
            {(search || orgFilter || priorityFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-gray-500"
                onClick={() => { setSearch(""); setOrgFilter(undefined); setPriorityFilter("all"); setPage(1); }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Abas e tabela */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Abas */}
          <div className="border-b border-gray-200 px-4 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const count = stats ? (stats as any)[tab.id] ?? (tab.id === "all" ? stats.total : 0) : 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-purple-600 text-purple-700"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${activeTab === tab.id ? tab.color : ""}`} />
                    {tab.label}
                    {tab.id !== "all" && count > 0 && (
                      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        activeTab === tab.id ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabela */}
          {loadingQueue ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma ação encontrada</p>
              <p className="text-gray-400 text-sm mt-1">
                {search || orgFilter || priorityFilter !== "all"
                  ? "Tente ajustar os filtros aplicados."
                  : "Não há ações nesta categoria no momento."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Avaliação</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Título da Ação</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Prioridade</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Prazo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsável</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Consultor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Enviado em</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((action: any) => (
                    <ActionRow key={`${action.sourceTable || 'ap'}-${action.id}`} action={action} onOpen={handleOpenAction} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                Exibindo {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} de {total} ações
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
