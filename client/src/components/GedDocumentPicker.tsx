import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Folder, 
  FileText, 
  ChevronRight, 
  Home,
  Paperclip,
  Loader2,
  FileImage,
  FileSpreadsheet,
  File,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

interface GedDocumentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  assessmentType: "conformidade" | "due_diligence";
  assessmentId: number;
  onDocumentLinked: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "evidencia_conformidade", label: "Evidência de Conformidade" },
  { value: "documento_suporte", label: "Documento de Suporte" },
  { value: "relatorio_auditoria", label: "Relatório de Auditoria" },
  { value: "politica_procedimento", label: "Política/Procedimento" },
  { value: "contrato", label: "Contrato" },
  { value: "termo_responsabilidade", label: "Termo de Responsabilidade" },
  { value: "outro", label: "Outro" },
];

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-4 w-4 text-gray-400" />;
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
  if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) 
    return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  if (mimeType.includes("document") || mimeType.includes("word")) 
    return <FileText className="h-4 w-4 text-blue-600" />;
  return <File className="h-4 w-4 text-gray-400" />;
}

export function GedDocumentPicker({
  open,
  onOpenChange,
  organizationId,
  assessmentType,
  assessmentId,
  onDocumentLinked,
}: GedDocumentPickerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: number | null; name: string }[]>([
    { id: null, name: "Raiz" }
  ]);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [category, setCategory] = useState("documento_suporte");
  const [description, setDescription] = useState("");

  const { data: contents, isLoading } = trpc.ged.getAvailableDocumentsForAssessment.useQuery(
    { organizationId, folderId: currentFolderId },
    { enabled: open }
  );

  const linkMutation = trpc.ged.linkDocumentToAssessment.useMutation({
    onSuccess: () => {
      toast.success("Documento(s) vinculado(s) com sucesso!");
      setSelectedDocuments([]);
      setDescription("");
      onDocumentLinked();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao vincular documento");
    },
  });

  const navigateToFolder = (folderId: number | null, folderName: string) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setBreadcrumb([{ id: null, name: "Raiz" }]);
    } else {
      const existingIndex = breadcrumb.findIndex(b => b.id === folderId);
      if (existingIndex >= 0) {
        setBreadcrumb(breadcrumb.slice(0, existingIndex + 1));
      } else {
        setBreadcrumb([...breadcrumb, { id: folderId, name: folderName }]);
      }
    }
  };

  const goBack = () => {
    if (breadcrumb.length > 1) {
      const newBreadcrumb = breadcrumb.slice(0, -1);
      setBreadcrumb(newBreadcrumb);
      setCurrentFolderId(newBreadcrumb[newBreadcrumb.length - 1].id);
    }
  };

  const toggleDocumentSelection = (docId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleLinkDocuments = async () => {
    for (const docId of selectedDocuments) {
      await linkMutation.mutateAsync({
        assessmentType,
        assessmentId,
        documentId: docId,
        category: category as any,
        description: description || undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-purple-600" />
            Anexar Documentos do GED
          </DialogTitle>
          <DialogDescription>
            Selecione documentos do GED para vincular como evidências desta avaliação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            {breadcrumb.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 mr-2"
                onClick={goBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Home className="h-4 w-4" />
            {breadcrumb.map((item, index) => (
              <div key={item.id ?? 'root'} className="flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                <button
                  onClick={() => navigateToFolder(item.id, item.name)}
                  className="hover:text-foreground hover:underline"
                >
                  {item.name}
                </button>
              </div>
            ))}
          </div>

          {/* Lista de pastas e documentos */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="divide-y">
                {/* Pastas */}
                {contents?.folders?.map((folder: any) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigateToFolder(folder.id, folder.name)}
                  >
                    <Folder className="h-5 w-5 text-yellow-500" />
                    <span className="flex-1 font-medium">{folder.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}

                {/* Documentos */}
                {contents?.documents?.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedDocuments.includes(doc.id)}
                      onCheckedChange={() => toggleDocumentSelection(doc.id)}
                    />
                    {getFileIcon(doc.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ""}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Estado vazio */}
                {(!contents?.folders?.length && !contents?.documents?.length) && (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Folder className="h-10 w-10 mb-2 opacity-50" />
                    <p>Nenhum documento encontrado nesta pasta</p>
                    <p className="text-xs">Faça upload de documentos no GED primeiro</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Opções de vinculação */}
          {selectedDocuments.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
                <Paperclip className="h-4 w-4" />
                {selectedDocuments.length} documento(s) selecionado(s)
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Descreva a relevância do documento..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleLinkDocuments}
            disabled={selectedDocuments.length === 0 || linkMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {linkMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vinculando...
              </>
            ) : (
              <>
                <Paperclip className="h-4 w-4 mr-2" />
                Vincular {selectedDocuments.length > 0 ? `(${selectedDocuments.length})` : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
