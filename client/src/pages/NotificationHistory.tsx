import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  AlertTriangle,
  RefreshCw,
  Eye,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  sla_alert: { label: "Alerta de SLA", icon: <AlertTriangle className="h-4 w-4" />, color: "bg-red-100 text-red-800" },
  sla_summary: { label: "Resumo de SLA", icon: <Clock className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
  ticket_created: { label: "Ticket Criado", icon: <Bell className="h-4 w-4" />, color: "bg-green-100 text-green-800" },
  ticket_updated: { label: "Ticket Atualizado", icon: <RefreshCw className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-800" },
  ticket_assigned: { label: "Ticket Atribuído", icon: <Bell className="h-4 w-4" />, color: "bg-purple-100 text-purple-800" },
  deadline_warning: { label: "Aviso de Prazo", icon: <AlertTriangle className="h-4 w-4" />, color: "bg-orange-100 text-orange-800" },
  system: { label: "Sistema", icon: <Bell className="h-4 w-4" />, color: "bg-gray-100 text-gray-800" },
  email: { label: "E-mail", icon: <Mail className="h-4 w-4" />, color: "bg-indigo-100 text-indigo-800" },
  owner: { label: "Proprietário", icon: <Bell className="h-4 w-4" />, color: "bg-teal-100 text-teal-800" },
};

const statusLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "Pendente", icon: <Clock className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-800" },
  sent: { label: "Enviado", icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-100 text-green-800" },
  failed: { label: "Falhou", icon: <XCircle className="h-4 w-4" />, color: "bg-red-100 text-red-800" },
  read: { label: "Lido", icon: <Eye className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
};

const channelLabels: Record<string, string> = {
  app: "Aplicativo",
  email: "E-mail",
  owner_notification: "Notificação Owner",
};

export default function NotificationHistory() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: history, isLoading, refetch } = trpc.notifications.historyList.useQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit,
    offset: page * limit,
  });

  const { data: stats } = trpc.notifications.historyStats.useQuery({});

  const markAsReadMutation = trpc.notifications.historyMarkAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleMarkAsRead = (ids: number[]) => {
    markAsReadMutation.mutate({ ids });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Histórico de Notificações</h1>
            <p className="text-muted-foreground">
              Visualize todas as notificações enviadas pelo sistema
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <p className="text-xs text-muted-foreground">Falhas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{stats.read}</div>
                <p className="text-xs text-muted-foreground">Lidas</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <label className="text-sm font-medium mb-1 block">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {Object.entries(typeLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(statusLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>
              {history?.length || 0} notificações encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : history && history.length > 0 ? (
              <div className="space-y-4">
                {history.map((notification: any) => {
                  const typeInfo = typeLabels[notification.type] || typeLabels.system;
                  const statusInfo = statusLabels[notification.status] || statusLabels.pending;
                  
                  return (
                    <div
                      key={notification.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={typeInfo.color}>
                              {typeInfo.icon}
                              <span className="ml-1">{typeInfo.label}</span>
                            </Badge>
                            <Badge className={statusInfo.color}>
                              {statusInfo.icon}
                              <span className="ml-1">{statusInfo.label}</span>
                            </Badge>
                            <Badge variant="outline">
                              {channelLabels[notification.channel] || notification.channel}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-foreground truncate">
                            {notification.title}
                          </h4>
                          <p className="body-small line-clamp-2 mt-1">
                            {notification.content}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Criado: {formatDate(notification.createdAt)}</span>
                            {notification.sentAt && (
                              <span>Enviado: {formatDate(notification.sentAt)}</span>
                            )}
                            {notification.readAt && (
                              <span>Lido: {formatDate(notification.readAt)}</span>
                            )}
                          </div>
                          {notification.errorMessage && (
                            <p className="text-sm text-red-600 mt-2">
                              Erro: {notification.errorMessage}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {notification.status !== 'read' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead([notification.id])}
                              disabled={markAsReadMutation.isPending}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Anterior
                  </Button>
                  <span className="body-small">
                    Página {page + 1}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!history || history.length < limit}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">
                  Nenhuma notificação encontrada
                </h3>
                <p className="text-muted-foreground">
                  As notificações enviadas pelo sistema aparecerão aqui.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
