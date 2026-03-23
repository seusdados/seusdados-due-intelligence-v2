import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Shield, 
  Search, 
  Edit, 
  UserCog,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Crown,
  Briefcase,
  UserCheck,
  Eye,
  Building2,
  RefreshCw
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { MainLayout, PageHeader, Section, Card as LayoutCard, CardGrid } from '@/components/MainLayout';

// Definição dos 9 perfis
const PROFILES = [
  {
    id: 'admin_global',
    label: 'Admin Global',
    description: 'Acesso total ao sistema, gerencia todos os recursos e usuários',
    category: 'interno',
    color: 'bg-violet-600',
    icon: Crown,
    permissions: ['all'],
  },
  {
    id: 'admin_global',
    label: 'PMO',
    description: 'Gerencia projetos e acompanha indicadores de todas as organizações',
    category: 'interno',
    color: 'bg-violet-500',
    icon: Briefcase,
    permissions: ['view_all', 'manage_projects', 'reports'],
  },
  {
    id: 'consultor',
    label: 'Consultor',
    description: 'Executa avaliações e gerencia clientes atribuídos',
    category: 'interno',
    color: 'bg-blue-500',
    icon: UserCheck,
    permissions: ['assessments', 'clients', 'documents'],
  },
  {
    id: 'consultor',
    label: 'Consultor Par',
    description: 'Revisor de avaliações realizadas por outros consultores',
    category: 'interno',
    color: 'bg-cyan-500',
    icon: Eye,
    permissions: ['review', 'view_assessments'],
  },
  {
    id: 'sponsor',
    label: 'Sponsor',
    description: 'Sponsor executivo com visão estratégica do cliente',
    category: 'cliente',
    color: 'bg-pink-500',
    icon: Crown,
    permissions: ['view_org', 'approve', 'reports'],
  },
  {
    id: 'sponsor',
    label: 'DPO Interno',
    description: 'Encarregado de proteção de dados da organização',
    category: 'cliente',
    color: 'bg-amber-500',
    icon: Shield,
    permissions: ['view_org', 'manage_privacy', 'incidents'],
  },
  {
    id: 'comite',
    label: 'Comitê',
    description: 'Membro do comitê de privacidade da organização',
    category: 'cliente',
    color: 'bg-orange-500',
    icon: Users,
    permissions: ['view_org', 'meetings', 'vote'],
  },
  {
    id: 'lider_processo',
    label: 'Líder de Processo',
    description: 'Responsável por processos de tratamento de dados na organização',
    category: 'cliente',
    color: 'bg-teal-500',
    icon: UserCheck,
    permissions: ['view_org', 'manage_processes'],
  },
  {
    id: 'gestor_area',
    label: 'Gestor de Área',
    description: 'Gestor responsável por área organizacional com tratamento de dados',
    category: 'cliente',
    color: 'bg-sky-500',
    icon: Users,
    permissions: ['view_org', 'manage_area'],
  },
  {
    id: 'sponsor',
    label: 'Usuário',
    description: 'Usuário padrão com acesso básico à organização',
    category: 'cliente',
    color: 'bg-emerald-500',
    icon: UserCog,
    permissions: ['view_own', 'tickets'],
  },
  {
    id: 'terceiro',
    label: 'Terceiro',
    description: 'Fornecedor ou parceiro externo com acesso limitado',
    category: 'externo',
    color: 'bg-indigo-500',
    icon: Building2,
    permissions: ['assessments_own', 'documents_own'],
  },
];

const PROFILE_CATEGORIES = [
  { id: 'interno', label: 'Equipe Interna', description: 'Colaboradores da Seusdados' },
  { id: 'cliente', label: 'Cliente', description: 'Usuários das organizações clientes' },
  { id: 'externo', label: 'Externo', description: 'Terceiros e parceiros' },
];

export default function ProfileManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  // Queries
  const { data: users, isLoading, refetch } = trpc.user.list.useQuery();

  // Mutation para atualizar role
  const updateRoleMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      toast.success('Perfil atualizado com sucesso!');
      setSelectedUser(null);
      setNewRole('');
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });

  const handleRoleChange = () => {
    if (!selectedUser || !newRole) return;
    setShowConfirmDialog(true);
  };

  const confirmRoleChange = () => {
    if (!selectedUser || !newRole) return;
    updateRoleMutation.mutate({
      id: selectedUser.id,
      role: newRole as 'admin_global' | 'consultor' | 'sponsor',
    });
    setShowConfirmDialog(false);
  };

  const getProfileInfo = (roleId: string) => {
    return PROFILES.find(p => p.id === roleId) || PROFILES[7]; // Default: usuario
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let filtered = users;
    
    if (selectedCategory !== 'all') {
      const categoryProfiles = PROFILES.filter(p => p.category === selectedCategory).map(p => p.id);
      filtered = filtered.filter((u: any) => categoryProfiles.includes(u.role));
    }
    
    return filtered;
  }, [users, selectedCategory]);

  // Estatísticas por perfil
  const profileStats = useMemo(() => {
    if (!users) return {};
    const counts: Record<string, number> = {};
    users.forEach((u: any) => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return counts;
  }, [users]);

  // Verificar se o usuário atual pode gerenciar perfis
  if (user?.role !== 'admin_global') {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Shield className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Acesso Restrito
          </h2>
          <p className="text-[var(--text-muted)]">
            Apenas administradores globais podem gerenciar perfis de usuários.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Gestão de Perfis"
        subtitle="Gerencie os perfis e permissões dos usuários do sistema"
        breadcrumb={[
          { label: 'Configurações', href: '/admin' },
          { label: 'Gestão de Perfis' },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Perfis Disponíveis
          </TabsTrigger>
        </TabsList>

        {/* Tab: Usuários */}
        <TabsContent value="users" className="space-y-6">
          {/* Cards de estatísticas */}
          <CardGrid columns={4}>
            <Card className="bg-white rounded-xl p-5 border border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Total de Usuários</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{users?.length || 0}</p>
                </div>
                <Users className="w-8 h-8 text-[var(--brand-accent)] opacity-50" />
              </div>
            </Card>
            
            {PROFILE_CATEGORIES.map(cat => {
              const count = PROFILES
                .filter(p => p.category === cat.id)
                .reduce((sum, p) => sum + (profileStats[p.id] || 0), 0);
              return (
                <Card key={cat.id} className="bg-white rounded-xl p-5 border border-[var(--border-default)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">{cat.label}</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">{count}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${
                      cat.id === 'interno' ? 'bg-violet-100' :
                      cat.id === 'cliente' ? 'bg-emerald-100' : 'bg-indigo-100'
                    }`}>
                      {cat.id === 'interno' ? <Briefcase className="w-5 h-5 text-violet-600" /> :
                       cat.id === 'cliente' ? <Building2 className="w-5 h-5 text-emerald-600" /> :
                       <Users className="w-5 h-5 text-indigo-600" />}
                    </div>
                  </div>
                </Card>
              );
            })}
          </CardGrid>

          {/* Filtros */}
          <Card className="bg-white rounded-xl p-4 border border-[var(--border-default)]">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {PROFILE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </Card>

          {/* Tabela de usuários */}
          <Card className="bg-white rounded-xl border border-[var(--border-default)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil Atual</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--text-muted)]" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u: any) => {
                    const profile = getProfileInfo(u.role);
                    const ProfileIcon = profile.icon;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${profile.color} flex items-center justify-center text-white font-semibold`}>
                              {u.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-[var(--text-muted)]">ID: {u.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[var(--text-secondary)]">{u.email}</TableCell>
                        <TableCell>
                          <Badge className={`${profile.color} text-white`}>
                            <ProfileIcon className="w-3 h-3 mr-1" />
                            {profile.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[var(--text-secondary)]">
                          {u.organizationName || '-'}
                        </TableCell>
                        <TableCell>
                          {u.isActive ? (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-500 text-red-600">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setNewRole(u.role);
                            }}
                            disabled={u.id === user?.id}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar Perfil
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab: Perfis Disponíveis */}
        <TabsContent value="profiles" className="space-y-6">
          {PROFILE_CATEGORIES.map(category => (
            <Section key={category.id} title={category.label} subtitle={category.description}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PROFILES.filter(p => p.category === category.id).map(profile => {
                  const ProfileIcon = profile.icon;
                  const count = profileStats[profile.id] || 0;
                  return (
                    <Card key={profile.id} className="bg-white rounded-xl p-5 border border-[var(--border-default)] hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${profile.color}`}>
                          <ProfileIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-[var(--text-primary)]">{profile.label}</h3>
                            <Badge variant="outline">{count} usuário{count !== 1 ? 's' : ''}</Badge>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">
                            {profile.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-3">
                            {profile.permissions.slice(0, 3).map(perm => (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                            {profile.permissions.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{profile.permissions.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Section>
          ))}
        </TabsContent>
      </Tabs>

      {/* Dialog de edição de perfil */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Perfil do Usuário</DialogTitle>
            <DialogDescription>
              Selecione o novo perfil para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-[var(--bg-subtle)] rounded-lg">
              <div className={`w-12 h-12 rounded-full ${getProfileInfo(selectedUser?.role || 'sponsor').color} flex items-center justify-center text-white font-semibold text-lg`}>
                {selectedUser?.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-medium">{selectedUser?.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{selectedUser?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Perfil Atual</Label>
              <div className="flex items-center gap-2">
                <Badge className={`${getProfileInfo(selectedUser?.role || 'sponsor').color} text-white`}>
                  {getProfileInfo(selectedUser?.role || 'sponsor').label}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Novo Perfil</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o novo perfil" />
                </SelectTrigger>
                <SelectContent>
                  {PROFILES.map(profile => {
                    const ProfileIcon = profile.icon;
                    return (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded ${profile.color} flex items-center justify-center`}>
                            <ProfileIcon className="w-3 h-3 text-white" />
                          </div>
                          <span>{profile.label}</span>
                          <span className="text-xs text-[var(--text-muted)]">({profile.category})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {newRole && newRole !== selectedUser?.role && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Atenção</p>
                    <p className="text-sm text-amber-700">
                      Alterar o perfil modificará as permissões de acesso do usuário.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRoleChange}
              disabled={!newRole || newRole === selectedUser?.role || updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração de Perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a alterar o perfil de <strong>{selectedUser?.name}</strong> de{' '}
              <Badge className={`${getProfileInfo(selectedUser?.role || 'sponsor').color} text-white mx-1`}>
                {getProfileInfo(selectedUser?.role || 'sponsor').label}
              </Badge>{' '}
              para{' '}
              <Badge className={`${getProfileInfo(newRole).color} text-white mx-1`}>
                {getProfileInfo(newRole).label}
              </Badge>.
              <br /><br />
              Esta ação modificará as permissões de acesso do usuário. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirmar Alteração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
