import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Download, Calendar, Building2, User, Filter } from "lucide-react";
import { toast } from "sonner";

export default function TicketReports() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string>("");
  const [consultantId, setConsultantId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [reportHtml, setReportHtml] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  // Buscar organizações
  const { data: organizations } = trpc.organization.list.useQuery();
  
  // Buscar consultores (usando lista de usuários)
  const { data: consultants } = trpc.user.list.useQuery();

  // Mutation para gerar relatório
  const generateReport = trpc.tickets.generateTicketReport.useMutation({
    onSuccess: (data) => {
      setReportHtml(data.html);
      setShowPreview(true);
      toast.success("Relatório gerado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    }
  });

  const handleGenerateReport = () => {
    generateReport.mutate({
      organizationId: organizationId && organizationId !== 'all' ? parseInt(organizationId) : undefined,
      consultantId: consultantId && consultantId !== 'all' ? parseInt(consultantId) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: status && status !== 'all' ? status : undefined
    });
  };

  const handleDownloadHTML = () => {
    if (!reportHtml) return;
    
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-tickets-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Relatório baixado com sucesso!");
  };

  const handlePrint = () => {
    if (!reportHtml) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const canGenerateReports = user?.role === 'admin_global' || user?.role === 'consultor';

  if (!canGenerateReports) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Você não tem permissão para gerar relatórios de tickets.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios de Tickets</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados de tickets com métricas e análises
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Filtros */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros do Relatório
            </CardTitle>
            <CardDescription>
              Selecione os critérios para gerar o relatório
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organização
              </Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as organizações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as organizações</SelectItem>
                  {organizations?.map((org: { id: number; name: string }) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Consultor
              </Label>
              <Select value={consultantId} onValueChange={setConsultantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os consultores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os consultores</SelectItem>
                  {consultants?.map((consultant: { id: number; name: string | null }) => (
                    <SelectItem key={consultant.id} value={consultant.id.toString()}>
                      {consultant.name || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Até</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                  <SelectItem value="aguardando_terceiro">Aguardando Terceiro</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full" 
              onClick={handleGenerateReport}
              disabled={generateReport.isPending}
            >
              {generateReport.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview do Relatório */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Visualização do Relatório</CardTitle>
                <CardDescription>
                  {showPreview ? "Relatório gerado com sucesso" : "Gere um relatório para visualizar"}
                </CardDescription>
              </div>
              {showPreview && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadHTML}>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar HTML
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <FileText className="mr-2 h-4 w-4" />
                    Imprimir/PDF
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {showPreview ? (
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={reportHtml}
                  className="w-full h-[600px]"
                  title="Relatório de Tickets"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-medium">Nenhum relatório gerado</h3>
                <p className="text-sm max-w-md mt-2">
                  Selecione os filtros desejados e clique em "Gerar Relatório" para visualizar
                  as métricas e análises dos tickets.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cards de Informação */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tipos de Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• Resumo executivo com métricas</li>
              <li>• Distribuição por tipo e prioridade</li>
              <li>• Análise de SLA e prazos</li>
              <li>• Produtividade por consultor</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Formatos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• HTML (visualização web)</li>
              <li>• PDF (via impressão do navegador)</li>
              <li>• Impressão direta</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dicas de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• Use filtros para relatórios específicos</li>
              <li>• Exporte para PDF via "Imprimir"</li>
              <li>• Relatórios incluem até 50 tickets</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
