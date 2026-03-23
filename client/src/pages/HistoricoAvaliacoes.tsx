import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  Shield,
  Users,
  FileCheck
} from "lucide-react";
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

export default function HistoricoAvaliacoes() {
  const params = useParams<{ orgId: string }>();
  const [, setLocation] = useLocation();
  const organizationId = parseInt(params.orgId || '0');
  
  const [activeTab, setActiveTab] = useState('conformidade');
  
  const { data: organization } = trpc.organization.getById.useQuery(
    { id: organizationId },
    { enabled: organizationId > 0 }
  );
  
  const { data: complianceHistory, isLoading: loadingCompliance } = trpc.compliance.history.useQuery(
    { organizationId },
    { enabled: organizationId > 0 }
  );
  
  const { data: thirdPartyHistory, isLoading: loadingThirdParty } = trpc.thirdPartyAssessment.history.useQuery(
    { organizationId },
    { enabled: organizationId > 0 }
  );
  
  const complianceChartData = useMemo(() => {
    if (!complianceHistory) return [];
    return complianceHistory.map(a => ({
      name: format(new Date(a.date), "MMM/yy", { locale: ptBR }),
      score: a.overallScore,
      maturidade: a.maturityLevel,
      risco: a.riskScore,
      fullDate: format(new Date(a.date), "dd/MM/yyyy", { locale: ptBR }),
      title: a.title,
    }));
  }, [complianceHistory]);
  
  const thirdPartyChartData = useMemo(() => {
    if (!thirdPartyHistory) return [];
    return thirdPartyHistory.map(a => ({
      name: format(new Date(a.date), "MMM/yy", { locale: ptBR }),
      score: a.overallScore,
      risco: a.riskScore,
      fullDate: format(new Date(a.date), "dd/MM/yyyy", { locale: ptBR }),
      title: a.title,
    }));
  }, [thirdPartyHistory]);
  
  const complianceStats = useMemo(() => {
    if (!complianceHistory || complianceHistory.length === 0) return null;
    
    const latest = complianceHistory[complianceHistory.length - 1];
    const previous = complianceHistory.length > 1 ? complianceHistory[complianceHistory.length - 2] : null;
    
    const scoreDiff = previous ? latest.overallScore - previous.overallScore : 0;
    const maturityDiff = previous ? latest.maturityLevel - previous.maturityLevel : 0;
    
    return {
      total: complianceHistory.length,
      latestScore: latest.overallScore,
      latestMaturity: latest.maturityLevel,
      scoreTrend: scoreDiff > 0 ? 'up' : scoreDiff < 0 ? 'down' : 'stable',
      scoreDiff: Math.abs(scoreDiff).toFixed(1),
      maturityTrend: maturityDiff > 0 ? 'up' : maturityDiff < 0 ? 'down' : 'stable',
      avgScore: (complianceHistory.reduce((sum, a) => sum + a.overallScore, 0) / complianceHistory.length).toFixed(1),
    };
  }, [complianceHistory]);
  
  const thirdPartyStats = useMemo(() => {
    if (!thirdPartyHistory || thirdPartyHistory.length === 0) return null;
    
    const riskCounts = { baixo: 0, moderado: 0, alto: 0, critico: 0 };
    thirdPartyHistory.forEach(a => {
      const level = a.riskLevel as keyof typeof riskCounts;
      if (riskCounts[level] !== undefined) riskCounts[level]++;
    });
    
    return {
      total: thirdPartyHistory.length,
      ...riskCounts,
      avgRiskScore: (thirdPartyHistory.reduce((sum, a) => sum + a.riskScore, 0) / thirdPartyHistory.length).toFixed(1),
    };
  }, [thirdPartyHistory]);
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };
  
  const maturityLabels: Record<number, string> = {
    1: 'Inicial',
    2: 'Repetitivo',
    3: 'Definido',
    4: 'Gerenciado',
    5: 'Otimizado',
  };
  
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation(`/cliente/${organizationId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-violet-600 font-medium uppercase tracking-wider">
              HISTÓRICO COMPARATIVO
            </p>
            <h1 className="text-2xl font-light text-slate-900">
              Evolução das Avaliações
            </h1>
            {organization && (
              <p className="text-sm text-slate-500 font-light mt-1">
                {organization.name}
              </p>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="conformidade" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Conformidade PPPD
            </TabsTrigger>
            <TabsTrigger value="terceiros" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Due Diligence
            </TabsTrigger>
          </TabsList>
          
          {/* Conformidade Tab */}
          <TabsContent value="conformidade" className="space-y-6">
            {loadingCompliance ? (
              <div className="text-center py-12 text-slate-500">Carregando...</div>
            ) : !complianceHistory || complianceHistory.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <FileCheck className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma avaliação de conformidade concluída ainda.</p>
                  <Button 
                    className="mt-4"
                    onClick={() => setLocation(`/avaliacoes?org=${organizationId}`)}
                  >
                    Iniciar Primeira Avaliação
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats Cards */}
                {complianceStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-light text-violet-600">{complianceStats.total}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Avaliações</p>
                          </div>
                          <BarChart3 className="h-8 w-8 text-violet-200" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-2xl font-light text-violet-600">
                                {complianceStats.latestScore.toFixed(0)}%
                              </p>
                              {getTrendIcon(complianceStats.scoreTrend)}
                            </div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Score Atual</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-2xl font-light text-violet-600">
                                {complianceStats.latestMaturity}
                              </p>
                              {getTrendIcon(complianceStats.maturityTrend)}
                            </div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">
                              {maturityLabels[complianceStats.latestMaturity]}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div>
                          <p className="text-2xl font-light text-violet-600">{complianceStats.avgScore}%</p>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">Média Histórica</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {/* Evolution Chart */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Evolução do Score de Conformidade</CardTitle>
                    <CardDescription className="font-light">
                      Acompanhe a evolução da maturidade ao longo do tempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={complianceChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            formatter={(value: number, name: string) => [
                              name === 'score' ? `${value.toFixed(1)}%` : String(value),
                              name === 'score' ? 'Score' : name === 'maturidade' ? 'Maturidade' : 'Risco'
                            ] as [string, string]}
                            labelFormatter={(label, payload) => {
                              if (payload && payload[0]) {
                                return `${payload[0].payload.fullDate} - ${payload[0].payload.title}`;
                              }
                              return label;
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#7c3aed" 
                            strokeWidth={2}
                            dot={{ fill: '#7c3aed', strokeWidth: 2 }}
                            name="Score (%)"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="maturidade" 
                            stroke="#06b6d4" 
                            strokeWidth={2}
                            dot={{ fill: '#06b6d4', strokeWidth: 2 }}
                            name="Maturidade (1-5)"
                            yAxisId={0}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* History Table */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Histórico de Avaliações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Data</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Título</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Framework</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Score</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Maturidade</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {complianceHistory.map((assessment) => (
                            <tr key={assessment.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-slate-400" />
                                  {format(new Date(assessment.date), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-900">
                                {assessment.title}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="uppercase">
                                  {assessment.framework}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm font-medium text-violet-600">
                                  {assessment.overallScore.toFixed(0)}%
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className="bg-violet-100 text-violet-700 border-violet-200">
                                  {assessment.maturityLevel} - {maturityLabels[assessment.maturityLevel]}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setLocation(`/avaliacoes/${assessment.id}`)}
                                >
                                  Ver Detalhes
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
          {/* Terceiros Tab */}
          <TabsContent value="terceiros" className="space-y-6">
            {loadingThirdParty ? (
              <div className="text-center py-12 text-slate-500">Carregando...</div>
            ) : !thirdPartyHistory || thirdPartyHistory.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma avaliação de terceiros concluída ainda.</p>
                  <Button 
                    className="mt-4"
                    onClick={() => setLocation(`/cliente/${organizationId}/enviar-links`)}
                  >
                    Enviar Links de Avaliação
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats Cards */}
                {thirdPartyStats && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-2xl font-light text-violet-600">{thirdPartyStats.total}</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Total Avaliados</p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-green-50">
                      <CardContent className="p-4">
                        <p className="text-2xl font-light text-green-600">{thirdPartyStats.baixo}</p>
                        <p className="text-xs text-green-700 uppercase tracking-wider">Risco Baixo</p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-yellow-50">
                      <CardContent className="p-4">
                        <p className="text-2xl font-light text-yellow-600">{thirdPartyStats.moderado}</p>
                        <p className="text-xs text-yellow-700 uppercase tracking-wider">Risco Moderado</p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-orange-50">
                      <CardContent className="p-4">
                        <p className="text-2xl font-light text-orange-600">{thirdPartyStats.alto}</p>
                        <p className="text-xs text-orange-700 uppercase tracking-wider">Risco Alto</p>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-red-50">
                      <CardContent className="p-4">
                        <p className="text-2xl font-light text-red-600">{thirdPartyStats.critico}</p>
                        <p className="text-xs text-red-700 uppercase tracking-wider">Risco Crítico</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {/* Risk Distribution Chart */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Distribuição de Risco dos Terceiros</CardTitle>
                    <CardDescription className="font-light">
                      Visão geral da classificação de risco dos parceiros e fornecedores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Baixo', value: thirdPartyStats?.baixo || 0, fill: '#22c55e' },
                          { name: 'Moderado', value: thirdPartyStats?.moderado || 0, fill: '#eab308' },
                          { name: 'Alto', value: thirdPartyStats?.alto || 0, fill: '#f97316' },
                          { name: 'Crítico', value: thirdPartyStats?.critico || 0, fill: '#ef4444' },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="value" name="Quantidade" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* History Table */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Histórico de Avaliações de Terceiros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Data</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Terceiro</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Score</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Nível de Risco</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {thirdPartyHistory.map((assessment) => {
                            const riskColors: Record<string, string> = {
                              baixo: 'bg-green-100 text-green-700 border-green-200',
                              moderado: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                              alto: 'bg-orange-100 text-orange-700 border-orange-200',
                              critico: 'bg-red-100 text-red-700 border-red-200',
                            };
                            const riskLabels: Record<string, string> = {
                              baixo: 'Baixo',
                              moderado: 'Moderado',
                              alto: 'Alto',
                              critico: 'Crítico',
                            };
                            return (
                              <tr key={assessment.id} className="hover:bg-slate-50">
                                <td className="py-3 px-4 text-sm text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    {format(new Date(assessment.date), "dd/MM/yyyy", { locale: ptBR })}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm font-medium text-slate-900">
                                  {assessment.title}
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm font-medium text-violet-600">
                                    {assessment.overallScore.toFixed(0)}%
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className={riskColors[assessment.riskLevel] || riskColors.baixo}>
                                    {riskLabels[assessment.riskLevel] || 'Baixo'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setLocation(`/due-diligence/${assessment.id}/resultado`)}
                                  >
                                    Ver Detalhes
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
