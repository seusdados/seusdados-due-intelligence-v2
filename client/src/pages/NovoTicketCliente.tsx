import React, { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  MessageCircleQuestion,
  Shield,
  FileText,
  Users,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  FileIcon,
  CheckCircle2,
  Sparkles,
  Send,
  Loader2,
  Info,
  Lightbulb,
  Clock,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import ContractPreAnalysis from "@/components/ContractPreAnalysis";

// Tipos de ticket com descrições detalhadas
const ticketTypes = [
  {
    id: "solicitacao_titular",
    title: "Solicitação de Titular",
    description: "Exercício de direitos LGPD (acesso, correção, exclusão, portabilidade)",
    icon: Users,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    tips: [
      "Informe o nome completo do titular",
      "Especifique qual direito está sendo exercido",
      "Inclua documentos de identificação se necessário"
    ],
    priority: "alta",
    sla: "15 dias úteis (LGPD)"
  },
  {
    id: "incidente_seguranca",
    title: "Incidente de Segurança",
    description: "Vazamento de dados, acesso não autorizado, perda de informações",
    icon: AlertTriangle,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    tips: [
      "Descreva quando o incidente foi detectado",
      "Liste os dados potencialmente afetados",
      "Informe as ações já tomadas"
    ],
    priority: "critica",
    sla: "72 horas (ANPD)"
  },
  {
    id: "duvida_juridica",
    title: "Dúvida Jurídica",
    description: "Interpretação de leis, contratos, políticas de privacidade",
    icon: BookOpen,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    tips: [
      "Contextualize a situação específica",
      "Anexe contratos ou documentos relevantes",
      "Indique urgência se houver prazo legal"
    ],
    priority: "media",
    sla: "5 dias úteis"
  },
  {
    id: "consultoria_geral",
    title: "Consultoria Geral",
    description: "Orientações sobre LGPD, boas práticas, processos internos",
    icon: MessageCircleQuestion,
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    tips: [
      "Seja específico sobre o tema",
      "Informe o contexto do negócio",
      "Mencione se há decisões pendentes"
    ],
    priority: "media",
    sla: "3 dias úteis"
  },
  {
    id: "auditoria",
    title: "Auditoria",
    description: "Avaliação de conformidade, análise de riscos, gap analysis",
    icon: Shield,
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    tips: [
      "Defina o escopo da auditoria",
      "Liste os processos a serem avaliados",
      "Informe prazos de compliance"
    ],
    priority: "alta",
    sla: "Sob demanda"
  },
  {
    id: "treinamento",
    title: "Treinamento",
    description: "Capacitação de equipes, workshops, palestras sobre privacidade",
    icon: GraduationCap,
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    tips: [
      "Informe o público-alvo",
      "Especifique temas de interesse",
      "Sugira datas e formato preferido"
    ],
    priority: "baixa",
    sla: "Agendamento"
  },
  {
    id: "documentacao",
    title: "Documentação",
    description: "Políticas, termos de uso, avisos de privacidade, contratos",
    icon: FileText,
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    tips: [
      "Especifique o tipo de documento",
      "Anexe versões anteriores se houver",
      "Informe o uso pretendido"
    ],
    priority: "media",
    sla: "5 dias úteis"
  }
];

// Limite de tamanho de arquivo (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  // Documentos
  ".pdf", ".doc", ".docx", ".odt", ".rtf", ".txt", ".md",
  // Planilhas
  ".xls", ".xlsx", ".ods", ".csv",
  // Apresentações
  ".ppt", ".pptx", ".odp",
  // Imagens
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".tiff", ".tif",
  // Compactados
  ".zip", ".rar", ".7z", ".tar", ".gz",
  // Dados
  ".json", ".xml", ".html",
];

interface UploadedFile {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
}

export default function NovoTicketCliente() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados do wizard - DEVEM estar antes de qualquer return condicional
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Buscar catálogo de serviços
  const { data: serviceCatalog } = trpc.serviceCatalog.getFullCatalog.useQuery();
  
  // Estados para pré-análise de contratos
  const [showContractPreAnalysis, setShowContractPreAnalysis] = useState(false);
  const [contractPreAnalysis, setContractPreAnalysis] = useState<any>(null);
  const [contractPreAnalysisValidations, setContractPreAnalysisValidations] = useState<any>(null);
  const [extractedContractText, setExtractedContractText] = useState<string>("");
  
  // Animação de entrada
  const [animateIn, setAnimateIn] = useState(true);
  
  // Mutation para upload de anexos - DEVE estar antes de qualquer return condicional
  const uploadAttachment = trpc.tickets.uploadAttachment.useMutation();
  
  // Converter arquivo para base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remover o prefixo data:mime/type;base64,
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }, []);
  
  // Validar arquivo
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `Arquivo muito grande. Máximo: 50MB`;
    }
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Tipo não permitido. Use: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    return null;
  }, []);

  // Função para verificar se arquivo é contrato
  const isContractFile = useCallback((filename: string): boolean => {
    const contractPatterns = [
      /contrato/i,
      /acordo/i,
      /termo/i,
      /aditivo/i,
      /convenio/i,
      /parceria/i,
      /prestacao.*servico/i,
      /fornecimento/i,
      /licenca/i,
      /nda/i,
      /confidencialidade/i
    ];
    const isDocumentType = /\.(pdf|docx?|txt)$/i.test(filename);
    return contractPatterns.some(pattern => pattern.test(filename)) && isDocumentType;
  }, []);

  // Função para extrair texto de arquivo
  const extractTextFromFile = useCallback(async (file: File): Promise<string> => {
    // Para arquivos de texto simples
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return await file.text();
    }
    // Para outros tipos, retornar o nome do arquivo como placeholder
    // (a extração real seria feita no backend)
    return `[Conteúdo do arquivo: ${file.name}]\n\nO conteúdo será extraído automaticamente após o upload.`;
  }, []);

  // Handler de upload de arquivos
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const newFiles: UploadedFile[] = selectedFiles.map(file => {
      const error = validateFile(file);
      return {
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        error: error || undefined
      };
    });
    
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Verificar se algum arquivo é contrato e o tipo de ticket pode envolver contratos
    const contractRelatedTypes = ['documentacao', 'duvida_juridica', 'consultoria_geral', 'auditoria'];
    if (selectedType && contractRelatedTypes.includes(selectedType)) {
      for (const file of selectedFiles) {
        if (isContractFile(file.name) && !validateFile(file)) {
          try {
            const text = await extractTextFromFile(file);
            if (text.length > 50) {
              setExtractedContractText(text);
              setShowContractPreAnalysis(true);
              toast.info("Contrato detectado! Deseja realizar uma pré-análise automática?");
              break;
            }
          } catch (err) {
            console.error("Erro ao extrair texto:", err);
          }
        }
      }
    }
  }, [validateFile, selectedType, isContractFile, extractTextFromFile]);

  // Remover arquivo
  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);
  
  // Handler de drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    const newFiles: UploadedFile[] = droppedFiles.map(file => {
      const error = validateFile(file);
      return {
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        error: error || undefined
      };
    });
    
    setFiles(prev => [...prev, ...newFiles]);
  }, [validateFile]);
  
  // Mutation para criar ticket - DEVE estar antes de qualquer return condicional
  const createTicket = trpc.tickets.create.useMutation({
    onSuccess: async (data) => {
      // Fazer upload dos arquivos após criar o ticket
      const validFiles = files.filter(f => !f.error);
      if (validFiles.length > 0) {
        toast.info(`Enviando ${validFiles.length} arquivo(s)...`);
        for (const uploadedFile of validFiles) {
          try {
            const base64 = await fileToBase64(uploadedFile.file);
            await uploadAttachment.mutateAsync({
              ticketId: data.id,
              fileName: uploadedFile.file.name,
              mimeType: uploadedFile.file.type,
              fileContent: base64
            });
          } catch (error) {
            console.error('Erro ao enviar arquivo:', error);
            toast.error(`Erro ao enviar ${uploadedFile.file.name}`);
          }
        }
      }
      
      toast.success("Chamado aberto com sucesso!", {
        description: `Seu chamado #${data.id} foi registrado e será analisado em breve.`
      });
      navigate(`/meudpo/${data.id}`);
    },
    onError: (error) => {
      toast.error("Erro ao abrir chamado", {
        description: error.message
      });
      setIsSubmitting(false);
    }
  });
  
  // Verificar se usuário tem permissão (cliente, sponsor, admin_global ou consultor)
  // Todos os roles podem criar tickets
  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);
  
  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }

  // Obter tipo selecionado
  const currentType = ticketTypes.find(t => t.id === selectedType);
  
  // Calcular progresso
  const progress = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;

  // Navegar entre steps com animação
  const goToStep = (newStep: number) => {
    setAnimateIn(false);
    setTimeout(() => {
      setStep(newStep);
      setAnimateIn(true);
    }, 150);
  };

  // Submeter ticket
  const handleSubmit = async () => {
    if (!selectedType || !title.trim() || !description.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    
    // Criar o ticket
    createTicket.mutate({
      organizationId: user?.organizationId || 1,
      title: title.trim(),
      description: description.trim(),
      ticketType: selectedType as "solicitacao_titular" | "incidente_seguranca" | "duvida_juridica" | "consultoria_geral" | "auditoria" | "treinamento" | "documentacao",
      priority: currentType?.priority as "baixa" | "media" | "alta" | "critica" || "media",
      serviceCatalogItemId: selectedServiceId || undefined
    });
  };

  // Verificar se pode avançar
  const canProceed = () => {
    if (step === 1) return !!selectedType;
    if (step === 2) return title.trim().length >= 10;
    if (step === 3) return description.trim().length >= 30;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header com progresso */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Novo Chamado</h1>
                <p className="text-sm text-slate-500">Passo {step} de 4</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/meudpo")}
              className="text-slate-500"
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className={cn(
          "transition-all duration-300",
          animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          
          {/* Step 1: Selecionar tipo */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Como podemos ajudar você?
                </h2>
                <p className="text-slate-600">
                  Selecione o tipo de atendimento que melhor descreve sua necessidade
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {ticketTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  
                  return (
                    <Card
                      key={type.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
                        isSelected 
                          ? `ring-2 ring-purple-500 shadow-lg ${type.bgColor}` 
                          : "hover:bg-slate-50"
                      )}
                      onClick={() => setSelectedType(type.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                            type.color
                          )}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900">{type.title}</h3>
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 text-purple-500" />
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{type.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {type.sla}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Dicas do tipo selecionado */}
              {currentType && (
                <Card className={cn("border-2 animate-in fade-in slide-in-from-bottom-2", currentType.borderColor, currentType.bgColor)}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white/80 flex items-center justify-center">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 mb-2">Dicas para {currentType.title}</h4>
                        <ul className="space-y-1">
                          {currentType.tips.map((tip, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                              <Star className="h-3 w-3 text-amber-500" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seletor de Serviço do Catálogo CSC (opcional) */}
              {selectedType && serviceCatalog && serviceCatalog.length > 0 && (
                <Card className="border-2 border-dashed border-slate-200 hover:border-purple-300 transition-colors animate-in fade-in slide-in-from-bottom-2">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Serviço Específico (Opcional)</h4>
                        <p className="text-sm text-slate-500">Selecione um serviço do catálogo para aplicar SLA específico</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {serviceCatalog.map((block) => (
                        <div key={block.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-semibold">
                              {block.code}
                            </Badge>
                            <span className="text-sm font-medium text-slate-700">{block.name}</span>
                          </div>
                          <div className="grid gap-2 pl-4">
                            {block.services?.map((service) => (
                              <div
                                key={service.id}
                                onClick={() => setSelectedServiceId(selectedServiceId === service.id ? null : service.id)}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                                  selectedServiceId === service.id
                                    ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500"
                                    : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
                                )}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-900">{service.name}</span>
                                    {selectedServiceId === service.id && (
                                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">{service.description}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <Badge 
                                    variant="secondary" 
                                    className={cn(
                                      "text-xs",
                                      service.priority === 'critica' && "bg-red-100 text-red-700",
                                      service.priority === 'alta' && "bg-orange-100 text-orange-700",
                                      service.priority === 'media' && "bg-yellow-100 text-yellow-700",
                                      service.priority === 'baixa' && "bg-green-100 text-green-700"
                                    )}
                                  >
                                    {service.priority}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {service.slaHours}h
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedServiceId && (
                      <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 text-purple-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Serviço selecionado - SLA será aplicado automaticamente
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 2: Título */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Qual é o assunto principal?
                </h2>
                <p className="text-slate-600">
                  Um título claro ajuda nossa equipe a entender rapidamente sua necessidade
                </p>
              </div>

              <Card className="border-2 border-dashed border-slate-200 hover:border-purple-300 transition-colors">
                <CardContent className="p-6">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Dúvida sobre compartilhamento de dados com fornecedor"
                    className="text-lg border-0 shadow-none focus-visible:ring-0 placeholder:text-slate-400"
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-sm text-slate-500">
                      {title.length} caracteres
                    </span>
                    <span className={cn(
                      "text-sm",
                      title.length >= 10 ? "text-emerald-600" : "text-slate-400"
                    )}>
                      {title.length >= 10 ? "✓ Título adequado" : "Mínimo 10 caracteres"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Sugestões de títulos */}
              {currentType && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Sugestões para {currentType.title}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentType.id === "solicitacao_titular" && (
                      <>
                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100" onClick={() => setTitle("Solicitação de acesso aos dados pessoais")}>
                          Acesso aos dados
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100" onClick={() => setTitle("Solicitação de exclusão de dados pessoais")}>
                          Exclusão de dados
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100" onClick={() => setTitle("Solicitação de correção de dados pessoais")}>
                          Correção de dados
                        </Badge>
                      </>
                    )}
                    {currentType.id === "consultoria_geral" && (
                      <>
                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100" onClick={() => setTitle("Dúvida sobre tratamento de dados de clientes")}>
                          Tratamento de dados
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100" onClick={() => setTitle("Orientação sobre política de privacidade")}>
                          Política de privacidade
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Descrição */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Conte-nos mais detalhes
                </h2>
                <p className="text-slate-600">
                  Quanto mais informações, mais rápido e preciso será nosso atendimento
                </p>
              </div>

              <Card className="border-2 border-dashed border-slate-200 hover:border-purple-300 transition-colors">
                <CardContent className="p-6">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva sua solicitação com o máximo de detalhes possível. Inclua contexto, datas relevantes, pessoas envolvidas e qualquer informação que possa nos ajudar a entender melhor a situação..."
                    className="min-h-[200px] text-base border-0 shadow-none focus-visible:ring-0 placeholder:text-slate-400 resize-none"
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-sm text-slate-500">
                      {description.length} caracteres
                    </span>
                    <span className={cn(
                      "text-sm",
                      description.length >= 30 ? "text-emerald-600" : "text-slate-400"
                    )}>
                      {description.length >= 30 ? "✓ Descrição adequada" : "Mínimo 30 caracteres"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Anexos e Revisão */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Anexos e Revisão Final
                </h2>
                <p className="text-slate-600">
                  Adicione documentos relevantes e revise seu chamado antes de enviar
                </p>
              </div>

              {/* Área de upload */}
              <Card 
                className="border-2 border-dashed border-slate-200 hover:border-purple-300 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ALLOWED_EXTENSIONS.join(",")}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="h-16 w-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-8 w-8 text-purple-500" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    Arraste arquivos aqui ou clique para selecionar
                  </h3>
                  <p className="text-sm text-slate-500 mb-2">
                    Formatos: PDF, DOCX, TXT, MD, JSON, HTML, PNG, JPEG
                  </p>
                  <p className="text-xs text-slate-400">
                    Máximo 10MB por arquivo
                  </p>
                </CardContent>
              </Card>

              {/* Pré-Análise de Contrato */}
              {showContractPreAnalysis && extractedContractText && (
                <ContractPreAnalysis
                  contractText={extractedContractText}
                  ticketContext={{
                    title,
                    description,
                    ticketType: selectedType || undefined
                  }}
                  onAnalysisComplete={(analysis, validations) => {
                    setContractPreAnalysis(analysis);
                    setContractPreAnalysisValidations(validations);
                    setShowContractPreAnalysis(false);
                    toast.success("Pré-análise salva! As informações serão anexadas ao chamado.");
                  }}
                  onSkip={() => {
                    setShowContractPreAnalysis(false);
                    setExtractedContractText("");
                  }}
                />
              )}

              {/* Indicador de pré-análise concluída */}
              {contractPreAnalysis && !showContractPreAnalysis && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800">Pré-Análise de Contrato Concluída</p>
                        <p className="text-sm text-green-600">
                          {contractPreAnalysis.contractType} - {contractPreAnalysis.personalDataCategories?.length || 0} categorias de dados identificadas
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowContractPreAnalysis(true)}
                        className="text-green-700 hover:text-green-800 hover:bg-green-100"
                      >
                        Revisar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista de arquivos */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        file.error ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
                      )}
                    >
                      {file.preview ? (
                        <img src={file.preview} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-slate-200 flex items-center justify-center">
                          <FileIcon className="h-5 w-5 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {file.file.name}
                        </p>
                        <p className={cn(
                          "text-xs",
                          file.error ? "text-red-600" : "text-slate-500"
                        )}>
                          {file.error || `${(file.file.size / 1024).toFixed(1)} KB`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumo do chamado */}
              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-purple-500" />
                    Resumo do Chamado
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-slate-500 w-24">Tipo:</span>
                      <Badge className={cn("bg-gradient-to-r text-white", currentType?.color)}>
                        {currentType?.title}
                      </Badge>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-slate-500 w-24">Título:</span>
                      <span className="text-sm font-medium text-slate-900">{title}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-slate-500 w-24">Descrição:</span>
                      <span className="text-sm text-slate-700 line-clamp-3">{description}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-slate-500 w-24">Anexos:</span>
                      <span className="text-sm text-slate-700">
                        {files.filter(f => !f.error).length} arquivo(s)
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-sm text-slate-500 w-24">SLA:</span>
                      <span className="text-sm text-slate-700">{currentType?.sla}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={() => goToStep(step - 1)}
            disabled={step === 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => goToStep(step + 1)}
              disabled={!canProceed()}
              className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            >
              Continuar
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Chamado
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
