/**
 * Página de Detalhes da Análise de Contrato LGPD
 * Exibe Mapa de Análise, Checklist, Matriz de Riscos e Gráficos
 * Padrão visual consistente com módulos Conformidade PPPD e Gestão de Terceiros
 */

import { useState, useMemo, useCallback, useEffect } from "react";
// DashboardLayout removido - já é aplicado no App.tsx
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Scale, ArrowLeft, CheckCircle, AlertTriangle, 
  FileText, Shield, AlertCircle, RefreshCw, Clock,
  Eye, Download, MessageSquare, Check, X, Minus,
  ChevronDown, ChevronUp, TrendingUp, BarChart3, PieChart as PieChartIcon,
  ClipboardList, Loader2, FileCode2, Copy, Paperclip, Search, Trash2, History,
  Database, Link2, MapPin, ExternalLink, Sparkles, Library, Edit, Send, Upload
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ActionPlanTab } from "@/components/ActionPlanTab";
import { Link, useParams, useSearch } from "wouter";
import { Streamdown } from "streamdown";
import XaiAlertCard from "@/components/XaiAlertCard";
import XaiClauseCard from "@/components/XaiClauseCard";
import XaiActionCard from "@/components/XaiActionCard";
import type { AlertaXAI } from "@/components/XaiAlertCard";
import type { ClausulaLGPDExplicavel } from "@/components/XaiClauseCard";
import type { AcaoPlanoExplicavel } from "@/components/XaiActionCard";
import { ReportViewer } from "@/components/ReportViewer";
// Nota: este arquivo usa um editor próprio para exibir evidências
// ao lado de cada campo do mapa/checklist/riscos (sem depender de componentes externos).
// Editors existentes no app podem continuar existindo, mas aqui usamos versões locais
// com evidências (fieldEvidence) para garantir UX "passe o mouse e veja a prova".
import { ClausulasLGPDPremiumView } from "@/components/ClausulasLGPDPremiumView";
import { ClauseDiffViewer } from "@/components/ClauseDiffViewer";
import { ClauseTemplateLibrary } from "@/components/ClauseTemplateLibrary";
import { SimplifiedView } from "@/components/SimplifiedView";
import { EvidenceTraceViewer } from "@/components/EvidenceTraceViewer";
import { GovbrSignaturePanel } from "@/components/GovbrSignaturePanel";
import { ClauseEditorTwoColumn } from "@/components/ClauseEditorTwoColumn";
import { ClauseListEditor } from "@/components/ClauseListEditor";
import { DocumentA4Preview } from "@/components/DocumentA4Preview";
import { MapeamentoAutoEditor } from "@/components/MapeamentoAutoEditor";
import { ContractWorkflowStepper, type WorkflowStep, type StepStatus } from "@/components/ContractWorkflowStepper";
import { PipelineStageGate } from "@/components/PipelineStageGate";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

const riskColors: Record<string, string> = {
  '1': '#dc2626', // Crítico - vermelho
  '2': '#f97316', // Alto - laranja
  '3': '#eab308', // Médio - amarelo
  '4': '#3b82f6', // Baixo - azul
  '5': '#22c55e', // Muito Baixo - verde
};

const riskLabels: Record<string, string> = {
  '1': 'Crítico',
  '2': 'Alto',
  '3': 'Médio',
  '4': 'Baixo',
  '5': 'Muito Baixo',
};

type FieldEvidenceRow = {
  id: number;
  analysisId: number;
  fieldName: string;
  excerpt: string | null;
  clauseRef: string | null;
  confidence: number | null;
  note: string | null;
  createdAt?: string;
};

function EvidenceHover({
  label = "Prova",
  excerpt,
  clauseRef,
  confidence,
  note,
}: {
  label?: string;
  excerpt?: string | null;
  clauseRef?: string | null;
  confidence?: number | null;
  note?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const hasContent = Boolean(excerpt || clauseRef || note || (typeof confidence === "number"));
  if (!hasContent) return null;

  const copyText = [
    clauseRef ? `Ref.: ${clauseRef}` : null,
    typeof confidence === "number" ? `Confiança: ${Math.round(confidence * 100)}%` : null,
    note ? `Nota: ${note}` : null,
    excerpt ? excerpt : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Badge variant="outline" className="cursor-help select-none text-[10px] font-medium">
        <Sparkles className="h-3 w-3 mr-1" />
        {label}
      </Badge>

      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 w-[420px] max-w-[85vw] rounded-xl border bg-white shadow-xl">
          <div className="p-3 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900">Evidência do contrato</div>
              <div className="text-[11px] text-slate-500 truncate">{clauseRef || "Sem referência"}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  await navigator.clipboard.writeText(copyText);
                  toast.success("Trecho copiado");
                } catch {
                  toast.error("Não foi possível copiar");
                }
              }}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copiar
            </Button>
          </div>
          <div className="p-3 space-y-2">
            {typeof confidence === "number" && (
              <div className="text-[11px] text-slate-600">
                Confiança: <span className="font-semibold">{Math.round(confidence * 100)}%</span>
              </div>
            )}
            {note && <div className="text-[11px] text-slate-600">{note}</div>}
            {excerpt && (
              <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">{excerpt}</div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

function buildEvidenceIndex(rows: FieldEvidenceRow[] | undefined | null) {
  const byField = new Map<string, FieldEvidenceRow>();
  (rows || []).forEach((r) => {
    // lista vem ordenada desc; primeiro é o mais recente
    if (!byField.has(r.fieldName)) byField.set(r.fieldName, r);
  });
  return byField;
}

function inferEvidenceFieldForRisk(text: string) {
  const t = (text || "").toLowerCase();
  const rules: Array<[RegExp, string[]]> = [
    [/transfer\w+|internacional|exterior|fora do brasil|country|pa[ií]s/i, ["internationalTransfer", "internationalTransferDetails", "transferInternational"]],
    [/incidente|violac\w+|data breach|vazamento|seguran\w+.*incidente/i, ["incidentNotification", "incidentResponse", "securityIncident"]],
    [/seguran\w+|criptograf\w+|backup|log|acesso|controle de acesso|mfa|iso 27001|nist/i, ["securityMeasures", "security", "technicalMeasures"]],
    [/subcontrat|suboperador|terceir|fornecedor|processador adicional/i, ["subprocessors", "subcontracting"]],
    [/reten\w+|prazo|armazen|storage|elim|delete|descarte/i, ["retention", "retentionPeriod", "deletion"]],
    [/direitos|titular|acesso|portabilidade|oposic\w+|revoga\w+|anonimiz/i, ["dataSubjectRights", "rights"]],
    [/base legal|consent|consentimento|leg[ií]timo interesse|execu\w+ de contrato|obriga\w+ legal/i, ["legalBasis", "legalBases"]],
    [/sens[ií]vel|biometr|sa[úu]de|relig|orienta\w+ sexual|crian\w+|adolesc/i, ["sensitiveData", "childrenData", "specialCategories"]],
  ];
  for (const [rx, fields] of rules) {
    if (rx.test(t)) return fields;
  }
  return [] as string[];
}


export default function ContractAnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const analysisId = parseInt(id || "0");
  const searchString = useSearch();

  // === PATCH UX: separar Pipeline (progresso) de Conformidade (score) ===
  const stageLabel = (stage: any) => {
    const s = String(stage || "").toLowerCase();
    const map: Record<string, string> = {
      queued: "Fila",
      extraction: "Extração",
      analysis: "Análise",
      mapping: "Mapeamento",
      risks: "Riscos",
      clauses: "Cláusulas",
      action_plan: "Plano de ação",
      reports: "Relatórios",
      completed: "Concluído",
      error: "Erro",
    };
    return map[s] || (stage ? String(stage) : "—");
  };

  const { user } = useAuth();
  const isConsultant = user?.role === 'admin_global' || user?.role === 'consultor';
  const [isRefineOpen, setIsRefineOpen] = useState(false);
  const [refinementRequest, setRefinementRequest] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"reviewed" | "approved" | "rejected">("reviewed");
  const [isActionPlanOpen, setIsActionPlanOpen] = useState(false);
  const [isLgpdClausesOpen, setIsLgpdClausesOpen] = useState(false);
  const [lgpdClausesResult, setLgpdClausesResult] = useState<any>(null);
  const [acceptedClauses, setAcceptedClauses] = useState<Record<string, boolean>>({});
  const [clauseRefinements, setClauseRefinements] = useState<Record<string, string>>({});
  const [selectedActionForAI, setSelectedActionForAI] = useState<any>(null);
  const [actionAIModalOpen, setActionAIModalOpen] = useState(false);
  const [actionAIInstruction, setActionAIInstruction] = useState('');
  const [gedSearchTerm, setGedSearchTerm] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [selectedClauseForHistory, setSelectedClauseForHistory] = useState<string | null>(null);
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [selectedVersionsForDiff, setSelectedVersionsForDiff] = useState<{ old: any; new: any } | null>(null);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  
  // Estados XAI
  const [xaiAlerts, setXaiAlerts] = useState<AlertaXAI[]>([]);
  const [xaiClausulas, setXaiClausulas] = useState<ClausulaLGPDExplicavel[]>([]);
  const [xaiAcoes, setXaiAcoes] = useState<AcaoPlanoExplicavel[]>([]);
  const [showXaiMode, setShowXaiMode] = useState(false);
  
  // Estados para mapeamentos
  const [showMapeamentoPreview, setShowMapeamentoPreview] = useState(false);
  
  // Estados para edição de versão final das cláusulas
  const [editingFinalClauseId, setEditingFinalClauseId] = useState<string | null>(null);
  const [finalClauseContents, setFinalClauseContents] = useState<Record<string, string>>({});
  const [clauseHeaderOptions, setClauseHeaderOptions] = useState<Record<string, { includeHeader: boolean; includeContractRef: boolean }>>({});
  const [hiddenClauses, setHiddenClauses] = useState<Record<string, boolean>>({});
  const [localResponsibles, setLocalResponsibles] = useState<Record<string, number>>({});
  const [clauseDocumentFormat, setClauseDocumentFormat] = useState<'dpa' | 'aditivo' | 'capitulo_lgpd'>('aditivo');
  const [includePartiesInDoc, setIncludePartiesInDoc] = useState(true);
  const [refinementInstructions, setRefinementInstructions] = useState<Record<string, string>>({});
  const [refiningClauseId, setRefiningClauseId] = useState<string | null>(null);
  const [scrollToClauseId, setScrollToClauseId] = useState<string | null>(null);
  
  // Estados para relatório premium
  const [showPremiumReport, setShowPremiumReport] = useState(false);
  const [premiumReportHtml, setPremiumReportHtml] = useState<string>('');
  const [showPremiumClausesView, setShowPremiumClausesView] = useState(false);
  
  // Estado para controle de tabs
  const [activeTab, setActiveTab] = useState<string>('simplified');

  // Estado para workflow stepper
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState<WorkflowStep>('analysis');
  
  // Tabs que mostram cabeçalho compacto (sem resumo e cards de risco)
  const compactHeaderTabs = ['map', 'checklist', 'actionplan', 'clauses', 'mapeamentos', 'thirdparty'];
  const showCompactHeader = compactHeaderTabs.includes(activeTab);
  
  // Estados para edição de plano de ação
  const [editingAction, setEditingAction] = useState<any>(null);
  const [isEditActionModalOpen, setIsEditActionModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identification: true,
    dataProcessing: true,
    roles: true,
    vulnerable: false,
    rights: false,
    elimination: false,
    risks: false,
    adequacy: false,
    action: false
  });

  // Query com polling automático
  const { data: analysis, refetch } = trpc.contractAnalysis.getById.useQuery(
    { id: analysisId },
    { 
      enabled: !!analysisId,
      refetchInterval: (data: any) => {
        const status = data?.contractAnalysisStatus;
        // Polling a cada 2 segundos enquanto status = analyzing ou queued
        if (status === 'analyzing' || status === 'queued') {
          return 2000;
        }
        // Parar polling quando análise termina
        return false;
      }
    }
  );

  // Query DPPA - Documento Pronto + Plano de Ação (Framework Seusdados)
  // Mutation para exportar carta simplificada
  const exportLetterMutation = trpc.contractAnalysis.exportLetter.useMutation({
    onSuccess: (data) => {
      // Abrir PDF em nova aba
      if (data.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      }
      toast.success(`Carta simplificada gerada com sucesso (${data.problemCount} problemas, ${data.clauseCount} cláusulas)`);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar carta: ${error.message}`);
    },
  });

  const saveRiskDecisionMutation = trpc.contractAnalysis.saveRiskDecision.useMutation({
    onSuccess: () => {
      toast.success('Decisão salva com sucesso');
      refetchResults();
      fullResultsQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar decisão: ${error.message}`);
    },
  });

  const { data: dppaData, isLoading: isLoadingDPPA } = trpc.contractAnalysis.getDPPA.useQuery(
    { analysisId },
    { enabled: !!analysisId && (analysis?.contractAnalysisStatus === 'completed' || analysis?.contractAnalysisStatus === 'reviewed' || analysis?.contractAnalysisStatus === 'approved') }
  );

  // Query EvidencePack - Rastreabilidade (Termo 1)
  const { data: evidenceData, isLoading: isLoadingEvidence } = trpc.contractAnalysis.getEvidencePack.useQuery(
    { analysisId },
    { enabled: !!analysisId && isConsultant && (analysis?.contractAnalysisStatus === 'completed' || analysis?.contractAnalysisStatus === 'reviewed' || analysis?.contractAnalysisStatus === 'approved') }
  );

  // Query principal de dados (map, checklist, risks, clauses, actionPlans)
  const { data: resultsData, refetch: refetchResults } = trpc.contractAnalysis.getResults.useQuery(
    { id: analysisId },
    { 
      enabled: !!analysisId,
      refetchInterval: (data: any) => {
        const status = data?.analysis?.contractAnalysisStatus;
        if (status === 'analyzing' || status === 'queued') return 3000;
        return false;
      }
    }
  );

  const fullResultsQuery = trpc.contractAnalysis.getFullResults.useQuery(
    { id: analysisId },
    { enabled: !!analysisId && !!analysis }
  );

  // Efeito para atualizar quando análise é concluída
  useEffect(() => {
    if (analysis?.contractAnalysisStatus === 'completed' || analysis?.contractAnalysisStatus === 'error' || analysis?.contractAnalysisStatus === 'failed') {
      // Análise finalizada, mostrar notificação
      if (analysis?.contractAnalysisStatus === 'completed') {
        toast.success('Análise concluída com sucesso!');
        // Recarregar mapeamentos após conclusão do pipeline
        refetchMapeamentos();
        refetchResults();
      } else {
        toast.error('Erro ao processar análise. Tente novamente.');
      }
    }
  }, [analysis?.contractAnalysisStatus])

  const evidenceIndex = useMemo(() => buildEvidenceIndex((analysis as any)?.fieldEvidence as FieldEvidenceRow[]), [analysis]);

  // Dados vindos do getResults (fonte real dos dados das abas)
  const resultsMap = (resultsData as any)?.map || null;
  const resultsChecklist = (resultsData as any)?.checklist || [];
  const resultsRisks = (resultsData as any)?.risks || [];
  const resultsClauses = (resultsData as any)?.clauses || [];
  const resultsActionPlans = (resultsData as any)?.actionPlans || [];
  const resultsEvidence = (resultsData as any)?.evidence || [];
  const map = resultsMap;
  const [mapDraft, setMapDraft] = useState<any>(null);

  useEffect(() => {
    if (map) setMapDraft({ ...map });
  }, [map?.id]); // Apenas map.id para evitar re-renders infinitos

  const updateMapMutation = trpc.contractAnalysis.updateMap.useMutation({
    onSuccess: () => {
      toast.success("Mapa atualizado");
      // refetch(); // Desabilitado para evitar loop infinito
    },
    onError: (e) => toast.error(e.message),
  });

  const utils = trpc.useUtils();

  const updateChecklistItemMutation = trpc.contractAnalysis.updateChecklistItem.useMutation({
    onSuccess: () => {
      toast.success("Checklist atualizado");
      utils.contractAnalysis.listActionPlans.invalidate({ analysisId });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRiskItemMutation = trpc.contractAnalysis.updateRiskItem.useMutation({
    onSuccess: () => {
      toast.success("Risco atualizado");
      utils.contractAnalysis.listActionPlans.invalidate({ analysisId });
    },
    onError: (e) => toast.error(e.message),
  });

  // Query para buscar usuários da organização vinculada à análise
  const { data: orgUsers } = trpc.user.listByOrganization.useQuery(
    { organizationId: analysis?.organizationId || 0 },
    { enabled: !!analysis?.organizationId }
  );



  // Query para buscar cláusulas salvas no banco de dados
  const { data: savedClauses, refetch: refetchClauses } = trpc.contractAnalysis.getClauses.useQuery(
    { analysisId },
    { enabled: !!analysisId }
  );

  // Query para mapeamentos vinculados
  const { data: linkedMapeamentos, refetch: refetchMapeamentos } = trpc.contractAnalysis.getLinkedMapeamentos.useQuery(
    { analysisId },
    { 
      enabled: !!analysisId,
      refetchInterval: () => {
        const status = analysis?.contractAnalysisStatus;
        // Polling a cada 3 segundos enquanto análise está em andamento
        if (status === 'analyzing' || status === 'queued') return 3000;
        return false;
      }
    }
  );

  // Query para preview de extração - DESABILITADA por padrão para evitar loop infinito
  const { data: mapeamentoPreview } = trpc.contractAnalysis.previewMapeamentoExtraction.useQuery(
    { analysisId },
    { enabled: false } // Será acionada manualmente quando necessário
  );

  // Query para dados do terceiro (se vinculado) - Desabilitada por padrão
  const { data: thirdPartyData } = trpc.thirdParty.getById.useQuery(
    { id: analysis?.thirdPartyId || 0 },
    { enabled: false } // Será acionada quando necessário
  );

  // Query para histórico de due diligence do terceiro (desabilitado - endpoint não existe)
  const thirdPartyAssessments = null;

  // Mutations
  const refineMutation = trpc.contractAnalysis.refineAnalysis.useMutation({
    onSuccess: () => {
      toast.success("Análise refinada com sucesso!");
      setIsRefineOpen(false);
      setRefinementRequest("");
      refetch();
      refetchResults();
    },
    onError: (error) => {
      toast.error(`Erro ao refinar análise: ${error.message}`);
    }
  });

  const reviewMutation = trpc.contractAnalysis.reviewAnalysis.useMutation({
    onSuccess: () => {
      toast.success("Análise revisada com sucesso!");
      setIsReviewOpen(false);
      setReviewNotes("");
      refetch();
      refetchResults();
    },
    onError: (error) => {
      toast.error(`Erro ao revisar análise: ${error.message}`);
    }
  });

  const exportPdfMutation = trpc.contractAnalysis.exportPdf.useMutation({
    onSuccess: (data: { data: string; contentType: string; filename: string }) => {
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.contentType });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Relatório exportado com sucesso!');
    },
    onError: (error: { message: string }) => {
      toast.error('Erro ao exportar relatório: ' + error.message);
    },
  });

  const handleExportPdf = useCallback(() => {
    if (analysisId) {
      exportPdfMutation.mutate({ id: analysisId });
    }
  }, [analysisId, exportPdfMutation]);

  // Mutation para relatório premium HTML
  const exportPremiumHtmlMutation = trpc.contractAnalysis.exportPremiumHtml.useMutation({
    onSuccess: (data) => {
      setPremiumReportHtml(data.html);
      setShowPremiumReport(true);
      toast.success('Relatório premium gerado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao gerar relatório premium: ' + error.message);
    },
  });

  const handleExportPremiumHtml = useCallback(() => {
    if (analysisId) {
      exportPremiumHtmlMutation.mutate({ analysisId });
    }
  }, [analysisId, exportPremiumHtmlMutation]);

  // Mutation para gerar plano de ação
  const generateActionPlanMutation = trpc.contractAnalysis.generateActionPlan.useMutation({
    onSuccess: (data) => {
      toast.success(`Plano de ação gerado com ${data.actionsCreated} ações!`);
      setIsActionPlanOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao gerar plano de ação: ${error.message}`);
    }
  });

  // Mutation para gerar mapeamento a partir do contrato
  const generateMapeamentoMutation = trpc.contractAnalysis.generateMapeamento.useMutation({
    onSuccess: (data) => {
      toast.success(`Mapeamento gerado com sucesso! Área: ${data.extractedData?.department}`);
      setShowMapeamentoPreview(false);
      refetchMapeamentos();
    },
    onError: (error) => {
      toast.error(`Erro ao gerar mapeamento: ${error.message}`);
    }
  });

  // Query para listar ações existentes
  const { data: existingActions, refetch: refetchExistingActions } = trpc.contractAnalysis.listActionPlans.useQuery(
    { analysisId },
    { enabled: !!analysisId }
  );

  // Query para buscar documentos do GED
  const { data: gedSearchResults, isLoading: isSearchingGed } = trpc.ged.searchDocuments.useQuery(
    { 
      spaceType: 'organization' as const, 
      organizationId: analysis?.organizationId,
      searchTerm: gedSearchTerm 
    },
    { enabled: !!gedSearchTerm && gedSearchTerm.length >= 2 && !!analysis?.organizationId }
  );



  // Query para histórico de auditoria de cláusulas
  const { data: clauseAuditHistory, isLoading: isLoadingAuditHistory } = trpc.contractAnalysis.getClauseAuditHistory.useQuery(
    { analysisId, clauseId: selectedClauseForHistory || undefined },
    { enabled: !!analysisId && showAuditHistory }
  );

  // Mutation para gerar cláusulas LGPD
  const generateLgpdClausesMutation = trpc.contractAnalysis.lgpdGerarClausulasPorAnalise.useMutation({
    onSuccess: (data) => {
      setLgpdClausesResult(data);
      // Inicializar todas as cláusulas como aceitas por padrão
      const initialAccepted: Record<string, boolean> = {};
      data.clausulas.forEach((c: any) => {
        initialAccepted[c.id] = true;
      });
      setAcceptedClauses(initialAccepted);
      // Recarregar cláusulas do banco para garantir sincronização
      refetchClauses();
      toast.success(`Cláusulas LGPD geradas e salvas com sucesso! (${data.clausulas.length} cláusulas)`);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar cláusulas: ${error.message}`);
    }
  });

  // Carregar cláusulas salvas quando a query retornar dados
  useEffect(() => {
    if (savedClauses && savedClauses.length > 0 && !lgpdClausesResult) {
      // Transformar cláusulas salvas para o formato esperado
      const clausulasFormatadas = savedClauses.map((c: any) => ({
        id: c.clauseId,
        titulo: c.title,
        conteudo: c.content,
        aplicavel: c.isApplicable,
        numero: c.sequenceNumber,
        dbId: c.id,
      }));
      
      setLgpdClausesResult({
        clausulas: clausulasFormatadas,
        analysis: { id: analysisId },
        fromDatabase: true,
      });
      
      // Inicializar estados de aceitação e visibilidade
      const initialAccepted: Record<string, boolean> = {};
      const initialHidden: Record<string, boolean> = {};
      savedClauses.forEach((c: any) => {
        const accepted = c.isAccepted ?? true;
        initialAccepted[c.clauseId] = accepted;
        initialHidden[c.clauseId] = !accepted;
      });
      setAcceptedClauses(initialAccepted);
      setHiddenClauses(initialHidden);
    }
  }, [savedClauses?.length, lgpdClausesResult]); // Apenas comprimento de savedClauses para evitar re-renders

  // Auto-trigger: quando URL contém ?acao=relatorio, gerar relatório automaticamente
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const acao = params.get('acao');
    if (acao === 'relatorio' && analysis && analysisId) {
      // Acionar geração do relatório premium
      exportPremiumHtmlMutation.mutate({ analysisId });
    }
  }, [searchString, analysis?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mutations XAI
  const analyzeXaiMutation = trpc.contractAnalysis.analyzeWithXai.useMutation({
    onSuccess: (data) => {
      setXaiAlerts(data.alertas as unknown as AlertaXAI[]);
      toast.success(`Análise XAI concluída: ${data.alertas.length} alertas identificados`);
    },
    onError: (error: any) => {
      toast.error(`Erro na análise XAI: ${error.message}`);
    }
  });

  const generateXaiClausesMutation = trpc.contractAnalysis.generateLgpdClausesWithXai.useMutation({
    onSuccess: (data) => {
      setXaiClausulas(data.clausulas as unknown as ClausulaLGPDExplicavel[]);
      // Inicializar todas como aceitas
      const initialAccepted: Record<string, boolean> = {};
      (data.clausulas as unknown as ClausulaLGPDExplicavel[]).forEach((c) => {
        initialAccepted[c.id] = true;
      });
      setAcceptedClauses(initialAccepted);
      setShowXaiMode(true);
      toast.success(`Cláusulas XAI geradas: ${data.clausulas.length} cláusulas com explicabilidade`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar cláusulas XAI: ${error.message}`);
    }
  });

  const generateXaiActionPlanMutation = trpc.contractAnalysis.generateActionPlanWithXai.useMutation({
    onSuccess: (data) => {
      setXaiAcoes(data.acoes as unknown as AcaoPlanoExplicavel[]);
      setShowXaiMode(true);
      toast.success(`Plano de Ação XAI gerado: ${data.acoes.length} ações com explicabilidade`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar plano XAI: ${error.message}`);
    }
  });

  // Funções de manipulação de cláusulas
  const handleClauseAcceptance = (clauseId: string, accepted: boolean) => {
    setAcceptedClauses(prev => ({ ...prev, [clauseId]: accepted }));
    // Sincronizar com a Minuta: ao desmarcar, ocultar da Minuta; ao aceitar, mostrar
    setHiddenClauses(prev => ({ ...prev, [clauseId]: !accepted }));
  };

  const handleAcceptAllClauses = () => {
    if (lgpdClausesResult?.clausulas) {
      const allAccepted: Record<string, boolean> = {};
      const allVisible: Record<string, boolean> = {};
      lgpdClausesResult.clausulas.forEach((c: any) => {
        allAccepted[c.id] = true;
        allVisible[c.id] = false;
      });
      setAcceptedClauses(allAccepted);
      setHiddenClauses(allVisible);
      toast.success('Todas as cláusulas foram aceitas');
    }
  };

  const handleDownloadClause = (clausula: any) => {
    const content = `# ${clausula.titulo}\n\n${clausula.conteudo}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clausula-${clausula.id || 'lgpd'}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Cláusula baixada!');
  };

  const handleCopyClause = (clausula: any) => {
    navigator.clipboard.writeText(`${clausula.titulo}\n\n${clausula.conteudo}`);
    toast.success('Cláusula copiada para a área de transferência!');
  };

  // Handler para ocultar/mostrar cláusulas
  const handleHiddenChange = (clauseId: string, hidden: boolean) => {
    setHiddenClauses(prev => ({ ...prev, [clauseId]: hidden }));
    // Sincronizar: ocultar = desmarcar aceite; mostrar = aceitar
    setAcceptedClauses(prev => ({ ...prev, [clauseId]: !hidden }));
    toast.success(hidden ? 'Cláusula removida da Minuta' : 'Cláusula restaurada na Minuta');
  };

  // Handler para compartilhar cláusula
  const handleShareClause = async (clausula: any) => {
    const shareText = `${clausula.titulo}\n\n${clausula.conteudo}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: clausula.titulo,
          text: shareText,
        });
      } catch (err) {
        // Usuário cancelou ou erro
        navigator.clipboard.writeText(shareText);
        toast.success('Link copiado para compartilhamento!');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Conteúdo copiado para compartilhamento!');
    }
  };

  // Handler para download com formato específico
  const handleDownloadClauseWithFormat = (clausula: any, format: 'txt' | 'pdf' | 'docx', premium: boolean) => {
    const content = finalClauseContents[clausula.id] || clausula.conteudo;
    
    if (format === 'txt') {
      const blob = new Blob([`${clausula.titulo}\n\n${content}`], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clausula-${clausula.id || 'lgpd'}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Download TXT iniciado!');
    } else if (format === 'pdf') {
      // Para PDF, usar a mutation existente ou criar uma nova
      toast.info('Gerando PDF...');
      // Por enquanto, usar download simples
      handleDownloadClause(clausula);
    } else if (format === 'docx') {
      // Para DOCX, usar a mutation existente
      toast.info('Gerando DOCX...');
      exportClausesDocxMutation.mutate({
        analysisId,
        clausulas: [{
          id: clausula.id,
          titulo: clausula.titulo,
          conteudo: content,
        }],
      });
    }
  };

  // Handler para salvar versão final da cláusula com opções
  const handleSaveFinalClause = (clauseId: string, content: string, options: { includeHeader: boolean; includeContractRef: boolean; documentFormat: string }) => {
    const clausula = lgpdClausesResult?.clausulas?.find((c: any) => c.id === clauseId);
    if (!clausula) return;
    
    setFinalClauseContents(prev => ({ ...prev, [clauseId]: content }));
    setClauseHeaderOptions(prev => ({ 
      ...prev, 
      [clauseId]: { 
        includeHeader: options.includeHeader, 
        includeContractRef: options.includeContractRef 
      } 
    }));
    
    // Salvar no banco de dados
    saveFinalClauseMutation.mutate({
      analysisId,
      clauseDbId: clausula.dbId,
      clauseId,
      finalContent: content,
      includeHeader: options.includeHeader,
      includeContractReference: options.includeContractRef,
    });
  };

  // Mutation para exportar cláusulas em DOCX
  const exportClausesDocxMutation = trpc.contractAnalysis.exportClausesDocx.useMutation({
    onSuccess: (data) => {
      // Converter base64 para blob e fazer download
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Minuta DOCX baixada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao gerar DOCX:', error);
      toast.error('Erro ao gerar documento DOCX');
    }
  });

  const handleDownloadAllClauses = async () => {
    if (!lgpdClausesResult?.clausulas) return;
    const acceptedClausesList = lgpdClausesResult.clausulas.filter((c: any) => acceptedClauses[c.id]);
    if (acceptedClausesList.length === 0) {
      toast.error('Nenhuma cláusula aceita para download');
      return;
    }
    
    // Chamar o endpoint do backend para gerar o DOCX
    exportClausesDocxMutation.mutate({
      analysisId: Number(id),
      clausulas: acceptedClausesList.map((c: any) => ({
        id: c.id,
        titulo: c.titulo,
        conteudo: c.conteudo,
      })),
    });
  };

  // Mutation para solicitar aprovação de DPA
  const requestDpaApprovalMutation = trpc.contractAnalysis.requestDpaApproval.useMutation({
    onSuccess: () => {
      toast.success('Solicitação de aprovação enviada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao enviar solicitação: ${error.message}`);
    }
  });

  // Mutation para aprovar DPA
  const approveDpaMutation = trpc.contractAnalysis.approveDpa.useMutation({
    onSuccess: () => {
      toast.success('DPA aprovado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar DPA: ${error.message}`);
    }
  });

  // Mutation para rejeitar DPA
  const rejectDpaMutation = trpc.contractAnalysis.rejectDpa.useMutation({
    onSuccess: () => {
      toast.success('DPA rejeitado');
    },
    onError: (error) => {
      toast.error(`Erro ao rejeitar DPA: ${error.message}`);
    }
  });

  // Mutation para enviar DPA por e-mail
  const sendDpaByEmailMutation = trpc.contractAnalysis.sendDpaByEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`E-mail enviado para ${data.emailsSent} destinatário(s)!`);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar e-mail: ${error.message}`);
    }
  });

  // Mutation para salvar versão final editada da cláusula
  const saveFinalClauseMutation = trpc.contractAnalysis.saveFinalClauseVersion.useMutation({
    onSuccess: () => {
      toast.success('Versão final salva com sucesso!');
      refetchClauses();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar versão final: ${error.message}`);
    }
  });

  // Mutation para aprovar versão final da cláusula
  const approveFinalClauseMutation = trpc.contractAnalysis.approveFinalClauseVersion.useMutation({
    onSuccess: () => {
      toast.success('Cláusula aprovada!');
      refetchClauses();
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar cláusula: ${error.message}`);
    }
  });

  // Mutation para criar tarefa a partir do mapeamento
  const createTaskFromMappingMutation = trpc.contractAnalysis.createTaskFromMapping.useMutation({
    onSuccess: (data) => {
      toast.success('Tarefa criada com sucesso!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar tarefa: ${error.message}`);
    }
  });

  // Mutation para criar chamado MeuDPO a partir do mapeamento
  const createMeuDpoTicketMutation = trpc.contractAnalysis.createMeuDpoTicketFromMapping.useMutation({
    onSuccess: (data) => {
      toast.success(`Chamado MeuDPO #${data.ticketNumber} criado com sucesso!`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar chamado: ${error.message}`);
    }
  });

  // Mutation para inserir dados no mapa de dados
  const insertMappingToDataMapMutation = trpc.contractAnalysis.insertMappingToDataMap.useMutation({
    onSuccess: () => {
      toast.success('Dados inseridos no mapeamento!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao inserir dados: ${error.message}`);
    }
  });

  // Mutation para refinar cláusula individual via IA
  const refineClauseMutation = trpc.contractAnalysis.refineClause.useMutation({
    onSuccess: (data) => {
      // Atualizar a cláusula no estado local
      if (lgpdClausesResult) {
        const updatedClauses = lgpdClausesResult.clausulas.map((c: any) => 
          c.id === data.clauseId ? { ...c, conteudo: data.refinedContent } : c
        );
        setLgpdClausesResult({ ...lgpdClausesResult, clausulas: updatedClauses });
      }
      toast.success('Cláusula refinada com sucesso!');
      setClauseRefinements(prev => ({ ...prev, [data.clauseId]: '' }));
    },
    onError: (error) => {
      toast.error(`Erro ao refinar cláusula: ${error.message}`);
    }
  });

  const handleRefineClause = async (clauseId: string, instructionsParam?: string) => {
    const instruction = instructionsParam || clauseRefinements[clauseId];
    if (!instruction?.trim()) return;
    
    // Buscar cláusula no resultado normal ou no XAI
    const clausula = lgpdClausesResult?.clausulas?.find((c: any) => c.id === clauseId) 
      || xaiClausulas.find(c => c.id === clauseId);
    if (!clausula) {
      toast.error('Cláusula não encontrada');
      return;
    }
    
    refineClauseMutation.mutate({
      analysisId,
      clauseId,
      currentContent: clausula.conteudo,
      instructions: instruction
    });
  };

  const handleGenerateActionPlan = useCallback(() => {
    if (analysisId) {
      generateActionPlanMutation.mutate({ analysisId });
    }
  }, [analysisId, generateActionPlanMutation]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Dados para gráficos
  const riskDistributionData = useMemo(() => {
    if (!analysis) return [];
    return [
      { name: 'Crítico', value: analysis.criticalRisks, color: riskColors['1'] },
      { name: 'Alto', value: analysis.highRisks, color: riskColors['2'] },
      { name: 'Médio', value: analysis.mediumRisks, color: riskColors['3'] },
      { name: 'Baixo', value: analysis.lowRisks, color: riskColors['4'] },
      { name: 'Muito Baixo', value: analysis.veryLowRisks, color: riskColors['5'] },
    ].filter(d => d.value > 0);
  }, [analysis]);

  const checklistData = useMemo(() => {
    if (!resultsChecklist.length === 0) return [];
    const counts = { sim: 0, nao: 0, parcial: 0 };
    resultsChecklist.forEach((item: any) => {
      // O campo no banco é checklistStatus, não status
      const status = item.checklistStatus || item.status;
      if (status && counts[status as keyof typeof counts] !== undefined) {
        counts[status as keyof typeof counts]++;
      }
    });
    return [
      { name: 'Conforme', value: counts.sim, color: '#22c55e' },
      { name: 'Não Conforme', value: counts.nao, color: '#dc2626' },
      { name: 'Parcial', value: counts.parcial, color: '#eab308' },
    ].filter(d => d.value > 0);
  }, [resultsChecklist]);
  const radarData = useMemo(() => {
    if (!resultsMap) return [];
    const map = resultsMap;
    return [
      { area: 'Identificação', score: map.contractType ? 5 : 0 },
      { area: 'Dados Pessoais', score: map.commonData ? 4 : (map.sensitiveData ? 3 : 0) },
      { area: 'Papel LGPD', score: map.agentType ? 5 : 0 },
      { area: 'Vulneráveis', score: (map.hasElderlyData || map.hasMinorData) ? 3 : 5 },
      { area: 'Direitos', score: map.titularRightsStatus === 'sim' ? 5 : (map.titularRightsStatus === 'parcial' ? 3 : 1) },
      { area: 'Eliminação', score: map.dataEliminationStatus === 'sim' ? 5 : (map.dataEliminationStatus === 'parcial' ? 3 : 1) },
      { area: 'Segurança', score: map.securityRisks ? 3 : 5 },
      { area: 'Adequação', score: map.hasProtectionClause === 'sim' ? 5 : (map.hasProtectionClause === 'parcial' ? 3 : 1) },
    ];
  }, [resultsMap]);

  // Calcular status do workflow baseado no pipeline automático de 8 fases
  // Pipeline: extraction → analysis → mapping → risks → clauses → action_plan → reports → completed
  const workflowStatuses = useMemo((): Record<WorkflowStep, StepStatus> => {
    const status = analysis?.contractAnalysisStatus;
    const stage = (analysis as any)?.stage || 'queued';
    const isCompleted = status === 'completed' || status === 'reviewed' || status === 'approved';
    const isAnalyzing = status === 'analyzing' || status === 'queued';

    // Pipeline automático: mapear stage do backend para status do workflow
    const pipelineOrder = ['extraction', 'analysis', 'mapping', 'risks', 'clauses', 'action_plan', 'reports', 'completed'];
    const currentStageIdx = pipelineOrder.indexOf(stage);

    function stageStatus(workflowStage: string): StepStatus {
      if (isCompleted) return 'completed';
      if (!isAnalyzing) return 'pending';

      const stageIdx = pipelineOrder.indexOf(workflowStage);
      if (stageIdx < currentStageIdx) return 'completed';
      if (stageIdx === currentStageIdx) return 'in_progress';
      return 'pending';
    }

    // Verificar dados reais para override (quando pipeline completo)
    const hasRisks = (resultsRisks?.length ?? 0) > 0;
    const hasClauses = (lgpdClausesResult?.clausulas?.length ?? 0) > 0 || (savedClauses?.length ?? 0) > 0;
    const hasActionPlan = (existingActions?.length ?? 0) > 0;
    const hasAnyMapping = (linkedMapeamentos?.length ?? 0) > 0;
    const hasMappingApproved = linkedMapeamentos?.some((m: any) => m.linkStatus === 'approved') ?? false;

    // Se pipeline concluiu, usar dados reais para status
    if (isCompleted) {
      let mappingStatus: StepStatus = 'completed';
      if (hasMappingApproved) mappingStatus = 'completed';
      else if (hasAnyMapping) mappingStatus = 'needs_review';

      return {
        analysis: 'completed',
        mapping: mappingStatus,
        risks: hasRisks ? 'needs_review' : 'completed',
        clauses: hasClauses ? 'completed' : 'completed',
        action_plan: hasActionPlan ? 'completed' : 'completed',
        reports: 'completed',
      };
    }

    // Pipeline em andamento: usar stage do backend
    return {
      analysis: stageStatus('analysis'),
      mapping: stageStatus('mapping'),
      risks: stageStatus('risks'),
      clauses: stageStatus('clauses'),
      action_plan: stageStatus('action_plan'),
      reports: stageStatus('reports'),
    };
  }, [analysis, existingActions, lgpdClausesResult, savedClauses, linkedMapeamentos]);

  // Contadores para badges do workflow
  const workflowCounts = useMemo((): Partial<Record<WorkflowStep, number>> => {
    const totalRisks = (analysis?.criticalRisks ?? 0) + (analysis?.highRisks ?? 0) + (analysis?.mediumRisks ?? 0) + (analysis?.lowRisks ?? 0) + (analysis?.veryLowRisks ?? 0);
    return {
      risks: totalRisks,
      action_plan: existingActions?.length ?? 0,
      clauses: (lgpdClausesResult?.clausulas?.length ?? 0) + (savedClauses?.length ?? 0),
      mapping: linkedMapeamentos?.length ?? 0,
    };
  }, [analysis, existingActions, lgpdClausesResult, savedClauses, linkedMapeamentos]);

  // Handler para clique nas etapas do workflow
  const handleWorkflowStepClick = useCallback((step: WorkflowStep) => {
    setCurrentWorkflowStep(step);
    // Navegar para a tab correspondente
    const stepToTab: Record<WorkflowStep, string> = {
      analysis: 'map',
      risks: 'risks',
      action_plan: 'actionplan',
      clauses: 'clauses',
      mapping: 'mapeamentos',
      reports: 'charts',
    };
    setActiveTab(stepToTab[step]);
  }, []);

  // Handler para ações do workflow
  const handleWorkflowAction = useCallback((step: WorkflowStep, action: 'generate' | 'approve' | 'refine' | 'view' | 'export') => {
    switch (step) {
      case 'risks':
        if (action === 'view') setActiveTab('risks');
        break;
      case 'action_plan':
        if (action === 'generate') handleGenerateActionPlan();
        if (action === 'view') setActiveTab('actionplan');
        break;
      case 'clauses':
        if (action === 'generate') {
          setIsLgpdClausesOpen(true);
          if (!lgpdClausesResult) {
            generateLgpdClausesMutation.mutate({ analysisId });
          }
        }
        if (action === 'view') setActiveTab('clauses');
        break;
      case 'mapping':
        if (action === 'view') setActiveTab('mapeamentos');
        break;
      case 'reports':
        if (action === 'export') handleExportPdf();
        if (action === 'view') setActiveTab('charts');
        break;
    }
  }, [handleGenerateActionPlan, lgpdClausesResult, generateLgpdClausesMutation, analysisId, handleExportPdf]);

  const calculateEstimatedTime = (progress: number): string => {
    if (progress <= 0 || progress >= 100) return '';
    const estimatedTotalTime = 300000;
    const timePerPercent = estimatedTotalTime / 100;
    const remainingTime = (100 - progress) * timePerPercent;
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    if (minutes === 0) return `~${seconds}s restantes`;
    return `~${minutes}m ${seconds}s restantes`;
  };

  // Mapa de nomes amigáveis para cada fase do pipeline
  const stageLabels: Record<string, string> = {
    queued: 'Na fila',
    extraction: 'Extraindo texto',
    analysis: 'Analisando contrato',
    mapping: 'Gerando mapeamento',
    risks: 'Avaliando riscos',
    clauses: 'Gerando cláusulas',
    action_plan: 'Criando plano de ação',
    reports: 'Gerando relatório',
    completed: 'Concluída',
  };

  const getStatusBadge = (status: string, progress?: number) => {
    const stage = (analysis as any)?.stage || 'queued';
    const stageLabel = stageLabels[stage] || stage;

    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pendente</Badge>;
      case 'queued':
        return (
          <div className="space-y-2">
            <Badge className="bg-amber-500 gap-1"><Clock className="w-3 h-3" />Na fila</Badge>
          </div>
        );
      case 'analyzing': {
        const estimatedTime = progress !== undefined ? calculateEstimatedTime(progress) : '';
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500 gap-1"><RefreshCw className="w-3 h-3 animate-spin" />{stageLabel}</Badge>
            </div>
            {progress !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">{progress}%</span>
                  {estimatedTime && <span className="text-xs text-muted-foreground">{estimatedTime}</span>}
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        );
      }
      case 'completed':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="w-3 h-3" />Concluída</Badge>;
      case 'reviewed':
        return <Badge className="bg-purple-500 gap-1"><Eye className="w-3 h-3" />Revisada</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-600 gap-1"><Shield className="w-3 h-3" />Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Rejeitada</Badge>;
      case 'error':
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Erro na Análise</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChecklistIcon = (status: string) => {
    switch (status) {
      case 'sim':
        return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100"><Check className="w-5 h-5 text-green-600" /></div>;
      case 'nao':
        return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100"><X className="w-5 h-5 text-red-600" /></div>;
      case 'parcial':
        return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100"><Minus className="w-5 h-5 text-yellow-600" /></div>;
      default:
        return null;
    }
  };

  const getRiskLevelBadge = (level: string) => {
    return (
      <Badge className={`${level === '1' ? 'bg-red-600' : level === '2' ? 'bg-orange-500' : level === '3' ? 'bg-yellow-500 text-black' : level === '4' ? 'bg-blue-500' : 'bg-green-500'}`}>
        {riskLabels[level] || level}
      </Badge>
    );
  };

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-muted-foreground font-light">Carregando análise...</p>
        </div>
      </div>
    );
  }

  const pipelineStage = (analysis as any).stage || (analysis as any).workflowStage || (analysis as any).pipelineStage || null;
  const pipelineStageProgress = (analysis as any).stageProgress ?? (analysis as any).pipelineProgress ?? (analysis as any).progress ?? 0;
  const pipelineStageLabel = stageLabel(pipelineStage);
  const isProcessingPipeline = !["completed","reviewed","approved","rejected","error","failed"].includes(String(analysis.contractAnalysisStatus || "").toLowerCase());

  const fullResults = (fullResultsQuery?.data as any) || null;
  const manifest = fullResults?.manifest || null;

  const mapItems = fullResults?.mapItems || [];
  const checklistItems = fullResults?.checklistItems || [];
  const riskItems = fullResults?.riskItems || [];
  const clauseItems = fullResults?.clauses || [];
  const actionPlansItems = fullResults?.actionPlans || [];
  const governanceMetadata = fullResults?.governanceMetadata || null;
  const riskClusters = governanceMetadata?.clusters || [];
  const riskScore = governanceMetadata?.riskScore ?? null;
  const riskLevel = governanceMetadata?.riskLevel ?? null;
  const overlaysV4 = governanceMetadata?.overlaysV4 || null;

  return (
    <>
      <div className="space-y-8 text-black force-text-black">
        {/* Header - Visual Law Style */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-emerald-600">
            Análise Contratual LGPD
          </p>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              <Link href="/analise-contratos">
                <Button variant="ghost" size="icon" className="hover:bg-emerald-100">
                  <ArrowLeft className="w-5 h-5 text-emerald-600" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-extralight tracking-tight text-foreground">
                  {analysis.contractName}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  {getStatusBadge(analysis.contractAnalysisStatus, analysis.progress)}
                  {analysis.complianceScore !== null && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`w-4 h-4 ${
                        analysis.complianceScore >= 80 ? 'text-green-600' :
                        analysis.complianceScore >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`} />
                      <span className={`font-bold text-lg ${
                        analysis.complianceScore >= 80 ? 'text-green-600' :
                        analysis.complianceScore >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {analysis.complianceScore}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botões simplificados - ações principais agora estão no Workflow Stepper */}
            {isConsultant && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRefineOpen(true)}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  disabled={isProcessingPipeline}
                  title={isProcessingPipeline ? "Disponível após conclusão do pipeline" : ""}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Refinar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReviewOpen(true)}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  disabled={isProcessingPipeline}
                  title={isProcessingPipeline ? "Disponível após conclusão do pipeline" : ""}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Revisar
                </Button>
                {/* Botões movidos para o Workflow Stepper */}
              </div>
            )}
            
            {/* Botões disponíveis para cliente */}
            {!isConsultant && (
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={handleExportPdf}
                  disabled={exportPdfMutation.isPending}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
                >
                  {exportPdfMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </>
                  )}
                </Button>
                {existingActions && existingActions.length > 0 && (
                  <Link href={`/analise-contratos/${analysisId}/plano-acao`}>
                    <Button variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50">
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Ver Plano de Ação
                      <Badge className="ml-2 bg-violet-100 text-violet-700">{existingActions.length}</Badge>
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Workflow Stepper - Fluxo Visual Canva-Style */}
        {isConsultant && (
          <ContractWorkflowStepper
            currentStep={currentWorkflowStep}
            stepStatuses={workflowStatuses}
            stepCounts={workflowCounts}
            isConsultant={isConsultant}
            pipelineStageLabel={pipelineStageLabel}
            pipelineProgress={pipelineStageProgress}
            compliancePercent={analysis.complianceScore ?? null}
            isProcessingPipeline={isProcessingPipeline}
            onStepClick={handleWorkflowStepClick}
            onStepAction={handleWorkflowAction}
            isLoading={{
              action_plan: generateActionPlanMutation.isPending,
              clauses: generateLgpdClausesMutation.isPending,
              reports: exportPdfMutation.isPending,
            }}
          />
        )}

        {/* Cabeçalho Compacto para Abas Secundárias */}
        {showCompactHeader && (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-emerald-50/30">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-slate-800">{analysis.contractName}</span>
                  </div>
                  <div className="h-4 w-px bg-slate-300" />
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {map?.contractingParty && (
                      <span><span className="text-xs uppercase tracking-wide">Contratante:</span> {map.contractingParty}</span>
                    )}
                    {map?.contractedParty && (
                      <span><span className="text-xs uppercase tracking-wide">Contratada:</span> {map.contractedParty}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(analysis.contractAnalysisStatus, analysis.progress)}
                  {analysis.complianceScore !== null && (
                    <Badge variant="outline" className={`${
                      analysis.complianceScore >= 80 ? 'border-green-500 text-green-700' :
                      analysis.complianceScore >= 60 ? 'border-yellow-500 text-yellow-700' :
                      'border-red-500 text-red-700'
                    }`}>
                      {analysis.complianceScore}%
                    </Badge>
                  )}
                </div>
              </div>
              {map?.contractObject && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                  <span className="uppercase tracking-wide">Objeto:</span> {map.contractObject}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resumo Executivo em Duas Colunas com Gráfico Radar */}
        {analysis.executiveSummary && !showCompactHeader && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/30">
            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-light text-black">Resumo Executivo</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-5 gap-6">
                {/* Coluna Esquerda - Resumo do Contrato (2 colunas) */}
                <div className="md:col-span-2 space-y-4">
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed font-light text-sm">{analysis.executiveSummary}</p>
                  
                  {/* Informações do Contrato */}
                  {map && (
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                      <div className="p-3 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground">Tipo</label>
                        <p className="text-sm font-light truncate">{map.contractType || '-'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground">Papel LGPD</label>
                        <p className="text-sm font-light truncate">{map.agentType || '-'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground">Contratante</label>
                        <p className="text-sm font-light truncate">{map.contractingParty || '-'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground">Contratada</label>
                        <p className="text-sm font-light truncate">{map.contractedParty || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Coluna Direita - Gráfico Radar Ampliado (3 colunas) */}
                <div className="md:col-span-3 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/50 rounded-2xl p-6 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">Análise por Área</span>
                    </div>
                    <Badge variant="outline" className="text-xs border-emerald-300 text-black">
                      {analysis.complianceScore}% Conformidade
                    </Badge>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                        <PolarGrid stroke="#d1fae5" strokeWidth={1} />
                        <PolarAngleAxis 
                          dataKey="area" 
                          tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }} 
                          tickLine={false}
                        />
                        <PolarRadiusAxis 
                          angle={30} 
                          domain={[0, 5]} 
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          axisLine={false}
                        />
                        <Radar
                          name="Conformidade"
                          dataKey="score"
                          stroke="#059669"
                          strokeWidth={2}
                          fill="url(#radarGradient)"
                          fillOpacity={0.6}
                          dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, fill: '#10b981' }}
                        />
                        <defs>
                          <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #d1fae5',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: number) => [`${value.toFixed(1)} / 5`, 'Score']}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards de Riscos - Visual Law Style (apenas na tela principal) */}
        {!showCompactHeader && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card 
            className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${analysis.criticalRisks > 0 ? 'ring-2 ring-red-500' : ''} bg-gradient-to-br from-white to-red-50/30`}
            onClick={() => setActiveTab('risks')}
          >
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg w-fit mx-auto mb-3">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <p className="text-3xl font-extralight tracking-tight text-red-700">{String(analysis.criticalRisks).padStart(2, '0')}</p>
              <p className="text-[0.65rem] font-medium tracking-[0.15em] uppercase text-muted-foreground mt-1">CRÍTICOS</p>
            </CardContent>
          </Card>

          <Card 
            className={`border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${analysis.highRisks > 0 ? 'ring-2 ring-orange-500' : ''} bg-gradient-to-br from-white to-orange-50/30`}
            onClick={() => setActiveTab('risks')}
          >
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg w-fit mx-auto mb-3">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <p className="text-3xl font-extralight tracking-tight text-orange-700">{String(analysis.highRisks).padStart(2, '0')}</p>
              <p className="text-[0.65rem] font-medium tracking-[0.15em] uppercase text-muted-foreground mt-1">ALTOS</p>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-white to-yellow-50/30"
            onClick={() => setActiveTab('risks')}
          >
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg w-fit mx-auto mb-3">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <p className="text-3xl font-extralight tracking-tight text-yellow-700">{String(analysis.mediumRisks).padStart(2, '0')}</p>
              <p className="text-[0.65rem] font-medium tracking-[0.15em] uppercase text-muted-foreground mt-1">MÉDIOS</p>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-white to-blue-50/30"
            onClick={() => setActiveTab('risks')}
          >
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg w-fit mx-auto mb-3">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <p className="text-3xl font-extralight tracking-tight text-blue-700">{String(analysis.lowRisks).padStart(2, '0')}</p>
              <p className="text-[0.65rem] font-medium tracking-[0.15em] uppercase text-muted-foreground mt-1">BAIXOS</p>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-white to-green-50/30"
            onClick={() => setActiveTab('risks')}
          >
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg w-fit mx-auto mb-3">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <p className="text-3xl font-extralight tracking-tight text-green-700">{String(analysis.veryLowRisks).padStart(2, '0')}</p>
              <p className="text-[0.65rem] font-medium tracking-[0.15em] uppercase text-muted-foreground mt-1">MUITO BAIXOS</p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Visões: Simplificada (clientes) e Completa (consultores) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Seletor principal de visão */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("simplified")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  ["simplified"].includes(activeTab)
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Visão Simplificada
              </button>
              <button
                onClick={() => setActiveTab("charts")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  !["simplified"].includes(activeTab)
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Visão Completa
              </button>
            </div>
            <span className="text-xs text-gray-400 ml-2">
              {["simplified"].includes(activeTab)
                ? "Resultados em linguagem acessível para o cliente"
                : "Dados técnicos completos para consultores"}
            </span>
          </div>

          {/* Sub-abas da Visão Completa */}
          {!["simplified"].includes(activeTab) && (
            <TabsList className="grid w-full grid-cols-8 bg-emerald-50 mb-2">
              <TabsTrigger value="charts" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">Gráficos</TabsTrigger>
              <TabsTrigger value="map" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">Mapa</TabsTrigger>
              <TabsTrigger value="checklist" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">Checklist</TabsTrigger>
              <TabsTrigger value="risks" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs">Riscos</TabsTrigger>
              <TabsTrigger value="clauses" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs">
                Cláusulas
                {lgpdClausesResult?.clausulas && lgpdClausesResult.clausulas.length > 0 && (
                  <Badge className="ml-1 bg-blue-500 text-white text-[10px] px-1 py-0">{lgpdClausesResult.clausulas.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="actionplan" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-xs">
                Plano
                {existingActions && existingActions.length > 0 && (
                  <Badge className="ml-1 bg-violet-500 text-white text-[10px] px-1 py-0">{existingActions.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="mapeamentos" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white text-xs">
                Mapeamentos
                {linkedMapeamentos && linkedMapeamentos.length > 0 && (
                  <Badge className="ml-1 bg-teal-500 text-white text-[10px] px-1 py-0">{linkedMapeamentos.length}</Badge>
                )}
              </TabsTrigger>
              {thirdPartyData ? (
                <TabsTrigger value="thirdparty" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-xs">
                  Terceiro
                </TabsTrigger>
              ) : isConsultant ? (
                <TabsTrigger value="evidence" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs">
                  Rastreabilidade
                </TabsTrigger>
              ) : null}
            </TabsList>
          )}

          {/* Visão Simplificada - Framework Seusdados */}
          <TabsContent value="simplified" className="space-y-6">
            <SimplifiedView
              complianceScore={dppaData?.complianceScore ?? (analysis?.complianceScore ?? null)}
              executiveSummary={dppaData?.executiveSummaryLay ?? (analysis?.executiveSummary ?? null)}
              problems={dppaData?.problems ?? []}
              solutions={dppaData?.solutions ?? []}
              clauses={dppaData?.clauses ?? []}
              checklistVersion={dppaData?.checklistVersion ?? null}
              isConsultant={isConsultant}
              onClauseAcceptance={(clauseId, accepted) => {
                handleClauseAcceptance(clauseId, accepted);
              }}
              onClauseCopy={(clauseId, content) => {
                toast.success('Cláusula copiada para a área de transferência');
              }}
              onDownloadAll={handleDownloadAllClauses}
              onExportLetter={() => {
                exportLetterMutation.mutate({ analysisId });
              }}
              isLoading={isLoadingDPPA}
              isExporting={exportLetterMutation.isPending}
              contractName={analysis?.contractName || analysis?.name || 'Contrato'}
              organizationName={(analysis as any)?.organizationName || ''}
              risks={riskItems.map((r: any) => ({
                riskId: r.id,
                title: r.title || r.description || 'Risco sem título',
                severity: (r.severity || 'medio').toLowerCase(),
                decision: r.riskDecision || null,
                notes: r.decisionNotes || null,
                frameworkModule: r.frameworkModule || undefined,
              }))}
              onRiskDecision={(riskId, decision, notes) => {
                saveRiskDecisionMutation.mutate({ riskId, decision, decisionNotes: notes });
              }}
              isSavingDecision={saveRiskDecisionMutation?.isPending}
            />
          </TabsContent>

          {/* Gráficos */}
          <TabsContent value="charts" className="space-y-6">
            {/* FIDELIDADE: charts (dados reais do backend) */}
            {(riskItems?.length ?? 0) === 0 && !isProcessingPipeline && analysis?.contractAnalysisStatus === "completed" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-4">
                Esta seção não possui dados persistidos para esta análise. Isso indica que a etapa não foi gerada corretamente.
                {manifest && (
                  <div className="mt-1 text-xs text-amber-700">
                    (Manifest: charts) mapa={manifest?.mapCount ?? 0} checklist={manifest?.checklistCount ?? 0} riscos={manifest?.riskCount ?? 0} clausulas={manifest?.clauseCount ?? 0} acoes={manifest?.actionPlanCount ?? 0}
                  </div>
                )}
              </div>
            )}
            <PipelineStageGate
              requiredStage="risks"
              currentStage={pipelineStage}
              stageProgress={pipelineStageProgress}
              overallProgress={analysis?.progress ?? null}
              title="Aguardando geração de riscos"
              hint="Os gráficos dependem da etapa de Riscos. O pipeline está gerando automaticamente."
            >

            <div className="grid md:grid-cols-2 gap-6">
              {/* Gráfico de Pizza - Distribuição de Riscos */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                      <PieChartIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-light">Distribuição de Riscos</CardTitle>
                      <CardDescription className="font-light">Proporção por nível de criticidade</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskDistributionData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {riskDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Pizza - Checklist */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-light">Conformidade do Checklist</CardTitle>
                      <CardDescription className="font-light">Status dos 10 itens de verificação</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={checklistData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {checklistData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico Radar removido - já exibido no Resumo Executivo */}
            </div>
          
            </PipelineStageGate>
</TabsContent>

          {/* Mapa de Análise - Evidências ao lado de cada campo */}
          <TabsContent value="map" className="space-y-4">
            {/* FIDELIDADE: mapping (dados reais do backend) */}
            {(mapItems?.length ?? 0) === 0 && !isProcessingPipeline && analysis?.contractAnalysisStatus === "completed" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-4">
                Esta seção não possui dados persistidos para esta análise. Isso indica que a etapa não foi gerada corretamente.
                {manifest && (
                  <div className="mt-1 text-xs text-amber-700">
                    (Manifest: mapping) mapa={manifest?.mapCount ?? 0} checklist={manifest?.checklistCount ?? 0} riscos={manifest?.riskCount ?? 0} clausulas={manifest?.clauseCount ?? 0} acoes={manifest?.actionPlanCount ?? 0}
                  </div>
                )}
              </div>
            )}
            <PipelineStageGate
              requiredStage="mapping"
              currentStage={pipelineStage}
              stageProgress={pipelineStageProgress}
              overallProgress={analysis?.progress ?? null}
              title="Aguardando mapa de análise"
              hint="O pipeline está produzindo o mapa automaticamente. Assim que concluir, esta aba será preenchida."
            >

            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-light">Mapa de Análise</CardTitle>
                    <CardDescription className="font-light">
                      Passe o mouse em <span className="font-medium">Prova</span> para ver o trecho do contrato e copie com 1 clique.
                    </CardDescription>
                  </div>
                  {isConsultant && (
                    <Button
                      onClick={() => {
                        if (!mapDraft) return;
                        const payload: any = { analysisId };
                        // envia apenas campos esperados pelo backend
                        const allowed = [
                          "partnerName","contractType","contractingParty","contractedParty","agentType","agentTypeJustification",
                          "contractObject","startDate","endDate","commonData","commonDataLargeScale","sensitiveData","sensitiveDataLargeScale",
                          "hasElderlyData","elderlyDataDetails","hasMinorData","minorDataDetails","titularRightsStatus","titularRightsDetails",
                          "dataEliminationStatus","dataEliminationDetails","legalRisks","securityRisks","hasProtectionClause","protectionClauseDetails",
                          "suggestedClause","actionStatus","actionPlan","suggestedDeadline",
                        ];
                        for (const k of allowed) {
                          if (k in mapDraft) payload[k] = mapDraft[k];
                        }
                        updateMapMutation.mutate(payload);
                      }}
                      disabled={updateMapMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {updateMapMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                      Salvar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {!mapDraft ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-light">Mapa não disponível</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Tipo de contrato</label>
                          <EvidenceHover
                            label="Prova"
                            excerpt={evidenceIndex.get("contractType")?.excerpt || null}
                            clauseRef={evidenceIndex.get("contractType")?.clauseRef || null}
                            confidence={evidenceIndex.get("contractType")?.confidence || null}
                            note={evidenceIndex.get("contractType")?.note || null}
                          />
                        </div>
                        <Input
                          value={mapDraft.contractType || ""}
                          onChange={(e) => setMapDraft((p: any) => ({ ...p, contractType: e.target.value }))}
                          disabled={!isConsultant}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Contraparte / parceiro</label>
                          <EvidenceHover
                            label="Prova"
                            excerpt={evidenceIndex.get("partnerName")?.excerpt || null}
                            clauseRef={evidenceIndex.get("partnerName")?.clauseRef || null}
                            confidence={evidenceIndex.get("partnerName")?.confidence || null}
                            note={evidenceIndex.get("partnerName")?.note || null}
                          />
                        </div>
                        <Input
                          value={mapDraft.partnerName || ""}
                          onChange={(e) => setMapDraft((p: any) => ({ ...p, partnerName: e.target.value }))}
                          disabled={!isConsultant}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Papel LGPD (agente)</label>
                          <EvidenceHover
                            label="Prova"
                            excerpt={evidenceIndex.get("agentType")?.excerpt || null}
                            clauseRef={evidenceIndex.get("agentType")?.clauseRef || null}
                            confidence={evidenceIndex.get("agentType")?.confidence || null}
                            note={evidenceIndex.get("agentType")?.note || null}
                          />
                        </div>
                        <Select
                          value={mapDraft.agentType || ""}
                          onValueChange={(v) => setMapDraft((p: any) => ({ ...p, agentType: v }))}
                          disabled={!isConsultant}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="controlador">Controlador</SelectItem>
                            <SelectItem value="operador">Operador</SelectItem>
                            <SelectItem value="suboperador">Suboperador</SelectItem>
                            <SelectItem value="corresponsavel">Corresponsável</SelectItem>
                            <SelectItem value="nao_definido">Não definido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Vigência</label>
                          <EvidenceHover
                            label="Prova"
                            excerpt={evidenceIndex.get("startDate")?.excerpt || evidenceIndex.get("endDate")?.excerpt || null}
                            clauseRef={evidenceIndex.get("startDate")?.clauseRef || evidenceIndex.get("endDate")?.clauseRef || null}
                            confidence={evidenceIndex.get("startDate")?.confidence || evidenceIndex.get("endDate")?.confidence || null}
                            note={evidenceIndex.get("startDate")?.note || evidenceIndex.get("endDate")?.note || null}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Início"
                            value={mapDraft.startDate || ""}
                            onChange={(e) => setMapDraft((p: any) => ({ ...p, startDate: e.target.value }))}
                            disabled={!isConsultant}
                          />
                          <Input
                            placeholder="Fim"
                            value={mapDraft.endDate || ""}
                            onChange={(e) => setMapDraft((p: any) => ({ ...p, endDate: e.target.value }))}
                            disabled={!isConsultant}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Objeto do contrato</label>
                        <EvidenceHover
                          label="Prova"
                          excerpt={evidenceIndex.get("contractObject")?.excerpt || null}
                          clauseRef={evidenceIndex.get("contractObject")?.clauseRef || null}
                          confidence={evidenceIndex.get("contractObject")?.confidence || null}
                          note={evidenceIndex.get("contractObject")?.note || null}
                        />
                      </div>
                      <Textarea
                        value={mapDraft.contractObject || ""}
                        onChange={(e) => setMapDraft((p: any) => ({ ...p, contractObject: e.target.value }))}
                        disabled={!isConsultant}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Dados pessoais comuns</label>
                          <EvidenceHover
                            label="Prova"
                            excerpt={evidenceIndex.get("commonData")?.excerpt || null}
                            clauseRef={evidenceIndex.get("commonData")?.clauseRef || null}
                            confidence={evidenceIndex.get("commonData")?.confidence || null}
                            note={evidenceIndex.get("commonData")?.note || null}
                          />
                        </div>
                        <Textarea
                          value={mapDraft.commonData || ""}
                          onChange={(e) => setMapDraft((p: any) => ({ ...p, commonData: e.target.value }))}
                          disabled={!isConsultant}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Dados sensíveis</label>
                          <EvidenceHover
                            label="Prova"
                            excerpt={evidenceIndex.get("sensitiveData")?.excerpt || null}
                            clauseRef={evidenceIndex.get("sensitiveData")?.clauseRef || null}
                            confidence={evidenceIndex.get("sensitiveData")?.confidence || null}
                            note={evidenceIndex.get("sensitiveData")?.note || null}
                          />
                        </div>
                        <Textarea
                          value={mapDraft.sensitiveData || ""}
                          onChange={(e) => setMapDraft((p: any) => ({ ...p, sensitiveData: e.target.value }))}
                          disabled={!isConsultant}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Direitos dos titulares</label>
                          <EvidenceHover
                            label="Prova"
                            excerpt={evidenceIndex.get("titularRightsStatus")?.excerpt || evidenceIndex.get("titularRightsDetails")?.excerpt || null}
                            clauseRef={evidenceIndex.get("titularRightsStatus")?.clauseRef || evidenceIndex.get("titularRightsDetails")?.clauseRef || null}
                            confidence={evidenceIndex.get("titularRightsStatus")?.confidence || evidenceIndex.get("titularRightsDetails")?.confidence || null}
                            note={evidenceIndex.get("titularRightsStatus")?.note || evidenceIndex.get("titularRightsDetails")?.note || null}
                          />
                        </div>
                        <Textarea
                          value={mapDraft.titularRightsDetails || mapDraft.titularRightsStatus || ""}
                          onChange={(e) => setMapDraft((p: any) => ({ ...p, titularRightsDetails: e.target.value }))}
                          disabled={!isConsultant}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Eliminação / devolução</label>
                          <EvidenceHover
                            label="Prova"
                            excerpt={evidenceIndex.get("dataEliminationStatus")?.excerpt || evidenceIndex.get("dataEliminationDetails")?.excerpt || null}
                            clauseRef={evidenceIndex.get("dataEliminationStatus")?.clauseRef || evidenceIndex.get("dataEliminationDetails")?.clauseRef || null}
                            confidence={evidenceIndex.get("dataEliminationStatus")?.confidence || evidenceIndex.get("dataEliminationDetails")?.confidence || null}
                            note={evidenceIndex.get("dataEliminationStatus")?.note || evidenceIndex.get("dataEliminationDetails")?.note || null}
                          />
                        </div>
                        <Textarea
                          value={mapDraft.dataEliminationDetails || mapDraft.dataEliminationStatus || ""}
                          onChange={(e) => setMapDraft((p: any) => ({ ...p, dataEliminationDetails: e.target.value }))}
                          disabled={!isConsultant}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          
            </PipelineStageGate>
</TabsContent>

          {/* Mapa de Análise Legacy - Oculto */}
          <TabsContent value="map-legacy" className="space-y-4 hidden">
            {map ? (
              <div className="grid gap-4">
                {/* Seção 1: Identificação */}
                <Card className="border-0 shadow-sm">
                  <CardHeader 
                    className="cursor-pointer hover:bg-emerald-50/50 transition-colors"
                    onClick={() => toggleSection('identification')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">1</div>
                        <CardTitle className="text-lg font-light">Identificação do Contrato</CardTitle>
                      </div>
                      {expandedSections['identification'] ? <ChevronUp className="text-emerald-600" /> : <ChevronDown className="text-emerald-600" />}
                    </div>
                  </CardHeader>
                  {expandedSections['identification'] && (
                    <CardContent className="grid md:grid-cols-2 gap-4 pt-0">
                      <div className="p-4 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Tipo de Contrato</label>
                        <p className="mt-1 font-light">{map.contractType || '-'}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Parceiro Comercial</label>
                        <p className="mt-1 font-light">{map.partnerName || '-'}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Parte Contratante</label>
                        <p className="mt-1 font-light">{map.contractingParty || '-'}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Parte Contratada</label>
                        <p className="mt-1 font-light">{map.contractedParty || '-'}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 md:col-span-2 text-slate-900">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Objeto do Contrato</label>
                        <p className="mt-1 font-light">{map.contractObject || '-'}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Vigência</label>
                        <p className="mt-1 font-light">{map.startDate && map.endDate ? `${map.startDate} a ${map.endDate}` : '-'}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Seção 2: Tratamento de Dados */}
                <Card className="border-0 shadow-sm">
                  <CardHeader 
                    className="cursor-pointer hover:bg-emerald-50/50 transition-colors"
                    onClick={() => toggleSection('dataProcessing')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">2</div>
                        <CardTitle className="text-lg font-light">Tratamento de Dados Pessoais</CardTitle>
                      </div>
                      {expandedSections['dataProcessing'] ? <ChevronUp className="text-emerald-600" /> : <ChevronDown className="text-emerald-600" />}
                    </div>
                  </CardHeader>
                  {expandedSections['dataProcessing'] && (
                    <CardContent className="grid md:grid-cols-2 gap-4 pt-0">
                      <div className="p-4 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Dados Comuns (Art. 5, I)</label>
                        <p className="mt-1 font-light">{map.commonData || '-'}</p>
                        {map.commonDataLargeScale && <Badge className="mt-2 bg-amber-500">Larga Escala</Badge>}
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Dados Sensíveis (Art. 5, II)</label>
                        <p className="mt-1 font-light">{map.sensitiveData || '-'}</p>
                        {map.sensitiveDataLargeScale && <Badge className="mt-2 bg-red-500">Larga Escala</Badge>}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Seção 3: Papel na LGPD */}
                <Card className="border-0 shadow-sm">
                  <CardHeader 
                    className="cursor-pointer hover:bg-emerald-50/50 transition-colors"
                    onClick={() => toggleSection('roles')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">3</div>
                        <CardTitle className="text-lg font-light">Papel na LGPD</CardTitle>
                      </div>
                      {expandedSections['roles'] ? <ChevronUp className="text-emerald-600" /> : <ChevronDown className="text-emerald-600" />}
                    </div>
                  </CardHeader>
                  {expandedSections['roles'] && (
                    <CardContent className="grid md:grid-cols-2 gap-4 pt-0">
                      <div className="p-4 rounded-lg bg-slate-50 text-slate-900">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Tipo de Agente</label>
                        <div className="mt-2">
                          <EvidenceHover
                            label="Prova"
                            excerpt={evidenceIndex.get('agentType')?.excerpt || evidenceIndex.get('lgpdAgentType')?.excerpt}
                            clauseRef={evidenceIndex.get('agentType')?.clauseRef || evidenceIndex.get('lgpdAgentType')?.clauseRef}
                            confidence={evidenceIndex.get('agentType')?.confidence || evidenceIndex.get('lgpdAgentType')?.confidence}
                            note={evidenceIndex.get('agentType')?.note || evidenceIndex.get('lgpdAgentType')?.note}
                          />
                        </div>
                        <p className="mt-1 font-light capitalize">{map.agentType || '-'}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 md:col-span-2 text-slate-900">
                        <label className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Justificativa da Classificação</label>
                        <div className="mt-2">
                          <EvidenceHover
                            label="Prova"
                            excerpt={evidenceIndex.get('agentTypeJustification')?.excerpt}
                            clauseRef={evidenceIndex.get('agentTypeJustification')?.clauseRef}
                            confidence={evidenceIndex.get('agentTypeJustification')?.confidence}
                            note={evidenceIndex.get('agentTypeJustification')?.note}
                          />
                        </div>
                        <p className="mt-1 font-light">{map.agentTypeJustification || '-'}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Demais seções seguem o mesmo padrão... */}
                {/* Seção 4-9 com mesmo estilo visual */}
              </div>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-16 text-center text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-light text-lg">Mapa de análise não disponível</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Checklist - Evidências + edição */}
          <TabsContent value="checklist" className="space-y-4">
            {/* FIDELIDADE: checklist (dados reais do backend) */}
            {(checklistItems?.length ?? 0) === 0 && !isProcessingPipeline && analysis?.contractAnalysisStatus === "completed" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-4">
                Esta seção não possui dados persistidos para esta análise. Isso indica que a etapa não foi gerada corretamente.
                {manifest && (
                  <div className="mt-1 text-xs text-amber-700">
                    (Manifest: checklist) mapa={manifest?.mapCount ?? 0} checklist={manifest?.checklistCount ?? 0} riscos={manifest?.riskCount ?? 0} clausulas={manifest?.clauseCount ?? 0} acoes={manifest?.actionPlanCount ?? 0}
                  </div>
                )}
              </div>
            )}
            <PipelineStageGate
              requiredStage="analysis"
              currentStage={pipelineStage}
              stageProgress={pipelineStageProgress}
              overallProgress={analysis?.progress ?? null}
              title="Aguardando checklist"
              hint="O checklist fica disponível após a etapa de Análise. O pipeline está processando automaticamente."
            >

            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-light">Checklist de Conformidade</CardTitle>
                    <CardDescription className="font-light">
                      Cada item pode ser expandido para ver a evidência extraída do contrato e a prova de busca.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Sim: {(resultsChecklist || []).filter((it: any) => it.checklistStatus === 'sim').length}</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Parcial: {(resultsChecklist || []).filter((it: any) => it.checklistStatus === 'parcial').length}</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Não: {(resultsChecklist || []).filter((it: any) => it.checklistStatus === 'nao').length}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <Accordion type="multiple" className="space-y-2">
                  {(resultsChecklist || []).map((it: any) => {
                    const checklistFieldByItem: Record<number, string[]> = {
                      1: ["legalBases", "legalBasis"],
                      2: ["agentType"],
                      3: ["subprocessors", "subcontracting"],
                      4: ["internationalTransfer", "transferInternational"],
                      5: ["securityMeasures", "security"],
                      6: ["incidentNotification", "incidentResponse"],
                      7: ["auditRights"],
                      8: ["retention", "retentionPeriod"],
                      9: ["dataSubjectRights", "rights"],
                      10: ["deletion", "dataElimination"],
                    };
                    const fields = checklistFieldByItem[it.itemNumber] || [];
                    const ev = fields.map((f) => evidenceIndex.get(f)).find(Boolean) as any;
                    const statusColor = it.checklistStatus === 'sim' ? 'bg-green-100 border-green-300 text-green-800' : it.checklistStatus === 'parcial' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-red-100 border-red-300 text-red-800';
                    const statusIcon = it.checklistStatus === 'sim' ? '\u2713' : it.checklistStatus === 'parcial' ? '\u25CB' : '\u2717';
                    const statusText = it.checklistStatus === 'sim' ? 'Sim' : it.checklistStatus === 'parcial' ? 'Parcial' : 'Não';

                    return (
                      <AccordionItem key={it.id ?? it.itemNumber} value={`checklist-${it.itemNumber}`} className="border rounded-lg overflow-hidden">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-3 w-full">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${statusColor}`}>
                              {statusIcon}
                            </span>
                            <span className="text-sm font-medium text-slate-700 flex-1 text-left">
                              {it.itemNumber}. {it.question}
                            </span>
                            <div className="flex items-center gap-2 mr-4">
                              {isConsultant ? (
                                <Select
                                  value={it.checklistStatus}
                                  onValueChange={(v) => {
                                    updateChecklistItemMutation.mutate({ id: it.id, status: v as any, observations: it.observations || undefined, analysisId });
                                  }}
                                >
                                  <SelectTrigger className="h-7 min-w-[100px] text-xs" onClick={(e) => e.stopPropagation()}>
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sim">Sim</SelectItem>
                                    <SelectItem value="parcial">Parcial</SelectItem>
                                    <SelectItem value="nao">Não</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline" className={`capitalize text-xs ${statusColor}`}>{statusText}</Badge>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Coluna esquerda: Evidência e Prova de Busca */}
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Evidência do Contrato</h4>
                                {(ev?.excerpt || it.contractExcerpt) ? (
                                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-900 border border-slate-200">
                                    <p className="italic font-light">"{ev?.excerpt || it.contractExcerpt}"</p>
                                    {ev?.clauseRef && (
                                      <p className="text-xs text-slate-500 mt-2">Referência: {ev.clauseRef}</p>
                                    )}
                                    {typeof ev?.confidence === 'number' && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.round(ev.confidence * 100)}%` }} />
                                        </div>
                                        <span className="text-xs text-slate-500">{Math.round(ev.confidence * 100)}% confiança</span>
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 text-xs mt-2"
                                      onClick={async () => {
                                        const text = [ev?.clauseRef ? `Ref.: ${ev.clauseRef}` : null, ev?.excerpt || it.contractExcerpt].filter(Boolean).join('\n');
                                        await navigator.clipboard.writeText(text);
                                        toast.success('Trecho copiado');
                                      }}
                                    >
                                      <Copy className="w-3 h-3 mr-1" /> Copiar trecho
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700 border border-amber-200">
                                    <p className="font-light">Nenhuma evidência direta encontrada no texto contratual.</p>
                                    <p className="text-xs mt-1 text-amber-600">Prova de busca: O sistema analisou o documento completo e não localizou cláusula ou trecho que aborde este item.</p>
                                  </div>
                                )}
                              </div>
                              {ev?.note && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nota da Análise</h4>
                                  <p className="text-sm text-slate-600 font-light">{ev.note}</p>
                                </div>
                              )}
                            </div>
                            {/* Coluna direita: Observações e Responsável */}
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Observações</h4>
                                {isConsultant ? (
                                  <Textarea
                                    defaultValue={it.observations || ""}
                                    placeholder="Adicione observações sobre este item..."
                                    className="min-h-[80px] text-sm"
                                    onBlur={(e) =>
                                      updateChecklistItemMutation.mutate({ id: it.id, status: it.status, observations: e.target.value || undefined, analysisId })
                                    }
                                  />
                                ) : (
                                  <div className="text-sm text-slate-900 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border">{it.observations || "Sem observações"}</div>
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Responsável</h4>
                                <Select
                                  value={(() => {
                                    const localVal = localResponsibles[`checklist_${it.id}`];
                                    if (localVal !== undefined) return localVal ? String(localVal) : '';
                                    return it.responsibleId ? String(it.responsibleId) : '';
                                  })()}
                                  onValueChange={(v) => {
                                    const userId = parseInt(v);
                                    const selectedUser = orgUsers?.find((u: any) => u.id === userId);
                                    setLocalResponsibles(prev => ({ ...prev, [`checklist_${it.id}`]: userId }));
                                    updateChecklistItemMutation.mutate({
                                      id: it.id,
                                      responsibleId: userId,
                                      responsibleName: selectedUser?.name || selectedUser?.email || '',
                                      analysisId: analysisId,
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-9 text-sm font-light">
                                    <SelectValue placeholder="Selecione o responsável" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(orgUsers || []).map((u: any) => (
                                      <SelectItem key={u.id} value={String(u.id)}>
                                        {u.name || u.email}
                                      </SelectItem>
                                    ))}
                                    {(!orgUsers || orgUsers.length === 0) && (
                                      <SelectItem value="_empty" disabled>Nenhum usuário vinculado</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs w-full"
                                type="button"
                                onClick={() => {
                                  toast.info('Utilize a aba Plano de Ação para gerenciar evidências');
                                }}
                              >
                                <Paperclip className="w-3 h-3 mr-1" />
                                Anexar Evidência
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          
            </PipelineStageGate>
</TabsContent>

          {/* Matriz de Riscos - Evidências + edição */}
          <TabsContent value="risks" className="space-y-4">
            {/* FIDELIDADE: risks (dados reais do backend) */}
            {(riskItems?.length ?? 0) === 0 && !isProcessingPipeline && analysis?.contractAnalysisStatus === "completed" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-4">
                Esta seção não possui dados persistidos para esta análise. Isso indica que a etapa não foi gerada corretamente.
                {manifest && (
                  <div className="mt-1 text-xs text-amber-700">
                    (Manifest: risks) mapa={manifest?.mapCount ?? 0} checklist={manifest?.checklistCount ?? 0} riscos={manifest?.riskCount ?? 0} clausulas={manifest?.clauseCount ?? 0} acoes={manifest?.actionPlanCount ?? 0}
                  </div>
                )}
              </div>
            )}
            <PipelineStageGate
              requiredStage="risks"
              currentStage={pipelineStage}
              stageProgress={pipelineStageProgress}
              overallProgress={analysis?.progress ?? null}
              title="Aguardando matriz de riscos"
              hint="O pipeline está calculando e classificando riscos automaticamente."
            >

            {/* Score Global e Clusters v3.1 */}
            {riskScore !== null && (
              <Card className="border-0 shadow-lg mb-4">
                <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-light">Modelo de Risco v3.1</CardTitle>
                      <CardDescription className="font-light">Análise automática com agrupamento por área e pisos jurídicos</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-extralight">{riskScore}<span className="text-sm text-slate-500">/100</span></div>
                      <Badge className={`mt-1 ${
                        riskLevel === 'critico' ? 'bg-red-600' :
                        riskLevel === 'alto' ? 'bg-orange-500' :
                        riskLevel === 'medio' ? 'bg-yellow-500' :
                        riskLevel === 'baixo' ? 'bg-green-500' : 'bg-blue-400'
                      } text-white`}>
                        {riskLevel === 'critico' ? 'Crítico' :
                         riskLevel === 'alto' ? 'Alto' :
                         riskLevel === 'medio' ? 'Médio' :
                         riskLevel === 'baixo' ? 'Baixo' : 'Muito Baixo'}
                      </Badge>
                      {governanceMetadata?.pisoAplicado && (
                        <div className="text-xs text-amber-600 mt-1">Piso jurídico aplicado: {governanceMetadata.pisoAplicado}</div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {riskClusters.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {riskClusters.map((cluster: any, idx: number) => (
                        <div key={idx} className={`rounded-lg border p-3 ${
                          cluster.riskLevel === 'critico' ? 'border-red-300 bg-red-50' :
                          cluster.riskLevel === 'alto' ? 'border-orange-300 bg-orange-50' :
                          cluster.riskLevel === 'medio' ? 'border-yellow-300 bg-yellow-50' :
                          'border-green-300 bg-green-50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{cluster.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {cluster.gapScore}% lacunas
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-600 mb-1">
                            Blocos: {cluster.macroBlocks?.join(', ')}
                          </div>
                          {cluster.recommendation && (
                            <div className="text-xs text-slate-700 mt-1 italic">
                              {cluster.recommendation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {governanceMetadata?.consistencyNotes?.length > 0 && (
                    <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                      <div className="text-xs font-medium text-amber-800 mb-1">Notas de consistência:</div>
                      {governanceMetadata.consistencyNotes.map((note: string, i: number) => (
                        <div key={i} className="text-xs text-amber-700">{note}</div>
                      ))}
                    </div>
                  )}
                  {/* Racional Expandivel */}
                  <div className="mt-4 border-t pt-3">
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-slate-700 hover:text-slate-900">Como chegamos nesse nivel de risco?</summary>
                      <div className="mt-3 space-y-2 text-xs text-slate-600">
                        {governanceMetadata?.pisoAplicado && (
                          <div>
                            <div className="font-medium text-slate-700">Piso Juridico Aplicado:</div>
                            <div className="ml-2">{governanceMetadata.pisoAplicado}</div>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-rose-50 to-orange-50">
                <div>
                  <CardTitle className="text-lg font-light">Matriz de Riscos</CardTitle>
                  <CardDescription className="font-light">
                    Passe o mouse em <span className="font-medium">Prova</span> para ver a evidência relacionada.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risco</TableHead>
                      <TableHead className="w-[150px]">Nível</TableHead>
                      <TableHead>Ação requerida</TableHead>
                      <TableHead className="w-[140px]">Prazo</TableHead>
                      <TableHead className="w-[180px]">Status</TableHead>
                      <TableHead className="w-[180px]">Responsável</TableHead>
                      <TableHead className="w-[220px]">Evidência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(resultsRisks || []).map((r: any) => {
                      const fields = inferEvidenceFieldForRisk(`${r.description || ''} ${r.legalReference || ''}`);
                      const ev = fields.map((f) => evidenceIndex.get(f)).find(Boolean) as any;

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="align-top">
                            <div className="font-light text-slate-900">{r.description}</div>
                            {r.legalReference && (
                              <div className="text-xs text-slate-500 mt-1">Base: {r.legalReference}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {isConsultant ? (
                              <Select
                                value={r.riskLevel}
                                onValueChange={(v) => updateRiskItemMutation.mutate({ id: r.id, riskLevel: v as any, analysisId })}
                              >
                                <SelectTrigger className="h-10 min-w-[140px]">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Crítico</SelectItem>
                                  <SelectItem value="2">Alto</SelectItem>
                                  <SelectItem value="3">Médio</SelectItem>
                                  <SelectItem value="4">Baixo</SelectItem>
                                  <SelectItem value="5">Muito Baixo</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              getRiskLevelBadge(String(r.riskLevel))
                            )}
                          </TableCell>
                          <TableCell>
                            {isConsultant ? (
                              <Textarea
                                defaultValue={r.requiredAction || ""}
                                className="min-h-[36px]"
                                onBlur={(e) => updateRiskItemMutation.mutate({ id: r.id, requiredAction: e.target.value || undefined, analysisId })}
                              />
                            ) : (
                              <div className="text-sm text-slate-700 whitespace-pre-wrap">{r.requiredAction || "—"}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {isConsultant ? (
                              <Input
                                defaultValue={r.suggestedDeadline || ""}
                                onBlur={(e) => updateRiskItemMutation.mutate({ id: r.id, suggestedDeadline: e.target.value || undefined, analysisId })}
                              />
                            ) : (
                              <div className="text-sm text-slate-700">{r.suggestedDeadline || "—"}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {isConsultant ? (
                              <Select
                                value={r.actionStatus || 'pendente'}
                                onValueChange={(v) => updateRiskItemMutation.mutate({ id: r.id, actionStatus: v as any, analysisId })}
                              >
                                <SelectTrigger className="h-10 min-w-[160px]">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pendente">Pendente</SelectItem>
                                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                                  <SelectItem value="concluido">Concluído</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="capitalize">{r.actionStatus || 'pendente'}</Badge>
                            )}
                          </TableCell>
                          {/* Coluna Responsável - seletor de usuários da organização */}
                          <TableCell>
                            <Select
                              value={(() => {
                                const localVal = localResponsibles[`risk_${r.id}`];
                                if (localVal !== undefined) return localVal ? String(localVal) : '';
                                return r.responsibleId ? String(r.responsibleId) : '';
                              })()}
                              onValueChange={(v) => {
                                const userId = parseInt(v);
                                const selectedUser = orgUsers?.find((u: any) => u.id === userId);
                                setLocalResponsibles(prev => ({ ...prev, [`risk_${r.id}`]: userId }));
                                updateRiskItemMutation.mutate({
                                  id: r.id,
                                  responsibleId: userId,
                                  responsibleName: selectedUser?.name || selectedUser?.email || '',
                                  analysisId: analysisId,
                                });
                              }}
                            >
                              <SelectTrigger className="h-10 min-w-[180px] text-sm font-light">
                                <SelectValue placeholder="Selecione o responsável" />
                              </SelectTrigger>
                              <SelectContent>
                                {(orgUsers || []).map((u: any) => (
                                  <SelectItem key={u.id} value={String(u.id)}>
                                    {u.name || u.email}
                                  </SelectItem>
                                ))}
                                {(!orgUsers || orgUsers.length === 0) && (
                                  <SelectItem value="_empty" disabled>Nenhum usuário vinculado</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <EvidenceHover
                                label="Prova"
                                excerpt={ev?.excerpt || null}
                                clauseRef={ev?.clauseRef || null}
                                confidence={ev?.confidence || null}
                                note={ev?.note || null}
                              />
                              {/* Botão de upload de evidência - disponível para todos */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs w-full"
                                type="button"
                                onClick={() => {
                                  toast.info('Utilize a aba Plano de Ação para gerenciar evidências');
                                }}
                              >
                                <Paperclip className="w-3 h-3 mr-1" />
                                Anexar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          
            </PipelineStageGate>
</TabsContent>

          {/* Plano de Ação Integrado */}
          <TabsContent value="actionplan" className="space-y-6">
            {/* FIDELIDADE: action_plan (dados reais do backend) */}
            {(actionPlansItems?.length ?? 0) === 0 && !isProcessingPipeline && analysis?.contractAnalysisStatus === "completed" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-4">
                Esta seção não possui dados persistidos para esta análise. Isso indica que a etapa não foi gerada corretamente.
                {manifest && (
                  <div className="mt-1 text-xs text-amber-700">
                    (Manifest: action_plan) mapa={manifest?.mapCount ?? 0} checklist={manifest?.checklistCount ?? 0} riscos={manifest?.riskCount ?? 0} clausulas={manifest?.clauseCount ?? 0} acoes={manifest?.actionPlanCount ?? 0}
                  </div>
                )}
              </div>
            )}
            <PipelineStageGate
              requiredStage="action_plan"
              currentStage={pipelineStage}
              stageProgress={pipelineStageProgress}
              overallProgress={analysis?.progress ?? null}
              title="Aguardando plano de ação"
              hint="O pipeline está gerando o plano de ação automaticamente com base nos riscos e achados."
            >

            {/* Modo XAI - Ações com Explicabilidade */}
            {showXaiMode && xaiAcoes.length > 0 ? (
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-purple-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                        <ClipboardList className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-light">Plano de Ação (IA Explicável)</CardTitle>
                        <CardDescription className="font-light">Ações geradas com explicabilidade</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowXaiMode(false)}>
                        Ver Modo Padrão
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg mb-6 border border-purple-200">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{xaiAcoes.length}</p>
                        <p className="text-xs text-purple-600">Ações XAI</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {xaiAcoes.filter(a => a.prioridade === 'critica').length}
                        </p>
                        <p className="text-xs text-red-600">Críticas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {xaiAcoes.filter(a => a.prioridade === 'alta').length}
                        </p>
                        <p className="text-xs text-orange-600">Altas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-600">
                          {xaiAcoes.filter(a => a.prioridade === 'media').length}
                        </p>
                        <p className="text-xs text-amber-600">Médias</p>
                      </div>
                      <div className="flex-1" />
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        <Scale className="w-3 h-3 mr-1" /> IA Explicável
                      </Badge>
                    </div>
                    {xaiAcoes.map((acao, index) => (
                      <XaiActionCard key={acao.id} data={acao} index={index} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ActionPlanTab
                assessmentType="contract_analysis"
                assessmentId={analysisId}
                organizationId={analysis?.organizationId || 0}
                isInternal={isConsultant}
                actions={existingActions || []}
                onRefreshActions={() => refetchExistingActions()}
                showGenerateButton={true}
                onGeneratePlan={() => handleGenerateActionPlan()}
                isGenerating={generateActionPlanMutation.isPending}
                headerExtra={
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <label className="text-xs text-slate-500">Modo XAI:</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowXaiMode(true)}
                      >
                        Ativar
                      </Button>
                    </div>
                    {isConsultant && (!existingActions || existingActions.length === 0) && !xaiAcoes.length && (
                      <Button
                        onClick={() => generateXaiActionPlanMutation.mutate({ analysisId })}
                        disabled={generateXaiActionPlanMutation.isPending || !resultsRisks?.length}
                        className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
                        size="sm"
                      >
                        {generateXaiActionPlanMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando XAI...</>
                        ) : (
                          <><Scale className="w-4 h-4 mr-2" />Gerar com IA Explicável</>
                        )}
                      </Button>
                    )}
                  </div>
                }
              />
            )
            }
            </PipelineStageGate>
</TabsContent>


          {/* Tab de Cláusulas LGPD */}
          <TabsContent value="clauses" className="space-y-6">
            {/* FIDELIDADE: clauses (dados reais do backend) */}
            {(clauseItems?.length ?? 0) === 0 && !isProcessingPipeline && analysis?.contractAnalysisStatus === "completed" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-4">
                Esta seção não possui dados persistidos para esta análise. Isso indica que a etapa não foi gerada corretamente.
                {manifest && (
                  <div className="mt-1 text-xs text-amber-700">
                    (Manifest: clauses) mapa={manifest?.mapCount ?? 0} checklist={manifest?.checklistCount ?? 0} riscos={manifest?.riskCount ?? 0} clausulas={manifest?.clauseCount ?? 0} acoes={manifest?.actionPlanCount ?? 0}
                  </div>
                )}
              </div>
            )}
            <PipelineStageGate
              requiredStage="clauses"
              currentStage={pipelineStage}
              stageProgress={pipelineStageProgress}
              overallProgress={analysis?.progress ?? null}
              title="Aguardando cláusulas LGPD"
              hint="O pipeline está extraindo e estruturando cláusulas automaticamente."
            >

            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                      <FileCode2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-light">Cláusulas de Conformidade LGPD</CardTitle>
                      <CardDescription className="font-light">
                        Cláusulas sugeridas para adequação do contrato
                        {overlaysV4?.totalApplied > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs">
                            {overlaysV4.totalApplied} complemento{overlaysV4.totalApplied > 1 ? 's' : ''} setorial{overlaysV4.totalApplied > 1 ? 'is' : ''} aplicado{overlaysV4.totalApplied > 1 ? 's' : ''}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {/* Toggle para modo XAI */}
                    <div className="flex items-center gap-2 mr-4">
                      <label className="text-xs text-slate-500">Modo XAI:</label>
                      <Button
                        variant={showXaiMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowXaiMode(!showXaiMode)}
                        className={showXaiMode ? "bg-purple-600 hover:bg-purple-700" : ""}
                      >
                        {showXaiMode ? "Ativo" : "Inativo"}
                      </Button>
                    </div>
                    
                    {!lgpdClausesResult?.clausulas?.length && !xaiClausulas.length && (
                      <>
                        <Button
                          onClick={() => generateLgpdClausesMutation.mutate({ analysisId })}
                          disabled={generateLgpdClausesMutation.isPending}
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                        >
                          {generateLgpdClausesMutation.isPending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                          ) : (
                            <><FileCode2 className="w-4 h-4 mr-2" /> Gerar Cláusulas</>
                          )}
                        </Button>
                        <Button
                          onClick={() => generateXaiClausesMutation.mutate({ analysisId })}
                          disabled={generateXaiClausesMutation.isPending}
                          className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700"
                        >
                          {generateXaiClausesMutation.isPending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando XAI...</>
                          ) : (
                            <><Scale className="w-4 h-4 mr-2" /> Gerar com IA Explicável</>
                          )}
                        </Button>
                      </>
                    )}
                    {lgpdClausesResult?.clausulas?.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => generateLgpdClausesMutation.mutate({ analysisId })}
                          disabled={generateLgpdClausesMutation.isPending}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" /> Regenerar
                        </Button>
                        <Button
                          onClick={handleDownloadAllClauses}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        >
                          <Download className="w-4 h-4 mr-2" /> Baixar Minuta
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Modo XAI - Cláusulas com Explicabilidade */}
                {showXaiMode && xaiClausulas.length > 0 ? (
                  <div className="space-y-4">
                    {/* Resumo XAI */}
                    <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg mb-6 border border-purple-200">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{xaiClausulas.length}</p>
                        <p className="text-xs text-purple-600">Cláusulas XAI</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {xaiClausulas.filter(c => acceptedClauses[c.id])?.length || 0}
                        </p>
                        <p className="text-xs text-green-600">Aceitas</p>
                      </div>
                      <div className="flex-1" />
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        <Scale className="w-3 h-3 mr-1" /> IA Explicável
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAcceptAllClauses}
                        className="border-green-200 text-green-600 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4 mr-1" /> Aceitar Todas
                      </Button>
                    </div>

                    {/* Lista de Cláusulas XAI */}
                    {xaiClausulas.map((clausula, index) => (
                      <XaiClauseCard
                        key={clausula.id}
                        data={clausula}
                        index={index}
                        isAccepted={acceptedClauses[clausula.id] ?? true}
                        onAcceptChange={handleClauseAcceptance}
                        onCopy={(content) => {
                          navigator.clipboard.writeText(content);
                          toast.success('Cláusula copiada!');
                        }}
                        onDownload={(id, titulo, content) => {
                          const blob = new Blob([content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `clausula-${id}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success('Download iniciado!');
                        }}
                        onRefine={(id, instructions) => handleRefineClause(id, instructions)}
                        isRefining={refineClauseMutation.isPending}
                      />
                    ))}
                  </div>
                ) : lgpdClausesResult?.clausulas?.length > 0 ? (
                  <div className="h-[calc(100vh-280px)] min-h-[600px]">
                    {/* Layout de Duas Colunas: Documento A4 (8/12) | Lista de Cláusulas (4/12) */}
                    <div className="grid grid-cols-12 gap-4 h-full">
                      {/* Coluna 1: Visualização do Documento A4 Contínuo (8/12) */}
                      <div className="col-span-8 border border-slate-200 rounded-lg overflow-hidden bg-white text-slate-900">
                        <DocumentA4Preview
                          clauses={lgpdClausesResult.clausulas.map((c: any) => ({
                            id: c.id,
                            dbId: c.dbId,
                            titulo: c.titulo,
                            conteudo: c.conteudo,
                            bloco: c.bloco,
                            version: c.version || 1,
                          }))}
                          acceptedClauses={acceptedClauses}
                          hiddenClauses={hiddenClauses}
                          finalContents={finalClauseContents}
                          parties={[
                            { name: resultsMap?.contractingParty || 'Contratante', role: 'Controlador' },
                            { name: resultsMap?.contractedParty || 'Contratado', role: 'Operador' },
                          ]}
                          contractTitle={analysis?.contractName || 'Contrato'}
                          analysisDate={analysis?.createdAt ? new Date(analysis.createdAt).toISOString() : new Date().toISOString()}
                          documentFormat={clauseDocumentFormat}
                          includeParties={includePartiesInDoc}
                          onDocumentFormatChange={setClauseDocumentFormat}
                          onIncludePartiesChange={setIncludePartiesInDoc}
                          onDownload={(format) => {
                            // Gerar conteúdo completo do documento
                            const visibleClauses = lgpdClausesResult.clausulas.filter((c: any) => !hiddenClauses[c.id]);
                            let content = '';
                            visibleClauses.forEach((c: any, idx: number) => {
                              const clauseContent = finalClauseContents[c.id] || c.conteudo;
                              content += `CLÁUSULA ${idx + 1} - ${c.titulo}

${clauseContent}

`;
                            });
                            
                            if (format === 'txt') {
                              const blob = new Blob([content], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `minuta-lgpd-${analysis?.contractName || 'contrato'}.txt`;
                              a.click();
                              URL.revokeObjectURL(url);
                              toast.success('Download TXT iniciado!');
                            } else {
                              toast.info(`Exportação ${format.toUpperCase()} em desenvolvimento`);
                            }
                          }}
                          onShare={() => {
                            toast.info('Funcionalidade de compartilhamento em desenvolvimento');
                          }}
                          onPrint={() => {
                            toast.success('Preparando impressão...');
                          }}
                          scrollToClauseId={scrollToClauseId}
                          onScrollComplete={() => setScrollToClauseId(null)}
                          onClauseContentChange={(clauseId, newContent) => {
                            setFinalClauseContents(prev => ({ ...prev, [clauseId]: newContent }));
                          }}
                        />
                      </div>

                      {/* Coluna 2: Lista de Cláusulas para Edição (4/12) */}
                      <div className="col-span-4 border border-slate-200 rounded-lg overflow-hidden bg-white text-slate-900">
                        <ClauseListEditor
                          clauses={lgpdClausesResult.clausulas.map((c: any) => ({
                            id: c.id,
                            dbId: c.dbId,
                            titulo: c.titulo,
                            conteudo: c.conteudo,
                            bloco: c.bloco,
                            version: c.version || 1,
                          }))}
                          acceptedClauses={acceptedClauses}
                          hiddenClauses={hiddenClauses}
                          refinementInstructions={refinementInstructions}
                          onAcceptChange={handleClauseAcceptance}
                          onHiddenChange={handleHiddenChange}
                          onRefinementChange={(clauseId, instruction) => {
                            setRefinementInstructions(prev => ({ ...prev, [clauseId]: instruction }));
                          }}
                          onRefine={(clauseId, instruction) => {
                            setRefiningClauseId(clauseId);
                            handleRefineClause(clauseId, instruction);
                          }}
                          onAcceptAll={handleAcceptAllClauses}
                          isRefining={refineClauseMutation.isPending}
                          refiningClauseId={refiningClauseId}
                          onClauseClick={(clauseId) => setScrollToClauseId(clauseId)}
                          analysisId={analysisId}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-muted-foreground">
                    <FileCode2 className="w-16 h-16 mx-auto mb-4 opacity-30 text-blue-500" />
                    <p className="font-light text-lg">Nenhuma cláusula gerada</p>
                    <p className="text-sm font-light mt-2">
                      Clique em "Gerar Cláusulas LGPD" para criar cláusulas de conformidade
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Painel de Assinatura Digital Gov.br */}
            {lgpdClausesResult?.clausulas?.length > 0 && (
              <div id="govbr-signature-panel">
                <GovbrSignaturePanel
                  analysisId={analysisId}
                  entityType="dpa"
                  entityId={analysisId}
                  documentTitle={`Minuta DPA - ${analysis?.contractName || 'Contrato'}`}
                  onSignatureComplete={(signature) => {
                    toast.success('Documento assinado com sucesso!');
                    refetchClauses();
                  }}
                />
              </div>
            )}
          
            </PipelineStageGate>
</TabsContent>

          {/* Tab de Mapeamentos - Integrado na Página */}
          <TabsContent value="mapeamentos" className="space-y-6">
            <PipelineStageGate
              requiredStage="mapping"
              currentStage={pipelineStage}
              stageProgress={pipelineStageProgress}
              overallProgress={analysis?.progress ?? null}
              title="Aguardando mapeamentos vinculados"
              hint="Os mapeamentos são habilitados após a etapa de Mapeamento. O pipeline está processando."
            >

            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-cyan-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600">
                    <Database className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-light">Mapeamento de Dados</CardTitle>
                    <CardDescription className="font-light">Mapeamento gerado automaticamente a partir da análise do contrato</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <MapeamentoAutoEditor 
                  analysisId={analysisId} 
                  isConsultant={isConsultant}
                  onMapeamentoApproved={() => refetchMapeamentos()}
                />
              </CardContent>
            </Card>

            {/* Lista de Mapeamentos Vinculados (aprovados) */}
            {linkedMapeamentos && linkedMapeamentos.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-light">Mapeamentos Incorporados</CardTitle>
                      <CardDescription className="font-light">Mapeamentos aprovados e incorporados ao módulo de Mapeamentos</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {linkedMapeamentos.map((link: any) => (
                      <Card key={link.id} className="border border-green-100 hover:border-green-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="p-2 rounded-lg bg-green-100">
                                <MapPin className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-800">{link.processTitle || 'Processo de Tratamento'}</h4>
                                <p className="body-small mt-1">
                                  <span className="font-medium">Área:</span> {link.areaName || link.identifiedDepartment || 'Não identificada'}
                                </p>
                                {link.processDescription && (
                                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{link.processDescription}</p>
                                )}
                                <div className="flex items-center gap-4 mt-3">
                                  <Badge variant="outline" className="text-green-700 border-green-300">
                                    <Link2 className="w-3 h-3 mr-1" />
                                    Origem: Análise de Contrato
                                  </Badge>
                                  <Badge className="bg-green-500 text-white">
                                    {link.linkStatus === 'approved' ? 'Aprovado' : link.linkStatus === 'created' ? 'Criado' : 'Pendente'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Criado em: {new Date(link.createdAt).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Link href={`/mapeamentos/${link.responseId}`}>
                              <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Ver Mapeamento
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          
            </PipelineStageGate>
</TabsContent>

          {/* Terceiro Vinculado */}
          {thirdPartyData && (
            <TabsContent value="thirdparty" className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                      <Link2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-light">Terceiro Vinculado (Placeholder)</CardTitle>
                      <CardDescription className="font-light">Informações do terceiro associado</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </TabsContent>
          )}

          {/* Terceiro Vinculado */}
          {thirdPartyData && (
            <TabsContent value="thirdparty" className="space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                      <Link2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-light">Terceiro Vinculado</CardTitle>
                      <CardDescription className="font-light">Informações do terceiro associado a este contrato</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">Nome do Terceiro</h4>
                      <p className="font-light">{thirdPartyData.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">CNPJ</h4>
                      <p className="font-light">{thirdPartyData.cnpj || '-'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">Tipo de Serviço</h4>
                      <p className="font-light">{(thirdPartyData as any).serviceType || thirdPartyData.category || '-'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">Classificação de Risco</h4>
                      <Badge variant="outline" className={`
                        ${(thirdPartyData as any).riskClassification === 'critical' ? 'border-red-500 text-red-700 bg-red-50' : ''}
                        ${(thirdPartyData as any).riskClassification === 'high' ? 'border-orange-500 text-orange-700 bg-orange-50' : ''}
                        ${(thirdPartyData as any).riskClassification === 'medium' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : ''}
                        ${(thirdPartyData as any).riskClassification === 'low' ? 'border-green-500 text-green-700 bg-green-50' : ''}
                      `}>
                        {(thirdPartyData as any).riskClassification === 'critical' ? 'Crítico' :
                         (thirdPartyData as any).riskClassification === 'high' ? 'Alto' :
                         (thirdPartyData as any).riskClassification === 'medium' ? 'Médio' : 'Baixo'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t">
                    <Link href={`/terceiros/${thirdPartyData.id}`}>
                      <Button variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Ver Perfil Completo do Terceiro
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Rastreabilidade - EvidencePack (Termo 1) */}
          {isConsultant && (
            <TabsContent value="evidence" className="space-y-6">
              <EvidenceTraceViewer
                traces={evidenceData?.traces ?? []}
                chunks={evidenceData?.chunks ?? []}
                documentMeta={evidenceData?.documentMeta ?? null}
                isConsultant={isConsultant}
                isLoading={isLoadingEvidence}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Dialog de Preview e Geração de Mapeamento */}
        <Dialog open={showMapeamentoPreview} onOpenChange={setShowMapeamentoPreview}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-teal-600" />
                Gerar Mapeamento a partir do Contrato
              </DialogTitle>
              <DialogDescription>
                Revise os dados extraídos automaticamente do contrato antes de criar o mapeamento
              </DialogDescription>
            </DialogHeader>
            
            {mapeamentoPreview ? (
              <div className="space-y-6 py-4">
                {/* Departamento Identificado */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200">
                  <h4 className="font-medium text-teal-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Departamento Identificado
                  </h4>
                  <p className="text-lg font-semibold text-teal-900 mt-1">{mapeamentoPreview.department}</p>
                  <p className="text-sm text-teal-700 mt-1">{mapeamentoPreview.departmentJustification}</p>
                </div>

                {/* Processo */}
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-700">Processo de Tratamento</h4>
                  <div className="p-3 bg-slate-50 rounded-lg border text-slate-900">
                    <p className="font-medium">{mapeamentoPreview.processTitle}</p>
                    <p className="body-small mt-1">{mapeamentoPreview.processPurpose}</p>
                  </div>
                </div>

                {/* Categorias de Dados */}
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-700">Categorias de Dados Pessoais</h4>
                  <div className="flex flex-wrap gap-2">
                    {mapeamentoPreview.dataCategories?.map((cat: any, idx: number) => (
                      <Badge key={idx} variant="outline" className={cat.sensivel ? 'border-red-300 text-red-700 bg-red-50' : 'border-slate-300'}>
                        {cat.name}
                        {cat.sensivel && <span className="ml-1 text-xs">(sensível)</span>}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Titulares */}
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-700">Categorias de Titulares</h4>
                  <div className="flex flex-wrap gap-2">
                    {mapeamentoPreview.titularCategories?.map((cat: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="border-blue-300 text-blue-700">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Base Legal */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-700">Base Legal</h4>
                    <Badge className="bg-emerald-500 text-white">
                      {mapeamentoPreview.legalBase === 'consentimento' ? 'Consentimento' :
                       mapeamentoPreview.legalBase === 'execucao_contrato' ? 'Execução de Contrato' :
                       mapeamentoPreview.legalBase === 'obrigacao_legal' ? 'Obrigação Legal' :
                       mapeamentoPreview.legalBase}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{mapeamentoPreview.legalBaseJustification}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-700">Período de Retenção</h4>
                    <p className="text-sm">{mapeamentoPreview.retentionPeriod}</p>
                  </div>
                </div>

                {/* Compartilhamento */}
                {mapeamentoPreview.sharing && mapeamentoPreview.sharing.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-700">Compartilhamento</h4>
                    <div className="flex flex-wrap gap-2">
                      {mapeamentoPreview.sharing.map((s: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="border-amber-300 text-amber-700">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medidas de Segurança */}
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-700">Medidas de Segurança</h4>
                  <div className="flex flex-wrap gap-2">
                    {mapeamentoPreview.securityMeasures?.map((m: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="border-green-300 text-green-700">
                        <Shield className="w-3 h-3 mr-1" />
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Importante</p>
                      <p className="text-sm text-amber-700 mt-1">
                        O mapeamento será criado com as informações extraídas automaticamente do contrato. 
                        Você poderá editar e complementar os dados posteriormente no módulo de Mapeamentos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                <span className="ml-3 text-muted-foreground">Extraindo dados do contrato...</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMapeamentoPreview(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => generateMapeamentoMutation.mutate({ analysisId })}
                disabled={!mapeamentoPreview || generateMapeamentoMutation.isPending}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
              >
                {generateMapeamentoMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                ) : (
                  <><Database className="w-4 h-4 mr-2" />Criar Mapeamento</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Refinamento */}
        <Dialog open={isRefineOpen} onOpenChange={setIsRefineOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                Refinar Análise com IA
              </DialogTitle>
              <DialogDescription>
                Descreva o que você gostaria de ajustar ou aprofundar na análise
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={refinementRequest}
                onChange={(e) => setRefinementRequest(e.target.value)}
                placeholder="Ex: Aprofundar análise sobre transferência internacional de dados..."
                rows={4}
                className="border-emerald-200 focus:border-emerald-500"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRefineOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => refineMutation.mutate({
                  analysisId,
                  refinementRequest
                })}
                disabled={!refinementRequest.trim() || refineMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                {refineMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Refinando...
                  </>
                ) : (
                  'Refinar Análise'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Revisão */}
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                Revisar Análise
              </DialogTitle>
              <DialogDescription>
                Defina o status da revisão e adicione observações
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={reviewStatus}
                  onValueChange={(v) => setReviewStatus(v as any)}
                >
                  <SelectTrigger className="border-purple-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewed">Revisada</SelectItem>
                    <SelectItem value="approved">Aprovada</SelectItem>
                    <SelectItem value="rejected">Rejeitada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Adicione observações sobre a revisão..."
                  rows={3}
                  className="border-purple-200 focus:border-purple-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => reviewMutation.mutate({
                  analysisId,
                  status: reviewStatus,
                  reviewNotes
                })}
                disabled={reviewMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
              >
                {reviewMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Revisão'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Geração de Plano de Ação */}
        <Dialog open={isActionPlanOpen} onOpenChange={setIsActionPlanOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-violet-600" />
                Gerar Plano de Ação
              </DialogTitle>
              <DialogDescription>
                Converter os riscos identificados em ações de mitigação para acompanhamento centralizado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {existingActions && existingActions.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Já existem {existingActions.length} ações vinculadas a esta análise</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    Gerar novamente criará ações adicionais para cada risco identificado.
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-slate-700">Riscos a serem convertidos em ações:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {resultsRisks?.map((risk, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg border text-slate-900">
                      <div className="flex items-start gap-3">
                        <Badge className={`shrink-0 ${
                          risk.riskLevel === '1' ? 'bg-red-500' :
                          risk.riskLevel === '2' ? 'bg-orange-500' :
                          risk.riskLevel === '3' ? 'bg-yellow-500' :
                          risk.riskLevel === '4' ? 'bg-blue-500' :
                          'bg-green-500'
                        } text-white`}>
                          {riskLabels[risk.riskLevel]}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{risk.contractArea}</p>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{risk.riskDescription}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
                <h4 className="font-medium text-sm text-violet-800 mb-2">Prazos automáticos por prioridade:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-violet-700">
                  <div>• Crítico: 7 dias</div>
                  <div>• Alto: 15 dias</div>
                  <div>• Médio: 30 dias</div>
                  <div>• Baixo/Muito Baixo: 60 dias</div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsActionPlanOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerateActionPlan}
                disabled={generateActionPlanMutation.isPending || !resultsRisks?.length}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {generateActionPlanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Gerar {resultsRisks?.length || 0} Ações
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Cláusulas LGPD */}
        <Dialog open={isLgpdClausesOpen} onOpenChange={setIsLgpdClausesOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-emerald-600" />
                Cláusulas LGPD Geradas (v1)
              </DialogTitle>
              <DialogDescription>
                Cláusulas contratuais geradas automaticamente com base na análise do contrato.
              </DialogDescription>
            </DialogHeader>
            
            {generateLgpdClausesMutation.isPending && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <span className="ml-3 text-muted-foreground">Gerando cláusulas...</span>
              </div>
            )}
            
            {lgpdClausesResult && (
              <div className="space-y-6">
                {/* Resumo */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-emerald-800">
                        {lgpdClausesResult.semDadosPessoais 
                          ? "Contrato sem tratamento de dados pessoais"
                          : `${lgpdClausesResult.clausulas.length} cláusula(s) gerada(s)`
                        }
                      </p>
                      <p className="text-sm text-emerald-600">
                        Nível de risco: <Badge variant="outline" className="ml-1">{lgpdClausesResult.nivelRisco}</Badge>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = lgpdClausesResult.clausulas.map((c: any) => c.conteudo).join('\n\n---\n\n');
                        navigator.clipboard.writeText(text);
                        toast.success('Cláusulas copiadas para a área de transferência!');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Todas
                    </Button>
                  </div>
                </div>
                
                {/* Cláusulas */}
                <div className="space-y-4">
                  {lgpdClausesResult.clausulas.map((clausula: any, index: number) => (
                    <Card key={clausula.id} className="border-0 shadow-md">
                      <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-gray-50">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            {clausula.titulo}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(clausula.conteudo);
                              toast.success('Cláusula copiada!');
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-li:text-gray-700 bg-slate-50 p-4 rounded-lg">
                          <Streamdown>{clausula.conteudo}</Streamdown>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Contexto Normalizado (colapsável) */}
                <details className="group">
                  <summary className="cursor-pointer body-small hover:text-foreground flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    Ver contexto normalizado (debug)
                  </summary>
                  <div className="mt-2 p-4 bg-slate-50 rounded-lg overflow-x-auto">
                    <pre className="text-xs text-muted-foreground">
                      {JSON.stringify(lgpdClausesResult.contextoNormalizado, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLgpdClausesOpen(false)}>
                Fechar
              </Button>
              <Button
                onClick={() => {
                  setLgpdClausesResult(null);
                  generateLgpdClausesMutation.mutate({ analysisId });
                }}
                disabled={generateLgpdClausesMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Ajuste IA para Ação */}
        <Dialog open={actionAIModalOpen} onOpenChange={setActionAIModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-violet-600" />
                Ajustar Ação com IA
              </DialogTitle>
              <DialogDescription>
                Forneça instruções para refinar esta ação usando inteligência artificial
              </DialogDescription>
            </DialogHeader>
            {selectedActionForAI && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                  <p className="text-sm font-medium text-violet-800">{selectedActionForAI.title}</p>
                  <p className="text-xs text-violet-600 mt-1">{selectedActionForAI.description}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Instruções de Refinamento</label>
                  <Textarea
                    placeholder="Ex: Adicionar mais detalhes sobre os prazos, incluir referências legais, simplificar a linguagem..."
                    value={actionAIInstruction}
                    onChange={(e) => setActionAIInstruction(e.target.value)}
                    rows={4}
                    className="border-violet-200 focus:border-violet-500"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setActionAIModalOpen(false);
                setActionAIInstruction('');
              }}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  toast.info('Refinamento de ação com IA em desenvolvimento. Em breve você poderá ajustar ações individualmente.');
                  setActionAIModalOpen(false);
                  setActionAIInstruction('');
                }}
                disabled={!actionAIInstruction.trim()}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Refinar com IA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Evidências com abas Upload/GED */}

        {/* Modal de Histórico de Auditoria */}
        <Dialog open={showAuditHistory} onOpenChange={setShowAuditHistory}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-slate-600" />
                Histórico de Alterações das Cláusulas
              </DialogTitle>
              <DialogDescription>
                Registro de todas as ações realizadas nas cláusulas LGPD
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {isLoadingAuditHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                  <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
                </div>
              ) : clauseAuditHistory && clauseAuditHistory.length > 0 ? (
                <div className="space-y-3">
                  {clauseAuditHistory.map((entry: any) => (
                    <div key={entry.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            entry.actionType === 'generated' ? 'bg-blue-100 text-blue-600' :
                            entry.actionType === 'accepted' ? 'bg-green-100 text-green-600' :
                            entry.actionType === 'rejected' ? 'bg-red-100 text-red-600' :
                            entry.actionType === 'refined' ? 'bg-purple-100 text-purple-600' :
                            entry.actionType === 'edited' ? 'bg-amber-100 text-amber-600' :
                            entry.actionType === 'downloaded' ? 'bg-cyan-100 text-cyan-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {entry.actionType === 'generated' && <FileCode2 className="w-4 h-4" />}
                            {entry.actionType === 'accepted' && <Check className="w-4 h-4" />}
                            {entry.actionType === 'rejected' && <X className="w-4 h-4" />}
                            {entry.actionType === 'refined' && <RefreshCw className="w-4 h-4" />}
                            {entry.actionType === 'edited' && <MessageSquare className="w-4 h-4" />}
                            {entry.actionType === 'downloaded' && <Download className="w-4 h-4" />}
                            {entry.actionType === 'copied' && <Copy className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {entry.actionType === 'generated' && 'Cláusula gerada'}
                              {entry.actionType === 'accepted' && 'Cláusula aceita'}
                              {entry.actionType === 'rejected' && 'Cláusula removida'}
                              {entry.actionType === 'refined' && 'Cláusula refinada via IA'}
                              {entry.actionType === 'edited' && 'Cláusula editada'}
                              {entry.actionType === 'downloaded' && 'Cláusula baixada'}
                              {entry.actionType === 'copied' && 'Cláusula copiada'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Cláusula: {entry.clauseId}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{entry.userName || 'Usuário'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      {entry.refinementInstructions && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                          <p className="text-xs font-medium text-purple-700 mb-1">Instruções de refinamento:</p>
                          <p className="text-sm text-purple-600">{entry.refinementInstructions}</p>
                        </div>
                      )}
                      {entry.previousContent && entry.newContent && (
                        <div className="mt-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-red-50 rounded-lg">
                              <p className="text-xs font-medium text-red-700 mb-1">Conteúdo anterior:</p>
                              <p className="text-xs text-red-600 line-clamp-3">{entry.previousContent}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-xs font-medium text-green-700 mb-1">Novo conteúdo:</p>
                              <p className="text-xs text-green-600 line-clamp-3">{entry.newContent}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 text-xs"
                            onClick={() => {
                              setSelectedVersionsForDiff({
                                old: {
                                  id: entry.id - 1,
                                  version: (entry.version || 1) - 1,
                                  content: entry.previousContent,
                                  createdAt: entry.createdAt,
                                  userName: entry.userName,
                                  actionType: 'previous',
                                },
                                new: {
                                  id: entry.id,
                                  version: entry.version || 1,
                                  content: entry.newContent,
                                  createdAt: entry.createdAt,
                                  userName: entry.userName,
                                  actionType: entry.actionType,
                                  refinementInstructions: entry.refinementInstructions,
                                },
                              });
                              setShowDiffViewer(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver Comparação Completa
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum registro de auditoria encontrado</p>
                  <p className="text-sm">As alterações nas cláusulas serão registradas aqui</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAuditHistory(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Visualizador de Relatório Premium */}
        <ReportViewer
          isOpen={showPremiumReport}
          onClose={() => setShowPremiumReport(false)}
          title={`Relatório Premium - ${analysis?.contractName || 'Análise'}`}
          htmlContent={premiumReportHtml}
          reportType="contract-analysis"
        />

        {/* Visualização Premium das Cláusulas LGPD */}
        {lgpdClausesResult && (
          <ClausulasLGPDPremiumView
            isOpen={showPremiumClausesView}
            onClose={() => setShowPremiumClausesView(false)}
            contractTitle={analysis?.contractName || 'Contrato'}
            contractObject={resultsMap?.contractObject || resultsMap?.contractType || ''}
            analysisDate={analysis?.createdAt || new Date().toISOString()}
            fileName={analysis?.contractName || 'Documento analisado'}
            parties={[
              {
                name: resultsMap?.contractingParty || 'Contratante',
                cnpj: '',
                role: resultsMap?.lgpdAgentType === 'controlador' ? 'Controlador' : 'Operador'
              },
              {
                name: resultsMap?.contractedParty || 'Contratado',
                cnpj: '',
                role: resultsMap?.lgpdAgentType === 'operador' ? 'Operador' : 'Controlador'
              }
            ]}
            clauses={lgpdClausesResult.clausulas.map((c: any, idx: number) => ({
              id: c.id || `clause-${idx}`,
              number: idx + 1,
              title: c.titulo,
              content: c.conteudo,
              bloco: c.bloco,
              version: 1
            }))}
            version={1}
            onExportPDF={async () => {
              try {
                toast.info('Gerando PDF...');
                const exportPdfMutation = trpc.contractAnalysis.exportClausesPdf.useMutation();
                const result = await exportPdfMutation.mutateAsync({
                  analysisId,
                  clauses: lgpdClausesResult.clausulas.map((c: any, idx: number) => ({
                    number: idx + 1,
                    title: c.titulo,
                    content: c.conteudo,
                    bloco: c.bloco || '',
                  })),
                });
                
                // Criar blob e baixar
                const byteCharacters = atob(result.pdf);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                toast.success('PDF exportado com sucesso!');
              } catch (error) {
                console.error('Erro ao exportar PDF:', error);
                toast.error('Erro ao exportar PDF');
              }
            }}
            onExportWord={async () => {
              try {
                toast.info('Gerando Word...');
                const exportWordMutation = trpc.contractAnalysis.exportClausesWord.useMutation();
                const result = await exportWordMutation.mutateAsync({
                  analysisId,
                  clauses: lgpdClausesResult.clausulas.map((c: any, idx: number) => ({
                    number: idx + 1,
                    title: c.titulo,
                    content: c.conteudo,
                    bloco: c.bloco || '',
                  })),
                });
                
                // Criar blob e baixar
                const byteCharacters = atob(result.word);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                toast.success('Word exportado com sucesso!');
              } catch (error) {
                console.error('Erro ao exportar Word:', error);
                toast.error('Erro ao exportar Word');
              }
            }}
            onViewHistory={(clauseId) => {
              setSelectedClauseForHistory(clauseId);
              setShowAuditHistory(true);
            }}
            analysisId={analysisId}
            canApprove={user?.role === 'admin_global' || user?.role === 'consultor'}
            onRequestApproval={(data) => {
              toast.info('Enviando solicitação de aprovação...');
              requestDpaApprovalMutation.mutate({
                analysisId,
                approverEmail: data.email,
                approverName: data.name,
                approverRole: data.role,
                message: data.message,
              });
            }}
            onApprove={(comments) => {
              toast.info('Aprovando DPA...');
              approveDpaMutation.mutate({
                analysisId,
                comments,
              });
            }}
            onReject={(reason) => {
              toast.info('Rejeitando DPA...');
              rejectDpaMutation.mutate({
                analysisId,
                reason,
              });
            }}
            onSendEmail={(data) => {
              toast.info('Enviando e-mail...');
              sendDpaByEmailMutation.mutate({
                analysisId,
                emails: data.emails,
                subject: data.subject,
                message: data.message,
              });
            }}
            onRequestDigitalSignature={() => {
              toast.info('Iniciando assinatura digital Gov.br...', {
                description: 'Você será redirecionado para o portal Gov.br para autorizar a assinatura.',
              });
              // TODO: Implementar integração com a API Gov.br
              // Por enquanto, mostrar mensagem informativa
              toast.warning('Integração Gov.br em configuração', {
                description: 'A assinatura digital via Gov.br requer credenciais oficiais. Configure em Admin > Assinatura Gov.br.',
                duration: 5000,
              });
            }}
          />
        )}

        {/* Visualizador de Diff de Versões */}
        {selectedVersionsForDiff && (
          <ClauseDiffViewer
            isOpen={showDiffViewer}
            onClose={() => {
              setShowDiffViewer(false);
              setSelectedVersionsForDiff(null);
            }}
            clauseTitle={selectedVersionsForDiff.new.clauseId || 'Cláusula'}
            oldVersion={selectedVersionsForDiff.old.content ? selectedVersionsForDiff.old : null}
            newVersion={selectedVersionsForDiff.new}
          />
        )}

        {/* Biblioteca de Templates de Cláusulas */}
        <ClauseTemplateLibrary
          isOpen={showTemplateLibrary}
          onClose={() => setShowTemplateLibrary(false)}
          organizationId={analysis?.organizationId}
          onInsertClause={(clause) => {
            // Adiciona a cláusula ao resultado
            const newClause = {
              id: clause.id,
              title: clause.name,
              content: clause.content,
              bloco: 'template',
              number: (lgpdClausesResult?.clausulas?.length || 0) + 1,
            };
            
            if (lgpdClausesResult?.clausulas) {
              setLgpdClausesResult({
                ...lgpdClausesResult,
                clausulas: [...lgpdClausesResult.clausulas, newClause],
              });
            } else {
              setLgpdClausesResult({
                clausulas: [newClause],
              });
            }
            
            // Marca como aceita automaticamente
            setAcceptedClauses((prev) => ({
              ...prev,
              [clause.id]: true,
            }));
          }}
        />
      </div>
    </>
  );
}
