/**
 * Visualizador de Rastreabilidade de Evidências (Termo 1)
 * ========================================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | seusdados.com
 * Responsabilidade técnica: Marcelo Fattori
 *
 * Exibe de forma visual e interativa:
 * - De onde veio cada conclusão da análise (SearchTrace)
 * - Trechos do contrato que fundamentam cada campo
 * - Nível de confiança da extração
 * - Referência legal aplicável
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Search, BookOpen, Scale, ChevronDown, ChevronUp,
  FileText, Hash, MapPin, AlertTriangle, CheckCircle,
  Info, Eye, EyeOff
} from "lucide-react";

// ==================== TIPOS ====================

interface SearchTraceData {
  fieldName: string;
  excerpt: string;
  clauseRef: string | null;
  sourceChunkId: string | null;
  confidence: number;
  reasoning: string | null;
  legalBasis: string | null;
}

interface ChunkData {
  chunkId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  paragraphIndex: number;
  matchedKeywords: string[];
  region: string;
}

interface DocumentMetaData {
  originalLength: number;
  reducedLength: number;
  chunksTotal: number;
  chunksSelected: number;
  reductionRatio: number;
}

interface EvidenceTraceViewerProps {
  /** Rastros de busca */
  traces: SearchTraceData[];
  /** Chunks auditáveis */
  chunks: ChunkData[];
  /** Metadados do documento */
  documentMeta: DocumentMetaData | null;
  /** Se é consultor (pode ver detalhes técnicos) */
  isConsultant: boolean;
  /** Se está carregando */
  isLoading?: boolean;
}

// ==================== CONSTANTES ====================

const FIELD_LABELS: Record<string, string> = {
  partnerName: "Nome do Parceiro",
  contractType: "Tipo de Contrato",
  contractingParty: "Parte Contratante",
  contractedParty: "Parte Contratada",
  agentType: "Papel na Proteção de Dados",
  agentTypeJustification: "Justificativa do Papel",
  contractObject: "Objeto do Contrato",
  startDate: "Data de Início",
  endDate: "Data de Término",
  commonData: "Dados Pessoais Comuns",
  sensitiveData: "Dados Sensíveis",
  hasElderlyData: "Dados de Idosos",
  hasMinorData: "Dados de Menores",
  titularRightsStatus: "Direitos dos Titulares",
  dataEliminationStatus: "Eliminação de Dados",
  legalRisks: "Riscos Legais",
  securityRisks: "Riscos de Segurança",
  hasProtectionClause: "Cláusula de Proteção",
  protectionClauseDetails: "Detalhes da Proteção",
  suggestedClause: "Cláusula Sugerida",
  actionStatus: "Situação Geral",
  actionPlan: "Plano de Ação",
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "text-green-600";
  if (confidence >= 60) return "text-yellow-600";
  if (confidence >= 40) return "text-orange-600";
  return "text-red-600";
}

function getConfidenceBg(confidence: number): string {
  if (confidence >= 80) return "bg-green-50 border-green-200";
  if (confidence >= 60) return "bg-yellow-50 border-yellow-200";
  if (confidence >= 40) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return "Alta";
  if (confidence >= 60) return "Moderada";
  if (confidence >= 40) return "Baixa";
  return "Muito Baixa";
}

// ==================== COMPONENTES AUXILIARES ====================

function TraceCard({ trace, chunk, isConsultant }: {
  trace: SearchTraceData;
  chunk: ChunkData | null;
  isConsultant: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const fieldLabel = FIELD_LABELS[trace.fieldName] || trace.fieldName;

  return (
    <div className={`rounded-xl border ${getConfidenceBg(trace.confidence)} overflow-hidden`}>
      <div
        className="p-4 cursor-pointer flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="pt-0.5">
          <Search className={`w-4 h-4 ${getConfidenceColor(trace.confidence)}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-slate-900">{fieldLabel}</span>
            <Badge variant="outline" className={`text-xs ${getConfidenceColor(trace.confidence)} border-current`}>
              {trace.confidence}% - {getConfidenceLabel(trace.confidence)}
            </Badge>
            {trace.clauseRef && (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                <MapPin className="w-3 h-3 mr-1" />
                {trace.clauseRef}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-700 font-light line-clamp-2">
            "{trace.excerpt}"
          </p>
        </div>
        <div className="pt-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-current/10 bg-white/50 p-4 space-y-3">
          {/* Trecho completo */}
          <div className="flex gap-3">
            <BookOpen className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Trecho extraído do contrato</p>
              <div className="bg-white rounded-lg p-3 border border-slate-200 text-sm text-slate-700 font-light italic">
                "{trace.excerpt}"
              </div>
            </div>
          </div>

          {/* Referência legal */}
          {trace.legalBasis && (
            <div className="flex gap-3">
              <Scale className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Base legal</p>
                <p className="text-sm text-slate-700 font-light">{trace.legalBasis}</p>
              </div>
            </div>
          )}

          {/* Raciocínio da IA */}
          {trace.reasoning && (
            <div className="flex gap-3">
              <Info className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Raciocínio</p>
                <p className="text-sm text-slate-700 font-light">{trace.reasoning}</p>
              </div>
            </div>
          )}

          {/* Informações do chunk (apenas para consultores) */}
          {isConsultant && chunk && (
            <div className="flex gap-3">
              <Hash className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Rastreabilidade técnica</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 font-light">
                  <div>Trecho: {chunk.chunkId}</div>
                  <div>Região: {chunk.region}</div>
                  <div>Parágrafo: {chunk.paragraphIndex + 1}</div>
                  <div>Posição: {chunk.startOffset}-{chunk.endOffset}</div>
                </div>
                {chunk.matchedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {chunk.matchedKeywords.map((kw, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] text-slate-400 border-slate-300">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Barra de confiança */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">Confiança da extração</span>
              <span className={`text-xs font-medium ${getConfidenceColor(trace.confidence)}`}>
                {trace.confidence}%
              </span>
            </div>
            <Progress value={trace.confidence} className="h-1.5" />
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

export function EvidenceTraceViewer({
  traces,
  chunks,
  documentMeta,
  isConsultant,
  isLoading,
}: EvidenceTraceViewerProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [filterConfidence, setFilterConfidence] = useState<"all" | "high" | "medium" | "low">("all");

  // Mapear chunks por ID
  const chunkMap = new Map(chunks.map(c => [c.chunkId, c]));

  // Filtrar traces
  const filteredTraces = traces.filter(t => {
    if (filterConfidence === "all") return true;
    if (filterConfidence === "high") return t.confidence >= 80;
    if (filterConfidence === "medium") return t.confidence >= 60 && t.confidence < 80;
    return t.confidence < 60;
  });

  // Estatísticas
  const avgConfidence = traces.length > 0
    ? Math.round(traces.reduce((sum, t) => sum + t.confidence, 0) / traces.length)
    : 0;
  const highConfCount = traces.filter(t => t.confidence >= 80).length;
  const lowConfCount = traces.filter(t => t.confidence < 60).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-light">Carregando evidências...</p>
        </div>
      </div>
    );
  }

  if (traces.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-light text-slate-900 mb-2">Sem evidências disponíveis</h3>
          <p className="text-sm text-slate-500 font-light">
            As evidências de rastreabilidade serão exibidas após a conclusão da análise.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com estatísticas */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-1">Rastreabilidade da Análise</h3>
              <p className="text-xs text-slate-500 font-light">
                Cada conclusão é fundamentada em trechos reais do contrato
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xl font-extralight text-indigo-600">{traces.length}</p>
                <p className="text-xs text-slate-500">Evidências</p>
              </div>
              <div className="text-center">
                <p className={`text-xl font-extralight ${getConfidenceColor(avgConfidence)}`}>{avgConfidence}%</p>
                <p className="text-xs text-slate-500">Confiança média</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-extralight text-green-600">{highConfCount}</p>
                <p className="text-xs text-slate-500">Alta confiança</p>
              </div>
              {lowConfCount > 0 && (
                <div className="text-center">
                  <p className="text-xl font-extralight text-red-600">{lowConfCount}</p>
                  <p className="text-xs text-slate-500">Baixa confiança</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadados do documento (apenas consultores) */}
      {isConsultant && documentMeta && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTechnical(!showTechnical)}
            className="text-xs"
          >
            {showTechnical ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
            {showTechnical ? "Ocultar detalhes técnicos" : "Ver detalhes técnicos"}
          </Button>
        </div>
      )}

      {showTechnical && documentMeta && (
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-lg font-extralight text-slate-700">{documentMeta.originalLength.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Caracteres originais</p>
              </div>
              <div>
                <p className="text-lg font-extralight text-slate-700">{documentMeta.reducedLength.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Caracteres analisados</p>
              </div>
              <div>
                <p className="text-lg font-extralight text-slate-700">{documentMeta.chunksTotal}</p>
                <p className="text-xs text-slate-500">Trechos totais</p>
              </div>
              <div>
                <p className="text-lg font-extralight text-slate-700">{documentMeta.chunksSelected}</p>
                <p className="text-xs text-slate-500">Trechos selecionados</p>
              </div>
              <div>
                <p className="text-lg font-extralight text-slate-700">{Math.round(documentMeta.reductionRatio * 100)}%</p>
                <p className="text-xs text-slate-500">Taxa de redução</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-500 font-light">Filtrar:</span>
        {[
          { key: "all", label: "Todas", count: traces.length },
          { key: "high", label: "Alta confiança", count: highConfCount },
          { key: "medium", label: "Moderada", count: traces.filter(t => t.confidence >= 60 && t.confidence < 80).length },
          { key: "low", label: "Baixa confiança", count: lowConfCount },
        ].map(f => (
          <Button
            key={f.key}
            variant={filterConfidence === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterConfidence(f.key as any)}
            className={`text-xs ${filterConfidence === f.key ? "bg-purple-600 hover:bg-purple-700" : ""}`}
          >
            {f.label} ({f.count})
          </Button>
        ))}
      </div>

      {/* Lista de evidências */}
      <div className="space-y-3">
        {filteredTraces.map((trace, idx) => (
          <TraceCard
            key={`${trace.fieldName}-${idx}`}
            trace={trace}
            chunk={trace.sourceChunkId ? chunkMap.get(trace.sourceChunkId) || null : null}
            isConsultant={isConsultant}
          />
        ))}
      </div>

      {/* Rodapé */}
      <div className="text-xs text-slate-400 text-center pt-4 border-t">
        Rastreabilidade gerada automaticamente pelo motor de análise Seusdados | Seusdados Consultoria em Gestão de Dados Limitada
      </div>
    </div>
  );
}

export default EvidenceTraceViewer;
