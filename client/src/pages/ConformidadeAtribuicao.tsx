import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Users, CheckCircle2, AlertCircle, Send, RefreshCw, User, Clock, Eye } from "lucide-react";
import { dominiosConformidade } from "@shared/assessmentData";
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

export default function ConformidadeAtribuicao() {
  const params = useParams<{ id: string }>();
  const assessmentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  
  // Verificar se o usuário tem permissão para acessar esta página
  const isAdmin = ['admin_global', 'consultor'].includes(currentUser?.role || '');
  const isSponsor = currentUser?.role === 'sponsor';

  // Estado: domainId -> userId (null = sem atribuição)
  const [domainUserMap, setDomainUserMap] = useState<Record<number, number | null>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Queries
  const { data: assessment, isLoading: loadingAssessment } = trpc.compliance.getById.useQuery(
    { id: assessmentId },
    { enabled: !!assessmentId }
  );

  const { data: users, isLoading: loadingUsers } = trpc.user.listByOrganization.useQuery(
    { organizationId: assessment?.organizationId || 0 },
    { enabled: !!assessment?.organizationId }
  );

  const { data: existingAssignments, isLoading: loadingAssignments } = trpc.compliance.getAssignments.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );

  const utils = trpc.useUtils();

  const saveAssignmentsMutation = trpc.compliance.saveAssignmentsAndNotify.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Atribuições salvas com sucesso!");
      setShowConfirmDialog(false);
      setIsSaving(false);
      utils.compliance.getAssignments.invalidate({ assessmentId });
      setTimeout(() => {
        setLocation(`/conformidade/avaliacao/${assessmentId}`);
      }, 1500);
    },
    onError: (error) => {
      toast.error("Erro ao salvar atribuições: " + error.message);
      setIsSaving(false);
    },
  });

  const resendMutation = trpc.compliance.resendInvitation.useMutation({
    onSuccess: () => {
      toast.success("Convite reenviado com sucesso!");
      utils.compliance.getAssignments.invalidate({ assessmentId });
    },
    onError: (error) => {
      toast.error("Erro ao reenviar: " + error.message);
    },
  });

  // Inicializar mapa de atribuições com dados existentes
  useEffect(() => {
    if (existingAssignments && existingAssignments.length > 0) {
      const map: Record<number, number | null> = {};
      for (const a of existingAssignments) {
        map[a.domainId] = a.userId;
      }
      setDomainUserMap(map);
    }
  }, [existingAssignments]);

  // Filtrar usuários que não são o admin/sponsor atual (quem cria não responde)
  const availableUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => u.id !== currentUser?.id);
  }, [users, currentUser]);

  // Determinar se é modo Sponsor
  const isSponsorMode = isSponsor && assessment.organizationId === currentUser?.organizationId;

  const handleUserChange = (domainId: number, value: string) => {
    if (value === "none") {
      setDomainUserMap(prev => ({ ...prev, [domainId]: null }));
    } else {
      setDomainUserMap(prev => ({ ...prev, [domainId]: parseInt(value) }));
    }
  };

  const handleSave = () => {
    const assignedCount = Object.values(domainUserMap).filter(v => v !== null && v !== undefined).length;
    if (assignedCount === 0) {
      toast.error("Atribua pelo menos um respondente a algum domínio");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = () => {
    setIsSaving(true);
    const assignments = dominiosConformidade.map(d => ({
      domainId: d.id,
      userId: domainUserMap[d.id] ?? null,
    }));

    saveAssignmentsMutation.mutate({
      assessmentId,
      assignments,
    });
  };

  // Estatísticas
  const assignedCount = Object.values(domainUserMap).filter(v => v !== null && v !== undefined).length;
  const uniqueUsers = new Set(Object.values(domainUserMap).filter(v => v !== null && v !== undefined));

  // Status badge para cada atribuição existente
  const getAssignmentStatus = (domainId: number) => {
    if (!existingAssignments) return null;
    const assignment = existingAssignments.find(a => a.domainId === domainId);
    if (!assignment) return null;

    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "outline" },
      sent: { label: "Enviado", variant: "secondary" },
      resent: { label: "Reenviado", variant: "secondary" },
      viewed: { label: "Visualizado", variant: "default" },
      responded: { label: "Respondido", variant: "default" },
      overdue: { label: "Atrasado", variant: "destructive" },
    };

    const status = statusMap[assignment.status] || { label: assignment.status, variant: "outline" as const };
    return { ...status, assignmentId: assignment.id, sentAt: assignment.sentAt };
  };

  if (loadingAssessment || loadingAssignments) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 p-6">
        <Skeleton className="h-12 w-96 mb-6" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">Avaliação não encontrada</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sponsor só pode gerenciar sua própria organização
  if (isSponsor && assessment.organizationId !== currentUser?.organizationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">Você não tem permissão para gerenciar esta avaliação</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Apenas admin e sponsor podem acessar
  if (!isAdmin && !isSponsor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">Acesso restrito. Apenas administradores podem gerenciar atribuições.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="max-w-5xl mx-auto p-6">
        {/* Cabeçalho */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/conformidade/avaliacao/${assessmentId}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-light text-gray-900">Atribuição de Domínios</h1>
          <p className="text-gray-600 mt-2 font-light">
            {isSponsorMode ? 'Como responsável pela organização, ' : ''}Selecione um responsável para cada domínio da avaliação. Cada domínio pode ter apenas um responsável.
          </p>
        </div>

        {/* Informações da Avaliação */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-medium">{assessment.title}</CardTitle>
            <CardDescription>
              Avaliação de conformidade em proteção de dados pessoais
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Aviso sobre separação de papéis */}
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Separação de Papéis</p>
              <p className="text-sm text-amber-800 mt-1 font-light">
                {isSponsorMode ? 'Como responsável pela organização, você ' : 'O administrador que gerencia a avaliação '}não pode ser atribuído como respondente. 
                Cada responsável visualizará e responderá exclusivamente os domínios atribuídos a ele.
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Domínios */}
        <div className="space-y-4">
          {dominiosConformidade.map((domain) => {
            const status = getAssignmentStatus(domain.id);
            const selectedUserId = domainUserMap[domain.id];
            const selectedUser = availableUsers.find(u => u.id === selectedUserId);

            return (
              <Card key={domain.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Info do Domínio */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-sm font-medium">
                          {domain.id}
                        </span>
                        <h3 className="font-medium text-gray-900">{domain.titulo}</h3>
                      </div>
                      <p className="text-sm text-gray-500 ml-9">
                        {domain.questoes.length} questões para responder
                      </p>
                      {status && (
                        <div className="flex items-center gap-2 ml-9 mt-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {status.sentAt && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Enviado em {new Date(status.sentAt).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {status.assignmentId && status.label !== "Respondido" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => resendMutation.mutate({ assignmentId: status.assignmentId })}
                              disabled={resendMutation.isPending}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Reenviar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Seletor de Usuário */}
                    <div className="w-full md:w-72">
                      {loadingUsers ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Select
                          value={selectedUserId ? String(selectedUserId) : "none"}
                          onValueChange={(value) => handleUserChange(domain.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecionar responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-gray-400">Sem responsável</span>
                            </SelectItem>
                            {availableUsers.map((user) => (
                              <SelectItem key={user.id} value={String(user.id)}>
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-gray-400" />
                                  <span>{user.name}</span>
                                  <span className="text-xs text-gray-400">({user.email})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Resumo e Ações */}
        <Card className="mt-8 border-0 shadow-lg bg-gradient-to-r from-violet-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Resumo da Atribuição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 font-light">Domínios Atribuídos</p>
                  <p className="text-2xl font-light text-violet-600">
                    {assignedCount} <span className="text-sm text-gray-400">de {dominiosConformidade.length}</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-light">Respondentes Únicos</p>
                  <p className="text-2xl font-light text-blue-600">{uniqueUsers.size}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-light">Domínios sem Responsável</p>
                  <p className="text-2xl font-light text-gray-400">
                    {dominiosConformidade.length - assignedCount}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/conformidade/avaliacao/${assessmentId}`)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={assignedCount === 0}
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Salvar e Enviar Convites
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de Confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Atribuições e Enviar Convites</DialogTitle>
            <DialogDescription>
              Revise as atribuições antes de confirmar. Os respondentes receberão um e-mail com instruções.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-light">
                Cada respondente receberá um e-mail informando quais domínios deve responder.
                Ele visualizará apenas os domínios atribuídos a ele.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Atribuições:</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm max-h-60 overflow-y-auto">
                {dominiosConformidade.map((domain) => {
                  const userId = domainUserMap[domain.id];
                  const user = availableUsers.find(u => u.id === userId);
                  return (
                    <div key={domain.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                      <span className="text-gray-900">{domain.titulo}</span>
                      {user ? (
                        <span className="text-violet-600 font-medium">{user.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Sem responsável</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-violet-600 to-blue-600"
            >
              {isSaving ? (
                <>
                  <Send className="mr-2 h-4 w-4 animate-spin" />
                  Salvando e Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirmar e Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
