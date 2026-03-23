import { useState } from "react";
// DashboardLayout removido - já é aplicado no App.tsx
import { trpc } from "@/lib/trpc";
import { 
  Shield, Users, AlertTriangle, FileCheck, FileText, Headphones,
  Clock, Calendar, ChevronDown, ChevronRight, Search, Filter,
  BookOpen, Zap, CheckCircle2, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mapeamento de ícones por bloco
const blockIcons: Record<string, React.ComponentType<any>> = {
  Shield: Shield,
  Users: Users,
  AlertTriangle: AlertTriangle,
  FileCheck: FileCheck,
  FileText: FileText,
  Headphones: Headphones,
};

// Mapeamento de cores de prioridade
const priorityColors: Record<string, { bg: string; text: string; label: string }> = {
  baixa: { bg: "bg-gray-100", text: "text-gray-700", label: "Baixa" },
  media: { bg: "bg-blue-100", text: "text-blue-700", label: "Média" },
  alta: { bg: "bg-orange-100", text: "text-orange-700", label: "Alta" },
  critica: { bg: "bg-red-100", text: "text-red-700", label: "Crítica" },
};

// Formatar horas em texto legível
function formatSlaHours(hours: number): string {
  if (hours < 8) {
    return `${hours}h úteis`;
  } else if (hours < 24) {
    return `${hours}h úteis`;
  } else if (hours === 24) {
    return "1 dia útil";
  } else if (hours % 8 === 0) {
    const days = hours / 8;
    return `${days} ${days === 1 ? 'dia útil' : 'dias úteis'}`;
  } else {
    return `${hours}h úteis`;
  }
}

export default function CatalogoServicos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  const { data: catalog, isLoading } = trpc.serviceCatalog.getFullCatalog.useQuery();
  const { data: stats } = trpc.serviceCatalog.getCatalogStats.useQuery();

  const toggleBlock = (blockId: number) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId);
    } else {
      newExpanded.add(blockId);
    }
    setExpandedBlocks(newExpanded);
  };

  const expandAll = () => {
    if (catalog) {
      setExpandedBlocks(new Set(catalog.map(b => b.id)));
    }
  };

  const collapseAll = () => {
    setExpandedBlocks(new Set());
  };

  // Filtrar serviços
  const filteredCatalog = catalog?.map(block => ({
    ...block,
    services: block.services.filter(service => {
      const matchesSearch = searchTerm === "" || 
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = !selectedPriority || service.priority === selectedPriority;
      
      return matchesSearch && matchesPriority;
    })
  })).filter(block => block.services.length > 0 || searchTerm === "");

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-violet-600" />
              Catálogo de Serviços CSC
            </h1>
            <p className="text-gray-500 mt-1">
              Central de Serviços Compartilhados - Privacidade e Proteção de Dados
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <BookOpen className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-700">{stats.totalBlocks}</p>
                    <p className="text-xs text-gray-500">Blocos de Serviço</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700">{stats.totalServices}</p>
                    <p className="text-xs text-gray-500">Serviços Disponíveis</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-700">
                      {stats.servicesByPriority.find(p => p.priority === 'critica')?.count || 0}
                    </p>
                    <p className="text-xs text-gray-500">Serviços Críticos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">
                      {stats.servicesByPriority.find(p => p.priority === 'baixa')?.count || 0}
                    </p>
                    <p className="text-xs text-gray-500">Serviços Baixa Prioridade</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar serviço por nome, código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedPriority === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPriority(null)}
                >
                  Todas
                </Button>
                {Object.entries(priorityColors).map(([key, { label }]) => (
                  <Button
                    key={key}
                    variant={selectedPriority === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPriority(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expandir Todos
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Recolher Todos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Catalog Blocks */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCatalog?.map((block) => {
              const IconComponent = blockIcons[block.icon || 'BookOpen'] || BookOpen;
              const isExpanded = expandedBlocks.has(block.id);
              
              return (
                <Collapsible
                  key={block.id}
                  open={isExpanded}
                  onOpenChange={() => toggleBlock(block.id)}
                >
                  <Card 
                    className="overflow-hidden transition-all duration-200"
                    style={{ borderLeftColor: block.color, borderLeftWidth: '4px' }}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div 
                              className="p-3 rounded-xl"
                              style={{ backgroundColor: `${block.color}20` }}
                            >
                              <IconComponent 
                                className="h-6 w-6" 
                                style={{ color: block.color }}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className="font-mono text-xs"
                                  style={{ borderColor: block.color, color: block.color }}
                                >
                                  {block.code}
                                </Badge>
                                <CardTitle className="text-lg">{block.name}</CardTitle>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">{block.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary" className="text-sm">
                              {block.services.length} serviços
                            </Badge>
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="border-t pt-4">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                                  <th className="pb-3 pr-4">Código</th>
                                  <th className="pb-3 pr-4">Serviço</th>
                                  <th className="pb-3 pr-4">SLA</th>
                                  <th className="pb-3 pr-4">Prazo Legal</th>
                                  <th className="pb-3 pr-4">Entrega</th>
                                  <th className="pb-3">Prioridade</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {block.services.map((service) => {
                                  const priority = priorityColors[service.priority] || priorityColors.media;
                                  
                                  return (
                                    <tr key={service.id} className="hover:bg-gray-50">
                                      <td className="py-3 pr-4">
                                        <Badge 
                                          variant="outline" 
                                          className="font-mono text-xs"
                                          style={{ borderColor: block.color, color: block.color }}
                                        >
                                          {service.code}
                                        </Badge>
                                      </td>
                                      <td className="py-3 pr-4">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">
                                                  {service.name}
                                                </span>
                                                {service.description && (
                                                  <Info className="h-4 w-4 text-gray-400" />
                                                )}
                                              </div>
                                            </TooltipTrigger>
                                            {service.description && (
                                              <TooltipContent side="top" className="max-w-xs">
                                                <p>{service.description}</p>
                                              </TooltipContent>
                                            )}
                                          </Tooltip>
                                        </TooltipProvider>
                                      </td>
                                      <td className="py-3 pr-4">
                                        <div className="flex items-center gap-1.5 text-sm">
                                          <Clock className="h-4 w-4 text-violet-500" />
                                          <span className="font-semibold text-violet-700">
                                            {formatSlaHours(service.slaHours)}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-3 pr-4">
                                        {service.legalDeadlineDays ? (
                                          <div className="flex items-center gap-1.5 text-sm">
                                            <Calendar className="h-4 w-4 text-red-500" />
                                            <span className="font-semibold text-red-700">
                                              {service.legalDeadlineDays} dias
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 text-sm">-</span>
                                        )}
                                      </td>
                                      <td className="py-3 pr-4">
                                        <span className="text-sm text-gray-600">
                                          {service.deliverable || "-"}
                                        </span>
                                      </td>
                                      <td className="py-3">
                                        <Badge className={`${priority.bg} ${priority.text} border-0`}>
                                          {priority.label}
                                        </Badge>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {filteredCatalog?.length === 0 && !isLoading && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Search className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Nenhum serviço encontrado</h3>
              <p className="text-gray-500 mt-1">
                Tente ajustar os filtros ou termos de busca
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedPriority(null);
                }}
              >
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Sobre os SLAs</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Os SLAs são calculados em horas úteis (dias úteis de 8h). 
                  Prazos legais são definidos pela LGPD e devem ser respeitados independentemente do SLA operacional.
                  Para serviços de Gestão de Incidentes, os prazos de comunicação à ANPD e titulares são obrigatórios.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
