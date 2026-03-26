// client/src/pages/RotDocumentViewer.tsx
// Página dedicada para visualização de ROT/POP com formatação oficial,
// exportação PDF e histórico de versões
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import MarkdownPretty from "@/components/MarkdownPretty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Printer,
  ArrowLeft,
  Clock,
  ChevronRight,
  Shield,
  AlertTriangle,
  CheckCircle2,
  History,
  Eye,
  FileCheck,
  ClipboardList,
  Table2,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

// ==================== TIPOS ====================

interface VersionEntry {
  id: number;
  entityType: string;
  entityId: number;
  fieldName: string;
  content: string;
  previousContent: string | null;
  version: number;
  changeReason: string | null;
  changeType: string;
  createdById: number;
  createdByName: string | null;
  createdAt: string;
}

// ==================== COMPONENTE DE DIFF ====================

function TextDiff({ oldText, newText }: { oldText: string; newText: string }) {
  const oldLines = (oldText || "").split("\n");
  const newLines = (newText || "").split("\n");

  // Algoritmo simples de diff linha a linha
  const maxLen = Math.max(oldLines.length, newLines.length);
  const diffLines: { type: "same" | "added" | "removed" | "changed"; oldLine?: string; newLine?: string }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const ol = oldLines[i];
    const nl = newLines[i];
    if (ol === nl) {
      diffLines.push({ type: "same", oldLine: ol, newLine: nl });
    } else if (ol === undefined) {
      diffLines.push({ type: "added", newLine: nl });
    } else if (nl === undefined) {
      diffLines.push({ type: "removed", oldLine: ol });
    } else {
      diffLines.push({ type: "changed", oldLine: ol, newLine: nl });
    }
  }

  return (
    <div className="font-mono text-xs border rounded-lg overflow-hidden">
      <div className="grid grid-cols-2 bg-gray-50 border-b px-3 py-2">
        <span className="font-medium text-gray-600">Versao Anterior</span>
        <span className="font-medium text-gray-600">Versao Atual</span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {diffLines.map((line, i) => (
          <div key={i} className="grid grid-cols-2 border-b last:border-b-0">
            <div
              className={`px-3 py-1 ${
                line.type === "removed"
                  ? "bg-red-50 text-red-700"
                  : line.type === "changed"
                  ? "bg-yellow-50 text-yellow-800"
                  : "text-gray-600"
              }`}
            >
              {line.type === "added" ? "" : (line.oldLine || "")}
            </div>
            <div
              className={`px-3 py-1 border-l ${
                line.type === "added"
                  ? "bg-green-50 text-green-700"
                  : line.type === "changed"
                  ? "bg-blue-50 text-blue-800"
                  : "text-gray-600"
              }`}
            >
              {line.type === "removed" ? "" : (line.newLine || "")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== COMPONENTE DE TIMELINE DE VERSÕES ====================

function VersionTimeline({
  versions,
  onCompare,
}: {
  versions: VersionEntry[];
  onCompare: (a: VersionEntry, b: VersionEntry) => void;
}) {
  const [selectedA, setSelectedA] = useState<number | null>(null);
  const [selectedB, setSelectedB] = useState<number | null>(null);

  const handleSelect = (v: VersionEntry) => {
    if (selectedA === null) {
      setSelectedA(v.id);
    } else if (selectedB === null && v.id !== selectedA) {
      setSelectedB(v.id);
      const a = versions.find((x) => x.id === selectedA);
      if (a) onCompare(a, v);
    } else {
      setSelectedA(v.id);
      setSelectedB(null);
    }
  };

  const changeTypeLabels: Record<string, string> = {
    criacao: "Criacao",
    edicao_manual: "Edicao Manual",
    geracao_ia: "Geracao por IA",
    revisao: "Revisao",
    aprovacao: "Aprovacao",
  };

  const changeTypeColors: Record<string, string> = {
    criacao: "bg-green-100 text-green-700",
    edicao_manual: "bg-blue-100 text-blue-700",
    geracao_ia: "bg-purple-100 text-purple-700",
    revisao: "bg-yellow-100 text-yellow-700",
    aprovacao: "bg-emerald-100 text-emerald-700",
  };

  if (versions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-light">Nenhum historico de versoes encontrado</p>
        <p className="text-sm font-extralight mt-1">
          As versoes serao registradas automaticamente quando houver alteracoes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 font-light mb-4">
        Selecione duas versoes para comparar as diferencas
      </p>
      {versions.map((v, idx) => (
        <div
          key={v.id}
          onClick={() => handleSelect(v)}
          className={`relative pl-8 pb-6 cursor-pointer group ${
            selectedA === v.id || selectedB === v.id
              ? "bg-purple-50 rounded-lg -ml-2 pl-10 pr-4 py-3"
              : "hover:bg-gray-50 rounded-lg -ml-2 pl-10 pr-4 py-2"
          }`}
        >
          {/* Linha vertical */}
          {idx < versions.length - 1 && (
            <div className="absolute left-4 top-8 bottom-0 w-px bg-gray-200" />
          )}
          {/* Ponto */}
          <div
            className={`absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 ${
              selectedA === v.id || selectedB === v.id
                ? "bg-purple-600 border-purple-600"
                : idx === 0
                ? "bg-green-500 border-green-500"
                : "bg-white border-gray-300 group-hover:border-purple-400"
            }`}
          />

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">
                  Versao {v.version}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${changeTypeColors[v.changeType] || ""}`}
                >
                  {changeTypeLabels[v.changeType] || v.changeType}
                </Badge>
                {idx === 0 && (
                  <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600">
                    Atual
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 font-light">
                {v.createdByName || "Sistema"} &middot;{" "}
                {new Date(v.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {v.changeReason && (
                <p className="text-xs text-gray-400 font-extralight mt-1 italic">
                  {v.changeReason}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

export default function RotDocumentViewer() {
  const params = useParams<{ rotId: string }>();
  const rotId = Number(params.rotId);
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("rot");
  const [showHistory, setShowHistory] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{
    a: VersionEntry;
    b: VersionEntry;
  } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Dados do ROT
  const { data: rotData, isLoading: loadingRot } = trpc.rotDocument.getRotDocument.useQuery(
    { rotId },
    { enabled: rotId > 0 }
  );

  // HTML do ROT
  const { data: rotHtml, isLoading: loadingRotHtml } = trpc.rotDocument.getRotHtml.useQuery(
    { rotId },
    { enabled: rotId > 0 && activeTab === "rot" }
  );

  // HTML do POP
  const { data: popHtml, isLoading: loadingPopHtml } = trpc.rotDocument.getPopHtml.useQuery(
    { rotId },
    { enabled: rotId > 0 && activeTab === "pop" }
  );

  // PREMIUM RENDER: queries com acesso seguro a rotData (antes dos returns condicionais)
  const rotMdQ = trpc.mapeamento.exportROT.useQuery(
    { rot: (rotData?.rot ?? {}) as any },
    { enabled: !!rotData?.rot && rotId > 0 }
  );

  const popObj = useMemo(() => {
    const r = rotData?.rot as any;
    if (!r) return null;
    return {
      title: `POP - ${r.title}`,
      processTitle: r.title,
      department: r.department || r.areaName || "PENDENTE",
      pointFocal: { name: r.pointFocalName || "", email: r.pointFocalEmail || "" },
      titularCategories: r.titularCategory ? [r.titularCategory] : (r.titularCategories || []),
      dataCategories: r.dataCategories || [],
      legalBase: r.legalBase || "PENDENTE",
      retentionPeriod: r.retentionPeriod || "PENDENTE",
      storageLocation: r.storageLocation || "PENDENTE",
      securityMeasures: r.securityMeasures || [],
      sharing: r.sharing || [],
      internationalTransfer: !!r.internationalTransfer,
      internationalCountries: r.internationalCountries || [],
      ropaData: r.ropaData || null,
      responsibilities: [
        { role: "DPO / Encarregado", description: "Validar conformidade, orientar e revisar periodicamente." },
        { role: "Gestor da Área", description: "Garantir execução do procedimento e evidências." },
        { role: "Operação", description: "Executar as etapas e registrar evidências." },
      ],
      documents: ["ROT", "POP"],
      records: ["Evidências por etapa", "Logs (quando aplicável)"],
      indicators: ["Revisões no período", "Incidentes/Não conformidades"],
      revision: { frequency: "Anual", criteria: ["Mudanças no processo", "Mudanças regulatórias", "Incidentes relevantes"] },
    };
  }, [rotData?.rot]);

  const popMdQ = trpc.mapeamento.exportPOP.useQuery(
    { pop: (popObj ?? {}) as any },
    { enabled: !!popObj && rotId > 0 }
  );

  // ROPA Markdown
  const ropaMdQ = trpc.mapeamento.exportROPA.useQuery(
    { rot: (rotData?.rot ?? {}) as any },
    { enabled: !!rotData?.rot && rotId > 0 && activeTab === "ropa" }
  );

  // Histórico de versões
  const versionEntityType = activeTab === "ropa" ? "ropa" as const : activeTab === "pop" ? "pop" as const : "rot" as const;
  const { data: versions } = trpc.rotDocument.getVersionHistory.useQuery(
    { entityType: versionEntityType, entityId: rotId },
    { enabled: rotId > 0 && showHistory }
  );

  // ==================== HANDLERS ====================

  // Gera HTML completo a partir do Markdown renderizado pelo MarkdownPretty
  const buildPrintableHtml = useCallback(() => {
    const el = document.getElementById("markdown-print-area");
    if (!el) return null;
    const r = rotData?.rot as any;
    const title = activeTab === "rot" ? `ROT - ${r?.title || ""}` : activeTab === "pop" ? `POP - ${r?.title || ""}` : `ROPA - ${r?.title || ""}`;
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@200;300;400;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', sans-serif; font-weight: 300; color: #222; padding: 40px; line-height: 1.6; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 600; color: #6B3FD9; margin-bottom: 16px; border-bottom: 2px solid #6B3FD9; padding-bottom: 8px; }
    h2 { font-size: 22px; font-weight: 600; color: #333; margin-top: 24px; margin-bottom: 12px; }
    h3 { font-size: 18px; font-weight: 400; color: #444; margin-top: 16px; margin-bottom: 8px; }
    p { margin-bottom: 8px; font-size: 14px; }
    ul, ol { margin-left: 20px; margin-bottom: 12px; }
    li { margin-bottom: 4px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #f3f0ff; color: #6B3FD9; font-weight: 600; text-align: left; padding: 8px 12px; border: 1px solid #e0dce8; font-size: 13px; }
    td { padding: 8px 12px; border: 1px solid #e8e8e8; font-size: 13px; }
    tr:nth-child(even) { background: #fafafa; }
    blockquote { border-left: 3px solid #6B3FD9; padding-left: 12px; margin: 12px 0; color: #555; font-style: italic; }
    strong { font-weight: 600; }
    code { background: #f5f2ff; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
    pre { background: #f5f2ff; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  ${el.innerHTML}
  <div class="footer">Documento gerado automaticamente pela plataforma Seusdados Due Diligence</div>
</body>
</html>`;
  }, [activeTab, rotData]);

  const handlePrint = useCallback(() => {
    const html = buildPrintableHtml();
    if (!html) {
      // Fallback para HTML legado
      const legacyHtml = activeTab === "rot" ? rotHtml?.html : popHtml?.html;
      if (!legacyHtml) return;
      const pw = window.open("", "_blank");
      if (pw) { pw.document.write(legacyHtml); pw.document.close(); setTimeout(() => pw.print(), 500); }
      return;
    }
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  }, [buildPrintableHtml, activeTab, rotHtml, popHtml]);

  const handleExportPdf = useCallback(async () => {
    const html = buildPrintableHtml();
    if (!html) {
      toast.info("Documento nao disponivel para exportacao.");
      return;
    }
    toast.info("Exportando PDF... O documento esta sendo preparado. Use 'Salvar como PDF' na caixa de impressao.");
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  }, [buildPrintableHtml, toast]);

  const handleCompare = useCallback((a: VersionEntry, b: VersionEntry) => {
    setCompareVersions({ a, b });
  }, []);

  // Exportação ROPA PDF
  const generateRopaPdf = trpc.rotDocument.generateRopaPdf.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("ROPA exportado em PDF com sucesso. O documento foi salvo no GED.");
      } else {
        toast.success("ROPA exportado em PDF e salvo no GED.");
      }
    },
    onError: (err) => {
      toast.error(`Erro ao exportar ROPA PDF: ${err.message}`);
    },
  });

  // Exportação ROPA CSV
  const exportRopaCsv = trpc.rotDocument.exportRopaCsv.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("ROPA exportado em CSV com sucesso. O documento foi salvo no GED.");
      } else {
        toast.success("ROPA exportado em CSV e salvo no GED.");
      }
    },
    onError: (err) => {
      toast.error(`Erro ao exportar ROPA CSV: ${err.message}`);
    },
  });

  // Exportação ROPA Excel (.xlsx)
  const exportRopaExcel = trpc.rotDocument.exportRopaExcel.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("ROPA completo exportado em Excel. O documento foi salvo no GED.");
      } else {
        toast.success("ROPA exportado em Excel e salvo no GED.");
      }
    },
    onError: (err) => {
      toast.error(`Erro ao exportar ROPA Excel: ${err.message}`);
    },
  });

  // ==================== STATUS HELPERS ====================

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    rascunho: { label: "Rascunho", color: "bg-gray-100 text-gray-600", icon: FileText },
    em_revisao: { label: "Em Revisao", color: "bg-yellow-100 text-yellow-700", icon: Clock },
    aprovado: { label: "Aprovado", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    arquivado: { label: "Arquivado", color: "bg-gray-100 text-gray-400", icon: FileText },
  };

  // ==================== LOADING ====================

  if (loadingRot) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  if (!rotData) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center py-24">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
        <h2 className="text-xl font-medium text-gray-700">ROT nao encontrado</h2>
        <p className="text-gray-400 font-light mt-2">
          O registro de operacoes de tratamento solicitado nao foi localizado.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate("/mapeamentos")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Mapeamentos
        </Button>
      </div>
    );
  }

  const { rot, organization, creator, approver, documents } = rotData;
  const status = statusConfig[rot.status] || statusConfig.rascunho;
  const StatusIcon = status.icon;

  const rotDocs = documents.filter((d) => d.documentType === "rot");
  const popDocs = documents.filter((d) => d.documentType === "pop");
  const ropaDocs = documents.filter((d) => d.documentType === "ropa");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* CABEÇALHO */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
            <button
              onClick={() => navigate("/mapeamentos")}
              className="hover:text-white transition-colors font-light"
            >
              Mapeamentos
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="font-light">Documentos</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white font-normal">ROT-{String(rot.id).padStart(6, "0")}</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-medium mb-1">{rot.title}</h1>
              <div className="flex items-center gap-3 text-white/80 text-sm font-light">
                <span>{organization.name}</span>
                {organization.cnpj && (
                  <>
                    <span className="opacity-50">|</span>
                    <span>{organization.cnpj}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${status.color} border-0`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE AÇÕES */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/mapeamentos")}
              className="text-gray-500"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={showHistory ? "bg-purple-50 border-purple-300 text-purple-700" : ""}
            >
              <History className="w-4 h-4 mr-1" />
              Historico
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/doc/rot/${rot.id}`)}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver ROT Renderizado
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/doc/pop/${rot.id}`)}
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <FileText className="w-4 h-4 mr-1" />
              Ver POP Renderizado
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" />
              Imprimir
            </Button>
            <Button
              size="sm"
              onClick={handleExportPdf}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Download className="w-4 h-4 mr-1" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className={`max-w-6xl mx-auto px-6 py-6 ${rot.status === "rascunho" || rot.status === "em_revisao" ? "watermark-draft" : ""}`}>
        <div className={`grid ${showHistory ? "grid-cols-3 gap-6" : "grid-cols-1"}`}>
          {/* DOCUMENTO */}
          <div className={showHistory ? "col-span-2" : ""}>
            {/* METADADOS RESUMIDOS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <ClipboardList className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Documentos ROT</span>
                  </div>
                  <p className="text-2xl font-light text-gray-800">{rotDocs.length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <FileCheck className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Documentos POP</span>
                  </div>
                  <p className="text-2xl font-light text-gray-800">{popDocs.length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Base Legal</span>
                  </div>
                  <p className="text-sm font-light text-gray-800 truncate">{rot.legalBase}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Consentimento</span>
                  </div>
                  <p className="text-sm font-light text-gray-800">
                    {rot.requiresConsent ? "Requerido" : "Nao requerido"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ABAS ROT / POP */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="rot" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Registro de Operacoes (ROT)
                </TabsTrigger>
                <TabsTrigger value="pop" className="gap-2">
                  <FileCheck className="w-4 h-4" />
                  Procedimento Operacional (POP)
                </TabsTrigger>
                <TabsTrigger value="ropa" className="gap-2">
                  <Table2 className="w-4 h-4" />
                  ROPA
                </TabsTrigger>
                <TabsTrigger value="info" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Informacoes
                </TabsTrigger>
              </TabsList>

              {/* ABA ROT */}
              <TabsContent value="rot">
                <Card className="border-0 shadow-sm overflow-hidden">
                  {loadingRotHtml || rotMdQ.isLoading ? (
                    <div className="p-8">
                      <Skeleton className="h-[600px] w-full" />
                    </div>
                  ) : rotMdQ.data ? (
                    <div id="markdown-print-area" className="p-6">
                      <MarkdownPretty markdown={String(rotMdQ.data || "")} />
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-light">Documento ROT nao disponivel</p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* ABA POP */}
              <TabsContent value="pop">
                <Card className="border-0 shadow-sm overflow-hidden">
                  {loadingPopHtml || popMdQ.isLoading ? (
                    <div className="p-8">
                      <Skeleton className="h-[600px] w-full" />
                    </div>
                  ) : popMdQ.data ? (
                    <div id="markdown-print-area" className="p-6">
                      <MarkdownPretty markdown={String(popMdQ.data || "")} />
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-400">
                      <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-light">Documento POP nao disponivel</p>
                      <p className="text-sm font-extralight mt-1">
                        Gere o POP a partir do ROT na pagina de detalhes do mapeamento
                      </p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* ABA ROPA */}
              <TabsContent value="ropa">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Table2 className="w-5 h-5 text-purple-600" />
                        Registro de Atividades de Tratamento (ROPA)
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateRopaPdf.mutate({ rotId })}
                          disabled={generateRopaPdf.isPending}
                          className="gap-1"
                        >
                          {generateRopaPdf.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          Exportar PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportRopaCsv.mutate({ rotId })}
                          disabled={exportRopaCsv.isPending}
                          className="gap-1"
                        >
                          {exportRopaCsv.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4" />
                          )}
                          Exportar CSV
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => exportRopaExcel.mutate({ organizationId: rot.organizationId })}
                          disabled={exportRopaExcel.isPending}
                          className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {exportRopaExcel.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4" />
                          )}
                          Exportar Excel
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {ropaMdQ.isLoading ? (
                      <div className="p-8">
                        <Skeleton className="h-[600px] w-full" />
                      </div>
                    ) : ropaMdQ.data ? (
                      <div id="markdown-print-area" className="p-6">
                        <MarkdownPretty markdown={String(ropaMdQ.data || "")} />
                      </div>
                    ) : (rot as any).ropaData ? (
                      <div className="text-center py-8 text-gray-500">
                        <Table2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="font-light">Dados ROPA disponiveis mas documento Markdown nao gerado</p>
                        <p className="text-sm font-extralight mt-1">Tente recarregar a pagina</p>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-400">
                        <Table2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-light">Dados ROPA nao disponiveis</p>
                        <p className="text-sm font-extralight mt-1">
                          Os dados ROPA sao preenchidos durante a entrevista de mapeamento
                        </p>
                      </div>
                    )}

                    {/* Documentos ROPA no GED */}
                    {ropaDocs.length > 0 && (
                      <div className="mt-6 pt-4 border-t">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Documentos ROPA exportados</h4>
                        <div className="space-y-2">
                          {ropaDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-purple-500" />
                                <div>
                                  <p className="text-sm font-normal text-gray-800">{doc.title}</p>
                                  <p className="text-xs text-gray-400 font-light">
                                    Versao {doc.version} | {doc.generatedAt ? new Date(doc.generatedAt).toLocaleDateString("pt-BR") : ""}
                                  </p>
                                </div>
                              </div>
                              {doc.isLatest === 1 && (
                                <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">Atual</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ABA INFORMAÇÕES */}
              <TabsContent value="info">
                <div className="space-y-6">
                  {/* Detalhes do ROT */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">Detalhes do Registro</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                            Organizacao
                          </label>
                          <p className="text-sm font-light text-gray-800">{organization.name}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                            CNPJ
                          </label>
                          <p className="text-sm font-light text-gray-800">{organization.cnpj || "Nao informado"}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                            Departamento
                          </label>
                          <p className="text-sm font-light text-gray-800">{rot.department || "Nao especificado"}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                            Categoria de Titulares
                          </label>
                          <p className="text-sm font-light text-gray-800">{rot.titularCategory}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                            Elaborado por
                          </label>
                          <p className="text-sm font-light text-gray-800">{creator.name}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                            Data de Criacao
                          </label>
                          <p className="text-sm font-light text-gray-800">
                            {rot.createdAt
                              ? new Date(rot.createdAt).toLocaleDateString("pt-BR")
                              : "Nao informada"}
                          </p>
                        </div>
                        {approver && (
                          <>
                            <div>
                              <label className="text-xs font-medium text-green-600 uppercase tracking-wider">
                                Aprovado por
                              </label>
                              <p className="text-sm font-light text-gray-800">{approver.name}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-green-600 uppercase tracking-wider">
                                Data de Aprovacao
                              </label>
                              <p className="text-sm font-light text-gray-800">
                                {rot.approvedAt
                                  ? new Date(rot.approvedAt).toLocaleDateString("pt-BR")
                                  : "Nao informada"}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Finalidade e Base Legal */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">Finalidade e Base Legal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border-l-3 border-purple-500 pl-4">
                        <label className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                          Finalidade do Tratamento
                        </label>
                        <p className="text-sm font-light text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">
                          {rot.purpose}
                        </p>
                      </div>
                      <div className="border-l-3 border-blue-500 pl-4">
                        <label className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                          Base Legal (LGPD)
                        </label>
                        <p className="text-sm font-light text-gray-700 mt-1">{rot.legalBase}</p>
                      </div>
                      {rot.justification && (
                        <div className="border-l-3 border-amber-500 pl-4">
                          <label className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                            Justificativa
                          </label>
                          <p className="text-sm font-light text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">
                            {rot.justification}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Categorias de Dados */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">Categorias de Dados Pessoais</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(rot.dataCategories || []).map((cat: any, i: number) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 p-2 rounded-lg text-sm font-light ${
                              cat.sensivel || cat.sensitive
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-gray-50 text-gray-700 border border-gray-200"
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                cat.sensivel || cat.sensitive ? "bg-red-500" : "bg-green-500"
                              }`}
                            />
                            {cat.name || cat}
                            {(cat.sensivel || cat.sensitive) && (
                              <Badge variant="outline" className="text-[9px] ml-auto text-red-600 border-red-300">
                                Sensivel
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documentos GED */}
                  {documents.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-medium">Documentos Vinculados</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {doc.documentType === "rot" ? (
                                  <ClipboardList className="w-5 h-5 text-blue-500" />
                                ) : doc.documentType === "pop" ? (
                                  <FileCheck className="w-5 h-5 text-green-500" />
                                ) : (
                                  <FileText className="w-5 h-5 text-amber-500" />
                                )}
                                <div>
                                  <p className="text-sm font-normal text-gray-800">{doc.title}</p>
                                  <p className="text-xs text-gray-400 font-light">
                                    Versao {doc.version} | {doc.documentType.toUpperCase()} |{" "}
                                    {doc.generatedAt
                                      ? new Date(doc.generatedAt).toLocaleDateString("pt-BR")
                                      : ""}
                                  </p>
                                </div>
                              </div>
                              {doc.isLatest === 1 && (
                                <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                                  Atual
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* PAINEL LATERAL - HISTÓRICO */}
          {showHistory && (
            <div className="col-span-1">
              <Card className="border-0 shadow-sm sticky top-16">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600" />
                    Historico de Versoes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VersionTimeline
                    versions={(versions || []) as VersionEntry[]}
                    onCompare={handleCompare}
                  />

                  {/* Comparação de versões */}
                  {compareVersions && (
                    <div className="mt-6 pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Comparacao: v{compareVersions.a.version} vs v{compareVersions.b.version}
                      </h4>
                      <TextDiff
                        oldText={
                          compareVersions.a.version < compareVersions.b.version
                            ? compareVersions.a.content
                            : compareVersions.b.content
                        }
                        newText={
                          compareVersions.a.version > compareVersions.b.version
                            ? compareVersions.a.content
                            : compareVersions.b.content
                        }
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="border-t bg-gray-50 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400 font-extralight">
          <div>
            <span className="font-normal text-purple-600">Seusdados</span> Consultoria em Gestão de Dados Limitada
            <br />
            CNPJ: 33.899.116/0001-63 | seusdados.com
          </div>
          <div className="text-right">
            Responsabilidade Técnica: Marcelo Fattori
            <br />
              Documento gerado pelo sistema Seusdados Due Diligence
            {rot.status === "rascunho" && (
              <span className="ml-2 text-red-400 font-normal">| DOCUMENTO EM RASCUNHO - NAO DISTRIBUIR</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
