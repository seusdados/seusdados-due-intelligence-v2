import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Lock, Loader2 } from "lucide-react";

export type PipelineStage =
  | "queued"
  | "extraction"
  | "analysis"
  | "mapping"
  | "risks"
  | "clauses"
  | "action_plan"
  | "reports"
  | "completed"
  | "error";

const STAGE_ORDER: PipelineStage[] = [
  "queued",
  "extraction",
  "analysis",
  "mapping",
  "risks",
  "clauses",
  "action_plan",
  "reports",
  "completed",
];

const LABEL: Record<string, string> = {
  queued: "Fila",
  extraction: "Extração",
  analysis: "Análise",
  mapping: "Mapeamento",
  risks: "Riscos",
  clauses: "Cláusulas",
  action_plan: "Plano de ação",
  reports: "Relatórios",
  completed: "Concluído",
  error: "Erro",
};

function idx(s?: string | null) {
  const v = String(s || "").toLowerCase() as PipelineStage;
  const i = STAGE_ORDER.indexOf(v);
  return i >= 0 ? i : 0;
}

export function isStageAtLeast(current?: string | null, required?: string | null) {
  return idx(current) >= idx(required);
}

export function PipelineStageGate(props: {
  requiredStage: PipelineStage;
  currentStage?: string | null;
  stageProgress?: number | null;      // 0-100 da fase atual
  overallProgress?: number | null;    // opcional
  title?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const {
    requiredStage,
    currentStage,
    stageProgress,
    overallProgress,
    title,
    hint,
    children,
  } = props;

  const ready = isStageAtLeast(currentStage, requiredStage);
  if (ready) return <>{children}</>;

  const cur = String(currentStage || "queued").toLowerCase();
  const curLabel = LABEL[cur] || cur;
  const reqLabel = LABEL[requiredStage] || requiredStage;

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-500" />
              {title || `Aguardando fase: ${reqLabel}`}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {hint || `Esta aba será preenchida automaticamente quando o pipeline alcançar ${reqLabel}.`}
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processando: {curLabel}
          </Badge>
        </div>

        {typeof stageProgress === "number" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Progresso da fase atual</span>
              <span>{Math.round(stageProgress)}%</span>
            </div>
            <Progress value={Math.max(0, Math.min(100, stageProgress))} />
          </div>
        )}

        {typeof overallProgress === "number" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Progresso geral</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={Math.max(0, Math.min(100, overallProgress))} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
