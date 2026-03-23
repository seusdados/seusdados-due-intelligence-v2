// Página principal do Simulador CPPD - Adaptada para plataforma Seusdados
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Play, Target, Clock, Users, AlertTriangle, BookOpen } from "lucide-react";
import { useLocation } from "wouter";

export default function Simulador() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(
    user?.organizationId || null
  );

  // Query para listar cenários disponíveis
  const { data: scenarios, isLoading: loadingScenarios } = trpc.scenario.list.useQuery(
    { organizationId: selectedOrgId!, includeTemplates: true },
    { enabled: !!selectedOrgId }
  );

  // Query para listar simulações recentes
  const { data: recentSimulations, isLoading: loadingSimulations } = trpc.simulador.list.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  // Mutation para criar nova simulação
  const createSimulation = trpc.simulador.create.useMutation({
    onSuccess: (data) => {
      // Redirecionar para a página de execução da simulação
      setLocation(`/simulador-cppd/simulacao/${data.id}`);
    },
  });

  const handleStartSimulation = (scenarioId: number, scenarioName: string) => {
    if (!selectedOrgId) return;

    createSimulation.mutate({
      organizationId: selectedOrgId,
      scenarioId,
      scenarioName,
      quarter: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
    });
  };

  // Estatísticas rápidas
  const stats = {
    total: recentSimulations?.length || 0,
    completed: recentSimulations?.filter(s => s.status === "concluida").length || 0,
    inProgress: recentSimulations?.filter(s => s.status === "em_andamento").length || 0,
  };

  return (
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              SIMULADOR CPPD
            </p>
            <h1 className="text-3xl font-light text-foreground">
              Tabletop de <span className="text-primary">Resposta a Incidentes</span>
            </h1>
            <p className="body-small mt-2">
              Treine sua equipe em cenários realistas de violação de dados
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/simulador-cppd/guia-visual-law")}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Guia Visual Law
          </Button>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-small">Total de Simulações</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <Target className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-small">Concluídas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <Clock className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="body-small">Em Andamento</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cenários Disponíveis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Cenários Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingScenarios ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !scenarios || scenarios.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum cenário disponível.</p>
                <Button className="mt-4" onClick={() => setLocation("/simulador-cppd/cenarios")}>
                  Criar Primeiro Cenário
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenarios.map((scenario) => (
                  <Card key={scenario.id} className="border-2 hover:border-primary transition-colors">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-foreground">
                              {scenario.nome}
                            </h3>
                            <p className="body-small mt-1">
                              {scenario.tipoIncidente}
                            </p>
                          </div>
                          {scenario.isTemplate && (
                            <Badge variant="secondary">Template</Badge>
                          )}
                        </div>

                        <p className="body-small line-clamp-2">
                          {scenario.descricao}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {(scenario.areasEnvolvidas as string[]).slice(0, 3).map((area, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {(scenario.areasEnvolvidas as string[]).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(scenario.areasEnvolvidas as string[]).length - 3}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 body-small">
                          <Users className="h-4 w-4" />
                          <span>{(scenario.papeisChave as string[]).length} papéis-chave</span>
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => handleStartSimulation(scenario.id, scenario.nome)}
                          disabled={createSimulation.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Iniciar Tabletop
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Simulações Recentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Simulações Recentes
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setLocation("/simulador-cppd")}>
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSimulations ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !recentSimulations || recentSimulations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma simulação realizada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSimulations.slice(0, 5).map((simulation) => (
                  <div
                    key={simulation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/simulador-cppd/simulacao/${simulation.id}`)}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{simulation.scenarioName}</h4>
                      <p className="body-small">
                        {new Date(simulation.startTime).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {simulation.quarter && (
                        <Badge variant="outline">{simulation.quarter}</Badge>
                      )}
                      <Badge
                        variant={
                          simulation.status === "concluida"
                            ? "default"
                            : simulation.status === "em_andamento"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {simulation.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
