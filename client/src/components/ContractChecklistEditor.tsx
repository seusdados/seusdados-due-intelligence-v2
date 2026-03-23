import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Edit2, 
  Save, 
  X, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ClipboardList
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { SmartDPOButton } from './SmartDPOButton';

interface ChecklistItem {
  id?: number;
  itemNumber: number;
  question: string;
  checklistStatus?: 'sim' | 'nao' | 'parcial';
  status?: 'sim' | 'nao' | 'parcial';
  observations: string | null;
  contractExcerpt?: string | null;
}

interface ContractChecklistEditorProps {
  analysisId: number;
  checklist: ChecklistItem[];
  isConsultor: boolean;
  onUpdate?: () => void;
}

const statusConfig = {
  sim: { label: 'Conforme', color: 'bg-green-500', icon: CheckCircle2, textColor: 'text-green-600' },
  nao: { label: 'Não Conforme', color: 'bg-red-500', icon: XCircle, textColor: 'text-red-600' },
  parcial: { label: 'Parcial', color: 'bg-yellow-500', icon: AlertCircle, textColor: 'text-yellow-600' },
};

export function ContractChecklistEditor({ 
  analysisId, 
  checklist, 
  isConsultor,
  onUpdate 
}: ContractChecklistEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<ChecklistItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    setEditedItems(checklist.map(item => ({ ...item })));
  }, [checklist]);

  const updateChecklistMutation = trpc.contractAnalysis.updateChecklistItem.useMutation({
    onSuccess: () => {
      toast.success('Item do checklist atualizado com sucesso!');
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const handleSave = async () => {
    try {
      // Salvar cada item modificado
      for (const item of editedItems) {
        const original = checklist.find(c => c.id === item.id);
        if (original && (
          original.checklistStatus !== item.checklistStatus ||
          original.observations !== item.observations ||
          original.contractExcerpt !== item.contractExcerpt
        )) {
          await updateChecklistMutation.mutateAsync({
            id: item.id!,
            status: item.checklistStatus as 'sim' | 'nao' | 'parcial',
            observations: item.observations || undefined,
          });
        }
      }
      setIsEditing(false);
      toast.success('Checklist atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar checklist:', error);
    }
  };

  const handleCancel = () => {
    setEditedItems(checklist.map(item => ({ ...item })));
    setIsEditing(false);
  };

  const updateItem = (id: number, field: keyof ChecklistItem, value: any) => {
    setEditedItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const toggleExpanded = (id: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusStats = () => {
    const stats = { sim: 0, nao: 0, parcial: 0 };
    editedItems.forEach(item => {
      stats[item.checklistStatus]++;
    });
    return stats;
  };

  const stats = getStatusStats();
  const conformityRate = editedItems.length > 0 
    ? Math.round((stats.sim / editedItems.length) * 100) 
    : 0;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Checklist de Conformidade LGPD
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {editedItems.length} itens de verificação • {conformityRate}% conformidade
              </p>
            </div>
          </div>
          
          {isConsultor && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancel}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    disabled={updateChecklistMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    {updateChecklistMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  className="gap-2 border-blue-200 hover:bg-blue-50"
                >
                  <Edit2 className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Resumo de Status */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">{stats.sim} Conforme</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">{stats.nao} Não Conforme</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-full">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">{stats.parcial} Parcial</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {editedItems.map((item, index) => {
          // Fallback para status não mapeado
          const config = statusConfig[item.checklistStatus as keyof typeof statusConfig] || statusConfig.parcial;
          const StatusIcon = config.icon;
          const isExpanded = expandedItems.has(item.id);

          return (
            <Collapsible 
              key={item.id} 
              open={isExpanded || isEditing}
              onOpenChange={() => !isEditing && toggleExpanded(item.id)}
            >
              <div className={`
                border rounded-lg transition-all duration-200
                ${isEditing ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}
              `}>
                <CollapsibleTrigger asChild>
                  <div className={`
                    flex items-center justify-between p-4 cursor-pointer
                    ${!isEditing ? 'hover:bg-slate-50' : ''}
                  `}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                        ${config.color}
                      `}>
                        {item.itemNumber}
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{item.question}</p>
                        {item.observations && !isExpanded && !isEditing && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {item.observations}
                          </p>
                        )}
                      </div>

                      {isEditing ? (
                        <Select
                          value={item.checklistStatus}
                          onValueChange={(value) => updateItem(item.id, 'checklistStatus', value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sim">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Conforme
                              </div>
                            </SelectItem>
                            <SelectItem value="nao">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                Não Conforme
                              </div>
                            </SelectItem>
                            <SelectItem value="parcial">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                Parcial
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`${config.color} text-white gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2 ml-2">
                        <SmartDPOButton
                          context={{
                            module: 'Due Diligence',
                            page: 'Checklist do Contrato',
                            entityType: 'checklist_item',
                            entityId: item.id || 0,
                            entityName: `Item ${item.itemNumber}`,
                            deepLink: `${window.location.pathname}#checklist-${item.id}`,
                            snapshot: {
                              itemNumber: item.itemNumber,
                              question: item.question,
                              checklistStatus: item.checklistStatus,
                              observations: item.observations,
                            },
                          }}
                          variant="ghost"
                          size="sm"
                          iconOnly
                        />
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0 space-y-4 border-t border-slate-100">
                    {/* Observações */}
                    <div className="mt-4">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Observações
                      </label>
                      {isEditing ? (
                        <Textarea
                          value={item.observations || ''}
                          onChange={(e) => updateItem(item.id, 'observations', e.target.value)}
                          placeholder="Adicione observações sobre este item..."
                          className="min-h-[80px] resize-none"
                        />
                      ) : (
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                          {item.observations || 'Nenhuma observação registrada.'}
                        </p>
                      )}
                    </div>

                    {/* Trecho do Contrato */}
                    {(item.contractExcerpt || isEditing) && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Trecho do Contrato
                        </label>
                        {isEditing ? (
                          <Textarea
                            value={item.contractExcerpt || ''}
                            onChange={(e) => updateItem(item.id, 'contractExcerpt', e.target.value)}
                            placeholder="Cole o trecho relevante do contrato..."
                            className="min-h-[100px] resize-none font-mono text-sm"
                          />
                        ) : item.contractExcerpt ? (
                          <div className="text-sm text-slate-600 bg-amber-50 p-3 rounded-lg border-l-4 border-amber-400 font-mono">
                            "{item.contractExcerpt}"
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {editedItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum item de checklist encontrado.</p>
            <p className="text-sm">Execute a análise do contrato para gerar o checklist.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
