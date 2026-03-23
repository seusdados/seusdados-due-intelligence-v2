import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  Users, 
  Activity,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  FileText,
  Shield,
  Clock,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  LogIn,
  LogOut,
  CalendarCheck,
  AlertCircle,
  Building2
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mapeamento de ações para labels amigáveis
const actionLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  'user_activated': { label: 'Usuário Ativado', icon: UserCheck, color: 'text-green-600' },
  'user_deactivated': { label: 'Usuário Desativado', icon: UserX, color: 'text-red-600' },
  'user_soft_delete': { label: 'Usuário Removido', icon: Trash2, color: 'text-red-600' },
  'user_created': { label: 'Usuário Criado', icon: Users, color: 'text-blue-600' },
  'user_updated': { label: 'Usuário Atualizado', icon: Edit, color: 'text-yellow-600' },
  'login': { label: 'Login', icon: LogIn, color: 'text-green-600' },
  'logout': { label: 'Logout', icon: LogOut, color: 'text-gray-600' },
  'view': { label: 'Visualização', icon: Eye, color: 'text-blue-600' },
  'create': { label: 'Criação', icon: FileText, color: 'text-green-600' },
  'update': { label: 'Atualização', icon: Edit, color: 'text-yellow-600' },
  'delete': { label: 'Exclusão', icon: Trash2, color: 'text-red-600' },
};

// Componente de gráfico de barras simples
function SimpleBarChart({ data, title }: { data: Record<string, number>; title: string }) {
  const maxValue = Math.max(...Object.values(data), 1);
  const entries = Object.entries(data).slice(0, 10);
  
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="body-small">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map(([key, value]) => {
          const actionInfo = actionLabels[key] || { label: key, icon: Activity, color: 'text-gray-600' };
          const percentage = (value / maxValue) * 100;
          
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <actionInfo.icon className={`h-4 w-4 ${actionInfo.color}`} />
                  {actionInfo.label}
                </span>
                <span className="font-medium">{value}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Componente de gráfico de linha simples para atividade diária
function DailyActivityChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  const maxValue = Math.max(...entries.map(([, v]) => v), 1);
  
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Atividade Diária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="body-small">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Atividade Diária (últimos 14 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-32">
          {entries.map(([date, value]) => {
            const height = (value / maxValue) * 100;
            const formattedDate = format(new Date(date), 'dd/MM', { locale: ptBR });
            
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{value}</span>
                <div 
                  className="w-full bg-primary rounded-t transition-all duration-500 min-h-[4px]"
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
                <span className="text-xs text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                  {formattedDate}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RelatoriosAtividades() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState('atividades');
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();

  // Queries
  const { data: users, isLoading: loadingUsers } = trpc.user.list.useQuery();
  const { data: allLogs, isLoading: loadingLogs, refetch: refetchLogs } = trpc.user.getAllActivityLogs.useQuery(
    { limit: 500 },
    { enabled: user?.role === 'admin_global' || user?.role === 'consultor' }
  );
  
  // Query de organizações para o filtro de presenças
  const { data: organizations } = trpc.organization.list.useQuery();
  
  // Query de relatório de presenças
  const { data: attendanceReport, isLoading: loadingAttendance } = trpc.governanca.attendanceReport.useQuery(
    { organizationId: selectedOrgId!, year: currentYear },
    { enabled: !!selectedOrgId && activeTab === 'presencas' }
  );

  // Mutation para gerar relatório
  const generateReportMutation = trpc.user.generateActivityReport.useMutation({
    onSuccess: (data: any) => {
      if (data.pdf) {
        // Converter base64 para blob e fazer download
        const byteCharacters = atob(data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Criar link de download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename || 'relatorio-atividades.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('PDF gerado e baixado com sucesso!');
        setIsReportDialogOpen(false);
      } else {
        toast.success('Relatório gerado com sucesso!');
        console.log('Relatório:', data);
      }
    },
    onError: (error) => {
      toast.error('Erro ao gerar relatório: ' + error.message);
    },
  });

  // Processar dados para gráficos
  const chartData = useMemo(() => {
    if (!allLogs) return { actionCounts: {}, dailyActivity: {} };
    
    const actionCounts: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};
    
    allLogs.forEach((log: any) => {
      // Contar por tipo de ação
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      
      // Contar por dia
      const date = new Date(log.createdAt).toISOString().split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });
    
    return { actionCounts, dailyActivity };
  }, [allLogs]);

  // Filtrar logs por usuário selecionado
  const filteredLogs = useMemo(() => {
    if (!allLogs) return [];
    if (!selectedUserId) return allLogs;
    return allLogs.filter((log: any) => log.userId === selectedUserId);
  }, [allLogs, selectedUserId]);

  // Verificar permissão
  if (user?.role !== 'admin_global' && user?.role !== 'consultor') {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Esta área é restrita a administradores e consultores PMO.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processar dados de presenças
  const attendanceStats = useMemo(() => {
    if (!attendanceReport || !Array.isArray(attendanceReport)) {
      return { total: 0, presentes: 0, ausentes: 0, justificados: 0, taxa: 0, byUser: [] };
    }
    
    const total = attendanceReport.length;
    const presentes = attendanceReport.filter((r: any) => r.attendanceStatus === 'presente').length;
    const ausentes = attendanceReport.filter((r: any) => r.attendanceStatus === 'ausente').length;
    const justificados = attendanceReport.filter((r: any) => r.attendanceStatus === 'justificado').length;
    const taxa = total > 0 ? Math.round((presentes / total) * 100) : 0;
    
    // Agrupar por usuário
    const userMap = new Map<number, { name: string; email: string; total: number; presentes: number; ausentes: number; justificados: number }>();
    attendanceReport.forEach((record: any) => {
      const userId = record.userId;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          name: record.nameSnapshot || 'Usuário',
          email: record.emailSnapshot || '',
          total: 0,
          presentes: 0,
          ausentes: 0,
          justificados: 0,
        });
      }
      const u = userMap.get(userId)!;
      u.total++;
      if (record.attendanceStatus === 'presente') u.presentes++;
      else if (record.attendanceStatus === 'ausente') u.ausentes++;
      else if (record.attendanceStatus === 'justificado') u.justificados++;
    });
    
    const byUser = Array.from(userMap.values()).sort((a, b) => {
      const taxaA = a.total > 0 ? a.presentes / a.total : 0;
      const taxaB = b.total > 0 ? b.presentes / b.total : 0;
      return taxaB - taxaA;
    });
    
    return { total, presentes, ausentes, justificados, taxa, byUser };
  }, [attendanceReport]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Relatórios de Atividades
          </h1>
          <p className="text-muted-foreground">
            Acompanhe todas as atividades dos usuários na plataforma
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchLogs()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              generateReportMutation.mutate({
                userId: selectedUserId || undefined,
                format: 'pdf',
              });
            }}
            disabled={generateReportMutation.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            {generateReportMutation.isPending ? 'Gerando...' : 'Exportar PDF'}
          </Button>
          <Button onClick={() => setIsReportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Gerar Relatório
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="atividades" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Atividades
          </TabsTrigger>
          <TabsTrigger value="presencas" className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Presenças CPPD
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="atividades" className="space-y-6 mt-6">

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="body-small">Total de Ações</p>
                <p className="text-2xl font-bold">{allLogs?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="body-small">Usuários Ativos</p>
                <p className="text-2xl font-bold">
                  {users?.filter((u: any) => u.isActive).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="body-small">Ações Hoje</p>
                <p className="text-2xl font-bold">
                  {chartData.dailyActivity[new Date().toISOString().split('T')[0]] || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="body-small">Tipos de Ações</p>
                <p className="text-2xl font-bold">
                  {Object.keys(chartData.actionCounts).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SimpleBarChart data={chartData.actionCounts} title="Distribuição por Tipo de Ação" />
        <DailyActivityChart data={chartData.dailyActivity} />
      </div>

      {/* Filtros e Tabela */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Log de Atividades
              </CardTitle>
              <CardDescription>
                Histórico detalhado de todas as ações realizadas
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedUserId?.toString() || 'all'}
                onValueChange={(value) => setSelectedUserId(value === 'all' ? null : parseInt(value))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.slice(0, 50).map((log: any) => {
                    const actionInfo = actionLabels[log.action] || { 
                      label: log.action, 
                      icon: Activity, 
                      color: 'text-gray-600' 
                    };
                    const ActionIcon = actionInfo.icon;
                    const logUser = users?.find((u: any) => u.id === log.userId);
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {logUser?.name || logUser?.email || `ID: ${log.userId}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ActionIcon className={`h-4 w-4 ${actionInfo.color}`} />
                            <span>{actionInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.entityType} #{log.entityId}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!filteredLogs || filteredLogs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma atividade registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para gerar relatório */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Relatório de Atividades</DialogTitle>
            <DialogDescription>
              Configure os parâmetros do relatório
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuário (opcional)</Label>
              <Select
                value={selectedUserId?.toString() || 'all'}
                onValueChange={(value) => setSelectedUserId(value === 'all' ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                generateReportMutation.mutate({
                  userId: selectedUserId || undefined,
                  startDate: dateRange.start || undefined,
                  endDate: dateRange.end || undefined,
                  format: 'json',
                });
              }}
              disabled={generateReportMutation.isPending}
            >
              Ver Dados
            </Button>
            <Button
              onClick={() => {
                generateReportMutation.mutate({
                  userId: selectedUserId || undefined,
                  startDate: dateRange.start || undefined,
                  endDate: dateRange.end || undefined,
                  format: 'pdf',
                });
              }}
              disabled={generateReportMutation.isPending}
            >
              {generateReportMutation.isPending ? 'Gerando...' : 'Exportar PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </TabsContent>
        
        <TabsContent value="presencas" className="space-y-6 mt-6">
          {/* Seletor de Organização */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <Label>Selecione uma Organização</Label>
                  <Select
                    value={selectedOrgId?.toString() || ''}
                    onValueChange={(v) => setSelectedOrgId(Number(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione uma organização para ver as presenças" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations?.map((org: any) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {selectedOrgId ? (
            <>
              {/* Cards de Estatísticas de Presenças */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-green-100">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="body-small">Taxa de Presença</p>
                        <p className="text-2xl font-bold text-green-600">{attendanceStats.taxa}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-blue-100">
                        <CalendarCheck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="body-small">Total Registros</p>
                        <p className="text-2xl font-bold">{attendanceStats.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-emerald-100">
                        <UserCheck className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="body-small">Presenças</p>
                        <p className="text-2xl font-bold text-emerald-600">{attendanceStats.presentes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-red-100">
                        <UserX className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <p className="body-small">Ausências</p>
                        <p className="text-2xl font-bold text-red-600">{attendanceStats.ausentes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-amber-100">
                        <AlertCircle className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="body-small">Justificadas</p>
                        <p className="text-2xl font-bold text-amber-600">{attendanceStats.justificados}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Gráfico de Presenças por Usuário */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Taxa de Presença por Membro - {currentYear}
                  </CardTitle>
                  <CardDescription>
                    Ranking de presença em reuniões do CPPD
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAttendance ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : attendanceStats.byUser.length > 0 ? (
                    <div className="space-y-3">
                      {attendanceStats.byUser.map((user, index) => {
                        const taxa = user.total > 0 ? Math.round((user.presentes / user.total) * 100) : 0;
                        const isLowAttendance = taxa < 70;
                        
                        return (
                          <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-700' :
                              index === 2 ? 'bg-amber-600 text-white' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{user.name}</p>
                                {isLowAttendance && (
                                  <Badge variant="destructive" className="text-xs">
                                    Baixa Presença
                                  </Badge>
                                )}
                              </div>
                              <p className="body-small">{user.email}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${isLowAttendance ? 'text-red-600' : 'text-green-600'}`}>
                                {taxa}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {user.presentes}/{user.total} reuniões
                              </p>
                            </div>
                            <div className="w-24">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${isLowAttendance ? 'bg-red-500' : 'bg-green-500'}`}
                                  style={{ width: `${taxa}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum registro de presença encontrado para {currentYear}
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {/* Tabela Detalhada de Presenças */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Detalhamento por Membro
                  </CardTitle>
                  <CardDescription>
                    Visão detalhada de presenças, ausências e justificativas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceStats.byUser.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Membro</TableHead>
                            <TableHead className="text-center">Presenças</TableHead>
                            <TableHead className="text-center">Ausências</TableHead>
                            <TableHead className="text-center">Justificadas</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Taxa</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceStats.byUser.map((user, index) => {
                            const taxa = user.total > 0 ? Math.round((user.presentes / user.total) * 100) : 0;
                            const isLowAttendance = taxa < 70;
                            
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="body-small">{user.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge className="bg-green-100 text-green-800">
                                    {user.presentes}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="destructive">
                                    {user.ausentes}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary">
                                    {user.justificados}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center font-medium">
                                  {user.total}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`font-bold ${isLowAttendance ? 'text-red-600' : 'text-green-600'}`}>
                                    {taxa}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {isLowAttendance ? (
                                    <Badge variant="destructive">Baixa Presença</Badge>
                                  ) : (
                                    <Badge className="bg-green-100 text-green-800">Regular</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum registro de presença encontrado
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Selecione uma Organização</h3>
                <p className="text-muted-foreground">
                  Escolha uma organização acima para visualizar o relatório de presenças do CPPD
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
