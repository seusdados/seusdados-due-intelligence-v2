import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  History, 
  GitCompare, 
  ArrowLeft, 
  ArrowRight,
  RotateCcw,
  Clock,
  User,
  FileText,
  Plus,
  Minus,
  Equal,
  ChevronDown,
  ChevronUp,
  Eye,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

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

interface ClauseVersionComparisonProps {
  clauseId: number;
  clauseTitle: string;
  versions: ClauseVersion[];
  currentContent: string;
  onRollback?: (version: ClauseVersion) => void;
  disabled?: boolean;
}

// Função para calcular diff entre duas strings
function computeDiff(oldText: string, newText: string): DiffResult[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffResult[] = [];

  // Algoritmo LCS simplificado para diff
  const lcs = computeLCS(oldLines, newLines);
  
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (lcsIndex < lcs.length && oldIndex < oldLines.length && oldLines[oldIndex] === lcs[lcsIndex]) {
      // Linha comum
      if (newIndex < newLines.length && newLines[newIndex] === lcs[lcsIndex]) {
        result.push({ type: 'unchanged', content: oldLines[oldIndex], lineOld: oldIndex + 1, lineNew: newIndex + 1 });
        oldIndex++;
        newIndex++;
        lcsIndex++;
      } else {
        // Linha adicionada
        result.push({ type: 'added', content: newLines[newIndex], lineNew: newIndex + 1 });
        newIndex++;
      }
    } else if (lcsIndex < lcs.length && newIndex < newLines.length && newLines[newIndex] === lcs[lcsIndex]) {
      // Linha removida
      result.push({ type: 'removed', content: oldLines[oldIndex], lineOld: oldIndex + 1 });
      oldIndex++;
    } else if (oldIndex < oldLines.length && newIndex < newLines.length) {
      // Linha modificada
      result.push({ type: 'removed', content: oldLines[oldIndex], lineOld: oldIndex + 1 });
      result.push({ type: 'added', content: newLines[newIndex], lineNew: newIndex + 1 });
      oldIndex++;
      newIndex++;
    } else if (oldIndex < oldLines.length) {
      result.push({ type: 'removed', content: oldLines[oldIndex], lineOld: oldIndex + 1 });
      oldIndex++;
    } else if (newIndex < newLines.length) {
      result.push({ type: 'added', content: newLines[newIndex], lineNew: newIndex + 1 });
      newIndex++;
    }
  }

  return result;
}

// Longest Common Subsequence
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack para encontrar LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

interface DiffResult {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineOld?: number;
  lineNew?: number;
}

export function ClauseVersionComparison({
  clauseId,
  clauseTitle,
  versions,
  currentContent,
  onRollback,
  disabled = false
}: ClauseVersionComparisonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersionLeft, setSelectedVersionLeft] = useState<number | null>(null);
  const [selectedVersionRight, setSelectedVersionRight] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [showUnchanged, setShowUnchanged] = useState(true);

  // Ordenar versões por número (mais recente primeiro)
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  }, [versions]);

  // Versão atual (mais recente)
  const currentVersion = sortedVersions[0];

  // Selecionar versões padrão quando abrir
  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && sortedVersions.length >= 2) {
      setSelectedVersionLeft(sortedVersions[1]?.versionNumber || null);
      setSelectedVersionRight(sortedVersions[0]?.versionNumber || null);
    }
  };

  // Obter versão por número
  const getVersion = (versionNumber: number | null): ClauseVersion | null => {
    if (!versionNumber) return null;
    return versions.find(v => v.versionNumber === versionNumber) || null;
  };

  const leftVersion = getVersion(selectedVersionLeft);
  const rightVersion = getVersion(selectedVersionRight);

  // Calcular diff
  const diffResult = useMemo(() => {
    if (!leftVersion || !rightVersion) return [];
    return computeDiff(leftVersion.content, rightVersion.content);
  }, [leftVersion, rightVersion]);

  // Estatísticas do diff
  const diffStats = useMemo(() => {
    const added = diffResult.filter(d => d.type === 'added').length;
    const removed = diffResult.filter(d => d.type === 'removed').length;
    const unchanged = diffResult.filter(d => d.type === 'unchanged').length;
    return { added, removed, unchanged };
  }, [diffResult]);

  // Filtrar linhas baseado em showUnchanged
  const filteredDiff = useMemo(() => {
    if (showUnchanged) return diffResult;
    return diffResult.filter(d => d.type !== 'unchanged');
  }, [diffResult, showUnchanged]);

  const handleRollback = (version: ClauseVersion) => {
    if (onRollback) {
      onRollback(version);
      toast.success(`Revertido para versão ${version.versionNumber}`);
      setIsOpen(false);
    }
  };

  const handleCopyVersion = (version: ClauseVersion) => {
    navigator.clipboard.writeText(version.content);
    toast.success('Conteúdo copiado!');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Renderizar linha do diff
  const renderDiffLine = (diff: DiffResult, index: number) => {
    const baseClasses = "font-mono text-xs py-1 px-2 whitespace-pre-wrap";
    
    switch (diff.type) {
      case 'added':
        return (
          <div key={index} className={`${baseClasses} bg-green-100 text-green-800 border-l-4 border-green-500`}>
            <span className="text-green-600 mr-2">+</span>
            {diff.content || ' '}
          </div>
        );
      case 'removed':
        return (
          <div key={index} className={`${baseClasses} bg-red-100 text-red-800 border-l-4 border-red-500`}>
            <span className="text-red-600 mr-2">-</span>
            {diff.content || ' '}
          </div>
        );
      case 'unchanged':
        return (
          <div key={index} className={`${baseClasses} text-muted-foreground`}>
            <span className="mr-2">&nbsp;</span>
            {diff.content || ' '}
          </div>
        );
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={disabled || versions.length < 2}
          >
            <History className="h-4 w-4" />
            Histórico ({versions.length})
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparação de Versões
            </DialogTitle>
            <DialogDescription>
              {clauseTitle} - {versions.length} versões disponíveis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Seletores de versão */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Versão Anterior</label>
                <Select
                  value={selectedVersionLeft?.toString() || ''}
                  onValueChange={(v) => setSelectedVersionLeft(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma versão" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedVersions.map(v => (
                      <SelectItem key={v.versionNumber} value={v.versionNumber.toString()}>
                        v{v.versionNumber} - {formatDate(v.createdAt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-center pt-6">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Versão Atual</label>
                <Select
                  value={selectedVersionRight?.toString() || ''}
                  onValueChange={(v) => setSelectedVersionRight(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma versão" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedVersions.map(v => (
                      <SelectItem key={v.versionNumber} value={v.versionNumber.toString()}>
                        v{v.versionNumber} - {formatDate(v.createdAt)}
                        {v.versionNumber === currentVersion?.versionNumber && ' (atual)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estatísticas do diff */}
            {leftVersion && rightVersion && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Plus className="h-3 w-3 mr-1" />
                    {diffStats.added} adições
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <Minus className="h-3 w-3 mr-1" />
                    {diffStats.removed} remoções
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    <Equal className="h-3 w-3 mr-1" />
                    {diffStats.unchanged} inalteradas
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUnchanged(!showUnchanged)}
                  >
                    {showUnchanged ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Ocultar inalteradas
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Mostrar todas
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Área de comparação */}
            {leftVersion && rightVersion ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Versão esquerda (anterior) */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">
                          Versão {leftVersion.versionNumber}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDate(leftVersion.createdAt)}
                          {leftVersion.createdByName && (
                            <>
                              <span className="mx-1">•</span>
                              <User className="h-3 w-3 inline mr-1" />
                              {leftVersion.createdByName}
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopyVersion(leftVersion)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {onRollback && leftVersion.versionNumber !== currentVersion?.versionNumber && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-amber-600 hover:text-amber-700"
                            onClick={() => handleRollback(leftVersion)}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {leftVersion.changeDescription && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{leftVersion.changeDescription}"
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px]">
                      <div className="p-3 text-sm whitespace-pre-wrap font-mono bg-muted/30">
                        {leftVersion.content}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Versão direita (atual) */}
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2">
                          Versão {rightVersion.versionNumber}
                          {rightVersion.versionNumber === currentVersion?.versionNumber && (
                            <Badge variant="secondary" className="text-xs">Atual</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDate(rightVersion.createdAt)}
                          {rightVersion.createdByName && (
                            <>
                              <span className="mx-1">•</span>
                              <User className="h-3 w-3 inline mr-1" />
                              {rightVersion.createdByName}
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopyVersion(rightVersion)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {rightVersion.changeDescription && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{rightVersion.changeDescription}"
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px]">
                      <div className="p-3 text-sm whitespace-pre-wrap font-mono bg-muted/30">
                        {rightVersion.content}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Selecione duas versões para comparar</p>
              </div>
            )}

            {/* Diff unificado */}
            {leftVersion && rightVersion && filteredDiff.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GitCompare className="h-4 w-4" />
                    Diferenças (Diff)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[200px]">
                    <div className="divide-y">
                      {filteredDiff.map((diff, index) => renderDiffLine(diff, index))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Timeline de versões */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Timeline de Alterações</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-3">
                    {sortedVersions.map((version, index) => (
                      <div 
                        key={version.versionNumber}
                        className={`flex items-start gap-3 ${
                          version.versionNumber === selectedVersionLeft || 
                          version.versionNumber === selectedVersionRight
                            ? 'bg-primary/5 -mx-2 px-2 py-1 rounded'
                            : ''
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`} />
                          {index < sortedVersions.length - 1 && (
                            <div className="w-0.5 h-8 bg-muted-foreground/20" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">v{version.versionNumber}</span>
                            {index === 0 && (
                              <Badge variant="secondary" className="text-xs">Atual</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(version.createdAt)}
                            {version.createdByName && ` • ${version.createdByName}`}
                          </p>
                          {version.changeDescription && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic truncate">
                              {version.changeDescription}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setSelectedVersionRight(version.versionNumber);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {onRollback && index > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-amber-600"
                              onClick={() => handleRollback(version)}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Badge de versão atual */}
      {currentVersion && (
        <Badge variant="outline" className="text-xs">
          v{currentVersion.versionNumber}
        </Badge>
      )}
    </>
  );
}

export default ClauseVersionComparison;
