import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  Trash2, 
  Download,
  Paperclip,
  X,
  Loader2,
  FileSpreadsheet,
  Presentation,
  Archive,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Formatos aceitos organizados por categoria
const ACCEPTED_FORMATS = {
  imagem: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif'],
    mimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml', 'image/tiff'],
    maxSizeMB: 10,
    icon: Image,
    label: 'Imagens',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  documento: {
    extensions: ['.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt', '.md'],
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text', 'application/rtf', 'text/plain', 'text/markdown'],
    maxSizeMB: 25,
    icon: FileText,
    label: 'Documentos',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  planilha: {
    extensions: ['.xls', '.xlsx', '.ods', '.csv'],
    mimes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.oasis.opendocument.spreadsheet', 'text/csv'],
    maxSizeMB: 25,
    icon: FileSpreadsheet,
    label: 'Planilhas',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  apresentacao: {
    extensions: ['.ppt', '.pptx', '.odp'],
    mimes: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.presentation'],
    maxSizeMB: 50,
    icon: Presentation,
    label: 'Apresenta\u00e7\u00f5es',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  compactado: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    mimes: ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/vnd.rar', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip'],
    maxSizeMB: 50,
    icon: Archive,
    label: 'Compactados',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  dados: {
    extensions: ['.json', '.xml', '.html'],
    mimes: ['application/json', 'application/xml', 'text/xml', 'text/html'],
    maxSizeMB: 10,
    icon: FileText,
    label: 'Dados',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
};

// Todas as extensões aceitas para o input file
const ALL_ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_FORMATS).flatMap(f => f.extensions).join(',');

// Extensões bloqueadas por segurança
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif', '.vbs', '.js', '.ws', '.wsf', '.ps1', '.sh', '.cgi', '.php', '.asp', '.aspx', '.jsp'];

function getFileCategory(mimeType: string): keyof typeof ACCEPTED_FORMATS | null {
  for (const [key, config] of Object.entries(ACCEPTED_FORMATS)) {
    if (config.mimes.includes(mimeType.toLowerCase())) {
      return key as keyof typeof ACCEPTED_FORMATS;
    }
  }
  return null;
}

function getFileIconComponent(mimeType: string | null) {
  if (!mimeType) return <File className="h-5 w-5 text-slate-400" />;
  const category = getFileCategory(mimeType);
  if (!category) return <File className="h-5 w-5 text-slate-400" />;
  const config = ACCEPTED_FORMATS[category];
  const IconComp = config.icon;
  return <IconComp className={`h-5 w-5 ${config.color}`} />;
}

function validateFile(file: File): { valid: boolean; error?: string; category?: string; maxSizeMB?: number } {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  
  // Verificar extensão bloqueada
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Arquivo "${ext}" bloqueado por motivos de seguranca.` };
  }
  
  // Verificar se o formato é aceito
  const category = getFileCategory(file.type);
  if (!category) {
    // Tentar pela extensão se o MIME não bater
    let foundCategory: string | null = null;
    for (const [key, config] of Object.entries(ACCEPTED_FORMATS)) {
      if (config.extensions.includes(ext)) {
        foundCategory = key;
        break;
      }
    }
    if (!foundCategory) {
      return { valid: false, error: `Formato "${ext}" nao aceito. Formatos permitidos: JPG, PNG, GIF, BMP, WebP, PDF, DOC, DOCX, XLS, XLSX, ODS, CSV, PPT, PPTX, ODP, ZIP, RAR, 7Z.` };
    }
  }
  
  const cat = category || 'documento';
  const config = ACCEPTED_FORMATS[cat as keyof typeof ACCEPTED_FORMATS];
  const maxBytes = config.maxSizeMB * 1024 * 1024;
  
  if (file.size > maxBytes) {
    return { valid: false, error: `Arquivo excede o limite de ${config.maxSizeMB}MB para ${config.label.toLowerCase()}. Tamanho atual: ${(file.size / (1024 * 1024)).toFixed(1)}MB.` };
  }
  
  return { valid: true, category: cat, maxSizeMB: config.maxSizeMB };
}

interface EvidenceUploadProps {
  organizationId: number;
  assessmentType: 'compliance' | 'third_party' | 'contract_analysis';
  assessmentId: number;
  questionId?: string;
  onUploadComplete?: () => void;
}

export function EvidenceUpload({ 
  organizationId, 
  assessmentType, 
  assessmentId, 
  questionId,
  onUploadComplete 
}: EvidenceUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: evidences, refetch } = trpc.evidence.listByAssessment.useQuery(
    { assessmentType, assessmentId },
    { enabled: assessmentId > 0 }
  );
  
  const uploadMutation = trpc.evidence.upload.useMutation({
    onSuccess: () => {
      toast.success('Evidencia enviada com sucesso!');
      setSelectedFile(null);
      setDescription('');
      setValidationError(null);
      setIsOpen(false);
      refetch();
      onUploadComplete?.();
    },
    onError: (error) => {
      toast.error('Erro ao enviar evidencia: ' + error.message);
    },
  });
  
  const deleteMutation = trpc.evidence.delete.useMutation({
    onSuccess: () => {
      toast.success('Evidencia removida!');
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  const processFile = useCallback((file: File) => {
    setValidationError(null);
    const result = validateFile(file);
    if (!result.valid) {
      setValidationError(result.error || 'Formato invalido.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }, []);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      uploadMutation.mutate({
        organizationId,
        assessmentType,
        assessmentId,
        questionId,
        fileName: selectedFile.name,
        fileData: base64,
        mimeType: selectedFile.type || 'application/octet-stream',
        description: description || undefined,
      });
    };
    reader.readAsDataURL(selectedFile);
  };
  
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const filteredEvidences = questionId 
    ? evidences?.filter(e => e.questionId === questionId)
    : evidences;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            Evidencias ({filteredEvidences?.length || 0})
          </span>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setSelectedFile(null);
            setValidationError(null);
            setDescription('');
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Anexar Evidencia
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Evidencia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Tipo de Evidência - formatos aceitos */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Formatos aceitos:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ACCEPTED_FORMATS).map(([key, config]) => {
                    const IconComp = config.icon;
                    return (
                      <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-md ${config.bgColor}`}>
                        <IconComp className={`h-4 w-4 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700">{config.label}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {config.extensions.join(', ')} - ate {config.maxSizeMB}MB
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Área de upload com drag-and-drop */}
              <div className="space-y-2">
                <Label>Arquivo</Label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging 
                      ? 'border-violet-400 bg-violet-50' 
                      : validationError 
                        ? 'border-red-300 bg-red-50' 
                        : selectedFile 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-slate-200 hover:border-violet-300'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex items-center gap-2">
                        {getFileIconComponent(selectedFile.type)}
                        <div className="text-left">
                          <span className="text-sm font-medium text-slate-700 block">{selectedFile.name}</span>
                          <span className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Valido
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setValidationError(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className={`h-8 w-8 mx-auto ${isDragging ? 'text-violet-500' : 'text-slate-400'}`} />
                      <p className="text-sm text-slate-600">
                        {isDragging ? 'Solte o arquivo aqui' : 'Clique para selecionar ou arraste um arquivo'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Imagens, documentos, planilhas, apresentacoes ou compactados
                      </p>
                    </div>
                  )}
                </div>

                {/* Mensagem de erro de validação */}
                {validationError && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{validationError}</p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept={ALL_ACCEPTED_EXTENSIONS}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descricao (opcional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o documento anexado..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="gap-2"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Confirmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Lista de evidências */}
      {filteredEvidences && filteredEvidences.length > 0 && (
        <div className="space-y-2">
          {filteredEvidences.map((evidence) => (
            <Card key={evidence.id} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIconComponent(evidence.mimeType)}
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {evidence.fileName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{formatFileSize(evidence.fileSize)}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(evidence.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        {evidence.mimeType && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs py-0 h-4">
                              {(() => {
                                const cat = getFileCategory(evidence.mimeType);
                                if (cat) {
                                  const config = ACCEPTED_FORMATS[cat];
                                  return config.label;
                                }
                                return evidence.mimeType.split('/').pop()?.toUpperCase() || 'Arquivo';
                              })()}
                            </Badge>
                          </>
                        )}
                      </div>
                      {evidence.description && (
                        <p className="text-xs text-slate-500 mt-1">
                          {evidence.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={evidence.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" title="Baixar arquivo">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => deleteMutation.mutate({ id: evidence.id })}
                      disabled={deleteMutation.isPending}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default EvidenceUpload;
