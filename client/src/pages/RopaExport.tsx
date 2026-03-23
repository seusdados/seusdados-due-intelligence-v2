import { useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download,
  FileSpreadsheet,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Building2,
  Database,
  Calendar
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

export default function RopaExport() {
  const { selectedOrganization } = useOrganization();
  const [, navigate] = useLocation();
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Query para estatísticas
  const { data: rotStats, isLoading } = trpc.rot.getStats.useQuery(
    { organizationId: selectedOrganization?.id || 0 },
    { enabled: !!selectedOrganization?.id }
  );

  // Mutations para exportação
  const exportPdfMutation = trpc.rot.exportROPAPDF.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([Uint8Array.from(atob(data.data), c => c.charCodeAt(0))], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ROPA exportado em PDF com sucesso!');
      setExportingPdf(false);
    },
    onError: (error) => {
      toast.error(`Erro ao exportar PDF: ${error.message}`);
      setExportingPdf(false);
    }
  });

  const exportExcelMutation = trpc.rot.exportROPAExcel.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([Uint8Array.from(atob(data.data), c => c.charCodeAt(0))], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ROPA exportado em Excel com sucesso!');
      setExportingExcel(false);
    },
    onError: (error) => {
      toast.error(`Erro ao exportar Excel: ${error.message}`);
      setExportingExcel(false);
    }
  });

  const handleExportPdf = () => {
    if (!selectedOrganization?.id) return;
    setExportingPdf(true);
    exportPdfMutation.mutate({ organizationId: selectedOrganization.id });
  };

  const handleExportExcel = () => {
    if (!selectedOrganization?.id) return;
    setExportingExcel(true);
    exportExcelMutation.mutate({ organizationId: selectedOrganization.id });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" className="mb-2" onClick={() => navigate('/dpia')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-7 w-7 text-purple-600" />
            Exportação ROPA
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro de Atividades de Tratamento de Dados Pessoais (Art. 37, LGPD)
          </p>
        </div>

        {/* Info Card */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">O que é o ROPA?</h3>
                <p className="text-purple-700 mt-1">
                  O ROPA (Record of Processing Activities) é um registro obrigatório conforme o Art. 37 da LGPD, 
                  que documenta todas as atividades de tratamento de dados pessoais realizadas pela organização.
                  Este documento é essencial para demonstrar conformidade com a legislação de proteção de dados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Mapeamentos</p>
                    <p className="text-2xl font-bold">{rotStats?.total || 0}</p>
                  </div>
                  <Database className="h-8 w-8 text-purple-600 opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aprovados</p>
                    <p className="text-2xl font-bold text-green-600">{rotStats?.aprovado || 0}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600 opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Em Revisão</p>
                    <p className="text-2xl font-bold text-yellow-600">{rotStats?.emRevisao || 0}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-600 opacity-80" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rascunhos</p>
                    <p className="text-2xl font-bold text-gray-600">{rotStats?.rascunho || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-600 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Organization Info */}
        {selectedOrganization && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                Organização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Razão Social</p>
                  <p className="font-medium">{selectedOrganization.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{selectedOrganization.cnpj || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Geração</p>
                  <p className="font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PDF Export */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-600" />
                Exportar em PDF
              </CardTitle>
              <CardDescription>
                Documento formatado para impressão e arquivamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">O documento PDF inclui:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Dados do controlador (organização)</li>
                    <li>• Sumário executivo com estatísticas</li>
                    <li>• Lista completa de operações de tratamento</li>
                    <li>• Detalhes de cada mapeamento (finalidade, base legal, dados tratados)</li>
                    <li>• Nível de risco de cada operação</li>
                  </ul>
                </div>
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleExportPdf}
                  disabled={exportingPdf || !rotStats?.total}
                >
                  {exportingPdf ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Excel Export */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Exportar em Excel
              </CardTitle>
              <CardDescription>
                Planilha editável para análise e manipulação de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">A planilha Excel inclui:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Aba de informações gerais da organização</li>
                    <li>• Aba ROPA com todas as operações de tratamento</li>
                    <li>• Colunas: ID, Título, Descrição, Departamento, Titular, Finalidade</li>
                    <li>• Base Legal, Dados Tratados, Dados Sensíveis, Nível de Risco</li>
                    <li>• Filtros automáticos para análise</li>
                  </ul>
                </div>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleExportExcel}
                  disabled={exportingExcel || !rotStats?.total}
                >
                  {exportingExcel ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Gerando Excel...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Excel
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning if no data */}
        {rotStats?.total === 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Nenhum mapeamento encontrado</h3>
                  <p className="text-yellow-700 mt-1">
                    Não há operações de tratamento cadastradas para esta organização. 
                    Cadastre mapeamentos de dados para poder gerar o ROPA.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => navigate('/mapeamento')}
                  >
                    Ir para Mapeamentos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legal Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Referência Legal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <blockquote className="border-l-4 border-purple-500 pl-4 italic text-muted-foreground">
              "Art. 37. O controlador e o operador devem manter registro das operações de tratamento 
              de dados pessoais que realizarem, especialmente quando baseado no legítimo interesse."
              <footer className="mt-2 text-sm not-italic">
                — Lei nº 13.709/2018 (LGPD)
              </footer>
            </blockquote>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
