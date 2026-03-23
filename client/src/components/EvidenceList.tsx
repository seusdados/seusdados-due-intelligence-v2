import React from "react";
import { Download, Trash2, File, FileText, FileSpreadsheet, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SmartDPOButton } from './SmartDPOButton';

interface Evidence {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileExtension: string;
  uploadedAt: string;
  uploadedById: number;
  storageUrl: string;
}

interface EvidenceListProps {
  evidences: Evidence[];
  isLoading?: boolean;
  onDelete?: (evidenceId: number) => void;
  onDownload?: (evidence: Evidence) => void;
}

/**
 * Obtém ícone baseado na extensão do arquivo
 */
function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  if (["doc", "docx"].includes(ext || "")) {
    return <FileText className="w-5 h-5 text-blue-500" />;
  }
  if (["xls", "xlsx"].includes(ext || "")) {
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  }
  if (["ppt", "pptx"].includes(ext || "")) {
    return <Presentation className="w-5 h-5 text-orange-500" />;
  }
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
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
 * Formata data relativa
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return "Data inválida";
  }
}

export const EvidenceList: React.FC<EvidenceListProps> = ({
  evidences,
  isLoading = false,
  onDelete,
  onDownload,
}) => {
  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-600">Carregando evidências...</p>
      </div>
    );
  }

  if (evidences.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-600">Nenhuma evidência anexada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-700 px-4 pt-4">
        Evidências anexadas ({evidences.length})
      </p>
      <div className="space-y-2 px-4 pb-4">
        {evidences.map((evidence) => (
          <div
            key={evidence.id}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {getFileIcon(evidence.fileName)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {evidence.fileName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500">
                    {formatFileSize(evidence.fileSize)}
                  </p>
                  <span className="text-gray-300">•</span>
                  <p className="text-xs text-gray-500">
                    {formatDate(evidence.uploadedAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <SmartDPOButton
                context={{
                  module: 'Due Diligence',
                  page: 'Evidências',
                  entityType: 'evidence',
                  entityId: evidence.id,
                  entityName: evidence.fileName,
                  deepLink: `${window.location.pathname}#evidencia-${evidence.id}`,
                  snapshot: {
                    fileName: evidence.fileName,
                    fileType: evidence.fileType,
                    fileSize: evidence.fileSize,
                    uploadedAt: evidence.uploadedAt,
                  },
                }}
                variant="ghost"
                size="sm"
                iconOnly
              />
              <button
                onClick={() => onDownload?.(evidence)}
                className="p-2 hover:bg-blue-50 rounded transition-colors"
                title="Baixar arquivo"
              >
                <Download className="w-4 h-4 text-blue-600" />
              </button>
              <button
                onClick={() => onDelete?.(evidence.id)}
                className="p-2 hover:bg-red-50 rounded transition-colors"
                title="Remover arquivo"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
