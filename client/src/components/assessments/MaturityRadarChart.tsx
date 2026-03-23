import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Maximize2 } from 'lucide-react';
import Chart from 'chart.js/auto';

interface DomainScore {
  domain: string;
  domainName: string;
  score: number;
  maxScore: number;
}

interface MaturityRadarChartProps {
  title?: string;
  framework: string;
  domainScores: DomainScore[];
  onExportPNG?: () => void;
  onExportPDF?: () => void;
  isLoading?: boolean;
  showExportButtons?: boolean;
  height?: number;
}

const FRAMEWORK_COLORS: Record<string, { bg: string; border: string; point: string }> = {
  seusdados: { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgb(99, 102, 241)', point: 'rgb(79, 70, 229)' },
  conformidade_lgpd: { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgb(16, 185, 129)', point: 'rgb(5, 150, 105)' },
  misto: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgb(245, 158, 11)', point: 'rgb(217, 119, 6)' },
  sgd: { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgb(239, 68, 68)', point: 'rgb(220, 38, 38)' },
  ico: { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgb(59, 130, 246)', point: 'rgb(37, 99, 235)' },
  cnil: { bg: 'rgba(168, 85, 247, 0.2)', border: 'rgb(168, 85, 247)', point: 'rgb(147, 51, 234)' },
};

const FRAMEWORK_LABELS: Record<string, string> = {
  seusdados: 'Framework Seusdados',
  conformidade_lgpd: 'Conformidade LGPD',
  misto: 'Framework Misto',
  sgd: 'Sistema de Gestão de Dados',
  ico: 'ICO Framework',
  cnil: 'CNIL Framework',
};

export function MaturityRadarChart({
  title = 'Maturidade por Domínio',
  framework,
  domainScores,
  onExportPNG,
  onExportPDF,
  isLoading = false,
  showExportButtons = true,
  height = 400,
}: MaturityRadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const colors = FRAMEWORK_COLORS[framework] || FRAMEWORK_COLORS.seusdados;
  const frameworkLabel = FRAMEWORK_LABELS[framework] || framework;

  // Calcular média de maturidade
  const averageScore = domainScores.length > 0
    ? (domainScores.reduce((sum, d) => sum + d.score, 0) / domainScores.length).toFixed(1)
    : '0.0';

  useEffect(() => {
    if (!canvasRef.current || domainScores.length === 0) return;

    // Destruir gráfico anterior se existir
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Criar novo gráfico
    chartRef.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: domainScores.map(d => d.domainName),
        datasets: [
          {
            label: 'Maturidade Atual',
            data: domainScores.map(d => d.score),
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: 2,
            pointBackgroundColor: colors.point,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: colors.border,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
          {
            label: 'Meta (Alternativa e)',
            data: domainScores.map(() => 5),
            backgroundColor: 'rgba(156, 163, 175, 0.1)',
            borderColor: 'rgba(156, 163, 175, 0.5)',
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                family: 'Inter, sans-serif',
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            titleFont: {
              family: 'Inter, sans-serif',
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              family: 'Inter, sans-serif',
              size: 13,
            },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const domainData = domainScores[context.dataIndex];
                if (context.datasetIndex === 0) {
                  const letra = String.fromCharCode(96 + Math.round(value));
                  return `Alternativa ${letra}) - Pontuação ${value.toFixed(1)} de ${domainData?.maxScore || 5}`;
                }
                return `Meta: Alternativa e)`;
              },
            },
          },
        },
        scales: {
          r: {
            min: 0,
            max: 5,
            ticks: {
              stepSize: 1,
              font: {
                family: 'Inter, sans-serif',
                size: 11,
              },
              backdropColor: 'transparent',
            },
            pointLabels: {
              font: {
                family: 'Inter, sans-serif',
                size: 12,
                weight: 500,
              },
              color: '#374151',
            },
            grid: {
              color: 'rgba(156, 163, 175, 0.3)',
            },
            angleLines: {
              color: 'rgba(156, 163, 175, 0.3)',
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        animation: {
          duration: 800,
          easing: 'easeOutQuart',
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [domainScores, colors, framework]);

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `maturidade_${framework}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvasRef.current.toDataURL('image/png', 1.0);
    link.click();
    
    onExportPNG?.();
  };

  const handleExportPDF = () => {
    if (!canvasRef.current) return;
    
    const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title} - ${frameworkLabel}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 40px;
              background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
              min-height: 100vh;
            }
            .container {
              background: white;
              border-radius: 16px;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            .title {
              font-size: 28px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 16px;
              color: #6b7280;
            }
            .chart-container {
              text-align: center;
              margin: 30px 0;
            }
            .chart-image {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
            }
            .stats {
              display: flex;
              justify-content: center;
              gap: 40px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
            }
            .stat {
              text-align: center;
            }
            .stat-value {
              font-size: 32px;
              font-weight: 700;
              color: #4f46e5;
            }
            .stat-label {
              font-size: 14px;
              color: #6b7280;
              margin-top: 4px;
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
          <div class="container">
            <div class="header">
              <div class="title">${title}</div>
              <div class="subtitle">${frameworkLabel} • Gerado em ${new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
            </div>
            <div class="chart-container">
              <img src="${dataUrl}" class="chart-image" alt="${title}" />
            </div>
            <div class="stats">
              <div class="stat">
                <div class="stat-value">${averageScore}</div>
                <div class="stat-label">Maturidade Média</div>
              </div>
              <div class="stat">
                <div class="stat-value">${domainScores.length}</div>
                <div class="stat-label">Domínios Avaliados</div>
              </div>
              <div class="stat">
                <div class="stat-value">5.0</div>
                <div class="stat-label">Meta</div>
              </div>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Seusdados Consultoria. Todos os direitos reservados.
            </div>
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `maturidade_${framework}_${new Date().toISOString().split('T')[0]}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    
    onExportPDF?.();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isLoading) {
    return (
      <Card className={isFullscreen ? 'fixed inset-4 z-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Carregando gráfico...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-pulse bg-gray-200 rounded-full w-64 h-64"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (domainScores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p>Nenhum dado disponível para exibir o gráfico.</p>
            <p className="text-sm mt-2">Complete a avaliação para visualizar a maturidade.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <p className="text-sm text-gray-500 mt-1">{frameworkLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {showExportButtons && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPNG}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                PDF
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: isFullscreen ? 'calc(100vh - 200px)' : height }}>
          <canvas ref={canvasRef}></canvas>
        </div>
        
        {/* Estatísticas abaixo do gráfico */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{averageScore}</div>
            <div className="text-sm text-gray-500">Maturidade Média</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{domainScores.length}</div>
            <div className="text-sm text-gray-500">Domínios</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">5.0</div>
            <div className="text-sm text-gray-500">Meta</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MaturityRadarChart;
