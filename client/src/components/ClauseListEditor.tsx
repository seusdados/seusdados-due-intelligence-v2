/**
 * Componente: Lista de Cláusulas para Edição (Coluna 1)
 * 
 * Exibe a lista de cláusulas com controles individuais para:
 * - Aceitar/Recusar
 * - Ocultar/Mostrar
 * - Refinar com IA
 * - Scroll sincronizado com Coluna 2
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Check,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  MousePointerClick,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ClauseVersionComparison } from "./ClauseVersionComparison";
import { ClauseCommentsPanel } from "./ClauseCommentsPanel";
import { trpc } from "@/lib/trpc";

// Interface para versão de cláusula
interface ClauseVersion {
  id: number;
  versionNumber: number;
  title: string;
  content: string;
  changeDescription?: string;
  createdById: number;
  createdByName?: string;
  createdAt: string;
  isActive: boolean;
}

// Interface para cláusula
interface Clause {
  id: string;
  dbId?: number;
  titulo: string;
  conteudo: string;
  bloco?: string;
  version?: number;
  versions?: ClauseVersion[];
}

// Props do componente
interface ClauseListEditorProps {
  clauses: Clause[];
  acceptedClauses: Record<string, boolean>;
  hiddenClauses: Record<string, boolean>;
  refinementInstructions: Record<string, string>;
  onAcceptChange: (clauseId: string, accepted: boolean) => void;
  onHiddenChange: (clauseId: string, hidden: boolean) => void;
  onRefinementChange: (clauseId: string, instruction: string) => void;
  onRefine: (clauseId: string, instruction: string) => void;
  onAcceptAll: () => void;
  isRefining?: boolean;
  refiningClauseId?: string | null;
  // Novo prop para scroll sincronizado
  onClauseClick?: (clauseId: string) => void;
  // Props para comentários
  analysisId?: number;
}

export function ClauseListEditor({
  clauses,
  acceptedClauses,
  hiddenClauses,
  refinementInstructions,
  onAcceptChange,
  onHiddenChange,
  onRefinementChange,
  onRefine,
  onAcceptAll,
  isRefining = false,
  refiningClauseId = null,
  onClauseClick,
  analysisId,
}: ClauseListEditorProps) {
  const [expandedClauses, setExpandedClauses] = useState<Record<string, boolean>>({});
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);

  // Query para contar comentários pendentes
  const { data: commentCounts } = trpc.clauseComments.listByAnalysis.useQuery(
    { analysisId: analysisId! },
    { enabled: !!analysisId }
  );

  const toggleExpanded = (clauseId: string) => {
    setExpandedClauses(prev => ({
      ...prev,
      [clauseId]: !prev[clauseId],
    }));
  };

  // Handler para clique na cláusula (scroll sincronizado)
  const handleClauseClick = useCallback((clauseId: string, e: React.MouseEvent) => {
    // Não disparar scroll se clicou em um botão ou textarea
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('textarea') || target.closest('input')) {
      return;
    }
    onClauseClick?.(clauseId);
  }, [onClauseClick]);

  const acceptedCount = clauses.filter(c => acceptedClauses[c.id]).length;
  const hiddenCount = clauses.filter(c => hiddenClauses[c.id]).length;
  const pendingCount = clauses.length - acceptedCount - hiddenCount;

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho com estatísticas */}
      <div className="flex items-center justify-between gap-4 p-3 bg-blue-50 border-b border-blue-200 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-white text-blue-700 border-blue-300">
            {clauses.length} Cláusulas
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            {acceptedCount} Aceitas
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
            {pendingCount} Pendentes
          </Badge>
          {hiddenCount > 0 && (
            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-300">
              {hiddenCount} Ocultas
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAcceptAll}
          className="border-green-300 text-green-700 hover:bg-green-50"
        >
          <Check className="w-4 h-4 mr-1" />
          Aceitar Todas
        </Button>
      </div>

      {/* Lista de Cláusulas */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {clauses.map((clause, index) => {
            const isAccepted = acceptedClauses[clause.id];
            const isHidden = hiddenClauses[clause.id];
            const isExpanded = expandedClauses[clause.id] ?? false;
            const instruction = refinementInstructions[clause.id] || '';
            const isCurrentlyRefining = isRefining && refiningClauseId === clause.id;

            return (
              <div key={clause.id} className="space-y-2">
              <Card
                className={cn(
                  "transition-all duration-200 cursor-pointer",
                  isAccepted && "border-green-300 bg-green-50/30",
                  isHidden && "opacity-50 border-slate-200 bg-slate-50",
                  !isAccepted && !isHidden && "border-slate-200 hover:border-blue-300 hover:shadow-sm"
                )}
                onClick={(e) => handleClauseClick(clause.id, e)}
              >
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-start gap-3">
                    {/* Checkbox de Aceite */}
                    <button
                      onClick={() => onAcceptChange(clause.id, !isAccepted)}
                      className={cn(
                        "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        isAccepted
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-slate-300 hover:border-green-400"
                      )}
                    >
                      {isAccepted && <Check className="w-3 h-3" />}
                    </button>

                    {/* Título e Badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={cn(
                            "text-[10px]",
                            isAccepted
                              ? "bg-green-100 text-green-800"
                              : isHidden
                              ? "bg-slate-100 text-slate-500"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          Cláusula {index + 1}
                        </Badge>
                        {isAccepted && (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        )}
                        {isHidden && (
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {/* Indicador de scroll sincronizado */}
                        {onClauseClick && (
                          <span title="Clique para ir à cláusula no documento">
                            <MousePointerClick className="w-3 h-3 text-slate-300" />
                          </span>
                        )}
                      </div>
                      <h4 className={cn(
                        "text-sm font-medium",
                        isHidden ? "text-slate-500 line-through" : "text-slate-900"
                      )}>
                        {clause.titulo}
                      </h4>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => onAcceptChange(clause.id, false)}
                        title="Recusar"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                        onClick={() => onHiddenChange(clause.id, !isHidden)}
                        title={isHidden ? "Mostrar" : "Ocultar"}
                      >
                        {isHidden ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-500"
                        onClick={() => toggleExpanded(clause.id)}
                        title="Expandir"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      {/* Botão de Histórico de Versões */}
                      {clause.versions && clause.versions.length > 1 && (
                        <ClauseVersionComparison
                          clauseId={clause.dbId || 0}
                          clauseTitle={clause.titulo}
                          versions={clause.versions}
                          currentContent={clause.conteudo}
                          onRollback={(version) => {
                            toast.success(`Revertido para versão ${version.versionNumber}`);
                          }}
                        />
                      )}
                      {/* Botão de Comentários */}
                      {analysisId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-7 w-7 p-0 relative",
                            commentsOpenFor === clause.id
                              ? "text-purple-600"
                              : "text-slate-400 hover:text-purple-500"
                          )}
                          onClick={() => setCommentsOpenFor(
                            commentsOpenFor === clause.id ? null : clause.id
                          )}
                          title="Comentários"
                        >
                          <MessageSquare className="w-4 h-4" />
                          {commentCounts && commentCounts[clause.id] && commentCounts[clause.id].length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                              {commentCounts[clause.id].length}
                            </span>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Conteúdo Expandido */}
                <Collapsible open={isExpanded}>
                  <CollapsibleContent>
                    <CardContent className="p-3 pt-0">
                      {/* Preview do Conteúdo */}
                      <div className="bg-white border rounded-lg p-3 mb-3 max-h-[200px] overflow-y-auto">
                        <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 text-xs">
                          <Streamdown>{clause.conteudo}</Streamdown>
                        </div>
                      </div>

                      {/* Área de Refinamento */}
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                          <label className="text-xs font-medium text-amber-700">
                            Refinar com IA
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Instruções para refinar... Ex: Adicionar prazo de 72h"
                            value={instruction}
                            onChange={(e) => onRefinementChange(clause.id, e.target.value)}
                            rows={2}
                            className="flex-1 text-xs border-amber-200 bg-white"
                          />
                          <Button
                            onClick={() => onRefine(clause.id, instruction)}
                            disabled={!instruction.trim() || isCurrentlyRefining}
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 h-auto"
                          >
                            {isCurrentlyRefining ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Painel de Comentários */}
              {commentsOpenFor === clause.id && analysisId && (
                <div className="mt-2 h-[400px]">
                  <ClauseCommentsPanel
                    analysisId={analysisId}
                    clauseId={clause.id}
                    clauseTitle={clause.titulo}
                    onClose={() => setCommentsOpenFor(null)}
                  />
                </div>
              )}
            </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ClauseListEditor;
