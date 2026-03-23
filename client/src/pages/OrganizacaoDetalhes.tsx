import { useState } from "react";
import { trpc } from "@/lib/trpc";
// DashboardLayout removido - já é aplicado no App.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft,
  Building2,
  Users,
  Briefcase,
  ClipboardCheck,
  FileSearch,
  Plus,
  Edit,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  UserPlus,
  Shield,
  Key,
  Archive,
  Eye,
  MoreHorizontal,
  UserCheck,
  UserX,
  Mail
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_COLORS = {
  admin_global: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', fill: '#ef4444', label: 'Admin Global' },
  consultor: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', fill: '#22c55e', label: 'Consultor' },
  cliente: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', fill: '#3b82f6', label: 'Cliente' }
};

export default function OrganizacaoDetalhes() {
  const params = useParams<{ id: string }>();
  const organizationId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  
  // Modal states
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  // Form states
  const [editOrgForm, setEditOrgForm] = useState({
    name: '',
    tradeName: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    isActive: true
  });
  
  const [newUserForm, setNewUserForm] = useState<{
    name: string;
    email: string;
    phone: string;
    role: 'consultor' | 'admin_global' | 'sponsor';
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'sponsor'
  });

  const { data: organization, isLoading, refetch: refetchOrg } = trpc.organization.getById.useQuery(
    { id: organizationId },
    { enabled: !!organizationId }
  );

  const { data: users, refetch: refetchUsers } = trpc.user.listByOrganization.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: thirdParties } = trpc.thirdParty.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: complianceAssessments } = trpc.compliance.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: thirdPartyAssessments } = trpc.thirdPartyAssessment.list.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );
  
  // Mutations
  const updateOrgMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success('Organização atualizada com sucesso!');
      setShowEditOrgModal(false);
      refetchOrg();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar organização: ${error.message}`);
    }
  });
  
  const createUserMutation = trpc.user.create.useMutation({
    onSuccess: () => {
      toast.success('Usuário criado com sucesso!');
      setShowAddUserModal(false);
      setNewUserForm({ name: '', email: '', phone: '', role: 'sponsor' });
      refetchUsers();
    },
    onError: (error) => {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    }
  });
  
  const updateUserMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso!');
      setShowEditUserModal(false);
      setEditingUser(null);
      refetchUsers();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    }
  });
  
  const deleteUserMutation = trpc.user.delete.useMutation({
    onSuccess: () => {
      toast.success('Usuário removido com sucesso!');
      refetchUsers();
    },
    onError: (error) => {
      toast.error(`Erro ao remover usuário: ${error.message}`);
    }
  });
  
  // Handlers
  const handleOpenEditOrg = () => {
    if (organization) {
      setEditOrgForm({
        name: organization.name || '',
        tradeName: organization.tradeName || '',
        cnpj: organization.cnpj || '',
        email: organization.email || '',
        phone: organization.phone || '',
        address: organization.address || '',
        city: organization.city || '',
        state: organization.state || '',
        zipCode: organization.zipCode || '',
        isActive: organization.isActive !== 0
      });
      setShowEditOrgModal(true);
    }
  };
  
  const handleUpdateOrg = () => {
    updateOrgMutation.mutate({
      id: organizationId,
      ...editOrgForm
    });
  };
  
  const handleCreateUser = () => {
    if (!newUserForm.name || !newUserForm.email) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }
    createUserMutation.mutate({
      ...newUserForm,
      organizationId
    });
  };
  
  const handleOpenEditUser = (user: any) => {
    setEditingUser({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'sponsor',
      isActive: user.isActive !== 0
    });
    setShowEditUserModal(true);
  };
  
  const handleUpdateUser = () => {
    if (!editingUser) return;
    updateUserMutation.mutate(editingUser);
  };
  
  const handleToggleUserStatus = (user: any) => {
    const newStatus = user.isActive === false ? true : false;
    updateUserMutation.mutate({
      id: user.id,
      isActive: newStatus
    });
  };
  
  const handleDeleteUser = (userId: number) => {
    if (confirm('Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.')) {
      deleteUserMutation.mutate({ id: userId });
    }
  };
  
  // Verificar permissão para editar
  const canEdit = currentUser?.role === 'admin_global' || currentUser?.role === 'consultor';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-lg font-semibold mb-2">Organização não encontrada</h2>
            <Button onClick={() => setLocation('/cadastros')}>
              Voltar para cadastros
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: "Usuários", value: users?.length || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Terceiros", value: thirdParties?.length || 0, icon: Briefcase, color: "text-green-600", bg: "bg-green-100" },
    { label: "Avaliações PPPD", value: complianceAssessments?.length || 0, icon: ClipboardCheck, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Due Diligence", value: thirdPartyAssessments?.length || 0, icon: FileSearch, color: "text-orange-600", bg: "bg-orange-100" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        {/* Header Premium */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white -mx-3 md:-mx-4 -mt-3 md:-mt-4 px-4 py-6 mb-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20"
                  onClick={() => setLocation('/cadastros')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-white/70 label-executive">Organização</p>
                  <h1 className="heading-2 text-white">{organization.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    {organization.tradeName && (
                      <span className="text-white/80 text-sm">{organization.tradeName}</span>
                    )}
                    <Badge 
                      variant="outline" 
                      className={`border-0 ${organization.isActive !== 0 ? 'bg-emerald-500/20 text-emerald-100' : 'bg-slate-500/20 text-slate-200'}`}
                    >
                      {organization.isActive !== 0 ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </div>
              </div>
              {canEdit && (
                <Button 
                  className="bg-white text-violet-600 hover:bg-violet-50"
                  onClick={handleOpenEditOrg}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Organização
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {stats.map((stat, index) => (
            <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="body-small">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Organization Info */}
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-500" />
              Informações da Organização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="body-small">CNPJ</p>
                <p className="font-medium font-mono">{organization.cnpj || "Não informado"}</p>
              </div>
              <div>
                <p className="body-small">E-mail</p>
                <p className="font-medium">{organization.email || "Não informado"}</p>
              </div>
              <div>
                <p className="body-small">Telefone</p>
                <p className="font-medium">{organization.phone || "Não informado"}</p>
              </div>
              <div>
                <p className="body-small">Endereço</p>
                <p className="font-medium">{organization.address || "Não informado"}</p>
              </div>
              <div>
                <p className="body-small">Cidade/Estado</p>
                <p className="font-medium">
                  {organization.city ? `${organization.city}/${organization.state}` : "Não informado"}
                </p>
              </div>
              <div>
                <p className="body-small">Criada em</p>
                <p className="font-medium">
                  {new Date(organization.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="thirdparties" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Terceiros
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Conformidade
            </TabsTrigger>
            <TabsTrigger value="duediligence" className="gap-2">
              <FileSearch className="h-4 w-4" />
              Due Diligence
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-500" />
                    Usuários
                  </CardTitle>
                  <CardDescription>Usuários vinculados a esta organização</CardDescription>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setShowAddUserModal(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar Usuário
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {users?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum usuário vinculado</p>
                    {canEdit && (
                      <Button className="mt-4" variant="outline" onClick={() => setShowAddUserModal(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Adicionar Usuário
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        {canEdit && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map((user: any) => {
                        const roleConfig = ROLE_COLORS[user.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.cliente;
                        const isActive = user.isActive !== false && user.isActive !== 0;
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name || "Sem nome"}</TableCell>
                            <TableCell>{user.email || "-"}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="border-0"
                                style={{ backgroundColor: roleConfig.bg, color: roleConfig.text }}
                              >
                                {roleConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={isActive ? "default" : "secondary"}>
                                {isActive ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            {canEdit && (
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleOpenEditUser(user)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleUserStatus(user)}>
                                      {isActive ? (
                                        <>
                                          <UserX className="mr-2 h-4 w-4" />
                                          Inativar
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="mr-2 h-4 w-4" />
                                          Ativar
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => handleDeleteUser(user.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remover
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="thirdparties">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-violet-500" />
                    Terceiros
                  </CardTitle>
                  <CardDescription>Parceiros e fornecedores cadastrados</CardDescription>
                </div>
                <Button size="sm" onClick={() => setLocation(`/terceiros/novo?org=${organizationId}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent>
                {thirdParties?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum terceiro cadastrado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Risco</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {thirdParties?.map((tp: any) => (
                        <TableRow 
                          key={tp.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/terceiros/${tp.id}`)}
                        >
                          <TableCell className="font-medium">{tp.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{tp.type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{tp.cnpj || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={tp.riskLevel === 'baixo' ? 'default' : tp.riskLevel === 'critico' ? 'destructive' : 'secondary'}>
                              {tp.riskLevel || "Não avaliado"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-violet-500" />
                    Avaliações de Conformidade
                  </CardTitle>
                  <CardDescription>Avaliações PPPD realizadas</CardDescription>
                </div>
                <Button size="sm" onClick={() => setLocation(`/avaliacoes?org=${organizationId}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Avaliação
                </Button>
              </CardHeader>
              <CardContent>
                {complianceAssessments?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma avaliação realizada</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Framework</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Maturidade</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceAssessments?.map((a: any) => (
                        <TableRow 
                          key={a.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/avaliacoes/${a.id}`)}
                        >
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{a.framework}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={a.status === 'concluida' ? 'default' : 'secondary'}>
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{a.maturityLevel || "-"}</TableCell>
                          <TableCell className="body-small">
                            {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="duediligence">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="w-5 h-5 text-violet-500" />
                    Avaliações Due Diligence
                  </CardTitle>
                  <CardDescription>Avaliações de terceiros realizadas</CardDescription>
                </div>
                <Button size="sm" onClick={() => setLocation(`/due-diligence/nova?org=${organizationId}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Avaliação
                </Button>
              </CardHeader>
              <CardContent>
                {thirdPartyAssessments?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileSearch className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma avaliação realizada</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Terceiro</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Risco</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {thirdPartyAssessments?.map((a: any) => (
                        <TableRow 
                          key={a.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setLocation(`/due-diligence/${a.id}${a.status === 'concluida' ? '/resultado' : ''}`)}
                        >
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>{a.thirdPartyName || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={a.status === 'concluida' ? 'default' : 'secondary'}>
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              a.riskClassification === 'baixo' ? 'default' : 
                              a.riskClassification === 'critico' ? 'destructive' : 'secondary'
                            }>
                              {a.riskClassification || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="body-small">
                            {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Modal Editar Organização */}
        <Dialog open={showEditOrgModal} onOpenChange={setShowEditOrgModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-violet-500" />
                Editar Organização
              </DialogTitle>
              <DialogDescription>
                Atualize as informações da organização.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nome da Organização *</Label>
                <Input
                  id="edit-name"
                  value={editOrgForm.name}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-tradeName">Nome Fantasia</Label>
                <Input
                  id="edit-tradeName"
                  value={editOrgForm.tradeName}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, tradeName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-cnpj">CNPJ</Label>
                  <Input
                    id="edit-cnpj"
                    value={editOrgForm.cnpj}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, cnpj: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={editOrgForm.phone}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editOrgForm.email}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-address">Endereço</Label>
                <Input
                  id="edit-address"
                  value={editOrgForm.address}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-city">Cidade</Label>
                  <Input
                    id="edit-city"
                    value={editOrgForm.city}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, city: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-state">Estado</Label>
                  <Input
                    id="edit-state"
                    value={editOrgForm.state}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, state: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-zipCode">CEP</Label>
                  <Input
                    id="edit-zipCode"
                    value={editOrgForm.zipCode}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, zipCode: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={editOrgForm.isActive}
                  onChange={(e) => setEditOrgForm({ ...editOrgForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="edit-isActive">Organização Ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditOrgModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateOrg} disabled={updateOrgMutation.isPending}>
                {updateOrgMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Modal Adicionar Usuário */}
        <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-violet-500" />
                Adicionar Usuário
              </DialogTitle>
              <DialogDescription>
                Crie um novo usuário para esta organização.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-name">Nome *</Label>
                <Input
                  id="new-name"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-email">E-mail *</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="usuario@email.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-phone">Telefone</Label>
                <Input
                  id="new-phone"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-role">Tipo de Acesso</Label>
                <Select 
                  value={newUserForm.role} 
                  onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value as 'consultor' | 'admin_global' | 'sponsor' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sponsor">Cliente</SelectItem>
                    {currentUser?.role === 'admin_global' && (
                      <>
                        <SelectItem value="consultor">Consultor</SelectItem>
                        <SelectItem value="admin_global">Admin Global</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Criar Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Modal Editar Usuário */}
        <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-violet-500" />
                Editar Usuário
              </DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-user-name">Nome</Label>
                  <Input
                    id="edit-user-name"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-user-email">E-mail</Label>
                  <Input
                    id="edit-user-email"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-user-phone">Telefone</Label>
                  <Input
                    id="edit-user-phone"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-user-role">Tipo de Acesso</Label>
                  <Select 
                    value={editingUser.role} 
                    onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sponsor">Cliente</SelectItem>
                      {currentUser?.role === 'admin_global' && (
                        <>
                          <SelectItem value="consultor">Consultor</SelectItem>
                          <SelectItem value="admin_global">Admin Global</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-user-isActive"
                    checked={editingUser.isActive}
                    onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="edit-user-isActive">Usuário Ativo</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditUserModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
