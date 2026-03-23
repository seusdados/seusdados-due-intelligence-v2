import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  TrendingUp,
  Target,
  Lightbulb,
  ListChecks,
  Zap
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  whatToDo: string;
  whyToDo: string;
  howToDo: string;
  urgency: 'baixa' | 'media' | 'alta' | 'critica';
  impact: number; // 1-5
  probability: number; // 1-5
  benefits: string;
  category: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
}

interface MaturityRecommendationsProps {
  assessmentId: number;
  initialRecommendations?: Recommendation[];
  onSave?: (recommendations: Recommendation[]) => void;
  editable?: boolean;
}

const urgencyConfig = {
  baixa: { label: 'Baixa', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '○' },
  media: { label: 'Média', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '◐' },
  alta: { label: 'Alta', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '◕' },
  critica: { label: 'Crítica', color: 'bg-red-100 text-red-800 border-red-200', icon: '●' },
};

const defaultRecommendations: Recommendation[] = [
  {
    id: '1',
    title: 'Implementar Política de Proteção de Dados',
    description: 'Estabelecer política formal de proteção de dados pessoais alinhada à LGPD',
    whatToDo: 'Criar e documentar política de proteção de dados com diretrizes claras sobre coleta, uso, armazenamento e compartilhamento de dados pessoais',
    whyToDo: 'A ausência de política formal aumenta riscos de não conformidade com LGPD (Art. 50), exposição a sanções administrativas e danos reputacionais. Terceiros sem governança adequada representam risco direto ao controlador.',
    howToDo: '1. Mapear processos de tratamento de dados\n2. Definir papéis e responsabilidades (DPO, encarregado)\n3. Estabelecer procedimentos de segurança\n4. Documentar em política formal\n5. Treinar equipe\n6. Revisar anualmente',
    urgency: 'critica',
    impact: 5,
    probability: 5,
    benefits: 'Redução de 80% no risco de vazamento de dados, conformidade legal, aumento de confiança de clientes e parceiros, diferencial competitivo no mercado',
    category: 'Governança de Dados',
    status: 'pendente'
  },
  {
    id: '2',
    title: 'Estabelecer Contratos com Cláusulas LGPD',
    description: 'Formalizar contratos com cláusulas específicas de proteção de dados',
    whatToDo: 'Revisar e atualizar todos os contratos com terceiros incluindo cláusulas de responsabilidade compartilhada, segurança da informação e conformidade com LGPD',
    whyToDo: 'Art. 42 da LGPD estabelece responsabilidade solidária entre controlador e operador. Sem cláusulas contratuais adequadas, a empresa fica exposta a responsabilização por falhas do terceiro.',
    howToDo: '1. Auditar contratos existentes\n2. Criar template com cláusulas LGPD obrigatórias\n3. Incluir: finalidade, medidas de segurança, prazo de retenção, direitos dos titulares\n4. Estabelecer SLA para resposta a incidentes\n5. Definir penalidades por descumprimento\n6. Obter assinatura de todas as partes',
    urgency: 'alta',
    impact: 5,
    probability: 4,
    benefits: 'Proteção jurídica contra responsabilização solidária, clareza nas obrigações, redução de 70% em disputas contratuais, facilitação de auditorias',
    category: 'Contratos e Compliance',
    status: 'pendente'
  },
  {
    id: '3',
    title: 'Implementar Programa de Treinamento em Privacidade',
    description: 'Capacitar equipe em boas práticas de proteção de dados e LGPD',
    whatToDo: 'Desenvolver programa de treinamento contínuo sobre privacidade e proteção de dados para todos os colaboradores que manuseiam dados pessoais',
    whyToDo: 'Falhas humanas representam 95% dos incidentes de segurança. Equipe treinada é primeira linha de defesa contra vazamentos e uso indevido de dados.',
    howToDo: '1. Mapear perfis de acesso a dados\n2. Criar trilhas de treinamento por função\n3. Desenvolver conteúdo: conceitos LGPD, casos práticos, simulações\n4. Realizar treinamento inicial (4h)\n5. Implementar reciclagens trimestrais (1h)\n6. Avaliar aprendizado com testes\n7. Documentar participação',
    urgency: 'media',
    impact: 4,
    probability: 5,
    benefits: 'Redução de 60% em incidentes causados por erro humano, cultura de privacidade, conformidade com Art. 50 LGPD, melhoria na resposta a solicitações de titulares',
    category: 'Capacitação e Cultura',
    status: 'pendente'
  }
];

export function MaturityRecommendations({
  assessmentId,
  initialRecommendations,
  onSave,
  editable = true
}: MaturityRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    initialRecommendations || defaultRecommendations
  );
  const [editMode, setEditMode] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<Recommendation>>({});

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const startEdit = (rec: Recommendation) => {
    setEditingId(rec.id);
    setEditingData({ ...rec });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    setRecommendations(prev =>
      prev.map(r => r.id === editingId ? { ...r, ...editingData } as Recommendation : r)
    );
    
    toast.success('Recomendação atualizada com sucesso!');
    setEditingId(null);
    setEditingData({});
  };

  const addRecommendation = () => {
    const newRec: Recommendation = {
      id: `new-${Date.now()}`,
      title: 'Nova Recomendação',
      description: '',
      whatToDo: '',
      whyToDo: '',
      howToDo: '',
      urgency: 'media',
      impact: 3,
      probability: 3,
      benefits: '',
      category: 'Geral',
      status: 'pendente'
    };
    
    setRecommendations(prev => [...prev, newRec]);
    setEditingId(newRec.id);
    setEditingData(newRec);
    setExpandedIds(new Set([...Array.from(expandedIds), newRec.id]));
  };

  const deleteRecommendation = (id: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== id));
    toast.success('Recomendação removida');
  };

  const handleSaveAll = () => {
    if (onSave) {
      onSave(recommendations);
    }
    setEditMode(false);
    toast.success('Todas as recomendações foram salvas!');
  };

  const getRiskScore = (impact: number, probability: number) => impact * probability;

  const getRiskLevel = (score: number) => {
    if (score < 5) return { label: 'Baixo', color: 'text-green-600' };
    if (score < 10) return { label: 'Moderado', color: 'text-yellow-600' };
    if (score < 15) return { label: 'Alto', color: 'text-orange-600' };
    if (score < 20) return { label: 'Crítico', color: 'text-red-600' };
    return { label: 'Muito Crítico', color: 'text-red-800' };
  };

  return (
    <Card id="riscos-criticos" className="border-2 border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Recomendações Estratégicas
            </CardTitle>
            <CardDescription className="mt-1">
              Plano de ação detalhado com passo a passo, impacto e benefícios esperados
            </CardDescription>
          </div>
          {editable && (
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAll}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Tudo
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar Recomendações
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec, index) => {
          const isExpanded = expandedIds.has(rec.id);
          const isEditing = editingId === rec.id;
          const urgencyInfo = urgencyConfig[rec.urgency];
          const riskScore = getRiskScore(rec.impact, rec.probability);
          const riskLevel = getRiskLevel(riskScore);

          return (
            <Collapsible
              key={rec.id}
              open={isExpanded}
              onOpenChange={() => toggleExpand(rec.id)}
            >
              <Card className={`border-2 transition-all ${
                isExpanded ? 'border-purple-200 shadow-lg' : 'border-gray-200 hover:border-purple-100'
              }`}>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 text-left">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-white mt-1">
                          <Target className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-muted-foreground">
                              #{index + 1}
                            </span>
                            <Badge className={urgencyInfo.color}>
                              {urgencyInfo.icon} {urgencyInfo.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rec.category}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-lg mb-1">{rec.title}</h3>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                          
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">Impacto:</span>
                              <span className="font-semibold">{rec.impact}/5</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">Probabilidade:</span>
                              <span className="font-semibold">{rec.probability}/5</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">Risco:</span>
                              <span className={`font-bold ${riskLevel.color}`}>
                                {riskScore} ({riskLevel.label})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editMode && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(rec);
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRecommendation(rec.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {isEditing ? (
                      // Modo de Edição
                      <div className="space-y-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                        <div className="grid gap-4">
                          <div>
                            <Label>Título</Label>
                            <Input
                              value={editingData.title || ''}
                              onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                            />
                          </div>
                          
                          <div>
                            <Label>Descrição</Label>
                            <Textarea
                              value={editingData.description || ''}
                              onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                              rows={2}
                            />
                          </div>

                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <Label>Urgência</Label>
                              <Select
                                value={editingData.urgency || 'media'}
                                onValueChange={(v: any) => setEditingData({ ...editingData, urgency: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="baixa">Baixa</SelectItem>
                                  <SelectItem value="media">Média</SelectItem>
                                  <SelectItem value="alta">Alta</SelectItem>
                                  <SelectItem value="critica">Crítica</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Impacto (1-5)</Label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                value={editingData.impact || 3}
                                onChange={(e) => setEditingData({ ...editingData, impact: parseInt(e.target.value) })}
                              />
                            </div>

                            <div>
                              <Label>Probabilidade (1-5)</Label>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                value={editingData.probability || 3}
                                onChange={(e) => setEditingData({ ...editingData, probability: parseInt(e.target.value) })}
                              />
                            </div>
                          </div>

                          <div>
                            <Label>O que fazer?</Label>
                            <Textarea
                              value={editingData.whatToDo || ''}
                              onChange={(e) => setEditingData({ ...editingData, whatToDo: e.target.value })}
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label>Por que fazer?</Label>
                            <Textarea
                              value={editingData.whyToDo || ''}
                              onChange={(e) => setEditingData({ ...editingData, whyToDo: e.target.value })}
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label>Como fazer? (Passo a passo)</Label>
                            <Textarea
                              value={editingData.howToDo || ''}
                              onChange={(e) => setEditingData({ ...editingData, howToDo: e.target.value })}
                              rows={5}
                            />
                          </div>

                          <div>
                            <Label>Benefícios Esperados</Label>
                            <Textarea
                              value={editingData.benefits || ''}
                              onChange={(e) => setEditingData({ ...editingData, benefits: e.target.value })}
                              rows={3}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={cancelEdit}>
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Modo de Visualização
                      <div className="space-y-4">
                        {/* O que fazer */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <ListChecks className="h-5 w-5 text-blue-600" />
                            <h4 className="font-bold text-blue-900">O que fazer?</h4>
                          </div>
                          <p className="text-sm text-blue-800">{rec.whatToDo}</p>
                        </div>

                        {/* Por que fazer */}
                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            <h4 className="font-bold text-amber-900">Por que fazer?</h4>
                          </div>
                          <p className="text-sm text-amber-800">{rec.whyToDo}</p>
                        </div>

                        {/* Como fazer */}
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-5 w-5 text-purple-600" />
                            <h4 className="font-bold text-purple-900">Como fazer? (Passo a passo)</h4>
                          </div>
                          <div className="text-sm text-purple-800 whitespace-pre-line">
                            {rec.howToDo}
                          </div>
                        </div>

                        {/* Benefícios */}
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            <h4 className="font-bold text-emerald-900">Benefícios Esperados</h4>
                          </div>
                          <p className="text-sm text-emerald-800">{rec.benefits}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}

        {editMode && (
          <Button
            variant="outline"
            className="w-full border-dashed border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50"
            onClick={addRecommendation}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Nova Recomendação
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
