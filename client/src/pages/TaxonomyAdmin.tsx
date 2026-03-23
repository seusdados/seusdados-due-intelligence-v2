import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/contexts/ToastContext";
import {
  Plus,
  Trash2,
  Building2,
  Layers,
  FolderTree,
  ClipboardList,
  Target,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

type TaxKind = "segment" | "business_type" | "area" | "process";

const kindLabels: Record<TaxKind, string> = {
  segment: "Segmento",
  business_type: "Tipo de Negócio",
  area: "Área",
  process: "Processo",
};

const kindIcons: Record<TaxKind, any> = {
  segment: Building2,
  business_type: Layers,
  area: FolderTree,
  process: ClipboardList,
};

export default function TaxonomyAdmin() {
  const { selectedOrganization } = useOrganization();
  const orgId = selectedOrganization?.id ? Number(selectedOrganization.id) : 0;
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TaxKind>("segment");
  const [newEntry, setNewEntry] = useState({ code: "", label: "", parentCode: "" });

  // Queries - catálogo padrão
  const segmentsQ = trpc.taxonomy.listSegments.useQuery(undefined, { enabled: true });
  const businessTypesQ = trpc.taxonomy.listBusinessTypes.useQuery(
    { segment: null },
    { enabled: true }
  );

  // Queries - entradas customizadas
  const customEntriesQ = trpc.taxonomy.listCustomEntries.useQuery(
    { organizationId: orgId, kind: activeTab },
    { enabled: !!orgId }
  );

  // Mutations
  const addMutation = trpc.taxonomy.addCustomEntry.useMutation({
    onSuccess: () => {
      customEntriesQ.refetch();
      setNewEntry({ code: "", label: "", parentCode: "" });
      toast.success("Entrada adicionada com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao adicionar: ${err.message}`);
    },
  });

  const deleteMutation = trpc.taxonomy.deleteCustomEntry.useMutation({
    onSuccess: () => {
      customEntriesQ.refetch();
      toast.success("Entrada removida com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao remover: ${err.message}`);
    },
  });

  const handleAdd = () => {
    if (!orgId) {
      toast.error("Selecione uma organização");
      return;
    }
    if (!newEntry.code.trim() || !newEntry.label.trim()) {
      toast.error("Código e nome são obrigatórios");
      return;
    }
    addMutation.mutate({
      organizationId: orgId,
      kind: activeTab,
      code: newEntry.code.trim().toLowerCase().replace(/\s+/g, "_"),
      label: newEntry.label.trim(),
      parentCode: newEntry.parentCode || null,
    });
  };

  const handleDelete = (id: number) => {
    if (!orgId) return;
    deleteMutation.mutate({ id, organizationId: orgId });
  };

  // Gerar código automaticamente a partir do label
  const autoCode = (label: string) => {
    return label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  };

  if (!orgId) {
    return (
      <div className="p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800">
                Selecione uma organização no menu lateral para gerenciar a taxonomia.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderCatalogPreview = () => {
    if (activeTab === "segment") {
      const items = segmentsQ.data || [];
      return (
        <div className="flex flex-wrap gap-2">
          {items.map((s: any) => (
            <Badge key={s.value} variant="outline" className="text-xs">{s.label}</Badge>
          ))}
        </div>
      );
    }
    if (activeTab === "business_type") {
      const items = businessTypesQ.data || [];
      return (
        <div className="flex flex-wrap gap-2">
          {items.map((bt: any) => (
            <Badge key={bt.value} variant="outline" className="text-xs">{bt.label}</Badge>
          ))}
        </div>
      );
    }
    return null;
  };

  const customEntries = customEntriesQ.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cadastros">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Taxonomia Personalizada</h1>
            <p className="text-muted-foreground">
              Adicione segmentos, tipos de negócio, áreas e processos específicos da sua organização.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaxKind)}>
        <TabsList className="grid w-full grid-cols-4">
          {(Object.keys(kindLabels) as TaxKind[]).map((kind) => {
            const Icon = kindIcons[kind];
            return (
              <TabsTrigger key={kind} value={kind} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{kindLabels[kind]}s</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(kindLabels) as TaxKind[]).map((kind) => (
          <TabsContent key={kind} value={kind} className="space-y-4 mt-4">
            {/* Catálogo padrão */}
            {(kind === "segment" || kind === "business_type") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Catálogo Padrão</CardTitle>
                  <CardDescription>
                    {kind === "segment"
                      ? "Segmentos de mercado disponíveis no catálogo base da plataforma."
                      : "Tipos de negócio disponíveis no catálogo base da plataforma."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderCatalogPreview()}
                </CardContent>
              </Card>
            )}

            {/* Entradas customizadas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4" />
                  {kindLabels[kind]}s Personalizados
                </CardTitle>
                <CardDescription>
                  Entradas adicionadas pela sua organização que complementam o catálogo padrão.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Formulário de adição */}
                <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Nome *</Label>
                    <Input
                      value={newEntry.label}
                      onChange={(e) => {
                        const label = e.target.value;
                        setNewEntry({ ...newEntry, label, code: autoCode(label) });
                      }}
                      placeholder={`Nome do ${kindLabels[kind].toLowerCase()}`}
                    />
                  </div>
                  <div className="w-48 space-y-1">
                    <Label className="text-xs">Código (auto)</Label>
                    <Input
                      value={newEntry.code}
                      onChange={(e) => setNewEntry({ ...newEntry, code: e.target.value })}
                      placeholder="codigo_unico"
                      className="font-mono text-sm"
                    />
                  </div>
                  {(kind === "business_type" || kind === "area" || kind === "process") && (
                    <div className="w-48 space-y-1">
                      <Label className="text-xs">
                        {kind === "business_type" ? "Segmento pai" : kind === "area" ? "Tipo de negócio pai" : "Área pai"}
                      </Label>
                      <Input
                        value={newEntry.parentCode}
                        onChange={(e) => setNewEntry({ ...newEntry, parentCode: e.target.value })}
                        placeholder="código do pai (opcional)"
                        className="font-mono text-sm"
                      />
                    </div>
                  )}
                  <div className="flex items-end">
                    <Button
                      onClick={handleAdd}
                      disabled={!newEntry.code || !newEntry.label || addMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {/* Lista de entradas customizadas */}
                {customEntries.length > 0 ? (
                  <div className="space-y-2">
                    {customEntries.map((entry: any) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {entry.code}
                          </Badge>
                          <span className="font-medium">{entry.label}</span>
                          {entry.parentCode && (
                            <Badge variant="outline" className="text-xs">
                              pai: {entry.parentCode}
                            </Badge>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Deseja remover "{entry.label}" da taxonomia personalizada?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(entry.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      Nenhum {kindLabels[kind].toLowerCase()} personalizado cadastrado.
                    </p>
                    <p className="text-xs mt-1">
                      Use o formulário acima para adicionar entradas específicas da sua organização.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
