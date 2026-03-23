import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  ClipboardList, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Shield,
  Database,
  Users,
  Globe,
  Lock,
  FileText,
  Lightbulb,
  HelpCircle,
  Info
} from "lucide-react";

// Categorias de dados pessoais
const dataCategories = [
  { name: "Nome completo", sensivel: false },
  { name: "CPF", sensivel: false },
  { name: "RG", sensivel: false },
  { name: "E-mail", sensivel: false },
  { name: "Telefone", sensivel: false },
  { name: "Endereço", sensivel: false },
  { name: "Data de nascimento", sensivel: false },
  { name: "Dados bancários", sensivel: false },
  { name: "Dados de saúde", sensivel: true },
  { name: "Dados biométricos", sensivel: true },
  { name: "Origem racial/étnica", sensivel: true },
  { name: "Opinião política", sensivel: true },
  { name: "Convicção religiosa", sensivel: true },
  { name: "Dados genéticos", sensivel: true },
  { name: "Orientação sexual", sensivel: true },
  { name: "Filiação sindical", sensivel: true },
];

// Categorias de titulares
const titularCategories = [
  "Colaboradores",
  "Clientes",
  "Fornecedores",
  "Parceiros",
  "Candidatos a emprego",
  "Menores de idade",
  "Idosos",
  "Pacientes",
  "Alunos",
  "Visitantes",
];

// Bases legais com justificativas inline
const legalBases = [
  { 
    value: "consentimento", 
    label: "Consentimento do titular", 
    description: "O titular concordou expressamente com o tratamento",
    artigo: "Art. 7º, I",
    justificativa: "Deve ser livre, informado, inequívoco e para finalidade determinada. Pode ser revogado a qualquer momento.",
    cuidados: ["Obter prova do consentimento", "Permitir revogação fácil", "Renovar se mudar finalidade"]
  },
  { 
    value: "contrato", 
    label: "Execução de contrato", 
    description: "Necessário para cumprir um contrato com o titular",
    artigo: "Art. 7º, V",
    justificativa: "Aplicável quando o tratamento é necessário para execução de contrato ou procedimentos preliminares.",
    cuidados: ["Manter cópia do contrato", "Limitar ao necessário para execução"]
  },
  { 
    value: "obrigacao_legal", 
    label: "Obrigação legal", 
    description: "Exigido por lei ou regulamento",
    artigo: "Art. 7º, II",
    justificativa: "Quando existe obrigação legal ou regulatória que exige o tratamento dos dados.",
    cuidados: ["Documentar a lei/regulamento", "Manter apenas pelo prazo legal"]
  },
  { 
    value: "interesse_legitimo", 
    label: "Interesse legítimo", 
    description: "Necessário para interesses legítimos do controlador",
    artigo: "Art. 7º, IX",
    justificativa: "Requer teste de proporcionalidade (LIA). Não pode prevalecer sobre direitos do titular.",
    cuidados: ["Realizar LIA documentado", "Garantir transparência", "Permitir opt-out"]
  },
  { 
    value: "exercicio_direitos", 
    label: "Exercício de direitos", 
    description: "Necessário para exercício de direitos em processo",
    artigo: "Art. 7º, VI",
    justificativa: "Para exercício regular de direitos em processo judicial, administrativo ou arbitral.",
    cuidados: ["Limitar ao necessário para o processo", "Manter sigilo processual"]
  },
  { 
    value: "protecao_vida", 
    label: "Proteção da vida", 
    description: "Necessário para proteger a vida do titular",
    artigo: "Art. 7º, VII",
    justificativa: "Para proteção da vida ou incolumidade física do titular ou terceiro.",
    cuidados: ["Usar apenas em emergências", "Documentar a situação"]
  },
  { 
    value: "tutela_saude", 
    label: "Tutela da saúde", 
    description: "Procedimento realizado por profissional de saúde",
    artigo: "Art. 7º, VIII",
    justificativa: "Exclusivamente em procedimentos por profissionais de saúde, serviços de saúde ou autoridade sanitária.",
    cuidados: ["Restringir a profissionais de saúde", "Aplicar sigilo médico"]
  },
  { 
    value: "credito", 
    label: "Proteção ao crédito", 
    description: "Necessário para proteção do crédito",
    artigo: "Art. 7º, X",
    justificativa: "Para proteção do crédito, inclusive quanto ao disposto na legislação pertinente.",
    cuidados: ["Seguir Lei do Cadastro Positivo", "Respeitar prazos de retenção"]
  },
];

// Medidas de segurança
const securityMeasures = [
  "Controle de acesso por senha",
  "Autenticação multifator",
  "Criptografia de dados",
  "Backup regular",
  "Firewall",
  "Antivírus",
  "Política de senhas",
  "Treinamento de colaboradores",
  "Registro de acessos (logs)",
  "Segregação de ambientes",
];

export default function EntrevistaDigital() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token") || "";

  // Estados
  const [currentProcessIndex, setCurrentProcessIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  // Query
  const { data: interview, isLoading, error, refetch } = trpc.mapeamento.getInterview.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // Mutations
  const saveResponseMutation = trpc.mapeamento.saveResponse.useMutation({
    onSuccess: () => refetch(),
  });

  const finalizeMutation = trpc.mapeamento.finalizeInterview.useMutation({
    onSuccess: () => setIsCompleted(true),
  });
  const purposesQ = trpc.mapeamento.getPurposeCatalog.useQuery();
  const suggestDataUsesM = trpc.mapeamento.suggestDataUses.useMutation();
  const purposeCatalog = (purposesQ.data as any)?.purposes || [];

  // Inicializar respostas existentes
  useEffect(() => {
    if (interview?.responses) {
      const existing: Record<number, any> = {};
      interview.responses.forEach((r: any) => {
        existing[r.processId] = {
          dataCategories: r.dataCategories ? JSON.parse(r.dataCategories) : [],
          titularCategories: r.titularCategories ? JSON.parse(r.titularCategories) : [],
          legalBase: r.legalBase || "",
          sharing: r.sharing ? JSON.parse(r.sharing) : [],
          consentObtained: !!r.consentObtained,
          retentionPeriod: r.retentionPeriod || "",
          storageLocation: r.storageLocation || "",
          securityMeasures: r.securityMeasures ? JSON.parse(r.securityMeasures) : [],
          internationalTransfer: !!r.internationalTransfer,
          internationalCountries: r.internationalCountries ? JSON.parse(r.internationalCountries) : [],
          notes: r.notes || "",
        };
      });
      setResponses(existing);
    }
  }, [interview]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="heading-4 mb-2">Link Inválido</h2>
            <p className="text-muted-foreground">
              O link de acesso à entrevista é inválido ou está incompleto.
              Por favor, verifique o link recebido por e-mail.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Carregando entrevista...</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="heading-4 mb-2">Convite Expirado</h2>
            <p className="text-muted-foreground">
              Este link de entrevista expirou ou já foi utilizado.
              Entre em contato com o responsável pelo mapeamento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="heading-3 mb-2">Entrevista Concluída!</h2>
            <p className="text-muted-foreground mb-4">
              Obrigado por participar do mapeamento de processos e dados.
              Suas respostas foram registradas com sucesso.
            </p>
            <Alert className="text-left">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Caso identificados riscos em algum processo, planos de ação serão
                gerados automaticamente para mitigação.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentProcess = interview.processes[currentProcessIndex];
  const currentResponse = responses[currentProcess?.id] || {
    dataCategories: [],
    titularCategories: [],
    legalBase: "",
    sharing: [],
    consentObtained: false,
    retentionPeriod: "",
    storageLocation: "",
    securityMeasures: [],
    internationalTransfer: false,
    internationalCountries: [],
    notes: "",
  };

  const updateResponse = (field: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [currentProcess.id]: {
        ...currentResponse,
        [field]: value,
      },
    }));
  };

  const toggleDataCategory = (category: { name: string; sensivel: boolean }) => {
    const existing = currentResponse.dataCategories || [];
    const found = existing.find((c: any) => c.name === category.name);
    if (found) {
      updateResponse("dataCategories", existing.filter((c: any) => c.name !== category.name));
    } else {
      updateResponse("dataCategories", [...existing, category]);
    }
  };

  const toggleTitularCategory = (category: string) => {
    const existing = currentResponse.titularCategories || [];
    if (existing.includes(category)) {
      updateResponse("titularCategories", existing.filter((c: string) => c !== category));
    } else {
      updateResponse("titularCategories", [...existing, category]);
    }
  };

  const toggleSecurityMeasure = (measure: string) => {
    const existing = currentResponse.securityMeasures || [];
    if (existing.includes(measure)) {
      updateResponse("securityMeasures", existing.filter((m: string) => m !== measure));
    } else {
      updateResponse("securityMeasures", [...existing, measure]);
    }
  };

  const handleSaveAndNext = async () => {
    await saveResponseMutation.mutateAsync({
      token,
      processId: currentProcess.id,
      data: currentResponse,
    });

    if (currentProcessIndex < interview.processes.length - 1) {
      setCurrentProcessIndex(currentProcessIndex + 1);
    }
  };

  const handleFinalize = async () => {
    // Salvar última resposta
    await saveResponseMutation.mutateAsync({
      token,
      processId: currentProcess.id,
      data: currentResponse,
    });

    // Finalizar entrevista
    await finalizeMutation.mutateAsync({ token });
  };

  const progress = ((currentProcessIndex + 1) / interview.processes.length) * 100;
  const hasSensitiveData = currentResponse.dataCategories?.some((c: any) => c.sensivel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="body-small">Mapeamento de Processos</p>
              <h1 className="text-lg font-semibold">{interview.respondent.areaName}</h1>
            </div>
            <div className="text-right">
              <p className="body-small">Respondente</p>
              <p className="font-medium">{interview.respondent.name}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Processo {currentProcessIndex + 1} de {interview.processes.length}</span>
              <span>{Math.round(progress)}% concluído</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Processo Atual */}
        <Card>
          <CardHeader className="bg-primary/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{currentProcess?.title}</CardTitle>
                <CardDescription className="mt-1">
                  {currentProcess?.purpose || "Descreva como os dados pessoais são tratados neste processo."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Seção 1: Dados Coletados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Quais dados pessoais são coletados?
            </CardTitle>
            <CardDescription>
              Selecione todos os tipos de dados pessoais tratados neste processo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Chips visuais com cores por sensibilidade */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {dataCategories.map((cat) => {
                const isSelected = currentResponse.dataCategories?.some((c: any) => c.name === cat.name);
                // Cores diferenciadas: vermelho para sensíveis, azul para identificadores, verde para contato
                const chipColor = cat.sensivel 
                  ? isSelected ? "bg-red-100 border-red-400 ring-2 ring-red-200" : "border-red-200 hover:bg-red-50"
                  : ["CPF", "RG", "Nome completo"].includes(cat.name)
                    ? isSelected ? "bg-blue-100 border-blue-400 ring-2 ring-blue-200" : "border-blue-200 hover:bg-blue-50"
                    : ["E-mail", "Telefone", "Endereço"].includes(cat.name)
                      ? isSelected ? "bg-green-100 border-green-400 ring-2 ring-green-200" : "border-green-200 hover:bg-green-50"
                      : isSelected ? "bg-primary/10 border-primary ring-2 ring-primary/20" : "hover:bg-muted";
                return (
                  <div
                    key={cat.name}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${chipColor}`}
                    onClick={() => toggleDataCategory(cat)}
                  >
                    <Checkbox checked={isSelected} />
                    <span className="text-sm font-medium">{cat.name}</span>
                    {cat.sensivel && (
                      <Badge variant="destructive" className="text-xs ml-auto animate-pulse">Sensível</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legenda de cores */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-200 border border-red-400"></div>
                <span>Dados Sensíveis (Art. 11)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-200 border border-blue-400"></div>
                <span>Identificadores</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-200 border border-green-400"></div>
                <span>Dados de Contato</span>
              </div>
            </div>

            {/* Sugestão proativa da IA para dados sensíveis */}
            {hasSensitiveData && (
              <Alert variant="destructive" className="mt-4">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>Sugestão da IA:</strong> Você selecionou dados sensíveis (Art. 11 LGPD). 
                  Isso requer consentimento específico e destacado do titular, ou enquadramento em uma das 
                  hipóteses do Art. 11, II. Recomendamos revisar a base legal e implementar medidas 
                  adicionais de segurança como criptografia e controle de acesso restrito.
                </AlertDescription>
              </Alert>
            )}

            {/* Sugestão para dados de menores */}
            {currentResponse.titularCategories?.includes("Menores de idade") && (
              <Alert className="mt-4 border-yellow-300 bg-yellow-50">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Sugestão da IA:</strong> Tratamento de dados de menores requer consentimento 
                  específico de pelo menos um dos pais ou responsável legal (Art. 14, § 1º LGPD). 
                  Certifique-se de que há mecanismo para verificar essa autorização.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Seção 2: Titulares */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              De quem são os dados?
            </CardTitle>
            <CardDescription>
              Selecione as categorias de titulares cujos dados são tratados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {titularCategories.map((cat) => {
                const isSelected = currentResponse.titularCategories?.includes(cat);
                return (
                  <div
                    key={cat}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted"
                    }`}
                    onClick={() => toggleTitularCategory(cat)}
                  >
                    <Checkbox checked={isSelected} />
                    <span className="text-sm">{cat}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Seção 3: Base Legal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Qual a base legal para o tratamento?
            </CardTitle>
            <CardDescription>
              Selecione a justificativa legal que autoriza o tratamento dos dados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={currentResponse.legalBase}
              onValueChange={(v) => updateResponse("legalBase", v)}
              className="space-y-3"
            >
              {legalBases.map((base) => {
                const isSelected = currentResponse.legalBase === base.value;
                return (
                  <div
                    key={base.value}
                    className={`rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                        : "hover:bg-muted hover:border-primary/50"
                    }`}
                    onClick={() => updateResponse("legalBase", base.value)}
                  >
                    <div className="flex items-start gap-3 p-4">
                      <RadioGroupItem value={base.value} id={base.value} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={base.value} className="font-medium cursor-pointer">
                            {base.label}
                          </Label>
                          <Badge variant="outline" className="text-xs">{base.artigo}</Badge>
                        </div>
                        <p className="body-small mt-1">{base.description}</p>
                      </div>
                    </div>
                    
                    {/* Justificativa expandida quando selecionado */}
                    {isSelected && (
                      <div className="px-4 pb-4 pt-0 border-t border-primary/20 mt-2">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-3">
                          <div className="flex items-start gap-2">
                            <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Por que isso importa?</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{base.justificativa}</p>
                            </div>
                          </div>
                        </div>
                        
                        {base.cuidados && base.cuidados.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Cuidados necessários:</p>
                            <div className="flex flex-wrap gap-2">
                              {base.cuidados.map((cuidado: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {cuidado}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </RadioGroup>

            {currentResponse.legalBase === "consentimento" && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="consentObtained"
                    checked={currentResponse.consentObtained}
                    onCheckedChange={(v) => updateResponse("consentObtained", !!v)}
                  />
                  <Label htmlFor="consentObtained">
                    O consentimento é obtido de forma clara e específica?
                  </Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção 4: Armazenamento e Retenção */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" />
              Armazenamento e Retenção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Onde os dados são armazenados?</Label>
                <Input
                  value={currentResponse.storageLocation}
                  onChange={(e) => updateResponse("storageLocation", e.target.value)}
                  placeholder="Ex: Sistema interno, nuvem, servidor local..."
                />
              </div>
              <div className="space-y-2">
                <Label>Por quanto tempo os dados são mantidos?</Label>
                <Select
                  value={currentResponse.retentionPeriod}
                  onValueChange={(v) => updateResponse("retentionPeriod", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ate_6_meses">Até 6 meses</SelectItem>
                    <SelectItem value="1_ano">1 ano</SelectItem>
                    <SelectItem value="2_anos">2 anos</SelectItem>
                    <SelectItem value="5_anos">5 anos</SelectItem>
                    <SelectItem value="10_anos">10 anos</SelectItem>
                    <SelectItem value="indefinido">Indefinidamente</SelectItem>
                    <SelectItem value="conforme_lei">Conforme exigência legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 5: Medidas de Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Medidas de Segurança
            </CardTitle>
            <CardDescription>
              Quais medidas de segurança são aplicadas para proteger os dados?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {securityMeasures.map((measure) => {
                const isSelected = currentResponse.securityMeasures?.includes(measure);
                return (
                  <div
                    key={measure}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? "bg-green-50 border-green-300" : "hover:bg-muted"
                    }`}
                    onClick={() => toggleSecurityMeasure(measure)}
                  >
                    <Checkbox checked={isSelected} />
                    <span className="text-sm">{measure}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Seção 6: Transferência Internacional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5" />
              Transferência Internacional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="internationalTransfer"
                checked={currentResponse.internationalTransfer}
                onCheckedChange={(v) => updateResponse("internationalTransfer", !!v)}
              />
              <Label htmlFor="internationalTransfer">
                Os dados são transferidos para fora do Brasil?
              </Label>
            </div>

            {currentResponse.internationalTransfer && (
              <div className="pl-6 space-y-2">
                <Label>Para quais países?</Label>
                <Input
                  value={currentResponse.internationalCountries?.join(", ") || ""}
                  onChange={(e) => updateResponse("internationalCountries", e.target.value.split(",").map(s => s.trim()))}
                  placeholder="Ex: Estados Unidos, União Europeia..."
                />
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    A transferência internacional de dados requer garantias adequadas 
                    conforme o art. 33 da LGPD.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5" />
              Observações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={currentResponse.notes}
              onChange={(e) => updateResponse("notes", e.target.value)}
              placeholder="Adicione informações relevantes sobre este processo..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* FUNIL DATA USE (interno) — versão compacta */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Finalidades por dado (assistido)
            </CardTitle>
            <CardDescription>
              Selecione finalidades por dado. O sistema sugere base legal e riscos com "por quê".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!purposeCatalog.length ? (
              <div className="text-sm text-muted-foreground">Carregando catálogo…</div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Use a Entrevista Pública para matriz completa; aqui exibimos apenas o botão de sugestão e gravação no ropaData.dataUses.
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const res = await suggestDataUsesM.mutateAsync({
                  subjectGroups: currentResponse.titularCategories || [],
                  dataElements: currentResponse.dataCategories || [],
                  purposeByDataElement: {}, // no interno, deixamos para a pública (mantém simples)
                  systems: currentResponse.ropaData?.systemsUsed || [],
                  channels: currentResponse.ropaData?.collectionChannels || [],
                  recipients: currentResponse.sharing || [],
                  internationalTransfer: !!currentResponse.internationalTransfer,
                  operatorsCount: (currentResponse.ropaData?.operators || []).length || 0,
                  volumeFrequency: currentResponse.ropaData?.volumeFrequency || "",
                  monitoring: !!currentResponse.ropaData?.systematicMonitoring,
                });
                setResponses((prev:any)=>({ ...prev, [currentProcess.id]: { ...prev[currentProcess.id], ropaData: { ...(prev[currentProcess.id]?.ropaData||{}), dataUses: res.uses || [] } } }));
              }}
              disabled={suggestDataUsesM.isPending}
            >
              Gerar sugestões de uso de dados (regras determinísticas)
            </Button>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentProcessIndex(Math.max(0, currentProcessIndex - 1))}
            disabled={currentProcessIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {currentProcessIndex < interview.processes.length - 1 ? (
            <Button onClick={handleSaveAndNext} disabled={saveResponseMutation.isPending}>
              {saveResponseMutation.isPending ? "Salvando..." : "Salvar e Próximo"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleFinalize} 
              disabled={saveResponseMutation.isPending || finalizeMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {finalizeMutation.isPending ? "Finalizando..." : "Concluir Entrevista"}
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
