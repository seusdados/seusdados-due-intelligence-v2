import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  FileText, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Building2,
  Eye,
  Trash2,
  Filter,
  Download,
  FileSpreadsheet,
  BarChart3,
  FileSignature,
  ArrowRight
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { KPICards, KPICardData } from "@/components/KPICards";
import { toast } from "sonner";
import { Link } from "wouter";
import { Pagination } from "@/components/Pagination";
import { useAuth } from "@/_core/hooks/useAuth";

const statusColors: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  em_revisao: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-green-100 text-green-800",
  arquivado: "bg-blue-100 text-blue-800",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em Revisão",
  aprovado: "Aprovado",
  arquivado: "Arquivado",
};

export default function Mapeamentos() {
  const { selectedOrganization } = useOrganization();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const selectedOrganizationId = selectedOrganization?.id;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Capabilities de mapeamento do usuário corrente
  const { data: mapeamentoCaps } = trpc.userProfiles.getMyMapeamentoCapabilities.useQuery(
    { organizationId: selectedOrganizationId! },
    { enabled: !!selectedOrganizationId }
  );

  // Helpers de permissão
  const isAdminOrConsultor = ['admin_global', 'consultor'].includes(user?.role || '');
  const canCreate = mapeamentoCaps?.canRespondMapeamentos || isAdminOrConsultor;
  const canDelete = mapeamentoCaps?.canEditAreas || isAdminOrConsultor;
  const canExport = mapeamentoCaps?.canExportReports || isAdminOrConsultor;
  const canDelegate = mapeamentoCaps?.canDelegateProcesses || false;
  const canViewDashboard = mapeamentoCaps?.canViewDashboard || isAdminOrConsultor;

  // OBS: Criação manual (legado) removida. O único caminho válido é o Wizard premium:
  // /mapeamentos/novo

  const { data: rots, isLoading, refetch } = trpc.rot.list.useQuery(
    { organizationId: selectedOrganizationId! },
    { enabled: !!selectedOrganizationId }
  );

  const { data: stats } = trpc.rot.getStats.useQuery(
    { organizationId: selectedOrganizationId! },
    { enabled: !!selectedOrganizationId }
  );

  // Estatísticas unificadas (manuais + contratos)
  const { data: unifiedStats } = trpc.mapeamento.getUnifiedStats.useQuery(
    { organizationId: selectedOrganizationId! },
    { enabled: !!selectedOrganizationId }
  );

  // Mapeamentos de contratos
  const { data: contractMapeamentos, refetch: refetchContractMapeamentos } = trpc.mapeamento.listContractMapeamentos.useQuery(
    { organizationId: selectedOrganizationId!, status: 'all' },
    { enabled: !!selectedOrganizationId }
  );

  const exportPDFMutation = trpc.rot.exportROPAPDF.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("ROPA exportado em PDF com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao exportar PDF: ${error.message}`);
    }
  });

  const exportExcelMutation = trpc.rot.exportROPAExcel.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("ROPA exportado em Excel com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao exportar Excel: ${error.message}`);
    }
  });

  const exportZipMutation = trpc.rot.exportAllDocumentsZip.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Documentos exportados em ZIP com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao exportar ZIP: ${error.message}`);
    }
  });

  const deleteMutation = trpc.rot.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const filteredRots = rots?.filter(rot => {
    const matchesSearch = rot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rot.titularCategory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || rot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Paginação
  const totalItems = filteredRots?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRots = filteredRots?.slice(startIndex, endIndex);

  // Reset para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  if (!selectedOrganizationId) {
    return (
      <div className="p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800">
                Selecione uma organização no menu lateral para acessar os mapeamentos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // KPI data para o componente reutilizável - agora com estatísticas unificadas
  const totalMapeamentos = (unifiedStats?.manuais.total || 0) + (unifiedStats?.contratos.total || 0);
  const totalAprovados = (unifiedStats?.manuais.aprovado || 0) + (unifiedStats?.contratos.approved || 0);
  const totalPendentes = (unifiedStats?.manuais.rascunho || 0) + (unifiedStats?.manuais.em_revisao || 0) + (unifiedStats?.contratos.draft || 0);
  
  const kpiData: KPICardData[] = [
    { title: "Total Geral", value: totalMapeamentos, subtitle: "mapeamentos", icon: FileText, color: "violet" },
    { title: "Manuais", value: unifiedStats?.manuais.total || 0, subtitle: "ROTs criados", icon: Clock, color: "blue" as any },
    { title: "Contratos", value: unifiedStats?.contratos.total || 0, subtitle: "extraídos", icon: FileSignature, color: "amber" },
    { title: "Aprovados", value: totalAprovados, subtitle: "finalizados", icon: CheckCircle2, color: "emerald" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapeamento de Processos"
        subtitle="Registro de Operações de Tratamento (ROT) e Procedimentos Operacionais Padrão (POP)"
        icon={FileText}
        showBack={false}
        showDPOButton={true}
        dpoContext={{ module: "Mapeamento de Processos", page: "Listagem de ROT" }}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canViewDashboard && (
              <Link href="/mapeamentos-dashboard">
                <Button variant="outline" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            )}
            {canCreate && (
              <Link href="/mapeamentos/novo">
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Wizard
                </Button>
              </Link>
            )}
            {canExport && (
              <>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => exportPDFMutation.mutate({ organizationId: selectedOrganizationId! })}
                  disabled={exportPDFMutation.isPending}
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => exportExcelMutation.mutate({ organizationId: selectedOrganizationId! })}
                  disabled={exportExcelMutation.isPending}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
              </>
            )}
            {canCreate && (
              <Link href="/mapeamentos/novo">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Mapeamento
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <KPICards cards={kpiData} />

      {/* Tabs para separar mapeamentos manuais e de contratos */}
      <Tabs defaultValue="manuais" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="manuais" className="gap-2">
            <FileText className="h-4 w-4" />
            Manuais ({unifiedStats?.manuais.total || 0})
          </TabsTrigger>
          <TabsTrigger value="contratos" className="gap-2">
            <FileSignature className="h-4 w-4" />
            Contratos ({unifiedStats?.contratos.total || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manuais" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar mapeamentos..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="em_revisao">Em Revisão</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>

      {/* ROT List - Tabela Compacta */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredRots?.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum mapeamento encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro Registro de Operação de Tratamento
            </p>
            <Link href="/mapeamentos/novo">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Mapeamento
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-sm">Título</th>
                    <th className="text-left p-3 font-medium text-sm">Departamento</th>
                    <th className="text-left p-3 font-medium text-sm">Titular</th>
                    <th className="text-left p-3 font-medium text-sm">Base Legal</th>
                    <th className="text-left p-3 font-medium text-sm">Status</th>
                    <th className="text-right p-3 font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedRots?.map(rot => (
                    <tr 
                      key={rot.id} 
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/rot/${rot.id}`}
                    >
                      <td className="p-3">
                        <div className="font-light">{rot.title}</div>
                        <div className="text-xs font-extralight text-muted-foreground line-clamp-1">
                          {rot.purpose || rot.description || "Sem descrição"}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {rot.department || "-"}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{rot.titularCategory}</td>
                      <td className="p-3 text-sm">
                        <span className="line-clamp-1 font-extralight" title={rot.legalBase}>
                          {rot.legalBase?.split(' - ')[0] || "-"}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge className={statusColors[rot.status]}>
                          {statusLabels[rot.status]}
                        </Badge>
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/rot/${rot.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canDelete && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja excluir este mapeamento?")) {
                                  deleteMutation.mutate({ id: rot.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            )}
          </CardContent>
        </Card>
      )}
        </TabsContent>

        {/* Tab de Mapeamentos de Contratos */}
        <TabsContent value="contratos" className="space-y-4">
          {contractMapeamentos?.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <FileSignature className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum mapeamento de contrato</h3>
                <p className="text-muted-foreground mb-4">
                  Mapeamentos serão gerados automaticamente quando contratos forem analisados
                </p>
                <Link href="/analise-contratos">
                  <Button>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Ir para Análise de Contratos
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Contrato</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Data</th>
                        <th className="text-left p-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractMapeamentos?.map((mapeamento) => (
                        <tr key={mapeamento.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-medium">{mapeamento.contractTitle}</div>
                            <div className="text-sm text-muted-foreground">
                              {(mapeamento.extractedData as any)?.processTitle || 'Mapeamento extraído'}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={{
                              'draft': 'bg-yellow-100 text-yellow-800',
                              'approved': 'bg-green-100 text-green-800',
                              'rejected': 'bg-red-100 text-red-800',
                            }[mapeamento.status as string] || 'bg-gray-100 text-gray-800'}>
                              {{
                                'draft': 'Aguardando Aprovação',
                                'approved': 'Aprovado',
                                'rejected': 'Rejeitado',
                              }[mapeamento.status as string] || mapeamento.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {mapeamento.createdAt ? new Date(mapeamento.createdAt).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Link href={`/analise-contratos/${mapeamento.contractAnalysisId}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
