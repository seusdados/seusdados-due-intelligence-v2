/**
 * Painel de Assinatura Digital Gov.br
 * Componente para iniciar e acompanhar assinaturas digitais via Gov.br
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Fingerprint,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Loader2,
  FileSignature,
  User,
  Calendar,
  RefreshCw,
  Info,
  Download,
} from "lucide-react";

interface SignatureStatus {
  id: number;
  status: 'pending' | 'awaiting_authorization' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';
  signerName?: string;
  signerEmail?: string;
  signerGovbrLevel?: 'bronze' | 'prata' | 'ouro';
  signedAt?: string;
  certificateType?: 'govbr' | 'icp_brasil';
  errorMessage?: string;
  signedDocumentUrl?: string;
}

interface GovbrSignaturePanelProps {
  analysisId: number;
  entityType: 'dpa' | 'contract' | 'document';
  entityId: number;
  documentTitle: string;
  onSignatureComplete?: (signature: SignatureStatus) => void;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    color: 'bg-slate-500',
    icon: Clock,
    description: 'Aguardando início do processo de assinatura',
  },
  awaiting_authorization: {
    label: 'Aguardando Autorização',
    color: 'bg-amber-500',
    icon: Clock,
    description: 'Aguardando autorização no portal Gov.br',
  },
  processing: {
    label: 'Processando',
    color: 'bg-blue-500',
    icon: Loader2,
    description: 'Processando assinatura digital',
  },
  completed: {
    label: 'Assinado',
    color: 'bg-emerald-500',
    icon: CheckCircle2,
    description: 'Documento assinado com sucesso',
  },
  failed: {
    label: 'Falhou',
    color: 'bg-red-500',
    icon: XCircle,
    description: 'Erro no processo de assinatura',
  },
  expired: {
    label: 'Expirado',
    color: 'bg-slate-400',
    icon: Clock,
    description: 'Sessão de assinatura expirada',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-slate-400',
    icon: XCircle,
    description: 'Assinatura cancelada pelo usuário',
  },
};

const GOVBR_LEVEL_CONFIG = {
  bronze: { label: 'Bronze', color: 'bg-amber-600', description: 'Conta básica' },
  prata: { label: 'Prata', color: 'bg-slate-400', description: 'Conta verificada' },
  ouro: { label: 'Ouro', color: 'bg-amber-400', description: 'Conta com biometria' },
};

export function GovbrSignaturePanel({
  analysisId,
  entityType,
  entityId,
  documentTitle,
  onSignatureComplete,
}: GovbrSignaturePanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Query para verificar configuração Gov.br
  const { data: govbrConfig } = trpc.govbrSignature.getConfig.useQuery();

  // Query para listar assinaturas existentes
  const { data: signatures, refetch: refetchSignatures } = trpc.govbrSignature.listSignatures.useQuery({
    entityType,
    entityId,
    analysisId,
  });

  // Mutation para iniciar assinatura
  const initiateSignatureMutation = trpc.govbrSignature.initiateSignature.useMutation({
    onSuccess: (data) => {
      toast.success('Redirecionando para o Gov.br...', {
        description: 'Você será redirecionado para autorizar a assinatura.',
      });
      
      // Salvar URL de retorno
      sessionStorage.setItem('govbr_return_url', window.location.href);
      
      // Redirecionar para Gov.br
      setIsRedirecting(true);
      window.location.href = data.authorizationUrl;
    },
    onError: (error) => {
      toast.error('Erro ao iniciar assinatura', {
        description: error.message,
      });
    },
  });

  // Verificar se há assinatura válida
  const latestSignature = signatures?.[0];
  const hasValidSignature = latestSignature?.status === 'completed';

  const handleInitiateSignature = () => {
    if (!govbrConfig?.isActive) {
      toast.error('Integração Gov.br não configurada', {
        description: 'Configure as credenciais em Admin > Assinatura Gov.br',
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSignature = () => {
    setShowConfirmDialog(false);
    initiateSignatureMutation.mutate({
      entityType,
      entityId,
      analysisId,
      scopes: ['sign', 'govbr'],
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Card Principal */}
      <Card className="border-green-200 bg-gradient-to-br from-white to-green-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                <Fingerprint className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-normal">Assinatura Digital Gov.br</CardTitle>
                <CardDescription>
                  Assinatura eletrônica avançada com validade jurídica
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`${govbrConfig?.isActive ? 'border-green-500 text-green-700' : 'border-slate-300 text-slate-500'}`}
            >
              {govbrConfig?.isActive ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Não configurado
                </>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status da última assinatura */}
          {latestSignature && (
            <div className={`p-4 rounded-lg border ${
              latestSignature.status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
              latestSignature.status === 'failed' ? 'bg-red-50 border-red-200' :
              latestSignature.status === 'awaiting_authorization' ? 'bg-amber-50 border-amber-200' :
              'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                {(() => {
                  const config = STATUS_CONFIG[latestSignature.status];
                  const Icon = config.icon;
                  return (
                    <>
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <Icon className={`h-4 w-4 text-white ${latestSignature.status === 'processing' ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{config.label}</p>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Detalhes da assinatura */}
              {latestSignature.status === 'completed' && (
                <div className="mt-4 pt-4 border-t border-emerald-200 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-emerald-600" />
                      <span className="text-muted-foreground">Signatário:</span>
                      <span className="font-medium">{latestSignature.signerName || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium">{formatDate(latestSignature.signedAt)}</span>
                    </div>
                  </div>
                  
                  {latestSignature.signerGovbrLevel && (
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <span className="text-muted-foreground">Nível Gov.br:</span>
                      <Badge className={GOVBR_LEVEL_CONFIG[latestSignature.signerGovbrLevel].color}>
                        {GOVBR_LEVEL_CONFIG[latestSignature.signerGovbrLevel].label}
                      </Badge>
                    </div>
                  )}

                  {latestSignature.signedDocumentUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => window.open(latestSignature.signedDocumentUrl, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Documento Assinado
                    </Button>
                  )}
                </div>
              )}

              {/* Erro */}
              {latestSignature.status === 'failed' && latestSignature.errorMessage && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro na assinatura</AlertTitle>
                  <AlertDescription>{latestSignature.errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2">
            {!hasValidSignature && (
              <Button
                onClick={handleInitiateSignature}
                disabled={!govbrConfig?.isActive || initiateSignatureMutation.isPending || isRedirecting}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {initiateSignatureMutation.isPending || isRedirecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Fingerprint className="h-4 w-4 mr-2" />
                )}
                {isRedirecting ? 'Redirecionando...' : 'Assinar com Gov.br'}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => refetchSignatures()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Status
            </Button>
          </div>

          {/* Informações sobre Gov.br */}
          {!govbrConfig?.isActive && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Configuração necessária</AlertTitle>
              <AlertDescription>
                Para utilizar a assinatura digital Gov.br, é necessário configurar as credenciais OAuth.
                Acesse <strong>Admin &gt; Assinatura Gov.br</strong> para configurar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Histórico de assinaturas */}
      {signatures && signatures.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-normal flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              Histórico de Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {signatures.slice(1).map((sig: SignatureStatus) => (
                <div
                  key={sig.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border"
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const config = STATUS_CONFIG[sig.status];
                      const Icon = config.icon;
                      return (
                        <div className={`p-1.5 rounded-full ${config.color}`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                      );
                    })()}
                    <div>
                      <p className="text-sm font-medium">{sig.signerName || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground">
                        {STATUS_CONFIG[sig.status].label}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(sig.signedAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-green-600" />
              Confirmar Assinatura Digital
            </DialogTitle>
            <DialogDescription>
              Você será redirecionado para o portal Gov.br para autorizar a assinatura.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Documento a ser assinado:</p>
              <p className="text-sm text-muted-foreground">{documentTitle}</p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Requisitos</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                  <li>Conta Gov.br nível Prata ou Ouro</li>
                  <li>Autenticação via Gov.br</li>
                  <li>Autorização para assinatura digital</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmSignature}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ir para Gov.br
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
