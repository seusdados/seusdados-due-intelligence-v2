import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowLeft, Save } from 'lucide-react';

export function PaAnpdCisEditor() {
  const params = useParams<{ id: string }>();
  const caseId = params?.id || '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDataType, setNewDataType] = useState('');
  const [newMeasure, setNewMeasure] = useState('');
  const [formData, setFormData] = useState({
    affectedDataTypes: [] as string[],
    affectedIndividuals: 0,
    riskAssessment: '',
    mitigationMeasures: [] as string[],
  });

  const { data: caseData, isLoading } = trpc.paAnpd.getCase.useQuery(
    { caseId },
    { enabled: !!caseId }
  );

  const { data: cisCurrent } = trpc.paAnpd.cisGetCurrent.useQuery({ caseId }, { enabled: !!caseId });
  const { data: cisPrefill, refetch: refetchPrefill, isFetching: isFetchingPrefill } = trpc.paAnpd.cisGetPrefill.useQuery({ caseId }, { enabled: !!caseId });

  const saveDraftMutation = trpc.paAnpd.cisSaveDraft.useMutation();
  const submitForReviewMutation = trpc.paAnpd.cisSubmitForReview.useMutation();
  const finalizeMutation = trpc.paAnpd.cisFinalize.useMutation();
  const markSentMutation = trpc.paAnpd.cisMarkAsSent.useMutation();



  const applyPrefillAll = () => {
    const s = (cisPrefill as any)?.suggestions;
    if (!s) return;
    setFormData((prev) => {
      const mergedTypes = Array.from(new Set([...(prev.affectedDataTypes || []), ...(s.affectedDataTypes || [])]));
      const mergedMeasures = Array.from(new Set([...(prev.mitigationMeasures || []), ...(s.mitigationMeasures || [])]));
      return {
        affectedDataTypes: mergedTypes,
        mitigationMeasures: mergedMeasures,
        affectedIndividuals: prev.affectedIndividuals && prev.affectedIndividuals > 0 ? prev.affectedIndividuals : Number(s.affectedIndividuals || 0),
        riskAssessment: prev.riskAssessment?.trim() ? prev.riskAssessment : String(s.riskAssessment || ""),
      };
    });
  };

  const applyPrefillTypesOnly = () => {
    const s = (cisPrefill as any)?.suggestions;
    if (!s?.affectedDataTypes) return;
    setFormData((prev) => ({
      ...prev,
      affectedDataTypes: Array.from(new Set([...(prev.affectedDataTypes || []), ...(s.affectedDataTypes || [])])),
    }));
  };

  const applyPrefillMeasuresOnly = () => {
    const s = (cisPrefill as any)?.suggestions;
    if (!s?.mitigationMeasures) return;
    setFormData((prev) => ({
      ...prev,
      mitigationMeasures: Array.from(new Set([...(prev.mitigationMeasures || []), ...(s.mitigationMeasures || [])])),
    }));
  };

  const applyPrefillRiskOnly = () => {
    const s = (cisPrefill as any)?.suggestions;
    if (!s?.riskAssessment) return;
    setFormData((prev) => ({
      ...prev,
      riskAssessment: prev.riskAssessment?.trim() ? prev.riskAssessment : String(s.riskAssessment || ""),
    }));
  };

  // hidrate form com CIS atual (quando existir)
  useEffect(() => {
    if (!cisCurrent) return;
    setFormData((prev) => ({
      ...prev,
      affectedDataTypes: Array.isArray((cisCurrent as any).affectedDataTypes) ? (cisCurrent as any).affectedDataTypes : prev.affectedDataTypes,
      mitigationMeasures: Array.isArray((cisCurrent as any).mitigationMeasures) ? (cisCurrent as any).mitigationMeasures : prev.mitigationMeasures,
      affectedIndividuals: Number((cisCurrent as any).affectedIndividuals ?? prev.affectedIndividuals) || 0,
      riskAssessment: String((cisCurrent as any).riskAssessment ?? prev.riskAssessment),
    }));
  }, [cisCurrent]);

  // autosave com debounce (UX para leigo)
  const debouncedPayload = useMemo(() => JSON.stringify(formData), [formData]);
  useEffect(() => {
    if (!caseId) return;
    const t = setTimeout(() => {
      saveDraftMutation.mutate({
        caseId,
        affectedDataTypes: formData.affectedDataTypes,
        affectedIndividuals: formData.affectedIndividuals,
        riskAssessment: formData.riskAssessment,
        mitigationMeasures: formData.mitigationMeasures,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [caseId, debouncedPayload]);

  const handleAddDataType = () => {
    const v = newDataType.trim();
    if (!v) return;
    setFormData({ ...formData, affectedDataTypes: [...formData.affectedDataTypes, v] });
    setNewDataType('');
  };

  const handleRemoveDataType = (index: number) => {
    setFormData({
      ...formData,
      affectedDataTypes: formData.affectedDataTypes.filter((_, i) => i !== index),
    });
  };

  const handleAddMeasure = () => {
    const v = newMeasure.trim();
    if (!v) return;
    setFormData({ ...formData, mitigationMeasures: [...formData.mitigationMeasures, v] });
    setNewMeasure('');
  };

  const handleRemoveMeasure = (index: number) => {
    setFormData({
      ...formData,
      mitigationMeasures: formData.mitigationMeasures.filter((_, i) => i !== index),
    });
  };

  const validate = () => {
    if (!formData.affectedDataTypes.length) {
      alert('Adicione pelo menos um tipo de dado afetado');
      return false;
    }
    if (formData.affectedIndividuals <= 0) {
      alert('Número de indivíduos afetados deve ser maior que 0');
      return false;
    }
    if (!formData.riskAssessment.trim()) {
      alert('Avaliação de risco é obrigatória');
      return false;
    }
    if (!formData.mitigationMeasures.length) {
      alert('Adicione pelo menos uma medida de mitigação');
      return false;
    }
    return true;
  };

  const handleSubmitForReview = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // garante save antes de enviar
      await saveDraftMutation.mutateAsync({
        caseId,
        affectedDataTypes: formData.affectedDataTypes,
        affectedIndividuals: formData.affectedIndividuals,
        riskAssessment: formData.riskAssessment,
        mitigationMeasures: formData.mitigationMeasures,
      });
      await submitForReviewMutation.mutateAsync({ caseId });
      alert('CIS enviada para revisão da consultoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    setIsSubmitting(true);
    try {
      await finalizeMutation.mutateAsync({ caseId });
      alert('CIS marcada como FINALIZADA.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkSent = async () => {
    setIsSubmitting(true);
    try {
      await markSentMutation.mutateAsync({ caseId });
      alert('CIS marcada como ENVIADA (registro interno).');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Caso não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editor de CIS</h1>
          <p className="text-gray-600 mt-1">Caso: {caseData.title}</p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Dados Afetados */}
          
      {/* Sugestões automáticas (semi-automático) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Sugestões automáticas
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchPrefill()}
                disabled={isFetchingPrefill}
              >
                Atualizar
              </Button>
              <Button
                size="sm"
                onClick={applyPrefillAll}
                disabled={!cisPrefill?.suggestions}
              >
                Aplicar tudo
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Pré-preenchimento com base no incidente, no caso e nas evidências já registradas (você pode ajustar).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {cisPrefill?.suggestions ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Evidências: {(cisPrefill as any).context?.evidences ?? 0}</Badge>
                <Badge variant="secondary">Tipo: {(cisPrefill as any).context?.incidentType ?? "—"}</Badge>
                <Badge variant="secondary">Severidade: {(cisPrefill as any).context?.severity ?? "—"}</Badge>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Tipos de dados sugeridos</p>
                  <div className="flex flex-wrap gap-2">
                    {(cisPrefill as any).suggestions.affectedDataTypes?.map((t: string, i: number) => (
                      <Badge key={i} variant="outline">{t}</Badge>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={applyPrefillTypesOnly}>
                  Adicionar
                </Button>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Medidas de mitigação sugeridas</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {(cisPrefill as any).suggestions.mitigationMeasures?.slice(0, 8).map((m: string, i: number) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" size="sm" onClick={applyPrefillMeasuresOnly}>
                  Adicionar
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Titulares afetados (estimativa)</p>
                  <p className="text-sm text-muted-foreground">
                    Sugestão: {(cisPrefill as any).suggestions.affectedIndividuals ?? 0} (se não souber, pode manter 0 por enquanto)
                  </p>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Avaliação de risco sugerida</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {(cisPrefill as any).suggestions.riskAssessment}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={applyPrefillRiskOnly}>
                  Usar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ainda não foi possível gerar sugestões (adicione mais contexto no incidente/caso ou evidências).
            </p>
          )}
        </CardContent>
      </Card>

<Card>
            <CardHeader>
              <CardTitle>Tipos de Dados Afetados</CardTitle>
              <CardDescription>Quais tipos de dados foram comprometidos?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.affectedDataTypes.map((type, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveDataType(index)}
                  >
                    {type} ✕
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newDataType}
                  onChange={(e) => setNewDataType(e.target.value)}
                  placeholder="Ex: CPF, e-mail, dados de pagamento"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDataType();
                    }
                  }}
                />
                <Button variant="outline" onClick={handleAddDataType}>
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Indivíduos Afetados */}
          <Card>
            <CardHeader>
              <CardTitle>Indivíduos Afetados</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                min="1"
                value={formData.affectedIndividuals}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    affectedIndividuals: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Número de indivíduos"
              />
            </CardContent>
          </Card>

          {/* Avaliação de Risco */}
          <Card>
            <CardHeader>
              <CardTitle>Avaliação de Risco</CardTitle>
              <CardDescription>Descreva o risco associado ao incidente</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.riskAssessment}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    riskAssessment: e.target.value,
                  })
                }
                placeholder="Descreva o risco..."
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Medidas de Mitigação */}
          <Card>
            <CardHeader>
              <CardTitle>Medidas de Mitigação</CardTitle>
              <CardDescription>Quais medidas foram/serão tomadas?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {formData.mitigationMeasures.map((measure, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded border border-gray-200 flex justify-between items-start"
                  >
                    <p className="text-sm">{measure}</p>
                    <button
                      onClick={() => handleRemoveMeasure(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMeasure}
                  onChange={(e) => setNewMeasure(e.target.value)}
                  placeholder="Ex: reset de senhas, bloqueio de acesso, notificação"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMeasure();
                    }
                  }}
                />
                <Button variant="outline" onClick={handleAddMeasure}>
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Tipos de Dados</p>
                <p className="font-bold text-lg">{formData.affectedDataTypes.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Indivíduos Afetados</p>
                <p className="font-bold text-lg">{formData.affectedIndividuals}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Medidas de Mitigação</p>
                <p className="font-bold text-lg">{formData.mitigationMeasures.length}</p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Status da Avaliação</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        formData.affectedDataTypes.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm">Dados afetados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        formData.affectedIndividuals > 0 ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm">Indivíduos afetados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        formData.riskAssessment.trim() ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm">Avaliação de risco</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        formData.mitigationMeasures.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm">Medidas de mitigação</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">
              Status atual: <span className="font-medium">{String((cisCurrent as any)?.status ?? 'rascunho')}</span>
              {saveDraftMutation.isPending ? ' · salvando...' : ' · autosave ativo'}
            </div>
            <Button
              onClick={handleSubmitForReview}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Processando...' : 'Enviar para revisão'}
            </Button>
            <Button
              variant="outline"
              onClick={handleFinalize}
              disabled={isSubmitting}
              className="w-full"
            >
              Finalizar
            </Button>
            <Button
              variant="outline"
              onClick={handleMarkSent}
              disabled={isSubmitting}
              className="w-full"
            >
              Marcar como Enviado
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
