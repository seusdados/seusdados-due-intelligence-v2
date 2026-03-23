import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard, InfoCard, CardGrid, SectionHeader } from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus,
  Search,
  Download,
  Eye,
  Sparkles,
  Target,
  TrendingUp,
  AlertCircle,
  FileWarning,
  ArrowRight,
  RefreshCw,
  Calendar,
  Bell,
  Settings,
  History
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { FormattedTextDisplay } from '@/components/FormattedTextDisplay';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

interface DpiaItem {
  id: number;
  organizationId: number;
  title: string;
  description: string | null;
  sourceType: 'manual' | 'mapeamento' | 'contrato' | 'incidente';
  sourceId: number | null;
  riskLevel: 'baixo' | 'moderado' | 'alto' | 'critico';
  overallScore: number;
  status: 'draft' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface ReviewScheduleItem {
  id: number;
  mapeamentoType: string;
  mapeamentoId: number;
  mapeamentoTitle?: string;
  nextReviewDate: string;
  status: 'scheduled' | 'pending' | 'overdue' | 'completed' | 'skipped';
  reviewerName?: string;
}

export default function DpiaDashboard() {
  const { selectedOrganization } = useOrganization();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('dpias');
  
  // Modal states
  const [createDpiaOpen, setCreateDpiaOpen] = useState(false);
  const [newDpiaTitle, setNewDpiaTitle] = useState('');
  const [newDpiaDescription, setNewDpiaDescription] = useState('');
  const [configReviewOpen, setConfigReviewOpen] = useState(false);

  // Queries
  const { data: dpias, refetch: refetchDpias, isLoading: loadingDpias } = trpc.dpia.list.useQuery(
    { organizationId: selectedOrganization?.id },
    { enabled: !!selectedOrganization?.id }
  );

  const { data: highRiskMapeamentos } = trpc.dpia.getHighRiskMapeamentos.useQuery(
    { organizationId: selectedOrganization?.id || 0 },
    { enabled: !!selectedOrganization?.id }
  );

  const { data: reviewConfig } = trpc.dpia.getReviewConfig.useQuery(
    { organizationId: selectedOrganization?.id || 0 },
    { enabled: !!selectedOrganization?.id }
  );

  const { data: pendingReviews } = trpc.dpia.getPendingReviews.useQuery(
    { organizationId: selectedOrganization?.id },
    { enabled: !!selectedOrganization?.id }
  );

  const { data: upcomingReviews } = trpc.dpia.getUpcomingReviews.useQuery(
    { organizationId: selectedOrganization?.id || 0, daysAhead: 30 },
    { enabled: !!selectedOrganization?.id }
  );

  const { data: reviewStats } = trpc.dpia.getReviewStats.useQuery(
    { organizationId: selectedOrganization?.id || 0 },
    { enabled: !!selectedOrganization?.id }
  );

  // Mutations
  const createDpiaMutation = trpc.dpia.create.useMutation({
    onSuccess: () => {
      toast.success('DPIA criado com sucesso!');
      refetchDpias();
      setCreateDpiaOpen(false);
      setNewDpiaTitle('');
      setNewDpiaDescription('');
    },
    onError: (error) => {
      toast.error(`Erro ao criar DPIA: ${error.message}`);
    }
  });

  const generateFromMapeamentoMutation = trpc.dpia.generateFromMapeamento.useMutation({
    onSuccess: (data) => {
      toast.success(`DPIA gerado com ${data.risks.length} riscos identificados!`);
      refetchDpias();
    },
    onError: (error) => {
      toast.error(`Erro ao gerar DPIA: ${error.message}`);
    }
  });

  const exportPdfMutation = trpc.dpia.exportPDF.useMutation({
    onSuccess: (data) => {
      // Criar download do PDF
      const blob = new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exportado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao exportar PDF: ${error.message}`);
    }
  });

  // Filtrar DPIAs
  const filteredDpias = useMemo(() => {
    if (!dpias) return [];
    return dpias.filter((dpia: DpiaItem) => {
      const matchesSearch = !searchTerm || 
        dpia.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dpia.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || dpia.status === statusFilter;
      const matchesRisk = riskFilter === 'all' || dpia.riskLevel === riskFilter;
      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [dpias, searchTerm, statusFilter, riskFilter]);

  // Estatísticas
  const stats = useMemo(() => {
    if (!dpias) return { total: 0, draft: 0, inProgress: 0, approved: 0, highRisk: 0 };
    return {
      total: dpias.length,
      draft: dpias.filter((d: DpiaItem) => d.status === 'draft').length,
      inProgress: dpias.filter((d: DpiaItem) => d.status === 'in_progress' || d.status === 'pending_review').length,
      approved: dpias.filter((d: DpiaItem) => d.status === 'approved').length,
      highRisk: dpias.filter((d: DpiaItem) => d.riskLevel === 'alto' || d.riskLevel === 'critico').length,
    };
  }, [dpias]);

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'critico': return 'bg-red-500 text-white';
      case 'alto': return 'bg-orange-500 text-white';
      case 'moderado': return 'bg-yellow-500 text-black';
      case 'baixo': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'archived': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      in_progress: 'Em Andamento',
      pending_review: 'Aguardando Revisão',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      archived: 'Arquivado'
    };
    return labels[status] || status;
  };

  const getRiskLabel = (level: string) => {
    const labels: Record<string, string> = {
      baixo: 'Baixo',
      moderado: 'Moderado',
      alto: 'Alto',
      critico: 'Crítico'
    };
    return labels[level] || level;
  };

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue': return <Badge className="bg-red-500 text-white">Vencida</Badge>;
      case 'pending': return <Badge className="bg-yellow-500 text-black">Pendente</Badge>;
      case 'scheduled': return <Badge className="bg-blue-500 text-white">Agendada</Badge>;
      case 'completed': return <Badge className="bg-green-500 text-white">Concluída</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCreateDpia = () => {
    if (!selectedOrganization?.id || !newDpiaTitle.trim()) return;
    createDpiaMutation.mutate({
      organizationId: selectedOrganization.id,
      title: newDpiaTitle,
      description: newDpiaDescription || undefined
    });
  };

  const handleGenerateFromMapeamento = (rotId: number) => {
    if (!selectedOrganization?.id) return;
    generateFromMapeamentoMutation.mutate({
      rotId,
      organizationId: selectedOrganization.id
    });
  };

  const handleExportPdf = (dpiaId: number) => {
    exportPdfMutation.mutate({ dpiaId });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-7 w-7 text-purple-600" />
              DPIA & Revisão Periódica
            </h1>
            <p className="text-muted-foreground mt-1">
              Relatórios de Impacto à Proteção de Dados e gestão de revisões
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={createDpiaOpen} onOpenChange={setCreateDpiaOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo DPIA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo DPIA</DialogTitle>
                  <DialogDescription>
                    Crie um novo Relatório de Impacto à Proteção de Dados Pessoais
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      placeholder="Ex: DPIA - Sistema de RH"
                      value={newDpiaTitle}
                      onChange={(e) => setNewDpiaTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva o objetivo deste DPIA..."
                      value={newDpiaDescription}
                      onChange={(e) => setNewDpiaDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDpiaOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateDpia}
                    disabled={!newDpiaTitle.trim() || createDpiaMutation.isPending}
                  >
                    {createDpiaMutation.isPending ? 'Criando...' : 'Criar DPIA'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => navigate('/mapeamento/ropa-export')}>
              <Download className="h-4 w-4 mr-2" />
              Exportar ROPA
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <CardGrid columns={5}>
          <StatCard icon={FileText} iconGradient="violet" value={stats.total} label="Total DPIAs" />
          <StatCard icon={Clock} iconGradient="blue" value={stats.inProgress} label="Em Andamento" />
          <StatCard icon={CheckCircle} iconGradient="emerald" value={stats.approved} label="Aprovados" />
          <StatCard icon={AlertTriangle} iconGradient="amber" value={stats.highRisk} label="Alto Risco" />
          <StatCard icon={Bell} iconGradient="red" value={reviewStats?.pending || 0} label="Revisões Pendentes" />
        </CardGrid>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dpias" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              DPIAs
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Gerar Automático
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Revisões Periódicas
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* DPIAs Tab */}
          <TabsContent value="dpias" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar DPIAs..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="pending_review">Aguardando Revisão</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Nível de Risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Níveis</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* DPIA List */}
            {loadingDpias ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredDpias.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum DPIA encontrado</h3>
                  <p className="text-muted-foreground text-center mt-2">
                    Crie um novo DPIA ou gere automaticamente a partir de um mapeamento de alto risco.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredDpias.map((dpia: DpiaItem) => (
                  <Card key={dpia.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-light">{dpia.title}</h3>
                            <Badge className={getRiskBadgeColor(dpia.riskLevel)}>
                              {getRiskLabel(dpia.riskLevel)}
                            </Badge>
                            <Badge className={getStatusBadgeColor(dpia.status)}>
                              {getStatusLabel(dpia.status)}
                            </Badge>
                          </div>
                          {dpia.description && (
                            <FormattedTextDisplay
                              content={dpia.description}
                              variant="compact"
                              accentColor="purple"
                              className="mb-2"
                            />
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              Score: {dpia.overallScore}%
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(dpia.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            {dpia.sourceType !== 'manual' && (
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-4 w-4" />
                                Gerado de {dpia.sourceType}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/dpia/${dpia.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleExportPdf(dpia.id)}
                            disabled={exportPdfMutation.isPending}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                        </div>
                      </div>
                      {/* Progress bar for score */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Score de Risco</span>
                          <span className="font-medium">{dpia.overallScore}%</span>
                        </div>
                        <Progress 
                          value={dpia.overallScore} 
                          className={`h-2 ${dpia.overallScore >= 75 ? '[&>div]:bg-red-500' : dpia.overallScore >= 50 ? '[&>div]:bg-orange-500' : dpia.overallScore >= 25 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Geração Automática de DPIA
                </CardTitle>
                <CardDescription>
                  Selecione um mapeamento de alto risco para gerar automaticamente um DPIA com análise de riscos e medidas de mitigação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!highRiskMapeamentos || highRiskMapeamentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium">Nenhum mapeamento pendente</h3>
                    <p className="text-muted-foreground text-center mt-2">
                      Todos os mapeamentos aprovados já possuem DPIA ou não foram identificados como alto risco.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800">Mapeamentos sem DPIA</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Os mapeamentos abaixo foram aprovados mas ainda não possuem DPIA associado.
                            Clique em "Gerar DPIA" para criar automaticamente uma análise de riscos.
                          </p>
                        </div>
                      </div>
                    </div>
                    {highRiskMapeamentos.map((rot: any) => (
                      <Card key={rot.id} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{rot.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {rot.department} • {rot.titularCategory}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{rot.legalBase || 'Base legal não definida'}</Badge>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleGenerateFromMapeamento(rot.id)}
                              disabled={generateFromMapeamentoMutation.isPending}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {generateFromMapeamentoMutation.isPending ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Gerando...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Gerar DPIA
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            {/* Review Stats */}
            <CardGrid columns={4}>
              <StatCard icon={Calendar} iconGradient="blue" value={reviewStats?.totalScheduled || 0} label="Agendadas" />
              <StatCard icon={Clock} iconGradient="amber" value={reviewStats?.pending || 0} label="Pendentes" />
              <StatCard icon={AlertTriangle} iconGradient="red" value={reviewStats?.overdue || 0} label="Vencidas" />
              <StatCard icon={CheckCircle} iconGradient="emerald" value={reviewStats?.completedThisMonth || 0} label="Concluídas (Mês)" />
            </CardGrid>

            {/* Pending Reviews */}
            {pendingReviews && pendingReviews.length > 0 && (
              <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Revisões Pendentes/Vencidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingReviews.map((review: any) => (
                      <div key={review.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <h4 className="font-medium">{review.mapeamentoTitle || `Mapeamento #${review.mapeamentoId}`}</h4>
                          <p className="text-sm text-muted-foreground">
                            Vencimento: {new Date(review.nextReviewDate).toLocaleDateString('pt-BR')}
                            {review.reviewerName && ` • Responsável: ${review.reviewerName}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getReviewStatusBadge(review.status)}
                          <Button size="sm" variant="outline">
                            Revisar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Próximas Revisões (30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!upcomingReviews || upcomingReviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium">Nenhuma revisão agendada</h3>
                    <p className="text-muted-foreground text-center mt-2">
                      Não há revisões agendadas para os próximos 30 dias.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingReviews.map((review: any) => (
                      <div key={review.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{review.mapeamentoTitle || `Mapeamento #${review.mapeamentoId}`}</h4>
                          <p className="text-sm text-muted-foreground">
                            Agendada para: {new Date(review.nextReviewDate).toLocaleDateString('pt-BR')}
                            {review.reviewerName && ` • Responsável: ${review.reviewerName}`}
                          </p>
                        </div>
                        {getReviewStatusBadge(review.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-600" />
                  Configuração de Revisão Periódica
                </CardTitle>
                <CardDescription>
                  Configure o período de revisão e alertas para os mapeamentos da organização.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviewConfig ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Período de Revisão</p>
                        <p className="text-2xl font-bold">{reviewConfig.reviewPeriodDays} dias</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Alertas Antecipados</p>
                        <p className="text-2xl font-bold">{reviewConfig.alertDaysBefore} dias antes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={reviewConfig.isActive ? "default" : "secondary"}>
                        {reviewConfig.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Badge variant={reviewConfig.sendEmailAlerts ? "default" : "secondary"}>
                        {reviewConfig.sendEmailAlerts ? 'Alertas por E-mail Ativos' : 'Alertas por E-mail Desativados'}
                      </Badge>
                    </div>
                    <Button variant="outline" onClick={() => setConfigReviewOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Editar Configuração
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Configuração não definida</h3>
                    <p className="text-muted-foreground text-center mt-2 mb-4">
                      Configure o período de revisão periódica para os mapeamentos desta organização.
                    </p>
                    <Button onClick={() => setConfigReviewOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Configurar Revisão
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
