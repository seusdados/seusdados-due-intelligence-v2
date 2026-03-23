/**
 * Página de Plano de Ação para Análise de Contrato LGPD
 * Exibe e permite editar o plano de ação gerado a partir dos riscos identificados
 * Funcionalidades: edição inline, indicadores de prazo, exportação PDF
 */

import { useState, useEffect, useCallback } from "react";
// DashboardLayout removido - já é aplicado no App.tsx
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { 
  ArrowLeft, CheckCircle, AlertTriangle, 
  FileText, Shield, AlertCircle, Clock,
  Plus, Edit2, Trash2, Save, X, Loader2,
  ClipboardList, Download, RefreshCw, Calendar,
  Bell, BellRing, Check, XCircle, MessageSquare, Sparkles,
  ChevronDown, ChevronUp, Target, Scale, BookOpen
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link, useParams } from "wouter";

const priorityColors: Record<string, string> = {
  'critica': 'bg-red-600 text-white',
  'alta': 'bg-orange-500 text-white',
  'media': 'bg-yellow-500 text-black',
  'baixa': 'bg-blue-500 text-white',
};

const priorityLabels: Record<string, string> = {
  'critica': 'Crítica',
  'alta': 'Alta',
  'media': 'Média',
  'baixa': 'Baixa',
};

const statusColors: Record<string, string> = {
  'pendente': 'bg-gray-500',
  'em_andamento': 'bg-blue-500',
  'concluida': 'bg-green-500',
  'cancelada': 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  'pendente': 'Pendente',
  'em_andamento': 'Em Andamento',
  'concluida': 'Concluída',
  'cancelada': 'Cancelada',
};

// Função para parsear a descrição estruturada da ação
function parseActionDescription(description: string | null): {
  risco: string;
  impacto: string;
  acao: string;
  referencia: string;
  contrato: string;
} {
  if (!description) return { risco: '', impacto: '', acao: '', referencia: '', contrato: '' };
  
  const result = { risco: '', impacto: '', acao: '', referencia: '', contrato: '' };
  const text = description.replace(/\n/g, ' ');
  
  // Extrair Risco Identificado
  const riscoMatch = text.match(/\*\*Risco Identificado:\*\*\s*([^*]+?)(?=\*\*|$)/);
  if (riscoMatch) result.risco = riscoMatch[1].trim();
  
  // Extrair Impacto Potencial
  const impactoMatch = text.match(/\*\*Impacto Potencial:\*\*\s*([^*]+?)(?=\*\*|$)/);
  if (impactoMatch) result.impacto = impactoMatch[1].trim();
  
  // Extrair Ação Requerida
  const acaoMatch = text.match(/\*\*Ação Requerida:\*\*\s*([^*]+?)(?=\*\*|$)/);
  if (acaoMatch) result.acao = acaoMatch[1].trim();
  
  // Extrair Referência Legal
  const refMatch = text.match(/\*\*Referência Legal:\*\*\s*([^*]+?)(?=\*\*|$)/);
  if (refMatch) result.referencia = refMatch[1].trim();
  
  // Extrair Contrato
  const contratoMatch = text.match(/\*\*Contrato:\*\*\s*([^*]+?)(?=\*\*|$)/);
  if (contratoMatch) result.contrato = contratoMatch[1].trim();
  
  return result;
}

interface ActionPlan {
  id: number;
  organizationId: number;
  assessmentType: string;
  assessmentId: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  responsibleId: number | null;
  dueDate: Date | string | null;
  completedAt: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Função para calcular status do prazo
function getDeadlineStatus(dueDate: Date | string | null, status: string): 'ok' | 'warning' | 'overdue' | 'none' {
  if (!dueDate || status === 'concluida' || status === 'cancelada') return 'none';
  
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'warning';
  return 'ok';
}

// Componente de indicador de prazo
function DeadlineIndicator({ dueDate, status }: { dueDate: Date | string | null; status: string }) {
  const deadlineStatus = getDeadlineStatus(dueDate, status);
  
  if (deadlineStatus === 'none' || !dueDate) {
    return <span className="text-gray-400">-</span>;
  }
  
  const formattedDate = new Date(dueDate).toLocaleDateString('pt-BR');
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (deadlineStatus === 'overdue') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">{formattedDate}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-red-600 font-medium">Atrasado há {Math.abs(diffDays)} dia(s)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (deadlineStatus === 'warning') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-orange-500">
              <Bell className="w-4 h-4" />
              <span className="font-medium">{formattedDate}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-orange-500 font-medium">
              {diffDays === 0 ? 'Vence hoje!' : `Vence em ${diffDays} dia(s)`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return <span className="text-gray-600">{formattedDate}</span>;
}

// Componente de célula editável inline
function EditableCell({ 
  value, 
  onSave, 
  type = 'text',
  placeholder = '',
  isEditing,
  onStartEdit,
  onCancelEdit,
}: {
  value: string;
  onSave: (newValue: string) => void;
  type?: 'text' | 'textarea' | 'date';
  placeholder?: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}) {
  const [editValue, setEditValue] = useState(value);
  
  useEffect(() => {
    setEditValue(value);
  }, [value]);
  
  const handleSave = () => {
    onSave(editValue);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditValue(value);
      onCancelEdit();
    }
  };
  
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        {type === 'textarea' ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] text-sm"
            autoFocus
          />
        ) : type === 'date' ? (
          <Input
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-[140px]"
            autoFocus
          />
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-8"
            autoFocus
          />
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}>
          <Check className="w-4 h-4 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancelEdit}>
          <X className="w-4 h-4 text-gray-500" />
        </Button>
      </div>
    );
  }
  
  return (
    <div 
      className="cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 min-h-[24px] group"
      onClick={onStartEdit}
    >
      {value || <span className="text-gray-400 italic">{placeholder || 'Clique para editar'}</span>}
      <Edit2 className="w-3 h-3 text-gray-400 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default function ContractActionPlan() {
  const { id } = useParams<{ id: string }>();
  const analysisId = parseInt(id || "0");
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingField, setEditingField] = useState<{ actionId: number; field: string } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'media',
    responsible: '',
    deadline: '',
    notes: '',
  });

  // Query para buscar a análise
  const { data: analysis } = trpc.contractAnalysis.getById.useQuery(
    { id: analysisId },
    { enabled: !!analysisId }
  );

  // Query para listar ações
  const { data: actions, refetch } = trpc.contractAnalysis.listActionPlans.useQuery(
    { analysisId },
    { enabled: !!analysisId }
  );

  // Mutation para criar ação
  const createMutation = trpc.actionPlan.create.useMutation({
    onSuccess: () => {
      toast.success("Ação criada com sucesso!");
      setIsAddOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar ação: ${error.message}`);
    }
  });

  // Mutation para atualizar ação
  const updateMutation = trpc.actionPlan.update.useMutation({
    onSuccess: () => {
      toast.success("Alteração salva!");
      setEditingField(null);
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  // Mutation para excluir ação
  const deleteMutation = trpc.actionPlan.update.useMutation({
    onSuccess: () => {
      toast.success("Ação excluída com sucesso!");
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao excluir ação: ${error.message}`);
    }
  });

  // Mutation para gerar plano automaticamente
  const generateMutation = trpc.contractAnalysis.generateActionPlan.useMutation({
    onSuccess: (data) => {
      toast.success(`Plano de ação gerado com ${data.actionsCreated} ações!`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao gerar plano: ${error.message}`);
    }
  });

  // Mutation para exportar PDF
  const exportPdfMutation = trpc.contractAnalysis.exportActionPlanPdf.useMutation({
    onSuccess: (data) => {
      console.log('[ExportPDF] Dados recebidos:', { dataLength: data.data?.length, filename: data.filename });
      // Converter base64 para blob e fazer download
      if (!data.data || data.data.length === 0) {
        toast.error('PDF gerado está vazio');
        return;
      }
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Plano de ação exportado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao exportar PDF: ${error.message}`);
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'media',
      responsible: '',
      deadline: '',
      notes: '',
    });
  };

  const handleAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleDelete = (actionId: number) => {
    if (confirm('Tem certeza que deseja cancelar esta ação?')) {
      deleteMutation.mutate({ id: actionId, status: 'cancelada' as const });
    }
  };

  const handleSubmitCreate = () => {
    if (!analysis) return;
    createMutation.mutate({
      organizationId: analysis.organizationId,
      assessmentType: 'contract_analysis' as const,
      assessmentId: analysisId,
      title: formData.title,
      description: formData.description || undefined,
      priority: formData.priority as 'critica' | 'alta' | 'media' | 'baixa',
      dueDate: formData.deadline ? new Date(formData.deadline) : undefined,
      notes: formData.notes || undefined,
    });
  };

  // Funções de edição inline
  const handleInlineEdit = (action: ActionPlan, field: string, value: string) => {
    const updates: Record<string, unknown> = { id: action.id };
    
    switch (field) {
      case 'title':
        updates.title = value;
        break;
      case 'description':
        updates.description = value || undefined;
        break;
      case 'dueDate':
        updates.dueDate = value ? new Date(value) : undefined;
        break;
      case 'notes':
        updates.notes = value || undefined;
        break;
    }
    
    updateMutation.mutate(updates as Parameters<typeof updateMutation.mutate>[0]);
  };

  const handleStatusChange = (action: ActionPlan, newStatus: string) => {
    updateMutation.mutate({
      id: action.id,
      status: newStatus as 'pendente' | 'em_andamento' | 'concluida' | 'cancelada',
    });
  };

  const handlePriorityChange = (action: ActionPlan, newPriority: string) => {
    updateMutation.mutate({
      id: action.id,
      priority: newPriority as 'critica' | 'alta' | 'media' | 'baixa',
    });
  };

  const handleGeneratePlan = () => {
    generateMutation.mutate({ analysisId });
  };

  const handleExportPdf = () => {
    exportPdfMutation.mutate({ analysisId });
  };

  const isConsultant = user?.role === 'admin_global' || user?.role === 'consultor';

  // Estatísticas
  const stats = {
    total: actions?.length || 0,
    pendentes: actions?.filter(a => a.status === 'pendente').length || 0,
    emAndamento: actions?.filter(a => a.status === 'em_andamento').length || 0,
    concluidas: actions?.filter(a => a.status === 'concluida').length || 0,
    criticas: actions?.filter(a => a.priority === 'critica').length || 0,
    atrasadas: actions?.filter(a => getDeadlineStatus(a.dueDate, a.status) === 'overdue').length || 0,
    proximasVencer: actions?.filter(a => getDeadlineStatus(a.dueDate, a.status) === 'warning').length || 0,
  };

  const progressPercent = stats.total > 0 
    ? Math.round((stats.concluidas / stats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/analise-contratos/${analysisId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <p className="text-sm text-emerald-600 font-medium tracking-wider uppercase">
                Plano de Ação
              </p>
              <h1 className="text-2xl font-light text-gray-900">
                {analysis?.contractName || 'Carregando...'}
              </h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={exportPdfMutation.isPending || !actions?.length}
            >
              {exportPdfMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar PDF
            </Button>
            {isConsultant && (
              <>
                <Button
                  variant="outline"
                  onClick={handleGeneratePlan}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Gerar Automaticamente
                </Button>
                <Button onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Ação
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Alertas de Prazo */}
        {(stats.atrasadas > 0 || stats.proximasVencer > 0) && (
          <div className="flex gap-4">
            {stats.atrasadas > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">
                      {stats.atrasadas} {stats.atrasadas === 1 ? 'ação atrasada' : 'ações atrasadas'}
                    </p>
                    <p className="text-sm text-red-600">Requer atenção imediata</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {stats.proximasVencer > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <Bell className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-800">
                      {stats.proximasVencer} {stats.proximasVencer === 1 ? 'ação próxima do vencimento' : 'ações próximas do vencimento'}
                    </p>
                    <p className="text-sm text-orange-600">Vence nos próximos 3 dias</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <ClipboardList className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-light">{stats.total}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <Clock className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-2xl font-light">{stats.pendentes}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-light">{stats.emAndamento}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Em Andamento</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-light">{stats.concluidas}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-light">{stats.criticas}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Críticas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-light">{stats.atrasadas}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Atrasadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Progresso */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progresso do Plano</span>
              <span className="text-sm font-medium text-gray-700">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>

        {/* Lista de Ações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              Ações do Plano
            </CardTitle>
            <CardDescription>
              {isConsultant 
                ? 'Clique em qualquer campo para editar diretamente' 
                : 'Visualize o status das ações de adequação'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!actions || actions.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Nenhuma ação cadastrada</p>
                {isConsultant && (
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={handleGeneratePlan}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Gerar Automaticamente
                    </Button>
                    <Button onClick={handleAdd}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Manualmente
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {actions.map((action, index) => {
                  const parsed = parseActionDescription(action.description);
                  const deadlineStatus = getDeadlineStatus(action.dueDate, action.status);
                  
                  return (
                    <Card key={action.id} className={`border-l-4 ${
                      action.priority === 'critica' ? 'border-l-red-500' :
                      action.priority === 'alta' ? 'border-l-orange-500' :
                      action.priority === 'media' ? 'border-l-yellow-500' :
                      'border-l-blue-500'
                    } ${deadlineStatus === 'overdue' ? 'bg-red-50' : deadlineStatus === 'warning' ? 'bg-orange-50' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              action.priority === 'critica' ? 'bg-red-500' :
                              action.priority === 'alta' ? 'bg-orange-500' :
                              action.priority === 'media' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`}>
                              #{String(index + 1).padStart(2, '0')}
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {isConsultant ? (
                                  <EditableCell
                                    value={action.title}
                                    onSave={(value) => handleInlineEdit(action, 'title', value)}
                                    placeholder="Título da ação"
                                    isEditing={editingField?.actionId === action.id && editingField?.field === 'title'}
                                    onStartEdit={() => setEditingField({ actionId: action.id, field: 'title' })}
                                    onCancelEdit={() => setEditingField(null)}
                                  />
                                ) : action.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={priorityColors[action.priority]}>
                                  {priorityLabels[action.priority]}
                                </Badge>
                                <Badge variant="outline" className={statusColors[action.status] + ' text-white'}>
                                  {statusLabels[action.status]}
                                </Badge>
                                {action.dueDate && (
                                  <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <DeadlineIndicator dueDate={action.dueDate} status={action.status} />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isConsultant && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                                  onClick={() => {
                                    toast.info('Ajuste IA - Em breve!', {
                                      description: `Ajustar ação #${index + 1} com assistência de IA`
                                    });
                                  }}
                                >
                                  <Sparkles className="w-4 h-4 mr-1" />
                                  Ajuste IA
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(action.id)}
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Risco Identificado */}
                          {parsed.risco && (
                            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                              <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                Risco Identificado
                              </div>
                              <p className="text-sm text-gray-700">{parsed.risco}</p>
                            </div>
                          )}
                          
                          {/* Impacto Potencial */}
                          {parsed.impacto && (
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                              <div className="flex items-center gap-2 text-orange-700 font-medium mb-1">
                                <Target className="w-4 h-4" />
                                Impacto Potencial
                              </div>
                              <p className="text-sm text-gray-700">{parsed.impacto}</p>
                            </div>
                          )}
                          
                          {/* Ação Requerida */}
                          {parsed.acao && (
                            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                              <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                                <CheckCircle className="w-4 h-4" />
                                Ação Requerida
                              </div>
                              <p className="text-sm text-gray-700">{parsed.acao}</p>
                            </div>
                          )}
                          
                          {/* Referência Legal */}
                          {parsed.referencia && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                                <Scale className="w-4 h-4" />
                                Referência Legal
                              </div>
                              <p className="text-sm text-gray-700">{parsed.referencia}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Controles de edição para consultor */}
                        {isConsultant && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label className="text-xs text-gray-500">Prioridade</Label>
                                <Select
                                  value={action.priority}
                                  onValueChange={(value) => handlePriorityChange(action, value)}
                                >
                                  <SelectTrigger className="h-8 mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="critica">Crítica</SelectItem>
                                    <SelectItem value="alta">Alta</SelectItem>
                                    <SelectItem value="media">Média</SelectItem>
                                    <SelectItem value="baixa">Baixa</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Status</Label>
                                <Select
                                  value={action.status}
                                  onValueChange={(value) => handleStatusChange(action, value)}
                                >
                                  <SelectTrigger className="h-8 mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                    <SelectItem value="concluida">Concluída</SelectItem>
                                    <SelectItem value="cancelada">Cancelada</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Prazo</Label>
                                <Input
                                  type="date"
                                  value={action.dueDate ? new Date(action.dueDate).toISOString().split('T')[0] : ''}
                                  onChange={(e) => handleInlineEdit(action, 'dueDate', e.target.value)}
                                  className="h-8 mt-1"
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <Label className="text-xs text-gray-500">Responsável / Observações</Label>
                              <EditableCell
                                value={action.notes || ''}
                                onSave={(value) => handleInlineEdit(action, 'notes', value)}
                                placeholder="Definir responsável ou adicionar observações..."
                                isEditing={editingField?.actionId === action.id && editingField?.field === 'notes'}
                                onStartEdit={() => setEditingField({ actionId: action.id, field: 'notes' })}
                                onCancelEdit={() => setEditingField(null)}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal Adicionar */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Ação</DialogTitle>
              <DialogDescription>
                Adicione uma nova ação ao plano de adequação
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título da ação"
                />
              </div>
              <div>
                <Label>Descrição *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva a ação a ser realizada"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critica">Crítica</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prazo</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Responsável</Label>
                <Input
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações adicionais"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmitCreate}
                disabled={!formData.title || !formData.description || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
