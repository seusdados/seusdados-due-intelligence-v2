/**
 * Componente de Edição e Aprovação de Mapeamento Automático
 * Exibe o mapeamento gerado automaticamente durante a análise de contrato
 * Permite edição, refinamento via IA e aprovação para incorporar ao módulo de Mapeamentos
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Database, Edit, Check, X, RefreshCw, Sparkles, Save, Send,
  Loader2, AlertTriangle, CheckCircle, MapPin, Shield, Clock,
  Users, FileText, Globe, ChevronDown, ChevronUp, Plus, Trash2
} from "lucide-react";
import { FormattedTextDisplay, BaseLegalDisplay, JustificativaDisplay } from "@/components/FormattedTextDisplay";

interface MapeamentoAutoEditorProps {
  analysisId: number;
  isConsultant: boolean;
  onMapeamentoApproved?: () => void;
}

interface ExtractedData {
  department: string;
  departmentJustification: string;
  processTitle: string;
  processDescription: string;
  processPurpose: string;
  dataCategories: { name: string; sensivel: boolean; source: string }[];
  titularCategories: string[];
  legalBase: string;
  legalBaseJustification: string;
  sharing: string[];
  retentionPeriod: string;
  storageLocation: string;
  securityMeasures: string[];
  internationalTransfer: boolean;
  internationalCountries: string[];
}

const LEGAL_BASES = [
  { value: 'consentimento', label: 'Consentimento' },
  { value: 'execucao_contrato', label: 'Execução de Contrato' },
  { value: 'obrigacao_legal', label: 'Obrigação Legal' },
  { value: 'legitimo_interesse', label: 'Legítimo Interesse' },
  { value: 'protecao_vida', label: 'Proteção da Vida' },
  { value: 'tutela_saude', label: 'Tutela da Saúde' },
  { value: 'interesse_publico', label: 'Interesse Público' },
  { value: 'protecao_credito', label: 'Proteção ao Crédito' },
];

export function MapeamentoAutoEditor({ analysisId, isConsultant, onMapeamentoApproved }: MapeamentoAutoEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identification: true,
    dataCategories: true,
    legalBase: true,
    sharing: false,
    security: false,
  });
  const [newDataCategory, setNewDataCategory] = useState({ name: '', sensivel: false });
  const [newTitularCategory, setNewTitularCategory] = useState('');
  const [newSharing, setNewSharing] = useState('');
  const [newSecurityMeasure, setNewSecurityMeasure] = useState('');

  // Query para buscar mapeamento draft
  const { data: draftMapeamento, refetch, isLoading } = trpc.contractAnalysis.getDraftMapeamento.useQuery(
    { analysisId },
    { enabled: !!analysisId }
  );

  // Mutations
  const updateMutation = trpc.contractAnalysis.updateDraftMapeamento.useMutation({
    onSuccess: () => {
      toast.success('Mapeamento atualizado com sucesso!');
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const refineMutation = trpc.contractAnalysis.refineMapeamentoWithAI.useMutation({
    onSuccess: (data) => {
      toast.success('Mapeamento refinado com sucesso!');
      setRefinementInstructions('');
      setEditedData(data.refinedData);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao refinar: ${error.message}`);
    }
  });

  const approveMutation = trpc.contractAnalysis.approveMapeamento.useMutation({
    onSuccess: () => {
      toast.success('Mapeamento aprovado e incorporado ao módulo de Mapeamentos!');
      refetch();
      onMapeamentoApproved?.();
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    }
  });

  const regenerateMutation = trpc.contractAnalysis.regenerateMapeamento.useMutation({
    onSuccess: () => {
      toast.success('Mapeamento regenerado com sucesso!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao regenerar: ${error.message}`);
    }
  });

  // Inicializar dados editados quando carregar
  useEffect(() => {
    if ((draftMapeamento as any)?.extractedData && !editedData) {
      setEditedData((draftMapeamento as any).extractedData);
    }
  }, [(draftMapeamento as any)?.extractedData]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSave = () => {
    if (!editedData || !(draftMapeamento as any)?.linkId) return;
    updateMutation.mutate({
      analysisId,
      linkId: (draftMapeamento as any).linkId,
      extractedData: editedData,
    });
  };

  const handleRefine = () => {
    if (!refinementInstructions.trim() || !(draftMapeamento as any)?.linkId) return;
    refineMutation.mutate({
      analysisId,
      linkId: (draftMapeamento as any).linkId,
      instructions: refinementInstructions,
    });
  };

  const handleApprove = () => {
    if (!(draftMapeamento as any)?.linkId) return;
    approveMutation.mutate({
      analysisId,
      linkId: (draftMapeamento as any).linkId,
    });
  };

  const handleRegenerate = () => {
    regenerateMutation.mutate({ analysisId });
  };

  const addDataCategory = () => {
    if (!newDataCategory.name.trim() || !editedData) return;
    setEditedData({
      ...editedData,
      dataCategories: [...editedData.dataCategories, { ...newDataCategory, source: 'manual' }],
    });
    setNewDataCategory({ name: '', sensivel: false });
  };

  const removeDataCategory = (index: number) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      dataCategories: editedData.dataCategories.filter((_, i) => i !== index),
    });
  };

  const addTitularCategory = () => {
    if (!newTitularCategory.trim() || !editedData) return;
    setEditedData({
      ...editedData,
      titularCategories: [...editedData.titularCategories, newTitularCategory],
    });
    setNewTitularCategory('');
  };

  const removeTitularCategory = (index: number) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      titularCategories: editedData.titularCategories.filter((_, i) => i !== index),
    });
  };

  const addSharing = () => {
    if (!newSharing.trim() || !editedData) return;
    setEditedData({
      ...editedData,
      sharing: [...editedData.sharing, newSharing],
    });
    setNewSharing('');
  };

  const removeSharing = (index: number) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      sharing: editedData.sharing.filter((_, i) => i !== index),
    });
  };

  const addSecurityMeasure = () => {
    if (!newSecurityMeasure.trim() || !editedData) return;
    setEditedData({
      ...editedData,
      securityMeasures: [...editedData.securityMeasures, newSecurityMeasure],
    });
    setNewSecurityMeasure('');
  };

  const removeSecurityMeasure = (index: number) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      securityMeasures: editedData.securityMeasures.filter((_, i) => i !== index),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        <span className="ml-3 text-muted-foreground">Carregando mapeamento...</span>
      </div>
    );
  }

  // Se não existe mapeamento gerado
  if (!draftMapeamento || draftMapeamento.status === 'not_generated') {
    const canGenerate = (draftMapeamento as any)?.canGenerate || (draftMapeamento as any)?.preview;
    return (
      <div className="py-12 text-center">
        <Database className="w-16 h-16 mx-auto mb-4 opacity-30 text-teal-500" />
        <p className="font-light text-lg text-muted-foreground">Nenhum mapeamento gerado automaticamente</p>
        <p className="text-sm font-light mt-2 text-muted-foreground">
          O mapeamento será gerado automaticamente quando a análise do contrato for concluída.
        </p>
        {isConsultant && canGenerate && (
          <Button
            onClick={handleRegenerate}
            disabled={regenerateMutation.isPending}
            className="mt-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
          >
            {regenerateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Gerar Mapeamento Agora</>
            )}
          </Button>
        )}
      </div>
    );
  }

  // Se já foi aprovado
  if (draftMapeamento.status === 'approved' || draftMapeamento.status === 'created') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Mapeamento Aprovado</p>
            <p className="text-sm text-green-600">
              Este mapeamento foi aprovado e incorporado ao módulo de Mapeamentos.
            </p>
          </div>
        </div>
        
        {/* Exibir dados do mapeamento aprovado */}
        {(draftMapeamento as any).extractedData && (
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Departamento</Label>
                  <p className="font-medium">{(draftMapeamento as any).extractedData.department}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Processo</Label>
                  <p className="font-medium">{(draftMapeamento as any).extractedData.processTitle}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Base Legal</Label>
                  <Badge className="bg-emerald-500 text-white">
                    {LEGAL_BASES.find(b => b.value === (draftMapeamento as any).extractedData.legalBase)?.label || (draftMapeamento as any).extractedData.legalBase}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Período de Retenção</Label>
                  <p className="text-sm">{(draftMapeamento as any).extractedData.retentionPeriod}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Mapeamento em draft - exibir interface de edição
  const data = editedData || (draftMapeamento as any).extractedData;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header com status e ações */}
      <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Mapeamento Aguardando Revisão</p>
            <p className="text-sm text-amber-600">
              Revise os dados extraídos automaticamente antes de aprovar.
            </p>
          </div>
        </div>
        {isConsultant && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => {
                  setIsEditing(false);
                  setEditedData((draftMapeamento as any).extractedData);
                }}>
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Salvar
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Seções do Mapeamento */}
      <div className="space-y-4">
        {/* Identificação */}
        <Card className="border-teal-100">
          <CardHeader 
            className="cursor-pointer hover:bg-teal-50/50 transition-colors py-3"
            onClick={() => toggleSection('identification')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-sm font-medium">Identificação</CardTitle>
              </div>
              {expandedSections.identification ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          {expandedSections.identification && (
            <CardContent className="pt-0 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Departamento/Área</Label>
                  {isEditing ? (
                    <Input
                      value={data.department}
                      onChange={(e) => setEditedData({ ...data, department: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{data.department}</p>
                  )}
                  {data.departmentJustification && (
                    <JustificativaDisplay
                      content={data.departmentJustification}
                      variant="compact"
                      className="mt-1"
                    />
                  )}
                </div>
                <div>
                  <Label className="text-xs">Título do Processo</Label>
                  {isEditing ? (
                    <Input
                      value={data.processTitle}
                      onChange={(e) => setEditedData({ ...data, processTitle: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{data.processTitle}</p>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">Descrição do Processo</Label>
                {isEditing ? (
                  <Textarea
                    value={data.processDescription}
                    onChange={(e) => setEditedData({ ...data, processDescription: e.target.value })}
                    className="mt-1"
                    rows={2}
                  />
                ) : (
                  <FormattedTextDisplay
                    content={data.processDescription}
                    variant="compact"
                    accentColor="teal"
                    className="mt-1"
                    emptyText="Sem descrição"
                  />
                )}
              </div>
              <div>
                <Label className="text-xs">Finalidade</Label>
                {isEditing ? (
                  <Textarea
                    value={data.processPurpose}
                    onChange={(e) => setEditedData({ ...data, processPurpose: e.target.value })}
                    className="mt-1"
                    rows={2}
                  />
                ) : (
                  <FormattedTextDisplay
                    content={data.processPurpose}
                    variant="compact"
                    accentColor="purple"
                    className="mt-1"
                    emptyText="Sem finalidade definida"
                  />
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Categorias de Dados */}
        <Card className="border-teal-100">
          <CardHeader 
            className="cursor-pointer hover:bg-teal-50/50 transition-colors py-3"
            onClick={() => toggleSection('dataCategories')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-sm font-medium">Categorias de Dados</CardTitle>
                <Badge variant="outline" className="ml-2">{data.dataCategories?.length || 0}</Badge>
              </div>
              {expandedSections.dataCategories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          {expandedSections.dataCategories && (
            <CardContent className="pt-0 space-y-4">
              <div className="flex flex-wrap gap-2">
                {data.dataCategories?.map((cat, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className={`${cat.sensivel ? 'border-red-300 text-red-700 bg-red-50' : 'border-teal-300 text-teal-700'} ${isEditing ? 'pr-1' : ''}`}
                  >
                    {cat.name}
                    {cat.sensivel && <span className="ml-1 text-xs">(sensível)</span>}
                    {isEditing && (
                      <button 
                        onClick={() => removeDataCategory(idx)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {isEditing && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    placeholder="Nova categoria..."
                    value={newDataCategory.name}
                    onChange={(e) => setNewDataCategory({ ...newDataCategory, name: e.target.value })}
                    className="flex-1"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={newDataCategory.sensivel}
                      onChange={(e) => setNewDataCategory({ ...newDataCategory, sensivel: e.target.checked })}
                    />
                    Sensível
                  </label>
                  <Button size="sm" variant="outline" onClick={addDataCategory}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="mt-4">
                <Label className="text-xs">Categorias de Titulares</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.titularCategories?.map((cat, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className={`border-blue-300 text-blue-700 ${isEditing ? 'pr-1' : ''}`}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {cat}
                      {isEditing && (
                        <button 
                          onClick={() => removeTitularCategory(idx)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="Nova categoria de titular..."
                      value={newTitularCategory}
                      onChange={(e) => setNewTitularCategory(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={addTitularCategory}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Base Legal */}
        <Card className="border-teal-100">
          <CardHeader 
            className="cursor-pointer hover:bg-teal-50/50 transition-colors py-3"
            onClick={() => toggleSection('legalBase')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-sm font-medium">Base Legal e Retenção</CardTitle>
              </div>
              {expandedSections.legalBase ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          {expandedSections.legalBase && (
            <CardContent className="pt-0 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Base Legal</Label>
                  {isEditing ? (
                    <Select
                      value={data.legalBase}
                      onValueChange={(value) => setEditedData({ ...data, legalBase: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEGAL_BASES.map(base => (
                          <SelectItem key={base.value} value={base.value}>{base.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className="mt-1 bg-emerald-500 text-white">
                      {LEGAL_BASES.find(b => b.value === data.legalBase)?.label || data.legalBase}
                    </Badge>
                  )}
                  {data.legalBaseJustification && (
                    <JustificativaDisplay
                      content={data.legalBaseJustification}
                      variant="compact"
                      className="mt-1"
                    />
                  )}
                </div>
                <div>
                  <Label className="text-xs">Período de Retenção</Label>
                  {isEditing ? (
                    <Input
                      value={data.retentionPeriod}
                      onChange={(e) => setEditedData({ ...data, retentionPeriod: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {data.retentionPeriod}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">Local de Armazenamento</Label>
                {isEditing ? (
                  <Input
                    value={data.storageLocation}
                    onChange={(e) => setEditedData({ ...data, storageLocation: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <FormattedTextDisplay
                    content={data.storageLocation}
                    variant="compact"
                    accentColor="blue"
                    className="mt-1"
                    emptyText="Não informado"
                  />
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Compartilhamento */}
        <Card className="border-teal-100">
          <CardHeader 
            className="cursor-pointer hover:bg-teal-50/50 transition-colors py-3"
            onClick={() => toggleSection('sharing')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-sm font-medium">Compartilhamento</CardTitle>
                <Badge variant="outline" className="ml-2">{data.sharing?.length || 0}</Badge>
              </div>
              {expandedSections.sharing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          {expandedSections.sharing && (
            <CardContent className="pt-0 space-y-4">
              <div className="flex flex-wrap gap-2">
                {data.sharing?.map((s, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className={`border-amber-300 text-amber-700 ${isEditing ? 'pr-1' : ''}`}
                  >
                    {s}
                    {isEditing && (
                      <button 
                        onClick={() => removeSharing(idx)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {(!data.sharing || data.sharing.length === 0) && (
                  <span className="text-sm text-muted-foreground">Nenhum compartilhamento identificado</span>
                )}
              </div>
              {isEditing && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    placeholder="Adicionar destinatário..."
                    value={newSharing}
                    onChange={(e) => setNewSharing(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={addSharing}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="mt-4">
                <Label className="text-xs">Transferência Internacional</Label>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      checked={data.internationalTransfer}
                      onChange={(e) => setEditedData({ ...data, internationalTransfer: e.target.checked })}
                    />
                    <span className="text-sm">Há transferência internacional de dados</span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm">
                    {data.internationalTransfer ? 'Sim' : 'Não'}
                    {data.internationalTransfer && data.internationalCountries?.length > 0 && (
                      <span className="ml-2 text-muted-foreground">
                        ({data.internationalCountries.join(', ')})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Segurança */}
        <Card className="border-teal-100">
          <CardHeader 
            className="cursor-pointer hover:bg-teal-50/50 transition-colors py-3"
            onClick={() => toggleSection('security')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-600" />
                <CardTitle className="text-sm font-medium">Medidas de Segurança</CardTitle>
                <Badge variant="outline" className="ml-2">{data.securityMeasures?.length || 0}</Badge>
              </div>
              {expandedSections.security ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          {expandedSections.security && (
            <CardContent className="pt-0 space-y-4">
              <div className="flex flex-wrap gap-2">
                {data.securityMeasures?.map((m, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className={`border-green-300 text-green-700 ${isEditing ? 'pr-1' : ''}`}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {m}
                    {isEditing && (
                      <button 
                        onClick={() => removeSecurityMeasure(idx)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {isEditing && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    placeholder="Adicionar medida de segurança..."
                    value={newSecurityMeasure}
                    onChange={(e) => setNewSecurityMeasure(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={addSecurityMeasure}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Refinamento com IA */}
      {isConsultant && (draftMapeamento.status === 'pending' || draftMapeamento.status === 'draft' || draftMapeamento.status === 'reviewed') && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-medium text-amber-800">Refinar com IA</CardTitle>
            </div>
            <CardDescription className="text-xs text-amber-600">
              Forneça instruções para a IA refinar o mapeamento automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Textarea
                placeholder="Ex: Adicionar categoria de dados de saúde, ajustar base legal para legítimo interesse, incluir medida de criptografia..."
                value={refinementInstructions}
                onChange={(e) => setRefinementInstructions(e.target.value)}
                rows={2}
                className="flex-1 border-amber-200 focus:border-amber-400"
              />
              <Button
                onClick={handleRefine}
                disabled={!refinementInstructions.trim() || refineMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {refineMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações de Aprovação */}
      {isConsultant && (draftMapeamento.status === 'pending' || draftMapeamento.status === 'draft' || draftMapeamento.status === 'reviewed') && (
        <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
          <div>
            <p className="font-medium text-slate-700">Pronto para aprovar?</p>
            <p className="text-sm text-muted-foreground">
              Ao aprovar, o mapeamento será incorporado ao módulo de Mapeamentos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Regenerar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Aprovar e Incorporar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
