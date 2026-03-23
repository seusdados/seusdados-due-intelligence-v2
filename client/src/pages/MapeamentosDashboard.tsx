import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, InfoCard, CardGrid, SectionHeader } from '@/components/DashboardCard';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  PieChart, 
  Activity, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Building2,
  Calendar,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

const statusColors: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  pendente: "bg-yellow-100 text-yellow-800",
  em_revisao: "bg-blue-100 text-blue-800",
  aprovado: "bg-green-100 text-green-800",
  arquivado: "bg-purple-100 text-purple-800",
};

const riskColors: Record<string, string> = {
  baixo: "bg-green-500",
  medio: "bg-yellow-500",
  alto: "bg-orange-500",
  critico: "bg-red-500",
};

const riskLabels: Record<string, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

export default function MapeamentosDashboard() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || 0;

  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = trpc.rot.getDashboardStats.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: timeline, isLoading: loadingTimeline } = trpc.rot.getTimeline.useQuery(
    { organizationId, limit: 10 },
    { enabled: !!organizationId }
  );

  const { data: heatmap, isLoading: loadingHeatmap } = trpc.rot.getRiskHeatmap.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const isLoading = loadingStats || loadingTimeline || loadingHeatmap;

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/mapeamentos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Mapeamentos</h1>
            <p className="text-muted-foreground">
              Visão geral do progresso e riscos dos mapeamentos de dados
            </p>
          </div>
        </div>
        <Button onClick={() => refetchStats()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Cards de Resumo */}
      <CardGrid columns={4}>
        <StatCard icon={FileText} iconGradient="blue" value={stats?.totalMapeamentos || 0} label="Total de Mapeamentos" />
        <StatCard icon={CheckCircle2} iconGradient="emerald" value={stats?.entrevistasConcluidas || 0} label="Concluídos" />
        <StatCard icon={Clock} iconGradient="amber" value={stats?.entrevistasPendentes || 0} label="Pendentes" />
        <StatCard icon={TrendingUp} iconGradient="violet" value={`${stats?.progressoGeral || 0}%`} label="Progresso Geral" />
      </CardGrid>

      <div className="mb-0" />

      {/* Barra de Progresso */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Progresso Geral dos Mapeamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{stats?.entrevistasConcluidas || 0} concluídos</span>
              <span>{stats?.totalMapeamentos || 0} total</span>
            </div>
            <Progress value={stats?.progressoGeral || 0} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="heatmap" className="space-y-4">
        <TabsList>
          <TabsTrigger value="heatmap" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Mapa de Calor de Riscos
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <PieChart className="h-4 w-4" />
            Por Status
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        {/* Mapa de Calor de Riscos */}
        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle>Mapa de Calor de Riscos por Departamento</CardTitle>
              <CardDescription>
                Distribuição dos níveis de risco identificados em cada departamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {heatmap && heatmap.length > 0 ? (
                <div className="space-y-4">
                  {/* Legenda */}
                  <div className="flex gap-4 justify-end">
                    {Object.entries(riskLabels).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${riskColors[key]}`} />
                        <span className="text-sm">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Barras */}
                  <div className="space-y-3">
                    {heatmap.map((item) => (
                      <div key={item.departamento} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{item.departamento}</span>
                          </div>
                          <span className="body-small">{item.total} mapeamentos</span>
                        </div>
                        <div className="flex h-8 rounded-lg overflow-hidden">
                          {item.baixo > 0 && (
                            <div 
                              className={`${riskColors.baixo} flex items-center justify-center text-white text-xs font-medium`}
                              style={{ width: `${(item.baixo / item.total) * 100}%` }}
                            >
                              {item.baixo}
                            </div>
                          )}
                          {item.medio > 0 && (
                            <div 
                              className={`${riskColors.medio} flex items-center justify-center text-white text-xs font-medium`}
                              style={{ width: `${(item.medio / item.total) * 100}%` }}
                            >
                              {item.medio}
                            </div>
                          )}
                          {item.alto > 0 && (
                            <div 
                              className={`${riskColors.alto} flex items-center justify-center text-white text-xs font-medium`}
                              style={{ width: `${(item.alto / item.total) * 100}%` }}
                            >
                              {item.alto}
                            </div>
                          )}
                          {item.critico > 0 && (
                            <div 
                              className={`${riskColors.critico} flex items-center justify-center text-white text-xs font-medium`}
                              style={{ width: `${(item.critico / item.total) * 100}%` }}
                            >
                              {item.critico}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum dado de risco disponível</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Status */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
              <CardDescription>
                Quantidade de mapeamentos em cada status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.porStatus && stats.porStatus.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {stats.porStatus.map((item) => (
                    <Card key={item.status}>
                      <CardContent className="pt-6 text-center">
                        <Badge className={statusColors[item.status] || statusColors.rascunho}>
                          {item.status.replace("_", " ")}
                        </Badge>
                        <p className="text-4xl font-bold mt-3">{item.count}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum mapeamento encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de Atividades</CardTitle>
              <CardDescription>
                Histórico recente de criações, atualizações e aprovações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timeline && timeline.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {timeline.map((item, index) => (
                      <div key={`${item.id}-${item.tipo}-${index}`} className="relative pl-10">
                        <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                          item.tipo === "criacao" ? "bg-blue-100" :
                          item.tipo === "atualizacao" ? "bg-yellow-100" :
                          item.tipo === "aprovacao" ? "bg-green-100" : "bg-purple-100"
                        }`}>
                          {item.tipo === "criacao" && <FileText className="h-3 w-3 text-blue-600" />}
                          {item.tipo === "atualizacao" && <RefreshCw className="h-3 w-3 text-yellow-600" />}
                          {item.tipo === "aprovacao" && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                          {item.tipo === "entrevista" && <Activity className="h-3 w-3 text-purple-600" />}
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium">{item.descricao}</p>
                            {item.status && (
                              <Badge className={statusColors[item.status] || statusColors.rascunho} variant="outline">
                                {item.status.replace("_", " ")}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 body-small">
                            <span>{new Date(item.data).toLocaleString("pt-BR")}</span>
                            {item.departamento && (
                              <>
                                <span>•</span>
                                <span>{item.departamento}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma atividade recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
