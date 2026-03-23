import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line
} from "recharts";
import { Shield, AlertTriangle, TrendingUp, Target, Zap, Info } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface MaturityDashboardPremiumProps {
  assessment: any;
  responses: any[];
  overallClassification: any;
  categoryScores: any[];
  matrixData: any[];
  criticalRisks: any[];
  thirdParty?: any;
  organization?: any;
  onOpenScoringModal?: (type: 'radar' | 'matrix' | 'classification' | 'all') => void;
}

const riskColors: Record<string, string> = {
  Baixo: "#22c55e",
  Moderado: "#eab308",
  Alto: "#f97316",
  Crítico: "#dc2626",
  "Muito Crítico": "#991b1b",
};

const COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export function MaturityDashboardPremium({
  assessment,
  responses,
  overallClassification,
  categoryScores,
  matrixData,
  criticalRisks,
  thirdParty,
  organization,
  onOpenScoringModal
}: MaturityDashboardPremiumProps) {
  const [, setLocation] = useLocation();

  // Preparar dados para o radar chart (maturidade por categoria)
  const radarData = categoryScores.map(cat => ({
    category: cat.name.length > 20 ? cat.name.substring(0, 20) + '...' : cat.name,
    fullName: cat.name,
    score: cat.avgScore || cat.maxScore || 0,
    maxScore: 25,
    percentage: Math.round(((cat.avgScore || cat.maxScore || 0) / 25) * 100)
  }));

  // Dados para gráfico de evolução (simulado - em produção viria do histórico)
  const evolutionData = [
    { month: 'Jan', score: 45 },
    { month: 'Fev', score: 52 },
    { month: 'Mar', score: 58 },
    { month: 'Abr', score: 65 },
    { month: 'Mai', score: assessment.overallRiskScore || 70 },
  ];

  // Distribuição de riscos
  const riskDistribution = [
    { name: 'Baixo', value: responses.filter(r => r.riskScore < 5).length, color: riskColors.Baixo },
    { name: 'Moderado', value: responses.filter(r => r.riskScore >= 5 && r.riskScore < 10).length, color: riskColors.Moderado },
    { name: 'Alto', value: responses.filter(r => r.riskScore >= 10 && r.riskScore < 15).length, color: riskColors.Alto },
    { name: 'Crítico', value: responses.filter(r => r.riskScore >= 15 && r.riskScore < 20).length, color: riskColors.Crítico },
    { name: 'Muito Crítico', value: responses.filter(r => r.riskScore >= 20).length, color: riskColors['Muito Crítico'] },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Hero Cards - Premium Design */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Card 1: Classificação de Risco */}
        <Card 
          className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-2"
          style={{ borderColor: overallClassification?.cor }}
          onClick={() => {
            // Scroll to matriz de risco
            document.getElementById('matriz-risco')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <div 
            className="absolute inset-0 opacity-10"
            style={{ 
              background: `linear-gradient(135deg, ${overallClassification?.cor} 0%, transparent 100%)`
            }}
          />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div 
                className="p-3 rounded-xl shadow-lg"
                style={{ 
                  backgroundColor: overallClassification?.corFundo,
                  boxShadow: `0 4px 14px ${overallClassification?.cor}40`
                }}
              >
                <Shield className="h-7 w-7" style={{ color: overallClassification?.cor }} />
              </div>
              <Badge 
                variant="outline" 
                className="text-xs font-semibold"
                style={{ 
                  borderColor: overallClassification?.cor,
                  color: overallClassification?.cor
                }}
              >
                RISCO
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wide">Classificação</p>
            <p 
              className="text-3xl font-black mb-1" 
              style={{ color: overallClassification?.cor }}
            >
              {overallClassification?.nome || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">
              Clique para ver detalhes
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Pontuação Média */}
        <Card 
          className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-violet-200"
          onClick={() => {
            document.getElementById('grafico-categorias')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/50">
                <Target className="h-7 w-7 text-white" />
              </div>
              <Badge variant="outline" className="text-xs font-semibold border-violet-500 text-violet-700">
                SCORE
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wide">Pontuação Média</p>
            <p className="text-3xl font-black text-violet-700 mb-1">
              {assessment.overallRiskScore || 0}<span className="text-lg text-muted-foreground">/25</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.round(((assessment.overallRiskScore || 0) / 25) * 100)}% de maturidade
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Riscos Críticos */}
        <Card 
          className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-red-200"
          onClick={() => {
            document.getElementById('riscos-criticos')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/50">
                <AlertTriangle className="h-7 w-7 text-white" />
              </div>
              <Badge variant="outline" className="text-xs font-semibold border-red-500 text-red-700">
                CRÍTICO
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wide">Riscos Críticos</p>
            <p className="text-3xl font-black text-red-700 mb-1">
              {criticalRisks.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {criticalRisks.length > 0 ? 'Requer atenção imediata' : 'Nenhum risco crítico'}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Tendência */}
        <Card 
          className="relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-emerald-200"
          onClick={() => {
            document.getElementById('grafico-evolucao')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/50">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <Badge variant="outline" className="text-xs font-semibold border-emerald-500 text-emerald-700">
                EVOLUÇÃO
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wide">Tendência</p>
            <p className="text-3xl font-black text-emerald-700 mb-1">
              +{Math.round(((assessment.overallRiskScore || 70) - 45) / 45 * 100)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Melhoria nos últimos 5 meses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Radar - Maturidade por Categoria */}
      <Card id="grafico-radar" className="border-2 border-violet-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Zap className="h-5 w-5 text-violet-600" />
                Maturidade por Categoria
              </CardTitle>
              <CardDescription className="mt-1">
                Visualização radar da maturidade em cada dimensão avaliada
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onOpenScoringModal?.('radar')}
            >
              <Info className="h-4 w-4" />
              Como funciona?
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" strokeWidth={1.5} />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                />
                <Radar
                  name="Maturidade (%)"
                  dataKey="percentage"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-xl border-2 border-violet-200">
                        <p className="font-bold text-sm mb-1">{data.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          Pontuação: <span className="font-semibold text-violet-700">{data.score}/25</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Maturidade: <span className="font-semibold text-violet-700">{data.percentage}%</span>
                        </p>
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-violet-50 rounded-lg border border-violet-200">
            <p className="text-sm text-violet-900">
              <strong>Interpretação:</strong> Quanto maior a área preenchida, maior a maturidade do terceiro naquela categoria. 
              Áreas com baixa pontuação indicam oportunidades de melhoria.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grid com 2 gráficos lado a lado */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Barras - Por Categoria */}
        <Card id="grafico-categorias" className="border-2 border-blue-100">
          <CardHeader>
            <CardTitle className="text-lg font-black">Pontuação por Categoria</CardTitle>
            <CardDescription>
              Comparação detalhada entre categorias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryScores} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" domain={[0, 25]} tick={{ fontSize: 11 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={120}
                    tick={{ fontSize: 10, fontWeight: 500 }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || !payload[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 rounded shadow-lg border">
                          <p className="font-semibold text-sm">{data.name}</p>
                          <p className="text-xs">Pontuação: {data.avgScore || data.maxScore}/25</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="avgScore" radius={[0, 8, 8, 0]}>
                    {categoryScores.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição de Riscos */}
        <Card className="border-2 border-amber-100">
          <CardHeader>
            <CardTitle className="text-lg font-black">Distribuição de Riscos</CardTitle>
            <CardDescription>
              Proporção de riscos por nível de criticidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <Card id="grafico-evolucao" className="border-2 border-emerald-100">
        <CardHeader>
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Evolução da Maturidade
          </CardTitle>
          <CardDescription>
            Histórico de pontuação ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Matriz de Risco 5x5 */}
      <Card id="matriz-risco" className="border-2 border-purple-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black">Matriz de Risco 5×5</CardTitle>
              <CardDescription className="mt-1">
                Visualização dos riscos por impacto e probabilidade
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                // TODO: Abrir modal com explicação da matriz
              }}
            >
              <Info className="h-4 w-4" />
              Entenda a matriz
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                <CartesianGrid stroke="#e5e7eb" strokeWidth={1.5} />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Impacto" 
                  domain={[0.5, 5.5]}
                  ticks={[1, 2, 3, 4, 5]}
                  label={{ value: 'Impacto', position: 'bottom', style: { fontWeight: 600 } }}
                  tick={{ fontSize: 12, fontWeight: 500 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Probabilidade" 
                  domain={[0.5, 5.5]}
                  ticks={[1, 2, 3, 4, 5]}
                  label={{ value: 'Probabilidade', angle: -90, position: 'left', style: { fontWeight: 600 } }}
                  tick={{ fontSize: 12, fontWeight: 500 }}
                />
                <ZAxis type="number" dataKey="z" range={[150, 600]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null;
                    const data = payload[0].payload;
                    const cls = data.classification;
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-xl border-2" style={{ borderColor: cls?.cor }}>
                        <p className="font-bold text-sm mb-2">{data.name}</p>
                        <div className="space-y-1 text-xs">
                          <p>Impacto: <span className="font-semibold">{data.x}</span></p>
                          <p>Probabilidade: <span className="font-semibold">{data.y}</span></p>
                          <p style={{ color: cls?.cor }}>
                            Risco: <span className="font-bold">{data.z}</span> ({cls?.nome})
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={matrixData}>
                  {matrixData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.classification?.cor || '#8b5cf6'} 
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {Object.entries(riskColors).map(([level, color]) => (
              <div key={level} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-medium">{level}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
