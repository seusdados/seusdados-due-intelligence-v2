import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, Link as LinkIcon, Plus, X } from 'lucide-react';

interface PendingItem {
  id: string;
  domain: string;
  question: string;
  requiredType: 'pdf' | 'link' | 'both';
  uploadedCount: number;
  requiredCount: number;
}

interface FinalizationBlockedModalProps {
  pendingItems: PendingItem[];
  onAddEvidence?: (itemId: string) => void;
  onClose?: () => void;
  onContinueEditing?: () => void;
}

export function FinalizationBlockedModal({
  pendingItems,
  onAddEvidence,
  onClose,
  onContinueEditing,
}: FinalizationBlockedModalProps) {
  const totalPending = pendingItems.length;
  const totalRequired = pendingItems.reduce((sum, item) => sum + item.requiredCount, 0);
  const totalUploaded = pendingItems.reduce((sum, item) => sum + item.uploadedCount, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4">
      <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b border-red-200 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold text-red-900">Não é possível finalizar</h2>
              <p className="text-sm text-red-700 mt-1">
                Existem evidências obrigatórias pendentes que precisam ser anexadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-600 hover:text-red-700 transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 font-semibold">Questões Pendentes</p>
              <p className="text-3xl font-bold text-red-700 mt-2">{totalPending}</p>
            </Card>

            <Card className="p-4 bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-600 font-semibold">Evidências Necessárias</p>
              <p className="text-3xl font-bold text-amber-700 mt-2">
                {totalRequired - totalUploaded}
              </p>
            </Card>

            <Card className="p-4 bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-600 font-semibold">Progresso</p>
              <p className="text-3xl font-bold text-blue-700 mt-2">
                {Math.round((totalUploaded / totalRequired) * 100)}%
              </p>
            </Card>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Progresso Geral</p>
              <p className="text-sm text-gray-600">
                {totalUploaded} de {totalRequired} evidências
              </p>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                style={{ width: `${(totalUploaded / totalRequired) * 100}%` }}
              />
            </div>
          </div>

          {/* Lista de Pendências */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Questões com Evidências Pendentes:</h3>

            {pendingItems.map(item => (
              <Card key={item.id} className="p-4 border border-gray-200 hover:bg-gray-50 transition">
                <div className="space-y-3">
                  {/* Cabeçalho */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-red-100 text-red-800">Pendente</Badge>
                        <p className="font-semibold text-gray-900">{item.domain}</p>
                      </div>
                      <p className="text-sm text-gray-600">{item.question}</p>
                    </div>

                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.uploadedCount}/{item.requiredCount}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round((item.uploadedCount / item.requiredCount) * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* Tipo de Evidência */}
                  <div className="flex gap-2 flex-wrap">
                    {(item.requiredType === 'pdf' || item.requiredType === 'both') && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <FileText className="w-3 h-3 mr-1" />
                        PDF (máx 10MB)
                      </Badge>
                    )}
                    {(item.requiredType === 'link' || item.requiredType === 'both') && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Link
                      </Badge>
                    )}
                  </div>

                  {/* Barra de Progresso */}
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all"
                      style={{ width: `${(item.uploadedCount / item.requiredCount) * 100}%` }}
                    />
                  </div>

                  {/* Botão de Ação */}
                  <button
                    onClick={() => onAddEvidence?.(item.id)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Evidência
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Dica */}
          <Card className="p-4 bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>💡 Dica:</strong> Você pode continuar respondendo outras questões enquanto anexa as evidências. Apenas certifique-se de que todas as evidências obrigatórias sejam anexadas antes de finalizar.
            </p>
          </Card>
        </div>

        {/* Rodapé */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onContinueEditing}
            className="flex-1"
          >
            Continuar Respondendo
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Entendido
          </Button>
        </div>
      </Card>
    </div>
  );
}
