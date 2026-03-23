/**
 * Página de Configuração da Integração Gov.br
 * 
 * Permite configurar as credenciais OAuth para integração
 * com a API de Assinatura Eletrônica do Gov.br.
 */

import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
// DashboardLayout removido - já é aplicado no App.tsx
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Shield,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Key,
  Globe,
  FileSignature,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function GovbrSignatureConfig() {
  const { user } = useAuth();
  const [environment, setEnvironment] = useState<'staging' | 'production'>('staging');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');

  // URLs estáticas do Gov.br
  const GOVBR_URLS = {
    staging: {
      authorizationUrl: 'https://cas.staging.iti.br/oauth2.0/authorize',
      tokenUrl: 'https://cas.staging.iti.br/oauth2.0/token',
      signUrl: 'https://assinatura-api.staging.iti.br/externo/v2/assinarPKCS7',
      validatorUrl: 'https://h-validar.iti.gov.br/index.html',
    },
    production: {
      authorizationUrl: 'https://cas.iti.br/oauth2.0/authorize',
      tokenUrl: 'https://cas.iti.br/oauth2.0/token',
      signUrl: 'https://assinatura-api.iti.br/externo/v2/assinarPKCS7',
      validatorUrl: 'https://validar.iti.gov.br',
    },
  };

  // Queries
  const configQuery = trpc.govbrSignature.getConfig.useQuery();
  
  // Determinar ambiente atual
  const currentEnvironment = configQuery.data?.environment || environment;
  const currentUrls = GOVBR_URLS[currentEnvironment as 'staging' | 'production'];

  // Mutations
  const saveConfigMutation = trpc.govbrSignature.saveConfig.useMutation({
    onSuccess: () => {
      toast.success('Configuração salva com sucesso!');
      configQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const testConfigMutation = trpc.govbrSignature.testConfig.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      configQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Erro no teste: ${error.message}`);
    },
  });

  // Verificar se usuário é admin
  if (user?.role !== 'admin_global') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Apenas administradores podem configurar a integração Gov.br.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleSaveConfig = () => {
    if (!clientId || !clientSecret || !redirectUri) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    saveConfigMutation.mutate({
      environment,
      clientId,
      clientSecret,
      redirectUri,
    });
  };

  const handleTestConfig = () => {
    testConfigMutation.mutate();
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-green-600" />
              Integração Gov.br - Assinatura Eletrônica
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure a integração com a API de Assinatura Eletrônica Avançada do Governo Federal
            </p>
          </div>
          <Badge
            variant={configQuery.data?.isActive ? 'default' : 'secondary'}
            className={configQuery.data?.isActive ? 'bg-green-600' : ''}
          >
            {configQuery.data?.isActive ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ativo
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Inativo
              </>
            )}
          </Badge>
        </div>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="docs">
              <Info className="h-4 w-4 mr-2" />
              Documentação
            </TabsTrigger>
            <TabsTrigger value="status">
              <FileSignature className="h-4 w-4 mr-2" />
              Status
            </TabsTrigger>
          </TabsList>

          {/* Tab de Configuração */}
          <TabsContent value="config" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Card de Credenciais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Credenciais OAuth 2.0
                  </CardTitle>
                  <CardDescription>
                    Insira as credenciais obtidas no Portal de Integração Gov.br
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="environment">Ambiente</Label>
                    <Select
                      value={environment}
                      onValueChange={(v) => setEnvironment(v as 'staging' | 'production')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ambiente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staging">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Staging
                            </Badge>
                            <span>Homologação</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="production">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Production
                            </Badge>
                            <span>Produção</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Use Staging para testes e Production para ambiente real
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID *</Label>
                    <Input
                      id="clientId"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Seu Client ID do Gov.br"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientSecret">Client Secret *</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="Seu Client Secret do Gov.br"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="redirectUri">Redirect URI *</Label>
                    <Input
                      id="redirectUri"
                      value={redirectUri}
                      onChange={(e) => setRedirectUri(e.target.value)}
                      placeholder="https://seu-dominio.gov.br/api/govbr/callback"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL de callback registrada no Portal Gov.br
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSaveConfig}
                      disabled={saveConfigMutation.isPending}
                      className="flex-1"
                    >
                      {saveConfigMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Salvar Configuração
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleTestConfig}
                      disabled={testConfigMutation.isPending || !configQuery.data?.configured}
                    >
                      {testConfigMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Testar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card de URLs do Ambiente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    URLs do Ambiente
                  </CardTitle>
                  <CardDescription>
                    Endpoints da API Gov.br para o ambiente selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <span className="text-sm font-medium">Ambiente Atual:</span>
                    <Badge variant={currentEnvironment === 'production' ? 'default' : 'secondary'}>
                      {currentEnvironment === 'production' ? 'Produção' : 'Homologação'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Autorização:</span>
                      <a
                        href={currentUrls.authorizationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                      >
                        {new URL(currentUrls.authorizationUrl).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Token:</span>
                      <a
                        href={currentUrls.tokenUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                      >
                        {new URL(currentUrls.tokenUrl).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Assinatura:</span>
                      <a
                        href={currentUrls.signUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                      >
                        {new URL(currentUrls.signUrl).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Validador:</span>
                      <a
                        href={currentUrls.validatorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                      >
                        {new URL(currentUrls.validatorUrl).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerta de Requisitos */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Requisitos para Integração</AlertTitle>
              <AlertDescription className="mt-2">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Credenciais OAuth 2.0 obtidas via Portal de Integração Gov.br</li>
                  <li>Sistema hospedado em domínio oficial (gov.br, edu.br, etc.) para produção</li>
                  <li>Usuários devem ter conta Gov.br nível Prata ou Ouro para assinar</li>
                  <li>Certificado SSL válido no domínio de callback</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Tab de Documentação */}
          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentação Oficial</CardTitle>
                <CardDescription>
                  Links para a documentação oficial da API de Assinatura Eletrônica Gov.br
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <a
                    href="https://manual-integracao-assinatura-eletronica.servicos.gov.br/pt-br/latest/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <FileSignature className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium">Manual de Integração</h3>
                      <p className="body-small">
                        Documentação técnica completa da API
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>

                  <a
                    href="https://www.gov.br/governodigital/pt-br/identidade/assinatura-eletronica"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <Shield className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-medium">Portal Gov.br</h3>
                      <p className="body-small">
                        Informações sobre assinatura eletrônica
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </div>

                {/* Guia de Obtenção de Credenciais */}
                <div className="mt-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Key className="h-5 w-5 text-amber-600" />
                    Como Obter Credenciais Gov.br
                  </h3>
                  <Alert className="mb-4 border-amber-200 bg-amber-50">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Importante</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      As credenciais só podem ser obtidas por <strong>Gestores Públicos</strong> ou <strong>representantes de órgãos públicos</strong> através do Portal de Integração Gov.br.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Badge className="mt-0.5 bg-blue-600">1</Badge>
                      <div>
                        <h4 className="font-medium text-blue-900">Acesse o Portal de Integração</h4>
                        <p className="text-sm text-blue-700">
                          Acesse <a href="https://www.gov.br/governodigital/pt-br/identidade/assinatura-eletronica/assinatura-eletronica-para-orgaos" target="_blank" rel="noopener noreferrer" className="underline font-medium">gov.br/governodigital</a> e clique em "Solicitar Integração"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Badge className="mt-0.5 bg-blue-600">2</Badge>
                      <div>
                        <h4 className="font-medium text-blue-900">Preencha o Formulário de Solicitação</h4>
                        <p className="text-sm text-blue-700">
                          Informe os dados do órgão, sistema e responsável técnico. Será necessário CNPJ do órgão e CPF do gestor.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Badge className="mt-0.5 bg-blue-600">3</Badge>
                      <div>
                        <h4 className="font-medium text-blue-900">Aguarde Aprovação</h4>
                        <p className="text-sm text-blue-700">
                          A equipe do Gov.br analisará a solicitação. O prazo médio é de 5 a 10 dias úteis.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Badge className="mt-0.5 bg-blue-600">4</Badge>
                      <div>
                        <h4 className="font-medium text-blue-900">Receba as Credenciais</h4>
                        <p className="text-sm text-blue-700">
                          Após aprovação, você receberá o <strong>Client ID</strong> e <strong>Client Secret</strong> por e-mail seguro.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Badge className="mt-0.5 bg-green-600">5</Badge>
                      <div>
                        <h4 className="font-medium text-green-900">Configure nesta Página</h4>
                        <p className="text-sm text-green-700">
                          Insira as credenciais na aba "Configuração" e teste a conexão antes de usar em produção.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requisitos Técnicos */}
                <div className="mt-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                    Requisitos Técnicos
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm">Domínio Oficial</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Para produção, o sistema deve estar em domínio .gov.br, .edu.br, .jus.br ou similar
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm">Certificado SSL</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        HTTPS obrigatório com certificado válido no domínio de callback
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm">Conta Gov.br</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Usuários precisam de conta nível Prata ou Ouro para assinar documentos
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm">Redirect URI</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        A URL de callback deve ser registrada no Portal Gov.br
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-medium mb-3">Fluxo de Assinatura</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <Badge className="mt-0.5">1</Badge>
                      <div>
                        <h4 className="font-medium">Solicitação de Assinatura</h4>
                        <p className="body-small">
                          O sistema gera uma URL de autorização e redireciona o usuário para o Gov.br
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <Badge className="mt-0.5">2</Badge>
                      <div>
                        <h4 className="font-medium">Autorização do Usuário</h4>
                        <p className="body-small">
                          O usuário autoriza a assinatura no Gov.br e confirma via SMS ou app
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <Badge className="mt-0.5">3</Badge>
                      <div>
                        <h4 className="font-medium">Obtenção do Token</h4>
                        <p className="body-small">
                          O sistema troca o código de autorização por um token de acesso
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <Badge className="mt-0.5">4</Badge>
                      <div>
                        <h4 className="font-medium">Assinatura Digital</h4>
                        <p className="body-small">
                          O hash do documento é enviado à API e a assinatura PKCS#7 é retornada
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Status */}
          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Status da Integração</CardTitle>
                <CardDescription>
                  Informações sobre a configuração atual e último teste
                </CardDescription>
              </CardHeader>
              <CardContent>
                {configQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : configQuery.data?.configured ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 border rounded-lg">
                        <h4 className="text-sm font-medium text-muted-foreground">Ambiente</h4>
                        <p className="text-lg font-semibold mt-1">
                          {configQuery.data.environment === 'production' ? 'Produção' : 'Homologação'}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {configQuery.data.isActive ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                              <span className="text-lg font-semibold text-green-600">Ativo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-red-600" />
                              <span className="text-lg font-semibold text-red-600">Inativo</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="text-sm font-medium text-muted-foreground">Client ID</h4>
                        <p className="text-lg font-mono mt-1 truncate">
                          {configQuery.data.clientId || '-'}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="text-sm font-medium text-muted-foreground">Último Teste</h4>
                        <p className="text-lg mt-1">
                          {configQuery.data.lastTestedAt
                            ? new Date(configQuery.data.lastTestedAt).toLocaleString('pt-BR')
                            : 'Nunca testado'}
                        </p>
                      </div>
                    </div>

                    {configQuery.data.testResult && (
                      <Alert variant={configQuery.data.testResult === 'success' ? 'default' : 'destructive'}>
                        {configQuery.data.testResult === 'success' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <AlertTitle>
                          Resultado do Último Teste: {configQuery.data.testResult === 'success' ? 'Sucesso' : 'Falha'}
                        </AlertTitle>
                        {configQuery.data.testErrorMessage && (
                          <AlertDescription>
                            {configQuery.data.testErrorMessage}
                          </AlertDescription>
                        )}
                      </Alert>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Não Configurado</AlertTitle>
                    <AlertDescription>
                      A integração Gov.br ainda não foi configurada. Acesse a aba "Configuração" para inserir as credenciais.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
