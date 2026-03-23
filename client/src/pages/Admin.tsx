import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building2, 
  Users, 
  ClipboardCheck, 
  FileSearch, 
  Shield,
  Activity,
  Edit,
  Search,
  UserCog,
  Loader2,
  UserPlus,
  UserX,
  Mail,
  MoreHorizontal,
  Key,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useLocation } from "wouter";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { RoleSelector, type UserRole, type ClientRole } from "@/components/RoleSelector";

const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  admin_global: { label: "Admin Global", variant: "default" },
  consultor: { label: "Consultor", variant: "secondary" },
  sponsor: { label: "Sponsor", variant: "outline" },
  comite: { label: "Comitê", variant: "outline" },
  lider_processo: { label: "Líder de Processo", variant: "outline" },
  gestor_area: { label: "Gestor de Área", variant: "outline" },
  terceiro: { label: "Terceiro", variant: "outline" },
};

interface EditUserData {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  organizationId: number | null;
  isActive: boolean;
  clientRoles?: ('sponsor' | 'comite' | 'lider_processo' | 'gestor_area')[];
}

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<EditUserData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<EditUserData | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'sponsor' as string,
    organizationId: null as number | null,
    activateImmediately: false,
    clientRoles: [] as ('sponsor' | 'sponsor' | 'comite' | 'lider_processo' | 'gestor_area')[],
  });

  const { data: stats, isLoading: loadingStats } = trpc.admin.getGlobalStats.useQuery();
  const { data: organizations, isLoading: loadingOrgs } = trpc.admin.getAllOrganizations.useQuery();
  const { data: users, isLoading: loadingUsers, refetch: refetchUsers } = trpc.admin.getAllUsers.useQuery();

  const updateUserMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso!');
      refetchUsers();
      setIsEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error: { message: string }) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const createUserMutation = trpc.user.create.useMutation({
    onSuccess: () => {
      toast.success('Usuário criado com sucesso!');
      refetchUsers();
      setIsCreateDialogOpen(false);
      setNewUser({
        name: '',
        email: '',
        phone: '',
        role: 'sponsor',
        organizationId: null,
        activateImmediately: false,
        clientRoles: [],
      });
    },
    onError: (error: { message: string }) => {
      toast.error('Erro ao criar usuário: ' + error.message);
    },
  });

  const revokeUserMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      toast.success('Acesso do usuário revogado com sucesso!');
      refetchUsers();
      setIsRevokeDialogOpen(false);
      setUserToRevoke(null);
    },
    onError: (error: { message: string }) => {
      toast.error('Erro ao revogar acesso: ' + error.message);
    },
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(u => 
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const handleEditUser = useCallback((u: any) => {
    if (!u) return;
    setEditingUser({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      organizationId: u.organizationId,
      isActive: Boolean(u.isActive),
      clientRoles: u.clientRoles || [],
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveUser = useCallback(() => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      role: editingUser.role,
      organizationId: editingUser.organizationId || undefined,
      isActive: editingUser.isActive,
      clientRoles: editingUser.clientRoles || [],
    });
  }, [editingUser, updateUserMutation]);

  const handleCreateUser = useCallback(() => {
    if (!newUser.name || !newUser.email) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }
    createUserMutation.mutate({
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || undefined,
      role: newUser.role as any,
      organizationId: newUser.organizationId || undefined,
      clientRoles: newUser.clientRoles || [],
    });
  }, [newUser, createUserMutation]);

  const handleRevokeUser = useCallback(() => {
    if (!userToRevoke) return;
    revokeUserMutation.mutate({
      id: userToRevoke.id,
      isActive: false,
    });
  }, [userToRevoke, revokeUserMutation]);

  const handleActivateUser = useCallback((u: EditUserData) => {
    updateUserMutation.mutate({
      id: u.id,
      isActive: true,
    });
  }, [updateUserMutation]);

  if (user?.role !== 'admin_global') {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Esta área é restrita a administradores globais da plataforma.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: "Organizações",
      value: stats?.organizations || 0,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Usuários",
      value: stats?.users || 0,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Avaliações PPPD",
      value: stats?.complianceAssessments || 0,
      icon: ClipboardCheck,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Due Diligence",
      value: stats?.thirdPartyAssessments || 0,
      icon: FileSearch,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administração Global</h1>
          <p className="text-muted-foreground">
            Gerencie toda a plataforma Seusdados Due Diligence
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value}</p>
                  )}
                  <p className="body-small">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for Organizations and Users */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <UserCog className="h-4 w-4" />
            Gestão de Usuários
          </TabsTrigger>
          <TabsTrigger value="organizations" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organizações
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Atividade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestão de Usuários</CardTitle>
                  <CardDescription>
                    Altere roles, permissões e status de todos os usuários
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="btn-gradient-seusdados text-white">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredUsers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum usuário encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Papéis Cliente</TableHead>
                      <TableHead>Organização</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Último Acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((u) => {
                      const role = roleLabels[u.role] || roleLabels.cliente;
                      const org = organizations?.find(o => o.id === u.organizationId);
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <p className="font-medium">{u.name || "Sem nome"}</p>
                          </TableCell>
                          <TableCell className="text-sm">
                            {u.email || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={role.variant}>{role.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {(u as any).clientRoles && (u as any).clientRoles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {(u as any).clientRoles.map((cr: string) => {
                                  const clientRoleLabels: Record<string, { label: string; color: string }> = {
                                    'sponsor': { label: 'Sponsor', color: 'bg-blue-100 text-blue-800' },
                                    'sponsor': { label: 'DPO Interno', color: 'bg-purple-100 text-purple-800' },
                                    'comite': { label: 'Comitê', color: 'bg-orange-100 text-orange-800' },
                                    'lider_processo': { label: 'Líder de Processo', color: 'bg-green-100 text-green-800' },
                                    'gestor_area': { label: 'Gestor de Área', color: 'bg-indigo-100 text-indigo-800' },
                                  };
                                  const crLabel = clientRoleLabels[cr] || { label: cr, color: 'bg-gray-100 text-gray-800' };
                                  return (
                                    <span key={cr} className={`px-2 py-1 rounded text-xs font-medium ${crLabel.color}`}>
                                      {crLabel.label}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {org?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.isActive ? "default" : "secondary"}>
                              {u.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="body-small">
                            {new Date(u.lastSignedIn).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(u)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar Usuário
                                </DropdownMenuItem>
                                {u.isActive ? (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setUserToRevoke({
                                        id: u.id,
                                        name: u.name,
                                        email: u.email,
                                        role: u.role,
                                        organizationId: u.organizationId,
                                        isActive: Boolean(u.isActive),
                                      });
                                      setIsRevokeDialogOpen(true);
                                    }}
                                    className="text-destructive"
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Revogar Acesso
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => handleActivateUser({
                                      id: u.id,
                                      name: u.name,
                                      email: u.email,
                                      role: u.role,
                                      organizationId: u.organizationId,
                                      isActive: Boolean(u.isActive),
                                    })}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Ativar Usuário
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organizações Cadastradas</CardTitle>
              <CardDescription>
                Lista de todas as organizações clientes na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingOrgs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : organizations?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma organização cadastrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organização</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criada em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations?.map((org) => (
                      <TableRow 
                        key={org.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/organizacoes/${org.id}`)}
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
                          {org.cnpj || "-"}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{org.email || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.isActive ? "default" : "secondary"}>
                            {org.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="body-small">
                          {new Date(org.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>
                Histórico de ações na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Log de atividades em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as permissões e configurações do usuário
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editingUser.name || ''} disabled />
              </div>
              
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={editingUser.email || ''} disabled />
              </div>
              
              <RoleSelector
                mainRole={editingUser.role as UserRole}
                clientRoles={editingUser.clientRoles || []}
                onMainRoleChange={(role) => setEditingUser({ ...editingUser, role })}
                onClientRolesChange={(roles) => setEditingUser({ ...editingUser, clientRoles: roles })}
              />
              
              <div className="space-y-2">
                <Label>Organização Vinculada</Label>
                <Select
                  value={editingUser.organizationId?.toString() || 'none'}
                  onValueChange={(value) => setEditingUser({ 
                    ...editingUser, 
                    organizationId: value === 'none' ? null : parseInt(value) 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma organização" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Usuário Ativo</Label>
                <Switch
                  checked={editingUser.isActive}
                  onCheckedChange={(checked) => setEditingUser({ ...editingUser, isActive: checked })}
                />
              </div>
              
              {/* Papéis de Cliente (Multi-seleção) */}
              <div className="space-y-2">
                <Label>Papéis de Cliente (Múltiplos)</Label>
                <div className="space-y-2 border rounded p-3 bg-slate-50">
                  {[
                    { value: 'sponsor', label: 'Sponsor' },
                    { value: 'sponsor', label: 'DPO Interno' },
                    { value: 'comite', label: 'Comitê' },
                    { value: 'lider_processo', label: 'Líder de Processo' },
                    { value: 'gestor_area', label: 'Gestor de Área' },
                  ].map((role) => (
                    <div key={role.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.value}`}
                        checked={(editingUser.clientRoles || []).includes(role.value as any)}
                        onCheckedChange={(checked) => {
                          const currentRoles = editingUser.clientRoles || [];
                          if (checked) {
                            setEditingUser({
                              ...editingUser,
                              clientRoles: [...currentRoles, role.value as any],
                            });
                          } else {
                            setEditingUser({
                              ...editingUser,
                              clientRoles: currentRoles.filter(r => r !== role.value),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`role-${role.value}`} className="cursor-pointer">
                        {role.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveUser}
              disabled={updateUserMutation.isPending}
              className="btn-gradient-seusdados text-white"
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário na plataforma. O usuário receberá um convite por e-mail para completar o cadastro.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input 
                  value={newUser.name} 
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nome do usuário"
                />
              </div>
              
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input 
                  type="email"
                  value={newUser.email} 
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input 
                  value={newUser.phone} 
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <RoleSelector
                mainRole={newUser.role as UserRole}
                clientRoles={newUser.clientRoles || []}
                onMainRoleChange={(role) => setNewUser({ ...newUser, role })}
                onClientRolesChange={(roles) => setNewUser({ ...newUser, clientRoles: roles })}
              />
              
              <div className="space-y-2">
                <Label>Organização Vinculada</Label>
                <Select
                  value={newUser.organizationId?.toString() || 'none'}
                onValueChange={(value) => setNewUser({ 
                  ...newUser, 
                  organizationId: value === 'none' ? null : parseInt(value) 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma organização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label>Ativar Imediatamente</Label>
                <p className="body-small">O usuário terá acesso imediato sem precisar confirmar o e-mail</p>
              </div>
              <Switch
                checked={newUser.activateImmediately}
                onCheckedChange={(checked) => setNewUser({ ...newUser, activateImmediately: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              className="btn-gradient-seusdados text-white"
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Usuário
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke User Access Dialog */}
      <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar Acesso do Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar o acesso de <strong>{userToRevoke?.name}</strong>? 
              O usuário não poderá mais acessar a plataforma até que seu acesso seja reativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevokeUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revogando...
                </>
              ) : (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Revogar Acesso
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
