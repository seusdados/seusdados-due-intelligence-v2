import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Edit2, 
  Save, 
  X, 
  AlertTriangle,
  Shield,
  Info,
  Target,
  Calendar,
  BookOpen,
  Zap
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { SmartDPOButton } from './SmartDPOButton';

interface RiskItem {
  id: number;
  analysisId?: number;
  contractArea: string;
  analysisBlock: string | number;
  riskDescription: string;
  riskLevel: string; // Pode ser '1','2','3','4','5' ou 'critico','alto','medio','baixo','muito_baixo'
  potentialImpact: string | null;
  requiredAction: string | null;
  suggestedDeadline: string | null;
  legalReference: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ContractRiskMatrixEditorProps {
  analysisId: number;
  risks: RiskItem[];
  isConsultor: boolean;
  onUpdate?: () => void;
}

// Mapeamento de níveis de risco - suporta valores numéricos ('1'-'5') e textuais
const riskLevelConfig: Record<string, { label: string; color: string; textColor: string; bgLight: string; impact: number; probability: number }> = {
  // Valores numéricos do banco de dados
  '5': { label: 'Crítico', color: 'bg-red-600', textColor: 'text-red-600', bgLight: 'bg-red-50', impact: 5, probability: 5 },
  '4': { label: 'Alto', color: 'bg-orange-500', textColor: 'text-orange-600', bgLight: 'bg-orange-50', impact: 4, probability: 4 },
  '3': { label: 'Médio', color: 'bg-yellow-500', textColor: 'text-yellow-600', bgLight: 'bg-yellow-50', impact: 3, probability: 3 },
  '2': { label: 'Baixo', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50', impact: 2, probability: 2 },
  '1': { label: 'Muito Baixo', color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50', impact: 1, probability: 1 },
  // Valores textuais (fallback)
  critico: { label: 'Crítico', color: 'bg-red-600', textColor: 'text-red-600', bgLight: 'bg-red-50', impact: 5, probability: 5 },
  alto: { label: 'Alto', color: 'bg-orange-500', textColor: 'text-orange-600', bgLight: 'bg-orange-50', impact: 4, probability: 4 },
  medio: { label: 'Médio', color: 'bg-yellow-500', textColor: 'text-yellow-600', bgLight: 'bg-yellow-50', impact: 3, probability: 3 },
  baixo: { label: 'Baixo', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50', impact: 2, probability: 2 },
  muito_baixo: { label: 'Muito Baixo', color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50', impact: 1, probability: 1 },
};

export function ContractRiskMatrixEditor({ 
  analysisId, 
  risks, 
  isConsultor,
  onUpdate 
}: ContractRiskMatrixEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRisks, setEditedRisks] = useState<RiskItem[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<string | null>(null); // Para filtrar riscos por célula da matriz

  useEffect(() => {
    setEditedRisks(risks.map(risk => ({ ...risk })));
  }, [risks]);

  const updateRiskMutation = trpc.contractAnalysis.updateRiskItem.useMutation({
    onSuccess: () => {
      toast.success('Risco atualizado com sucesso!');
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const handleSave = async () => {
    try {
      for (const risk of editedRisks) {
        const original = risks.find(r => r.id === risk.id);
        if (original && JSON.stringify(original) !== JSON.stringify(risk)) {
          await updateRiskMutation.mutateAsync({
            id: risk.id,
            riskLevel: String(risk.riskLevel) as '1' | '2' | '3' | '4' | '5',
            requiredAction: risk.requiredAction || undefined,
            suggestedDeadline: risk.suggestedDeadline || undefined,
          });
        }
      }
      setIsEditing(false);
      toast.success('Matriz de riscos atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar riscos:', error);
    }
  };

  const handleCancel = () => {
    setEditedRisks(risks.map(risk => ({ ...risk })));
    setIsEditing(false);
  };

  const updateRisk = (id: number, field: keyof RiskItem, value: any) => {
    setEditedRisks(prev => prev.map(risk => 
      risk.id === id ? { ...risk, [field]: value } : risk
    ));
  };

  const openRiskDetail = (risk: RiskItem) => {
    setSelectedRisk(risk);
    setIsDetailOpen(true);
  };

  // Calcular estatísticas
  const riskStats = useMemo(() => {
    const stats = { critico: 0, alto: 0, medio: 0, baixo: 0, muito_baixo: 0 };
    editedRisks.forEach(risk => {
      stats[risk.riskLevel]++;
    });
    return stats;
  }, [editedRisks]);

  // Função auxiliar para obter config com fallback
  const getConfigForRisk = (riskLevel: string) => {
    return riskLevelConfig[riskLevel] || riskLevelConfig['3']; // Fallback para 'Médio' se não encontrado
  };

  // Matriz 5x5 interativa
  const matrixData = useMemo(() => {
    const matrix: { [key: string]: RiskItem[] } = {};
    
    // Inicializar matriz 5x5
    for (let impact = 1; impact <= 5; impact++) {
      for (let prob = 1; prob <= 5; prob++) {
        matrix[`${impact}-${prob}`] = [];
      }
    }
    
    // Posicionar riscos na matriz
    editedRisks.forEach(risk => {
      const config = getConfigForRisk(risk.riskLevel);
      const key = `${config.impact}-${config.probability}`;
      if (matrix[key]) {
        matrix[key].push(risk);
      }
    });
    
    return matrix;
  }, [editedRisks]);

  const getCellColor = (impact: number, prob: number) => {
    const score = impact * prob;
    if (score >= 20) return 'bg-red-500';
    if (score >= 12) return 'bg-orange-500';
    if (score >= 6) return 'bg-yellow-500';
    if (score >= 3) return 'bg-blue-400';
    return 'bg-green-500';
  };

  return (
    <TooltipProvider>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  Matriz de Riscos LGPD
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {editedRisks.length} riscos identificados • Clique em um risco para ver detalhes
                </p>
              </div>
            </div>
            
            {isConsultor && (
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancel} className="gap-2">
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSave}
                      className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600"
                      disabled={updateRiskMutation.isPending}
                    >
                      <Save className="h-4 w-4" />
                      {updateRiskMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(true)}
                    className="gap-2 border-red-200 hover:bg-red-50"
                  >
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Resumo de Riscos */}
          <div className="flex gap-3 mt-4 flex-wrap">
            {Object.entries(riskStats).map(([level, count]) => {
              const config = getConfigForRisk(level);
              return count > 0 ? (
                <div key={level} className={`flex items-center gap-2 px-3 py-1.5 ${config.bgLight} rounded-full`}>
                  <div className={`w-3 h-3 rounded-full ${config.color}`} />
                  <span className={`text-sm font-medium ${config.textColor}`}>
                    {count} {config.label}
                  </span>
                </div>
              ) : null;
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Matriz 5x5 Visual */}
          <div className="bg-slate-50 p-4 rounded-xl">
            <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Matriz de Risco 5×5 (Impacto × Probabilidade)
            </h4>
            
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Header - Probabilidade */}
                <div className="flex mb-2">
                  <div className="w-24" />
                  {[1, 2, 3, 4, 5].map(prob => (
                    <div key={prob} className="flex-1 text-center text-xs font-medium text-slate-600">
                      {prob === 1 ? 'Raro' : prob === 2 ? 'Improvável' : prob === 3 ? 'Possível' : prob === 4 ? 'Provável' : 'Quase Certo'}
                    </div>
                  ))}
                </div>
                
                {/* Matriz */}
                {[5, 4, 3, 2, 1].map(impact => (
                  <div key={impact} className="flex items-center mb-1">
                    <div className="w-24 text-xs font-medium text-slate-600 pr-2 text-right">
                      {impact === 5 ? 'Catastrófico' : impact === 4 ? 'Grave' : impact === 3 ? 'Moderado' : impact === 2 ? 'Menor' : 'Insignificante'}
                    </div>
                    {[1, 2, 3, 4, 5].map(prob => {
                      const cellRisks = matrixData[`${impact}-${prob}`] || [];
                      const hasRisks = cellRisks.length > 0;
                      
                      return (
                        <Tooltip key={`${impact}-${prob}`}>
                          <TooltipTrigger asChild>
                            <div 
                              className={`
                                flex-1 h-12 mx-0.5 rounded-lg flex items-center justify-center
                                ${getCellColor(impact, prob)} 
                                ${hasRisks ? 'cursor-pointer ring-2 ring-white shadow-lg' : 'opacity-30'}
                                ${selectedCell === `${impact}-${prob}` ? 'ring-4 ring-blue-500 scale-110' : ''}
                                transition-all duration-200 hover:scale-105
                              `}
                              onClick={() => {
                                if (hasRisks) {
                                  const cellKey = `${impact}-${prob}`;
                                  setSelectedCell(selectedCell === cellKey ? null : cellKey);
                                }
                              }}
                            >
                              {hasRisks && (
                                <span className="text-white font-bold text-lg">
                                  {cellRisks.length}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          {hasRisks && (
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-semibold">{cellRisks.length} risco(s) nesta posição</p>
                                {cellRisks.slice(0, 3).map((r, i) => (
                                  <p key={i} className="text-xs text-muted-foreground line-clamp-1">
                                    • {r.riskDescription}
                                  </p>
                                ))}
                                {cellRisks.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    ... e mais {cellRisks.length - 3}
                                  </p>
                                )}
                                <p className="text-xs text-blue-400 mt-2">Clique para filtrar riscos</p>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
                
                {/* Legenda */}
                <div className="flex justify-center gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-green-500 rounded" />
                    <span>Baixo</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-yellow-500 rounded" />
                    <span>Médio</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-orange-500 rounded" />
                    <span>Alto</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-red-500 rounded" />
                    <span>Crítico</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Riscos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Riscos Identificados
                {selectedCell && (
                  <Badge variant="secondary" className="ml-2">
                    Filtrado por célula selecionada
                  </Badge>
                )}
              </h4>
              {selectedCell && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedCell(null)}
                  className="text-xs"
                >
                  Limpar filtro
                </Button>
              )}
            </div>
            
            {editedRisks
              .filter(risk => {
                if (!selectedCell) return true;
                const config = getConfigForRisk(risk.riskLevel);
                return `${config.impact}-${config.probability}` === selectedCell;
              })
              .map((risk, index) => {
              const config = getConfigForRisk(risk.riskLevel);
              
              return (
                <div 
                  key={risk.id}
                  className={`
                    border rounded-lg p-4 transition-all duration-200
                    ${isEditing ? 'border-red-200 bg-red-50/30' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer'}
                  `}
                  onClick={() => !isEditing && openRiskDetail(risk)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold
                      ${config.color}
                    `}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {risk.contractArea}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {risk.analysisBlock}
                            </Badge>
                          </div>
                          
                          {isEditing ? (
                            <Textarea
                              value={risk.riskDescription}
                              onChange={(e) => updateRisk(risk.id, 'riskDescription', e.target.value)}
                              className="min-h-[60px] resize-none"
                            />
                          ) : (
                            <p className="text-sm text-slate-700">{risk.riskDescription}</p>
                          )}
                        </div>
                        
                        {isEditing ? (
                          <Select
                            value={risk.riskLevel}
                            onValueChange={(value) => updateRisk(risk.id, 'riskLevel', value)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(riskLevelConfig).map(([key, cfg]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${cfg.color}`} />
                                    {cfg.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge className={`${config.color} text-white`}>
                              {config.label}
                            </Badge>
                            <SmartDPOButton
                              context={{
                                module: 'Due Diligence',
                                page: 'Matriz de Risco do Contrato',
                                entityType: 'risk_item',
                                entityId: risk.id,
                                entityName: risk.contractArea,
                                deepLink: `${window.location.pathname}#risco-${risk.id}`,
                                snapshot: {
                                  contractArea: risk.contractArea,
                                  analysisBlock: risk.analysisBlock,
                                  riskDescription: risk.riskDescription,
                                  riskLevel: risk.riskLevel,
                                  potentialImpact: risk.potentialImpact,
                                  requiredAction: risk.requiredAction,
                                },
                              }}
                              variant="ghost"
                              size="sm"
                              iconOnly
                            />
                          </div>
                        )}
                      </div>
                      
                      {isEditing && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                              Impacto Potencial
                            </label>
                            <Textarea
                              value={risk.potentialImpact || ''}
                              onChange={(e) => updateRisk(risk.id, 'potentialImpact', e.target.value)}
                              placeholder="Descreva o impacto potencial..."
                              className="min-h-[60px] resize-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                              Ação Requerida
                            </label>
                            <Textarea
                              value={risk.requiredAction || ''}
                              onChange={(e) => updateRisk(risk.id, 'requiredAction', e.target.value)}
                              placeholder="Descreva a ação necessária..."
                              className="min-h-[60px] resize-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                              Prazo Sugerido
                            </label>
                            <Input
                              value={risk.suggestedDeadline || ''}
                              onChange={(e) => updateRisk(risk.id, 'suggestedDeadline', e.target.value)}
                              placeholder="Ex: 30 dias"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600 mb-1 block">
                              Referência Legal
                            </label>
                            <Input
                              value={risk.legalReference || ''}
                              onChange={(e) => updateRisk(risk.id, 'legalReference', e.target.value)}
                              placeholder="Ex: Art. 46 LGPD"
                            />
                          </div>
                        </div>
                      )}
                      
                      {!isEditing && (risk.potentialImpact || risk.requiredAction) && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {risk.potentialImpact && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              Impacto definido
                            </span>
                          )}
                          {risk.requiredAction && (
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Ação definida
                            </span>
                          )}
                          {risk.suggestedDeadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {risk.suggestedDeadline}
                            </span>
                          )}
                          {risk.legalReference && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {risk.legalReference}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {editedRisks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum risco identificado.</p>
                <p className="text-sm">Execute a análise do contrato para identificar riscos.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Risco */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${selectedRisk ? getConfigForRisk(selectedRisk.riskLevel).color : ''}`}>
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              Detalhes do Risco
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre o risco identificado
            </DialogDescription>
          </DialogHeader>
          
          {selectedRisk && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge className={`${getConfigForRisk(selectedRisk.riskLevel).color} text-white`}>
                  {getConfigForRisk(selectedRisk.riskLevel).label}
                </Badge>
                <Badge variant="outline">{selectedRisk.contractArea}</Badge>
                <Badge variant="outline">{selectedRisk.analysisBlock}</Badge>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Descrição do Risco</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  {selectedRisk.riskDescription}
                </p>
              </div>
              
              {selectedRisk.potentialImpact && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    Impacto Potencial
                  </h4>
                  <p className="text-sm text-slate-600 bg-orange-50 p-3 rounded-lg border-l-4 border-orange-400">
                    {selectedRisk.potentialImpact}
                  </p>
                </div>
              )}
              
              {selectedRisk.requiredAction && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    Ação Requerida
                  </h4>
                  <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                    {selectedRisk.requiredAction}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {selectedRisk.suggestedDeadline && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      Prazo Sugerido
                    </h4>
                    <p className="text-sm text-slate-600 bg-purple-50 p-3 rounded-lg">
                      {selectedRisk.suggestedDeadline}
                    </p>
                  </div>
                )}
                
                {selectedRisk.legalReference && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-500" />
                      Referência Legal
                    </h4>
                    <p className="text-sm text-slate-600 bg-green-50 p-3 rounded-lg">
                      {selectedRisk.legalReference}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
