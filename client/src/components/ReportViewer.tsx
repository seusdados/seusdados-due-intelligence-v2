import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Download, 
  Printer, 
  FileText, 
  X, 
  Maximize2, 
  Minimize2,
  Share2,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  htmlContent: string;
  reportType: string;
  onDownloadPdf?: () => void;
}

export function ReportViewer({ 
  isOpen, 
  onClose, 
  title, 
  htmlContent, 
  reportType,
  onDownloadPdf 
}: ReportViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Relatório HTML baixado com sucesso!");
  };

  const handleCopyLink = () => {
    // Criar um data URL para compartilhamento
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copiado para a área de transferência!");
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${isFullscreen ? 'max-w-[100vw] max-h-[100vh] w-screen h-screen m-0 rounded-none' : 'max-w-[900px] w-[95vw] max-h-[95vh] h-[90vh]'} p-0 overflow-hidden`}
      >
        {/* Header com controles */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-900 via-purple-800 to-purple-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">{title}</DialogTitle>
              <DialogDescription className="text-white/70 text-sm">
                Relatório {reportType} • Gerado em {new Date().toLocaleDateString('pt-BR')}
              </DialogDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botão Copiar Link */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="text-white hover:bg-white/10"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            
            {/* Botão Compartilhar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info("Funcionalidade de compartilhamento em desenvolvimento")}
              className="text-white hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            
            {/* Botão Fullscreen */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/10"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            {/* Botão Imprimir */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrint}
              className="text-white hover:bg-white/10"
            >
              <Printer className="h-4 w-4" />
            </Button>
            
            {/* Botão Download HTML */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadHtml}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              HTML
            </Button>
            
            {/* Botão Download PDF */}
            {onDownloadPdf && (
              <Button
                size="sm"
                onClick={onDownloadPdf}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            )}
            
            {/* Botão Fechar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Área de visualização do relatório */}
        <div className={`${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-[calc(90vh-140px)]'} overflow-auto bg-gray-100`}>
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            className="w-full h-full border-0"
            title={title}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente de botão para abrir relatório
interface ReportButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function ReportButton({ 
  onClick, 
  isLoading = false, 
  variant = 'default',
  size = 'default',
  className = '',
  children 
}: ReportButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={isLoading}
      className={`${className}`}
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
          Gerando...
        </>
      ) : (
        children || (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Gerar Relatório Premium
          </>
        )
      )}
    </Button>
  );
}

export default ReportViewer;
