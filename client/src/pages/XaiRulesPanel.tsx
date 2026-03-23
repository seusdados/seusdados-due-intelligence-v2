import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  Scale,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface XaiRule {
  id: string;
  categoria: string;
  titulo: string;
  descricao: string;
  fundamentos: string[];
  severidade: string;
  aplicabilidade: string[];
  referencias: string[];
}

export default function XaiRulesPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const { data: rulesData, isLoading, refetch } = trpc.contractAnalysis.getXaiRules.useQuery();

  const rules: XaiRule[] = rulesData?.regras?.map(r => ({
    id: r.id,
    categoria: r.categoria,
    titulo: r.descricao,
    descricao: r.criterio_objetivo,
    fundamentos: [],
    severidade: r.gravidade_padrao,
    aplicabilidade: [],
    referencias: []
  })) || [];
  const categories = Array.from(new Set(rules.map(r => r.categoria)));

  const filteredRules = rules.filter(rule => {
    const matchesSearch = searchQuery === "" || 
      rule.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.fundamentos.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === null || rule.categoria === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const toggleRule = (ruleId: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  const getSeverityBadge = (severidade: string) => {
    const lower = severidade.toLowerCase();
    if (lower.includes('crítico') || lower.includes('critico') || lower.includes('alta')) {
      return <Badge variant="destructive">{severidade}</Badge>;
    }
    if (lower.includes('média') || lower.includes('media') || lower.includes('moderado')) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{severidade}</Badge>;
    }
    return <Badge variant="outline">{severidade}</Badge>;
  };

  const getCategoryIcon = (categoria: string) => {
    const lower = categoria.toLowerCase();
    if (lower.includes('lgpd') || lower.includes('proteção')) return <Shield className="h-4 w-4" />;
    if (lower.includes('contrato') || lower.includes('cláusula')) return <FileText className="h-4 w-4" />;
    if (lower.includes('risco') || lower.includes('alerta')) return <AlertTriangle className="h-4 w-4" />;
    if (lower.includes('conformidade')) return <CheckCircle2 className="h-4 w-4" />;
    return <Scale className="h-4 w-4" />;
  };

  const handleRefresh = async () => {
    await refetch();
    toast.success("Regras atualizadas com sucesso");
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-gray-900">Painel de Regras XAI</h1>
          <p className="text-gray-500 mt-1">
            Visualize e gerencie as regras de IA Explicável utilizadas nas análises
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar Regras
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-light">{rules.length}</p>
                <p className="text-sm text-gray-500">Total de Regras</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Filter className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-light">{categories.length}</p>
                <p className="text-sm text-gray-500">Categorias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-light">
                  {rules.filter(r => r.severidade.toLowerCase().includes('crít') || r.severidade.toLowerCase().includes('alta')).length}
                </p>
                <p className="text-sm text-gray-500">Regras Críticas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Scale className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-light">
                  {Array.from(new Set(rules.flatMap(r => r.fundamentos))).length}
                </p>
                <p className="text-sm text-gray-500">Fundamentos Legais</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar regras por título, descrição ou fundamento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Todas
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="gap-1"
                >
                  {getCategoryIcon(cat)}
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista de Regras</TabsTrigger>
          <TabsTrigger value="categories">Por Categoria</TabsTrigger>
          <TabsTrigger value="fundamentos">Por Fundamento</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Regras Carregadas</CardTitle>
              <CardDescription>
                {filteredRules.length} regras encontradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma regra encontrada</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {filteredRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {expandedRules.has(rule.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                            <div className="p-2 rounded-lg bg-purple-50">
                              {getCategoryIcon(rule.categoria)}
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-gray-900">{rule.titulo}</p>
                              <p className="text-sm text-gray-500">{rule.categoria}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(rule.severidade)}
                            <Badge variant="outline" className="text-xs">
                              {rule.fundamentos.length} fundamentos
                            </Badge>
                          </div>
                        </button>

                        {expandedRules.has(rule.id) && (
                          <div className="px-4 pb-4 pt-2 border-t bg-gray-50">
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Descrição</h4>
                                <p className="text-sm text-gray-600">{rule.descricao}</p>
                              </div>

                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Fundamentos Legais</h4>
                                <div className="flex flex-wrap gap-2">
                                  {rule.fundamentos.map((fund, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      <Scale className="h-3 w-3 mr-1" />
                                      {fund}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {rule.aplicabilidade && rule.aplicabilidade.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Aplicabilidade</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {rule.aplicabilidade.map((app, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {app}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {rule.referencias && rule.referencias.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Referências</h4>
                                  <div className="space-y-1">
                                    {rule.referencias.map((ref, idx) => (
                                      <a
                                        key={idx}
                                        href={ref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-sm text-purple-600 hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        {ref}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(category => {
              const categoryRules = rules.filter(r => r.categoria === category);
              return (
                <Card key={category}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <CardTitle className="text-lg">{category}</CardTitle>
                    </div>
                    <CardDescription>{categoryRules.length} regras</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {categoryRules.slice(0, 5).map(rule => (
                        <div key={rule.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 truncate flex-1">{rule.titulo}</span>
                          {getSeverityBadge(rule.severidade)}
                        </div>
                      ))}
                      {categoryRules.length > 5 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          +{categoryRules.length - 5} regras adicionais
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="fundamentos">
          <Card>
            <CardHeader>
              <CardTitle>Fundamentos Legais</CardTitle>
              <CardDescription>
                Agrupamento de regras por fundamento legal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(new Set(rules.flatMap(r => r.fundamentos))).sort().map(fundamento => {
                  const fundRules = rules.filter(r => r.fundamentos.includes(fundamento));
                  return (
                    <div key={fundamento} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Scale className="h-5 w-5 text-purple-600" />
                          <h3 className="font-medium text-gray-900">{fundamento}</h3>
                        </div>
                        <Badge variant="secondary">{fundRules.length} regras</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {fundRules.slice(0, 5).map(rule => (
                          <Badge key={rule.id} variant="outline" className="text-xs">
                            {rule.titulo}
                          </Badge>
                        ))}
                        {fundRules.length > 5 && (
                          <Badge variant="outline" className="text-xs bg-gray-100">
                            +{fundRules.length - 5}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="mt-6 bg-purple-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Info className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-purple-900 mb-1">Sobre as Regras XAI</h3>
              <p className="text-sm text-purple-700">
                As regras de IA Explicável (XAI) são baseadas na LGPD, normas da ANPD, ISO 27701 e melhores práticas de proteção de dados. 
                Cada regra inclui fundamentos legais, severidade e aplicabilidade para garantir transparência nas análises automatizadas.
                As regras são carregadas do arquivo YAML de configuração e podem ser atualizadas conforme necessário.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
