import React, { useState, useRef } from "react";
import { Upload, X, File, FileText, FileSpreadsheet, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EvidenceUploadWidgetProps {
  assessmentId: number;
  questionId: number;
  organizationId: number;
  onUploadSuccess?: (fileCount: number) => void;
  maxFiles?: number;
  maxFileSize?: number;
}

const ALLOWED_EXTENSIONS = [
  // Documentos
  "pdf", "doc", "docx", "odt", "rtf", "txt", "md",
  // Planilhas
  "xls", "xlsx", "ods", "csv",
  // Apresentações
  "ppt", "pptx", "odp",
  // Imagens
  "jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "tif",
  // Compactados
  "zip", "rar", "7z", "tar", "gz",
  // Dados
  "json", "xml", "html",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Obtém ícone baseado na extensão do arquivo
 */
function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  if (["doc", "docx", "odt", "rtf", "txt", "md"].includes(ext || "")) {
    return <FileText className="w-5 h-5 text-blue-500" />;
  }
  if (["xls", "xlsx", "ods", "csv"].includes(ext || "")) {
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  }
  if (["ppt", "pptx", "odp"].includes(ext || "")) {
    return <Presentation className="w-5 h-5 text-orange-500" />;
  }
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "tif"].includes(ext || "")) {
    return <File className="w-5 h-5 text-purple-500" />;
  }

  return <File className="w-5 h-5 text-gray-500" />;
}

/**
 * Formata tamanho de arquivo em bytes para formato legível
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Valida arquivo antes do upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Aceitos: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Arquivo excede 50MB. Tamanho: ${formatFileSize(file.size)}`,
    };
  }

  return { valid: true };
}

export const EvidenceUploadWidget: React.FC<EvidenceUploadWidgetProps> = ({
  assessmentId,
  questionId,
  organizationId,
  onUploadSuccess,
  maxFiles = 5,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ name: string; size: number; id: string }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddMoreFiles = uploadedFiles.length < maxFiles;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canAddMoreFiles) {
      setErrorMessage(`Máximo de ${maxFiles} arquivos por pergunta`);
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    if (!canAddMoreFiles) {
      setErrorMessage(`Máximo de ${maxFiles} arquivos por pergunta`);
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    // Validar cada arquivo
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = validateFile(file);

      if (!validation.valid) {
        setErrorMessage(validation.error || "Arquivo inválido");
        setTimeout(() => setErrorMessage(null), 5000);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Simular upload (em produção, seria chamado o endpoint tRPC)
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 30;
        });
      }, 200);

      // Aqui seria feito o upload real via tRPC
      // await trpc.seusdadosEvidence.uploadEvidence.mutate({...})

      // Simular delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Adicionar arquivos à lista
      const newFiles = validFiles.map((file) => ({
        name: file.name,
        size: file.size,
        id: `${Date.now()}-${Math.random()}`,
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);

      // Mostrar mensagem de sucesso
      setErrorMessage(null);

      onUploadSuccess?.(newFiles.length);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      setErrorMessage(`Erro no upload: ${message}`);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const remainingSlots = maxFiles - uploadedFiles.length;

  return (
    <div className="space-y-4 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
      {/* Título */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          Anexar Evidências
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Máximo {maxFiles} arquivos • Até 50MB cada
        </p>
      </div>

      {/* Área de Upload */}
      {canAddMoreFiles && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-white hover:border-gray-400"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
            className="hidden"
            disabled={isUploading}
          />

          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Arraste arquivos aqui ou{" "}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50"
                >
                  clique para selecionar
                </button>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {remainingSlots} espaço(s) disponível(is)
              </p>
            </div>
          </div>

          {/* Barra de Progresso */}
          {isUploading && (
            <div className="mt-4 w-full">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Enviando... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mensagem de Erro */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Lista de Arquivos */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">
            Arquivos anexados ({uploadedFiles.length}/{maxFiles})
          </p>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(file.name)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFile(file.id)}
                  disabled={isUploading}
                  className="p-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Remover arquivo"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem quando limite atingido */}
      {!canAddMoreFiles && uploadedFiles.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            Limite de {maxFiles} arquivos atingido. Remova um arquivo para
            adicionar outro.
          </p>
        </div>
      )}

      {/* Nenhum arquivo */}
      {uploadedFiles.length === 0 && !isUploading && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-500">
            Nenhuma evidência anexada ainda
          </p>
        </div>
      )}
    </div>
  );
};
