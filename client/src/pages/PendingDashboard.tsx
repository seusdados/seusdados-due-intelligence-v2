import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, InfoCard, CardGrid, SectionHeader } from '@/components/DashboardCard';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2,
  FileSearch,
  ClipboardList,
  MessageSquare,
  Calendar,
  User,
  ChevronRight,
  Filter,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";

export default function PendingDashboard() {
  const { user } = useAuth();
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("clauses");
  
  const isConsultor = user?.role === 'admin_global' || user?.role === 'consultor';
  
  // Buscar organizações (apenas para consultores)
  const { data: organizations } = trpc.organization.list.useQuery(undefined, {
    enabled: isConsultor,
  });
  
  // Buscar pendências de cláusulas
  const { data: pendingClauses, isLoading: loadingClauses, refetch: refetchClauses } = trpc.contractAnalysis.getPendingClauses.useQuery({
    organizationId: selectedOrg !== "all" ? parseInt(selectedOrg) : undefined,
  });
  
  // Buscar pendências de tarefas
  const { data: pendingTasks, isLoading: loadingTasks, refetch: refetchTasks } = trpc.actionPlan.getPendingTasks.useQuery({
    organizationId: selectedOrg !== "all" ? parseInt(selectedOrg) : undefined,
  });
  
  // Buscar pendências de chamados
  const { data: pendingTickets, isLoading: loadingTickets, refetch: refetchTickets } = trpc.tickets.getPendingTickets.useQuery({
    organizationId: selectedOrg !== "all" ? parseInt(selectedOrg) : undefined,
  });
  
  const handleRefresh = () => {
    refetchClauses();
    refetchTasks();
    refetchTickets();
  };
  
  // Contadores
  const clauseCount = pendingClauses?.length || 0;
  const taskCount = pendingTasks?.length || 0;
  const ticketCount = pendingTickets?.length || 0;
  const totalPending = clauseCount + taskCount + ticketCount;
  
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Pendências</h1>
            <p className="text-gray-500 mt-1">
              {isConsultor 
                ? "Visão consolidada de todas as pendências por organização"
                : "Acompanhe as pendências da sua organização"
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isConsultor && (
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger className="w-[250px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Todas as organizações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as organizações</SelectItem>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
        
        {/* Cards de Resumo */}
        <CardGrid columns={4}>
          <StatCard icon={ClipboardList} iconGradient="violet" value={totalPending} label="Total de Pendências" />
          <div className="cursor-pointer" onClick={() => setActiveTab("clauses")}>
            <StatCard icon={FileText} iconGradient="blue" value={clauseCount} label="Cláusulas Pendentes" />
          </div>
          <div className="cursor-pointer" onClick={() => setActiveTab("tasks")}>
            <StatCard icon={CheckCircle2} iconGradient="amber" value={taskCount} label="Tarefas Pendentes" />
          </div>
          <div className="cursor-pointer" onClick={() => setActiveTab("tickets")}>
            <StatCard icon={MessageSquare} iconGradient="emerald" value={ticketCount} label="Chamados Abertos" />
          </div>
        </CardGrid>
        
        {/* Tabs de Conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clauses" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Cláusulas
              {clauseCount > 0 && (
                <Badge variant="secondary" className="ml-1">{clauseCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Tarefas
              {taskCount > 0 && (
                <Badge variant="secondary" className="ml-1">{taskCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chamados
              {ticketCount > 0 && (
                <Badge variant="secondary" className="ml-1">{ticketCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Cláusulas Pendentes */}
          <TabsContent value="clauses" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Cláusulas Pendentes de Aprovação
                </CardTitle>
                <CardDescription>
                  Cláusulas LGPD que aguardam revisão e aprovação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingClauses ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : pendingClauses?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>Nenhuma cláusula pendente de aprovação</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingClauses?.map((clause: any) => (
                      <div 
                        key={clause.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{clause.title}</p>
                            <p className="text-sm text-gray-500">
                              {clause.contractName} • {clause.organizationName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Cláusula {clause.sequenceNumber}
                              </Badge>
                              {clause.editedAt && (
                                <span className="text-xs text-gray-400">
                                  Editada em {new Date(clause.editedAt).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Link href={`/analise-contratos/${clause.analysisId}?tab=clausulas&clause=${clause.id}`}>
                          <Button variant="ghost" size="sm">
                            Revisar
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tarefas Pendentes */}
          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-amber-600" />
                  Tarefas Pendentes
                </CardTitle>
                <CardDescription>
                  Tarefas criadas a partir de análises de contratos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTasks ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : pendingTasks?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>Nenhuma tarefa pendente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingTasks?.map((task: any) => (
                      <div 
                        key={task.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            task.priority === 'critica' ? 'bg-red-100' :
                            task.priority === 'alta' ? 'bg-orange-100' :
                            task.priority === 'media' ? 'bg-yellow-100' : 'bg-green-100'
                          }`}>
                            <AlertTriangle className={`h-5 w-5 ${
                              task.priority === 'critica' ? 'text-red-600' :
                              task.priority === 'alta' ? 'text-orange-600' :
                              task.priority === 'media' ? 'text-yellow-600' : 'text-green-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{task.title}</p>
                            <p className="text-sm text-gray-500">
                              {task.organizationName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant={task.priority === 'critica' ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {task.priority}
                              </Badge>
                              {task.dueDate && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                              {task.responsibleName && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {task.responsibleName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Link href={`/tarefas/${task.id}`}>
                          <Button variant="ghost" size="sm">
                            Ver Tarefa
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Chamados Pendentes */}
          <TabsContent value="tickets" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  Chamados MeuDPO Abertos
                </CardTitle>
                <CardDescription>
                  Chamados criados a partir de análises de contratos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTickets ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : pendingTickets?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>Nenhum chamado aberto</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingTickets?.map((ticket: any) => (
                      <div 
                        key={ticket.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              #{ticket.id} - {ticket.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {ticket.organizationName} • {ticket.category}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant="outline"
                                className={`text-xs ${
                                  ticket.status === 'aberto' ? 'border-blue-500 text-blue-600' :
                                  ticket.status === 'em_andamento' ? 'border-yellow-500 text-yellow-600' :
                                  'border-gray-500 text-gray-600'
                                }`}
                              >
                                {ticket.status}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                Aberto em {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Link href={`/meudpo/chamados/${ticket.id}`}>
                          <Button variant="ghost" size="sm">
                            Ver Chamado
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
