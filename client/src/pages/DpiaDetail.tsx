import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Download,
  ArrowLeft,
  Target,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  CheckSquare,
  RefreshCw,
  Calendar,
  User,
  Scale,
  ListTodo
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation, useParams } from 'wouter';
import { toast } from 'sonner';
import { FormattedTextDisplay } from '@/components/FormattedTextDisplay';

interface DpiaRisk {
  id: number;
  dpiaId: number;
  title: string;
  description: string;
  riskCategory: string;
  likelihood: string;
  impact: string;
  riskLevel: string;
  riskScore: number;
  status: string;
  legalReference: string | null;
}

interface DpiaMitigation {
  id: number;
  dpiaId: number;
  riskId: number;
  title: string;
  description: string;
  mitigationType: string;
  status: string;
  responsibleId: number | null;
  dueDate: string | null;
}

export default function DpiaDetail() {
  const params = useParams<{ id: string }>();
  const dpiaId = parseInt(params.id || '0');
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modal states
  const [addRiskOpen, setAddRiskOpen] = useState(false);
  const [addMitigationOpen, setAddMitigationOpen] = useState(false);
  const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null);
  
  // Form states
  const [newRisk, setNewRisk] = useState({
    title: '',
    description: '',
    riskCategory: 'acesso_nao_autorizado',
    likelihood: 'media',
    impact: 'medio',
    legalReference: ''
  });
  
  const [newMitigation, setNewMitigation] = useState({
    title: '',
    description: '',
    mitigationType: 'tecnica'
  });

  // Query
  const { data: dpiaDetails, isLoading, refetch } = trpc.dpia.getDetails.useQuery(
    { id: dpiaId },
    { enabled: dpiaId > 0 }
  );

  // Mutations
  const updateStatusMutation = trpc.dpia.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!');
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  });

  const addRiskMutation = trpc.dpia.addRisk.useMutation({
    onSuccess: () => {
      toast.success('Risco adicionado com sucesso!');
      refetch();
      setAddRiskOpen(false);
      setNewRisk({
        title: '',
        description: '',
        riskCategory: 'acesso_nao_autorizado',
        likelihood: 'media',
        impact: 'medio',
        legalReference: ''
      });
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar risco: ${error.message}`);
    }
  });

  const addMitigationMutation = trpc.dpia.addMitigation.useMutation({
    onSuccess: () => {
      toast.success('Medida de mitigação adicionada!');
      refetch();
      setAddMitigationOpen(false);
      setNewMitigation({
        title: '',
        description: '',
        mitigationType: 'tecnica'
      });
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar mitigação: ${error.message}`);
    }
  });

  const exportPdfMutation = trpc.dpia.exportPDF.useMutation({
    onSuccess: (data) => {
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

  const generateActionsMutation = trpc.dpia.generateActions.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.actionsCreated} ações criadas no Plano de Ação!`);
      } else {
        toast.error(data.errors.join(', ') || 'Nenhuma ação criada');
      }
    },
    onError: (error) => {
      toast.error(`Erro ao gerar ações: ${error.message}`);
    }
  });

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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      acesso_nao_autorizado: 'Acesso Não Autorizado',
      perda_dados: 'Perda de Dados',
      uso_indevido: 'Uso Indevido',
      violacao_privacidade: 'Violação de Privacidade',
      discriminacao: 'Discriminação',
      dano_financeiro: 'Dano Financeiro',
      dano_reputacional: 'Dano Reputacional',
      nao_conformidade_legal: 'Não Conformidade Legal',
      outro: 'Outro'
    };
    return labels[category] || category;
  };

  const getLikelihoodLabel = (likelihood: string) => {
    const labels: Record<string, string> = {
      muito_baixa: 'Muito Baixa',
      baixa: 'Baixa',
      media: 'Média',
      alta: 'Alta',
      muito_alta: 'Muito Alta'
    };
    return labels[likelihood] || likelihood;
  };

  const getImpactLabel = (impact: string) => {
    const labels: Record<string, string> = {
      muito_baixo: 'Muito Baixo',
      baixo: 'Baixo',
      medio: 'Médio',
      alto: 'Alto',
      muito_alto: 'Muito Alto'
    };
    return labels[impact] || impact;
  };

  const getMitigationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tecnica: 'Técnica',
      organizacional: 'Organizacional',
      juridica: 'Jurídica',
      fisica: 'Física',
      treinamento: 'Treinamento',
      monitoramento: 'Monitoramento',
      outro: 'Outro'
    };
    return labels[type] || type;
  };

  const getMitigationStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planejada: 'Planejada',
      em_implementacao: 'Em Implementação',
      implementada: 'Implementada',
      verificada: 'Verificada',
      cancelada: 'Cancelada'
    };
    return labels[status] || status;
  };

  const handleAddRisk = () => {
    if (!newRisk.title.trim() || !newRisk.description.trim()) return;
    addRiskMutation.mutate({
      dpiaId,
      ...newRisk,
      legalReference: newRisk.legalReference || undefined
    });
  };

  const handleAddMitigation = () => {
    if (!selectedRiskId || !newMitigation.title.trim() || !newMitigation.description.trim()) return;
    addMitigationMutation.mutate({
      dpiaId,
      riskId: selectedRiskId,
      ...newMitigation
    });
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({
      dpiaId,
      status: newStatus as any
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!dpiaDetails) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">DPIA não encontrado</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/dpia')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </MainLayout>
    );
  }

  const { dpia, risks, mitigations } = dpiaDetails;

  // Stats
  const riskStats = {
    total: risks.length,
    critico: risks.filter((r: DpiaRisk) => r.riskLevel === 'critico').length,
    alto: risks.filter((r: DpiaRisk) => r.riskLevel === 'alto').length,
    moderado: risks.filter((r: DpiaRisk) => r.riskLevel === 'moderado').length,
    baixo: risks.filter((r: DpiaRisk) => r.riskLevel === 'baixo').length,
  };

  const mitigationStats = {
    total: mitigations.length,
    planejada: mitigations.filter((m: DpiaMitigation) => m.status === 'planejada').length,
    emImplementacao: mitigations.filter((m: DpiaMitigation) => m.status === 'em_implementacao').length,
    implementada: mitigations.filter((m: DpiaMitigation) => m.status === 'implementada').length,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <Button variant="ghost" className="mb-2" onClick={() => navigate('/dpia')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-light text-foreground flex items-center gap-2">
              <Shield className="h-7 w-7 text-purple-600" />
              {dpia.title}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={getRiskBadgeColor(dpia.riskLevel)}>
                {getRiskLabel(dpia.riskLevel)}
              </Badge>
              <Badge className={getStatusBadgeColor(dpia.status)}>
                {getStatusLabel(dpia.status)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Score: {dpia.overallScore}%
              </span>
            </div>
            {dpia.description && (
              <FormattedTextDisplay
                content={dpia.description}
                variant="compact"
                accentColor="purple"
                className="mt-2 max-w-2xl"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Select value={dpia.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alterar Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="pending_review">Aguardando Revisão</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline"
              onClick={() => generateActionsMutation.mutate({ dpiaId })}
              disabled={generateActionsMutation.isPending}
            >
              <ListTodo className="h-4 w-4 mr-2" />
              {generateActionsMutation.isPending ? 'Gerando...' : 'Gerar Plano de Ação'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => exportPdfMutation.mutate({ dpiaId })}
              disabled={exportPdfMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Score Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Score de Risco Geral</span>
              <span className="text-2xl font-bold">{dpia.overallScore}%</span>
            </div>
            <Progress 
              value={dpia.overallScore} 
              className={`h-3 ${dpia.overallScore >= 75 ? '[&>div]:bg-red-500' : dpia.overallScore >= 50 ? '[&>div]:bg-orange-500' : dpia.overallScore >= 25 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>Baixo</span>
              <span>Moderado</span>
              <span>Alto</span>
              <span>Crítico</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Riscos</p>
                  <p className="text-2xl font-bold">{riskStats.total}</p>
                </div>
                <ShieldAlert className="h-8 w-8 text-purple-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Riscos Críticos/Altos</p>
                  <p className="text-2xl font-bold text-red-600">{riskStats.critico + riskStats.alto}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mitigações</p>
                  <p className="text-2xl font-bold">{mitigationStats.total}</p>
                </div>
                <ShieldCheck className="h-8 w-8 text-blue-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Implementadas</p>
                  <p className="text-2xl font-bold text-green-600">{mitigationStats.implementada}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="risks" className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Riscos ({riskStats.total})
            </TabsTrigger>
            <TabsTrigger value="mitigations" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Mitigações ({mitigationStats.total})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do DPIA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Criado em</span>
                    <span>{new Date(dpia.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Atualizado em</span>
                    <span>{new Date(dpia.updatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Origem</span>
                    <span className="capitalize">{dpia.sourceType}</span>
                  </div>
                  {dpia.nextReviewDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Próxima Revisão</span>
                      <span>{new Date(dpia.nextReviewDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Riscos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Crítico</span>
                    </div>
                    <span className="font-medium">{riskStats.critico}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>Alto</span>
                    </div>
                    <span className="font-medium">{riskStats.alto}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>Moderado</span>
                    </div>
                    <span className="font-medium">{riskStats.moderado}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Baixo</span>
                    </div>
                    <span className="font-medium">{riskStats.baixo}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Riscos Identificados</h3>
              <Dialog open={addRiskOpen} onOpenChange={setAddRiskOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Risco
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Risco</DialogTitle>
                    <DialogDescription>
                      Identifique um novo risco aos direitos e liberdades dos titulares.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="riskTitle">Título</Label>
                      <Input
                        id="riskTitle"
                        placeholder="Ex: Acesso não autorizado aos dados"
                        value={newRisk.title}
                        onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="riskDescription">Descrição</Label>
                      <Textarea
                        id="riskDescription"
                        placeholder="Descreva o risco em detalhes..."
                        value={newRisk.description}
                        onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select 
                          value={newRisk.riskCategory} 
                          onValueChange={(v) => setNewRisk({ ...newRisk, riskCategory: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="acesso_nao_autorizado">Acesso Não Autorizado</SelectItem>
                            <SelectItem value="perda_dados">Perda de Dados</SelectItem>
                            <SelectItem value="uso_indevido">Uso Indevido</SelectItem>
                            <SelectItem value="violacao_privacidade">Violação de Privacidade</SelectItem>
                            <SelectItem value="discriminacao">Discriminação</SelectItem>
                            <SelectItem value="dano_financeiro">Dano Financeiro</SelectItem>
                            <SelectItem value="dano_reputacional">Dano Reputacional</SelectItem>
                            <SelectItem value="nao_conformidade_legal">Não Conformidade Legal</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Probabilidade</Label>
                        <Select 
                          value={newRisk.likelihood} 
                          onValueChange={(v) => setNewRisk({ ...newRisk, likelihood: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="muito_baixa">Muito Baixa</SelectItem>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="muito_alta">Muito Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Impacto</Label>
                        <Select 
                          value={newRisk.impact} 
                          onValueChange={(v) => setNewRisk({ ...newRisk, impact: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="muito_baixo">Muito Baixo</SelectItem>
                            <SelectItem value="baixo">Baixo</SelectItem>
                            <SelectItem value="medio">Médio</SelectItem>
                            <SelectItem value="alto">Alto</SelectItem>
                            <SelectItem value="muito_alto">Muito Alto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="legalRef">Referência Legal</Label>
                        <Input
                          id="legalRef"
                          placeholder="Ex: Art. 46, LGPD"
                          value={newRisk.legalReference}
                          onChange={(e) => setNewRisk({ ...newRisk, legalReference: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddRiskOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleAddRisk}
                      disabled={!newRisk.title.trim() || !newRisk.description.trim() || addRiskMutation.isPending}
                    >
                      {addRiskMutation.isPending ? 'Adicionando...' : 'Adicionar Risco'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {risks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum risco identificado</h3>
                  <p className="text-muted-foreground text-center mt-2">
                    Adicione riscos manualmente ou gere automaticamente a partir de um mapeamento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {risks.map((risk: DpiaRisk) => (
                  <Card key={risk.id} className={`border-l-4 ${
                    risk.riskLevel === 'critico' ? 'border-l-red-500' :
                    risk.riskLevel === 'alto' ? 'border-l-orange-500' :
                    risk.riskLevel === 'moderado' ? 'border-l-yellow-500' :
                    'border-l-green-500'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold">{risk.title}</h4>
                            <Badge className={getRiskBadgeColor(risk.riskLevel)}>
                              {getRiskLabel(risk.riskLevel)}
                            </Badge>
                          </div>
                          <FormattedTextDisplay
                            content={risk.description}
                            variant="compact"
                            accentColor="amber"
                            className="mb-3"
                          />
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {getCategoryLabel(risk.riskCategory)}
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              Probabilidade: {getLikelihoodLabel(risk.likelihood)}
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4" />
                              Impacto: {getImpactLabel(risk.impact)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Scale className="h-4 w-4" />
                              Score: {risk.riskScore}
                            </span>
                            {risk.legalReference && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                {risk.legalReference}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedRiskId(risk.id);
                            setAddMitigationOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Mitigação
                        </Button>
                      </div>
                      
                      {/* Mitigations for this risk */}
                      {mitigations.filter((m: DpiaMitigation) => m.riskId === risk.id).length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="text-sm font-medium mb-2">Medidas de Mitigação:</h5>
                          <div className="space-y-2">
                            {mitigations
                              .filter((m: DpiaMitigation) => m.riskId === risk.id)
                              .map((mitigation: DpiaMitigation) => (
                                <div key={mitigation.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                  <div>
                                    <span className="font-medium">{mitigation.title}</span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                      ({getMitigationTypeLabel(mitigation.mitigationType)})
                                    </span>
                                  </div>
                                  <Badge variant="outline">
                                    {getMitigationStatusLabel(mitigation.status)}
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Mitigations Tab */}
          <TabsContent value="mitigations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Medidas de Mitigação</h3>
            </div>

            {mitigations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma medida de mitigação</h3>
                  <p className="text-muted-foreground text-center mt-2">
                    Adicione medidas de mitigação para os riscos identificados.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {mitigations.map((mitigation: DpiaMitigation) => {
                  const relatedRisk = risks.find((r: DpiaRisk) => r.id === mitigation.riskId);
                  return (
                    <Card key={mitigation.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold">{mitigation.title}</h4>
                              <Badge variant="outline">
                                {getMitigationTypeLabel(mitigation.mitigationType)}
                              </Badge>
                              <Badge variant="secondary">
                                {getMitigationStatusLabel(mitigation.status)}
                              </Badge>
                            </div>
                            <FormattedTextDisplay
                              content={mitigation.description}
                              variant="compact"
                              accentColor="teal"
                              className="mb-3"
                            />
                            {relatedRisk && (
                              <div className="flex items-center gap-2 text-sm">
                                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Risco relacionado:</span>
                                <span className="font-medium">{relatedRisk.title}</span>
                                <Badge className={`${getRiskBadgeColor(relatedRisk.riskLevel)} text-xs`}>
                                  {getRiskLabel(relatedRisk.riskLevel)}
                                </Badge>
                              </div>
                            )}
                            {mitigation.dueDate && (
                              <div className="flex items-center gap-2 text-sm mt-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Prazo:</span>
                                <span>{new Date(mitigation.dueDate).toLocaleDateString('pt-BR')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Mitigation Dialog */}
        <Dialog open={addMitigationOpen} onOpenChange={setAddMitigationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Medida de Mitigação</DialogTitle>
              <DialogDescription>
                Defina uma medida para mitigar o risco selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mitigationTitle">Título</Label>
                <Input
                  id="mitigationTitle"
                  placeholder="Ex: Implementar controle de acesso"
                  value={newMitigation.title}
                  onChange={(e) => setNewMitigation({ ...newMitigation, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mitigationDescription">Descrição</Label>
                <Textarea
                  id="mitigationDescription"
                  placeholder="Descreva a medida de mitigação..."
                  value={newMitigation.description}
                  onChange={(e) => setNewMitigation({ ...newMitigation, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Medida</Label>
                <Select 
                  value={newMitigation.mitigationType} 
                  onValueChange={(v) => setNewMitigation({ ...newMitigation, mitigationType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tecnica">Técnica</SelectItem>
                    <SelectItem value="organizacional">Organizacional</SelectItem>
                    <SelectItem value="juridica">Jurídica</SelectItem>
                    <SelectItem value="fisica">Física</SelectItem>
                    <SelectItem value="treinamento">Treinamento</SelectItem>
                    <SelectItem value="monitoramento">Monitoramento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMitigationOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddMitigation}
                disabled={!newMitigation.title.trim() || !newMitigation.description.trim() || addMitigationMutation.isPending}
              >
                {addMitigationMutation.isPending ? 'Adicionando...' : 'Adicionar Mitigação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
