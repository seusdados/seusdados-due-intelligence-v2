import React, { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowLeft, Upload, Trash2, CheckCircle } from 'lucide-react';

export function PaAnpdEvidences() {
  const params = useParams<{ id: string }>();
  const caseId = params?.id || '';
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: evidences, isLoading, refetch } = trpc.paAnpd.listEvidences.useQuery(
    { caseId },
    { enabled: !!caseId }
  );

  const updateStatusMutation = trpc.paAnpd.updateEvidenceStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Selecione um arquivo');
      return;
    }

    setIsUploading(true);
    try {
      // Simular upload
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert('Arquivo enviado com sucesso!');
      setSelectedFile(null);
      refetch();
    } catch (error) {
      alert('Erro ao enviar arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStatusUpdate = async (evidenceId: string, status: string) => {
    await updateStatusMutation.mutateAsync({
      evidenceId,
      status: status as any,
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-gray-100 text-gray-800';
      case 'coletada':
        return 'bg-blue-100 text-blue-800';
      case 'analisada':
        return 'bg-green-100 text-green-800';
      case 'arquivada':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Gestão de Evidências</h1>
          <p className="text-gray-600 mt-1">Caso: {caseId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Evidência</CardTitle>
              <CardDescription>Adicione novos documentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">Arraste arquivos ou clique para selecionar</p>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <Button variant="outline" size="sm">
                    Selecionar Arquivo
                  </Button>
                </label>
              </div>

              {selectedFile && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full"
              >
                {isUploading ? 'Enviando...' : 'Enviar'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Evidences List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Evidências Coletadas</CardTitle>
              <CardDescription>{evidences?.length || 0} arquivos</CardDescription>
            </CardHeader>
            <CardContent>
              {evidences && evidences.length > 0 ? (
                <div className="space-y-3">
                  {evidences.map((evidence: any) => (
                    <div key={evidence.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{evidence.title}</h3>
                            <Badge className={getStatusColor(evidence.status)}>
                              {evidence.status}
                            </Badge>
                          </div>
                          {evidence.description && (
                            <p className="text-sm text-gray-600 mt-1">{evidence.description}</p>
                          )}
                          {evidence.collectedAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              Coletado em: {new Date(evidence.collectedAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          {evidence.status === 'pendente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(evidence.id, 'coletada')}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma evidência coletada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
