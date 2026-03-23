import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Highlighter,
  X,
  Trash2,
  Check,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  ThumbsUp,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface ClauseAnnotationsPanelProps {
  analysisId: number;
  clauseId: string;
  clauseTitle: string;
  onClose?: () => void;
  onSelectAnnotation?: (annotation: Annotation) => void;
}

interface Annotation {
  id: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  content: string;
  highlightColor: string;
  annotationType: string;
  authorName: string | null;
  authorRole: string;
  isResolved: number;
  createdAt: string;
}

const HIGHLIGHT_COLORS = [
  { value: 'yellow', label: 'Amarelo', class: 'bg-yellow-200' },
  { value: 'green', label: 'Verde', class: 'bg-green-200' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-200' },
  { value: 'red', label: 'Vermelho', class: 'bg-red-200' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-200' },
  { value: 'orange', label: 'Laranja', class: 'bg-orange-200' },
];

const ANNOTATION_TYPES = [
  { value: 'note', label: 'Nota', icon: MessageSquare },
  { value: 'question', label: 'Dúvida', icon: HelpCircle },
  { value: 'suggestion', label: 'Sugestão', icon: Lightbulb },
  { value: 'issue', label: 'Problema', icon: AlertTriangle },
  { value: 'approval', label: 'Aprovação', icon: ThumbsUp },
];

export function ClauseAnnotationsPanel({
  analysisId,
  clauseId,
  clauseTitle,
  onClose,
  onSelectAnnotation,
}: ClauseAnnotationsPanelProps) {
  const { user } = useAuth();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState({
    selectedText: '',
    startOffset: 0,
    endOffset: 0,
    content: '',
    highlightColor: 'yellow' as const,
    annotationType: 'note' as const,
  });

  const utils = trpc.useUtils();

  const { data: annotations, isLoading } = trpc.clauseAnnotations.listByClause.useQuery({
    analysisId,
    clauseId,
  });

  const createAnnotation = trpc.clauseAnnotations.create.useMutation({
    onSuccess: () => {
      utils.clauseAnnotations.listByClause.invalidate({ analysisId, clauseId });
      setShowNewForm(false);
      setNewAnnotation({
        selectedText: '',
        startOffset: 0,
        endOffset: 0,
        content: '',
        highlightColor: 'yellow',
        annotationType: 'note',
      });
      toast.success('Anotação adicionada');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar anotação: ' + error.message);
    },
  });

  const deleteAnnotation = trpc.clauseAnnotations.delete.useMutation({
    onSuccess: () => {
      utils.clauseAnnotations.listByClause.invalidate({ analysisId, clauseId });
      toast.success('Anotação excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir anotação: ' + error.message);
    },
  });

  const resolveAnnotation = trpc.clauseAnnotations.resolve.useMutation({
    onSuccess: () => {
      utils.clauseAnnotations.listByClause.invalidate({ analysisId, clauseId });
      toast.success('Anotação resolvida');
    },
    onError: (error) => {
      toast.error('Erro ao resolver anotação: ' + error.message);
    },
  });

  const handleSubmit = () => {
    if (!newAnnotation.content.trim() || !newAnnotation.selectedText.trim()) {
      toast.error('Selecione um texto e adicione uma anotação');
      return;
    }

    createAnnotation.mutate({
      analysisId,
      clauseId,
      selectedText: newAnnotation.selectedText,
      startOffset: newAnnotation.startOffset,
      endOffset: newAnnotation.endOffset,
      content: newAnnotation.content,
      highlightColor: newAnnotation.highlightColor,
      annotationType: newAnnotation.annotationType,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta anotação?')) {
      deleteAnnotation.mutate({ id });
    }
  };

  const getHighlightClass = (color: string) => {
    return HIGHLIGHT_COLORS.find((c) => c.value === color)?.class || 'bg-yellow-200';
  };

  const getTypeIcon = (type: string) => {
    const TypeIcon = ANNOTATION_TYPES.find((t) => t.value === type)?.icon || MessageSquare;
    return <TypeIcon className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    return ANNOTATION_TYPES.find((t) => t.value === type)?.label || type;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Função para capturar seleção de texto (será chamada pelo componente pai)
  const handleTextSelection = (selectedText: string, startOffset: number, endOffset: number) => {
    setNewAnnotation((prev) => ({
      ...prev,
      selectedText,
      startOffset,
      endOffset,
    }));
    setShowNewForm(true);
  };

  // Expor função para componente pai
  (window as any).handleClauseTextSelection = handleTextSelection;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Highlighter className="h-5 w-5 text-amber-600" />
          <div>
            <h3 className="font-semibold text-sm">Anotações</h3>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{clauseTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewForm(!showNewForm)}
            className="text-xs"
          >
            {showNewForm ? 'Cancelar' : '+ Nova'}
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Formulário de nova anotação */}
      {showNewForm && (
        <div className="p-4 border-b bg-amber-50">
          <p className="text-xs text-gray-600 mb-2">
            Selecione um texto na cláusula para criar uma anotação
          </p>

          {newAnnotation.selectedText && (
            <div className={`p-2 rounded text-sm mb-3 ${getHighlightClass(newAnnotation.highlightColor)}`}>
              <p className="text-xs text-gray-500 mb-1">Texto selecionado:</p>
              <p className="italic">"{newAnnotation.selectedText}"</p>
            </div>
          )}

          <div className="flex gap-2 mb-3">
            <Select
              value={newAnnotation.highlightColor}
              onValueChange={(value: any) =>
                setNewAnnotation((prev) => ({ ...prev, highlightColor: value }))
              }
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Cor" />
              </SelectTrigger>
              <SelectContent>
                {HIGHLIGHT_COLORS.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${color.class}`} />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={newAnnotation.annotationType}
              onValueChange={(value: any) =>
                setNewAnnotation((prev) => ({ ...prev, annotationType: value }))
              }
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {ANNOTATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={newAnnotation.content}
            onChange={(e) => setNewAnnotation((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="Escreva sua anotação..."
            className="min-h-[60px] text-sm mb-2"
          />

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newAnnotation.selectedText || !newAnnotation.content.trim() || createAnnotation.isPending}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            Adicionar Anotação
          </Button>
        </div>
      )}

      {/* Lista de anotações */}
      <ScrollArea className="flex-1 px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600" />
          </div>
        ) : annotations && annotations.length > 0 ? (
          <div className="divide-y py-2">
            {annotations.map((annotation) => (
              <div
                key={annotation.id}
                className={`py-3 cursor-pointer hover:bg-gray-50 rounded transition-colors ${
                  annotation.isResolved ? 'opacity-60' : ''
                }`}
                onClick={() => onSelectAnnotation?.(annotation as Annotation)}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`p-1.5 rounded ${getHighlightClass(annotation.highlightColor || 'yellow')}`}
                  >
                    {getTypeIcon(annotation.annotationType || 'note')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(annotation.annotationType || 'note')}
                      </Badge>
                      {annotation.isResolved === 1 && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Resolvido
                        </Badge>
                      )}
                    </div>

                    <p className={`text-xs italic text-gray-500 mb-1 ${getHighlightClass(annotation.highlightColor || 'yellow')} px-1 rounded`}>
                      "{annotation.selectedText?.substring(0, 50)}
                      {(annotation.selectedText?.length || 0) > 50 ? '...' : ''}"
                    </p>

                    <p className="text-sm text-gray-700">{annotation.content}</p>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {annotation.authorName} • {formatDate(annotation.createdAt)}
                      </span>

                      <div className="flex items-center gap-1">
                        {!annotation.isResolved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              resolveAnnotation.mutate({ id: annotation.id });
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}

                        {(annotation.authorId === user?.id || user?.role === 'admin_global') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(annotation.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Highlighter className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-sm">Nenhuma anotação ainda</p>
            <p className="text-xs">Selecione um texto para anotar</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default ClauseAnnotationsPanel;
