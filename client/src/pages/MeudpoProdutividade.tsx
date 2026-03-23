import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Award,
  BarChart3,
  Target,
  Timer,
  Star
} from "lucide-react";

export default function MeudpoProdutividade() {
  const { selectedOrganization } = useOrganization();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const { data: summary, isLoading: summaryLoading } = trpc.tickets.getProductivitySummary.useQuery({
    organizationId: selectedOrganization?.id || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined
  });
  
  const { data: consultants, isLoading: consultantsLoading } = trpc.tickets.getAllConsultantsProductivity.useQuery({
    organizationId: selectedOrganization?.id || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined
  });
  
  const isLoading = summaryLoading || consultantsLoading;
  
  const priorityLabels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica"
  };
  
  const typeLabels: Record<string, string> = {
    solicitacao_titular: "Solicitação de Titular",
    incidente_seguranca: "Incidente de Segurança",
    duvida_juridica: "Dúvida Jurídica",
    consultoria_geral: "Consultoria Geral",
    auditoria: "Auditoria",
    treinamento: "Treinamento",
    documentacao: "Documentação"
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Produtividade</h1>
          <p className="text-muted-foreground">Métricas individuais de desempenho dos consultores</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="startDate" className="text-sm">De:</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="endDate" className="text-sm">Até:</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => { setStartDate(""); setEndDate(""); }}
          >
            Limpar
          </Button>
        </div>
      </div>
      
      {/* KPIs Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultores Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalConsultants || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Resolvidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalTicketsResolved || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Resposta</CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.avgResponseTimeHours || 0}h</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Resolução</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.avgResolutionTimeHours || 0}h</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conformidade SLA</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.overallSlaCompliance || 100}%</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Top Performers */}
      {summary?.topPerformers && summary.topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
            <CardDescription>Consultores com maior número de tickets resolvidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {summary.topPerformers.map((performer, index) => (
                <div 
                  key={performer.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-white font-bold
                    ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-muted-foreground'}
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{performer.name}</p>
                    <p className="body-small">{performer.resolved} tickets</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Lista de Consultores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Produtividade por Consultor
          </CardTitle>
          <CardDescription>Métricas detalhadas de cada consultor</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : consultants && consultants.length > 0 ? (
            <div className="space-y-6">
              {consultants.map((consultant) => (
                <div key={consultant.consultantId} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{consultant.consultantName}</h3>
                        <p className="body-small">
                          {consultant.ticketsOpen} abertos • {consultant.ticketsResolved} resolvidos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{consultant.satisfactionScore.toFixed(1)}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="body-small">Tempo Resposta</p>
                      <p className="font-medium">{consultant.avgResponseTimeHours}h</p>
                    </div>
                    <div>
                      <p className="body-small">Tempo Resolução</p>
                      <p className="font-medium">{consultant.avgResolutionTimeHours}h</p>
                    </div>
                    <div>
                      <p className="body-small">Conformidade SLA</p>
                      <div className="flex items-center gap-2">
                        <Progress value={consultant.slaComplianceRate} className="h-2 w-20" />
                        <span className="font-medium">{consultant.slaComplianceRate}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="body-small">Total Tickets</p>
                      <p className="font-medium">{consultant.ticketsOpen + consultant.ticketsResolved}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(consultant.ticketsByPriority).map(([priority, count]) => (
                      <Badge key={priority} variant="outline">
                        {priorityLabels[priority] || priority}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum consultor encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
