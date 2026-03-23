import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Building2, 
  User, 
  Calendar,
  AlertTriangle,
  Loader2,
  Download,
  Eye
} from "lucide-react";
import { Streamdown } from "streamdown";

interface DpaApprovalData {
  id: number;
  analysisId: number;
  contractTitle: string;
  contractObject: string;
  organizationName: string;
  operatorName: string;
  controllerName: string;
  requestedByName: string;
  approverName: string;
  approverEmail: string;
  approverRole: string;
  status: 'pending' | 'viewed' | 'approved' | 'rejected' | 'expired';
  message: string;
  expiresAt: string;
  clausulas: Array<{
    id: string;
    titulo: string;
    conteudo: string;
    bloco: string;
  }>;
  analysisDate: string;
  version: string;
}

export default function DpaApprovalPublic() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DpaApprovalData | null>(null);
  const [showClauses, setShowClauses] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionCompleted, setActionCompleted] = useState<'approved' | 'rejected' | null>(null);

  useEffect(() => {
    if (token) {
      fetchApprovalData();
    }
  }, [token]);

  const fetchApprovalData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dpa-approval/public/${token}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar dados da aprovação');
      }
      
      const result = await response.json();
      setData(result);
      
      // Marcar como visualizado se ainda estiver pendente
      if (result.status === 'pending') {
        await fetch(`/api/dpa-approval/public/${token}/view`, { method: 'POST' });
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados da aprovação');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/dpa-approval/public/${token}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao aprovar');
      }
      
      setActionCompleted('approved');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/dpa-approval/public/${token}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao rejeitar');
      }
      
      setActionCompleted('rejected');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando dados da aprovação...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Link Inválido ou Expirado</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-500">
              Se você acredita que isso é um erro, entre em contato com o solicitante.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (actionCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className={`mx-auto w-16 h-16 ${actionCompleted === 'approved' ? 'bg-emerald-100' : 'bg-red-100'} rounded-full flex items-center justify-center mb-4`}>
              {actionCompleted === 'approved' ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <CardTitle className={actionCompleted === 'approved' ? 'text-emerald-600' : 'text-red-600'}>
              {actionCompleted === 'approved' ? 'Acordo Aprovado!' : 'Acordo Rejeitado'}
            </CardTitle>
            <CardDescription>
              {actionCompleted === 'approved' 
                ? 'O Acordo para Processamento de Dados Pessoais foi aprovado com sucesso.'
                : 'O Acordo para Processamento de Dados Pessoais foi rejeitado.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-500">
              O solicitante foi notificado sobre sua decisão.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // Verificar se já foi respondido ou expirou
  if (data.status === 'approved' || data.status === 'rejected' || data.status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className={`mx-auto w-16 h-16 ${
              data.status === 'approved' ? 'bg-emerald-100' : 
              data.status === 'rejected' ? 'bg-red-100' : 'bg-amber-100'
            } rounded-full flex items-center justify-center mb-4`}>
              {data.status === 'approved' ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              ) : data.status === 'rejected' ? (
                <XCircle className="h-8 w-8 text-red-600" />
              ) : (
                <Clock className="h-8 w-8 text-amber-600" />
              )}
            </div>
            <CardTitle>
              {data.status === 'approved' ? 'Acordo Já Aprovado' : 
               data.status === 'rejected' ? 'Acordo Já Rejeitado' : 'Link Expirado'}
            </CardTitle>
            <CardDescription>
              {data.status === 'expired' 
                ? 'Este link de aprovação expirou. Solicite um novo link ao responsável.'
                : 'Esta solicitação de aprovação já foi processada.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">Seusdados</h1>
              <p className="text-xs text-slate-500">Aprovação de DPA</p>
            </div>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Título do Acordo */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Acordo para Processamento de Dados Pessoais
          </h2>
          <p className="text-slate-500 text-sm">DATA PROCESSING AGREEMENT (DPA)</p>
          <p className="text-slate-400 text-xs mt-2">
            Versão {data.version} • {formatDate(data.analysisDate)}
          </p>
        </div>

        {/* Informações do Contrato */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Informações do Contrato
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Título do Contrato</p>
              <p className="font-medium text-slate-900">{data.contractTitle}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Organização</p>
              <p className="font-medium text-slate-900">{data.organizationName}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Objeto</p>
              <p className="text-slate-700">{data.contractObject}</p>
            </div>
          </CardContent>
        </Card>

        {/* Partes Envolvidas */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              Identificação das Partes
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <Badge className="mb-2 bg-blue-100 text-blue-700 hover:bg-blue-100">Operador(a)</Badge>
              <p className="font-medium text-slate-900">{data.operatorName}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <Badge className="mb-2 bg-purple-100 text-purple-700 hover:bg-purple-100">Controlador(a)</Badge>
              <p className="font-medium text-slate-900">{data.controllerName}</p>
            </div>
          </CardContent>
        </Card>

        {/* Solicitação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              Solicitação de Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Solicitado por</p>
                <p className="font-medium text-slate-900">{data.requestedByName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Aprovador</p>
                <p className="font-medium text-slate-900">{data.approverName || data.approverEmail}</p>
                {data.approverRole && (
                  <p className="text-sm text-slate-500">{data.approverRole}</p>
                )}
              </div>
            </div>
            {data.message && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Mensagem</p>
                <p className="text-slate-700 whitespace-pre-wrap">{data.message}</p>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-600">
              <Calendar className="h-4 w-4" />
              <span>Expira em: {formatDate(data.expiresAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cláusulas */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Cláusulas do Acordo ({data.clausulas.length})
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowClauses(!showClauses)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showClauses ? 'Ocultar' : 'Visualizar'}
              </Button>
            </div>
          </CardHeader>
          {showClauses && (
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {data.clausulas.map((clausula, index) => (
                  <div key={clausula.id} className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-2">
                      {index + 1}. {clausula.titulo}
                    </h4>
                    <div className="text-sm text-slate-700 prose prose-sm max-w-none">
                      <Streamdown>{clausula.conteudo}</Streamdown>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Ações */}
        <Card className="border-2 border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="text-lg text-center">Sua Decisão</CardTitle>
            <CardDescription className="text-center">
              Revise o acordo acima e escolha uma das opções abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showRejectForm ? (
              <div className="space-y-4">
                <Textarea
                  placeholder="Descreva o motivo da rejeição (opcional)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-3 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRejectForm(false)}
                    disabled={submitting}
                  >
                    Voltar
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleReject}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Confirmar Rejeição
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Aprovar Acordo
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setShowRejectForm(true)}
                  disabled={submitting}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar Acordo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Este link é único e intransferível.</p>
          <p className="mt-1">
            Em caso de dúvidas, entre em contato com {data.requestedByName}.
          </p>
        </div>
      </main>
    </div>
  );
}
