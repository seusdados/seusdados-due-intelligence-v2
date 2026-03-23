import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Mail, RotateCcw, Eye, CheckCircle, AlertCircle, Clock, User } from 'lucide-react';

interface DomainAssignment {
  id: number;
  assessmentId: number;
  domainId: string;
  domainName: string;
  userId: number;
  userName: string;
  userEmail: string;
  sentAt: Date | null;
  resentAt: Date | null;
  respondedAt: Date | null;
  status: 'pending' | 'sent' | 'resent' | 'viewed' | 'responded';
}

export function ConformidadeDominioDetalhes() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const assessmentId = parseInt(params.assessmentId || '0');
  const domainId = params.domainId || '';

  const [assignments, setAssignments] = useState<DomainAssignment[]>([]);
  const [assessment, setAssessment] = useState<any>(null);
  const [domain, setDomain] = useState<any>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<DomainAssignment | null>(null);
  const [showResendDialog, setShowResendDialog] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Queries
  const { data: assessmentData, isLoading: loadingAssessment } = trpc.compliance.getById.useQuery(
    { id: assessmentId },
    { enabled: assessmentId > 0 }
  );

  const { data: assignmentsData, isLoading: loadingAssignments, refetch: refetchAssignments } = 
    trpc.compliance.getDomainAssignments.useQuery(
      { assessmentId, domainId },
      { enabled: assessmentId > 0 && !!domainId }
    );

  // Mutations
  const resendEmailMutation = trpc.compliance.resendInvitation.useMutation({
    onSuccess: () => {
      toast.success('E-mail reenviado com sucesso!');
      setShowResendDialog(false);
      setSelectedAssignment(null);
      refetchAssignments();
    },
    onError: (error) => {
      toast.error(`Erro ao reenviar: ${error.message}`);
    },
  });

  useEffect(() => {
    if (assessmentData) {
      setAssessment(assessmentData);
      const foundDomain = assessmentData.domains?.find((d: any) => d.id === domainId);
      setDomain(foundDomain);
    }
  }, [assessmentData, domainId]);

  useEffect(() => {
    if (assignmentsData) {
      setAssignments(assignmentsData);
    }
  }, [assignmentsData]);

  const calculateDeadline = (sentAt: Date | null) => {
    if (!sentAt) return null;
    return addDays(new Date(sentAt), 7);
  };

  const getStatusBadge = (status: string, deadline: Date | null) => {
    if (status === 'responded') {
      return <Badge className="bg-green-500">Respondido</Badge>;
    }
    if (status === 'viewed') {
      return <Badge className="bg-blue-500">Visualizado</Badge>;
    }
    if (status === 'resent') {
      return <Badge className="bg-orange-500">Reenviado</Badge>;
    }
    if (status === 'sent') {
      if (deadline && isAfter(new Date(), deadline)) {
        return <Badge className="bg-red-500">Vencido</Badge>;
      }
      if (deadline && isBefore(new Date(), addDays(deadline, -2))) {
        return <Badge className="bg-yellow-500">Próximo do vencimento</Badge>;
      }
      return <Badge className="bg-gray-500">Enviado</Badge>;
    }
    return <Badge className="bg-gray-400">Pendente</Badge>;
  };

  const getProgressPercentage = () => {
    if (assignments.length === 0) return 0;
    const responded = assignments.filter(a => a.status === 'responded').length;
    return Math.round((responded / assignments.length) * 100);
  };

  const getTimelineSteps = (assignment: DomainAssignment) => {
    const steps = [];
    
    if (assignment.sentAt) {
      steps.push({
        label: 'Enviado',
        date: assignment.sentAt,
        icon: Mail,
        completed: true,
      });
    }

    if (assignment.resentAt) {
      steps.push({
        label: 'Reenviado',
        date: assignment.resentAt,
        icon: RotateCcw,
        completed: true,
      });
    }

    if (assignment.respondedAt) {
      steps.push({
        label: 'Respondido',
        date: assignment.respondedAt,
        icon: CheckCircle,
        completed: true,
      });
    } else if (assignment.sentAt) {
      steps.push({
        label: 'Aguardando resposta',
        date: calculateDeadline(assignment.sentAt),
        icon: Clock,
        completed: false,
      });
    }

    return steps;
  };

  if (loadingAssessment || loadingAssignments) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!assessment || !domain) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p>Avaliação ou domínio não encontrado</p>
        <Button onClick={() => setLocation(`/conformidade/avaliacao/${assessmentId}`)}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => setLocation(`/conformidade/avaliacao/${assessmentId}`)}>
          ← Voltar
        </Button>
        <h1 className="text-3xl font-bold mt-4">{domain.name}</h1>
        <p className="text-gray-600 mt-2">{assessment.title}</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Respondentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assignments.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Respondidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {assignments.filter(a => a.status === 'responded').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{getProgressPercentage()}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Prazo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">7 dias úteis</p>
            <p className="text-xs text-gray-500 mt-1">A partir do envio</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Respondentes */}
      <Card>
        <CardHeader>
          <CardTitle>Respondentes</CardTitle>
          <CardDescription>Lista de respondentes e status de envio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const deadline = calculateDeadline(assignment.sentAt);
              const isOverdue = deadline && isAfter(new Date(), deadline);
              const isNearDeadline = deadline && isBefore(new Date(), addDays(deadline, -2)) && !isOverdue;

              return (
                <div
                  key={assignment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{assignment.userName}</p>
                        <p className="text-sm text-gray-500">{assignment.userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(assignment.status, deadline)}
                      {isOverdue && <AlertCircle className="w-5 h-5 text-red-500" />}
                      {isNearDeadline && <Clock className="w-5 h-5 text-yellow-500" />}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mb-4 pl-13">
                    <div className="space-y-2">
                      {getTimelineSteps(assignment).map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            step.completed ? 'bg-blue-600' : 'bg-gray-300'
                          }`}>
                            <step.icon className="w-3 h-3 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{step.label}</p>
                            {step.date && (
                              <p className="text-xs text-gray-500">
                                {format(new Date(step.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2">
                    {assignment.status !== 'responded' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowResendDialog(true);
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reenviar
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Respostas
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Reenvio */}
      <Dialog open={showResendDialog} onOpenChange={setShowResendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reenviar Convite</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja reenviar o convite para {selectedAssignment?.userName}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="outline" onClick={() => setShowResendDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedAssignment) {
                  setIsResending(true);
                  resendEmailMutation.mutate({
                    assignmentId: selectedAssignment.id,
                    assessmentId,
                    domainId,
                  });
                  setIsResending(false);
                }
              }}
              disabled={isResending}
            >
              {isResending ? 'Reenviando...' : 'Reenviar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
