import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  Eye, 
  MousePointer, 
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  BarChart3
} from "lucide-react";

const EMAIL_TYPE_LABELS: Record<string, string> = {
  convite_avaliacao: "Convite de Avaliação",
  lembrete_avaliacao: "Lembrete de Avaliação",
  resultado_avaliacao: "Resultado de Avaliação",
  convite_usuario: "Convite de Usuário",
  notificacao_sistema: "Notificação do Sistema",
  lembrete_prazo: "Lembrete de Prazo",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendente", color: "bg-yellow-500", icon: <Clock className="h-4 w-4" /> },
  sent: { label: "Enviado", color: "bg-blue-500", icon: <Send className="h-4 w-4" /> },
  delivered: { label: "Entregue", color: "bg-green-500", icon: <CheckCircle2 className="h-4 w-4" /> },
  opened: { label: "Aberto", color: "bg-purple-500", icon: <Eye className="h-4 w-4" /> },
  clicked: { label: "Clicado", color: "bg-indigo-500", icon: <MousePointer className="h-4 w-4" /> },
  bounced: { label: "Rejeitado", color: "bg-orange-500", icon: <AlertTriangle className="h-4 w-4" /> },
  failed: { label: "Falhou", color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
  spam: { label: "Spam", color: "bg-gray-500", icon: <AlertTriangle className="h-4 w-4" /> },
};

export default function EmailStatus() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    emailType: "",
    status: "",
    recipientEmail: "",
  });
  
  const organizationId = user?.organizationId;
  
  // TODO: emailLogs router não existe - usando dados mockados
  const stats = { total: 0, sent: 0, failed: 0, pending: 0, delivered: 0, opened: 0, bounced: 0 };
  const statsLoading = false;
  const refetchStats = () => {};
  
  // TODO: emailLogs router não existe - usando dados mockados
  const logs: any[] = [];
  const logsLoading = false;
  const refetchLogs = () => {};
  
  const handleRefresh = () => {
    refetchStats();
    refetchLogs();
  };
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Status de E-mails</h1>
            <p className="text-muted-foreground">
              Monitore o status de entrega dos e-mails enviados pelo sistema
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {statsLoading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{stats?.total || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-2xl font-bold">{stats?.pending || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="h-4 w-4 text-blue-500" />
                    <span className="text-2xl font-bold">{stats?.sent || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-2xl font-bold">{stats?.delivered || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Entregues</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-purple-500" />
                    <span className="text-2xl font-bold">{stats?.opened || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Abertos</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-2xl font-bold">{stats?.bounced || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Rejeitados</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-2xl font-bold">{stats?.failed || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Falhas</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        
        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Buscar por e-mail..."
                  value={filters.recipientEmail}
                  onChange={(e) => setFilters(prev => ({ ...prev, recipientEmail: e.target.value }))}
                  className="w-full"
                />
              </div>
              
              <Select
                value={filters.emailType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, emailType: value }))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo de e-mail" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="convite_avaliacao">Convite de Avaliação</SelectItem>
                  <SelectItem value="lembrete_avaliacao">Lembrete de Avaliação</SelectItem>
                  <SelectItem value="resultado_avaliacao">Resultado de Avaliação</SelectItem>
                  <SelectItem value="convite_usuario">Convite de Usuário</SelectItem>
                  <SelectItem value="notificacao_sistema">Notificação do Sistema</SelectItem>
                  <SelectItem value="lembrete_prazo">Lembrete de Prazo</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="opened">Aberto</SelectItem>
                  <SelectItem value="clicked">Clicado</SelectItem>
                  <SelectItem value="bounced">Rejeitado</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="ghost"
                onClick={() => setFilters({ emailType: "", status: "", recipientEmail: "" })}
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Email Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Histórico de E-mails
            </CardTitle>
            <CardDescription>
              Lista de todos os e-mails enviados pelo sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enviado em</TableHead>
                      <TableHead>Entregue em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => {
                      const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{log.recipientName || "-"}</p>
                              <p className="text-sm text-muted-foreground">{log.recipientEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {log.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {EMAIL_TYPE_LABELS[log.emailType] || log.emailType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusConfig.color} text-white`}>
                              <span className="flex items-center gap-1">
                                {statusConfig.icon}
                                {statusConfig.label}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(log.sentAt)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(log.deliveredAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum e-mail encontrado</h3>
                <p className="text-muted-foreground">
                  Os e-mails enviados pelo sistema aparecerão aqui
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
