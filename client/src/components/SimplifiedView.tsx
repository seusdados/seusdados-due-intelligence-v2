/**
 * Visão Simplificada - Framework Seusdados (Termo 3)
 * ===================================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | www.seusdados.com
 * Responsabilidade técnica: Marcelo Fattori
 *
 * Traduz os resultados técnicos da análise contratual em linguagem
 * acessível para leigos, com:
 * - Problemas identificados (linguagem cotidiana)
 * - Soluções propostas (passos práticos)
 * - Cláusulas copiáveis (SDG - Solução Documental Guiada)
 * - Módulos F1-F9 do Framework Seusdados
 * - Navegação cruzada problema → solução → cláusula
 * - Exportação em formato carta simplificado
 */

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users, Target, Database, Shield, Share2, UserCheck,
  FileText, Clock, Building, Copy, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Info, ArrowRight, ArrowDown,
  Lightbulb, BookOpen, Scale, Download, Link2, Eye,
  ShieldCheck, Pencil, Save, X
} from "lucide-react";

// ==================== TIPOS ====================

interface FrameworkModuleData {
  code: string;
  name: string;
  layDescription: string;
  icon: string;
  analysisBlocks: number[];
}

interface ProblemData {
  problemId: string;
  frameworkModule: string;
  title: string;
  layDescription: string;
  everydayExample: string;
  severity: "critico" | "alto" | "medio" | "baixo" | "muito_baixo";
  legalRef: string;
  contractExcerpt: string | null;
  traceId: string | null;
}

interface SolutionData {
  solutionId: string;
  problemId: string;
  title: string;
  layDescription: string;
  practicalSteps: string[];
  suggestedDeadline: string;
  priority: number;
  modelClauseId: string | null;
}

interface ClauseData {
  clauseId: string;
  sequenceNumber: number;
  title: string;
  content: string;
  frameworkModule: string;
  problemId: string | null;
  necessity: "obrigatoria" | "recomendada" | "opcional";
  version: number;
  isAccepted: boolean;
}

interface RiskDecisionData {
  riskId: number;
  title: string;
  severity: string;
  decision: "aceitar" | "mitigar" | "eliminar" | null;
  notes: string | null;
  frameworkModule?: string;
}

interface SimplifiedViewProps {
  complianceScore: number | null;
  executiveSummary: string | null;
  problems: ProblemData[];
  solutions: SolutionData[];
  clauses: ClauseData[];
  checklistVersion: string | null;
  isConsultant: boolean;
  onClauseAcceptance?: (clauseId: string, accepted: boolean) => void;
  onClauseCopy?: (clauseId: string, content: string) => void;
  onDownloadAll?: () => void;
  onExportLetter?: () => void;
  isLoading?: boolean;
  isExporting?: boolean;
  /** Nome do contrato para exibição */
  contractName?: string;
  /** Nome da organização */
  organizationName?: string;
  /** Riscos para decisão */
  risks?: RiskDecisionData[];
  /** Callback para salvar decisão por risco */
  onRiskDecision?: (riskId: number, decision: "aceitar" | "mitigar" | "eliminar", notes: string) => void;
  /** Se está salvando decisão */
  isSavingDecision?: boolean;
}

// ==================== CONSTANTES ====================

const FRAMEWORK_MODULES: FrameworkModuleData[] = [
  { code: "F1", name: "Quem Faz o Quê", layDescription: "Identifica quem são as partes do contrato e qual o papel de cada uma no tratamento dos dados pessoais.", icon: "Users", analysisBlocks: [1, 14] },
  { code: "F2", name: "Para Quê Usam os Dados", layDescription: "Verifica se o contrato explica claramente para que os dados pessoais serão usados e se há permissão legal para isso.", icon: "Target", analysisBlocks: [2, 3] },
  { code: "F3", name: "Quais Dados São Tratados", layDescription: "Identifica quais dados pessoais são coletados, se há dados sensíveis (saúde, religião, etc.) e se envolvem crianças ou idosos.", icon: "Database", analysisBlocks: [4, 5] },
  { code: "F4", name: "Proteção e Segurança", layDescription: "Verifica se o contrato prevê medidas para proteger os dados contra vazamentos, ataques e acessos não autorizados.", icon: "Shield", analysisBlocks: [6, 12] },
  { code: "F5", name: "Quem Mais Tem Acesso", layDescription: "Analisa se os dados são compartilhados com terceiros, subcontratados ou enviados para outros países, e se há regras para isso.", icon: "Share2", analysisBlocks: [7, 8, 9] },
  { code: "F6", name: "Direitos das Pessoas", layDescription: "Verifica se o contrato garante que as pessoas possam acessar, corrigir ou apagar seus dados quando quiserem.", icon: "UserCheck", analysisBlocks: [11] },
  { code: "F7", name: "Registro e Documentação", layDescription: "Analisa se há obrigação de manter registros das atividades de tratamento e evidências de conformidade.", icon: "FileText", analysisBlocks: [10, 13] },
  { code: "F8", name: "Ciclo de Vida dos Dados", layDescription: "Verifica se o contrato define por quanto tempo os dados ficam guardados e como são eliminados quando não são mais necessários.", icon: "Clock", analysisBlocks: [16, 18] },
  { code: "F9", name: "Governança e Responsabilidade", layDescription: "Analisa se há políticas internas, responsável pela proteção de dados e previsão de indenização em caso de problemas.", icon: "Building", analysisBlocks: [15, 17] },
];

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; order: number }> = {
  critico: { label: "Crítico", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200", order: 0 },
  alto: { label: "Alto", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-200", order: 1 },
  medio: { label: "Médio", color: "text-yellow-700", bgColor: "bg-yellow-50", borderColor: "border-yellow-200", order: 2 },
  baixo: { label: "Baixo", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200", order: 3 },
  muito_baixo: { label: "Muito Baixo", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-200", order: 4 },
};

const NECESSITY_CONFIG: Record<string, { label: string; color: string }> = {
  obrigatoria: { label: "Obrigatória", color: "bg-red-100 text-red-800 border-red-200" },
  recomendada: { label: "Recomendada", color: "bg-amber-100 text-amber-800 border-amber-200" },
  opcional: { label: "Opcional", color: "bg-blue-100 text-blue-800 border-blue-200" },
};

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Users, Target, Database, Shield, Share2, UserCheck, FileText, Clock, Building,
};

// ==================== COMPONENTES AUXILIARES ====================

function ModuleIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = ICON_MAP[iconName] || FileText;
  return <Icon className={className} />;
}

function ScoreGauge({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { text: "text-green-600", bg: "bg-green-500", label: "Bom" };
    if (s >= 60) return { text: "text-yellow-600", bg: "bg-yellow-500", label: "Atenção" };
    if (s >= 40) return { text: "text-orange-600", bg: "bg-orange-500", label: "Preocupante" };
    return { text: "text-red-600", bg: "bg-red-500", label: "Crítico" };
  };
  const config = getScoreColor(score);

  return (
    <div className="text-center space-y-3">
      <div className="relative inline-flex items-center justify-center">
        <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center">
          <div className={`text-4xl font-extralight ${config.text}`}>{score}%</div>
        </div>
      </div>
      <div>
        <Badge className={`${config.bg} text-white border-0 text-sm px-3 py-1`}>{config.label}</Badge>
      </div>
      <p className="text-sm text-slate-500 font-light max-w-[200px] mx-auto">
        Pontuação de conformidade do contrato com a legislação de proteção de dados
      </p>
    </div>
  );
}

/** Indicador de vinculação cruzada */
function CrossLinkIndicator({ 
  hasSolution, 
  hasClause, 
  onGoToSolution, 
  onGoToClause 
}: { 
  hasSolution: boolean; 
  hasClause: boolean; 
  onGoToSolution?: () => void; 
  onGoToClause?: () => void; 
}) {
  if (!hasSolution && !hasClause) return null;
  return (
    <div className="flex items-center gap-1 mt-2">
      <Link2 className="w-3 h-3 text-slate-400" />
      <span className="text-xs text-slate-400">Vinculado a:</span>
      {hasSolution && (
        <button
          onClick={(e) => { e.stopPropagation(); onGoToSolution?.(); }}
          className="text-xs text-green-600 hover:text-green-800 hover:underline font-medium flex items-center gap-0.5"
        >
          <CheckCircle className="w-3 h-3" /> Solução
        </button>
      )}
      {hasSolution && hasClause && <span className="text-xs text-slate-300">|</span>}
      {hasClause && (
        <button
          onClick={(e) => { e.stopPropagation(); onGoToClause?.(); }}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-0.5"
        >
          <FileText className="w-3 h-3" /> Cláusula
        </button>
      )}
    </div>
  );
}

/** Card de problema com navegação cruzada */
function ProblemCard({
  problem,
  solution,
  relatedClause,
  onClauseCopy,
  solutionRef,
  clauseRef,
  problemRef,
  onNavigateToSolution,
  onNavigateToClause,
  isHighlighted,
}: {
  problem: ProblemData;
  solution: SolutionData | null;
  relatedClause: ClauseData | null;
  onClauseCopy?: (clauseId: string, content: string) => void;
  solutionRef?: React.RefObject<HTMLDivElement | null>;
  clauseRef?: React.RefObject<HTMLDivElement | null>;
  problemRef?: React.RefObject<HTMLDivElement | null>;
  onNavigateToSolution?: () => void;
  onNavigateToClause?: () => void;
  isHighlighted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const severity = SEVERITY_CONFIG[problem.severity] || SEVERITY_CONFIG.medio;
  const module = FRAMEWORK_MODULES.find(m => m.code === problem.frameworkModule);

  return (
    <div 
      ref={problemRef}
      className={`rounded-xl border ${severity.borderColor} ${severity.bgColor} overflow-hidden transition-all duration-500 ${isHighlighted ? 'ring-2 ring-purple-400 ring-offset-2 shadow-lg' : ''}`}
      id={`problem-${problem.problemId}`}
    >
      {/* Cabeçalho do problema */}
      <div
        className="p-4 cursor-pointer flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="pt-0.5">
          <AlertTriangle className={`w-5 h-5 ${severity.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className={`text-xs ${severity.color} border-current`}>
              {severity.label}
            </Badge>
            {module && (
              <Badge variant="outline" className="text-xs text-slate-600 border-slate-300">
                <ModuleIcon iconName={module.icon} className="w-3 h-3 mr-1" />
                {module.code} - {module.name}
              </Badge>
            )}
            <span className="text-xs text-slate-400 font-mono">{problem.problemId}</span>
          </div>
          <h4 className="font-medium text-slate-900 text-sm">{problem.title}</h4>
          <p className="text-sm text-slate-700 font-light mt-1">{problem.layDescription}</p>
          
          {/* Indicador de vinculação cruzada */}
          <CrossLinkIndicator
            hasSolution={!!solution}
            hasClause={!!relatedClause}
            onGoToSolution={onNavigateToSolution}
            onGoToClause={onNavigateToClause}
          />
        </div>
        <div className="pt-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="border-t border-current/10 bg-white/50 p-4 space-y-4">
          {/* Exemplo cotidiano */}
          <div className="flex gap-3">
            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Exemplo prático</p>
              <p className="text-sm text-slate-700 font-light">{problem.everydayExample}</p>
            </div>
          </div>

          {/* Referência legal */}
          <div className="flex gap-3">
            <Scale className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Base legal</p>
              <p className="text-sm text-slate-700 font-light">{problem.legalRef}</p>
            </div>
          </div>

          {/* Trecho do contrato */}
          {problem.contractExcerpt && (
            <div className="flex gap-3">
              <BookOpen className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Trecho do contrato</p>
                <div className="bg-white rounded-lg p-3 border border-slate-200 text-sm text-slate-700 font-light italic">
                  &ldquo;{problem.contractExcerpt}&rdquo;
                </div>
              </div>
            </div>
          )}

          {/* Solução proposta - com ref para navegação cruzada */}
          {solution && (
            <div ref={solutionRef} id={`solution-${solution.solutionId}`} className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-green-800">Solução: {solution.title}</p>
                <span className="text-xs text-green-500 font-mono">{solution.solutionId}</span>
              </div>
              <p className="text-sm text-green-700 font-light mb-3">{solution.layDescription}</p>
              
              {solution.practicalSteps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Passos práticos:</p>
                  <ol className="space-y-1">
                    {solution.practicalSteps.map((step, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-green-700 font-light">
                        <span className="font-medium text-green-600 shrink-0">{idx + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-green-200">
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Clock className="w-3 h-3" />
                  Prazo: {solution.suggestedDeadline}
                </div>
                <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                  Prioridade {solution.priority}
                </Badge>
                {relatedClause && (
                  <button
                    onClick={onNavigateToClause}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium ml-auto"
                  >
                    <ArrowDown className="w-3 h-3" />
                    Ver cláusula
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cláusula copiável - com ref para navegação cruzada */}
          {relatedClause && (
            <div ref={clauseRef} id={`clause-${relatedClause.clauseId}`} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">
                    Cláusula {relatedClause.sequenceNumber}: {relatedClause.title}
                  </p>
                </div>
                <Badge className={NECESSITY_CONFIG[relatedClause.necessity]?.color || ""}>
                  {NECESSITY_CONFIG[relatedClause.necessity]?.label || relatedClause.necessity}
                </Badge>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200 text-sm text-slate-700 font-light whitespace-pre-wrap mb-3">
                {relatedClause.content}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => {
                  navigator.clipboard.writeText(relatedClause.content);
                  toast.success("Cláusula copiada para a área de transferência");
                  onClauseCopy?.(relatedClause.clauseId, relatedClause.content);
                }}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copiar cláusula
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleOverviewCard({ module, problemCount, status, onClick }: {
  module: FrameworkModuleData;
  problemCount: number;
  status: "ok" | "atencao" | "critico";
  onClick?: () => void;
}) {
  const statusConfig = {
    ok: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", label: "Conforme" },
    atencao: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Atenção" },
    critico: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Crítico" },
  };
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <div 
      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex items-start gap-3 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="p-2 rounded-lg bg-white/80 border border-slate-200">
        <ModuleIcon iconName={module.icon} className={`w-5 h-5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-slate-500">{module.code}</span>
          <StatusIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
        </div>
        <h4 className="text-sm font-medium text-slate-900">{module.name}</h4>
        <p className="text-xs text-slate-600 font-light mt-0.5">{module.layDescription}</p>
        {problemCount > 0 && (
          <p className={`text-xs mt-1 ${cfg.color} font-medium`}>
            {problemCount} {problemCount === 1 ? "problema encontrado" : "problemas encontrados"}
            {onClick && <span className="ml-1 text-slate-400">(clique para ver)</span>}
          </p>
        )}
      </div>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

export function SimplifiedView({
  complianceScore,
  executiveSummary,
  problems,
  solutions,
  clauses,
  checklistVersion,
  isConsultant,
  onClauseAcceptance,
  onClauseCopy,
  onDownloadAll,
  onExportLetter,
  isLoading,
  isExporting,
  contractName,
  organizationName,
  risks,
  onRiskDecision,
  isSavingDecision,
}: SimplifiedViewProps) {
  const [activeSection, setActiveSection] = useState<"visao" | "problemas" | "clausulas" | "decisoes">("visao");
  const [editingDecision, setEditingDecision] = useState<number | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<number, string>>({});
  const [localDecisions, setLocalDecisions] = useState<Record<number, string>>({});
  const [highlightedProblemId, setHighlightedProblemId] = useState<string | null>(null);
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<string | null>(null);

  // Refs para navegação cruzada
  const problemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const solutionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const clauseRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const clauseListRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Agrupar problemas por módulo
  const problemsByModule = useMemo(() => {
    const grouped: Record<string, ProblemData[]> = {};
    problems.forEach(p => {
      if (!grouped[p.frameworkModule]) grouped[p.frameworkModule] = [];
      grouped[p.frameworkModule].push(p);
    });
    return grouped;
  }, [problems]);

  // Status de cada módulo
  const moduleStatuses = useMemo(() => {
    const statuses: Record<string, "ok" | "atencao" | "critico"> = {};
    FRAMEWORK_MODULES.forEach(m => {
      const moduleProblems = problemsByModule[m.code] || [];
      if (moduleProblems.length === 0) {
        statuses[m.code] = "ok";
      } else if (moduleProblems.some(p => p.severity === "critico" || p.severity === "alto")) {
        statuses[m.code] = "critico";
      } else {
        statuses[m.code] = "atencao";
      }
    });
    return statuses;
  }, [problemsByModule]);

  // Mapear soluções por problemId
  const solutionsByProblem = useMemo(() => {
    const map: Record<string, SolutionData> = {};
    solutions.forEach(s => { map[s.problemId] = s; });
    return map;
  }, [solutions]);

  // Mapear cláusulas por problemId
  const clausesByProblem = useMemo(() => {
    const map: Record<string, ClauseData> = {};
    clauses.forEach(c => {
      if (c.problemId) map[c.problemId] = c;
    });
    return map;
  }, [clauses]);

  // Contadores
  const criticalCount = problems.filter(p => p.severity === "critico" || p.severity === "alto").length;
  const totalProblems = problems.length;
  const totalClauses = clauses.length;
  const mandatoryClauses = clauses.filter(c => c.necessity === "obrigatoria").length;

  // Navegação cruzada: scroll suave para elemento
  const scrollToElement = useCallback((element: HTMLElement | null, highlightId?: string, type?: 'problem' | 'clause') => {
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (highlightId && type === 'problem') {
      setHighlightedProblemId(highlightId);
      setTimeout(() => setHighlightedProblemId(null), 2500);
    }
    if (highlightId && type === 'clause') {
      setHighlightedClauseId(highlightId);
      setTimeout(() => setHighlightedClauseId(null), 2500);
    }
  }, []);

  // Navegar da visão geral para problemas de um módulo específico
  const navigateToModuleProblems = useCallback((moduleCode: string) => {
    setFilterModule(moduleCode);
    setActiveSection("problemas");
  }, []);

  // Navegar para uma cláusula específica na aba de cláusulas
  const navigateToClauseInList = useCallback((clauseId: string) => {
    setActiveSection("clausulas");
    // Aguardar a renderização da aba de cláusulas
    setTimeout(() => {
      const el = clauseListRefs.current[clauseId];
      scrollToElement(el, clauseId, 'clause');
    }, 150);
  }, [scrollToElement]);

  // Navegar para um problema específico na aba de problemas
  const navigateToProblem = useCallback((problemId: string) => {
    setActiveSection("problemas");
    setTimeout(() => {
      const el = problemRefs.current[problemId];
      scrollToElement(el, problemId, 'problem');
    }, 150);
  }, [scrollToElement]);

  // Limpar filtro de highlight após timeout
  useEffect(() => {
    if (highlightedProblemId) {
      const timer = setTimeout(() => setHighlightedProblemId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedProblemId]);

  useEffect(() => {
    if (highlightedClauseId) {
      const timer = setTimeout(() => setHighlightedClauseId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedClauseId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-light">Preparando visão simplificada...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navegação por seções */}
      <div className="flex items-center justify-between gap-2 border-b pb-3 flex-wrap">
        <div className="flex gap-2">
          <Button
            variant={activeSection === "visao" ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveSection("visao"); setFilterModule(null); }}
            className={activeSection === "visao" ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            <Info className="w-4 h-4 mr-1" />
            Visão Geral
          </Button>
          <Button
            variant={activeSection === "problemas" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection("problemas")}
            className={activeSection === "problemas" ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            Problemas e Soluções
            {totalProblems > 0 && (
              <Badge className="ml-1 bg-white/20 text-current text-xs">{totalProblems}</Badge>
            )}
          </Button>
          <Button
            variant={activeSection === "clausulas" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection("clausulas")}
            className={activeSection === "clausulas" ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            <FileText className="w-4 h-4 mr-1" />
            Cláusulas Prontas
            {totalClauses > 0 && (
              <Badge className="ml-1 bg-white/20 text-current text-xs">{totalClauses}</Badge>
            )}
          </Button>
          {risks && risks.length > 0 && isConsultant && (
            <Button
              variant={activeSection === "decisoes" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection("decisoes")}
              className={activeSection === "decisoes" ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              <ShieldCheck className="w-4 h-4 mr-1" />
              Decisões
              {risks.filter(r => !r.decision).length > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-xs">{risks.filter(r => !r.decision).length}</Badge>
              )}
            </Button>
          )}
        </div>

        {/* Botão de exportação em formato carta */}
        {onExportLetter && (
          <Button
            onClick={onExportLetter}
            disabled={isExporting}
            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white"
            size="sm"
          >
            {isExporting ? (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin mr-1" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-1" />
                Exportar Carta
              </>
            )}
          </Button>
        )}
      </div>

      {/* ==================== SEÇÃO: VISÃO GERAL ==================== */}
      {activeSection === "visao" && (
        <div className="space-y-6">
          {/* Cabeçalho com pontuação */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/30">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6 items-center">
                <div className="flex justify-center">
                  <ScoreGauge score={complianceScore ?? 0} />
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-lg font-light text-slate-900 mb-2">Resumo da Análise</h3>
                    {contractName && (
                      <p className="text-xs text-slate-400 mb-2">Contrato: {contractName}</p>
                    )}
                    <p className="text-sm text-slate-700 font-light leading-relaxed">
                      {executiveSummary || "A análise do contrato está sendo processada. Os resultados aparecerão aqui assim que estiverem prontos."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div 
                      className="bg-white rounded-lg p-3 border border-slate-200 text-center cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all"
                      onClick={() => setActiveSection("problemas")}
                    >
                      <p className="text-2xl font-extralight text-slate-900">{totalProblems}</p>
                      <p className="text-xs text-slate-500 font-light">Problemas</p>
                    </div>
                    <div 
                      className="bg-white rounded-lg p-3 border border-slate-200 text-center cursor-pointer hover:border-red-300 hover:shadow-sm transition-all"
                      onClick={() => { setActiveSection("problemas"); }}
                    >
                      <p className="text-2xl font-extralight text-red-600">{criticalCount}</p>
                      <p className="text-xs text-slate-500 font-light">Urgentes</p>
                    </div>
                    <div 
                      className="bg-white rounded-lg p-3 border border-slate-200 text-center cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                      onClick={() => setActiveSection("clausulas")}
                    >
                      <p className="text-2xl font-extralight text-blue-600">{totalClauses}</p>
                      <p className="text-xs text-slate-500 font-light">Cláusulas</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grade de módulos F1-F9 - clicáveis */}
          <div>
            <h3 className="text-lg font-light text-slate-900 mb-3">
              Diagnóstico por Área
            </h3>
            <p className="text-sm text-slate-500 font-light mb-4">
              Cada área representa um aspecto importante da proteção de dados no contrato. Clique para ver os problemas.
            </p>
            <div className="grid md:grid-cols-3 gap-3">
              {FRAMEWORK_MODULES.map(module => {
                const count = (problemsByModule[module.code] || []).length;
                return (
                  <ModuleOverviewCard
                    key={module.code}
                    module={module}
                    problemCount={count}
                    status={moduleStatuses[module.code]}
                    onClick={count > 0 ? () => navigateToModuleProblems(module.code) : undefined}
                  />
                );
              })}
            </div>
          </div>

          {checklistVersion && (
            <div className="text-xs text-slate-400 text-center pt-4 border-t">
              Análise realizada com checklist versão {checklistVersion} | Seusdados Consultoria em Gestão de Dados Limitada
            </div>
          )}
        </div>
      )}

      {/* ==================== SEÇÃO: PROBLEMAS E SOLUÇÕES ==================== */}
      {activeSection === "problemas" && (
        <div className="space-y-6">
          {problems.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-light text-slate-900 mb-2">Nenhum problema identificado</h3>
                <p className="text-sm text-slate-500 font-light">
                  O contrato analisado está em conformidade com os requisitos verificados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filtros */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-slate-500 font-light">Filtrar:</span>
                
                {/* Filtro por módulo */}
                <Button
                  variant={filterModule === null ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-xs ${filterModule === null ? 'bg-purple-600' : ''}`}
                  onClick={() => setFilterModule(null)}
                >
                  Todos ({totalProblems})
                </Button>
                {FRAMEWORK_MODULES.map(m => {
                  const count = (problemsByModule[m.code] || []).length;
                  if (count === 0) return null;
                  return (
                    <Button
                      key={m.code}
                      variant={filterModule === m.code ? "default" : "outline"}
                      size="sm"
                      className={`h-7 text-xs ${filterModule === m.code ? 'bg-purple-600' : ''}`}
                      onClick={() => setFilterModule(filterModule === m.code ? null : m.code)}
                    >
                      <ModuleIcon iconName={m.icon} className="w-3 h-3 mr-1" />
                      {m.code} ({count})
                    </Button>
                  );
                })}
              </div>

              {/* Gravidade */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">Gravidade:</span>
                {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => {
                  const count = problems.filter(p => p.severity === key && (!filterModule || p.frameworkModule === filterModule)).length;
                  if (count === 0) return null;
                  return (
                    <Badge key={key} variant="outline" className={`${cfg.color} border-current cursor-default text-xs`}>
                      {cfg.label} ({count})
                    </Badge>
                  );
                })}
              </div>

              {/* Lista de problemas agrupados por módulo */}
              {FRAMEWORK_MODULES.map(module => {
                if (filterModule && filterModule !== module.code) return null;
                const moduleProblems = problemsByModule[module.code] || [];
                if (moduleProblems.length === 0) return null;

                return (
                  <div key={module.code} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ModuleIcon iconName={module.icon} className="w-4 h-4 text-purple-600" />
                      <h4 className="text-sm font-medium text-slate-900">
                        {module.code} - {module.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">{moduleProblems.length}</Badge>
                    </div>

                    <div className="space-y-3 pl-6">
                      {moduleProblems
                        .sort((a, b) => {
                          const orderA = SEVERITY_CONFIG[a.severity]?.order ?? 5;
                          const orderB = SEVERITY_CONFIG[b.severity]?.order ?? 5;
                          return orderA - orderB;
                        })
                        .map(problem => {
                          const solution = solutionsByProblem[problem.problemId] || null;
                          const clause = clausesByProblem[problem.problemId] || null;
                          return (
                            <ProblemCard
                              key={problem.problemId}
                              problem={problem}
                              solution={solution}
                              relatedClause={clause}
                              onClauseCopy={onClauseCopy}
                              isHighlighted={highlightedProblemId === problem.problemId}
                              problemRef={(el: HTMLDivElement | null) => { problemRefs.current[problem.problemId] = el; }}
                              solutionRef={{ current: null }}
                              clauseRef={{ current: null }}
                              onNavigateToSolution={() => {
                                // Expandir o card e scroll para solução (já dentro do card expandido)
                                const el = document.getElementById(`solution-${solution?.solutionId}`);
                                if (el) scrollToElement(el);
                              }}
                              onNavigateToClause={() => {
                                if (clause) navigateToClauseInList(clause.clauseId);
                              }}
                            />
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ==================== SEÇÃO: CLÁUSULAS PRONTAS ==================== */}
      {activeSection === "clausulas" && (
        <div className="space-y-6">
          {clauses.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-light text-slate-900 mb-2">Nenhuma cláusula disponível</h3>
                <p className="text-sm text-slate-500 font-light">
                  As cláusulas serão geradas após a conclusão da análise.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Resumo das cláusulas */}
              <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-extralight text-blue-600">{totalClauses}</p>
                        <p className="text-xs text-blue-500">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-extralight text-red-600">{mandatoryClauses}</p>
                        <p className="text-xs text-red-500">Obrigatórias</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-extralight text-green-600">
                          {clauses.filter(c => c.isAccepted).length}
                        </p>
                        <p className="text-xs text-green-500">Aceitas</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {onDownloadAll && (
                        <Button
                          onClick={onDownloadAll}
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Baixar Todas
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de cláusulas */}
              <div className="space-y-4">
                {clauses
                  .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
                  .map(clause => {
                    const module = FRAMEWORK_MODULES.find(m => m.code === clause.frameworkModule);
                    const necessity = NECESSITY_CONFIG[clause.necessity] || NECESSITY_CONFIG.opcional;
                    const relatedProblem = clause.problemId ? problems.find(p => p.problemId === clause.problemId) : null;
                    const isHighlighted = highlightedClauseId === clause.clauseId;

                    return (
                      <Card 
                        key={clause.clauseId} 
                        ref={(el: HTMLDivElement | null) => { clauseListRefs.current[clause.clauseId] = el; }}
                        id={`clause-list-${clause.clauseId}`}
                        className={`border shadow-sm hover:shadow-md transition-all duration-500 ${isHighlighted ? 'ring-2 ring-purple-400 ring-offset-2 shadow-lg' : ''}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-400">
                                Cláusula {clause.sequenceNumber}
                              </span>
                              <Badge className={necessity.color}>{necessity.label}</Badge>
                              {module && (
                                <Badge variant="outline" className="text-xs">
                                  <ModuleIcon iconName={module.icon} className="w-3 h-3 mr-1" />
                                  {module.code}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isConsultant && onClauseAcceptance && (
                                <Button
                                  size="sm"
                                  variant={clause.isAccepted ? "default" : "outline"}
                                  className={clause.isAccepted ? "bg-green-600 hover:bg-green-700 h-7" : "h-7"}
                                  onClick={() => onClauseAcceptance(clause.clauseId, !clause.isAccepted)}
                                >
                                  {clause.isAccepted ? (
                                    <><CheckCircle className="w-3 h-3 mr-1" /> Aceita</>
                                  ) : (
                                    "Aceitar"
                                  )}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                onClick={() => {
                                  navigator.clipboard.writeText(clause.content);
                                  toast.success("Cláusula copiada");
                                  onClauseCopy?.(clause.clauseId, clause.content);
                                }}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copiar
                              </Button>
                            </div>
                          </div>
                          <CardTitle className="text-base font-light">{clause.title}</CardTitle>
                          
                          {/* Link cruzado para o problema de origem */}
                          {relatedProblem && (
                            <button
                              onClick={() => navigateToProblem(relatedProblem.problemId)}
                              className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 hover:underline mt-1"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Originada do problema: {relatedProblem.title}
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm text-slate-700 font-light whitespace-pre-wrap leading-relaxed">
                            {clause.content}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================== SEÇÃO: DECISÕES POR RISCO ==================== */}
      {activeSection === "decisoes" && risks && (
        <div className="space-y-6">
          {/* Cabeçalho */}
          <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-purple-600" />
                <div>
                  <h3 className="text-base font-medium text-slate-900">Decisão por Risco</h3>
                  <p className="text-sm text-slate-500 font-light">
                    Para cada risco identificado, escolha como deseja tratá-lo. As opções são:
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-green-700">Aceitar</p>
                  <p className="text-xs text-slate-500 font-light">Reconhecer o risco e conviver com ele</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-amber-200 text-center">
                  <Shield className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-amber-700">Mitigar</p>
                  <p className="text-xs text-slate-500 font-light">Reduzir o risco com ações específicas</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-red-200 text-center">
                  <X className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-red-700">Eliminar</p>
                  <p className="text-xs text-slate-500 font-light">Remover completamente o risco</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                <div className="text-center">
                  <p className="text-2xl font-extralight text-slate-900">{risks.length}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extralight text-green-600">{risks.filter(r => r.decision).length}</p>
                  <p className="text-xs text-green-500">Decididos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extralight text-red-600">{risks.filter(r => !r.decision).length}</p>
                  <p className="text-xs text-red-500">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de riscos para decisão */}
          <div className="space-y-3">
            {risks
              .sort((a, b) => {
                const orderA = SEVERITY_CONFIG[a.severity]?.order ?? 5;
                const orderB = SEVERITY_CONFIG[b.severity]?.order ?? 5;
                return orderA - orderB;
              })
              .map(risk => {
                const severity = SEVERITY_CONFIG[risk.severity] || SEVERITY_CONFIG.medio;
                const module = FRAMEWORK_MODULES.find(m => m.code === risk.frameworkModule);
                const currentDecision = localDecisions[risk.riskId] || risk.decision;
                const isEditing = editingDecision === risk.riskId;

                return (
                  <Card key={risk.riskId} className={`border ${severity.borderColor} overflow-hidden`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 ${severity.color} mt-0.5 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className={`text-xs ${severity.color} border-current`}>
                              {severity.label}
                            </Badge>
                            {module && (
                              <Badge variant="outline" className="text-xs text-slate-600 border-slate-300">
                                <ModuleIcon iconName={module.icon} className="w-3 h-3 mr-1" />
                                {module.code}
                              </Badge>
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-slate-900 mb-2">{risk.title}</h4>

                          {/* Decisão atual ou seletor */}
                          {!isEditing && currentDecision ? (
                            <div className="flex items-center gap-2">
                              <Badge className={`${
                                currentDecision === 'aceitar' ? 'bg-green-100 text-green-800 border-green-200' :
                                currentDecision === 'mitigar' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                'bg-red-100 text-red-800 border-red-200'
                              }`}>
                                {currentDecision === 'aceitar' ? 'Aceito' :
                                 currentDecision === 'mitigar' ? 'Mitigar' : 'Eliminar'}
                              </Badge>
                              {risk.notes && (
                                <span className="text-xs text-slate-500 font-light truncate max-w-[200px]">
                                  {risk.notes}
                                </span>
                              )}
                              {isConsultant && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs text-slate-400 hover:text-slate-600"
                                  onClick={() => {
                                    setEditingDecision(risk.riskId);
                                    setDecisionNotes(prev => ({ ...prev, [risk.riskId]: risk.notes || '' }));
                                  }}
                                >
                                  <Pencil className="w-3 h-3 mr-1" />
                                  Alterar
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3 mt-2">
                              <div className="flex gap-2">
                                {(['aceitar', 'mitigar', 'eliminar'] as const).map(dec => (
                                  <Button
                                    key={dec}
                                    size="sm"
                                    variant={localDecisions[risk.riskId] === dec ? 'default' : 'outline'}
                                    className={`h-8 text-xs ${
                                      localDecisions[risk.riskId] === dec
                                        ? dec === 'aceitar' ? 'bg-green-600 hover:bg-green-700'
                                          : dec === 'mitigar' ? 'bg-amber-600 hover:bg-amber-700'
                                          : 'bg-red-600 hover:bg-red-700'
                                        : ''
                                    }`}
                                    onClick={() => setLocalDecisions(prev => ({ ...prev, [risk.riskId]: dec }))}
                                  >
                                    {dec === 'aceitar' && <CheckCircle className="w-3 h-3 mr-1" />}
                                    {dec === 'mitigar' && <Shield className="w-3 h-3 mr-1" />}
                                    {dec === 'eliminar' && <X className="w-3 h-3 mr-1" />}
                                    {dec === 'aceitar' ? 'Aceitar' : dec === 'mitigar' ? 'Mitigar' : 'Eliminar'}
                                  </Button>
                                ))}
                              </div>
                              <Textarea
                                placeholder="Justificativa da decisão (opcional)..."
                                value={decisionNotes[risk.riskId] || ''}
                                onChange={(e) => setDecisionNotes(prev => ({ ...prev, [risk.riskId]: e.target.value }))}
                                className="text-sm font-light min-h-[60px]"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700"
                                  disabled={!localDecisions[risk.riskId] || isSavingDecision}
                                  onClick={() => {
                                    if (localDecisions[risk.riskId] && onRiskDecision) {
                                      onRiskDecision(
                                        risk.riskId,
                                        localDecisions[risk.riskId] as "aceitar" | "mitigar" | "eliminar",
                                        decisionNotes[risk.riskId] || ''
                                      );
                                      setEditingDecision(null);
                                    }
                                  }}
                                >
                                  {isSavingDecision ? (
                                    <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin mr-1" />
                                  ) : (
                                    <Save className="w-3 h-3 mr-1" />
                                  )}
                                  Salvar Decisão
                                </Button>
                                {isEditing && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingDecision(null);
                                      setLocalDecisions(prev => {
                                        const next = { ...prev };
                                        delete next[risk.riskId];
                                        return next;
                                      });
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SimplifiedView;
