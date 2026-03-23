import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';

interface ChartExporterProps {
  chartRef: React.RefObject<HTMLCanvasElement | null>;
  title?: string;
  onExportPNG?: () => void;
  onExportPDF?: () => void;
}

export function ChartExporter({ chartRef, title = 'Gráfico', onExportPNG, onExportPDF }: ChartExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'png' | 'pdf' | null>(null);

  const handleExportPNG = async () => {
    if (!chartRef.current) return;

    setIsExporting(true);
    setExportType('png');

    try {
      // Obter canvas do gráfico
      const canvas = chartRef.current;
      const dataUrl = canvas.toDataURL('image/png', 1.0);

      // Criar link de download
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();

      onExportPNG?.();
    } catch (error) {
      console.error('Erro ao exportar PNG:', error);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportPDF = async () => {
    if (!chartRef.current) return;

    setIsExporting(true);
    setExportType('pdf');

    try {
      // Obter canvas do gráfico
      const canvas = chartRef.current;
      const dataUrl = canvas.toDataURL('image/png', 1.0);

      // Criar HTML para PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 40px;
                background: white;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .title {
                font-size: 24px;
                font-weight: bold;
                color: #1f2937;
                margin-bottom: 10px;
              }
              .date {
                font-size: 14px;
                color: #6b7280;
              }
              .chart-container {
                text-align: center;
                margin: 20px 0;
              }
              .chart-image {
                max-width: 100%;
                height: auto;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 12px;
                color: #9ca3af;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">${title}</div>
              <div class="date">Gerado em: ${new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</div>
            </div>
            <div class="chart-container">
              <img src="${dataUrl}" class="chart-image" alt="${title}" />
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Seusdados Consultoria. Todos os direitos reservados.
            </div>
          </body>
        </html>
      `;

      // Criar blob e download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      onExportPDF?.();
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPNG}
        disabled={isExporting}
        className="gap-2"
      >
        {isExporting && exportType === 'png' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileImage className="w-4 h-4" />
        )}
        PNG
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        disabled={isExporting}
        className="gap-2"
      >
        {isExporting && exportType === 'pdf' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        PDF
      </Button>
    </div>
  );
}

/**
 * Hook para gerenciar referência do canvas do gráfico
 */
export function useChartRef() {
  const [chartRef, setChartRef] = useState<React.RefObject<HTMLCanvasElement | null>>({ current: null });

  const registerChart = (ref: HTMLCanvasElement | null) => {
    setChartRef({ current: ref });
  };

  return { chartRef, registerChart };
}
