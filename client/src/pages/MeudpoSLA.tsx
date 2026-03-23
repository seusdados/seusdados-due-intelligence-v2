import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Timer,
  Target,
  BarChart3,
  Download,
  RefreshCw,
  Building2,
  Calendar,
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MeudpoSLA() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [period, setPeriod] = useState("30");

  const isAdminOrConsultor = user?.role === "admin_global" || user?.role === "consultor";
  const effectiveOrgId = isAdminOrConsultor ? selectedOrganization?.id : user?.organizationId;

  const startDate = format(subDays(new Date(), parseInt(period)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");

  const { data: reportData, isLoading, refetch } = trpc.tickets.getReportData.useQuery(
    {
      organizationId: effectiveOrgId!,
      startDate,
      endDate,
    },
    { enabled: !!effectiveOrgId }
  );

  const { data: settings } = trpc.notifications.getSettings.useQuery(
    { organizationId: effectiveOrgId! },
    { enabled: !!effectiveOrgId }
  );

  const generatePDFMutation = trpc.tickets.generateReportPDF.useMutation({
    onSuccess: (data) => {
      // Converter base64 para blob e fazer download
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  if (!effectiveOrgId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="heading-4 mb-2">Selecione uma Organização</h2>
        <p className="text-muted-foreground max-w-md">
          Para visualizar o painel de SLA, selecione uma organização no menu lateral.
        </p>
      </div>
    );
  }

  const tickets = reportData?.tickets;
  const slaTotal = (tickets?.slaAtendido || 0) + (tickets?.slaViolado || 0);
  const slaPercentage = slaTotal > 0 ? Math.round((tickets?.slaAtendido || 0) / slaTotal * 100) : 0;

  const getSlaColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getSlaProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel de SLA</h1>
          <p className="text-muted-foreground">
            Métricas de desempenho e cumprimento de SLA do MeuDPO
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isAdminOrConsultor && (
            <Button
              onClick={() =>
                generatePDFMutation.mutate({
                  organizationId: effectiveOrgId!,
                  startDate,
                  endDate,
                })
              }
              disabled={generatePDFMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Organização selecionada */}
      {effectiveOrgId && selectedOrganization && (
        <div className="flex items-center gap-2 body-small">
          <Building2 className="h-4 w-4" />
          <span>Organização: <strong>{selectedOrganization.name}</strong></span>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-8 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPIs Principais */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Taxa de SLA
                    </p>
                    <p className={`heading-2 ${getSlaColor(slaPercentage)}`}>
                      {slaPercentage}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${slaPercentage >= 90 ? 'bg-green-100' : slaPercentage >= 70 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                    <Target className={`h-6 w-6 ${getSlaColor(slaPercentage)}`} />
                  </div>
                </div>
                <Progress
                  value={slaPercentage}
                  className="mt-3 h-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Tempo Médio Resolução
                    </p>
                    <p className="heading-2">
                      {tickets?.tempoMedioResolucao || 0}h
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Timer className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Meta: {settings?.slaMedia || 24}h (prioridade média)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      SLA Atendido
                    </p>
                    <p className="heading-2 text-green-600">
                      {tickets?.slaAtendido || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tickets resolvidos dentro do prazo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      SLA Violado
                    </p>
                    <p className="heading-2 text-red-600">
                      {tickets?.slaViolado || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-red-100">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tickets que excederam o prazo
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs com detalhes */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="priority">Por Prioridade</TabsTrigger>
              <TabsTrigger value="type">Por Tipo</TabsTrigger>
              <TabsTrigger value="sla-config">Configuração SLA</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Status dos Tickets */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status dos Tickets</CardTitle>
                    <CardDescription>Distribuição por status no período</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span>Abertos</span>
                        </div>
                        <span className="font-semibold">{tickets?.abertos || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <span>Em Andamento</span>
                        </div>
                        <span className="font-semibold">{tickets?.emAndamento || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span>Resolvidos</span>
                        </div>
                        <span className="font-semibold">{tickets?.resolvidos || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-gray-500" />
                          <span>Fechados</span>
                        </div>
                        <span className="font-semibold">{tickets?.fechados || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Resumo do Período */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo do Período</CardTitle>
                    <CardDescription>
                      {format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} a{" "}
                      {format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>Total de Tickets</span>
                        <span className="text-2xl font-bold">{tickets?.total || 0}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-green-50 rounded-lg text-center">
                          <p className="text-sm text-green-600">Taxa de Resolução</p>
                          <p className="text-xl font-bold text-green-700">
                            {tickets?.total ? Math.round(((tickets?.resolvidos || 0) + (tickets?.fechados || 0)) / tickets.total * 100) : 0}%
                          </p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg text-center">
                          <p className="text-sm text-blue-600">Pendentes</p>
                          <p className="text-xl font-bold text-blue-700">
                            {(tickets?.abertos || 0) + (tickets?.emAndamento || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="priority" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tickets por Prioridade</CardTitle>
                  <CardDescription>Distribuição e SLA por nível de prioridade</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prioridade</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                        <TableHead className="text-center">SLA (horas)</TableHead>
                        <TableHead className="text-center">% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Badge variant="destructive">Crítica</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {tickets?.porPrioridade.critica || 0}
                        </TableCell>
                        <TableCell className="text-center">{settings?.slaCritica || 4}h</TableCell>
                        <TableCell className="text-center">
                          {tickets?.total ? Math.round((tickets.porPrioridade.critica / tickets.total) * 100) : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Badge className="bg-orange-500">Alta</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {tickets?.porPrioridade.alta || 0}
                        </TableCell>
                        <TableCell className="text-center">{settings?.slaAlta || 8}h</TableCell>
                        <TableCell className="text-center">
                          {tickets?.total ? Math.round((tickets.porPrioridade.alta / tickets.total) * 100) : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Badge className="bg-blue-500">Média</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {tickets?.porPrioridade.media || 0}
                        </TableCell>
                        <TableCell className="text-center">{settings?.slaMedia || 24}h</TableCell>
                        <TableCell className="text-center">
                          {tickets?.total ? Math.round((tickets.porPrioridade.media / tickets.total) * 100) : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Badge variant="secondary">Baixa</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {tickets?.porPrioridade.baixa || 0}
                        </TableCell>
                        <TableCell className="text-center">{settings?.slaBaixa || 72}h</TableCell>
                        <TableCell className="text-center">
                          {tickets?.total ? Math.round((tickets.porPrioridade.baixa / tickets.total) * 100) : 0}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="type" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tickets por Tipo</CardTitle>
                  <CardDescription>Distribuição por categoria de atendimento</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                        <TableHead className="text-center">% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(tickets?.porTipo || {}).map(([tipo, quantidade]) => (
                        <TableRow key={tipo}>
                          <TableCell className="capitalize">
                            {tipo.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {quantidade as number}
                          </TableCell>
                          <TableCell className="text-center">
                            {tickets?.total ? Math.round(((quantidade as number) / tickets.total) * 100) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                      {Object.keys(tickets?.porTipo || {}).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            Nenhum ticket no período
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sla-config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuração de SLA</CardTitle>
                  <CardDescription>
                    Prazos configurados para cada nível de prioridade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive">Crítica</Badge>
                      </div>
                      <p className="text-2xl font-bold">{settings?.slaCritica || 4} horas</p>
                      <p className="body-small">
                        Tempo máximo para resolução
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-orange-500">Alta</Badge>
                      </div>
                      <p className="text-2xl font-bold">{settings?.slaAlta || 8} horas</p>
                      <p className="body-small">
                        Tempo máximo para resolução
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-500">Média</Badge>
                      </div>
                      <p className="text-2xl font-bold">{settings?.slaMedia || 24} horas</p>
                      <p className="body-small">
                        Tempo máximo para resolução
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">Baixa</Badge>
                      </div>
                      <p className="text-2xl font-bold">{settings?.slaBaixa || 72} horas</p>
                      <p className="body-small">
                        Tempo máximo para resolução
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">Aviso de SLA</span>
                    </div>
                    <p className="body-small">
                      Notificação enviada quando o ticket atinge{" "}
                      <strong>{settings?.slaWarningThreshold || 80}%</strong> do tempo de SLA
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
