import { useState, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Folder, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Search, 
  Plus, 
  ChevronRight, 
  Home,
  FolderPlus,
  FileUp,
  Share2,
  Eye,
  MoreVertical,
  Building2,
  Shield,
  FileCheck,
  BarChart,
  Lock,
  FolderOpen,
  ArrowLeft,
  RefreshCw,
  HardDrive,
  File,
  Image,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Archive,
  History,
  Filter,
  Calendar,
  SlidersHorizontal,
  X,
  Headphones,
  AlertCircle
} from "lucide-react";
import { AcionarDPO } from "@/components/AcionarDPO";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type SpaceType = "organization" | "seusdados";

interface GedFolder {
  id: number;
  name: string;
  description?: string | null;
  spaceType: string;
  organizationId?: number | null;
  parentFolderId?: number | null;
  path?: string;
  depth?: number;
  isSystemFolder?: number | boolean;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
  createdById?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

interface GedDocument {
  id: number;
  name: string;
  description?: string | null;
  spaceType?: string;
  organizationId?: number | null;
  folderId?: number;
  fileName?: string;
  fileKey?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  fileExtension?: string | null;
  version?: number;
  isLatestVersion?: boolean | number;
  status?: string;
  isSharedWithClient?: boolean | number;
  sharedAt?: Date | string | null;
  sharedById?: number | null;
  tags?: string[] | unknown | null;
  linkedEntityType?: string | null;
  linkedEntityId?: number | null;
  createdById?: number;
  lastModifiedById?: number | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  metadata?: unknown;
  previousVersionId?: number | null;
  deletedAt?: Date | string | null;
  [key: string]: unknown;
}

// Mapeamento de ícones
const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  FileText,
  Shield,
  FileCheck,
  BarChart,
  Lock,
  Folder,
  FolderOpen,
  Building2,
  File,
};

// Ícone por extensão de arquivo
function getFileIcon(mimeType: string, extension?: string | null) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("spreadsheet") || extension === "xlsx" || extension === "xls") return FileSpreadsheet;
  if (mimeType.includes("presentation") || extension === "pptx" || extension === "ppt") return Presentation;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return Archive;
  if (mimeType.includes("code") || mimeType.includes("javascript") || mimeType.includes("json")) return FileCode;
  return File;
}

// Formatar tamanho de arquivo
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function GED() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const params = useParams<{ organizationId?: string }>();
  const [location, setLocation] = useLocation();
  
  // Determinar espaço e organização baseado na URL
  // /ged = GED Seusdados (sempre roxo, documentos da consultoria)
  // /ged-cliente = GED do Cliente selecionado (sempre azul, documentos do cliente)
  // /ged/organizacao/:id = GED de organização específica
  const urlOrganizationId = params.organizationId ? parseInt(params.organizationId) : null;
  const isClientGedRoute = location.startsWith('/ged-cliente') || !!urlOrganizationId;
  
  // Para /ged-cliente, usa a organização selecionada no sidebar
  // Para /ged, sempre mostra GED Seusdados (ignora organização selecionada)
  const organizationId = isClientGedRoute ? (urlOrganizationId || selectedOrganization?.id || null) : null;
  const isClientGed = isClientGedRoute && !!organizationId;
  const spaceType: SpaceType = isClientGed ? "organization" : "seusdados";
  
  // Estados
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<GedFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState<string>("Folder");
  const [newFolderColor, setNewFolderColor] = useState<string>("#8B5CF6");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadTargetOrganizationId, setUploadTargetOrganizationId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para drag and drop
  const [draggedItem, setDraggedItem] = useState<{ type: 'document' | 'folder'; id: number; name: string } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null>(null);
  
  // Estados para preview de documentos
  const [previewDocument, setPreviewDocument] = useState<GedDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Estados para renomeação inline
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  
  // Estados para modal de versões
  const [showVersionsDialog, setShowVersionsDialog] = useState(false);
  const [selectedDocumentForVersions, setSelectedDocumentForVersions] = useState<GedDocument | null>(null);
  
  // Estados para filtros avançados
  const [showFilters, setShowFilters] = useState(false);
  const [filterFileType, setFilterFileType] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterSizeMin, setFilterSizeMin] = useState<string>("");
  const [filterSizeMax, setFilterSizeMax] = useState<string>("");
  const [filterTags, setFilterTags] = useState<string>("");
  
  // Estados para modal de confirmacao de exclusao
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<GedFolder | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<GedDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Queries
  const { data: organization } = trpc.organization.getById.useQuery(
    { id: organizationId! },
    { enabled: !!organizationId }
  );

  // Query para listar todas as organizações (para consultores no GED Seusdados)
  const { data: allOrganizations } = trpc.organization.list.useQuery(
    undefined,
    { enabled: !isClientGed && (user?.role === 'admin_global' || user?.role === 'consultor') }
  );
  
  const { data: folders, isLoading: loadingFolders, refetch: refetchFolders } = trpc.ged.listFolders.useQuery({
    spaceType,
    organizationId,
    parentFolderId: currentFolderId,
  });
  
  const { data: documents, isLoading: loadingDocuments, refetch: refetchDocuments } = trpc.ged.listDocuments.useQuery(
    { folderId: currentFolderId! },
    { enabled: currentFolderId !== null }
  );
  
  const { data: searchResults, isLoading: loadingSearch } = trpc.ged.searchDocuments.useQuery(
    { spaceType, organizationId, searchTerm },
    { enabled: isSearching && searchTerm.length >= 2 }
  );
  
  const { data: stats } = trpc.ged.getStats.useQuery({ spaceType, organizationId });
  
  // Query de versões de documento
  const { data: documentVersions, isLoading: loadingVersions, refetch: refetchVersions } = trpc.ged.listVersions.useQuery(
    { documentId: selectedDocumentForVersions?.id ?? 0 },
    { enabled: showVersionsDialog && !!selectedDocumentForVersions }
  );
  
  // Filtrar documentos com base nos filtros avançados
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    
    return documents.filter((doc) => {
      // Filtro por tipo de arquivo
      if (filterFileType && filterFileType !== "all") {
        const mimeType = doc.mimeType.toLowerCase();
        const ext = doc.fileExtension?.toLowerCase() || "";
        
        switch (filterFileType) {
          case "pdf":
            if (!mimeType.includes("pdf")) return false;
            break;
          case "image":
            if (!mimeType.startsWith("image/")) return false;
            break;
          case "document":
            if (!mimeType.includes("word") && !mimeType.includes("document") && ext !== "doc" && ext !== "docx") return false;
            break;
          case "spreadsheet":
            if (!mimeType.includes("spreadsheet") && !mimeType.includes("excel") && ext !== "xls" && ext !== "xlsx") return false;
            break;
          case "presentation":
            if (!mimeType.includes("presentation") && !mimeType.includes("powerpoint") && ext !== "ppt" && ext !== "pptx") return false;
            break;
          case "archive":
            if (!mimeType.includes("zip") && !mimeType.includes("rar") && !mimeType.includes("7z") && !mimeType.includes("tar")) return false;
            break;
          case "other":
            if (mimeType.includes("pdf") || mimeType.startsWith("image/") || mimeType.includes("word") || 
                mimeType.includes("spreadsheet") || mimeType.includes("presentation") || mimeType.includes("zip")) return false;
            break;
        }
      }
      
      // Filtro por data de criação
      if (filterDateFrom) {
        const docDate = new Date(doc.createdAt);
        const fromDate = new Date(filterDateFrom);
        if (docDate < fromDate) return false;
      }
      if (filterDateTo) {
        const docDate = new Date(doc.createdAt);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (docDate > toDate) return false;
      }
      
      // Filtro por tamanho (em KB)
      if (filterSizeMin) {
        const minBytes = parseFloat(filterSizeMin) * 1024;
        if (doc.fileSize < minBytes) return false;
      }
      if (filterSizeMax) {
        const maxBytes = parseFloat(filterSizeMax) * 1024;
        if (doc.fileSize > maxBytes) return false;
      }
      
      // Filtro por tags
      if (filterTags) {
        const searchTags = filterTags.toLowerCase().split(",").map(t => t.trim()).filter(t => t);
        if (searchTags.length > 0) {
          const docTags = (doc.tags as string[] || []).map(t => t.toLowerCase());
          const hasMatchingTag = searchTags.some(searchTag => 
            docTags.some(docTag => docTag.includes(searchTag))
          );
          if (!hasMatchingTag) return false;
        }
      }
      
      return true;
    });
  }, [documents, filterFileType, filterDateFrom, filterDateTo, filterSizeMin, filterSizeMax, filterTags]);
  
  // Mutations
  const createFolderMutation = trpc.ged.createFolder.useMutation({
    onSuccess: () => {
      toast.success("Pasta criada com sucesso!");
      setShowNewFolderDialog(false);
      setNewFolderName("");
      setNewFolderDescription("");
      refetchFolders();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar pasta");
    },
  });
  
  const uploadDocumentMutation = trpc.ged.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento enviado com sucesso!");
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadName("");
      setUploadDescription("");
      setUploadTags("");
      setUploadTargetOrganizationId(null);
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar documento");
    },
  });

  // Mutation para upload direto no GED do cliente (para consultores)
  const uploadToClientGedMutation = trpc.ged.uploadToClientGed.useMutation({
    onSuccess: (data) => {
      toast.success(`Documento enviado para o GED do cliente! Pasta: ${data.folderName}`);
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadName("");
      setUploadDescription("");
      setUploadTags("");
      setUploadTargetOrganizationId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar documento para o cliente");
    },
  });
  
  const deleteFolderMutation = trpc.ged.deleteFolder.useMutation({
    onSuccess: () => {
      toast.success("Pasta excluída com sucesso!");
      setShowDeleteConfirm(false);
      setFolderToDelete(null);
      setIsDeleting(false);
      refetchFolders();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir pasta");
      setIsDeleting(false);
    },
  });
  
  const deleteDocumentMutation = trpc.ged.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento excluído com sucesso!");
      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
      setIsDeleting(false);
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir documento");
      setIsDeleting(false);
    },
  });
  
  const shareDocumentMutation = trpc.ged.shareWithClient.useMutation({
    onSuccess: (data) => {
      toast.success(data.isSharedWithClient ? "Documento compartilhado com o cliente!" : "Compartilhamento removido!");
      refetchDocuments();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao compartilhar documento");
    },
  });
  
  const moveDocumentMutation = trpc.ged.moveDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento movido com sucesso!");
      refetchDocuments();
      refetchFolders();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao mover documento");
    },
  });
  
  const initOrgFoldersMutation = trpc.ged.initializeOrganizationFolders.useMutation({
    onSuccess: () => {
      toast.success("Pastas padrão criadas com sucesso!");
      refetchFolders();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar pastas padrão");
    },
  });
  
  const initSeusdadosFoldersMutation = trpc.ged.initializeSeusdadosFolders.useMutation({
    onSuccess: () => {
      toast.success("Pastas padrão do GED Seusdados criadas com sucesso!");
      refetchFolders();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar pastas padrão");
    },
  });
  
  // Mutations de renomeação
  const renameFolderMutation = trpc.ged.renameFolder.useMutation({
    onSuccess: () => {
      toast.success("Pasta renomeada com sucesso!");
      setEditingFolderId(null);
      setEditingName("");
      refetchFolders();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao renomear pasta");
    },
  });
  
  const renameDocumentMutation = trpc.ged.renameDocument.useMutation({
    onSuccess: () => {
      toast.success("Documento renomeado com sucesso!");
      setEditingDocumentId(null);
      setEditingName("");
      refetchDocuments();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao renomear documento");
    },
  });
  
  const restoreVersionMutation = trpc.ged.restoreVersion.useMutation({
    onSuccess: () => {
      toast.success("Versão restaurada com sucesso!");
      setShowVersionsDialog(false);
      setSelectedDocumentForVersions(null);
      refetchDocuments();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao restaurar versão");
    },
  });
  
  // Detecta se estamos dentro da pasta Evidências (ou subpastas dela)
  const isInsideEvidencias = useMemo(() => {
    return breadcrumbs.some(f => f.name === "Evidências");
  }, [breadcrumbs]);

  // Handlers
  const handleFolderClick = useCallback((folder: GedFolder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, folder]);
    setIsSearching(false);
    setSearchTerm("");
  }, []);
  
  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setBreadcrumbs([]);
    } else {
      const folder = breadcrumbs[index];
      setCurrentFolderId(folder.id);
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    }
    setIsSearching(false);
    setSearchTerm("");
  }, [breadcrumbs]);
  
  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) {
      toast.error("Nome da pasta é obrigatório");
      return;
    }
    createFolderMutation.mutate({
      name: newFolderName.trim(),
      description: newFolderDescription.trim() || undefined,
      spaceType,
      organizationId,
      parentFolderId: currentFolderId,
      icon: newFolderIcon,
      color: newFolderColor,
    });
  }, [newFolderName, newFolderDescription, spaceType, organizationId, currentFolderId, newFolderIcon, newFolderColor, createFolderMutation]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadName(file.name.replace(/\.[^/.]+$/, "")); // Remove extensão
    }
  }, []);
  
  // Handlers de Drag and Drop
  const handleDragStart = useCallback((e: React.DragEvent, type: 'document' | 'folder', id: number, name: string) => {
    setDraggedItem({ type, id, name });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id, name }));
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem && draggedItem.type === 'document') {
      setDragOverFolderId(folderId);
      e.dataTransfer.dropEffect = 'move';
    }
  }, [draggedItem]);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolderId(null);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent, targetFolderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    
    if (draggedItem && draggedItem.type === 'document') {
      moveDocumentMutation.mutate({
        documentId: draggedItem.id,
        targetFolderId,
      });
    }
    setDraggedItem(null);
  }, [draggedItem, moveDocumentMutation]);
  
  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverFolderId(null);
  }, []);
  
  const handleUpload = useCallback(async () => {
    if (!uploadFile || !currentFolderId) {
      toast.error("Selecione um arquivo e uma pasta");
      return;
    }
    
    // Se estiver no GED Seusdados e selecionou uma organização, fazer upload para o GED do cliente
    if (!isClientGed && uploadTargetOrganizationId) {
      // Converter arquivo para base64 e fazer upload para o GED do cliente
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        uploadToClientGedMutation.mutate({
          name: uploadName || uploadFile.name,
          description: uploadDescription || undefined,
          organizationId: uploadTargetOrganizationId,
          fileData: base64,
          fileName: uploadFile.name,
          mimeType: uploadFile.type || "application/octet-stream",
          tags: uploadTags ? uploadTags.split(",").map(t => t.trim()) : undefined,
          folderName: "Contratos", // Pasta padrão para contratos
        });
      };
      reader.readAsDataURL(uploadFile);
      return;
    }
    
    // Converter arquivo para base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadDocumentMutation.mutate({
        name: uploadName || uploadFile.name,
        description: uploadDescription || undefined,
        folderId: currentFolderId,
        fileData: base64,
        fileName: uploadFile.name,
        mimeType: uploadFile.type || "application/octet-stream",
        tags: uploadTags ? uploadTags.split(",").map(t => t.trim()) : undefined,
      });
    };
    reader.readAsDataURL(uploadFile);
  }, [uploadFile, currentFolderId, uploadName, uploadDescription, uploadTags, uploadDocumentMutation, isClientGed, uploadTargetOrganizationId]);
  
  const downloadMutation = trpc.ged.getDownloadUrl.useQuery(
    { id: 0 },
    { enabled: false }
  );
  
  const handleDownload = useCallback(async (documentId: number, fileName: string) => {
    try {
      // Usar a URL direta do documento
      const doc = documents?.find(d => d.id === documentId);
      if (doc) {
        const link = document.createElement("a");
        link.href = doc.fileUrl;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      toast.error("Erro ao baixar documento");
    }
  }, [documents]);
  
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (term.length >= 2) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, []);
  
  // Verificar permissões
  // Admin e consultor podem editar tudo; usuários vinculados à organização podem fazer upload no GED da própria org
  const isInternalRole = user?.role === "admin_global" || user?.role === "consultor" || user?.role === "admin_global" || user?.role === "consultor";
  const canEdit = isInternalRole || (isClientGed && !!user?.organizationId && user?.organizationId === organizationId);
  const canShare = user?.role === "admin_global" || user?.role === "consultor";
  const isAdmin = user?.role === "admin_global";
  
  // Título da página
  const pageTitle = isClientGed 
    ? `GED ${organization?.name || "Organização"}`
    : "GED Seusdados";
  
  // Cores diferenciadas por tipo de GED - Padrão Visual Seusdados
  const gedColors = isClientGed 
    ? {
        gradient: "from-violet-500 to-violet-600",
        badge: "bg-violet-100 text-violet-700 border-violet-200",
        accent: "text-violet-600",
        bgLight: "bg-violet-50",
        border: "border-violet-200",
        shadow: "shadow-violet-500/25",
        icon: Building2
      }
    : {
        gradient: "from-violet-500 to-violet-600",
        badge: "bg-violet-100 text-violet-700 border-violet-200",
        accent: "text-violet-600",
        bgLight: "bg-violet-50",
        border: "border-violet-200",
        shadow: "shadow-violet-500/25",
        icon: HardDrive
      };
  
  const GedIcon = gedColors.icon;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* Header com Gradiente */}
      <div className={`bg-gradient-to-r ${isClientGed ? 'from-blue-600 via-indigo-600 to-violet-600' : 'from-violet-600 via-purple-600 to-indigo-600'} text-white`}>
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <GedIcon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-white/80 label-executive">
                  {isClientGed ? "Repositório da Organização" : "Repositório Interno"}
                </p>
                <h1 className="heading-2 text-white">{pageTitle}</h1>
                <p className="text-white/70 mt-1 font-light">
                  {isClientGed 
                    ? `Documentos e arquivos da organização ${organization?.name || ""}`
                    : "Templates, modelos, políticas e materiais de referência"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Estatísticas */}
              {stats && (
                <div className="hidden md:flex items-center gap-4 mr-4 text-sm text-white/80">
                  <span>{stats.totalFolders} pastas</span>
                  <span>{stats.totalDocuments} documentos</span>
                  <span>{formatFileSize(stats.totalSize)}</span>
                </div>
              )}
              
              {/* Inicializar pastas padrão */}
              {isAdmin && folders?.length === 0 && (
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => {
                    if (isClientGed && organizationId) {
                      initOrgFoldersMutation.mutate({ organizationId });
                    } else {
                      initSeusdadosFoldersMutation.mutate();
                    }
                  }}
                  disabled={initOrgFoldersMutation.isPending || initSeusdadosFoldersMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Criar Pastas Padrão
                </Button>
              )}
              
              {/* Botão Acionar DPO */}
              <AcionarDPO
                sourceContext={{
                  module: "GED",
                  page: isClientGed ? `Documentos - ${organization?.name}` : "GED Seusdados"
                }}
                variant="outline"
                size="default"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              />
              
              {/* Botões de ação - ocultos dentro de Evidências (área somente leitura) */}
              {canEdit && !isInsideEvidencias && (
                <>
                  {(isAdmin || currentFolderId) && (
                    <Button 
                      variant="outline" 
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      onClick={() => setShowNewFolderDialog(true)}
                    >
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Nova Pasta
                    </Button>
                  )}
                  {currentFolderId && (
                    <Button 
                      className={`${isClientGed ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-white text-violet-600 hover:bg-violet-50'}`}
                      onClick={() => setShowUploadDialog(true)}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Conteúdo Principal */}
      <div className="px-6 py-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Barra de Busca e Filtros */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Botão de Filtros */}
              <Button 
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {(filterFileType || filterDateFrom || filterDateTo || filterSizeMin || filterSizeMax || filterTags) && (
                  <Badge className="ml-2 bg-white text-purple-600" variant="secondary">
                    Ativos
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBreadcrumbClick(-1)}
            className={`hover:bg-opacity-20 ${isClientGed ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-100' : 'text-purple-600 hover:text-purple-700 hover:bg-purple-100'}`}
          >
            <GedIcon className="h-4 w-4 mr-1" />
            {isClientGed ? `GED ${organization?.name || "Cliente"}` : "GED Seusdados"}
          </Button>
          {breadcrumbs.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick(index)}
                className="text-gray-600 hover:text-gray-900"
              >
                {folder.name}
              </Button>
            </div>
          ))}
        </div>
      
      {/* Banner Informativo */}
      <Card className={`border-0 shadow-sm ${isClientGed ? 'bg-blue-50' : 'bg-violet-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${isClientGed ? 'bg-blue-100' : 'bg-violet-100'}`}>
              <GedIcon className={`h-5 w-5 ${isClientGed ? 'text-blue-600' : 'text-violet-600'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-semibold ${isClientGed ? 'text-blue-700' : 'text-violet-700'}`}>
                  {isClientGed ? "Repositório da Organização Cliente" : "Repositório Interno Seusdados"}
                </span>
                <Badge variant="outline" className={isClientGed ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-violet-100 text-violet-700 border-violet-200'}>
                  {isClientGed ? "Cliente" : "Seusdados"}
                </Badge>
              </div>
              <p className="text-gray-500 text-sm">
                {isClientGed 
                  ? `Documentos e arquivos da organização ${organization?.name || ""}. Estes documentos são de propriedade e responsabilidade do cliente.`
                  : "Repositório central de documentos internos da Seusdados Consultoria. Templates, modelos, políticas e materiais de referência para consultores."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Banner de área somente leitura (Evidências) */}
      {isInsideEvidencias && (
        <Card className="border-0 shadow-sm bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-amber-700">
                  Área de visualização — Evidências automáticas
                </span>
                <p className="text-amber-600 text-sm mt-0.5">
                  Os arquivos nesta pasta são gerados automaticamente pelas avaliações. Para upload manual e criação de pastas, utilize a tela inicial do GED.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Painel de Filtros Avançados */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-purple-600" />
                Filtros Avançados
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterFileType("");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setFilterSizeMin("");
                  setFilterSizeMax("");
                  setFilterTags("");
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Limpar Filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por Tipo de Arquivo */}
              <div>
                <Label className="text-sm font-medium">Tipo de Arquivo</Label>
                <Select value={filterFileType} onValueChange={setFilterFileType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="image">Imagens</SelectItem>
                    <SelectItem value="document">Documentos (Word)</SelectItem>
                    <SelectItem value="spreadsheet">Planilhas (Excel)</SelectItem>
                    <SelectItem value="presentation">Apresentações</SelectItem>
                    <SelectItem value="archive">Arquivos Compactados</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro por Data */}
              <div>
                <Label className="text-sm font-medium">Data de Criação</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    placeholder="De"
                    className="text-sm"
                  />
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    placeholder="Até"
                    className="text-sm"
                  />
                </div>
              </div>
              
              {/* Filtro por Tamanho */}
              <div>
                <Label className="text-sm font-medium">Tamanho (KB)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    value={filterSizeMin}
                    onChange={(e) => setFilterSizeMin(e.target.value)}
                    placeholder="Mín"
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    value={filterSizeMax}
                    onChange={(e) => setFilterSizeMax(e.target.value)}
                    placeholder="Máx"
                    className="text-sm"
                  />
                </div>
              </div>
              
              {/* Filtro por Tags */}
              <div>
                <Label className="text-sm font-medium">Tags</Label>
                <Input
                  value={filterTags}
                  onChange={(e) => setFilterTags(e.target.value)}
                  placeholder="Separar por vírgula"
                  className="mt-1 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Conteúdo */}
      {isSearching && searchTerm.length >= 2 ? (
        /* Resultados de busca */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resultados da busca: "{searchTerm}"</CardTitle>
            <CardDescription>
              {loadingSearch ? "Buscando..." : `${searchResults?.length || 0} documentos encontrados`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSearch ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : searchResults?.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum documento encontrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults?.map((doc) => {
                    const FileIcon = getFileIcon(doc.mimeType, doc.fileExtension);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-5 w-5 text-gray-500" />
                            {doc.name}
                          </div>
                        </TableCell>
                        <TableCell>{doc.fileExtension?.toUpperCase() || "Arquivo"}</TableCell>
                        <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                        <TableCell>{new Date(doc.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc.id, doc.fileName)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Navegação de pastas */
        <div className="grid gap-6">
          {/* Pastas */}
          {loadingFolders ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : folders?.length === 0 && currentFolderId === null ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma pasta encontrada</h3>
                <p className="text-gray-500 mb-4">
                  {isAdmin 
                    ? "Clique em 'Criar Pastas Padrão' para inicializar a estrutura de pastas."
                    : "Aguarde a criação das pastas pelo administrador."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Lista de pastas */}
              {folders && folders.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Pastas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {folders.map((folder) => {
                      const IconComponent = folder.icon && iconMap[folder.icon] ? iconMap[folder.icon] : Folder;
                      return (
                        <div
                          key={folder.id}
                          className={`relative flex flex-col p-4 rounded-xl border cursor-pointer hover:shadow-md hover:border-purple-200 transition-all group ${
                            !isInsideEvidencias && dragOverFolderId === folder.id 
                              ? 'ring-2 ring-purple-500 ring-offset-2 bg-purple-50' 
                              : 'border-gray-200 bg-white'
                          }`}
                          onClick={() => handleFolderClick(folder)}
                          onDragOver={isInsideEvidencias ? undefined : (e) => handleDragOver(e, folder.id)}
                          onDragLeave={isInsideEvidencias ? undefined : handleDragLeave}
                          onDrop={isInsideEvidencias ? undefined : (e) => handleDrop(e, folder.id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div 
                              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: folder.color ? `${folder.color}15` : "#f3f4f6" }}
                            >
                              <IconComponent 
                                className="h-6 w-6" 
                                style={{ color: folder.color || "#6b7280" }}
                              />
                            </div>
                            {canEdit && !folder.isSystemFolder && !isInsideEvidencias && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-red-600 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFolderToDelete(folder);
                                      setShowDeleteConfirm(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{folder.name}</p>
                            {folder.description && (
                              <p className="text-xs text-gray-500 truncate mt-1">{folder.description}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            {folder.isSystemFolder ? (
                              <Badge variant="secondary" className="text-xs">Sistema</Badge>
                            ) : (
                              <span />
                            )}
                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Lista de documentos */}
              {currentFolderId && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Documentos</h3>
                  {loadingDocuments ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : documents?.length === 0 ? (
                    <Card className="py-8">
                      <CardContent className="text-center">
                        <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">
                          {isInsideEvidencias
                            ? "Nenhuma evidência automática nesta pasta"
                            : "Nenhum documento nesta pasta"}
                        </p>
                        {canEdit && !isInsideEvidencias && (
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => setShowUploadDialog(true)}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Fazer Upload
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Tamanho</TableHead>
                            <TableHead>Data</TableHead>
                            {spaceType === "seusdados" && <TableHead>Compartilhado</TableHead>}
                            <TableHead className="w-[100px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDocuments?.map((doc) => {
                            const FileIcon = getFileIcon(doc.mimeType, doc.fileExtension);
                            return (
                              <TableRow 
                                key={doc.id}
                                draggable={canEdit && !isInsideEvidencias}
                                onDragStart={(e) => handleDragStart(e, 'document', doc.id, doc.name)}
                                onDragEnd={handleDragEnd}
                                className={`${canEdit && !isInsideEvidencias ? 'cursor-grab active:cursor-grabbing' : ''} ${
                                  draggedItem?.id === doc.id ? 'opacity-50' : ''
                                }`}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-3">
                                    {/* Miniatura de Preview */}
                                    {doc.mimeType.startsWith('image/') ? (
                                      <div 
                                        className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewDocument(doc as GedDocument);
                                          setIsPreviewOpen(true);
                                        }}
                                      >
                                        <img 
                                          src={doc.fileUrl} 
                                          alt={doc.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : doc.mimeType === 'application/pdf' ? (
                                      <div 
                                        className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewDocument(doc as GedDocument);
                                          setIsPreviewOpen(true);
                                        }}
                                      >
                                        <FileText className="h-5 w-5 text-red-500" />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        <FileIcon className="h-5 w-5 text-gray-500" />
                                      </div>
                                    )}
                                    <div>
                                      <p 
                                        className="cursor-pointer hover:text-purple-600 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewDocument(doc as GedDocument);
                                          setIsPreviewOpen(true);
                                        }}
                                      >
                                        {doc.name}
                                      </p>
                                      {doc.description && (
                                        <p className="text-xs text-gray-500">{doc.description}</p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {doc.fileExtension?.toUpperCase() || "Arquivo"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                                <TableCell>{new Date(doc.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                                {spaceType === "seusdados" && (
                                  <TableCell>
                                    {doc.isSharedWithClient ? (
                                      <Badge className="bg-green-100 text-green-800">Sim</Badge>
                                    ) : (
                                      <Badge variant="secondary">Não</Badge>
                                    )}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleDownload(doc.id, doc.fileName)}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => window.open(doc.fileUrl, "_blank")}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Visualizar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedDocumentForVersions(doc as GedDocument);
                                        setShowVersionsDialog(true);
                                      }}>
                                        <History className="h-4 w-4 mr-2" />
                                        Histórico de Versões
                                      </DropdownMenuItem>
                                      {canShare && spaceType === "seusdados" && doc.organizationId && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() => shareDocumentMutation.mutate({
                                              documentId: doc.id,
                                              share: !doc.isSharedWithClient,
                                            })}
                                          >
                                            <Share2 className="h-4 w-4 mr-2" />
                                            {doc.isSharedWithClient ? "Remover Compartilhamento" : "Compartilhar com Cliente"}
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {canEdit && !isInsideEvidencias && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-red-600"
                                            onClick={() => {
                                              if (confirm("Tem certeza que deseja excluir este documento?")) {
                                                deleteDocumentMutation.mutate({ id: doc.id });
                                              }
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Excluir
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
      </div>
      
      {/* Dialog Nova Pasta */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
            <DialogDescription>Crie uma nova pasta para organizar seus documentos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderName">Nome da Pasta *</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Contratos 2024"
              />
            </div>
            <div>
              <Label htmlFor="folderDescription">Descrição</Label>
              <Textarea
                id="folderDescription"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Descrição opcional da pasta"
              />
            </div>
            
            {/* Seletor de Ícone */}
            <div>
              <Label>Ícone da Pasta</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {[
                  { icon: "Folder", label: "Pasta" },
                  { icon: "FolderOpen", label: "Pasta Aberta" },
                  { icon: "FileText", label: "Documento" },
                  { icon: "Shield", label: "Segurança" },
                  { icon: "FileCheck", label: "Verificado" },
                  { icon: "BarChart", label: "Relatórios" },
                  { icon: "Lock", label: "Privado" },
                  { icon: "Building2", label: "Empresa" },
                  { icon: "File", label: "Arquivo" },
                ].map(({ icon, label }) => {
                  const IconComponent = iconMap[icon] || Folder;
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewFolderIcon(icon)}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                        newFolderIcon === icon
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      title={label}
                    >
                      <IconComponent className="h-5 w-5" style={{ color: newFolderColor }} />
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Seletor de Cor */}
            <div>
              <Label>Cor da Pasta</Label>
              <div className="grid grid-cols-8 gap-2 mt-2">
                {[
                  { color: "#8B5CF6", label: "Roxo" },
                  { color: "#3B82F6", label: "Azul" },
                  { color: "#06B6D4", label: "Ciano" },
                  { color: "#10B981", label: "Verde" },
                  { color: "#F59E0B", label: "Amarelo" },
                  { color: "#EF4444", label: "Vermelho" },
                  { color: "#EC4899", label: "Rosa" },
                  { color: "#6B7280", label: "Cinza" },
                ].map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewFolderColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newFolderColor === color
                        ? "ring-2 ring-offset-2 ring-purple-500"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                    title={label}
                  />
                ))}
              </div>
            </div>
            
            {/* Preview da Pasta */}
            <div className="bg-gray-50 rounded-lg p-4">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="flex items-center gap-3 mt-2">
                {(() => {
                  const IconComponent = iconMap[newFolderIcon] || Folder;
                  return (
                    <div 
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `${newFolderColor}20` }}
                    >
                      <IconComponent className="h-6 w-6" style={{ color: newFolderColor }} />
                    </div>
                  );
                })()}
                <span className="font-medium">{newFolderName || "Nome da Pasta"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending}>
              {createFolderMutation.isPending ? "Criando..." : "Criar Pasta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Upload */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
            <DialogDescription>Envie um novo documento para esta pasta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Arquivo *</Label>
              <div 
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-purple-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-purple-500" />
                    <div className="text-left">
                      <p className="font-medium">{uploadFile.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(uploadFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Clique para selecionar um arquivo</p>
                    <p className="text-sm text-gray-400">ou arraste e solte aqui</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            <div>
              <Label htmlFor="docName">Nome do Documento</Label>
              <Input
                id="docName"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Nome para exibição"
              />
            </div>
            <div>
              <Label htmlFor="docDescription">Descrição</Label>
              <Textarea
                id="docDescription"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Descrição opcional"
              />
            </div>
            <div>
              <Label htmlFor="docTags">Tags (separadas por vírgula)</Label>
              <Input
                id="docTags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="Ex: contrato, lgpd, 2024"
              />
            </div>
            
            {/* Campo de organização destino - apenas para consultores no GED Seusdados */}
            {!isClientGed && canEdit && allOrganizations && allOrganizations.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <Label htmlFor="targetOrg" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-500" />
                  Enviar para GED do Cliente (opcional)
                </Label>
                <Select
                  value={uploadTargetOrganizationId?.toString() || "seusdados"}
                  onValueChange={(val) => setUploadTargetOrganizationId(val && val !== "seusdados" ? parseInt(val) : null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma organização (ou deixe vazio para GED Seusdados)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seusdados">GED Seusdados (pasta atual)</SelectItem>
                    {allOrganizations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {uploadTargetOrganizationId && (
                  <p className="text-xs text-purple-600 mt-1">
                    O documento será enviado para a pasta "Contratos" do GED de {allOrganizations.find(o => o.id === uploadTargetOrganizationId)?.name}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!uploadFile || uploadDocumentMutation.isPending || uploadToClientGedMutation.isPending}
            >
              {(uploadDocumentMutation.isPending || uploadToClientGedMutation.isPending) ? "Enviando..." : 
               uploadTargetOrganizationId ? "Enviar para Cliente" : "Enviar Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Preview de Documento */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDocument?.mimeType.startsWith('image/') ? (
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Image className="h-5 w-5 text-blue-600" />
                </div>
              ) : previewDocument?.mimeType === 'application/pdf' ? (
                <div className="p-2 bg-red-100 rounded-lg">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
              ) : (
                <div className="p-2 bg-gray-100 rounded-lg">
                  <File className="h-5 w-5 text-gray-600" />
                </div>
              )}
              {previewDocument?.name}
            </DialogTitle>
            <DialogDescription>
              {previewDocument?.description || 'Visualização do documento'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {previewDocument?.mimeType.startsWith('image/') ? (
              <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4">
                <img 
                  src={previewDocument.fileUrl} 
                  alt={previewDocument.name}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            ) : previewDocument?.mimeType === 'application/pdf' ? (
              <div className="w-full h-[60vh] bg-gray-50 rounded-lg overflow-hidden">
                <iframe
                  src={previewDocument.fileUrl}
                  className="w-full h-full"
                  title={previewDocument.name}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                <File className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Preview não disponível para este tipo de arquivo</p>
                <Button asChild>
                  <a href={previewDocument?.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Arquivo
                  </a>
                </Button>
              </div>
            )}
          </div>
          
          {/* Informações do documento */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium">{previewDocument?.fileExtension?.toUpperCase() || 'Arquivo'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tamanho</p>
              <p className="text-sm font-medium">{previewDocument ? formatFileSize(previewDocument.fileSize) : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Criado em</p>
              <p className="text-sm font-medium">
                {previewDocument ? new Date(previewDocument.createdAt).toLocaleDateString('pt-BR') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Versão</p>
              <p className="text-sm font-medium">v{previewDocument?.version || 1}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Fechar
            </Button>
            <Button asChild>
              <a href={previewDocument?.fileUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Histórico de Versões */}
      <Dialog open={showVersionsDialog} onOpenChange={setShowVersionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" />
              Histórico de Versões
            </DialogTitle>
            <DialogDescription>
              {selectedDocumentForVersions?.name} - Versão atual: v{selectedDocumentForVersions?.version || 1}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {loadingVersions ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : documentVersions && documentVersions.length > 0 ? (
              documentVersions.map((version: any, index: number) => (
                <div 
                  key={version.id}
                  className={`p-4 rounded-lg border ${
                    version.isLatestVersion 
                      ? 'border-purple-300 bg-purple-50' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        version.isLatestVersion ? 'bg-purple-200' : 'bg-gray-100'
                      }`}>
                        <FileText className={`h-4 w-4 ${
                          version.isLatestVersion ? 'text-purple-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Versão {version.version}</span>
                          {version.isLatestVersion && (
                            <Badge className="bg-purple-600">Atual</Badge>
                          )}
                        </div>
                        <p className="body-small">
                          {new Date(version.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="body-small">
                        {(version.fileSize / 1024).toFixed(1)} KB
                      </span>
                      {!version.isLatestVersion && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Restaurar para a versão ${version.version}? Uma nova versão será criada com o conteúdo desta versão.`)) {
                              restoreVersionMutation.mutate({
                                documentId: selectedDocumentForVersions!.id,
                                versionId: version.id
                              });
                            }
                          }}
                          disabled={restoreVersionMutation.isPending}
                        >
                          {restoreVersionMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Restaurar
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(version.fileUrl, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Este documento possui apenas uma versão.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Tem certeza que deseja excluir?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-700">
              {folderToDelete && `Pasta: <strong>${folderToDelete.name}</strong>`}
              {documentToDelete && `Documento: <strong>${documentToDelete.name}</strong>`}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Todos os arquivos e dados associados serão permanentemente removidos.
            </p>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteConfirm(false);
                setFolderToDelete(null);
                setDocumentToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setIsDeleting(true);
                if (folderToDelete) {
                  deleteFolderMutation.mutate({ id: folderToDelete.id });
                } else if (documentToDelete) {
                  deleteDocumentMutation.mutate({ id: documentToDelete.id });
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Permanentemente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
