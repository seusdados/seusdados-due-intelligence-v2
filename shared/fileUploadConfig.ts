/**
 * Configuração centralizada de formatos de arquivo aceitos para upload.
 * 
 * TODAS as interfaces de upload do sistema devem importar deste arquivo
 * para garantir consistência e padronização.
 * 
 * Alterações aqui se propagam automaticamente para:
 * - EvidenceUploadModal (avaliações)
 * - EvidenceUpload (evidências gerais)
 * - EvidenceUploadWidget
 * - ActionPlanTab (plano de ação)
 * - ConformidadeAvaliacao
 * - ContractAnalysis (upload de contratos)
 * - QuestionnaireWithEvidence
 * - NovoTicketCliente
 */

export interface FileFormatCategory {
  extensions: string[];
  mimes: string[];
  maxSizeMB: number;
  label: string;
  icon: string; // nome do ícone lucide-react
  color: string;
  bgColor: string;
}

/**
 * Categorias de formatos aceitos com extensões, MIME types e limites de tamanho.
 */
export const FILE_FORMAT_CATEGORIES: Record<string, FileFormatCategory> = {
  imagem: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.tif'],
    mimes: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'image/bmp', 'image/webp', 'image/svg+xml', 'image/tiff',
    ],
    maxSizeMB: 10,
    label: 'Imagens',
    icon: 'Image',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  documento: {
    extensions: ['.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt', '.md'],
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'application/rtf',
      'text/plain',
      'text/markdown',
    ],
    maxSizeMB: 25,
    label: 'Documentos',
    icon: 'FileText',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  planilha: {
    extensions: ['.xls', '.xlsx', '.ods', '.csv'],
    mimes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet',
      'text/csv',
    ],
    maxSizeMB: 25,
    label: 'Planilhas',
    icon: 'FileSpreadsheet',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  apresentacao: {
    extensions: ['.ppt', '.pptx', '.odp'],
    mimes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
    ],
    maxSizeMB: 50,
    label: 'Apresentações',
    icon: 'Presentation',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  compactado: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    mimes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
    ],
    maxSizeMB: 50,
    label: 'Compactados',
    icon: 'Archive',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  dados: {
    extensions: ['.json', '.xml', '.html'],
    mimes: [
      'application/json',
      'application/xml',
      'text/xml',
      'text/html',
    ],
    maxSizeMB: 10,
    label: 'Dados',
    icon: 'Database',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
};

/**
 * Todas as extensões aceitas (para o atributo accept do input file).
 * Exemplo: ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,..."
 */
export const ALL_ACCEPTED_EXTENSIONS: string = Object.values(FILE_FORMAT_CATEGORIES)
  .flatMap(cat => cat.extensions)
  .join(',');

/**
 * Todas as extensões aceitas como array (sem ponto).
 * Exemplo: ["pdf", "doc", "docx", ...]
 */
export const ALL_ACCEPTED_EXTENSIONS_ARRAY: string[] = Object.values(FILE_FORMAT_CATEGORIES)
  .flatMap(cat => cat.extensions.map(ext => ext.replace('.', '')));

/**
 * Todos os MIME types aceitos.
 */
export const ALL_ACCEPTED_MIMES: string[] = Object.values(FILE_FORMAT_CATEGORIES)
  .flatMap(cat => cat.mimes);

/**
 * Extensões bloqueadas por segurança (executáveis, scripts).
 */
export const BLOCKED_EXTENSIONS: string[] = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.vbs', '.js', '.ws', '.wsf', '.ps1', '.sh', '.cgi',
  '.php', '.asp', '.aspx', '.jsp',
];

/**
 * Tamanho máximo padrão de arquivo (em bytes).
 */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Obtém a categoria de um arquivo a partir do MIME type.
 */
export function getFileCategoryByMime(mimeType: string): string | null {
  const mime = mimeType.toLowerCase();
  for (const [category, config] of Object.entries(FILE_FORMAT_CATEGORIES)) {
    if (config.mimes.includes(mime)) {
      return category;
    }
  }
  return null;
}

/**
 * Obtém a categoria de um arquivo a partir da extensão.
 */
export function getFileCategoryByExtension(fileName: string): string | null {
  const ext = '.' + (fileName.split('.').pop()?.toLowerCase() || '');
  for (const [category, config] of Object.entries(FILE_FORMAT_CATEGORIES)) {
    if (config.extensions.includes(ext)) {
      return category;
    }
  }
  return null;
}

/**
 * Valida um arquivo contra as regras de formato, tamanho e segurança.
 * Retorna { valid: true } ou { valid: false, error: "mensagem" }.
 */
export function validateUploadFile(
  fileName: string,
  mimeType: string,
  fileSize: number,
): { valid: boolean; error?: string } {
  // 1. Verificar extensão perigosa
  const ext = '.' + (fileName.split('.').pop()?.toLowerCase() || '');
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `O formato "${ext}" não é permitido por motivos de segurança.` };
  }

  // 2. Verificar categoria pelo MIME type
  const category = getFileCategoryByMime(mimeType);
  if (!category) {
    // Tentar pela extensão como fallback
    const catByExt = getFileCategoryByExtension(fileName);
    if (!catByExt) {
      const allLabels = Object.values(FILE_FORMAT_CATEGORIES).map(c => c.label);
      return {
        valid: false,
        error: `Formato não reconhecido. Formatos aceitos: ${allLabels.join(', ')} (${ALL_ACCEPTED_EXTENSIONS_ARRAY.join(', ')}).`,
      };
    }
  }

  // 3. Verificar tamanho
  const cat = category || getFileCategoryByExtension(fileName)!;
  const config = FILE_FORMAT_CATEGORIES[cat];
  if (config) {
    const maxBytes = config.maxSizeMB * 1024 * 1024;
    if (fileSize > maxBytes) {
      return {
        valid: false,
        error: `Arquivo excede o tamanho máximo de ${config.maxSizeMB}MB para ${config.label.toLowerCase()}. Tamanho atual: ${(fileSize / (1024 * 1024)).toFixed(1)}MB.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Texto descritivo dos formatos aceitos para exibição ao usuário.
 */
export const UPLOAD_FORMATS_DESCRIPTION = Object.values(FILE_FORMAT_CATEGORIES)
  .map(cat => `${cat.label} (${cat.extensions.join(', ')}) até ${cat.maxSizeMB}MB`)
  .join(' | ');

/**
 * Texto curto dos formatos aceitos.
 */
export const UPLOAD_FORMATS_SHORT = 'Documentos, planilhas, imagens, apresentações, compactados e dados';

/**
 * Subset de extensões para upload de contratos (documentos de texto apenas).
 */
export const CONTRACT_UPLOAD_EXTENSIONS = '.pdf,.doc,.docx,.odt,.rtf,.txt';

/**
 * Subset de extensões para upload de certificados digitais.
 */
export const CERTIFICATE_UPLOAD_EXTENSIONS = '.pfx,.p12';

/**
 * Subset de extensões para importação em massa (planilhas).
 */
export const BULK_IMPORT_EXTENSIONS = '.csv,.xlsx,.xls';
