import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/contexts/ToastContext";
import { 
  Users, Shield, Database, CheckCircle, Lock, Bell, Building, 
  GraduationCap, Lightbulb, ArrowRight, ArrowLeft, Mail, 
  Search, RefreshCw, Send, Loader2, Info
} from "lucide-react";
import { SEUSDADOS_FRAMEWORK, getTotalQuestions } from "../../../shared/frameworkSeusdados";

// Ícones por domínio
const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  "IA-01": <Shield className="w-5 h-5" />,
  "IA-02": <Database className="w-5 h-5" />,
  "IA-03": <CheckCircle className="w-5 h-5" />,
  "IA-04": <Users className="w-5 h-5" />,
  "IA-05": <Lock className="w-5 h-5" />,
  "IA-06": <Bell className="w-5 h-5" />,
  "IA-07": <Building className="w-5 h-5" />,
  "IA-08": <GraduationCap className="w-5 h-5" />,
  "IA-09": <Lightbulb className="w-5 h-5" />,
};

const DOMAIN_COLORS: Record<string, string> = {
  "IA-01": "bg-blue-100 text-blue-700 border-blue-200",
  "IA-02": "bg-green-100 text-green-700 border-green-200",
  "IA-03": "bg-purple-100 text-purple-700 border-purple-200",
  "IA-04": "bg-orange-100 text-orange-700 border-orange-200",
  "IA-05": "bg-red-100 text-red-700 border-red-200",
  "IA-06": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "IA-07": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "IA-08": "bg-pink-100 text-pink-700 border-pink-200",
  "IA-09": "bg-cyan-100 text-cyan-700 border-cyan-200",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
  em_andamento: { label: "Em Andamento", color: "bg-blue-100 text-blue-700" },
  concluida: { label: "Concluída", color: "bg-green-100 text-green-700" },
};

export default function AssessmentAssignment() {
  const params = useParams() as { id?: string };
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const assessmentId = params.id ? parseInt(params.id) : null;

  // Estado local: mapa domainId -> userId selecionado
  const [domainUserMap, setDomainUserMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const domains = SEUSDADOS_FRAMEWORK;
  const totalQuestions = getTotalQuestions();

  // Buscar avaliação
  const { data: assessment, isLoading: loadingAssessment } = trpc.assessments.get.useQuery(
    { id: assessmentId! },
    { enabled: !!assessmentId }
  );

  // Buscar usuários da organização da avaliação (apenas já cadastrados e vinculados à organização)
  const orgId = assessment?.organizationId || 0;
  const { data: organizationUsers, isLoading: loadingUsers } = trpc.user.listByOrganization.useQuery(
    { organizationId: orgId },
    { enabled: orgId > 0 }
  );

  // Buscar atribuições existentes
  const { data: existingAssignments, isLoading: loadingAssignments } = trpc.assessments.getAssignments.useQuery(
    { assessmentId: assessmentId! },
    { enabled: !!assessmentId }
  );

  // Mutation para salvar e notificar
  const saveAssignmentsMutation = trpc.assessments.saveAssignmentsAndNotify.useMutation();
  const resendMutation = trpc.assessments.resendInvitation.useMutation();

  // Preencher estado com atribuições existentes
  useEffect(() => {
    if (existingAssignments && existingAssignments.length > 0) {
      const map: Record<string, string> = {};
      existingAssignments.forEach(a => {
        map[a.domainId] = a.assignedToUserId.toString();
      });
      setDomainUserMap(map);
    }
  }, [existingAssignments]);

  // Filtrar usuários pela busca
  const filteredUsers = useMemo(() => {
    if (!organizationUsers) return [];
    if (!searchTerm) return organizationUsers;
    const term = searchTerm.toLowerCase();
    return organizationUsers.filter(u =>
      u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );
  }, [organizationUsers, searchTerm]);

  // Calcular progresso
  const assignedCount = Object.keys(domainUserMap).filter(k => domainUserMap[k]).length;
  const assignmentProgress = (assignedCount / domains.length) * 100;

  // Obter nome do usuário por ID
  const getUserById = (userId: string) => {
    return organizationUsers?.find(u => u.id.toString() === userId);
  };

  // Salvar atribuições e enviar notificações
  const handleSubmit = async () => {
    if (assignedCount === 0) {
      toast.warning("Atenção", "Atribua pelo menos um domínio a um respondente.");
      return;
    }
    if (!assessmentId) return;

    setSaving(true);
    try {
      const assignments = Object.entries(domainUserMap)
        .filter(([, userId]) => userId)
        .map(([domainId, userId]) => {
          const userObj = getUserById(userId);
          const domain = domains.find(d => d.id === domainId);
          return {
            domainId,
            domainName: domain?.name || domainId,
            userId: parseInt(userId),
            userName: userObj?.name || "",
            userEmail: userObj?.email || "",
          };
        });

      const result = await saveAssignmentsMutation.mutateAsync({
        assessmentId,
        assignments,
      });

      toast.success("Atribuições salvas", `${result.assignmentsCount} domínio(s) atribuído(s). ${result.emailsSent} notificação(ões) enviada(s).`);

      // Se todos os domínios foram atribuídos, redirecionar para a avaliação (acompanhamento)
      // Caso contrário, redirecionar para a lista de avaliações
      if (assignedCount === domains.length) {
        setLocation(`/avaliacoes/${assessmentId}`);
      } else {
        setLocation("/avaliacoes");
      }
    } catch (error) {
      console.error("Erro ao salvar atribuições:", error);
      toast.error("Erro", "Falha ao salvar atribuições. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Reenviar convite individual
  const handleResend = async (assignmentId: number) => {
    if (!assessmentId) return;
    try {
      await resendMutation.mutateAsync({ assessmentId, assignmentId });
      toast.success("Convite reenviado", "O e-mail de convite foi reenviado com sucesso.");
    } catch {
      toast.error("Erro", "Falha ao reenviar convite.");
    }
  };

  if (loadingAssessment || loadingUsers || loadingAssignments) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                Atribuição de Domínios
              </h1>
              <p className="text-muted-foreground mt-1">
                Selecione os responsáveis por cada domínio da avaliação {assessment?.assessmentCode || ""}
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/avaliacoes")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>

          {/* Barra de Progresso */}
          <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Progresso: {assignedCount} de {domains.length} domínios atribuídos
              </span>
              <span className="text-sm text-muted-foreground">
                {totalQuestions} questões no total
              </span>
            </div>
            <Progress value={assignmentProgress} className="h-2" />
          </div>

          {/* Aviso: apenas usuários já cadastrados */}
          <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">
              Apenas usuários já cadastrados e vinculados à organização podem ser atribuídos como respondentes.
              Para adicionar novos usuários, utilize o módulo de Gestão de Usuários antes de realizar a atribuição.
            </p>
          </div>
        </div>

        {/* Domínios com Select de Usuário */}
        <div className="space-y-4">
          {/* Busca de usuários */}
          <Card>
            <CardContent className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar usuários disponíveis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {organizationUsers?.length || 0} usuário(s) disponíveis na organização
              </p>
            </CardContent>
          </Card>

          {/* Grid de Domínios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map(domain => {
              const selectedUserId = domainUserMap[domain.id] || "";
              const selectedUser = selectedUserId ? getUserById(selectedUserId) : null;
              const existingAssignment = existingAssignments?.find(a => a.domainId === domain.id);

              return (
                <Card key={domain.id} className={`border-2 transition-all ${
                  selectedUserId ? "border-indigo-400 bg-indigo-50/30" : "border-border"
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${DOMAIN_COLORS[domain.id]}`}>
                        {DOMAIN_ICONS[domain.id]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold">{domain.id}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{domain.name}</CardDescription>
                        <p className="text-xs text-muted-foreground mt-1">
                          {domain.questions.length} questões
                        </p>
                      </div>
                      {existingAssignment && (
                        <Badge className={`text-xs shrink-0 ${STATUS_LABELS[existingAssignment.status]?.color || ""}`}>
                          {STATUS_LABELS[existingAssignment.status]?.label || existingAssignment.status}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {/* Select de Usuário */}
                    <Select
                      value={selectedUserId}
                      onValueChange={(value) => {
                        setDomainUserMap(prev => ({
                          ...prev,
                          [domain.id]: value === "none" ? "" : value,
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecionar responsável..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem responsável</SelectItem>
                        {filteredUsers.map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Info do usuário selecionado */}
                    {selectedUser && (
                      <div className="p-2 bg-white rounded border border-indigo-200 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-indigo-700">{selectedUser.name}</p>
                          <p className="text-xs text-indigo-600">{selectedUser.email}</p>
                        </div>
                        {existingAssignment && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleResend(existingAssignment.id)}
                            disabled={resendMutation.isPending}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Reenviar
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Resumo e Ações */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {assignedCount > 0 && (
              <span>
                {assignedCount} domínio(s) atribuído(s) a{" "}
                {new Set(Object.values(domainUserMap).filter(Boolean)).size} usuário(s)
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setLocation("/avaliacoes")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || assignedCount === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Salvar e Notificar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
