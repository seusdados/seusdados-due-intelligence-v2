import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  MessageCircle,
  Send,
  Reply,
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
  Edit2,
  X,
  AtSign,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface ClauseCommentsPanelProps {
  analysisId: number;
  clauseId: string;
  clauseTitle: string;
  onClose?: () => void;
}

interface Comment {
  id: number;
  content: string;
  authorId: number;
  authorName: string | null;
  authorRole: string;
  isResolved: number;
  isEdited: number;
  createdAt: string;
  replies?: Comment[];
}

export function ClauseCommentsPanel({
  analysisId,
  clauseId,
  clauseTitle,
  onClose,
}: ClauseCommentsPanelProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();

  const { data: comments, isLoading } = trpc.clauseComments.listByClause.useQuery({
    analysisId,
    clauseId,
  });

  const createComment = trpc.clauseComments.create.useMutation({
    onSuccess: () => {
      utils.clauseComments.listByClause.invalidate({ analysisId, clauseId });
      setNewComment('');
      setReplyingTo(null);
      toast.success('Comentário adicionado');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar comentário: ' + error.message);
    },
  });

  const updateComment = trpc.clauseComments.update.useMutation({
    onSuccess: () => {
      utils.clauseComments.listByClause.invalidate({ analysisId, clauseId });
      setEditingId(null);
      setEditContent('');
      toast.success('Comentário atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar comentário: ' + error.message);
    },
  });

  const deleteComment = trpc.clauseComments.delete.useMutation({
    onSuccess: () => {
      utils.clauseComments.listByClause.invalidate({ analysisId, clauseId });
      toast.success('Comentário excluído');
    },
    onError: (error) => {
      toast.error('Erro ao excluir comentário: ' + error.message);
    },
  });

  const resolveComment = trpc.clauseComments.resolve.useMutation({
    onSuccess: () => {
      utils.clauseComments.listByClause.invalidate({ analysisId, clauseId });
      toast.success('Comentário resolvido');
    },
    onError: (error) => {
      toast.error('Erro ao resolver comentário: ' + error.message);
    },
  });

  const unresolveComment = trpc.clauseComments.unresolve.useMutation({
    onSuccess: () => {
      utils.clauseComments.listByClause.invalidate({ analysisId, clauseId });
      toast.success('Comentário reaberto');
    },
    onError: (error) => {
      toast.error('Erro ao reabrir comentário: ' + error.message);
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;

    createComment.mutate({
      analysisId,
      clauseId,
      content: newComment,
      parentCommentId: replyingTo || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editContent.trim() || !editingId) return;

    updateComment.mutate({
      id: editingId,
      content: editContent,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este comentário?')) {
      deleteComment.mutate({ id });
    }
  };

  const handleResolve = (id: number, isResolved: boolean) => {
    if (isResolved) {
      unresolveComment.mutate({ id });
    } else {
      resolveComment.mutate({ id });
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin_global':
        return 'bg-purple-100 text-purple-800';
      case 'consultor':
        return 'bg-blue-100 text-blue-800';
      case 'sponsor':
        return 'bg-green-100 text-green-800';
      case 'advogado':
        return 'bg-amber-100 text-amber-800';
      case 'dpo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin_global':
        return 'Admin';
      case 'consultor':
        return 'Consultor';
      case 'sponsor':
        return 'Cliente';
      case 'advogado':
        return 'Advogado';
      case 'dpo':
        return 'DPO';
      default:
        return role;
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''} ${
        comment.isResolved ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3 py-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-blue-500 text-white">
            {getInitials(comment.authorName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">
              {comment.authorName || 'Usuário'}
            </span>
            <Badge variant="secondary" className={`text-xs ${getRoleColor(comment.authorRole)}`}>
              {getRoleLabel(comment.authorRole)}
            </Badge>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(comment.createdAt)}
            </span>
            {comment.isEdited === 1 && (
              <span className="text-xs text-gray-400">(editado)</span>
            )}
            {comment.isResolved === 1 && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                <CheckCheck className="h-3 w-3 mr-1" />
                Resolvido
              </Badge>
            )}
          </div>

          {editingId === comment.id ? (
            <div className="mt-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] text-sm"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleUpdate} disabled={updateComment.isPending}>
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
          )}

          {editingId !== comment.id && (
            <div className="flex items-center gap-2 mt-2">
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setReplyingTo(comment.id);
                    textareaRef.current?.focus();
                  }}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Responder
                </Button>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 text-xs ${
                        comment.isResolved
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => handleResolve(comment.id, comment.isResolved === 1)}
                    >
                      {comment.isResolved ? (
                        <CheckCheck className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {comment.isResolved ? 'Reabrir' : 'Marcar como resolvido'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {(comment.authorId === user?.id || user?.role === 'admin_global') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {comment.authorId === user?.id && (
                      <DropdownMenuItem onClick={() => startEdit(comment)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Respostas */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-1">
          {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-purple-600" />
          <div>
            <h3 className="font-semibold text-sm">Comentários</h3>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{clauseTitle}</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Lista de comentários */}
      <ScrollArea className="flex-1 px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="divide-y">
            {comments.map((comment) => renderComment(comment as Comment))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-sm">Nenhum comentário ainda</p>
            <p className="text-xs">Seja o primeiro a comentar</p>
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Input de novo comentário */}
      <div className="p-4">
        {replyingTo && (
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded">
            <Reply className="h-4 w-4" />
            <span>Respondendo comentário</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 ml-auto"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicione um comentário..."
            className="min-h-[60px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit();
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">Ctrl+Enter para enviar</span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || createComment.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-4 w-4 mr-1" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ClauseCommentsPanel;
