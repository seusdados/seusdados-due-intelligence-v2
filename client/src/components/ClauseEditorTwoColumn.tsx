/**
 * Componente: Editor de Cláusulas em Duas Colunas
 * 
 * Coluna 1 (Sugestão IA): Área de edição com refinamento, aceite, recusa e ocultação
 * Coluna 2 (Versão Final): Visualização síncrona premium com opções de formato e exportação
 */

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Check,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  MessageSquare,
  Download,
  Copy,
  Share2,
  FileText,
  FileType,
  Edit,
  Loader2,
  Shield,
  Building2,
  Calendar,
  ChevronDown,
  CheckCircle,
  XCircle,
  History,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

// Tipos de formato de documento
type DocumentFormat = 'dpa' | 'aditivo' | 'capitulo_lgpd';

// Interface para cláusula
interface Clause {
  id: string;
  dbId?: number;
  titulo: string;
  conteudo: string;
  bloco?: string;
  version?: number;
}

// Interface para partes do contrato
interface ContractParty {
  name: string;
  cnpj?: string;
  role: string;
}

// Props do componente
interface ClauseEditorTwoColumnProps {
  clause: Clause;
  index: number;
  isAccepted: boolean;
  isHidden: boolean;
  parties: ContractParty[];
  contractTitle: string;
  analysisDate: string;
  onAcceptChange: (clauseId: string, accepted: boolean) => void;
  onHiddenChange: (clauseId: string, hidden: boolean) => void;
  onRefine: (clauseId: string, instruction: string) => void;
  onSaveFinal: (clauseId: string, content: string, options: SaveOptions) => void;
  onDownload: (clause: Clause, format: 'txt' | 'pdf' | 'docx', premium: boolean) => void;
  onCopy: (content: string) => void;
  onShare: (clause: Clause) => void;
  isRefining?: boolean;
  isSaving?: boolean;
  finalContent?: string;
}

interface SaveOptions {
  includeHeader: boolean;
  includeContractRef: boolean;
  documentFormat: DocumentFormat;
}

// Componente de visualização premium do documento
function PremiumDocumentPreview({
  clause,
  parties,
  contractTitle,
  analysisDate,
  documentFormat,
  includeParties,
  finalContent,
}: {
  clause: Clause;
  parties: ContractParty[];
  contractTitle: string;
  analysisDate: string;
  documentFormat: DocumentFormat;
  includeParties: boolean;
  finalContent: string;
}) {
  const controlador = parties.find(p => p.role === "Controlador" || p.role === "Controladora");
  const operador = parties.find(p => p.role === "Operador" || p.role === "Operadora");

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getDocumentTitle = () => {
    switch (documentFormat) {
      case 'dpa':
        return 'Acordo para Processamento de Dados Pessoais (DPA)';
      case 'aditivo':
        return 'Aditivo Contratual - Proteção de Dados';
      case 'capitulo_lgpd':
      default:
        return 'Capítulo LGPD Consolidado';
    }
  };

  const getDocumentSubtitle = () => {
    switch (documentFormat) {
      case 'dpa':
        return 'Data Processing Agreement';
      case 'aditivo':
        return 'Termo Aditivo ao Contrato Principal';
      case 'capitulo_lgpd':
      default:
        return 'Capítulo dedicado à Proteção de Dados Pessoais';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {/* Cabeçalho Premium do Documento */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur">
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium tracking-wide">
              {getDocumentTitle()}
            </h3>
            <p className="text-[10px] text-slate-400 font-light">
              {getDocumentSubtitle()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(analysisDate)}
          </span>
          <span>v{clause.version || 1}.0</span>
        </div>
      </div>

      {/* Identificação das Partes (condicional) */}
      {includeParties && (controlador || operador) && (
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">Identificação das Partes</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {controlador && (
              <div className="text-xs">
                <p className="text-slate-500 mb-1">Controlador</p>
                <p className="font-medium text-slate-800">{controlador.name}</p>
                {controlador.cnpj && (
                  <p className="text-slate-500 text-[10px]">CNPJ: {controlador.cnpj}</p>
                )}
              </div>
            )}
            {operador && (
              <div className="text-xs">
                <p className="text-slate-500 mb-1">Operador</p>
                <p className="font-medium text-slate-800">{operador.name}</p>
                {operador.cnpj && (
                  <p className="text-slate-500 text-[10px]">CNPJ: {operador.cnpj}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Cláusula */}
      <div className="p-4">
        <div className="mb-3">
          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
            Cláusula {clause.bloco || (typeof clause.id === 'string' && clause.id.includes('-') ? clause.id.split('-')[1] : '')}
          </Badge>
          <h4 className="text-sm font-semibold text-slate-900 mt-2">
            {clause.titulo}
          </h4>
        </div>
        <Separator className="my-3" />
        <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 text-sm leading-relaxed">
          <Streamdown>{finalContent || clause.conteudo}</Streamdown>
        </div>
      </div>

      {/* Rodapé */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-400">
          Documento gerado pela plataforma Seusdados Due Diligence
        </p>
      </div>
    </div>
  );
}

// Componente Principal
export function ClauseEditorTwoColumn({
  clause,
  index,
  isAccepted,
  isHidden,
  parties,
  contractTitle,
  analysisDate,
  onAcceptChange,
  onHiddenChange,
  onRefine,
  onSaveFinal,
  onDownload,
  onCopy,
  onShare,
  isRefining = false,
  isSaving = false,
  finalContent: externalFinalContent,
}: ClauseEditorTwoColumnProps) {
  // Estados locais
  const [refinementInstruction, setRefinementInstruction] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [localFinalContent, setLocalFinalContent] = useState(clause.conteudo);
  const [documentFormat, setDocumentFormat] = useState<DocumentFormat>('aditivo');
  const [includeParties, setIncludeParties] = useState(true);
  const [includeContractRef, setIncludeContractRef] = useState(true);

  // Sincronizar conteúdo final externo
  useEffect(() => {
    if (externalFinalContent) {
      setLocalFinalContent(externalFinalContent);
    }
  }, [externalFinalContent]);

  // Sincronizar com conteúdo da cláusula
  useEffect(() => {
    if (!externalFinalContent) {
      setLocalFinalContent(clause.conteudo);
    }
  }, [clause.conteudo, externalFinalContent]);

  const handleRefine = () => {
    if (refinementInstruction.trim()) {
      onRefine(clause.id, refinementInstruction);
      setRefinementInstruction("");
    }
  };

  const handleSave = () => {
    onSaveFinal(clause.id, localFinalContent, {
      includeHeader: includeParties,
      includeContractRef,
      documentFormat,
    });
    setIsEditing(false);
  };

  const handleCopy = () => {
    onCopy(localFinalContent);
    toast.success("Cláusula copiada para a área de transferência!");
  };

  const getFormatLabel = (format: DocumentFormat) => {
    switch (format) {
      case 'dpa': return 'DPA';
      case 'aditivo': return 'Aditivo Contratual';
      case 'capitulo_lgpd': return 'Capítulo LGPD';
    }
  };

  if (isHidden) {
    return (
      <Card className="border border-slate-200 bg-slate-50/50 opacity-60">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-slate-500">
                Cláusula {index + 1}
              </Badge>
              <span className="text-sm text-slate-500 line-through">{clause.titulo}</span>
              <Badge variant="secondary" className="text-xs">
                <EyeOff className="w-3 h-3 mr-1" />
                Oculta
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onHiddenChange(clause.id, false)}
              className="text-slate-500 hover:text-slate-700"
            >
              <Eye className="w-4 h-4 mr-1" />
              Mostrar
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`border transition-all ${
      isAccepted ? 'border-green-300 bg-green-50/20' : 'border-slate-200'
    }`}>
      {/* Cabeçalho da Cláusula */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onAcceptChange(clause.id, !isAccepted)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isAccepted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-slate-300 hover:border-green-400'
                    }`}
                  >
                    {isAccepted && <Check className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAccepted ? 'Cláusula aceita' : 'Clique para aceitar'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div>
              <Badge className="bg-blue-100 text-blue-800 mb-1">
                Cláusula {index + 1}
              </Badge>
              <CardTitle className="text-base font-medium">{clause.titulo}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-slate-700"
                    onClick={() => onHiddenChange(clause.id, true)}
                  >
                    <EyeOff className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ocultar cláusula</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-slate-700"
                    onClick={handleCopy}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copiar cláusula</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Grid de Duas Colunas */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* COLUNA 1: Sugestão IA com Refinamento */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                Sugestão IA
              </Badge>
            </div>
            
            {/* Conteúdo da Sugestão */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 max-h-[350px] overflow-y-auto">
              <Streamdown>{clause.conteudo}</Streamdown>
            </div>

            {/* Área de Refinamento com IA */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <label className="text-xs font-medium text-amber-700">Refinar com IA</label>
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Instruções para refinar... Ex: Adicionar prazo de 72h"
                  value={refinementInstruction}
                  onChange={(e) => setRefinementInstruction(e.target.value)}
                  rows={2}
                  className="flex-1 text-sm border-amber-200 bg-white"
                />
                <Button
                  onClick={handleRefine}
                  disabled={!refinementInstruction.trim() || isRefining}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 self-end"
                >
                  {isRefining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => onAcceptChange(clause.id, true)}
                disabled={isAccepted}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Aceitar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => onAcceptChange(clause.id, false)}
                disabled={!isAccepted}
              >
                <XCircle className="w-3 h-3 mr-1" />
                Recusar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => onHiddenChange(clause.id, true)}
              >
                <EyeOff className="w-3 h-3 mr-1" />
                Ocultar
              </Button>
            </div>
          </div>

          {/* COLUNA 2: Versão Final Premium */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                Versão Final
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-slate-500"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-3 h-3 mr-1" />
                {isEditing ? 'Cancelar' : 'Editar'}
              </Button>
            </div>

            {/* Controles de Formato */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {/* Seletor de Formato */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Formato:</Label>
                <Select value={documentFormat} onValueChange={(v) => setDocumentFormat(v as DocumentFormat)}>
                  <SelectTrigger className="h-7 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aditivo">Aditamento Contratual</SelectItem>
                    <SelectItem value="dpa">Acordo de Tratamento de Dados (DPA)</SelectItem>
                    <SelectItem value="capitulo_lgpd">Capítulo LGPD Consolidado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Identificação das Partes */}
              <div className="flex items-center gap-2">
                <Switch
                  id={`parties-${clause.id}`}
                  checked={includeParties}
                  onCheckedChange={setIncludeParties}
                  className="scale-75"
                />
                <Label htmlFor={`parties-${clause.id}`} className="text-xs text-slate-600 cursor-pointer">
                  Identificação das Partes
                </Label>
              </div>
            </div>

            {/* Área de Edição ou Visualização Premium */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={localFinalContent}
                  onChange={(e) => setLocalFinalContent(e.target.value)}
                  rows={12}
                  className="bg-white border-green-200 text-sm font-mono"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLocalFinalContent(clause.conteudo);
                      setIsEditing(false);
                    }}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <PremiumDocumentPreview
                  clause={clause}
                  parties={parties}
                  contractTitle={contractTitle}
                  analysisDate={analysisDate}
                  documentFormat={documentFormat}
                  includeParties={includeParties}
                  finalContent={localFinalContent}
                />
              </ScrollArea>
            )}

            {/* Botões de Exportação */}
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {/* Compartilhar */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-violet-200 text-violet-600 hover:bg-violet-50"
                onClick={() => onShare(clause)}
              >
                <Share2 className="w-3 h-3 mr-1" />
                Compartilhar
              </Button>

              {/* Download TXT */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-200 text-slate-600 hover:bg-slate-100"
                onClick={() => onDownload(clause, 'txt', false)}
              >
                <FileType className="w-3 h-3 mr-1" />
                TXT
              </Button>

              {/* Download PDF com opções */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    PDF
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDownload(clause, 'pdf', true)}>
                    <Shield className="w-4 h-4 mr-2 text-emerald-600" />
                    Versão Premium (Formatada)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDownload(clause, 'pdf', false)}>
                    <FileType className="w-4 h-4 mr-2 text-slate-600" />
                    Apenas Texto
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Download DOCX com opções */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    DOCX
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDownload(clause, 'docx', true)}>
                    <Shield className="w-4 h-4 mr-2 text-emerald-600" />
                    Versão Premium (Formatada)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDownload(clause, 'docx', false)}>
                    <FileType className="w-4 h-4 mr-2 text-slate-600" />
                    Apenas Texto
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ClauseEditorTwoColumn;
