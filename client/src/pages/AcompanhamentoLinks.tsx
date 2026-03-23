import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft,
  Send,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Copy,
  ExternalLink,
  Mail,
  Building2,
  Calendar,
  BarChart3
} from "lucide-react";
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type LinkStatus = 'all' | 'pendente' | 'enviado' | 'visualizado' | 'respondido' | 'expirado';

export default function AcompanhamentoLinks() {
  const params = useParams<{ orgId: string }>();
  const [, setLocation] = useLocation();
  const organizationId = parseInt(params.orgId || '0');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LinkStatus>('all');
  
  const { data: organization } = trpc.organization.getById.useQuery(
    { id: organizationId },
    { enabled: organizationId > 0 }
  );
  
  const { data: stats, refetch: refetchStats } = trpc.accessLink.stats.useQuery(
    { organizationId },
    { enabled: organizationId > 0 }
  );
  
  const { data: links, refetch: refetchLinks, isLoading } = trpc.accessLink.listWithDetails.useQuery(
    { organizationId },
    { enabled: organizationId > 0 }
  );
  
  const filteredLinks = useMemo(() => {
    if (!links) return [];
    
    return links.filter(link => {
      const matchesSearch = searchTerm === '' || 
        link.thirdPartyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.thirdPartyCnpj?.includes(searchTerm) ||
        link.thirdPartyEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || link.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [links, searchTerm, statusFilter]);
  
  const sendReminderMutation = trpc.accessLink.sendReminder.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        refetchLinks();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error('Erro ao enviar lembrete: ' + error.message);
    },
  });

  const handleRefresh = () => {
    refetchStats();
    refetchLinks();
    toast.success('Dados atualizados!');
  };

  const handleSendReminder = (token: string) => {
    sendReminderMutation.mutate({ token });
  };
  
  const handleCopyLink = (token: string) => {
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(`${baseUrl}/avaliacao/${token}`);
    toast.success('Link copiado!');
  };
  
  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      pendente: { 
        color: 'bg-slate-100 text-slate-700 border-slate-200', 
        icon: <Clock className="h-3 w-3" />,
        label: 'Pendente'
      },
      enviado: { 
        color: 'bg-blue-100 text-blue-700 border-blue-200', 
        icon: <Send className="h-3 w-3" />,
        label: 'Enviado'
      },
      visualizado: { 
        color: 'bg-amber-100 text-amber-700 border-amber-200', 
        icon: <Eye className="h-3 w-3" />,
        label: 'Visualizado'
      },
      respondido: { 
        color: 'bg-green-100 text-green-700 border-green-200', 
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Respondido'
      },
      expirado: { 
        color: 'bg-red-100 text-red-700 border-red-200', 
        icon: <AlertTriangle className="h-3 w-3" />,
        label: 'Expirado'
      },
    };
    
    const { color, icon, label } = config[status] || config.pendente;
    
    return (
      <Badge variant="outline" className={`${color} flex items-center gap-1`}>
        {icon}
        {label}
      </Badge>
    );
  };
  
  const statCards = [
    { 
      label: 'Total de Links', 
      value: stats?.total || 0, 
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'text-violet-600 bg-violet-100'
    },
    { 
      label: 'Enviados', 
      value: stats?.sent || 0, 
      icon: <Send className="h-5 w-5" />,
      color: 'text-blue-600 bg-blue-100'
    },
    { 
      label: 'Visualizados', 
      value: stats?.viewed || 0, 
      icon: <Eye className="h-5 w-5" />,
      color: 'text-amber-600 bg-amber-100'
    },
    { 
      label: 'Respondidos', 
      value: stats?.completed || 0, 
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'text-green-600 bg-green-100'
    },
    { 
      label: 'Pendentes', 
      value: stats?.pending || 0, 
      icon: <Clock className="h-5 w-5" />,
      color: 'text-slate-600 bg-slate-100'
    },
    { 
      label: 'Expirados', 
      value: stats?.expired || 0, 
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-600 bg-red-100'
    },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation(`/cliente/${organizationId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="heading-4 text-slate-900">
                Acompanhamento de Respostas
              </h1>
              <p className="text-sm text-slate-500">
                {organization?.name || 'Carregando...'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500 font-light">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LinkStatus)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="visualizado">Visualizado</SelectItem>
                  <SelectItem value="respondido">Respondido</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Links Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Links de Avaliação</CardTitle>
            <CardDescription className="font-light">
              {filteredLinks.length} link(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Carregando...</div>
            ) : filteredLinks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nenhum link encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Terceiro
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Criado em
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Expira em
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLinks.map((link) => (
                      <tr key={link.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-medium">
                              {link.thirdPartyName?.charAt(0) || 'T'}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{link.thirdPartyName}</p>
                              {link.thirdPartyEmail && (
                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {link.thirdPartyEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(link.status)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(link.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className={`flex items-center gap-1 text-sm ${
                            new Date(link.expiresAt) < new Date() ? 'text-red-600' : 'text-slate-600'
                          }`}>
                            <Clock className="h-3 w-3" />
                            {format(new Date(link.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyLink(link.token)}
                              title="Copiar link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <a 
                              href={`/avaliacao/${link.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="ghost" title="Abrir link">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                            {link.status === 'respondido' && link.assessmentId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setLocation(`/due-diligence/resultado/${link.assessmentId}`)}
                                title="Ver resultado"
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {(link.status === 'enviado' || link.status === 'visualizado') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSendReminder(link.token)}
                                disabled={sendReminderMutation.isPending}
                                title="Enviar lembrete"
                                className="text-amber-600"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
