import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Upload, Link as LinkIcon, FileText, X, Check, AlertCircle, Loader2,
  Image, FileSpreadsheet, Presentation, Archive, Database
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  FILE_FORMAT_CATEGORIES,
  ALL_ACCEPTED_EXTENSIONS,
  validateUploadFile,
  getFileCategoryByExtension,
  UPLOAD_FORMATS_SHORT,
} from '../../../../shared/fileUploadConfig';

interface EvidenceUploadModalProps {
  assessmentId: number;
  questionId: string;
  questionTitle: string;
  requiredType: 'pdf' | 'link' | 'both' | 'file' | 'all';
  onUpload?: (evidence: { type: 'file' | 'link'; value: string; fileName?: string; fileKey?: string }) => void;
  onClose?: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Image: <Image className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  FileSpreadsheet: <FileSpreadsheet className="w-4 h-4" />,
  Presentation: <Presentation className="w-4 h-4" />,
  Archive: <Archive className="w-4 h-4" />,
  Database: <Database className="w-4 h-4" />,
};

export function EvidenceUploadModal({ 
  assessmentId, 
  questionId, 
  questionTitle, 
  requiredType, 
  onUpload, 
  onClose 
}: EvidenceUploadModalProps) {
  const [uploadType, setUploadType] = useState<'file' | 'link' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [linkValue, setLinkValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutation para upload de arquivo
  const uploadFileMutation = trpc.assessments.uploadEvidenceFile.useMutation();
  
  // Mutation para salvar evidência no banco
  const saveEvidenceMutation = trpc.assessments.uploadEvidence.useMutation();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    const validation = validateUploadFile(file.name, file.type, file.size);
    if (!validation.valid) {
      setError(validation.error || 'Formato de arquivo inválido');
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
        setUploadType('file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
        setUploadType('file');
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const getFileIcon = (fileName: string) => {
    const category = getFileCategoryByExtension(fileName);
    if (!category) return <FileText className="w-5 h-5 text-gray-500" />;
    const config = FILE_FORMAT_CATEGORIES[category];
    return <span className={config.color}>{ICON_MAP[config.icon] || <FileText className="w-4 h-4" />}</span>;
  };

  const handleUpload = async () => {
    if (!uploadType) {
      setError('Selecione um tipo de evidência');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      if (uploadType === 'file' && uploadedFile) {
        setUploadProgress(10);
        const fileBase64 = await fileToBase64(uploadedFile);
        
        setUploadProgress(30);
        
        // Upload para S3
        const uploadResult = await uploadFileMutation.mutateAsync({
          assessmentId,
          questionId,
          fileName: uploadedFile.name,
          fileBase64,
          contentType: uploadedFile.type || 'application/octet-stream',
        });

        setUploadProgress(70);

        // Salvar evidência no banco de dados
        await saveEvidenceMutation.mutateAsync({
          assessmentId,
          responseId: 0,
          questionId,
          type: 'pdf' as const, // mantém compatibilidade com o schema existente
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          fileKey: uploadResult.fileKey,
          description: `Evidência para: ${questionTitle}`,
        });

        setUploadProgress(100);

        onUpload?.({
          type: 'file',
          value: uploadResult.fileUrl,
          fileName: uploadResult.fileName,
          fileKey: uploadResult.fileKey,
        });
      } else if (uploadType === 'link') {
        try {
          new URL(linkValue);
        } catch {
          setError('Endereço inválido. Certifique-se de incluir http:// ou https://');
          setIsUploading(false);
          return;
        }

        await saveEvidenceMutation.mutateAsync({
          assessmentId,
          responseId: 0,
          questionId,
          type: 'link',
          fileUrl: linkValue,
          description: `Referência de evidência para: ${questionTitle}`,
        });

        onUpload?.({
          type: 'link',
          value: linkValue,
        });
      }

      setTimeout(() => onClose?.(), 500);
    } catch (err) {
      console.error('Erro no upload:', err);
      setError('Erro ao enviar arquivo. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const showFileOption = requiredType !== 'link';
  const showLinkOption = requiredType !== 'pdf' && requiredType !== 'file';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4">
      <Card className="w-full max-w-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Adicionar Evidência</h2>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{questionTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            disabled={isUploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          {/* Tipo de Evidência */}
          {!uploadType ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">Tipo de Evidência:</p>

              {showFileOption && (
                <button
                  onClick={() => setUploadType('file')}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-gray-900">Arquivo</p>
                      <p className="text-sm text-gray-600">{UPLOAD_FORMATS_SHORT}</p>
                    </div>
                  </div>
                </button>
              )}

              {showLinkOption && (
                <button
                  onClick={() => setUploadType('link')}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-semibold text-gray-900">Referência Externa</p>
                      <p className="text-sm text-gray-600">Endereço de documento externo</p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          ) : uploadType === 'file' ? (
            /* Upload de Arquivo */
            <div className="space-y-4">
              {!uploadedFile ? (
                <>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900 mb-1">Arraste o arquivo aqui</p>
                    <p className="text-sm text-gray-600 mb-3">ou clique para selecionar</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                    >
                      Selecionar Arquivo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALL_ACCEPTED_EXTENSIONS}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Formatos aceitos */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Formatos aceitos:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(FILE_FORMAT_CATEGORIES).map(([key, config]) => (
                        <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span className={config.color}>{ICON_MAP[config.icon]}</span>
                          <span>{config.label}</span>
                          <span className="text-gray-400">(até {config.maxSizeMB}MB)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <div className="flex-1 flex items-center gap-2">
                      {getFileIcon(uploadedFile.name)}
                      <div>
                        <p className="font-semibold text-green-900">{uploadedFile.name}</p>
                        <p className="text-sm text-green-700">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)}MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="text-green-600 hover:text-green-700"
                      disabled={isUploading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Barra de progresso */}
              {isUploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Enviando...</span>
                    <span className="text-blue-600 font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          ) : (
            /* Entrada de Referência */
            <div className="space-y-4">
              <input
                type="url"
                placeholder="https://exemplo.com/documento"
                value={linkValue}
                onChange={e => {
                  setLinkValue(e.target.value);
                  setError(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isUploading}
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => {
              if (uploadType && !isUploading) {
                setUploadType(null);
                setUploadedFile(null);
                setLinkValue('');
                setError(null);
              } else if (!isUploading) {
                onClose?.();
              }
            }}
            className="flex-1"
            disabled={isUploading}
          >
            {uploadType ? 'Voltar' : 'Cancelar'}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              isUploading ||
              (uploadType === 'file' && !uploadedFile) ||
              (uploadType === 'link' && !linkValue.trim())
            }
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
