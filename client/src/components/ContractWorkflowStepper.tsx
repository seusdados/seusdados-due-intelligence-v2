import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, Lock, ArrowRight } from "lucide-react";

export type WorkflowStep = "analysis" | "mapping" | "risks" | "clauses" | "action_plan" | "reports";
export type StepStatus = "pending" | "running" | "done" | "blocked" | "error"
  // Compatibilidade com valores existentes no Detail:
  | "in_progress" | "completed" | "locked" | "needs_review";

type StepCounts = Partial<Record<WorkflowStep, number>>;

const STEP_LABELS: Record<WorkflowStep, string> = {
  analysis: "Análise",
  mapping: "Mapeamento",
  risks: "Riscos",
  clauses: "Cláusulas",
  action_plan: "Plano",
  reports: "Relatórios",
};

function normalizeStatus(status: StepStatus): "pending" | "running" | "done" | "blocked" | "error" {
  switch (status) {
    case "in_progress": return "running";
    case "completed": return "done";
    case "locked": return "blocked";
    case "needs_review": return "done";
    default: return status;
  }
}

function statusPill(rawStatus: StepStatus) {
  const status = normalizeStatus(rawStatus);
  switch (status) {
    case "done":
      return <Badge className="bg-emerald-600 gap-1"><CheckCircle className="h-3 w-3" />Concluída</Badge>;
    case "running":
      return <Badge className="bg-amber-500 gap-1"><Loader2 className="h-3 w-3 animate-spin" />Em andamento</Badge>;
    case "blocked":
      return <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Aguardando</Badge>;
    case "error":
      return <Badge variant="destructive">Erro</Badge>;
    default:
      return <Badge variant="outline">Pendente</Badge>;
  }
}

function canNavigate(rawStatus: StepStatus) {
  const status = normalizeStatus(rawStatus);
  return status === "done" || status === "running" || status === "pending";
}

export function ContractWorkflowStepper(props: {
  currentStep: WorkflowStep;
  stepStatuses: Record<WorkflowStep, StepStatus>;
  stepCounts?: StepCounts;
  isConsultant: boolean;
  onStepClick?: (step: WorkflowStep) => void;
  onStepAction?: (step: WorkflowStep, action: 'generate' | 'approve' | 'refine' | 'view' | 'export') => void;
  isLoading?: Partial<Record<WorkflowStep, boolean>>;

  // Props do pipeline real
  pipelineStageLabel?: string | null;
  pipelineProgress?: number | null; // 0-100
  compliancePercent?: number | null; // 0-100
  isProcessingPipeline?: boolean; // true enquanto queued/analyzing
}) {
  const {
    currentStep,
    stepStatuses,
    stepCounts,
    isConsultant,
    onStepClick,
    onStepAction,
    isLoading,
    pipelineStageLabel,
    pipelineProgress,
    compliancePercent,
    isProcessingPipeline,
  } = props;

  const steps: WorkflowStep[] = ["analysis", "mapping", "risks", "clauses", "action_plan", "reports"];

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-4 space-y-4">
        {/* Linha superior: Pipeline vs Conformidade (não confundir!) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Progresso do pipeline</div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {pipelineStageLabel ? `Processando: ${pipelineStageLabel}` : "Processando: —"}
              </div>
              {typeof pipelineProgress === "number" && (
                <Badge variant="outline" className="text-[11px]">{Math.round(pipelineProgress)}%</Badge>
              )}
            </div>
            {typeof pipelineProgress === "number" && (
              <div className="mt-2">
                <Progress value={Math.max(0, Math.min(100, pipelineProgress))} />
              </div>
            )}
            {isProcessingPipeline && (
              <div className="mt-2 text-xs text-slate-500">
                O pipeline roda automaticamente. Não é necessário clicar em etapas.
              </div>
            )}
          </div>

          <div className="shrink-0">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Conformidade LGPD</div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-slate-900">
                {typeof compliancePercent === "number" ? `${Math.round(compliancePercent)}%` : "—"}
              </div>
              <Badge variant="outline" className="text-[11px]">Score</Badge>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Indicador de conformidade (não é progresso do pipeline)
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {steps.map((step, idx) => {
            const status = stepStatuses[step] ?? "pending";
            const isActive = step === currentStep;
            const count = stepCounts?.[step];
            const loading = !!isLoading?.[step];

            return (
              <div key={step} className="flex items-center gap-2">
                <button
                  type="button"
                  className={[
                    "min-w-[170px] rounded-xl border p-3 text-left transition",
                    isActive ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50",
                    !canNavigate(status) ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                  ].join(" ")}
                  onClick={() => {
                    if (!onStepClick) return;
                    if (!canNavigate(status)) return;
                    onStepClick(step);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{STEP_LABELS[step]}</div>
                      <div className="mt-1 flex items-center gap-2">
                        {statusPill(status)}
                        {typeof count === "number" && (
                          <Badge variant="outline" className="text-[11px]">{count}</Badge>
                        )}
                      </div>
                    </div>

                    {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                  </div>

                  {/* CTA opcional: só pós-pipeline, não obrigatório */}
                  {isConsultant && onStepAction && (step === "clauses" || step === "action_plan" || step === "reports") && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        disabled={!!isProcessingPipeline || loading}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onStepAction(step, 'view');
                        }}
                        title={isProcessingPipeline ? "Disponível após conclusão do pipeline" : ""}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Ver detalhes
                      </Button>
                    </div>
                  )}
                </button>

                {idx < steps.length - 1 && (
                  <div className="text-slate-300 shrink-0">→</div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default ContractWorkflowStepper;
