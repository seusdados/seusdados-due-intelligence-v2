import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle2, Eye, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConformidadeResultadoHeaderProps {
  assessment: {
    id: number;
    title: string;
    createdAt: Date | string;
    dueDate?: Date | string;
    status: string;
    totalQuestions?: number;
    answeredQuestions?: number;
  };
  onNewApplication?: () => void;
  onEditDeadline?: () => void;
}

const timelineStages = [
  { id: 1, label: "Respondentes", icon: "✓" },
  { id: 2, label: "Enviar novamente", icon: "✓" },
  { id: 3, label: "Aguardando respostas", icon: "⏱", current: true },
  { id: 4, label: "Análise", icon: "👁" },
];

const statusColors: Record<string, string> = {
  enviado: "bg-yellow-100 text-yellow-800 border-yellow-300",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-300",
  concluida: "bg-green-100 text-green-800 border-green-300",
  pendente: "bg-gray-100 text-gray-800 border-gray-300",
};

const statusLabels: Record<string, string> = {
  enviado: "Enviado",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  pendente: "Pendente",
};

export function ConformidadeResultadoHeader({
  assessment,
  onNewApplication,
  onEditDeadline,
}: ConformidadeResultadoHeaderProps) {
  const createdDate = new Date(assessment.createdAt);
  const dueDate = assessment.dueDate ? new Date(assessment.dueDate) : null;
  const responded = assessment.answeredQuestions || 0;
  const total = assessment.totalQuestions || 1;

  const statusKey = assessment.status.toLowerCase() as keyof typeof statusColors;
  const statusColor = statusColors[statusKey] || statusColors.pendente;
  const statusLabel = statusLabels[statusKey] || "Pendente";

  return (
    <div className="space-y-6">
      {/* Barra Superior com Botão */}
      <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm p-4 rounded-lg border border-gray-200">
        <Button
          onClick={onNewApplication}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova aplicação
        </Button>
      </div>

      {/* Tabela de Resumo */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-5 gap-6 p-6">
          {/* Data de Criação */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Data de criação
            </p>
            <p className="text-sm font-medium text-gray-900">
              {format(createdDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </div>

          {/* Prazo */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Prazo
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">
                {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "—"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditDeadline}
                className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Status
            </p>
            <Badge className={`${statusColor} border`}>
              {statusLabel}
            </Badge>
          </div>

          {/* Respostas */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Respostas
            </p>
            <p className="text-sm font-medium text-gray-900">
              {responded} / {total}
            </p>
          </div>

          {/* Linha do Tempo (Placeholder) */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Linha do tempo
            </p>
            <p className="text-xs text-gray-500">Ver abaixo</p>
          </div>
        </div>
      </div>

      {/* Linha do Tempo Horizontal */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-between relative">
          {/* Linhas conectoras */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-purple-500 to-gray-300" />

          {/* Etapas */}
          <div className="relative flex justify-between w-full gap-4">
            {timelineStages.map((stage, index) => {
              const isCompleted = index < 2;
              const isCurrent = stage.current;
              const isPending = index > 2;

              return (
                <div key={stage.id} className="flex flex-col items-center flex-1">
                  {/* Ponto */}
                  <div
                    className={`w-6 h-6 rounded-full border-4 flex items-center justify-center mb-3 relative z-10 ${
                      isCompleted
                        ? "bg-purple-600 border-purple-600"
                        : isCurrent
                        ? "bg-purple-600 border-purple-600 animate-pulse"
                        : "bg-gray-300 border-gray-300"
                    }`}
                  >
                    {isCompleted && (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    )}
                    {isCurrent && (
                      <Clock className="w-4 h-4 text-white animate-spin" />
                    )}
                  </div>

                  {/* Label */}
                  <p
                    className={`text-xs font-medium text-center max-w-[80px] ${
                      isCompleted
                        ? "text-purple-700"
                        : isCurrent
                        ? "text-purple-600 font-semibold"
                        : "text-gray-500"
                    }`}
                  >
                    {stage.label}
                  </p>

                  {/* Ícone adicional */}
                  {isPending && (
                    <Eye className="w-4 h-4 text-gray-400 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
