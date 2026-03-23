import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, Link as LinkIcon } from 'lucide-react';

interface PendingEvidence {
  id: string;
  domain: string;
  question: string;
  requiredType: 'pdf' | 'link' | 'both';
  status: 'pendente' | 'parcial' | 'completo';
  uploadedCount: number;
  requiredCount: number;
}

interface PendingEvidencesListProps {
  assessmentId: number;
  pendingEvidences: PendingEvidence[];
  onUpload?: (evidenceId: string) => void;
}

export function PendingEvidencesList({ assessmentId, pendingEvidences, onUpload }: PendingEvidencesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completo':
        return 'bg-green-100 text-green-800';
      case 'parcial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pendente':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completo':
        return '✓ Completo';
      case 'parcial':
        return '⊘ Parcial';
      case 'pendente':
        return '✕ Pendente';
      default:
        return status;
    }
  };

  const totalPending = pendingEvidences.filter(e => e.status === 'pendente').length;
  const totalPartial = pendingEvidences.filter(e => e.status === 'parcial').length;
  const totalComplete = pendingEvidences.filter(e => e.status === 'completo').length;

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Resumo de Evidências Pendentes</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{totalPending}</p>
            <p className="text-sm text-gray-600">Pendentes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{totalPartial}</p>
            <p className="text-sm text-gray-600">Parciais</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{totalComplete}</p>
            <p className="text-sm text-gray-600">Completos</p>
          </div>
        </div>
      </Card>

      {/* Lista de Evidências */}
      <div className="space-y-2">
        {pendingEvidences.map(evidence => (
          <Card
            key={evidence.id}
            className="p-4 cursor-pointer hover:bg-gray-50 transition"
            onClick={() => setExpandedId(expandedId === evidence.id ? null : evidence.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{evidence.domain}</h4>
                  <Badge className={`${getStatusColor(evidence.status)}`}>
                    {getStatusLabel(evidence.status)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{evidence.question}</p>
              </div>

              <div className="text-right ml-4">
                <p className="text-sm font-semibold text-gray-900">
                  {evidence.uploadedCount}/{evidence.requiredCount}
                </p>
                <p className="text-xs text-gray-500">
                  {Math.round((evidence.uploadedCount / evidence.requiredCount) * 100)}%
                </p>
              </div>
            </div>

            {/* Detalhes Expandidos */}
            {expandedId === evidence.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Tipo de Evidência Requerida:</p>
                  <div className="flex gap-2">
                    {(evidence.requiredType === 'pdf' || evidence.requiredType === 'both') && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <FileText className="w-3 h-3 mr-1" />
                        PDF (máx 10MB)
                      </Badge>
                    )}
                    {(evidence.requiredType === 'link' || evidence.requiredType === 'both') && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Link
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpload?.(evidence.id);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-semibold"
                  >
                    Adicionar Evidência
                  </button>
                </div>

                {evidence.uploadedCount > 0 && (
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      ✓ {evidence.uploadedCount} evidência(s) já anexada(s)
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Mensagem de Bloqueio */}
      {totalPending > 0 && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">Não é possível finalizar a avaliação</h4>
              <p className="text-sm text-red-800">
                Você precisa anexar todas as evidências obrigatórias antes de finalizar. Existem <strong>{totalPending} questão(ões) com evidências pendentes</strong>.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
