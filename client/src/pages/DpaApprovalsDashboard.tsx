import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Search,
  Filter,
  FileText,
  Building2,
  User,
  ExternalLink,
  RefreshCw,
  Eye,
  Send,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard, InfoCard, CardGrid, SectionHeader } from '@/components/DashboardCard';

interface ApprovalRequest {
  id: number;
  analysisId: number;
  contractTitle: string;
  organizationName: string;
  approverEmail: string;
  approverName: string | null;
  approverRole: string | null;
  status: 'pending' | 'viewed' | 'approved' | 'rejected' | 'expired';
  requestedByName: string | null;
  createdAt: string;
  expiresAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
}

export default function DpaApprovalsDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [organizationFilter, setOrganizationFilter] = useState<string>("all");

  const { data: approvals, isLoading, refetch } = trpc.contractAnalysis.getDpaApprovalRequests.useQuery();
  const { data: organizations } = trpc.organization.list.useQuery();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'viewed':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Eye className="h-3 w-3 mr-1" />Visualizado</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      case 'expired':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100"><AlertTriangle className="h-3 w-3 mr-1" />Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredApprovals = (approvals || []).filter((approval: ApprovalRequest) => {
    const matchesSearch = 
      approval.contractTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.approverEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.approverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.organizationName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || approval.status === statusFilter;
    const matchesOrg = organizationFilter === 'all' || approval.organizationName === organizationFilter;
    return matchesSearch && matchesStatus && matchesOrg;
  });

  const stats = {
    total: approvals?.length || 0,
    pending: approvals?.filter((a: ApprovalRequest) => a.status === 'pending' || a.status === 'viewed').length || 0,
    approved: approvals?.filter((a: ApprovalRequest) => a.status === 'approved').length || 0,
    rejected: approvals?.filter((a: ApprovalRequest) => a.status === 'rejected').length || 0,
    expired: approvals?.filter((a: ApprovalRequest) => a.status === 'expired').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Aprovações de DPA"
        subtitle="Acompanhe as solicitações de aprovação de Acordos para Processamento de Dados Pessoais"
        action={
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        }
      />

      {/* Stats Cards */}
      <CardGrid columns={5}>
        <StatCard icon={FileText} iconGradient="slate" value={stats.total} label="Total" />
        <StatCard icon={Clock} iconGradient="amber" value={stats.pending} label="Pendentes" />
        <StatCard icon={CheckCircle2} iconGradient="emerald" value={stats.approved} label="Aprovados" />
        <StatCard icon={XCircle} iconGradient="red" value={stats.rejected} label="Rejeitados" />
        <StatCard icon={AlertTriangle} iconGradient="slate" value={stats.expired} label="Expirados" />
      </CardGrid>

      {/* Filtros */}
      <InfoCard icon={Filter} iconGradient="indigo" title="Filtros" subtitle="Refine a busca">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por contrato, aprovador ou organização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="viewed">Visualizado</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Rejeitado</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Organização" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as organizações</SelectItem>
              {organizations?.map((org: any) => (
                <SelectItem key={org.id} value={org.name}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </InfoCard>

      {/* Tabela */}
      <InfoCard
        icon={Shield}
        iconGradient="violet"
        title="Solicitações de Aprovação"
        subtitle={`${filteredApprovals.length} solicitação(ões) encontrada(s)`}
      >
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando aprovações...</div>
        ) : filteredApprovals.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">Nenhuma solicitação de aprovação encontrada</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Organização</TableHead>
                <TableHead>Aprovador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Solicitado em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApprovals.map((approval: ApprovalRequest) => (
                <TableRow key={approval.id}>
                  <TableCell>
                    <div className="font-medium">{approval.contractTitle}</div>
                    <div className="text-xs text-muted-foreground">ID: {approval.analysisId}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {approval.organizationName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div>{approval.approverName || approval.approverEmail}</div>
                        {approval.approverRole && (
                          <div className="text-xs text-muted-foreground">{approval.approverRole}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(approval.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDate(approval.createdAt)}</div>
                    {approval.requestedByName && (
                      <div className="text-xs text-muted-foreground">por {approval.requestedByName}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={`text-sm ${new Date(approval.expiresAt) < new Date() ? 'text-red-600' : ''}`}>
                      {formatDate(approval.expiresAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLocation(`/analise-contratos/${approval.analysisId}`)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Análise
                        </DropdownMenuItem>
                        {(approval.status === 'pending' || approval.status === 'viewed') && (
                          <DropdownMenuItem>
                            <Send className="h-4 w-4 mr-2" />
                            Reenviar Link
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Copiar Link
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </InfoCard>
    </div>
  );
}
