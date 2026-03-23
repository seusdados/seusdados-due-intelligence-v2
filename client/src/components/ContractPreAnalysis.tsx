import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Users,
  Scale,
  Lock,
  ChevronDown,
  ChevronUp,
  Edit3,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractPreAnalysisProps {
  contractText: string;
  ticketContext?: {
    title?: string;
    description?: string;
    ticketType?: string;
  };
  onAnalysisComplete?: (analysis: any, validations: any) => void;
  onSkip?: () => void;
}

export default function ContractPreAnalysis({
  contractText,
  ticketContext,
  onAnalysisComplete,
  onSkip
}: ContractPreAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary', 'data', 'risks']);
  const [validations, setValidations] = useState({
    contractTypeValidated: false,
    partiesValidated: false,
    dataCategoriesValidated: false,
    legalBasisValidated: false,
    userNotes: ''
  });

  const preAnalyzeMutation = trpc.tickets.preAnalyzeContract.useMutation({
    onSuccess: (data) => {
      setAnalysis(data);
      setIsAnalyzing(false);
      toast.success("Pré-análise concluída!");
    },
    onError: (error) => {
      setIsAnalyzing(false);
      toast.error("Erro na pré-análise: " + error.message);
    }
  });

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    preAnalyzeMutation.mutate({
      contractText,
      ticketContext
    });
  }, [contractText, ticketContext, preAnalyzeMutation]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleConfirm = () => {
    if (onAnalysisComplete && analysis) {
      onAnalysisComplete(analysis, validations);
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'critico': return 'bg-red-100 text-red-700 border-red-200';
      case 'alto': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medio': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'baixo': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Estado inicial - botão para iniciar análise
  if (!analysis && !isAnalyzing) {
    return (
      <Card className="border-2 border-dashed border-purple-200 bg-purple-50/50">
        <CardContent className="p-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-purple-500" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">
            Contrato Detectado
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Identificamos que você anexou um contrato. Deseja realizar uma pré-análise 
            automática para identificar dados pessoais, base legal e riscos LGPD?
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={onSkip}
            >
              Pular
            </Button>
            <Button
              onClick={handleAnalyze}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4" />
              Analisar Contrato
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado de análise em andamento
  if (isAnalyzing) {
    return (
      <Card className="border-2 border-purple-200 bg-purple-50/50">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">
            Analisando Contrato...
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Identificando dados pessoais, base legal e riscos LGPD
          </p>
          <Progress value={66} className="w-64 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  // Estado com análise concluída
  return (
    <div className="space-y-4">
      {/* Header com score de confiança */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Pré-Análise de Contrato
                </h3>
                <p className="text-sm text-slate-600">
                  {analysis.contractType}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Confiança</div>
              <div className="text-lg font-bold text-purple-600">
                {analysis.confidenceScore}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção: Resumo */}
      <Card>
        <CardHeader 
          className="cursor-pointer py-3"
          onClick={() => toggleSection('summary')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              Resumo do Contrato
            </CardTitle>
            {expandedSections.includes('summary') ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('summary') && (
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 uppercase">Contratante</label>
                <p className="font-medium">{analysis.contractParties.contratante}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase">Contratada</label>
                <p className="font-medium">{analysis.contractParties.contratada}</p>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase">Objeto</label>
              <p className="text-sm text-slate-700">{analysis.objectSummary}</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="partiesValidated"
                checked={validations.partiesValidated}
                onCheckedChange={(checked) => 
                  setValidations(prev => ({ ...prev, partiesValidated: !!checked }))
                }
              />
              <label htmlFor="partiesValidated" className="text-sm text-slate-600">
                Confirmo que as partes e objeto estão corretos
              </label>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Seção: Dados Pessoais */}
      <Card>
        <CardHeader 
          className="cursor-pointer py-3"
          onClick={() => toggleSection('data')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Dados Pessoais Identificados
              <Badge variant="secondary" className="ml-2">
                {analysis.personalDataCategories.length}
              </Badge>
            </CardTitle>
            {expandedSections.includes('data') ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('data') && (
          <CardContent className="pt-0 space-y-4">
            <div className="flex flex-wrap gap-2">
              {analysis.personalDataCategories.map((cat: any, i: number) => (
                <Badge
                  key={i}
                  variant="outline"
                  className={cn(
                    cat.sensitive 
                      ? "bg-red-50 text-red-700 border-red-200" 
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  )}
                >
                  {cat.category}
                  {cat.sensitive && " (Sensível)"}
                </Badge>
              ))}
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase">Titulares</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {analysis.dataSubjects.map((subject: string, i: number) => (
                  <Badge key={i} variant="secondary">{subject}</Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="dataCategoriesValidated"
                checked={validations.dataCategoriesValidated}
                onCheckedChange={(checked) => 
                  setValidations(prev => ({ ...prev, dataCategoriesValidated: !!checked }))
                }
              />
              <label htmlFor="dataCategoriesValidated" className="text-sm text-slate-600">
                Confirmo as categorias de dados identificadas
              </label>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Seção: Base Legal */}
      <Card>
        <CardHeader 
          className="cursor-pointer py-3"
          onClick={() => toggleSection('legal')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4 text-emerald-500" />
              Base Legal Sugerida
            </CardTitle>
            {expandedSections.includes('legal') ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('legal') && (
          <CardContent className="pt-0 space-y-4">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="font-medium text-emerald-800">{analysis.suggestedLegalBasis}</p>
              <p className="text-sm text-emerald-600 mt-1">{analysis.legalBasisJustification}</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="legalBasisValidated"
                checked={validations.legalBasisValidated}
                onCheckedChange={(checked) => 
                  setValidations(prev => ({ ...prev, legalBasisValidated: !!checked }))
                }
              />
              <label htmlFor="legalBasisValidated" className="text-sm text-slate-600">
                Confirmo a base legal sugerida
              </label>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Seção: Riscos */}
      <Card>
        <CardHeader 
          className="cursor-pointer py-3"
          onClick={() => toggleSection('risks')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Riscos Preliminares
              <Badge variant="secondary" className="ml-2">
                {analysis.preliminaryRisks.length}
              </Badge>
            </CardTitle>
            {expandedSections.includes('risks') ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('risks') && (
          <CardContent className="pt-0 space-y-3">
            {analysis.preliminaryRisks.map((risk: any, i: number) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-start gap-2">
                  <Badge className={cn("text-xs", getRiskBadgeColor(risk.level))}>
                    {risk.level.toUpperCase()}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{risk.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{risk.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Seção: Cláusulas LGPD */}
      <Card>
        <CardHeader 
          className="cursor-pointer py-3"
          onClick={() => toggleSection('clauses')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-500" />
              Cláusulas LGPD
            </CardTitle>
            {expandedSections.includes('clauses') ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('clauses') && (
          <CardContent className="pt-0 space-y-2">
            {analysis.lgpdClauses.map((clause: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                {clause.present ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{clause.type}</p>
                  {!clause.present && clause.recommendation && (
                    <p className="text-xs text-amber-600">{clause.recommendation}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Notas do usuário */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-slate-500" />
            Observações Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            value={validations.userNotes}
            onChange={(e) => setValidations(prev => ({ ...prev, userNotes: e.target.value }))}
            placeholder="Adicione observações, correções ou informações complementares..."
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onSkip}>
          Ignorar Análise
        </Button>
        <Button onClick={handleConfirm} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Confirmar e Continuar
        </Button>
      </div>
    </div>
  );
}
