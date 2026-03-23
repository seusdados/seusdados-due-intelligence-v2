import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  Edit2,
  RefreshCw
} from 'lucide-react';

interface RiskClassification {
  id: string;
  domain: string;
  domainName: string;
  questionId: string;
  questionText: string;
  currentLevel: number;
  severity: 'muito_critica' | 'critica' | 'alta' | 'media' | 'baixa';
  probability: number;
  impact: number;
  lgpdArticles: string[];
  isoControls: string[];
  nistFunctions: string[];
  description: string;
  mitigation: string;
  consultantNotes?: string;
}

interface RiskClassificationEditorProps {
  risks: RiskClassification[];
  onSave: (risks: RiskClassification[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SEVERITY_OPTIONS = [
  { value: 'muito_critica', label: 'Muito Crítico', color: 'bg-red-200 text-red-900', icon: '⛔' },
  { value: 'critica', label: 'Crítica', color: 'bg-red-100 text-red-800', icon: '🔴' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-800', icon: '🟠' },
  { value: 'media', label: 'Média', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
  { value: 'baixa', label: 'Baixa', color: 'bg-green-100 text-green-800', icon: '🟢' },
];

const PROBABILITY_OPTIONS = [
  { value: 1, label: '1 - Muito Baixa' },
  { value: 2, label: '2 - Baixa' },
  { value: 3, label: '3 - Média' },
  { value: 4, label: '4 - Alta' },
  { value: 5, label: '5 - Muito Alta' },
];

const IMPACT_OPTIONS = [
  { value: 1, label: '1 - Insignificante' },
  { value: 2, label: '2 - Menor' },
  { value: 3, label: '3 - Moderado' },
  { value: 4, label: '4 - Maior' },
  { value: 5, label: '5 - Catastrófico' },
];

export function RiskClassificationEditor({
  risks: initialRisks,
  onSave,
  onCancel,
  isLoading = false,
}: RiskClassificationEditorProps) {
  const [risks, setRisks] = useState<RiskClassification[]>(initialRisks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const updateRisk = (id: string, updates: Partial<RiskClassification>) => {
    setRisks(risks.map(r => {
      if (r.id === id) {
        // Recalcular severidade baseada em probabilidade e impacto
        const newRisk = { ...r, ...updates };
        if (updates.probability !== undefined || updates.impact !== undefined) {
          const score = newRisk.probability * newRisk.impact;
          if (score >= 20) newRisk.severity = 'muito_critica';
          else if (score >= 15) newRisk.severity = 'critica';
          else if (score >= 10) newRisk.severity = 'alta';
          else if (score >= 5) newRisk.severity = 'media';
          else newRisk.severity = 'baixa';
        }
        return newRisk;
      }
      return r;
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(risks);
    setHasChanges(false);
  };

  const getSeverityConfig = (severity: string) => {
    return SEVERITY_OPTIONS.find(s => s.value === severity) || SEVERITY_OPTIONS[3];
  };

  const groupedRisks = risks.reduce((acc, risk) => {
    if (!acc[risk.domain]) {
      acc[risk.domain] = { name: risk.domainName, risks: [] };
    }
    acc[risk.domain].risks.push(risk);
    return acc;
  }, {} as Record<string, { name: string; risks: RiskClassification[] }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Editor de Classificações de Risco
          </h2>
          <p className="text-gray-600 mt-1">
            Ajuste as classificações de risco e adicione observações
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Legenda de severidade */}
      <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Legenda:</span>
        {SEVERITY_OPTIONS.map(opt => (
          <Badge key={opt.value} className={opt.color}>
            {opt.icon} {opt.label}
          </Badge>
        ))}
      </div>

      {/* Riscos agrupados por domínio */}
      {Object.entries(groupedRisks).map(([domainId, { name, risks: domainRisks }]) => (
        <Card key={domainId}>
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge className="bg-indigo-600">{domainId}</Badge>
              {name}
              <span className="text-sm font-normal text-gray-500">
                ({domainRisks.length} risco{domainRisks.length !== 1 ? 's' : ''})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {domainRisks.map((risk) => {
              const isEditing = editingId === risk.id;
              const severityConfig = getSeverityConfig(risk.severity);
              
              return (
                <div key={risk.id} className="py-4 first:pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-gray-500">{risk.questionId}</span>
                        <Badge className={severityConfig.color}>
                          {severityConfig.icon} {severityConfig.label}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          P:{risk.probability} × I:{risk.impact} = {risk.probability * risk.impact}
                        </span>
                      </div>
                      <p className="text-gray-900">{risk.questionText}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Alternativa atual: <strong>{String.fromCharCode(96 + risk.currentLevel)})</strong> de 5
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(isEditing ? null : risk.id)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Referências normativas */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {risk.lgpdArticles.map((art, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        LGPD Art. {art}
                      </Badge>
                    ))}
                    {risk.isoControls.map((ctrl, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        ISO {ctrl}
                      </Badge>
                    ))}
                    {risk.nistFunctions.map((func, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        NIST {func}
                      </Badge>
                    ))}
                  </div>

                  {/* Formulário de edição expandido */}
                  {isEditing && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        {/* Probabilidade */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">
                            Probabilidade
                          </label>
                          <Select
                            value={String(risk.probability)}
                            onValueChange={(v) => updateRisk(risk.id, { probability: Number(v) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PROBABILITY_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={String(opt.value)}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Impacto */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">
                            Impacto
                          </label>
                          <Select
                            value={String(risk.impact)}
                            onValueChange={(v) => updateRisk(risk.id, { impact: Number(v) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {IMPACT_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={String(opt.value)}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Severidade (calculada automaticamente) */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">
                            Severidade (calculada)
                          </label>
                          <div className={`p-2 rounded-lg text-center ${getSeverityConfig(risk.severity).color}`}>
                            {getSeverityConfig(risk.severity).icon} {getSeverityConfig(risk.severity).label}
                          </div>
                        </div>
                      </div>

                      {/* Descrição do risco */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Descrição do Risco
                        </label>
                        <Textarea
                          value={risk.description}
                          onChange={(e) => updateRisk(risk.id, { description: e.target.value })}
                          placeholder="Descreva o risco identificado..."
                          className="min-h-[80px]"
                        />
                      </div>

                      {/* Plano de mitigação */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Plano de Mitigação
                        </label>
                        <Textarea
                          value={risk.mitigation}
                          onChange={(e) => updateRisk(risk.id, { mitigation: e.target.value })}
                          placeholder="Descreva as ações de mitigação recomendadas..."
                          className="min-h-[80px]"
                        />
                      </div>

                      {/* Observações do consultor */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Observações do Consultor
                        </label>
                        <Textarea
                          value={risk.consultantNotes || ''}
                          onChange={(e) => updateRisk(risk.id, { consultantNotes: e.target.value })}
                          placeholder="Adicione observações internas..."
                          className="min-h-[60px]"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Concluir Edição
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Preview de descrição e mitigação quando não está editando */}
                  {!isEditing && (risk.description || risk.mitigation) && (
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      {risk.description && (
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="font-medium text-red-800 mb-1">
                            <AlertTriangle className="w-4 h-4 inline mr-1" />
                            Descrição do Risco
                          </p>
                          <p className="text-red-700">{risk.description}</p>
                        </div>
                      )}
                      {risk.mitigation && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="font-medium text-green-800 mb-1">
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            Plano de Mitigação
                          </p>
                          <p className="text-green-700">{risk.mitigation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Footer com ações */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isLoading}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default RiskClassificationEditor;
