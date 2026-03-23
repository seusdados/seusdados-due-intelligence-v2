/**
 * Página de Callback OAuth do Gov.br
 * 
 * Esta página recebe o retorno da autenticação Gov.br após o usuário
 * autorizar a assinatura digital. Processa o código de autorização
 * e completa o fluxo de assinatura.
 */

import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, FileSignature, ArrowLeft } from 'lucide-react';

type CallbackStatus = 'processing' | 'success' | 'error';

interface CallbackState {
  status: CallbackStatus;
  message: string;
  details?: string;
  signatureId?: string;
}

export default function GovbrCallback() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<CallbackState>({
    status: 'processing',
    message: 'Processando autorização...'
  });

  // Mutation para processar o callback
  const processCallbackMutation = trpc.govbrSignature.processCallback.useMutation({
    onSuccess: (data) => {
      setState({
        status: 'success',
        message: 'Assinatura digital realizada com sucesso!',
        details: `Documento assinado em ${new Date().toLocaleString('pt-BR')}`,
        signatureId: data.signatureId
      });
    },
    onError: (error) => {
      setState({
        status: 'error',
        message: 'Erro ao processar assinatura',
        details: error.message
      });
    }
  });

  useEffect(() => {
    // Extrair parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    // Se houve erro na autorização
    if (error) {
      setState({
        status: 'error',
        message: 'Autorização negada',
        details: errorDescription || 'O usuário cancelou a autorização ou ocorreu um erro no Gov.br'
      });
      return;
    }

    // Se não há código de autorização
    if (!code || !state) {
      setState({
        status: 'error',
        message: 'Parâmetros inválidos',
        details: 'Código de autorização ou state não encontrados na URL'
      });
      return;
    }

    // Processar o callback
    processCallbackMutation.mutate({ code, state });
  }, []);

  const handleGoBack = () => {
    // Tentar voltar para a página anterior ou ir para o dashboard
    const returnUrl = sessionStorage.getItem('govbr_return_url');
    if (returnUrl) {
      sessionStorage.removeItem('govbr_return_url');
      setLocation(returnUrl);
    } else {
      setLocation('/');
    }
  };

  const handleViewSignature = () => {
    if (state.signatureId) {
      setLocation(`/assinaturas/${state.signatureId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
            <FileSignature className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">
            Assinatura Digital Gov.br
          </CardTitle>
          <CardDescription className="text-gray-300">
            Processamento da autorização de assinatura
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status: Processando */}
          {state.status === 'processing' && (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-blue-400 animate-spin" />
              <p className="text-white text-lg">{state.message}</p>
              <p className="text-gray-400 text-sm">
                Aguarde enquanto processamos sua autorização...
              </p>
            </div>
          )}

          {/* Status: Sucesso */}
          {state.status === 'success' && (
            <div className="space-y-4">
              <Alert className="bg-green-500/20 border-green-500/50">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <AlertTitle className="text-green-400">Sucesso!</AlertTitle>
                <AlertDescription className="text-green-300">
                  {state.message}
                </AlertDescription>
              </Alert>

              {state.details && (
                <p className="text-gray-300 text-center text-sm">
                  {state.details}
                </p>
              )}

              <div className="flex flex-col gap-3 pt-4">
                {state.signatureId && (
                  <Button 
                    onClick={handleViewSignature}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                  >
                    <FileSignature className="w-4 h-4 mr-2" />
                    Ver Detalhes da Assinatura
                  </Button>
                )}
                <Button 
                  onClick={handleGoBack}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* Status: Erro */}
          {state.status === 'error' && (
            <div className="space-y-4">
              <Alert className="bg-red-500/20 border-red-500/50">
                <XCircle className="h-5 w-5 text-red-400" />
                <AlertTitle className="text-red-400">Erro</AlertTitle>
                <AlertDescription className="text-red-300">
                  {state.message}
                </AlertDescription>
              </Alert>

              {state.details && (
                <p className="text-gray-400 text-center text-sm">
                  {state.details}
                </p>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                  Tentar Novamente
                </Button>
                <Button 
                  onClick={handleGoBack}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* Informações sobre Gov.br */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-gray-400 text-xs text-center">
              A assinatura digital Gov.br possui validade jurídica conforme 
              Lei nº 14.063/2020 e Decreto nº 10.543/2020.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
