import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Shield, 
  FileText, 
  Download, 
  ChevronDown, 
  ChevronUp,
  ExternalLink 
} from 'lucide-react';
import { SmartDPOButton } from '../SmartDPOButton';

interface RiskItem {
  id: string;
  domain: string;
  domainName: string;
  lgpdArticles: string[];
  isoControls: string[];
  nistFunctions: string[];
  severity: 'muito_critica' | 'critica' | 'alta' | 'media' | 'baixa';
  probability: number; // 1-5
  impact: number; // 1-5
  score: number; // probability * impact
  description?: string;
  mitigation?: string;
}

interface RiskMatrix5ColumnsProps {
  title?: string;
  risks: RiskItem[];
  onEditRisk?: (risk: RiskItem) => void;
  onExport?: () => void;
  isEditable?: boolean;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: string; bgRow: string }> = {
  muito_critica: {
    label: 'Muito Crítico',
    color: 'bg-red-200 text-red-900 border-red-400',
    icon: '⛔',
    bgRow: 'bg-red-100 hover:bg-red-200',
  },
  critica: {
    label: 'Crítica',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: '🔴',
    bgRow: 'bg-red-50 hover:bg-red-100',
  },
  alta: {
    label: 'Alta',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: '🟠',
    bgRow: 'bg-orange-50 hover:bg-orange-100',
  },
  media: {
    label: 'Média',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: '🟡',
    bgRow: 'bg-yellow-50 hover:bg-yellow-100',
  },
  baixa: {
    label: 'Baixa',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '🟢',
    bgRow: 'bg-green-50 hover:bg-green-100',
  },
};

export function RiskMatrix5Columns({
  title = 'Matriz de Risco Multi-Norma',
  risks,
  onEditRisk,
  onExport,
  isEditable = false,
}: RiskMatrix5ColumnsProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'severity' | 'domain'>('severity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getSeverityOrder = (severity: string): number => {
    const order: Record<string, number> = { muito_critica: 5, critica: 4, alta: 3, media: 2, baixa: 1 };
    return order[severity as keyof typeof order] || 0;
  };

  const sortedRisks = [...risks].sort((a, b) => {
    if (sortBy === 'severity') {
      const diff = getSeverityOrder(b.severity) - getSeverityOrder(a.severity);
      return sortOrder === 'desc' ? diff : -diff;
    }
    const diff = a.domain.localeCompare(b.domain);
    return sortOrder === 'desc' ? -diff : diff;
  });

  const riskCounts = {
    muito_critica: risks.filter(r => r.severity === 'muito_critica').length,
    critica: risks.filter(r => r.severity === 'critica').length,
    alta: risks.filter(r => r.severity === 'alta').length,
    media: risks.filter(r => r.severity === 'media').length,
    baixa: risks.filter(r => r.severity === 'baixa').length,
  };

  const handleExport = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 40px; background: #f9fafb; }
            .container { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #1f2937; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #4f46e5; color: white; padding: 12px; text-align: left; font-weight: 600; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .critica { background: #fef2f2; }
            .alta { background: #fff7ed; }
            .media { background: #fefce8; }
            .baixa { background: #f0fdf4; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
            .badge-critica { background: #fee2e2; color: #991b1b; }
            .badge-alta { background: #ffedd5; color: #9a3412; }
            .badge-media { background: #fef9c3; color: #854d0e; }
            .badge-baixa { background: #dcfce7; color: #166534; }
            .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${title}</h1>
            <p>Gerado em ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}</p>
            <table>
              <thead>
                <tr>
                  <th>Domínio</th>
                  <th>LGPD</th>
                  <th>ISO 27001</th>
                  <th>NIST CSF</th>
                  <th>Severidade</th>
                </tr>
              </thead>
              <tbody>
                ${sortedRisks.map(risk => `
                  <tr class="${risk.severity}">
                    <td><strong>${risk.domain}</strong><br><small>${risk.domainName}</small></td>
                    <td>${risk.lgpdArticles.join(', ') || '-'}</td>
                    <td>${risk.isoControls.join(', ') || '-'}</td>
                    <td>${risk.nistFunctions.join(', ') || '-'}</td>
                    <td><span class="badge badge-${risk.severity}">${SEVERITY_CONFIG[risk.severity].icon} ${SEVERITY_CONFIG[risk.severity].label}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">© ${new Date().getFullYear()} Seusdados Consultoria</div>
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `matriz_risco_${new Date().toISOString().split('T')[0]}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    
    onExport?.();
  };

  if (risks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 text-gray-300 mb-4" />
            <p>Nenhum risco identificado ainda.</p>
            <p className="text-sm mt-2">Complete a análise para visualizar a matriz de riscos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-5 h-5 text-indigo-600" />
            {title}
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Cruzamento LGPD × ISO 27001 × NIST CSF
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </CardHeader>
      <CardContent>
        {/* Resumo de Riscos */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-900">{riskCounts.muito_critica}</div>
            <div className="text-xs text-red-800">Muito Críticos</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{riskCounts.critica}</div>
            <div className="text-xs text-red-700">Críticos</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{riskCounts.alta}</div>
            <div className="text-xs text-orange-700">Altos</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{riskCounts.media}</div>
            <div className="text-xs text-yellow-700">Médios</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{riskCounts.baixa}</div>
            <div className="text-xs text-green-700">Baixos</div>
          </div>
        </div>

        {/* Tabela de Riscos */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <th className="px-4 py-3 text-left font-semibold rounded-tl-lg">
                  <button 
                    onClick={() => { setSortBy('domain'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                    className="flex items-center gap-1 hover:text-indigo-200"
                  >
                    Domínio
                    {sortBy === 'domain' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    LGPD
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-semibold">ISO 27001</th>
                <th className="px-4 py-3 text-left font-semibold">NIST CSF</th>
                <th className="px-4 py-3 text-left font-semibold rounded-tr-lg">
                  <button 
                    onClick={() => { setSortBy('severity'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                    className="flex items-center gap-1 hover:text-indigo-200"
                  >
                    Severidade
                    {sortBy === 'severity' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRisks.map((risk, index) => {
                const config = SEVERITY_CONFIG[risk.severity];
                const isExpanded = expandedRows.has(risk.id);
                
                return (
                  <>
                    <tr 
                      key={risk.id}
                      className={`${config.bgRow} cursor-pointer transition-colors border-b border-gray-200`}
                      onClick={() => toggleRow(risk.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          <div>
                            <div className="font-semibold text-gray-900">{risk.domain}</div>
                            <div className="text-sm text-gray-600">{risk.domainName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {risk.lgpdArticles.map((art, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-white">
                              Art. {art}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {risk.isoControls.map((ctrl, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-white">
                              {ctrl}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {risk.nistFunctions.map((func, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-white">
                              {func}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`${config.color} border`}>
                            {config.icon} {config.label}
                          </Badge>
                          <SmartDPOButton
                            context={{
                              module: 'Due Diligence',
                              page: 'Matriz de Risco Multi-Norma',
                              entityType: 'risk_item',
                              entityId: risk.id,
                              entityName: risk.domain,
                              deepLink: `${window.location.pathname}#risco-${risk.id}`,
                              snapshot: {
                                domain: risk.domain,
                                domainName: risk.domainName,
                                severity: risk.severity,
                                probability: risk.probability,
                                impact: risk.impact,
                                score: risk.score,
                                description: risk.description,
                              },
                            }}
                            variant="ghost"
                            size="sm"
                            iconOnly
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          P:{risk.probability} × I:{risk.impact} = {risk.score}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Linha expandida com detalhes */}
                    {isExpanded && (
                      <tr key={`${risk.id}-details`} className="bg-gray-50">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Descrição do Risco</h4>
                              <p className="text-sm text-gray-600">
                                {risk.description || 'Sem descrição disponível.'}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Plano de Mitigação</h4>
                              <p className="text-sm text-gray-600">
                                {risk.mitigation || 'Plano de mitigação não definido.'}
                              </p>
                            </div>
                          </div>
                          {isEditable && (
                            <div className="mt-4 flex justify-end">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); onEditRisk?.(risk); }}
                                className="gap-2"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Editar Risco
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default RiskMatrix5Columns;
