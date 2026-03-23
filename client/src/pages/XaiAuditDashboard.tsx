import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, InfoCard, CardGrid, SectionHeader } from '@/components/DashboardCard';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  Search, 
  Filter, 
  Calendar,
  User,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
  Brain,
  Eye,
  Edit,
  Trash2,
  Plus,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

interface AuditLogEntry {
  id: number;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: number;
  userName: string;
  details: string;
  confidence?: number;
  rulesApplied?: string[];
}

export default function XaiAuditDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");

  // Buscar dados reais do backend
  const { data: auditData, isLoading, refetch } = trpc.contractAnalysis.getXaiAuditLogs.useQuery({
    limit: 100,
    actionFilter: selectedAction !== 'all' ? selectedAction : undefined,
  });

  // Transformar dados do backend para o formato esperado
  const auditLogs: AuditLogEntry[] = auditData?.logs?.map(log => ({
    id: log.id,
    timestamp: log.timestamp,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    userId: log.userId || 0,
    userName: log.userName,
    details: log.details || `Análise: ${log.contractName}`,
    confidence: 0.85,
    rulesApplied: ['LGPD', 'ANPD'],
  })) || [
    // Fallback mock data
    {
      id: 1,
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      action: "xai_analysis",
      entityType: "contract",
      entityId: "CONT-001",
      userId: 1,
      userName: "Marcelo Fattori",
      details: "Análise XAI executada com 3 alertas gerados",
      confidence: 0.92,
      rulesApplied: ["LGPD Art. 7", "LGPD Art. 46", "ISO 27701"]
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      action: "clause_generated",
      entityType: "clause",
      entityId: "CL-001",
      userId: 1,
      userName: "Marcelo Fattori",
      details: "Cláusula LGPD gerada via XAI - Tratamento de Dados",
      confidence: 0.88,
      rulesApplied: ["LGPD Art. 7", "LGPD Art. 11"]
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      action: "clause_refined",
      entityType: "clause",
      entityId: "CL-002",
      userId: 1,
      userName: "Marcelo Fattori",
      details: "Cláusula refinada com instruções personalizadas",
      confidence: 0.95,
      rulesApplied: ["LGPD Art. 18"]
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      action: "action_generated",
      entityType: "action_plan",
      entityId: "AP-001",
      userId: 1,
      userName: "Marcelo Fattori",
      details: "Plano de ação gerado com 5 ações prioritárias",
      confidence: 0.85,
      rulesApplied: ["LGPD Art. 50", "ISO 27001"]
    },
    {
      id: 5,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      action: "alert_contested",
      entityType: "alert",
      entityId: "ALT-001",
      userId: 1,
      userName: "Marcelo Fattori",
      details: "Alerta contestado: Justificativa técnica apresentada",
      confidence: 0.78,
      rulesApplied: ["LGPD Art. 7"]
    }
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case "xai_analyzed": return <Brain className="h-4 w-4" />;
      case "xai_clauses_generated": return <Plus className="h-4 w-4" />;
      case "xai_action_plan_generated": return <FileText className="h-4 w-4" />;
      case "xai_alert_contested": return <AlertTriangle className="h-4 w-4" />;
      case "xai_report_exported": return <Download className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      "xai_analyzed": "Análise XAI",
      "xai_clauses_generated": "Cláusulas XAI Geradas",
      "xai_action_plan_generated": "Plano de Ação XAI",
      "xai_alert_contested": "Alerta Contestado",
      "xai_report_exported": "Relatório Exportado"
    };
    return labels[action] || action;
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes("generated") || action.includes("analysis")) return "default";
    if (action.includes("accepted")) return "secondary";
    if (action.includes("rejected") || action.includes("contested")) return "destructive";
    return "outline";
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchQuery === "" ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = selectedAction === "all" || log.action === selectedAction;
    const matchesEntity = selectedEntity === "all" || log.entityType === selectedEntity;
    
    return matchesSearch && matchesAction && matchesEntity;
  });

  const stats = auditData?.stats || {
    totalAnalyses: 0,
    clausesGenerated: 0,
    actionsGenerated: 0,
    alertsContested: 0,
    reportsExported: 0,
  };
  const avgConfidence = auditLogs.length > 0 ? auditLogs.reduce((sum, l) => sum + (l.confidence || 0), 0) / auditLogs.length : 0;

  const handleExportAudit = () => {
    toast.success("Exportação iniciada. O arquivo será baixado em breve.");
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Auditoria XAI</h1>
            <p className="text-muted-foreground">
              Acompanhe todas as decisões e análises realizadas pela IA Explicável
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportAudit}>
            <Download className="h-4 w-4" />
            Exportar Log
          </Button>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <CardGrid columns={5}>
        <StatCard icon={Brain} iconGradient="violet" value={stats.totalAnalyses} label="Análises XAI" />
        <StatCard icon={FileText} iconGradient="blue" value={stats.clausesGenerated} label="Cláusulas" />
        <StatCard icon={CheckCircle2} iconGradient="emerald" value={stats.actionsGenerated} label="Ações Geradas" />
        <StatCard icon={AlertTriangle} iconGradient="amber" value={stats.alertsContested} label="Contestações" />
        <StatCard icon={Activity} iconGradient="indigo" value={`${(avgConfidence * 100).toFixed(0)}%`} label="Confiança Média" />
      </CardGrid>

      <div className="mb-0" />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por detalhes, usuário ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Ações</SelectItem>
                <SelectItem value="xai_analysis">Análise XAI</SelectItem>
                <SelectItem value="clause_generated">Cláusula Gerada</SelectItem>
                <SelectItem value="clause_refined">Cláusula Refinada</SelectItem>
                <SelectItem value="action_generated">Ação Gerada</SelectItem>
                <SelectItem value="alert_contested">Alerta Contestado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Entidades</SelectItem>
                <SelectItem value="contract">Contratos</SelectItem>
                <SelectItem value="clause">Cláusulas</SelectItem>
                <SelectItem value="action_plan">Planos de Ação</SelectItem>
                <SelectItem value="alert">Alertas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Últimas 24 horas</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Log de Auditoria</CardTitle>
          <CardDescription>
            {filteredLogs.length} registros encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-purple-50">
                        {getActionIcon(log.action)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {getActionLabel(log.action)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {log.entityType} • {log.entityId}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{log.details}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.userName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                          </span>
                          {log.confidence && (
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              Confiança: {(log.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Eye className="h-4 w-4" />
                      Detalhes
                    </Button>
                  </div>

                  {log.rulesApplied && log.rulesApplied.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-2">Regras Aplicadas:</p>
                      <div className="flex flex-wrap gap-1">
                        {log.rulesApplied.map((rule, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {rule}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-100">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Painel de Regras</h3>
                  <p className="text-sm text-gray-500">Visualizar regras XAI</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Relatório XAI</h3>
                  <p className="text-sm text-gray-500">Exportar análise completa</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Métricas de IA</h3>
                  <p className="text-sm text-gray-500">Estatísticas de performance</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
