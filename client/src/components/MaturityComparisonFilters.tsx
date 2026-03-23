import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell
} from "recharts";
import { Calendar, TrendingUp, TrendingDown, Minus, Users, Download } from "lucide-react";
import { useState, useMemo } from "react";

interface ComparisonData {
  thirdPartyId: number;
  thirdPartyName: string;
  assessments: {
    id: number;
    date: string;
    score: number;
    classification: string;
  }[];
}

interface MaturityComparisonFiltersProps {
  currentThirdPartyId: number;
  currentThirdPartyName: string;
  availableThirdParties?: { id: number; name: string }[];
  historicalData?: any[];
}

const COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'];

export function MaturityComparisonFilters({
  currentThirdPartyId,
  currentThirdPartyName,
  availableThirdParties = [],
  historicalData = []
}: MaturityComparisonFiltersProps) {
  const [period, setPeriod] = useState<'3m' | '6m' | '12m' | 'all'>('6m');
  const [selectedThirdParties, setSelectedThirdParties] = useState<number[]>([currentThirdPartyId]);
  const [comparisonMode, setComparisonMode] = useState<'evolution' | 'comparison'>('evolution');

  // Dados simulados de evolução temporal
  const evolutionData = useMemo(() => {
    const months = period === '3m' ? 3 : period === '6m' ? 6 : period === '12m' ? 12 : 24;
    const data = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      data.push({
        month: monthName,
        score: Math.round(45 + (months - i) * 4 + Math.random() * 5),
        target: 75
      });
    }
    
    return data;
  }, [period]);

  // Dados de comparação entre terceiros
  const comparisonData = useMemo(() => {
    return selectedThirdParties.map((id, index) => {
      const isCurrentParty = id === currentThirdPartyId;
      const party = availableThirdParties.find(p => p.id === id);
      
      return {
        id,
        name: isCurrentParty ? currentThirdPartyName : (party?.name || `Terceiro ${id}`),
        score: isCurrentParty ? 72 : Math.round(50 + Math.random() * 30),
        governanca: isCurrentParty ? 75 : Math.round(50 + Math.random() * 30),
        seguranca: isCurrentParty ? 68 : Math.round(50 + Math.random() * 30),
        conformidade: isCurrentParty ? 80 : Math.round(50 + Math.random() * 30),
        incidentes: isCurrentParty ? 70 : Math.round(50 + Math.random() * 30),
        capacitacao: isCurrentParty ? 65 : Math.round(50 + Math.random() * 30),
        contratos: isCurrentParty ? 78 : Math.round(50 + Math.random() * 30),
        color: COLORS[index % COLORS.length]
      };
    });
  }, [selectedThirdParties, currentThirdPartyId, currentThirdPartyName, availableThirdParties]);

  // Dados para radar de comparação
  const radarComparisonData = useMemo(() => {
    const categories = ['Governança', 'Segurança', 'Conformidade', 'Incidentes', 'Capacitação', 'Contratos'];
    
    return categories.map((cat, i) => {
      const dataPoint: any = { category: cat };
      
      comparisonData.forEach(party => {
        const key = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        dataPoint[party.name] = party[key as keyof typeof party] || 0;
      });
      
      return dataPoint;
    });
  }, [comparisonData]);

  const toggleThirdParty = (id: number) => {
    setSelectedThirdParties(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      } else if (prev.length < 5) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const getTrendIcon = () => {
    if (evolutionData.length < 2) return <Minus className="h-4 w-4" />;
    const first = evolutionData[0].score;
    const last = evolutionData[evolutionData.length - 1].score;
    const diff = last - first;
    
    if (diff > 5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (diff < -5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendPercentage = () => {
    if (evolutionData.length < 2) return 0;
    const first = evolutionData[0].score;
    const last = evolutionData[evolutionData.length - 1].score;
    return Math.round(((last - first) / first) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="border-2 border-blue-100">
        <CardHeader>
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Filtros e Comparações
          </CardTitle>
          <CardDescription>
            Compare a evolução ao longo do tempo ou entre diferentes terceiros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Modo de Visualização */}
            <div>
              <Label>Modo de Visualização</Label>
              <Select value={comparisonMode} onValueChange={(v: any) => setComparisonMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evolution">Evolução Temporal</SelectItem>
                  <SelectItem value="comparison">Comparação entre Terceiros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div>
              <Label>Período</Label>
              <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="12m">Últimos 12 meses</SelectItem>
                  <SelectItem value="all">Todo o período</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Exportar */}
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Exportar Comparação
              </Button>
            </div>
          </div>

          {/* Seleção de Terceiros para Comparação */}
          {comparisonMode === 'comparison' && (
            <div>
              <Label className="mb-2 block">Selecionar Terceiros (máx. 5)</Label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="default"
                  className="cursor-pointer bg-violet-600 hover:bg-violet-700"
                >
                  {currentThirdPartyName} (atual)
                </Badge>
                {availableThirdParties
                  .filter(p => p.id !== currentThirdPartyId)
                  .slice(0, 8)
                  .map(party => (
                    <Badge
                      key={party.id}
                      variant={selectedThirdParties.includes(party.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleThirdParty(party.id)}
                    >
                      {party.name}
                    </Badge>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedThirdParties.length} de 5 terceiros selecionados
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Evolução Temporal */}
      {comparisonMode === 'evolution' && (
        <Card className="border-2 border-emerald-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black">Evolução da Maturidade</CardTitle>
                <CardDescription>
                  Histórico de pontuação de {currentThirdPartyName}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <span className={`text-2xl font-bold ${
                  getTrendPercentage() > 0 ? 'text-green-600' : 
                  getTrendPercentage() < 0 ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {getTrendPercentage() > 0 ? '+' : ''}{getTrendPercentage()}%
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    name="Pontuação"
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    name="Meta"
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 bg-violet-50 rounded-lg border border-violet-200 text-center">
                <p className="text-xs text-violet-600 mb-1">Pontuação Atual</p>
                <p className="text-2xl font-black text-violet-700">
                  {evolutionData[evolutionData.length - 1]?.score || 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                <p className="text-xs text-emerald-600 mb-1">Meta</p>
                <p className="text-2xl font-black text-emerald-700">75</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <p className="text-xs text-blue-600 mb-1">Progresso</p>
                <p className="text-2xl font-black text-blue-700">
                  {Math.round((evolutionData[evolutionData.length - 1]?.score || 0) / 75 * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparação entre Terceiros */}
      {comparisonMode === 'comparison' && (
        <>
          {/* Gráfico de Barras Comparativo */}
          <Card className="border-2 border-blue-100">
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Comparação de Pontuação Geral
              </CardTitle>
              <CardDescription>
                Comparativo de maturidade entre terceiros selecionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }}
                      angle={-15}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="score" name="Pontuação" radius={[8, 8, 0, 0]}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Radar Comparativo */}
          <Card className="border-2 border-purple-100">
            <CardHeader>
              <CardTitle className="text-lg font-black">Comparação por Categoria</CardTitle>
              <CardDescription>
                Análise detalhada de maturidade em cada dimensão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarComparisonData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis 
                      dataKey="category" 
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                    />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    {comparisonData.map((party, index) => (
                      <Radar
                        key={party.id}
                        name={party.name}
                        dataKey={party.name}
                        stroke={party.color}
                        fill={party.color}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
