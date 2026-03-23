/**
 * ContractMapEditor - Componente para edição inline do Mapa de Análise de Contratos
 * Permite editar todos os 29 campos do mapa com salvamento automático
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Pencil, Save, X, ChevronDown, ChevronRight, 
  Building2, FileText, Users, Shield, Calendar,
  Database, AlertTriangle, Scale, CheckCircle, Loader2
} from "lucide-react";

interface ContractMap {
  id: number;
  analysisId: number;
  partnerName: string | null;
  contractType: string | null;
  contractingParty: string | null;
  contractedParty: string | null;
  agentType: string | null;
  lgpdAgentType: string | null;
  agentTypeJustification: string | null;
  contractObject: string | null;
  startDate: string | null;
  endDate: string | null;
  commonData: string | null;
  commonDataLargeScale: number | null;
  sensitiveData: string | null;
  sensitiveDataLargeScale: number | null;
  hasElderlyData: number | null;
  elderlyDataDetails: string | null;
  hasMinorData: number | null;
  minorDataDetails: string | null;
  titularRightsStatus: string | null;
  titularRightsDetails: string | null;
  dataEliminationStatus: string | null;
  dataEliminationDetails: string | null;
  legalRisks: string | null;
  securityRisks: string | null;
  hasProtectionClause: string | null;
  protectionClauseDetails: string | null;
  suggestedClause: string | null;
  actionStatus: string | null;
  actionPlan: string | null;
  suggestedDeadline: string | null;
}

interface ContractMapEditorProps {
  map: ContractMap | null;
  analysisId: number;
  isConsultant: boolean;
  onUpdate?: () => void;
}

export function ContractMapEditor({ map, analysisId, isConsultant, onUpdate }: ContractMapEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMap, setEditedMap] = useState<Partial<ContractMap>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identification: true,
    dataProcessing: true,
    roles: true,
    vulnerable: false,
    rights: false,
    risks: false,
    protection: false,
    action: false
  });

  const updateMapMutation = trpc.contractAnalysis.updateMap.useMutation({
    onSuccess: () => {
      toast.success("Mapa de análise atualizado com sucesso!");
      setIsEditing(false);
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  useEffect(() => {
    if (map) {
      setEditedMap(map);
    }
  }, [map]);

  const handleSave = () => {
    // Remover campos undefined/null para evitar erro de tipo
    const cleanedMap: Record<string, any> = { analysisId };
    Object.entries(editedMap).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'id') {
        cleanedMap[key] = value;
      }
    });
    updateMapMutation.mutate(cleanedMap as any);
  };

  const handleCancel = () => {
    setEditedMap(map || {});
    setIsEditing(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateField = (field: string, value: any) => {
    setEditedMap(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!map) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-16 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground font-light text-lg">Mapa de análise não disponível</p>
        </CardContent>
      </Card>
    );
  }

  const renderField = (label: string, field: keyof ContractMap, type: 'text' | 'textarea' | 'select' | 'boolean' = 'text', options?: string[]) => {
    const value = isEditing ? (editedMap[field] ?? '') : (map[field] ?? '');
    
    if (isEditing) {
      if (type === 'textarea') {
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
            <Textarea
              value={String(value)}
              onChange={(e) => updateField(field, e.target.value)}
              className="min-h-[100px] font-light"
              placeholder={`Informe ${label.toLowerCase()}`}
            />
          </div>
        );
      }
      if (type === 'select' && options) {
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
            <Select value={String(value)} onValueChange={(v) => updateField(field, v)}>
              <SelectTrigger>
                <SelectValue placeholder={`Selecione ${label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }
      if (type === 'boolean') {
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
            <Select value={value ? '1' : '0'} onValueChange={(v) => updateField(field, v === '1' ? 1 : 0)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Sim</SelectItem>
                <SelectItem value="0">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
          <Input
            value={String(value)}
            onChange={(e) => updateField(field, e.target.value)}
            className="font-light"
            placeholder={`Informe ${label.toLowerCase()}`}
          />
        </div>
      );
    }

    // Modo visualização
    return (
      <div className="p-4 rounded-lg bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className="font-light text-foreground whitespace-pre-wrap">
          {value || <span className="text-muted-foreground italic">Não informado</span>}
        </p>
      </div>
    );
  };

  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    section, 
    color 
  }: { 
    title: string; 
    icon: any; 
    section: string; 
    color: string;
  }) => (
    <CollapsibleTrigger 
      className="w-full"
      onClick={() => toggleSection(section)}
    >
      <div className={`flex items-center justify-between p-4 rounded-lg bg-gradient-to-r ${color} hover:opacity-90 transition-opacity cursor-pointer`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/20">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="font-medium text-white">{title}</span>
        </div>
        {expandedSections[section] ? (
          <ChevronDown className="w-5 h-5 text-white" />
        ) : (
          <ChevronRight className="w-5 h-5 text-white" />
        )}
      </div>
    </CollapsibleTrigger>
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-light">Mapa de Análise Contratual</CardTitle>
              <CardDescription className="font-light">29 campos de análise LGPD</CardDescription>
            </div>
          </div>
          
          {isConsultant && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={updateMapMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMapMutation.isPending}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    {updateMapMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Salvar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4">
        {/* Seção 1: Identificação do Contrato */}
        <Collapsible open={expandedSections.identification}>
          <SectionHeader 
            title="1. Identificação do Contrato" 
            icon={Building2} 
            section="identification"
            color="from-blue-500 to-indigo-600"
          />
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {renderField("Nome do Parceiro", "partnerName")}
              {renderField("Tipo de Contrato", "contractType")}
              {renderField("Parte Contratante", "contractingParty")}
              {renderField("Parte Contratada", "contractedParty")}
              {renderField("Objeto do Contrato", "contractObject", "textarea")}
              {renderField("Data de Início", "startDate")}
              {renderField("Data de Término", "endDate")}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Seção 2: Papel na LGPD */}
        <Collapsible open={expandedSections.roles}>
          <SectionHeader 
            title="2. Papel na LGPD" 
            icon={Users} 
            section="roles"
            color="from-purple-500 to-violet-600"
          />
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {renderField("Tipo de Agente LGPD", "agentType", "select", ["controlador", "operador", "controlador_conjunto", "suboperador"])}
              {renderField("Justificativa da Classificação", "agentTypeJustification", "textarea")}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Seção 3: Dados Pessoais Tratados */}
        <Collapsible open={expandedSections.dataProcessing}>
          <SectionHeader 
            title="3. Dados Pessoais Tratados" 
            icon={Database} 
            section="dataProcessing"
            color="from-cyan-500 to-teal-600"
          />
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {renderField("Dados Comuns", "commonData", "textarea")}
              {renderField("Tratamento em Larga Escala (Comuns)", "commonDataLargeScale", "boolean")}
              {renderField("Dados Sensíveis", "sensitiveData", "textarea")}
              {renderField("Tratamento em Larga Escala (Sensíveis)", "sensitiveDataLargeScale", "boolean")}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Seção 4: Titulares Vulneráveis */}
        <Collapsible open={expandedSections.vulnerable}>
          <SectionHeader 
            title="4. Titulares Vulneráveis" 
            icon={Shield} 
            section="vulnerable"
            color="from-amber-500 to-orange-600"
          />
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {renderField("Dados de Idosos", "hasElderlyData", "boolean")}
              {renderField("Detalhes - Idosos", "elderlyDataDetails", "textarea")}
              {renderField("Dados de Menores", "hasMinorData", "boolean")}
              {renderField("Detalhes - Menores", "minorDataDetails", "textarea")}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Seção 5: Direitos dos Titulares */}
        <Collapsible open={expandedSections.rights}>
          <SectionHeader 
            title="5. Direitos dos Titulares e Eliminação" 
            icon={Scale} 
            section="rights"
            color="from-green-500 to-emerald-600"
          />
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {renderField("Direitos dos Titulares", "titularRightsStatus", "select", ["sim", "nao", "parcial"])}
              {renderField("Detalhes - Direitos", "titularRightsDetails", "textarea")}
              {renderField("Eliminação de Dados", "dataEliminationStatus", "select", ["sim", "nao", "parcial"])}
              {renderField("Detalhes - Eliminação", "dataEliminationDetails", "textarea")}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Seção 6: Riscos Identificados */}
        <Collapsible open={expandedSections.risks}>
          <SectionHeader 
            title="6. Riscos Identificados" 
            icon={AlertTriangle} 
            section="risks"
            color="from-red-500 to-rose-600"
          />
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {renderField("Riscos Legais", "legalRisks", "textarea")}
              {renderField("Riscos de Segurança", "securityRisks", "textarea")}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Seção 7: Cláusulas de Proteção */}
        <Collapsible open={expandedSections.protection}>
          <SectionHeader 
            title="7. Cláusulas de Proteção" 
            icon={CheckCircle} 
            section="protection"
            color="from-indigo-500 to-purple-600"
          />
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="space-y-4">
              {renderField("Possui Cláusula de Proteção", "hasProtectionClause", "select", ["sim", "nao", "parcial"])}
              {renderField("Detalhes da Cláusula", "protectionClauseDetails", "textarea")}
              {renderField("Cláusula Sugerida / DPA", "suggestedClause", "textarea")}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Seção 8: Plano de Ação */}
        <Collapsible open={expandedSections.action}>
          <SectionHeader 
            title="8. Plano de Ação" 
            icon={Calendar} 
            section="action"
            color="from-teal-500 to-cyan-600"
          />
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {renderField("Status da Ação", "actionStatus", "select", ["adequado", "ajustar"])}
              {renderField("Prazo Sugerido", "suggestedDeadline")}
            </div>
            {renderField("Plano de Ação Detalhado", "actionPlan", "textarea")}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default ContractMapEditor;
