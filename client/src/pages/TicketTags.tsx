import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Tag,
  Pencil,
  Trash2,
  Loader2,
  Palette,
  Tags
} from "lucide-react";

// Cores predefinidas para tags
const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#eab308", // Yellow
  "#84cc16", // Lime
  "#22c55e", // Green
  "#10b981", // Emerald
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#0ea5e9", // Sky
  "#3b82f6", // Blue
  "#64748b", // Slate
];

export default function TicketTags() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<{ id: number; name: string; color: string; description: string } | null>(null);
  
  // Form states
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [newTagDescription, setNewTagDescription] = useState("");
  
  // Get organization ID
  const organizationId = user?.organizationId || 1;
  
  // Queries
  const { data: tags, isLoading } = trpc.tickets.getTags.useQuery({
    organizationId
  });
  
  // Mutations
  const createTag = trpc.tickets.createTag.useMutation({
    onSuccess: () => {
      toast.success("Tag criada com sucesso!");
      utils.tickets.getTags.invalidate();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar tag", { description: error.message });
    }
  });
  
  const updateTag = trpc.tickets.updateTag.useMutation({
    onSuccess: () => {
      toast.success("Tag atualizada com sucesso!");
      utils.tickets.getTags.invalidate();
      setEditingTag(null);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar tag", { description: error.message });
    }
  });
  
  const deleteTag = trpc.tickets.deleteTag.useMutation({
    onSuccess: () => {
      toast.success("Tag excluída com sucesso!");
      utils.tickets.getTags.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao excluir tag", { description: error.message });
    }
  });
  
  const resetForm = () => {
    setNewTagName("");
    setNewTagColor("#6366f1");
    setNewTagDescription("");
  };
  
  const handleCreate = () => {
    if (!newTagName.trim()) {
      toast.error("Nome da tag é obrigatório");
      return;
    }
    
    createTag.mutate({
      organizationId,
      name: newTagName.trim(),
      color: newTagColor,
      description: newTagDescription.trim() || undefined
    });
  };
  
  const handleUpdate = () => {
    if (!editingTag) return;
    if (!newTagName.trim()) {
      toast.error("Nome da tag é obrigatório");
      return;
    }
    
    updateTag.mutate({
      tagId: editingTag.id,
      name: newTagName.trim(),
      color: newTagColor,
      description: newTagDescription.trim() || undefined
    });
  };
  
  const handleDelete = (tagId: number) => {
    deleteTag.mutate({ tagId });
  };
  
  const openEditDialog = (tag: { id: number; name: string; color: string; description: string | null }) => {
    setEditingTag({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description || ""
    });
    setNewTagName(tag.name);
    setNewTagColor(tag.color);
    setNewTagDescription(tag.description || "");
  };
  
  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tags className="h-6 w-6 text-purple-500" />
            Tags Personalizadas
          </h1>
          <p className="text-slate-600 mt-1">
            Crie e gerencie tags para categorizar seus tickets
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Tag</DialogTitle>
              <DialogDescription>
                Adicione uma nova tag para categorizar seus tickets
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Tag</Label>
                <Input
                  id="name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Ex: Urgente, LGPD, Contrato..."
                  maxLength={50}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        newTagColor === color 
                          ? "border-slate-900 scale-110" 
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Palette className="h-4 w-4 text-slate-500" />
                  <Input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-16 h-8 p-1 cursor-pointer"
                  />
                  <span className="text-sm text-slate-500">{newTagColor}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  placeholder="Descrição da tag..."
                  maxLength={255}
                />
              </div>
              
              <div className="pt-4">
                <Label>Preview</Label>
                <div className="mt-2">
                  <Badge
                    style={{ backgroundColor: newTagColor }}
                    className="text-white"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {newTagName || "Nome da tag"}
                  </Badge>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createTag.isPending}>
                {createTag.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : tags && tags.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <Card key={tag.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Badge
                    style={{ backgroundColor: tag.color }}
                    className="text-white text-sm"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.name}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(tag)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a tag "{tag.name}"? 
                            Esta ação não pode ser desfeita e a tag será removida de todos os tickets.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(tag.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              {tag.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-600">{tag.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Tags className="h-8 w-8 text-purple-500" />
            </div>
            <CardTitle className="text-lg mb-2">Nenhuma tag criada</CardTitle>
            <CardDescription className="text-center mb-4">
              Crie tags personalizadas para organizar e categorizar seus tickets
            </CardDescription>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Tag
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tag</DialogTitle>
            <DialogDescription>
              Atualize as informações da tag
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome da Tag</Label>
              <Input
                id="edit-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Ex: Urgente, LGPD, Contrato..."
                maxLength={50}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      newTagColor === color 
                        ? "border-slate-900 scale-110" 
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Palette className="h-4 w-4 text-slate-500" />
                <Input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-16 h-8 p-1 cursor-pointer"
                />
                <span className="text-sm text-slate-500">{newTagColor}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição (opcional)</Label>
              <Input
                id="edit-description"
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                placeholder="Descrição da tag..."
                maxLength={255}
              />
            </div>
            
            <div className="pt-4">
              <Label>Preview</Label>
              <div className="mt-2">
                <Badge
                  style={{ backgroundColor: newTagColor }}
                  className="text-white"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {newTagName || "Nome da tag"}
                </Badge>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTag(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateTag.isPending}>
              {updateTag.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
