/**
 * Página de Análise de Contratos LGPD
 * Permite consultores Seusdados analisarem contratos com IA
 * Padrão visual consistente com módulos Conformidade PPPD e Gestão de Terceiros
 */

import { useState, useRef, useCallback, useEffect } from "react";
// DashboardLayout removido - já é aplicado no App.tsx
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Scale, Plus, Clock, CheckCircle, AlertTriangle, 
  FileText, Shield, AlertCircle as AlertCircleIcon, ChevronRight, RefreshCw,
  Eye, Trash2, Download, TrendingUp, BarChart3, FolderOpen, Upload,
  FileSearch, Pencil, ClipboardList, FileOutput, Filter, XCircle, Headphones, Share2
} from "lucide-react";
import { AcionarDPO } from "@/components/AcionarDPO";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useLocation, useSearch } from "wouter";
import { DynamicBreadcrumbs } from "@/components/DynamicBreadcrumbs";
import { AnalysisProgressModal } from "@/components/AnalysisProgressModal";

// Formatar tamanho de arquivo
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function ContractAnalysis() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { selectedOrganization, isOrganizationRequired } = useOrganization();
  const selectedOrgId = selectedOrganization?.id;
  const [isNewAnalysisOpen, setIsNewAnalysisOpen] = useState(false);
  const searchString = useSearch();
  
  // Abrir modal automaticamente se query param nova=true
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get('nova') === 'true') {
      setIsNewAnalysisOpen(true);
      // Limpar query param da URL
      setLocation('/analise-contratos', { replace: true });
    }
  }, [searchString, setLocation]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [contractName, setContractName] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [autoFileName, setAutoFileName] = useState<string>("");
  const [autoFileLocation, setAutoFileLocation] = useState<string>("");
  
  // Estados para upload em massa e progresso
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<Array<{
    id: string;
    fileName: string;
    fileLocation: string;
    status: "pending" | "processing" | "completed" | "error";
    progress: number;
    timeRemaining?: number;
    error?: string;
  }>>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  
  // Estados para upload direto
  const [uploadMode, setUploadMode] = useState<"ged" | "upload">("ged");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para filtro de status
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Estado para modal de visualização de documento
  const [viewDocumentId, setViewDocumentId] = useState<number | null>(null);
  const [isViewDocumentOpen, setIsViewDocumentOpen] = useState(false);
  
  // Estado para modal de compartilhamento
  const [shareAnalysisId, setShareAnalysisId] = useState<number | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>("");
  const [shareLink, setShareLink] = useState<string>("");

  // Queries
  const { data: organizations } = trpc.organization.list.useQuery();
  const { data: analyses, refetch: refetchAnalyses } = trpc.contractAnalysis.list.useQuery(
    selectedOrgId ? { organizationId: selectedOrgId } : undefined
  );
  const { data: stats } = trpc.contractAnalysis.getStats.useQuery(
    selectedOrgId ? { organizationId: selectedOrgId } : undefined
  );
  const { data: gedData } = trpc.ged.getAvailableDocumentsForAssessment.useQuery(
    { organizationId: selectedOrgId || 0, folderId: currentFolderId },
    { enabled: !!selectedOrgId && isNewAnalysisOpen }
  );
  
  // Query para obter URL do documento para visualização
  const { data: documentUrl, isLoading: isLoadingDocUrl } = trpc.ged.getDownloadUrl.useQuery(
    { id: viewDocumentId || 0 },
    { enabled: !!viewDocumentId && isViewDocumentOpen }
  );

  // Mutations
  const utils = trpc.useUtils();
  
  const startAnalysisMutation = trpc.contractAnalysis.startAnalysis.useMutation({
    onSuccess: (data) => {
      console.info('[ContractAnalysis] ✅ startAnalysis SUCCESS', {
        analysisId: data?.id,
        jobId: data?.jobId,
        timestamp: new Date().toISOString(),
      });
      // Fechar modal APENAS em sucesso
      setTimeout(() => setIsNewAnalysisOpen(false), 500);
      setSelectedDocumentId(null);
      setContractName("");
      setCurrentFolderId(null);
      setUploadFile(null);
      setUploadMode("ged");
      utils.contractAnalysis.list.invalidate();
      toast.success("Análise criada com sucesso!", {
        description: "A análise foi iniciada e aparecerá na listagem em breve.",
        duration: 4000,
      });
    },
    onError: (error) => {
      console.error('[ContractAnalysis] ❌ startAnalysis ERROR', {
        message: error.message,
        code: error.data?.code,
        timestamp: new Date().toISOString(),
      });
      // NÃO fechar modal em erro - deixar usuário corrigir
      toast.error("Não foi possível iniciar a análise", {
        description: error.message || "Tente novamente ou entre em contato com o suporte.",
        duration: 5000,
      });
    }
  });

  const deleteAnalysisMutation = trpc.contractAnalysis.delete.useMutation({
    onSuccess: () => {
      toast.success("Análise excluída com sucesso!");
      refetchAnalyses();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir análise: ${error.message}`);
    }
  });

  const generateShareLinkMutation = trpc.contractAnalysis.generateShareLink.useMutation({
    onSuccess: (data) => {
      setShareLink(data.shareLink);
      toast.success("Link gerado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao gerar link: ${error.message}`);
    }
  });

  // Mutation para upload direto e análise
  const uploadAndAnalyzeMutation = trpc.contractAnalysis.uploadAndAnalyze.useMutation({
    onSuccess: (data) => {
      console.info('[ContractAnalysis] uploadAndAnalyze SUCCESS', {
        analysisId: data?.id,
        jobId: data?.jobId,
        timestamp: new Date().toISOString(),
      });
      // Fechar modal APENAS em sucesso
      setTimeout(() => setIsNewAnalysisOpen(false), 500);
      setUploadFile(null);
      setContractName("");
      setUploadMode("ged");
      utils.contractAnalysis.list.invalidate();
      toast.success("Documento enviado com sucesso!", {
        description: "A análise foi iniciada e aparecerá na listagem em breve.",
        duration: 4000,
      });
    },
    onError: (error) => {
      console.error('[ContractAnalysis] uploadAndAnalyze ERROR', {
        message: error.message,
        code: error.data?.code,
        timestamp: new Date().toISOString(),
      });
      // NÃO fechar modal em erro - deixar usuário corrigir
      toast.error("Não foi possível enviar o documento", {
        description: error.message || "Verifique o arquivo e tente novamente.",
        duration: 5000,
      });
    }
  });

  // Handler para seleção de arquivo
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!contractName) {
        setContractName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [contractName]);

  // Verificar se é consultor ou admin
  const isConsultant = user?.role === 'admin_global' || user?.role === 'consultor';

  const handleStartAnalysis = () => {
    console.info('[ContractAnalysis] handleStartAnalysis CALLED', {
      selectedOrgId,
      selectedDocumentId,
      contractName: contractName.trim(),
      timestamp: new Date().toISOString(),
    });
    
    if (!selectedOrgId) {
      toast.error("Selecione uma organização");
      return;
    }
    
    if (!selectedDocumentId) {
      toast.error("Selecione um documento");
      return;
    }
    
    if (!contractName.trim()) {
      toast.error("Preencha o nome do contrato");
      return;
    }

    console.info('[ContractAnalysis] Calling startAnalysis mutation', {
      organizationId: selectedOrgId,
      documentId: selectedDocumentId,
      contractName: contractName.trim(),
    });
    
    startAnalysisMutation.mutate({
      organizationId: selectedOrgId,
      documentId: selectedDocumentId,
      contractName: contractName.trim()
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pendente</Badge>;
      case 'analyzing':
        return <Badge className="bg-blue-500 gap-1"><RefreshCw className="w-3 h-3 animate-spin" />Analisando</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="w-3 h-3" />Concluída</Badge>;
      case 'reviewed':
        return <Badge className="bg-purple-500 gap-1"><Eye className="w-3 h-3" />Revisada</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-600 gap-1"><Shield className="w-3 h-3" />Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><AlertCircleIcon className="w-3 h-3" />Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="space-y-8 text-black force-text-black">
        <DynamicBreadcrumbs />
        {/* Header - Padrão Visual Seusdados */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="heading-2">
                Análise de Contratos LGPD
              </h1>
              <p className="body-small">
                Análise automatizada com IA seguindo 18 blocos de regras LGPD/ANPD
              </p>
            </div>
          </div>

            <div className="flex items-center gap-3">
              {/* Indicador de Organização Selecionada */}
              {isConsultant && selectedOrganization && (
                <Badge variant="outline" className="px-3 py-1 text-sm border-emerald-200">
                  {selectedOrganization.name}
                </Badge>
              )}

              {/* Botão Acionar DPO */}
              <AcionarDPO
                sourceContext={{
                  module: "Análise de Contratos",
                  page: "Lista de Análises"
                }}
                variant="outline"
                size="default"
              />

              {/* Botão Nova Análise */}
              {isConsultant && selectedOrgId && (
                <Dialog open={isNewAnalysisOpen} onOpenChange={setIsNewAnalysisOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Análise
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-emerald-600" />
                        Nova Análise de Contrato
                      </DialogTitle>
                      <DialogDescription>
                        Selecione um documento do GED ou faça upload direto
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="contractName">Nome do Contrato</Label>
                        <Input
                          id="contractName"
                          value={contractName}
                          onChange={(e) => setContractName(e.target.value)}
                          placeholder="Ex: Contrato de Prestação de Serviços - Fornecedor X"
                          className="border-emerald-200 focus:border-emerald-500"
                        />
                        <p className="text-xs text-muted-foreground">Deixe em branco para usar o nome do arquivo</p>
                      </div>

                      {/* Campos automáticos */}
                      {(autoFileName || autoFileLocation) && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="autoFileName">Nome do Arquivo</Label>
                            <Input
                              id="autoFileName"
                              value={autoFileName}
                              disabled
                              className="bg-gray-100 text-gray-600 border-gray-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="autoFileLocation">Local do Arquivo</Label>
                            <Input
                              id="autoFileLocation"
                              value={autoFileLocation}
                              disabled
                              className="bg-gray-100 text-gray-600 border-gray-200"
                            />
                          </div>
                        </>
                      )}

                      {/* Tabs para escolher origem do documento */}
                      <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "ged" | "upload")} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="ged" className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" />
                            Selecionar do GED
                          </TabsTrigger>
                          <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Upload Direto
                          </TabsTrigger>
                        </TabsList>

                        {/* Tab: Selecionar do GED */}
                        <TabsContent value="ged" className="space-y-2 mt-4">
                          <Label>Selecione o Documento do GED *</Label>
                          
                          {/* Navegação de pastas */}
                          {currentFolderId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCurrentFolderId(null)}
                              className="mb-2 text-emerald-600"
                            >
                              ← Voltar
                            </Button>
                          )}

                          <div className="border rounded-lg max-h-[300px] overflow-y-auto border-emerald-200">
                          {/* Pastas */}
                          {gedData?.folders?.map((folder: any) => (
                            <div
                              key={folder.id}
                              className="flex items-center gap-3 p-3 hover:bg-emerald-50 cursor-pointer border-b"
                              onClick={() => setCurrentFolderId(folder.id)}
                            >
                              <FolderOpen className="w-5 h-5 text-amber-500" />
                              <span className="flex-1">{folder.name}</span>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          ))}

                          {/* Documentos */}
                          {gedData?.documents?.map((doc: any) => (
                            <div
                              key={doc.id}
                              className={`flex items-center gap-3 p-3 hover:bg-emerald-50 cursor-pointer border-b transition-colors ${
                                selectedDocumentId === doc.id ? 'bg-emerald-100 border-l-4 border-l-emerald-500' : ''
                              }`}
                              onClick={() => {
                                setSelectedDocumentId(doc.id);
                                setAutoFileName(doc.name);
                                // Preencher automaticamente o nome do contrato com o nome do arquivo (sem extensão)
                                if (!contractName) {
                                  setContractName(doc.name.replace(/\.[^/.]+$/, ""));
                                }
                                const folderName = gedData?.folders?.find((f: any) => f.id === currentFolderId)?.name || 'Raiz';
                                setAutoFileLocation(`GED ${selectedOrganization?.name} > ${folderName}`);
                              }}
                            >
                              <FileText className="w-5 h-5 text-blue-500" />
                              <div className="flex-1">
                                <p className="font-medium">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">{doc.mimeType}</p>
                              </div>
                              {selectedDocumentId === doc.id && (
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                              )}
                            </div>
                          ))}

                          {(!gedData?.folders?.length && !gedData?.documents?.length) && (
                            <div className="p-8 text-center text-muted-foreground">
                              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p>Nenhum documento encontrado nesta pasta</p>
                            </div>
                          )}
                          </div>
                        </TabsContent>

                        {/* Tab: Upload Direto */}
                        <TabsContent value="upload" className="space-y-4 mt-4">
                          <div
                            className="border-2 border-dashed border-emerald-300 rounded-lg p-8 text-center cursor-pointer hover:bg-emerald-50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {uploadFile ? (
                              <div className="flex items-center justify-center gap-3">
                                <FileText className="h-10 w-10 text-emerald-500" />
                                <div className="text-left">
                                  <p className="font-medium text-emerald-700">{uploadFile.name}</p>
                                  <p className="body-small">{formatFileSize(uploadFile.size)}</p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Upload className="h-12 w-12 mx-auto text-emerald-400 mb-3" />
                                <p className="text-emerald-600 font-medium">Clique para selecionar um arquivo</p>
                                <p className="body-small mt-1">ou arraste e solte aqui</p>
                                <p className="text-xs text-muted-foreground mt-2">Formatos aceitos: PDF, DOC, DOCX, TXT</p>
                              </>
                            )}
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.tif,.zip,.rar,.7z,.tar,.gz,.json,.xml,.html"
                            onChange={(e) => {
                              handleFileSelect(e);
                              if (e.target.files?.[0]) {
                                setAutoFileName(e.target.files[0].name);
                                setAutoFileLocation(`UPLOAD > ${selectedOrganization?.name} > ${e.target.files[0].name}`);
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            O documento será enviado para a pasta "Contratos" no GED da organização selecionada
                          </p>
                        </TabsContent>
                      </Tabs>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsNewAnalysisOpen(false)}>
                        Cancelar
                      </Button>
                      {uploadMode === "ged" ? (
                        <Button
                          onClick={handleStartAnalysis}
                          disabled={!selectedDocumentId || startAnalysisMutation.isPending}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                        >
                          {startAnalysisMutation.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Iniciando...
                            </>
                          ) : (
                            <>
                              <Scale className="w-4 h-4 mr-2" />
                              Iniciar Análise
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            if (!selectedOrgId || !uploadFile) {
                              toast.error("Selecione um arquivo para upload");
                              return;
                            }
                            console.info('[ContractAnalysis] uploadAndAnalyze CALLED', {
                              organizationId: selectedOrgId,
                              fileName: uploadFile.name,
                              fileSize: uploadFile.size,
                              mimeType: uploadFile.type,
                              contractName: contractName.trim() || uploadFile.name,
                              timestamp: new Date().toISOString(),
                            });
                            const reader = new FileReader();
                            reader.onload = () => {
                              const base64 = (reader.result as string).split(",")[1];
                              uploadAndAnalyzeMutation.mutate({
                                organizationId: selectedOrgId,
                                contractName: contractName.trim() || uploadFile.name,
                                fileData: base64,
                                fileName: uploadFile.name,
                                mimeType: uploadFile.type || "application/octet-stream",
                              });
                            };
                            reader.readAsDataURL(uploadFile);
                          }}
                          disabled={!uploadFile || uploadAndAnalyzeMutation.isPending}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                        >
                          {uploadAndAnalyzeMutation.isPending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Enviar e Analisar
                            </>
                          )}
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
          </div>
        </div>

        {/* Aviso de Organização Não Selecionada */}
        {isConsultant && !selectedOrganization && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Selecione uma organização no menu lateral para visualizar e gerenciar análises de contratos.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards de Estatísticas - Padrão Visual Seusdados */}
        {stats && selectedOrgId && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-600" />
              <CardHeader className="pb-2">
                <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Total</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{String(stats.total).padStart(2, '0')}</p>
                    <p className="text-xs text-muted-foreground">contratos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
              <CardHeader className="pb-2">
                <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Em Análise</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <RefreshCw className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{String(stats.analyzing).padStart(2, '0')}</p>
                    <p className="text-xs text-muted-foreground">processando</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <CardHeader className="pb-2">
                <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Concluídas</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{String(stats.completed).padStart(2, '0')}</p>
                    <p className="text-xs text-muted-foreground">finalizadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
              <CardHeader className="pb-2">
                <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Revisadas</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{String(stats.reviewed).padStart(2, '0')}</p>
                    <p className="text-xs text-muted-foreground">verificadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
              <CardHeader className="pb-2">
                <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Críticos</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{String(stats.criticalRisks).padStart(2, '0')}</p>
                    <p className="text-xs text-muted-foreground">riscos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
              <CardHeader className="pb-2">
                <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Altos</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                    <AlertCircleIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{String(stats.highRisks).padStart(2, '0')}</p>
                    <p className="text-xs text-muted-foreground">riscos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Análises - Visual Law Style */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-light text-black">Análises de Contratos</CardTitle>
                  <CardDescription className="font-light text-black">Histórico de análises realizadas</CardDescription>
                </div>
              </div>
              
              {/* Filtro de Status */}
              {selectedOrgId && (
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] h-8 text-sm">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="analyzing">Em análise</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="reviewed">Revisada</SelectItem>
                      <SelectItem value="error">Com erro</SelectItem>
                    </SelectContent>
                  </Select>
                  {statusFilter !== "all" && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={() => setStatusFilter("all")}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedOrgId && isConsultant ? (
              <div className="text-center py-16 text-muted-foreground">
                <Scale className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-light">Selecione uma organização para ver as análises</p>
              </div>
            ) : analyses && analyses.length > 0 ? (
              <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="font-medium">Contrato</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Progresso</TableHead>
                    <TableHead className="font-medium">Score</TableHead>
                    <TableHead className="font-medium">Riscos</TableHead>
                    <TableHead className="font-medium">Data</TableHead>
                    <TableHead className="text-right font-medium">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses
                    .filter((a: any) => statusFilter === "all" || a.status === statusFilter)
                    .map((analysis: any) => (
                    <TableRow 
                      key={analysis.id} 
                      className="hover:bg-emerald-50/50 transition-all duration-200 cursor-pointer group hover:shadow-md"
                      onClick={() => setLocation(`/analise-contratos/${analysis.id}`)}
                    >
                      <TableCell className="font-medium text-slate-900">{analysis.contractName}</TableCell>
                      <TableCell>{getStatusBadge(analysis.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={analysis.progress} className="w-20 h-2" />
                          <span className="text-xs text-muted-foreground font-light">{analysis.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {analysis.complianceScore !== null ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp className={`w-4 h-4 ${
                              analysis.complianceScore >= 80 ? 'text-green-600' :
                              analysis.complianceScore >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`} />
                            <span className={`font-bold ${
                              analysis.complianceScore >= 80 ? 'text-green-600' :
                              analysis.complianceScore >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {analysis.complianceScore}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {analysis.criticalRisks > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {analysis.criticalRisks} críticos
                            </Badge>
                          )}
                          {analysis.highRisks > 0 && (
                            <Badge className="bg-orange-500 text-xs">
                              {analysis.highRisks} altos
                            </Badge>
                          )}
                          {analysis.criticalRisks === 0 && analysis.highRisks === 0 && (
                            <Badge className="bg-green-500 text-xs">OK</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="body-small font-light">
                        {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {/* Ver Resultados da Análise */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/analise-contratos/${analysis.id}`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-emerald-100">
                                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent><p>Ver Resultados</p></TooltipContent>
                          </Tooltip>
                          
                          {/* Ver Contrato Original */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-blue-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewDocumentId(analysis.documentId);
                                  setIsViewDocumentOpen(true);
                                }}
                              >
                                <FileText className="w-4 h-4 text-blue-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Ver Contrato</p></TooltipContent>
                          </Tooltip>
                          
                          {/* Editar Resultado (apenas consultores) */}
                          {isConsultant && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/analise-contratos/${analysis.id}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-amber-100">
                                    <Pencil className="w-4 h-4 text-amber-600" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent><p>Editar Resultado</p></TooltipContent>
                            </Tooltip>
                          )}
                          
                          {/* Ver Plano de Ação */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/analise-contratos/${analysis.id}/plano-acao`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-purple-100">
                                  <ClipboardList className="w-4 h-4 text-purple-600" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent><p>Plano de Ação</p></TooltipContent>
                          </Tooltip>
                          
                          {/* Gerar Relatório */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/analise-contratos/${analysis.id}?acao=relatorio`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-indigo-100">
                                  <FileOutput className="w-4 h-4 text-indigo-600" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent><p>Gerar Relatório</p></TooltipContent>
                          </Tooltip>
                          
                          {/* Compartilhar */}
                          <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-teal-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShareAnalysisId(analysis.id);
                                    setIsShareModalOpen(true);
                                  }}
                                >
                                  <Share2 className="w-4 h-4 text-teal-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Compartilhar</p></TooltipContent>
                            </Tooltip>
                          
                          {/* Excluir */}
                          {isConsultant && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(analysis.id);
                                    setDeleteConfirmName(analysis.contractName);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Excluir</p></TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </TooltipProvider>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Scale className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-light">Nenhuma análise encontrada</p>
                {isConsultant && selectedOrgId && (
                  <p className="text-sm mt-2 font-light">
                    Clique em "Nova Análise" para começar
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Visualização de Documento */}
      <Dialog open={isViewDocumentOpen} onOpenChange={setIsViewDocumentOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Visualizar Contrato
            </DialogTitle>
            <DialogDescription>
              Documento original utilizado na análise
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-[60vh] bg-gray-100 rounded-lg overflow-hidden">
            {isLoadingDocUrl ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-2 text-muted-foreground">Carregando documento...</span>
              </div>
            ) : documentUrl?.url ? (
              <iframe
                src={documentUrl.url}
                className="w-full h-[60vh] border-0"
                title="Visualização do Contrato"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Não foi possível carregar o documento</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDocumentOpen(false)}
            >
              Fechar
            </Button>
            {documentUrl?.url && (
              <Button
                onClick={() => window.open(documentUrl.url, '_blank')}
                className="bg-gradient-to-r from-purple-600 to-violet-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Abrir em Nova Aba
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Compartilhamento */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-teal-600" />
              Compartilhar Análise
            </DialogTitle>
            <DialogDescription>
              Gere um link público para compartilhar os resultados desta análise
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {shareLink ? (
              <>
                <div className="space-y-2">
                  <Label>Link de Compartilhamento</Label>
                  <div className="flex gap-2">
                    <Input
                      value={shareLink}
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink);
                        toast.success("Link copiado para a área de transferência!");
                      }}
                    >
                      <ClipboardList className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este link permite visualização pública dos resultados da análise
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(shareLink, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const subject = encodeURIComponent('Análise de Contrato LGPD');
                      const body = encodeURIComponent(`Olá,\n\nCompartilho com você os resultados da análise de contrato LGPD:\n\n${shareLink}\n\nAtenciosamente`);
                      window.open(`mailto:?subject=${subject}&body=${body}`);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Enviar por Email
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Clique no botão abaixo para gerar um link público de compartilhamento
                </p>
                <Button
                  onClick={() => {
                    if (shareAnalysisId) {
                      generateShareLinkMutation.mutate({ analysisId: shareAnalysisId });
                    }
                  }}
                  disabled={generateShareLinkMutation.isPending}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600"
                >
                  {generateShareLinkMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Gerar Link de Compartilhamento
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsShareModalOpen(false);
                setShareLink("");
                setShareAnalysisId(null);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Progresso de Análise */}
      <AnalysisProgressModal
        isOpen={isProgressModalOpen}
        analyses={analysisProgress}
        overallProgress={overallProgress}
      />

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) { setDeleteConfirmId(null); setDeleteConfirmName(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a análise <strong>{deleteConfirmName}</strong>? Esta ação removerá permanentemente todos os dados associados, incluindo cláusulas, mapeamentos, riscos e plano de ação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteAnalysisMutation.mutate({ id: deleteConfirmId });
                }
                setDeleteConfirmId(null);
                setDeleteConfirmName("");
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
