/**
 * Componente: Visualização de Documento A4 Contínuo
 * 
 * Exibe todas as cláusulas em formato de documento A4 retrato,
 * com quebras de página inteligentes, impressão fiel, exportação PDF real,
 * scroll sincronizado e edição inline.
 */

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Share2,
  FileText,
  Printer,
  Shield,
  Building2,
  Calendar,
  ChevronDown,
  Edit3,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { GovBrSignature } from "./GovBrSignature";
import { ClauseTemplateLibrary } from "./ClauseTemplateLibrary";

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
interface DocumentA4PreviewProps {
  clauses: Clause[];
  acceptedClauses: Record<string, boolean>;
  hiddenClauses: Record<string, boolean>;
  finalContents: Record<string, string>;
  parties: ContractParty[];
  contractTitle: string;
  analysisDate: string;
  documentFormat: DocumentFormat;
  includeParties: boolean;
  onDocumentFormatChange: (format: DocumentFormat) => void;
  onIncludePartiesChange: (include: boolean) => void;
  onDownload: (format: 'txt' | 'pdf' | 'docx') => void;
  onShare: () => void;
  onPrint: () => void;
  // Novos props para edição inline
  onClauseContentChange?: (clauseId: string, newContent: string) => void;
  // Props para scroll sincronizado
  scrollToClauseId?: string | null;
  onScrollComplete?: () => void;
}

// Estilos CSS para impressão A4
const printStyles = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 20mm 15mm 20mm 15mm;
    }
    
    .document-a4-container {
      width: 100% !important;
      max-width: none !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
    }
    
    .document-a4-page {
      width: 100% !important;
      min-height: auto !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      page-break-after: auto;
      page-break-inside: avoid;
    }
    
    .document-header {
      page-break-after: avoid;
    }
    
    .clause-block {
      page-break-inside: avoid;
      orphans: 3;
      widows: 3;
    }
    
    .clause-title {
      page-break-after: avoid;
    }
    
    .clause-content {
      page-break-before: avoid;
    }
    
    .document-footer {
      page-break-before: avoid;
    }
    
    .no-print {
      display: none !important;
    }
    
    .edit-button, .editing-controls {
      display: none !important;
    }
  }
`;

// Estilos para PDF
const getPdfStyles = () => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1e293b;
    background: white;
  }
  .document-header {
    text-align: center;
    margin-bottom: 24pt;
    padding-bottom: 16pt;
    border-bottom: 2pt solid #0f172a;
  }
  .document-title {
    font-size: 16pt;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 4pt;
  }
  .document-subtitle {
    font-size: 10pt;
    color: #64748b;
  }
  .document-meta {
    font-size: 9pt;
    color: #94a3b8;
    margin-top: 8pt;
  }
  .parties-section {
    background: #f8fafc;
    padding: 16pt;
    margin-bottom: 20pt;
    border: 1pt solid #e2e8f0;
  }
  .parties-title {
    font-size: 10pt;
    font-weight: 600;
    color: #475569;
    margin-bottom: 12pt;
  }
  .parties-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16pt;
  }
  .party-label {
    font-size: 9pt;
    color: #64748b;
    margin-bottom: 2pt;
  }
  .party-name {
    font-size: 11pt;
    font-weight: 500;
    color: #1e293b;
  }
  .party-cnpj {
    font-size: 9pt;
    color: #64748b;
  }
  .clause-block {
    margin-bottom: 20pt;
    page-break-inside: avoid;
  }
  .clause-number {
    font-size: 9pt;
    font-weight: 600;
    color: #059669;
    background: #d1fae5;
    padding: 2pt 8pt;
    display: inline-block;
    margin-bottom: 6pt;
  }
  .clause-title {
    font-size: 12pt;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 8pt;
  }
  .clause-content {
    font-size: 11pt;
    line-height: 1.7;
    color: #334155;
    text-align: justify;
  }
  .clause-content p {
    margin-bottom: 8pt;
  }
  .clause-content ul, .clause-content ol {
    margin-left: 20pt;
    margin-bottom: 8pt;
  }
  .clause-content li {
    margin-bottom: 4pt;
  }
  .clause-content strong {
    font-weight: 600;
    color: #0f172a;
  }
  .document-footer {
    margin-top: 32pt;
    padding-top: 16pt;
    border-top: 1pt solid #e2e8f0;
    text-align: center;
  }
  .footer-text {
    font-size: 8pt;
    color: #94a3b8;
  }
  .signature-section {
    margin-top: 40pt;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40pt;
  }
  .signature-block {
    text-align: center;
  }
  .signature-line {
    border-top: 1pt solid #1e293b;
    margin-top: 60pt;
    padding-top: 8pt;
  }
  .signature-name {
    font-size: 10pt;
    font-weight: 500;
  }
  .signature-role {
    font-size: 9pt;
    color: #64748b;
  }
  .edit-button, .editing-controls {
    display: none !important;
  }
`;

export function DocumentA4Preview({
  clauses,
  acceptedClauses,
  hiddenClauses,
  finalContents,
  parties,
  contractTitle,
  analysisDate,
  documentFormat,
  includeParties,
  onDocumentFormatChange,
  onIncludePartiesChange,
  onDownload,
  onShare,
  onPrint,
  onClauseContentChange,
  scrollToClauseId,
  onScrollComplete,
}: DocumentA4PreviewProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const clauseRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Estados para edição inline
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  // Filtrar apenas cláusulas visíveis (não ocultas)
  const visibleClauses = useMemo(() => {
    return clauses.filter(clause => !hiddenClauses[clause.id]);
  }, [clauses, hiddenClauses]);

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
        return 'Data Processing Agreement conforme Lei nº 13.709/2018 (LGPD)';
      case 'aditivo':
        return 'Termo Aditivo ao Contrato Principal para Adequação à LGPD';
      case 'capitulo_lgpd':
      default:
        return 'Capítulo dedicado à Proteção de Dados Pessoais conforme Lei nº 13.709/2018 (LGPD)';
    }
  };

  // Scroll sincronizado - quando scrollToClauseId mudar, rolar para a cláusula
  useEffect(() => {
    if (scrollToClauseId && clauseRefs.current[scrollToClauseId]) {
      const element = clauseRefs.current[scrollToClauseId];
      if (element && scrollContainerRef.current) {
        // Calcular posição relativa ao container de scroll
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollTop = scrollContainerRef.current.scrollTop;
        const targetPosition = elementRect.top - containerRect.top + scrollTop - 20;
        
        scrollContainerRef.current.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Destacar a cláusula temporariamente
        element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
          onScrollComplete?.();
        }, 2000);
      }
    }
  }, [scrollToClauseId, onScrollComplete]);

  // Iniciar edição inline
  const startEditing = useCallback((clauseId: string, content: string) => {
    setEditingClauseId(clauseId);
    setEditingContent(content);
  }, []);

  // Salvar edição inline
  const saveEditing = useCallback(() => {
    if (editingClauseId && onClauseContentChange) {
      onClauseContentChange(editingClauseId, editingContent);
      toast.success('Cláusula atualizada!');
    }
    setEditingClauseId(null);
    setEditingContent("");
  }, [editingClauseId, editingContent, onClauseContentChange]);

  // Cancelar edição inline
  const cancelEditing = useCallback(() => {
    setEditingClauseId(null);
    setEditingContent("");
  }, []);

  // Exportar PDF real usando html2pdf.js
  const handleExportPdf = useCallback(async () => {
    if (!documentRef.current) return;
    
    setIsExportingPdf(true);
    toast.info('Gerando PDF...');
    
    try {
      // Importar html2pdf dinamicamente
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Criar uma cópia do elemento para exportação (sem botões de edição)
      const clonedElement = documentRef.current.cloneNode(true) as HTMLElement;
      
      // Remover botões de edição do clone
      clonedElement.querySelectorAll('.edit-button, .editing-controls').forEach(el => el.remove());
      
      // Configurações do PDF
      const options = {
        margin: [15, 10, 15, 10] as [number, number, number, number], // top, left, bottom, right em mm
        filename: `${getDocumentTitle().replace(/[^a-zA-Z0-9]/g, '_')}_${contractTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const,
          compress: true,
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: '.clause-block, .parties-section, .signature-section',
        },
      };
      
      // Gerar PDF
      await html2pdf().set(options).from(clonedElement).save();
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [contractTitle, getDocumentTitle]);

  const handlePrint = () => {
    if (documentRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Criar cópia sem botões de edição
        const clonedElement = documentRef.current.cloneNode(true) as HTMLElement;
        clonedElement.querySelectorAll('.edit-button, .editing-controls').forEach(el => el.remove());
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${getDocumentTitle()} - ${contractTitle}</title>
            <style>
              ${printStyles}
              ${getPdfStyles()}
            </style>
          </head>
          <body>
            ${clonedElement.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
    onPrint();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Injetar estilos de impressão */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      
      {/* Barra de Controles (não imprime) */}
      <div className="no-print flex items-center justify-between gap-4 p-3 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {/* Seletor de Formato */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-600">Formato:</Label>
            <Select value={documentFormat} onValueChange={(v) => onDocumentFormatChange(v as DocumentFormat)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
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
              id="include-parties"
              checked={includeParties}
              onCheckedChange={onIncludePartiesChange}
              className="scale-75"
            />
            <Label htmlFor="include-parties" className="text-xs text-slate-600 cursor-pointer">
              Identificação das Partes
            </Label>
          </div>
        </div>
        
        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onShare}
          >
            <Share2 className="w-3 h-3 mr-1" />
            Compartilhar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onDownload('txt')}
          >
            TXT
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
          >
            {isExportingPdf ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <FileText className="w-3 h-3 mr-1" />
            )}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => onDownload('docx')}
          >
            <FileText className="w-3 h-3 mr-1" />
            DOCX
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs bg-slate-800 hover:bg-slate-900"
            onClick={handlePrint}
          >
            <Printer className="w-3 h-3 mr-1" />
            Imprimir
          </Button>
        </div>
      </div>
      
      {/* Barra Secundária com Assinatura Digital */}
      <div className="no-print flex items-center justify-end gap-4 p-2 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <GovBrSignature
            documentTitle={getDocumentTitle()}
            documentContent={visibleClauses.map(c => finalContents[c.id] || c.conteudo).join('\n\n')}
            onSignatureComplete={(info) => {
              toast.success(`Documento assinado por ${info.signerName}`);
            }}
          />
        </div>
      </div>
      
      {/* Área de Visualização do Documento */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-slate-100 p-4"
      >
        <div className="document-a4-container mx-auto" style={{ maxWidth: '210mm' }}>
          {/* Página A4 */}
          <div 
            ref={documentRef}
            className="document-a4-page bg-white shadow-lg"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '20mm 15mm',
              boxSizing: 'border-box',
            }}
          >
            {/* Cabeçalho do Documento */}
            <div className="document-header text-center mb-6 pb-4 border-b-2 border-slate-800">
              <h1 className="document-title text-lg font-semibold text-slate-900 mb-1">
                {getDocumentTitle()}
              </h1>
              <p className="document-subtitle text-xs text-slate-500">
                {getDocumentSubtitle()}
              </p>
              <div className="document-meta text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(analysisDate)}
                </span>
                <span>Ref: {contractTitle}</span>
              </div>
            </div>

            {/* Identificação das Partes */}
            {includeParties && (controlador || operador) && (
              <div className="parties-section bg-slate-50 p-4 mb-5 border border-slate-200">
                <div className="parties-title flex items-center gap-2 text-xs font-semibold text-slate-600 mb-3">
                  <Building2 className="h-4 w-4" />
                  Identificação das Partes
                </div>
                <div className="parties-grid grid grid-cols-2 gap-4">
                  {controlador && (
                    <div>
                      <p className="party-label text-[10px] text-slate-500 mb-0.5">Controlador</p>
                      <p className="party-name text-sm font-medium text-slate-800">{controlador.name}</p>
                      {controlador.cnpj && (
                        <p className="party-cnpj text-[10px] text-slate-500">CNPJ: {controlador.cnpj}</p>
                      )}
                    </div>
                  )}
                  {operador && (
                    <div>
                      <p className="party-label text-[10px] text-slate-500 mb-0.5">Operador</p>
                      <p className="party-name text-sm font-medium text-slate-800">{operador.name}</p>
                      {operador.cnpj && (
                        <p className="party-cnpj text-[10px] text-slate-500">CNPJ: {operador.cnpj}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conteúdo das Cláusulas - Corrido */}
            <div className="clauses-content">
              {visibleClauses.map((clause, idx) => {
                const content = finalContents[clause.id] || clause.conteudo;
                const isAccepted = acceptedClauses[clause.id];
                const isEditing = editingClauseId === clause.id;
                
                return (
                  <div 
                    key={clause.id}
                    ref={(el) => { clauseRefs.current[clause.id] = el; }}
                    id={`clause-${clause.id}`}
                    className="clause-block mb-5 transition-all duration-300 rounded-lg"
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="clause-number inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5">
                        Cláusula {idx + 1}
                        {isAccepted && (
                          <span className="ml-2 text-emerald-600">✓</span>
                        )}
                      </div>
                      
                      {/* Botão de Edição Inline */}
                      {onClauseContentChange && !isEditing && (
                        <button
                          className="edit-button text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
                          onClick={() => startEditing(clause.id, content)}
                          title="Editar cláusula"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    
                    <h3 
                      className="clause-title text-sm font-semibold text-slate-900 mb-2"
                      style={{ pageBreakAfter: 'avoid' }}
                    >
                      {clause.titulo}
                    </h3>
                    
                    {isEditing ? (
                      /* Modo de Edição Inline */
                      <div className="editing-controls space-y-2">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="min-h-[150px] text-sm leading-relaxed"
                          placeholder="Digite o conteúdo da cláusula..."
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEditing}
                            className="h-7 text-xs"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveEditing}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Modo de Visualização */
                      <div 
                        className="clause-content prose prose-sm max-w-none text-slate-700 text-justify leading-relaxed cursor-text hover:bg-slate-50/50 rounded p-1 -m-1 transition-colors"
                        style={{ 
                          fontSize: '11pt',
                          lineHeight: '1.7',
                          pageBreakBefore: 'avoid',
                        }}
                        onClick={() => onClauseContentChange && startEditing(clause.id, content)}
                        title={onClauseContentChange ? "Clique para editar" : undefined}
                      >
                        <Streamdown>{content}</Streamdown>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Seção de Assinaturas */}
            {includeParties && (controlador || operador) && (
              <div className="signature-section mt-10 pt-6 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-10">
                  {controlador && (
                    <div className="signature-block text-center">
                      <div className="signature-line border-t border-slate-800 mt-16 pt-2">
                        <p className="signature-name text-xs font-medium">{controlador.name}</p>
                        <p className="signature-role text-[10px] text-slate-500">(Controlador)</p>
                      </div>
                    </div>
                  )}
                  {operador && (
                    <div className="signature-block text-center">
                      <div className="signature-line border-t border-slate-800 mt-16 pt-2">
                        <p className="signature-name text-xs font-medium">{operador.name}</p>
                        <p className="signature-role text-[10px] text-slate-500">(Operador)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rodapé do Documento */}
            <div className="document-footer mt-8 pt-4 border-t border-slate-200 text-center">
              <p className="footer-text text-[8px] text-slate-400">
                Documento gerado pela plataforma Seusdados Due Diligence | {formatDate(new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentA4Preview;
