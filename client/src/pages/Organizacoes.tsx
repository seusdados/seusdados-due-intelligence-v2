import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Search, Edit, Eye, MoreHorizontal, Power, PowerOff, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useMemo } from "react";
import { Pagination } from "@/components/Pagination";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Organizacoes() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [, setLocation] = useLocation();
  
  // Verificar se o usuário é admin/consultor
  const isAdminOrConsultor = user?.role === 'admin_global' || user?.role === 'consultor';
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: "",
    tradeName: "",
    cnpj: "",
    email: "",
    phone: "",
    city: "",
    state: "",
  });
  const [orgToDelete, setOrgToDelete] = useState<number | null>(null);
  const [orgToToggle, setOrgToToggle] = useState<{ id: number; isActive: boolean } | null>(null);

  const utils = trpc.useUtils();
  const { data: organizations, isLoading } = trpc.organization.list.useQuery();
  
  // Mutation para alternar status ativo/inativo
  const toggleStatusMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success("Status da organização atualizado!");
      utils.organization.list.invalidate();
      setOrgToToggle(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  });

  // Mutation para excluir organização
  const deleteMutation = trpc.organization.delete.useMutation({
    onSuccess: () => {
      toast.success("Organização excluída com sucesso!");
      utils.organization.list.invalidate();
      setOrgToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir organização: " + error.message);
    }
  });

  const createMutation = trpc.organization.create.useMutation({
    onSuccess: () => {
      toast.success("Organização criada com sucesso!");
      utils.organization.list.invalidate();
      setIsCreateOpen(false);
      setNewOrg({ name: "", tradeName: "", cnpj: "", email: "", phone: "", city: "", state: "" });
    },
    onError: (error) => {
      toast.error("Erro ao criar organização: " + error.message);
    }
  });

  // Filtrar por organização selecionada (isolamento de tenant)
  const orgFilteredOrganizations = useMemo(() => {
    if (!organizations) return [];
    // Se há uma organização selecionada, mostrar apenas ela
    if (selectedOrganization && isAdminOrConsultor) {
      return organizations.filter((o: any) => o.id === selectedOrganization.id);
    }
    // Se não há organização selecionada e é admin/consultor, mostrar todas
    return organizations;
  }, [organizations, selectedOrganization, isAdminOrConsultor]);
  
  const filteredOrgs = orgFilteredOrganizations?.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.cnpj?.includes(searchTerm) ||
    org.tradeName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Paginação
  const totalItems = filteredOrgs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedOrgs = filteredOrgs.slice(startIndex, endIndex);

  // Reset para página 1 quando filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCreate = () => {
    if (!newOrg.name) {
      toast.error("Nome é obrigatório");
      return;
    }
    createMutation.mutate(newOrg);
  };

  const handleToggleStatus = () => {
    if (orgToToggle) {
      toggleStatusMutation.mutate({
        id: orgToToggle.id,
        isActive: !orgToToggle.isActive
      });
    }
  };

  const handleDelete = () => {
    if (orgToDelete) {
      deleteMutation.mutate({ id: orgToDelete });
    }
  };

  // Clique na linha para visualizar
  const handleRowClick = (orgId: number) => {
    setLocation(`/organizacoes/${orgId}`);
  };

  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return "-";
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };

  if (user?.role === 'sponsor') {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizações"
        subtitle="Gerencie as organizações clientes da plataforma"
        icon={Building2}
        showBack={false}
        showDPOButton={false}
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Organização
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nova Organização</DialogTitle>
              <DialogDescription>
                Cadastre uma nova organização cliente na plataforma.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Razão Social *</Label>
                <Input
                  id="name"
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tradeName">Nome Fantasia</Label>
                <Input
                  id="tradeName"
                  value={newOrg.tradeName}
                  onChange={(e) => setNewOrg({ ...newOrg, tradeName: e.target.value })}
                  placeholder="Nome fantasia"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={newOrg.cnpj}
                    onChange={(e) => setNewOrg({ ...newOrg, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={newOrg.phone}
                    onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newOrg.email}
                  onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
                  placeholder="contato@empresa.com.br"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={newOrg.city}
                    onChange={(e) => setNewOrg({ ...newOrg, city: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">UF</Label>
                  <Input
                    id="state"
                    value={newOrg.state}
                    onChange={(e) => setNewOrg({ ...newOrg, state: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Organização"}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar organizações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">
              {filteredOrgs.length} {filteredOrgs.length === 1 ? 'organização' : 'organizações'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-1">Nenhuma organização encontrada</h3>
              <p className="body-small">
                {searchTerm ? "Tente ajustar sua busca" : "Comece criando uma nova organização"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrgs.map((org) => (
                  <TableRow 
                    key={org.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(org.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        {org.tradeName && (
                          <p className="body-small">{org.tradeName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCNPJ(org.cnpj)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{org.email || "-"}</p>
                        <p className="text-muted-foreground">{org.phone || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.city && org.state ? `${org.city}/${org.state}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.isActive ? "default" : "secondary"}>
                        {org.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/organizacoes/${org.id}/editar`);
                          }}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${org.isActive ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrgToToggle({ id: org.id, isActive: Boolean(org.isActive ?? true) });
                          }}
                          title={org.isActive ? "Inativar" : "Reativar"}
                        >
                          {org.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrgToDelete(org.id);
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>
      {/* Dialog de confirmação para alternar status */}
      <AlertDialog open={!!orgToToggle} onOpenChange={() => setOrgToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {orgToToggle?.isActive ? "Inativar Organização" : "Reativar Organização"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {orgToToggle?.isActive
                ? "Tem certeza que deseja inativar esta organização? Os usuários não poderão mais acessá-la."
                : "Tem certeza que deseja reativar esta organização? Os usuários poderão acessá-la novamente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              className={orgToToggle?.isActive ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}
            >
              {toggleStatusMutation.isPending ? "Processando..." : orgToToggle?.isActive ? "Inativar" : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação para excluir */}
      <AlertDialog open={!!orgToDelete} onOpenChange={() => setOrgToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Organização</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta organização? Esta ação não pode ser desfeita.
              Todos os dados associados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
