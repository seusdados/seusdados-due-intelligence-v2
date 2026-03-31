import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  UserCog, 
  Search, 
  Plus, 
  Edit, 
  Building2,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
  MoreHorizontal,
  Trash2,
  Power,
  PowerOff,
  Send,
  Users,
  Briefcase,
  AlertTriangle,
  Link2,
  Copy,
  ExternalLink
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useState, useMemo } from "react";
import { useToast } from "@/contexts/ToastContext";
import { getInviteLoginUrl } from "@/const";

const roleLabels: Record<string, { label: string; color: string; description: string; category: string; needsOrg: boolean }> = {
  admin_global: { 
    label: "Admin Global", 
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    description: "Acesso total à plataforma e todas as organizações",
    category: "Equipe Interna",
    needsOrg: false,
  },
  consultor: { 
    label: "Consultor", 
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    description: "Executa avaliações e gerencia clientes atribuídos",
    category: "Equipe Interna",
    needsOrg: false,
  },
  sponsor: { 
    label: "Sponsor", 
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    description: "Sponsor executivo com visão estratégica do cliente",
    category: "Cliente",
    needsOrg: true,
  },
  comite: { 
    label: "Comitê", 
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    description: "Membro do comitê de privacidade da organização",
    category: "Cliente",
    needsOrg: true,
  },
  lider_processo: { 
    label: "Líder de Processo", 
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    description: "Responsável por processos de tratamento de dados na organização",
    category: "Cliente",
    needsOrg: true,
  },
  gestor_area: { 
    label: "Gestor de Área", 
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    description: "Gestor responsável por área organizacional com tratamento de dados",
    category: "Cliente",
    needsOrg: true,
  },
  respondente: { 
    label: "Respondente", 
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    description: "Respondente de avaliações e ações atribuídas",
    category: "Cliente",
    needsOrg: true,
  },
  terceiro: { 
    label: "Terceiro", 
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    description: "Fornecedor ou parceiro externo com acesso limitado",
    category: "Externo",
    needsOrg: true,
  },
};


export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const { selectedOrganization } = useOrganization();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [userToToggle, setUserToToggle] = useState<any>(null);
  
  // Novo usuário
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    phone: string;
    role: string;
    organizationId: number | null;
  }>({
    name: "",
    email: "",
    phone: "",
    role: "sponsor",
    organizationId: selectedOrganization?.id || null,
  });

  const utils = trpc.useUtils();
  const { data: users, isLoading, refetch } = trpc.user.list.useQuery();
  const { data: organizations } = trpc.organization.list.useQuery();
  
  const updateMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso");
      utils.user.list.invalidate();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar usuário", error.message);
    }
  });

  const createMutation = trpc.user.create.useMutation();

  const deleteMutation = trpc.user.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso");
      utils.user.list.invalidate();
      setUserToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao excluir usuário", error.message);
    }
  });

  // Verificar se o usuário atual é da equipe interna (admin_global, consultor)
  const isSeusdadosUser = ['admin_global', 'consultor'].includes(currentUser?.role || '');

  // Filtrar por organização selecionada (isolamento de tenant)
  const orgFilteredUsers = useMemo(() => {
    if (!users) return [];
    // Se há uma organização selecionada, mostrar usuários dela + usuários globais (admin/consultor)
    if (selectedOrganization && isSeusdadosUser) {
      return users.filter((u: any) => 
        u.organizationId === selectedOrganization.id ||
        u.role === 'admin_global' ||
        u.role === 'consultor'
      );
    }
    // Se não há organização selecionada, mostrar todos os usuários
    return users || [];
  }, [users, selectedOrganization, isSeusdadosUser]);

  // Filtrar usuários por aba e busca (usando dados já filtrados por organização)
  const filteredUsers = orgFilteredUsers?.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "todos") return matchesSearch;
    if (activeTab === "seusdados") return matchesSearch && roleLabels[user.role]?.category === 'Equipe Interna';
    if (activeTab === "clientes") return matchesSearch && (roleLabels[user.role]?.category === 'Cliente' || roleLabels[user.role]?.category === 'Externo');
    if (activeTab === "inativos") return matchesSearch && !user.isActive;
    
    return matchesSearch;
  });

  const handleEditUser = (user: any) => {
    setEditingUser({ ...user });
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    updateMutation.mutate({
      id: editingUser.id,
      name: editingUser.name,
      email: editingUser.email,
      phone: editingUser.phone,
      role: editingUser.role,
      organizationId: editingUser.organizationId,
      isActive: editingUser.isActive,
    });
  };

  const handleCreateUser = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('[handleCreateUser] Chamado com dados:', JSON.stringify(newUser));
    
    if (!newUser.name) {
      toast.error("Campo obrigatório", "O nome do usuário é obrigatório.");
      return;
    }
    if (!newUser.email) {
      toast.error("Campo obrigatório", "O e-mail do usuário é obrigatório.");
      return;
    }
    if (!newUser.role) {
      toast.error("Campo obrigatório", "Selecione um perfil de acesso.");
      return;
    }
    
    // Se o perfil precisa de organização, validar
    const selectedRole = roleLabels[newUser.role];
    if (selectedRole?.needsOrg && !newUser.organizationId) {
      toast.error("Campo obrigatório", "Selecione uma organização para este perfil.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || undefined,
        role: newUser.role as any,
        organizationId: selectedRole?.needsOrg ? newUser.organizationId : null,
      });
      toast.success("Usuário criado com sucesso", "E-mail de primeiro acesso enviado.");
      utils.user.list.invalidate();
      setIsCreateDialogOpen(false);
      setNewUser({
        name: "",
        email: "",
        phone: "",
        role: "sponsor",
        organizationId: selectedOrganization?.id || null,
      });
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro desconhecido ao criar usuário';
      toast.error("Erro ao criar usuário", errorMessage);
    }
  };

  const handleToggleStatus = () => {
    if (!userToToggle) return;
    updateMutation.mutate({
      id: userToToggle.id,
      isActive: !userToToggle.isActive,
    });
    setUserToToggle(null);
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    deleteMutation.mutate({ id: userToDelete.id });
  };

  const stats = [
    { 
      label: "Total de Usu\u00e1rios", 
      value: orgFilteredUsers?.length || 0, 
      icon: UserCog,
      color: "from-violet-500 to-purple-600"
    },
    { 
      label: "Equipe Seusdados", 
      value: orgFilteredUsers?.filter(u => roleLabels[u.role]?.category === 'Equipe Interna').length || 0, 
      icon: Briefcase,
      color: "from-violet-500 to-blue-600"
    },
    { 
      label: "Clientes e Externos", 
      value: orgFilteredUsers?.filter(u => roleLabels[u.role]?.category === 'Cliente' || roleLabels[u.role]?.category === 'Externo').length || 0, 
      icon: Building2,
      color: "from-green-500 to-emerald-600"
    },
    { 
      label: "Inativos", 
      value: orgFilteredUsers?.filter(u => !u.isActive).length || 0, 
      icon: UserX,
      color: "from-gray-400 to-gray-500"
    },
  ];

  if (!isSeusdadosUser) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-lg font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Apenas usuários Seusdados podem gerenciar usuários da plataforma.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Usuários"
        subtitle="Gerencie os usuários da plataforma Seusdados"
        icon={UserCog}
        showBack={false}
        showDPOButton={false}
        actions={
          ['admin_global', 'consultor'].includes(currentUser?.role || '') ? (
            <Button 
              onClick={() => {
                setNewUser({
                  name: "",
                  email: "",
                  phone: "",
                  role: "sponsor",
                  organizationId: selectedOrganization?.id || null,
                });
                setIsCreateDialogOpen(true);
              }}
              className="bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          ) : null
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center">
                <div className={`p-4 bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="p-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs e Tabela */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="todos" className="gap-2">
                    <Users className="h-4 w-4" />
                    Todos
                  </TabsTrigger>
                  <TabsTrigger value="seusdados" className="gap-2">
                    <Briefcase className="h-4 w-4" />
                    Seusdados
                  </TabsTrigger>
                  <TabsTrigger value="clientes" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Clientes
                  </TabsTrigger>
                  <TabsTrigger value="inativos" className="gap-2">
                    <UserX className="h-4 w-4" />
                    Inativos
                  </TabsTrigger>
                </TabsList>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuários..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => {
                  const isInternal = roleLabels[user.role]?.category === 'Equipe Interna';
                  return (
                    <TableRow key={user.id} className={!user.isActive ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-medium ${
                            isInternal 
                              ? 'bg-gradient-to-br from-violet-500 to-blue-500' 
                              : 'bg-gradient-to-br from-green-500 to-emerald-500'
                          }`}>
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-medium">{user.name || "Sem nome"}</p>
                            {user.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {user.email || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleLabels[user.role]?.color || "bg-gray-100"}>
                          {roleLabels[user.role]?.label || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {roleLabels[user.role]?.category || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.organizationId ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {organizations?.find(o => o.id === user.organizationId)?.name || `ID: ${user.organizationId}`}
                          </div>
                        ) : (
                          <span className="body-small">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? (
                              <><UserCheck className="h-3 w-3 mr-1" /> Ativo</>
                            ) : (
                              <><UserX className="h-3 w-3 mr-1" /> Inativo</>
                            )}
                          </Badge>
                          {(user.openId?.startsWith('manual_') || user.openId?.startsWith('quick_')) && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Aguardando 1º login
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="body-small">
                        {new Date(user.lastSignedIn).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={user.id === currentUser?.id}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {/* Vincular a organização rapidamente */}
                            {selectedOrganization && user.organizationId !== selectedOrganization.id && (
                              <DropdownMenuItem onClick={() => {
                                updateMutation.mutate({
                                  id: user.id,
                                  organizationId: selectedOrganization.id,
                                });
                                toast.success("Usuário vinculado", `Vinculado a ${selectedOrganization.name}`);
                              }}>
                                <Link2 className="h-4 w-4 mr-2" />
                                Vincular a {selectedOrganization.name?.substring(0, 20)}{(selectedOrganization.name?.length || 0) > 20 ? '...' : ''}
                              </DropdownMenuItem>
                            )}
                            {(user.openId?.startsWith('manual_') || user.openId?.startsWith('quick_')) && user.email && (
                              <>
                                <DropdownMenuItem onClick={() => {
                                  const inviteUrl = getInviteLoginUrl(user.email!);
                                  navigator.clipboard.writeText(inviteUrl);
                                  toast.success("Link de convite copiado", "Envie este link para o usuário fazer o primeiro login.");
                                }}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copiar Link de Convite
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  const inviteUrl = getInviteLoginUrl(user.email!);
                                  window.open(inviteUrl, '_blank');
                                }}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Abrir Link de Login
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => setUserToToggle(user)}>
                              {user.isActive ? (
                                <><PowerOff className="h-4 w-4 mr-2" /> Suspender</>
                              ) : (
                                <><Power className="h-4 w-4 mr-2" /> Ativar</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setUserToDelete(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
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

      {/* Dialog de Criar Usuário */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={handleCreateUser}>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário. Um e-mail de primeiro acesso será enviado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
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

            {/* Perfil de Acesso - todos os 11 perfis disponíveis */}
            <div className="space-y-2">
              <Label>Perfil de Acesso *</Label>
              <Select 
                value={newUser.role} 
                onValueChange={(v) => {
                  const selectedRoleConfig = roleLabels[v];
                  setNewUser({ 
                    ...newUser, 
                    role: v,
                    organizationId: selectedRoleConfig?.needsOrg 
                      ? (selectedOrganization?.id || newUser.organizationId) 
                      : null
                  });
                }}
              >
                <SelectTrigger className="min-w-[200px]">
                  <SelectValue placeholder="Selecione o perfil de acesso" />
                </SelectTrigger>
                <SelectContent className="z-[9999] max-h-[300px]" position="popper" sideOffset={4}>
                  {/* Todos os 7 perfis oficiais estão disponíveis */}
                  {/* Equipe Interna */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Equipe Interna</div>
                  {Object.entries(roleLabels)
                    .filter(([key, cfg]) => {
                      if (cfg.category !== 'Equipe Interna') return false;
                      // Apenas admin_global pode criar outros admin_global
                      if (key === 'admin_global' && currentUser?.role !== 'admin_global') return false;
                      return true;
                    })
                    .map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${cfg.color.split(' ')[0]}`} />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                  {/* Cliente */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1.5">Cliente</div>
                  {Object.entries(roleLabels).filter(([key, cfg]) => cfg.category === 'Cliente').map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${cfg.color.split(' ')[0]}`} />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                  {/* Externo */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1.5">Externo</div>
                  {Object.entries(roleLabels).filter(([_, cfg]) => cfg.category === 'Externo').map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${cfg.color.split(' ')[0]}`} />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {roleLabels[newUser.role]?.description}
              </p>
            </div>

            {/* Organização - só aparece quando o perfil exige vínculo */}
            {roleLabels[newUser.role]?.needsOrg && (
              <div className="space-y-2">
                <Label>Organização *</Label>
                <Select 
                  value={newUser.organizationId?.toString() || "placeholder"} 
                  onValueChange={(v) => {
                    if (v !== "placeholder") {
                      setNewUser({ ...newUser, organizationId: parseInt(v) });
                    }
                  }}
                >
                  <SelectTrigger className="min-w-[200px]">
                    <SelectValue placeholder="Selecione uma organização" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] max-h-[300px]" position="popper" sideOffset={4}>
                    <SelectItem value="placeholder" disabled>
                      Selecione uma organização
                    </SelectItem>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {org.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOrganization && newUser.organizationId === selectedOrganization.id && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Organização atual selecionada no filtro global
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  O usuário terá acesso apenas aos dados desta organização
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={createMutation.isPending}
              onClick={(e) => {
                // Fallback: se o form submit não disparar nativamente, chama o handler diretamente
                e.preventDefault();
                handleCreateUser(e as any);
              }}
              className="bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600"
            >
              <Send className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar Usuário */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }}>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingUser.name || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editingUser.phone || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Perfil de Acesso</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(v) => {
                    const selectedRoleConfig = roleLabels[v];
                    setEditingUser({ 
                      ...editingUser, 
                      role: v,
                      organizationId: selectedRoleConfig?.needsOrg 
                        ? editingUser.organizationId 
                        : null
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] max-h-[300px]" position="popper" sideOffset={4}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Equipe Interna</div>
                    {Object.entries(roleLabels).filter(([_, cfg]) => cfg.category === 'Equipe Interna').map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${cfg.color.split(' ')[0]}`} />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1.5">Cliente</div>
                    {Object.entries(roleLabels).filter(([_, cfg]) => cfg.category === 'Cliente').map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${cfg.color.split(' ')[0]}`} />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1.5">Externo</div>
                    {Object.entries(roleLabels).filter(([_, cfg]) => cfg.category === 'Externo').map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${cfg.color.split(' ')[0]}`} />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {roleLabels[editingUser.role]?.description}
                </p>
              </div>

              {/* Organização - aparece quando o perfil exige */}
              {roleLabels[editingUser.role]?.needsOrg && (
                <div className="space-y-2">
                  <Label>Organização *</Label>
                  <Select 
                    value={editingUser.organizationId?.toString() || "none"} 
                    onValueChange={(v) => setEditingUser({ 
                      ...editingUser, 
                      organizationId: v === "none" ? null : parseInt(v) 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma organização" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] max-h-[300px]" position="popper" sideOffset={4}>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3" />
                            {org.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O usuário terá acesso apenas aos dados desta organização
                  </p>
                </div>
              )}

              {/* Organização - mensagem quando perfil não exige */}
              {!roleLabels[editingUser.role]?.needsOrg && (
                <div className="space-y-2">
                  <Label>Organização</Label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30">
                    <Shield className="h-4 w-4 text-violet-500" />
                    <span className="text-sm text-muted-foreground">
                      Este perfil tem acesso a todas as organizações
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={editingUser.isActive ? "active" : "inactive"} 
                  onValueChange={(v) => setEditingUser({ ...editingUser, isActive: v === "active" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={updateMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleSaveUser();
              }}
              className="bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog de Suspender/Ativar */}
      <AlertDialog open={!!userToToggle} onOpenChange={() => setUserToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.isActive ? "Suspender Usuário" : "Ativar Usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle?.isActive 
                ? `Tem certeza que deseja suspender o usuário "${userToToggle?.name}"? Ele não poderá mais acessar a plataforma.`
                : `Tem certeza que deseja ativar o usuário "${userToToggle?.name}"? Ele poderá acessar a plataforma novamente.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>
              {userToToggle?.isActive ? "Suspender" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog de Excluir */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente o usuário "{userToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
