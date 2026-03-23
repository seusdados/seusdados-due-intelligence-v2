/**
 * Componente de Comparação Visual de Versões de Cláusulas
 * Exibe diff lado a lado com destaque de alterações
 */

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  GitCompare,
  Clock,
  User,
  FileText,
  ArrowRight,
  Plus,
  Minus,
  Equal,
} from "lucide-react";

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

interface ClauseVersion {
  id: number;
  version: number;
  content: string;
  createdAt: string;
  userName?: string;
  actionType: string;
  refinementInstructions?: string;
}

interface ClauseDiffViewerProps {
  isOpen: boolean;
  onClose: () => void;
  clauseTitle: string;
  oldVersion: ClauseVersion | null;
  newVersion: ClauseVersion;
}

// Função para calcular diff linha a linha
function computeLineDiff(oldText: string, newText: string): { oldLines: DiffLine[], newLines: DiffLine[] } {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const result = {
    oldLines: [] as DiffLine[],
    newLines: [] as DiffLine[],
  };
  
  // Algoritmo LCS simplificado para encontrar linhas comuns
  const lcs = new Map<string, number>();
  newLines.forEach((line, idx) => {
    if (!lcs.has(line)) {
      lcs.set(line, idx);
    }
  });
  
  let newIdx = 0;
  let oldIdx = 0;
  
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx >= oldLines.length) {
      // Restante são adições
      result.oldLines.push({ type: 'unchanged', content: '', lineNumber: undefined });
      result.newLines.push({ type: 'added', content: newLines[newIdx], lineNumber: newIdx + 1 });
      newIdx++;
    } else if (newIdx >= newLines.length) {
      // Restante são remoções
      result.oldLines.push({ type: 'removed', content: oldLines[oldIdx], lineNumber: oldIdx + 1 });
      result.newLines.push({ type: 'unchanged', content: '', lineNumber: undefined });
      oldIdx++;
    } else if (oldLines[oldIdx] === newLines[newIdx]) {
      // Linha igual
      result.oldLines.push({ type: 'unchanged', content: oldLines[oldIdx], lineNumber: oldIdx + 1 });
      result.newLines.push({ type: 'unchanged', content: newLines[newIdx], lineNumber: newIdx + 1 });
      oldIdx++;
      newIdx++;
    } else if (lcs.has(oldLines[oldIdx]) && lcs.get(oldLines[oldIdx])! > newIdx) {
      // Linha antiga existe no novo, mas há adições antes
      result.oldLines.push({ type: 'unchanged', content: '', lineNumber: undefined });
      result.newLines.push({ type: 'added', content: newLines[newIdx], lineNumber: newIdx + 1 });
      newIdx++;
    } else {
      // Linha removida
      result.oldLines.push({ type: 'removed', content: oldLines[oldIdx], lineNumber: oldIdx + 1 });
      result.newLines.push({ type: 'unchanged', content: '', lineNumber: undefined });
      oldIdx++;
    }
  }
  
  return result;
}

// Função para calcular diff palavra a palavra
function computeWordDiff(oldText: string, newText: string): { parts: { type: 'added' | 'removed' | 'unchanged', text: string }[] } {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  const parts: { type: 'added' | 'removed' | 'unchanged', text: string }[] = [];
  
  // Algoritmo simples de diff por palavras
  let i = 0, j = 0;
  
  while (i < oldWords.length || j < newWords.length) {
    if (i >= oldWords.length) {
      parts.push({ type: 'added', text: newWords[j] });
      j++;
    } else if (j >= newWords.length) {
      parts.push({ type: 'removed', text: oldWords[i] });
      i++;
    } else if (oldWords[i] === newWords[j]) {
      parts.push({ type: 'unchanged', text: oldWords[i] });
      i++;
      j++;
    } else {
      // Procurar se a palavra antiga aparece mais à frente no novo
      let foundInNew = newWords.slice(j + 1, j + 10).indexOf(oldWords[i]);
      let foundInOld = oldWords.slice(i + 1, i + 10).indexOf(newWords[j]);
      
      if (foundInNew !== -1 && (foundInOld === -1 || foundInNew <= foundInOld)) {
        // Há adições antes
        parts.push({ type: 'added', text: newWords[j] });
        j++;
      } else {
        // Há remoções
        parts.push({ type: 'removed', text: oldWords[i] });
        i++;
      }
    }
  }
  
  return { parts };
}

export function ClauseDiffViewer({
  isOpen,
  onClose,
  clauseTitle,
  oldVersion,
  newVersion,
}: ClauseDiffViewerProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Calcular diff
  const diff = useMemo(() => {
    if (!oldVersion) {
      return {
        oldLines: [],
        newLines: newVersion.content.split('\n').map((line, idx) => ({
          type: 'added' as const,
          content: line,
          lineNumber: idx + 1,
        })),
        wordDiff: { parts: [{ type: 'added' as const, text: newVersion.content }] },
        stats: {
          added: newVersion.content.split('\n').length,
          removed: 0,
          unchanged: 0,
        },
      };
    }
    
    const lineDiff = computeLineDiff(oldVersion.content, newVersion.content);
    const wordDiff = computeWordDiff(oldVersion.content, newVersion.content);
    
    const stats = {
      added: lineDiff.newLines.filter(l => l.type === 'added').length,
      removed: lineDiff.oldLines.filter(l => l.type === 'removed').length,
      unchanged: lineDiff.oldLines.filter(l => l.type === 'unchanged' && l.content).length,
    };
    
    return { ...lineDiff, wordDiff, stats };
  }, [oldVersion, newVersion]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur">
                <GitCompare className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-lg font-normal">Comparação de Versões</span>
                <p className="text-sm text-slate-400 font-light mt-1">{clauseTitle}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {/* Estatísticas */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
              <Plus className="h-3 w-3 mr-1" />
              {diff.stats.added} adições
            </Badge>
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
              <Minus className="h-3 w-3 mr-1" />
              {diff.stats.removed} remoções
            </Badge>
            <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">
              <Equal className="h-3 w-3 mr-1" />
              {diff.stats.unchanged} inalteradas
            </Badge>
          </div>
        </div>

        {/* Cabeçalhos das versões */}
        <div className="grid grid-cols-2 border-b bg-slate-50">
          {/* Versão anterior */}
          <div className="p-4 border-r">
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded bg-red-100">
                <FileText className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">
                  {oldVersion ? `Versão ${oldVersion.version}` : 'Versão inicial'}
                </p>
                {oldVersion && (
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(oldVersion.createdAt)}
                    </span>
                    {oldVersion.userName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {oldVersion.userName}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Nova versão */}
          <div className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded bg-green-100">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">
                  Versão {newVersion.version}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(newVersion.createdAt)}
                  </span>
                  {newVersion.userName && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {newVersion.userName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instruções de refinamento (se houver) */}
        {newVersion.refinementInstructions && (
          <div className="px-6 py-3 bg-purple-50 border-b border-purple-100">
            <p className="text-xs font-medium text-purple-700 mb-1">Instruções de refinamento:</p>
            <p className="text-sm text-purple-600">{newVersion.refinementInstructions}</p>
          </div>
        )}

        {/* Área de diff lado a lado */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-280px)]">
          <div className="grid grid-cols-2 divide-x">
            {/* Coluna esquerda - Versão anterior */}
            <div className="font-mono text-sm">
              {oldVersion ? (
                diff.oldLines.map((line, idx) => (
                  <div
                    key={`old-${idx}`}
                    className={`flex ${
                      line.type === 'removed' 
                        ? 'bg-red-50' 
                        : line.type === 'unchanged' && !line.content
                          ? 'bg-slate-50'
                          : ''
                    }`}
                  >
                    <div className="w-12 px-2 py-1 text-right text-xs text-slate-400 bg-slate-100 border-r select-none">
                      {line.lineNumber || ''}
                    </div>
                    <div className="flex-1 px-3 py-1 whitespace-pre-wrap break-words">
                      {line.type === 'removed' && (
                        <span className="text-red-700 bg-red-100 px-0.5">{line.content}</span>
                      )}
                      {line.type === 'unchanged' && line.content && (
                        <span className="text-slate-700">{line.content}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Versão inicial</p>
                  <p className="text-sm">Não há versão anterior para comparar</p>
                </div>
              )}
            </div>
            
            {/* Coluna direita - Nova versão */}
            <div className="font-mono text-sm">
              {diff.newLines.map((line, idx) => (
                <div
                  key={`new-${idx}`}
                  className={`flex ${
                    line.type === 'added' 
                      ? 'bg-green-50' 
                      : line.type === 'unchanged' && !line.content
                        ? 'bg-slate-50'
                        : ''
                  }`}
                >
                  <div className="w-12 px-2 py-1 text-right text-xs text-slate-400 bg-slate-100 border-r select-none">
                    {line.lineNumber || ''}
                  </div>
                  <div className="flex-1 px-3 py-1 whitespace-pre-wrap break-words">
                    {line.type === 'added' && (
                      <span className="text-green-700 bg-green-100 px-0.5">{line.content}</span>
                    )}
                    {line.type === 'unchanged' && line.content && (
                      <span className="text-slate-700">{line.content}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-500">
              {oldVersion && (
                <span className="flex items-center gap-1">
                  v{oldVersion.version}
                  <ArrowRight className="h-3 w-3" />
                  v{newVersion.version}
                </span>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
