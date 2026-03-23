// client/src/pages/DireitosTitular.tsx
// Página pública de solicitação de direitos do titular
// Conformidade com Art. 18, § 3º da LGPD - Sem exigência de login

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Send,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  Mail,
  CreditCard,
  Building,
} from "lucide-react";
import { toast } from "sonner";

// Tipos de solicitação LGPD
const requestTypes = [
  {
    value: "acesso",
    label: "Acesso aos Dados",
    description: "Art. 18, II - Confirmação e acesso aos dados tratados",
    icon: FileText,
  },
  {
    value: "retificacao",
    label: "Retificação",
    description: "Art. 18, III - Correção de dados incompletos ou desatualizados",
    icon: FileText,
  },
  {
    value: "exclusao",
    label: "Exclusão",
    description: "Art. 18, VI - Eliminação dos dados pessoais",
    icon: FileText,
  },
  {
    value: "portabilidade",
    label: "Portabilidade",
    description: "Art. 18, V - Portabilidade dos dados a outro fornecedor",
    icon: FileText,
  },
  {
    value: "revogacao_consentimento",
    label: "Revogação de Consentimento",
    description: "Art. 18, IX - Revogação do consentimento",
    icon: FileText,
  },
  {
    value: "oposicao",
    label: "Oposição",
    description: "Art. 18, § 2º - Oposição ao tratamento",
    icon: FileText,
  },
  {
    value: "informacao",
    label: "Informação",
    description: "Art. 18, I - Informações sobre o tratamento",
    icon: FileText,
  },
];

export default function DireitosTitular() {

  const [activeTab, setActiveTab] = useState("solicitar");

  // Estado do formulário de solicitação
  const [formData, setFormData] = useState({
    titularName: "",
    titularEmail: "",
    titularDocument: "",
    organizationId: "",
    requestType: "",
    description: "",
    honeypot: "", // Campo anti-spam invisível
  });

  // Estado do formulário de consulta
  const [consultaData, setConsultaData] = useState({
    protocol: "",
    email: "",
  });

  // Estado de sucesso
  const [successData, setSuccessData] = useState<{
    protocol: string;
    message: string;
  } | null>(null);

  // Buscar organizações disponíveis
  const { data: organizations, isLoading: loadingOrgs } =
    trpc.fase3.getPublicOrganizations.useQuery();

  // Mutation para criar solicitação
  const createRequest = trpc.fase3.createPublicRequest.useMutation({
    onSuccess: (data) => {
      setSuccessData({
        protocol: data.protocol,
        message: data.message,
      });
      setFormData({
        titularName: "",
        titularEmail: "",
        titularDocument: "",
        organizationId: "",
        requestType: "",
        description: "",
        honeypot: "",
      });
      toast.success(`Solicitação registrada! Protocolo: ${data.protocol}`);
    },
    onError: (error) => {
      toast.error("Erro ao registrar solicitação: " + error.message);
    },
  });

  // Query para consultar status
  const {
    data: statusData,
    isLoading: loadingStatus,
    refetch: refetchStatus,
    isError: statusError,
  } = trpc.fase3.getPublicRequestStatus.useQuery(
    {
      protocol: consultaData.protocol,
      email: consultaData.email,
    },
    {
      enabled: false, // Só executa quando chamado manualmente
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.organizationId || !formData.requestType) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    createRequest.mutate({
      organizationId: parseInt(formData.organizationId),
      titularName: formData.titularName,
      titularEmail: formData.titularEmail,
      titularDocument: formData.titularDocument || undefined,
      requestType: formData.requestType as any,
      description: formData.description || undefined,
      honeypot: formData.honeypot || undefined,
    });
  };

  const handleConsulta = (e: React.FormEvent) => {
    e.preventDefault();
    refetchStatus();
  };

  // Renderizar status com ícone
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "recebida":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "em_analise":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "respondida":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "negada":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="heading-4 text-white">
                Portal de Direitos do Titular
              </h1>
              <p className="text-sm text-white/60">
                Lei Geral de Proteção de Dados (LGPD)
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Informativo */}
          <Card className="mb-6 bg-white/5 border-white/10 text-white">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="p-3 rounded-full bg-purple-500/20">
                  <Shield className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="font-semibold mb-1">
                    Seus Direitos como Titular de Dados
                  </h2>
                  <p className="text-sm text-white/70">
                    A Lei Geral de Proteção de Dados (LGPD) garante a você,
                    titular de dados pessoais, diversos direitos sobre suas
                    informações. Utilize este portal para exercer seus direitos
                    de forma gratuita e facilitada, conforme Art. 18, § 3º da
                    LGPD.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger
                value="solicitar"
                className="data-[state=active]:bg-purple-500"
              >
                <Send className="h-4 w-4 mr-2" />
                Nova Solicitação
              </TabsTrigger>
              <TabsTrigger
                value="consultar"
                className="data-[state=active]:bg-purple-500"
              >
                <Search className="h-4 w-4 mr-2" />
                Consultar Status
              </TabsTrigger>
            </TabsList>

            {/* Tab: Nova Solicitação */}
            <TabsContent value="solicitar">
              {successData ? (
                <Card className="bg-white/5 border-white/10 text-white">
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                        <CheckCircle className="h-8 w-8 text-green-400" />
                      </div>
                      <h3 className="heading-4 mb-2">
                        Solicitação Registrada com Sucesso!
                      </h3>
                      <p className="text-white/70 mb-4">{successData.message}</p>
                      <div className="bg-white/10 rounded-lg p-4 inline-block">
                        <p className="text-sm text-white/60 mb-1">
                          Número do Protocolo
                        </p>
                        <p className="text-2xl font-mono font-bold text-purple-400">
                          {successData.protocol}
                        </p>
                      </div>
                      <p className="text-sm text-white/60 mt-4">
                        Guarde este número para acompanhar sua solicitação.
                        <br />
                        Você também receberá uma confirmação por e-mail.
                      </p>
                      <Button
                        className="mt-6"
                        variant="outline"
                        onClick={() => setSuccessData(null)}
                      >
                        Fazer Nova Solicitação
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/5 border-white/10 text-white">
                  <CardHeader>
                    <CardTitle>Registrar Solicitação</CardTitle>
                    <CardDescription className="text-white/60">
                      Preencha o formulário abaixo para exercer seus direitos
                      como titular de dados pessoais.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Campo honeypot invisível (anti-spam) */}
                      <input
                        type="text"
                        name="website"
                        value={formData.honeypot}
                        onChange={(e) =>
                          setFormData({ ...formData, honeypot: e.target.value })
                        }
                        style={{ display: "none" }}
                        tabIndex={-1}
                        autoComplete="off"
                      />

                      {/* Organização */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Empresa/Organização *
                        </Label>
                        <Select
                          value={formData.organizationId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, organizationId: value })
                          }
                        >
                          <SelectTrigger className="bg-white/10 border-white/20">
                            <SelectValue placeholder="Selecione a empresa" />
                          </SelectTrigger>
                          <SelectContent>
                            {loadingOrgs ? (
                              <SelectItem value="loading" disabled>
                                Carregando...
                              </SelectItem>
                            ) : organizations && organizations.length > 0 ? (
                              organizations.map((org) => (
                                <SelectItem
                                  key={org.id}
                                  value={org.id.toString()}
                                >
                                  {org.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="empty" disabled>
                                Nenhuma empresa disponível
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Nome */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Nome Completo *
                        </Label>
                        <Input
                          value={formData.titularName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              titularName: e.target.value,
                            })
                          }
                          placeholder="Seu nome completo"
                          className="bg-white/10 border-white/20"
                          required
                        />
                      </div>

                      {/* E-mail */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          E-mail *
                        </Label>
                        <Input
                          type="email"
                          value={formData.titularEmail}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              titularEmail: e.target.value,
                            })
                          }
                          placeholder="seu@email.com"
                          className="bg-white/10 border-white/20"
                          required
                        />
                      </div>

                      {/* CPF (opcional) */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          CPF (opcional)
                        </Label>
                        <Input
                          value={formData.titularDocument}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              titularDocument: e.target.value,
                            })
                          }
                          placeholder="000.000.000-00"
                          className="bg-white/10 border-white/20"
                        />
                        <p className="text-xs text-white/50">
                          O CPF ajuda a identificar seus dados, mas não é
                          obrigatório.
                        </p>
                      </div>

                      {/* Tipo de Solicitação */}
                      <div className="space-y-2">
                        <Label>Tipo de Solicitação *</Label>
                        <div className="grid gap-2">
                          {requestTypes.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  requestType: type.value,
                                })
                              }
                              className={`p-3 rounded-lg border text-left transition-all ${
                                formData.requestType === type.value
                                  ? "border-purple-500 bg-purple-500/20"
                                  : "border-white/20 bg-white/5 hover:bg-white/10"
                              }`}
                            >
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-white/60">
                                {type.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Descrição */}
                      <div className="space-y-2">
                        <Label>Detalhes da Solicitação</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Descreva sua solicitação com mais detalhes (opcional)"
                          className="bg-white/10 border-white/20 min-h-[100px]"
                        />
                      </div>

                      {/* Botão de Envio */}
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                        disabled={createRequest.isPending}
                      >
                        {createRequest.isPending ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Solicitação
                          </>
                        )}
                      </Button>

                      {/* Aviso Legal */}
                      <p className="text-xs text-white/50 text-center">
                        Ao enviar esta solicitação, você declara que as
                        informações fornecidas são verdadeiras. O prazo legal
                        para resposta é de 15 dias, conforme Art. 18, § 3º da
                        LGPD.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab: Consultar Status */}
            <TabsContent value="consultar">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle>Consultar Status da Solicitação</CardTitle>
                  <CardDescription className="text-white/60">
                    Informe o número do protocolo e o e-mail cadastrado para
                    verificar o status da sua solicitação.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleConsulta} className="space-y-4">
                    {/* Protocolo */}
                    <div className="space-y-2">
                      <Label>Número do Protocolo</Label>
                      <Input
                        value={consultaData.protocol}
                        onChange={(e) =>
                          setConsultaData({
                            ...consultaData,
                            protocol: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="LGPD-XXXXXX-XXXX"
                        className="bg-white/10 border-white/20 font-mono"
                        required
                      />
                    </div>

                    {/* E-mail */}
                    <div className="space-y-2">
                      <Label>E-mail cadastrado</Label>
                      <Input
                        type="email"
                        value={consultaData.email}
                        onChange={(e) =>
                          setConsultaData({
                            ...consultaData,
                            email: e.target.value,
                          })
                        }
                        placeholder="seu@email.com"
                        className="bg-white/10 border-white/20"
                        required
                      />
                    </div>

                    {/* Botão de Consulta */}
                    <Button
                      type="submit"
                      className="w-full"
                      variant="outline"
                      disabled={loadingStatus}
                    >
                      {loadingStatus ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Consultando...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Consultar Status
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Resultado da Consulta */}
                  {statusData && (
                    <div className="mt-6 p-4 rounded-lg bg-white/10 border border-white/20">
                      <div className="flex items-center gap-3 mb-4">
                        {getStatusIcon(statusData.status)}
                        <div>
                          <p className="font-semibold">
                            {statusData.statusLabel}
                          </p>
                          <p className="text-sm text-white/60">
                            Protocolo: {statusData.protocol}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-white/70 mb-3">
                        {statusData.statusDescription}
                      </p>
                      <div className="text-xs text-white/50">
                        <p>
                          Tipo:{" "}
                          {
                            requestTypes.find(
                              (t) => t.value === statusData.requestType
                            )?.label
                          }
                        </p>
                        <p>
                          Registrada em:{" "}
                          {statusData.createdAt
                            ? new Date(statusData.createdAt).toLocaleDateString(
                                "pt-BR"
                              )
                            : "-"}
                        </p>
                        {statusData.respondedAt && (
                          <p>
                            Respondida em:{" "}
                            {new Date(
                              statusData.respondedAt
                            ).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {statusError && (
                    <div className="mt-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <p className="text-red-300">
                          Solicitação não encontrada. Verifique o protocolo e
                          e-mail informados.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-white/40">
            <p>
              Este portal é operado em conformidade com a Lei Geral de Proteção
              de Dados (Lei nº 13.709/2018).
            </p>
            <p className="mt-1">
              Em caso de dúvidas, entre em contato com o Encarregado de Proteção
              de Dados (DPO).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
