// Página Hub de Simulações - Histórico e gerenciamento
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Clock,
  Calendar,
  Users,
  FileText,
  TrendingUp,
  Filter,
  Eye,
  Download,
} from "lucide-react";

export default function SimuladorHub() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(
    user?.organizationId || null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [quarterFilter, setQuarterFilter] = useState<string>("all");

  // Query para listar simulações
  const { data: simulations, isLoading } = trpc.simulador.list.useQuery(
    {
      organizationId: selectedOrgId!,
      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      quarter: quarterFilter !== "all" ? quarterFilter : undefined,
    },
    { enabled: !!selectedOrgId }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluida":
        return "bg-green-100 text-green-800";
      case "em_andamento":
        return "bg-blue-100 text-blue-800";
      case "pausada":
        return "bg-yellow-100 text-yellow-800";
      case "planejada":
        return "bg-gray-100 text-gray-800";
      case "cancelada":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planejada: "Planejada",
      em_andamento: "Em Andamento",
      pausada: "Pausada",
      concluida: "Concluída",
      cancelada: "Cancelada",
    };
    return labels[status] || status;
  };

  const formatDuration = (start: string | Date, end?: string | Date | null) => {
    if (!end) return "-";
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}min` : `${minutes}min`;
  };

  return (
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              HUB DE SIMULAÇÕES
            </p>
            <h1 className="text-3xl font-light text-foreground">
              Histórico de <span className="text-primary">Exercícios</span>
            </h1>
          </div>
          <Button onClick={() => setLocation("/simulador-cppd/nova")}>
            Nova Simulação
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="planejada">Planejada</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={quarterFilter} onValueChange={setQuarterFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trimestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Trimestres</SelectItem>
                  <SelectItem value="2025-Q1">2025 Q1</SelectItem>
                  <SelectItem value="2025-Q2">2025 Q2</SelectItem>
                  <SelectItem value="2025-Q3">2025 Q3</SelectItem>
                  <SelectItem value="2025-Q4">2025 Q4</SelectItem>
                  <SelectItem value="2024-Q4">2024 Q4</SelectItem>
                </SelectContent>
              </Select>

              {(statusFilter !== "all" || quarterFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setQuarterFilter("all");
                  }}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Simulações */}
        <Card>
          <CardHeader>
            <CardTitle>Simulações Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !simulations || simulations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhuma simulação encontrada com os filtros selecionados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {simulations.map((simulation) => (
                  <Card
                    key={simulation.id}
                    className="border-2 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => setLocation(`/simulador-cppd/simulacao/${simulation.id}`)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg text-foreground">
                              {simulation.scenarioName}
                            </h3>
                            <Badge className={getStatusColor(simulation.status)}>
                              {getStatusLabel(simulation.status)}
                            </Badge>
                            {simulation.quarter && (
                              <Badge variant="outline">{simulation.quarter}</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(simulation.startTime).toLocaleDateString('pt-BR')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatDuration(simulation.startTime, simulation.endTime)}
                              </span>
                            </div>

                            {simulation.participants && (simulation.participants as string[]).length > 0 && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>{(simulation.participants as string[]).length} participantes</span>
                              </div>
                            )}

                            {simulation.playbookAdherence !== null &&
                              simulation.playbookAdherence !== undefined && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <TrendingUp className="h-4 w-4" />
                                  <span>{simulation.playbookAdherence}% aderência</span>
                                </div>
                              )}
                          </div>

                          {simulation.notes && (
                            <p className="body-small line-clamp-2">
                              {simulation.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/simulador-cppd/simulacao/${simulation.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>

                          {simulation.status === "concluida" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/simulador-cppd/relatorios/${simulation.id}`);
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Relatório
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
