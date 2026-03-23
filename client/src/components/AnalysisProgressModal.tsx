import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

interface AnalysisItem {
  id: string;
  fileName: string;
  fileLocation: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  timeRemaining?: number;
  error?: string;
}

interface AnalysisProgressModalProps {
  isOpen: boolean;
  analyses: AnalysisItem[];
  overallProgress: number;
}

export function AnalysisProgressModal({ isOpen, analyses, overallProgress }: AnalysisProgressModalProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Concluída</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800">Processando</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">Erro</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Aguardando</Badge>;
    }
  };

  const formatTimeRemaining = (seconds?: number) => {
    if (!seconds) return "";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            Processamento de Análises
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progresso Geral */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Progresso Geral</h3>
              <span className="text-sm font-semibold text-gray-600">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Lista de Análises */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Análises em Processamento</h3>
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors"
              >
                {/* Header com ícone e status */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(analysis.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{analysis.fileName}</p>
                      <p className="text-xs text-gray-500 truncate">{analysis.fileLocation}</p>
                    </div>
                  </div>
                  {getStatusBadge(analysis.status)}
                </div>

                {/* Barra de progresso */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Progresso da análise</span>
                    <span className="text-xs font-semibold text-gray-600">{analysis.progress}%</span>
                  </div>
                  <Progress value={analysis.progress} className="h-1.5" />
                </div>

                {/* Tempo restante ou erro */}
                {analysis.status === "processing" && analysis.timeRemaining && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="h-3 w-3" />
                    Tempo restante: <span className="font-semibold">{formatTimeRemaining(analysis.timeRemaining)}</span>
                  </div>
                )}

                {analysis.status === "error" && analysis.error && (
                  <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span>{analysis.error}</span>
                  </div>
                )}

                {analysis.status === "completed" && (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                    <CheckCircle className="h-3 w-3" />
                    Análise concluída com sucesso
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resumo */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            <p>
              <span className="font-semibold">{analyses.filter((a) => a.status === "completed").length}</span> concluída(s) •{" "}
              <span className="font-semibold">{analyses.filter((a) => a.status === "processing").length}</span> processando •{" "}
              <span className="font-semibold">{analyses.filter((a) => a.status === "error").length}</span> erro(s)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
