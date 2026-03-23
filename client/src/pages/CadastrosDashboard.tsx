import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, InfoCard, CardGrid, SectionHeader } from '@/components/DashboardCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { 
  Building2, Users, Mail, UserPlus, TrendingUp, TrendingDown,
  Search, Filter, Plus, Edit, Trash2, MoreHorizontal, RefreshCw,
  CheckCircle2, Clock, AlertCircle, XCircle, ArrowUpRight, ArrowDownRight,
  Minus, Eye, Send, Copy, ExternalLink, Shield, UserCheck, UserX,
  Upload, Image as ImageIcon, Building, Briefcase, Phone, Globe,
  MapPin, FileText, Calendar, Activity, PieChart as PieChartIcon,
  BarChart3, Layers, Settings, ChevronRight, X, FileDown
} from "lucide-react";
import { 
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  Cell
} from "recharts";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

// Cores do tema
const THEME_COLORS = {
  primary: '#8b5cf6',
  primaryLight: '#a78bfa',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#64748b'
};

const ROLE_COLORS = {
  admin_global: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', fill: '#ef4444', label: 'Admin Global' },
  consultor: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', fill: '#22c55e', label: 'Consultor' },
  cliente: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', fill: '#3b82f6', label: 'Cliente' }
};

const STATUS_COLORS = {
  active: { bg: '#f0fdf4', text: '#16a34a', label: 'Ativo' },
  inactive: { bg: '#fef2f2', text: '#dc2626', label: 'Inativo' },
  pending: { bg: '#fefce8', text: '#ca8a04', label: 'Pendente' },
  accepted: { bg: '#f0fdf4', text: '#16a34a', label: 'Aceito' },
  expired: { bg: '#f1f5f9', text: '#64748b', label: 'Expirado' },
  cancelled: { bg: '#fef2f2', text: '#dc2626', label: 'Cancelado' }
};

// Hook para animação de contagem
function useCountAnimation(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  
  return count;
}

// Componente de KPI Card Premium
function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  gradient,
  onClick,
  tooltip
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  gradient: string;
  onClick?: () => void;
  tooltip?: string;
}) {
  const animatedValue = useCountAnimation(value);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={`relative overflow-hidden border-0 shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${gradient}`}
            onClick={onClick}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
            
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/80 uppercase tracking-wider mb-1">
                    {title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white tabular-nums">
                      {animatedValue}
                    </span>
                    {trend && (
                      <div className={`flex items-center gap-1 text-sm ${
                        trend === 'up' ? 'text-emerald-200' : 
                        trend === 'down' ? 'text-red-200' : 'text-white/60'
                      }`}>
                        {trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                        {trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                        {trend === 'stable' && <Minus className="w-4 h-4" />}
                        <span>{trendValue}</span>
                      </div>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-sm text-white/70 mt-1 font-light">{subtitle}</p>
                  )}
                </div>
                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent side="bottom" className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// Componente de Card de Organização
function OrganizationCard({ 
  org, 
  onEdit, 
  onDelete,
  onView
}: { 
  org: any; 
  onEdit: () => void; 
  onDelete: () => void;
  onView: () => void;
}) {
  const isActive = org.isActive !== false;
  
  return (
    <Card className="group relative overflow-hidden border border-border hover:border-violet-300 transition-all duration-300 hover:shadow-lg">
      <div 
        className={`absolute top-0 left-0 right-0 h-1 ${isActive ? 'bg-emerald-500' : 'bg-muted'}`}
      />
      
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {org.name?.charAt(0)?.toUpperCase() || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-card-foreground truncate">{org.name}</h3>
              <p className="text-sm text-muted-foreground font-light truncate">
                {org.cnpj || 'CNPJ não informado'}
              </p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-muted text-muted-foreground'} border-0 text-xs font-medium`}
          >
            {isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-semibold text-card-foreground">{org.userCount || 0}</p>
            <p className="text-xs text-muted-foreground">Usuários</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-semibold text-card-foreground">{org.thirdPartyCount || 0}</p>
            <p className="text-xs text-muted-foreground">Terceiros</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <p className="text-lg font-semibold text-card-foreground">{org.assessmentCount || 0}</p>
            <p className="text-xs text-muted-foreground">Avaliações</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Criado em {org.createdAt ? new Date(org.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView}>
              <Eye className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Função para gerar iniciais do nome
function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return 'U';
}

// Componente de Avatar com foto ou iniciais
function UserAvatar({ 
  user, 
  size = 'md',
  roleConfig 
}: { 
  user: any; 
  size?: 'sm' | 'md' | 'lg';
  roleConfig: typeof ROLE_COLORS.cliente;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg'
  };
  
  const initials = getInitials(user.name, user.email);
  
  if (user.avatarUrl || user.photoUrl || user.profilePicture) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden ring-2 ring-white shadow-sm`}>
        <img 
          src={user.avatarUrl || user.photoUrl || user.profilePicture} 
          alt={user.name || 'Avatar do usuário'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback para iniciais se a imagem falhar
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `<div class="${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold" style="background-color: ${roleConfig.fill}">${initials}</div>`;
          }}
        />
      </div>
    );
  }
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white shadow-sm`}
      style={{ backgroundColor: roleConfig.fill }}
    >
      {initials}
    </div>
  );
}

// Componente de Card de Usuário
function UserCard({ 
  user, 
  onEdit, 
  onDelete,
  onToggleStatus,
  canEdit = false
}: { 
  user: any; 
  onEdit: () => void; 
  onDelete: () => void;
  onToggleStatus?: () => void;
  canEdit?: boolean;
}) {
  const roleConfig = ROLE_COLORS[user.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.cliente;
  const isActive = user.isActive !== false && user.isActive !== 0;
  
  return (
    <Card className="group relative overflow-hidden border border-border hover:border-violet-300 transition-all duration-300 hover:shadow-lg">
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: roleConfig.fill }}
      />
      
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="md" roleConfig={roleConfig} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-card-foreground truncate">{user.name || 'Sem nome'}</h3>
              <p className="text-sm text-muted-foreground font-light truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge 
              variant="outline" 
              className="border-0 text-xs font-medium"
              style={{ backgroundColor: roleConfig.bg, color: roleConfig.text }}
            >
              {roleConfig.label}
            </Badge>
            <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
              {isActive ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>
        
        {user.organizationName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Building2 className="w-4 h-4" />
            <span className="truncate">{user.organizationName}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {user.lastLogin ? `Último acesso: ${new Date(user.lastLogin).toLocaleDateString('pt-BR')}` : 'Nunca acessou'}
          </span>
          {canEdit && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Editar">
                <Edit className="w-4 h-4 text-muted-foreground" />
              </Button>
              {onToggleStatus && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={onToggleStatus}
                  title={isActive ? "Inativar" : "Ativar"}
                >
                  {isActive ? (
                    <UserX className="w-4 h-4 text-amber-500" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                  )}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} title="Remover">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de Card de Convite
function InviteCard({ 
  invite, 
  onResend, 
  onCancel,
  onCopyLink
}: { 
  invite: any; 
  onResend: () => void; 
  onCancel: () => void;
  onCopyLink: () => void;
}) {
  const statusConfig = STATUS_COLORS[invite.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending;
  const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
  const finalStatus = isExpired && invite.status === 'pending' ? STATUS_COLORS.expired : statusConfig;
  
  return (
    <Card className="group relative overflow-hidden border border-border hover:border-violet-300 transition-all duration-300 hover:shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-card-foreground truncate">{invite.email}</h3>
              <p className="text-sm text-muted-foreground font-light">
                {ROLE_COLORS[invite.role as keyof typeof ROLE_COLORS]?.label || invite.role}
              </p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className="border-0 text-xs font-medium"
            style={{ backgroundColor: finalStatus.bg, color: finalStatus.text }}
          >
            {finalStatus.label}
          </Badge>
        </div>
        
        {invite.organizationName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Building2 className="w-4 h-4" />
            <span className="truncate">{invite.organizationName}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Expira em {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString('pt-BR') : 'N/A'}
          </span>
          <div className="flex items-center gap-1">
            {invite.status === 'pending' && !isExpired && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopyLink} title="Copiar link">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onResend} title="Reenviar">
                  <Send className="w-4 h-4 text-violet-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel} title="Cancelar">
                  <XCircle className="w-4 h-4 text-red-500" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CadastrosDashboard() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [, setLocation] = useLocation();
  
  // Verificar se o usuário é admin/consultor
  const isAdminOrConsultor = user?.role === 'admin_global' || user?.role === 'consultor';
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modais
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showNewInviteModal, setShowNewInviteModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<any>(null);
  
  // Form states
  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    tradeName: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    logoUrl: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  
  const [newInviteForm, setNewInviteForm] = useState<{
    email: string;
    role: 'admin' | 'consultor' | 'sponsor';
    organizationId: string;
  }>({
    email: '',
    role: 'sponsor',
    organizationId: ''
  });
  
  // Queries
  const { data: organizations, isLoading: orgsLoading, refetch: refetchOrgs } = trpc.organization.list.useQuery();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = trpc.user.list.useQuery();
  const { data: invites, isLoading: invitesLoading, refetch: refetchInvites } = trpc.userInvite.list.useQuery();
  
  // Mutations
  const createOrgMutation = trpc.organization.create.useMutation({
    onSuccess: () => {
      toast.success('Organização criada com sucesso!');
      setShowNewOrgModal(false);
      setNewOrgForm({ name: '', cnpj: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', logoUrl: '' });
      setLogoFile(null);
      setLogoPreview(null);
      refetchOrgs();
    },
    onError: (error) => {
      toast.error(`Erro ao criar organização: ${error.message}`);
    }
  });
  
  const updateOrgMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success('Organização atualizada com sucesso!');
      setEditingOrg(null);
      refetchOrgs();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar organização: ${error.message}`);
    }
  });
  
  const deleteOrgMutation = trpc.organization.delete.useMutation({
    onSuccess: () => {
      toast.success('Organização excluída com sucesso!');
      refetchOrgs();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir organização: ${error.message}`);
    }
  });
  
  const createInviteMutation = trpc.userInvite.create.useMutation({
    onSuccess: () => {
      toast.success('Convite enviado com sucesso!');
      setShowNewInviteModal(false);
      setNewInviteForm({ email: '', role: 'sponsor', organizationId: '' });
      refetchInvites();
    },
    onError: (error) => {
      toast.error(`Erro ao enviar convite: ${error.message}`);
    }
  });
  
  const resendInviteMutation = trpc.userInvite.resend.useMutation({
    onSuccess: () => {
      toast.success('Convite reenviado com sucesso!');
      refetchInvites();
    },
    onError: (error) => {
      toast.error(`Erro ao reenviar convite: ${error.message}`);
    }
  });
  
  const cancelInviteMutation = trpc.userInvite.cancel.useMutation({
    onSuccess: () => {
      toast.success('Convite cancelado!');
      refetchInvites();
    },
    onError: (error) => {
      toast.error(`Erro ao cancelar convite: ${error.message}`);
    }
  });
  
  // User mutations
  const updateUserMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      toast.success('Usuário atualizado com sucesso!');
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

  // Password management mutations
  const generateTempPasswordMutation = trpc.user.generateTemporaryPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setGeneratedPassword(data.temporaryPassword);
      setShowPasswordDialog(true);
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar senha: ${error.message}`);
    }
  });

  const setPasswordMutation = trpc.user.setPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowSetPasswordDialog(false);
      setNewPassword('');
    },
    onError: (error: any) => {
      toast.error(`Erro ao definir senha: ${error.message}`);
    }
  });

  const revokePasswordMutation = trpc.user.revokePassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(`Erro ao revogar senha: ${error.message}`);
    }
  });
  
  // User handlers
  const handleUpdateUser = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      id: editingUser.id,
      name: editingUser.name,
      email: editingUser.email,
      phone: editingUser.phone,
      role: editingUser.role,
      organizationId: editingUser.organizationId,
      isActive: editingUser.isActive
    });
  };
  
  const handleDeleteUser = (userId: number) => {
    if (confirm('Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.')) {
      deleteUserMutation.mutate({ id: userId });
    }
  };
  
  const handleToggleUserStatus = (user: any) => {
    const newStatus = user.isActive === false || user.isActive === 0 ? true : false;
    updateUserMutation.mutate({
      id: user.id,
      isActive: newStatus
    });
  };
  
  // Filtrar dados pela organização selecionada (isolamento de tenant)
  const orgFilteredOrganizations = useMemo(() => {
    if (!organizations) return [];
    // Se há uma organização selecionada, mostrar apenas ela
    if (selectedOrganization && isAdminOrConsultor) {
      return organizations.filter((o: any) => o.id === selectedOrganization.id);
    }
    // Se não há organização selecionada e é admin/consultor, mostrar todas
    return organizations;
  }, [organizations, selectedOrganization, isAdminOrConsultor]);
  
  const orgFilteredUsers = useMemo(() => {
    if (!users) return [];
    // Se há uma organização selecionada, mostrar usuários dela + usuários globais (admin/consultor)
    if (selectedOrganization && isAdminOrConsultor) {
      return users.filter((u: any) => 
        u.organizationId === selectedOrganization.id ||
        u.role === 'admin_global' ||
        u.role === 'consultor'
      );
    }
    // Se não há organização selecionada e é admin/consultor, mostrar todos
    return users;
  }, [users, selectedOrganization, isAdminOrConsultor]);
  
  const orgFilteredInvites = useMemo(() => {
    if (!invites) return [];
    // Se há uma organização selecionada, mostrar apenas convites dela
    if (selectedOrganization && isAdminOrConsultor) {
      return invites.filter((i: any) => i.organizationId === selectedOrganization.id);
    }
    // Se não há organização selecionada e é admin/consultor, mostrar todos
    return invites;
  }, [invites, selectedOrganization, isAdminOrConsultor]);
  
  // Estatísticas calculadas (usando dados filtrados por organização)
  const stats = {
    totalOrgs: orgFilteredOrganizations?.length || 0,
    activeOrgs: orgFilteredOrganizations?.filter((o: any) => o.isActive !== false).length || 0,
    totalUsers: orgFilteredUsers?.length || 0,
    activeUsers: orgFilteredUsers?.filter((u: any) => u.isActive !== false).length || 0,
    pendingInvites: orgFilteredInvites?.filter((i: any) => i.status === 'pending').length || 0,
    acceptedInvites: orgFilteredInvites?.filter((i: any) => i.status === 'accepted').length || 0,
    consultores: orgFilteredUsers?.filter((u: any) => u.role === 'consultor').length || 0,
    clientes: orgFilteredUsers?.filter((u: any) => u.role === 'sponsor').length || 0,
    admins: orgFilteredUsers?.filter((u: any) => u.role === 'admin_global').length || 0
  };
  
  // Dados para gráficos
  const roleDistribution = [
    { name: 'Admin Global', value: stats.admins, fill: ROLE_COLORS.admin_global.fill },
    { name: 'Consultores', value: stats.consultores, fill: ROLE_COLORS.consultor.fill },
    { name: 'Clientes', value: stats.clientes, fill: ROLE_COLORS.cliente.fill }
  ].filter(r => r.value > 0);
  
  const inviteStatusDistribution = [
    { name: 'Pendentes', value: stats.pendingInvites, fill: THEME_COLORS.warning },
    { name: 'Aceitos', value: stats.acceptedInvites, fill: THEME_COLORS.success },
    { name: 'Expirados', value: orgFilteredInvites?.filter((i: any) => i.status === 'expired').length || 0, fill: THEME_COLORS.muted },
    { name: 'Cancelados', value: orgFilteredInvites?.filter((i: any) => i.status === 'cancelled').length || 0, fill: THEME_COLORS.danger }
  ].filter(r => r.value > 0);
  
  // Filtros (aplicados sobre dados já filtrados por organização)
  const filteredOrgs = orgFilteredOrganizations?.filter((org: any) => {
    const matchesSearch = !searchTerm || 
      org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.cnpj?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && org.isActive !== false) ||
      (statusFilter === 'inactive' && org.isActive === false);
    return matchesSearch && matchesStatus;
  }) || [];
  
  const filteredUsers = orgFilteredUsers?.filter((user: any) => {
    const matchesSearch = !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];
  
  const filteredInvites = orgFilteredInvites?.filter((invite: any) => {
    const matchesSearch = !searchTerm || 
      invite.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invite.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];
  
  // Handlers
  const handleLogoUpload = async (file: File): Promise<string | null> => {
    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Erro ao fazer upload do logo');
      }
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload do logo');
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('O arquivo deve ter no máximo 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('O arquivo deve ser uma imagem');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleZipCodeChange = async (zipCode: string, type: 'new' | 'edit') => {
    // Remove caracteres não numéricos
    const cleanZipCode = zipCode.replace(/\D/g, '');
    
    if (type === 'new') {
      setNewOrgForm({ ...newOrgForm, zipCode });
    } else if (editingOrg) {
      setEditingOrg({ ...editingOrg, zipCode });
    }
    
    // Se tem menos de 8 dígitos, não faz a busca
    if (cleanZipCode.length < 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanZipCode}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      
      const addressData = {
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || ''
      };
      
      if (type === 'new') {
        setNewOrgForm({ ...newOrgForm, zipCode, ...addressData });
        toast.success('Endereço preenchido automaticamente');
      } else if (editingOrg) {
        setEditingOrg({ ...editingOrg, zipCode, ...addressData });
        toast.success('Endereço preenchido automaticamente');
      }
    } catch (error) {
      toast.error('Erro ao consultar CEP. Tente novamente.');
      console.error('CEP lookup error:', error);
    }
  };
  
  const handleCreateOrg = async () => {
    if (!newOrgForm.name) {
      toast.error('Nome da organização é obrigatório');
      return;
    }
    if (!newOrgForm.tradeName) {
      toast.error('Nome Fantasia é obrigatório');
      return;
    }
    
    let logoUrl = newOrgForm.logoUrl;
    
    if (logoFile) {
      const uploadedUrl = await handleLogoUpload(logoFile);
      if (uploadedUrl) {
        logoUrl = uploadedUrl;
      }
    }
    
    createOrgMutation.mutate({ ...newOrgForm, logoUrl });
  };
  
  const handleUpdateOrg = () => {
    if (!editingOrg) return;
    updateOrgMutation.mutate({
      id: editingOrg.id,
      ...editingOrg
    });
  };
  
  const handleDeleteOrg = (orgId: number) => {
    if (confirm('Tem certeza que deseja excluir esta organização? Esta ação não pode ser desfeita.')) {
      deleteOrgMutation.mutate({ id: orgId });
    }
  };
  
  const handleCreateInvite = () => {
    if (!newInviteForm.email) {
      toast.error('E-mail é obrigatório');
      return;
    }
    createInviteMutation.mutate({
      ...newInviteForm,
      organizationId: newInviteForm.organizationId ? parseInt(newInviteForm.organizationId) : undefined
    });
  };
  
  const handleCopyInviteLink = (invite: any) => {
    const link = `${window.location.origin}/convite/${invite.token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para a área de transferência!');
  };
  
  // Mutation para gerar relatório
  const generateReportMutation = trpc.organization.generateCadastrosReport.useMutation({
    onSuccess: (data) => {
      // Converter base64 para blob e fazer download
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Relatório gerado com sucesso!');
      setExportingReport(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
      setExportingReport(false);
    }
  });
  
  const handleExportReport = () => {
    setExportingReport(true);
    generateReportMutation.mutate();
  };
  
  // Verificar permissão
  if (user?.role !== 'admin_global' && user?.role !== 'consultor') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="heading-4 text-card-foreground">Acesso Restrito</h2>
            <p className="text-muted-foreground mt-2">Você não tem permissão para acessar esta área.</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Layers className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-white/70 label-executive">Centro de Controle</p>
                  <h1 className="heading-2 text-white">Gestão de Cadastros</h1>
                  <p className="text-white/80 mt-1 font-light">
                    Gerencie organizações, usuários e convites em um único lugar.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={handleExportReport}
                  disabled={exportingReport}
                >
                  {exportingReport ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  {exportingReport ? 'Gerando...' : 'Exportar PDF'}
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => {
                    refetchOrgs();
                    refetchUsers();
                    refetchInvites();
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
                <Button 
                  className=""
                  onClick={() => {
                    if (activeTab === 'organizations') setShowNewOrgModal(true);
                    else if (activeTab === 'users') setShowNewInviteModal(true);
                    else if (activeTab === 'invites') setShowNewInviteModal(true);
                    else setShowNewOrgModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {activeTab === 'organizations' ? 'Nova Organização' : 
                   activeTab === 'users' ? 'Convidar Usuário' : 
                   activeTab === 'invites' ? 'Novo Convite' : 'Novo Cadastro'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="px-4 -mt-6">
          <CardGrid columns={4}>
            <div className="cursor-pointer" onClick={() => setActiveTab('organizations')}>
              <StatCard icon={Building2} iconGradient="violet" value={stats.totalOrgs} label="Organizações" subtitle={`${stats.activeOrgs} ativas`} trend={{ value: '+12%', positive: true }} />
            </div>
            <div className="cursor-pointer" onClick={() => setActiveTab('users')}>
              <StatCard icon={Users} iconGradient="emerald" value={stats.totalUsers} label="Usuários" subtitle={`${stats.activeUsers} ativos`} trend={{ value: '+8%', positive: true }} />
            </div>
            <div className="cursor-pointer" onClick={() => setActiveTab('invites')}>
              <StatCard icon={Mail} iconGradient="amber" value={stats.pendingInvites} label="Convites Pendentes" subtitle="Aguardando aceite" />
            </div>
            <div className="cursor-pointer" onClick={() => setActiveTab('users')}>
              <StatCard icon={UserCheck} iconGradient="blue" value={stats.consultores} label="Consultores" subtitle={`${stats.clientes} clientes`} />
            </div>
          </CardGrid>
        </div>
        
        {/* Tabs e Conteúdo */}
        <div className="px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-card shadow-sm border border-border">
                <TabsTrigger value="overview" className="gap-2">
                  <Activity className="w-4 h-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="organizations" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  Organizações
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="w-4 h-4" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="invites" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Convites
                </TabsTrigger>
              </TabsList>
              
              {activeTab !== 'overview' && (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  {activeTab === 'users' && (
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filtrar por role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Roles</SelectItem>
                        <SelectItem value="admin_global">Admin Global</SelectItem>
                        <SelectItem value="consultor">Consultor</SelectItem>
                        <SelectItem value="sponsor">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportReport}
                  disabled={exportingReport}
                >
                  {exportingReport ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  {exportingReport ? 'Gerando...' : 'Exportar PDF'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    refetchOrgs();
                    refetchUsers();
                    refetchInvites();
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
                <Button 
                  size="sm"
                  onClick={() => {
                    if (activeTab === 'organizations') setShowNewOrgModal(true);
                    else if (activeTab === 'users') setShowNewInviteModal(true);
                    else if (activeTab === 'invites') setShowNewInviteModal(true);
                    else setShowNewOrgModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {activeTab === 'organizations' ? 'Nova Organização' : 
                   activeTab === 'users' ? 'Convidar Usuário' : 
                   activeTab === 'invites' ? 'Novo Convite' : 'Novo Cadastro'}
                </Button>
              </div>
            </div>
            
            {/* Aba Visão Geral */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Distribuição por Role */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5 text-violet-500" />
                      Distribuição de Usuários por Role
                    </CardTitle>
                    <CardDescription>Proporção de usuários por tipo de acesso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {roleDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={roleDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {roleDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <p>Nenhum usuário cadastrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Gráfico de Status de Convites */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-violet-500" />
                      Status dos Convites
                    </CardTitle>
                    <CardDescription>Acompanhamento de convites enviados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {inviteStatusDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={inviteStatusDistribution} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={80} />
                          <RechartsTooltip />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {inviteStatusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        <p>Nenhum convite enviado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Resumo Rápido */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-violet-500" />
                    Resumo Rápido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-xl">
                      <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.totalOrgs}</p>
                      <p className="text-sm text-violet-600/70 dark:text-violet-400/70">Organizações</p>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalUsers}</p>
                      <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">Usuários</p>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingInvites}</p>
                      <p className="text-sm text-amber-600/70 dark:text-amber-400/70">Convites Pendentes</p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.acceptedInvites}</p>
                      <p className="text-sm text-blue-600/70 dark:text-blue-400/70">Convites Aceitos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Aba Organizações */}
            <TabsContent value="organizations" className="space-y-6">
              {orgsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
              ) : filteredOrgs.length === 0 ? (
                <Card className="shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Building2 className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground">Nenhuma organização encontrada</h3>
                    <p className="text-muted-foreground mt-1">Crie uma nova organização para começar.</p>
                    <Button className="mt-4" onClick={() => setShowNewOrgModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Organização
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrgs.map((org: any) => (
                    <OrganizationCard
                      key={org.id}
                      org={org}
                      onView={() => setLocation(`/organizacoes/${org.id}`)}
                      onEdit={() => setEditingOrg(org)}
                      onDelete={() => handleDeleteOrg(org.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            {/* Aba Usuários */}
            <TabsContent value="users" className="space-y-6">
              {usersLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <Card className="shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground">Nenhum usuário encontrado</h3>
                    <p className="text-muted-foreground mt-1">Envie um convite para adicionar usuários.</p>
                    <Button className="mt-4" onClick={() => setShowNewInviteModal(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Convidar Usuário
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((user: any) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onEdit={() => setEditingUser(user)}
                      onDelete={() => handleDeleteUser(user.id)}
                      onToggleStatus={() => handleToggleUserStatus(user)}
                      canEdit={true}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            {/* Aba Convites */}
            <TabsContent value="invites" className="space-y-6">
              {invitesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
              ) : filteredInvites.length === 0 ? (
                <Card className="shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Mail className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground">Nenhum convite encontrado</h3>
                    <p className="text-muted-foreground mt-1">Envie convites para adicionar novos usuários.</p>
                    <Button className="mt-4" onClick={() => setShowNewInviteModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Convite
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInvites.map((invite: any) => (
                    <InviteCard
                      key={invite.id}
                      invite={invite}
                      onResend={() => resendInviteMutation.mutate({ id: invite.id })}
                      onCancel={() => cancelInviteMutation.mutate({ id: invite.id })}
                      onCopyLink={() => handleCopyInviteLink(invite)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Modal Nova Organização */}
        <Dialog open={showNewOrgModal} onOpenChange={setShowNewOrgModal}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-violet-500" />
                Nova Organização
              </DialogTitle>
              <DialogDescription>
                Preencha os dados para criar uma nova organização cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Upload de Logo */}
              <div className="grid gap-2">
                <Label>Logo da Organização</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('logo')?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {logoFile ? 'Alterar Logo' : 'Selecionar Logo'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou SVG. Máx 2MB.</p>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Organização *</Label>
                <Input
                  id="name"
                  value={newOrgForm.name}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tradeName">Nome Fantasia *</Label>
                <Input
                  id="tradeName"
                  value={newOrgForm.tradeName || ''}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, tradeName: e.target.value })}
                  placeholder="Nome comercial da empresa"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={newOrgForm.cnpj}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={newOrgForm.phone}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newOrgForm.email}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, email: e.target.value })}
                  placeholder="contato@empresa.com.br"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={newOrgForm.zipCode}
                  onChange={(e) => handleZipCodeChange(e.target.value, 'new')}
                  placeholder="00000-000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="street">Logradouro</Label>
                <Input
                  id="street"
                  value={newOrgForm.street || ''}
                  onChange={(e) => setNewOrgForm({ ...newOrgForm, street: e.target.value })}
                  placeholder="Rua, Avenida, etc."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={newOrgForm.number || ''}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, number: e.target.value })}
                    placeholder="Número"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={newOrgForm.complement || ''}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, complement: e.target.value })}
                    placeholder="Apto, Sala, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={newOrgForm.neighborhood || ''}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, neighborhood: e.target.value })}
                    placeholder="Bairro"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={newOrgForm.city}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, city: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={newOrgForm.state}
                    onChange={(e) => setNewOrgForm({ ...newOrgForm, state: e.target.value })}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewOrgModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateOrg} disabled={createOrgMutation.isPending}>
                {createOrgMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Criar Organização
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Modal Editar Organização */}
        <Dialog open={!!editingOrg} onOpenChange={() => setEditingOrg(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-violet-500" />
                Editar Organização
              </DialogTitle>
            </DialogHeader>
            {editingOrg && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Nome da Organização *</Label>
                  <Input
                    id="edit-name"
                    value={editingOrg.name || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-tradeName">Nome Fantasia *</Label>
                  <Input
                    id="edit-tradeName"
                    value={editingOrg.tradeName || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, tradeName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-cnpj">CNPJ</Label>
                    <Input
                      id="edit-cnpj"
                      value={editingOrg.cnpj || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, cnpj: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Telefone</Label>
                    <Input
                      id="edit-phone"
                      value={editingOrg.phone || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">E-mail</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingOrg.email || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-zipCode">CEP</Label>
                  <Input
                    id="edit-zipCode"
                    value={editingOrg.zipCode || ''}
                    onChange={(e) => handleZipCodeChange(e.target.value, 'edit')}
                    placeholder="00000-000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-street">Logradouro</Label>
                  <Input
                    id="edit-street"
                    value={editingOrg.street || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, street: e.target.value })}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-number">Número</Label>
                    <Input
                      id="edit-number"
                      value={editingOrg.number || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, number: e.target.value })}
                      placeholder="Número"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-complement">Complemento</Label>
                    <Input
                      id="edit-complement"
                      value={editingOrg.complement || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, complement: e.target.value })}
                      placeholder="Apto, Sala, etc."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-neighborhood">Bairro</Label>
                    <Input
                      id="edit-neighborhood"
                      value={editingOrg.neighborhood || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, neighborhood: e.target.value })}
                      placeholder="Bairro"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-city">Cidade</Label>
                    <Input
                      id="edit-city"
                      value={editingOrg.city || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, city: e.target.value })}
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-state">Estado</Label>
                    <Input
                      id="edit-state"
                      value={editingOrg.state || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, state: e.target.value })}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingOrg(null)}>
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
        
        {/* Modal Novo Convite */}
        <Dialog open={showNewInviteModal} onOpenChange={setShowNewInviteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-violet-500" />
                Convidar Usuário
              </DialogTitle>
              <DialogDescription>
                Envie um convite por e-mail para adicionar um novo usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">E-mail *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={newInviteForm.email}
                  onChange={(e) => setNewInviteForm({ ...newInviteForm, email: e.target.value })}
                  placeholder="usuario@email.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Tipo de Acesso *</Label>
                <Select 
                  value={newInviteForm.role} 
                  onValueChange={(value) => setNewInviteForm({ ...newInviteForm, role: value as 'admin' | 'consultor' | 'sponsor' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sponsor">Cliente</SelectItem>
                    <SelectItem value="consultor">Consultor</SelectItem>
                    {user?.role === 'admin_global' && (
                      <SelectItem value="admin_global">Admin Global</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {newInviteForm.role === 'sponsor' && (
                <div className="grid gap-2">
                  <Label htmlFor="invite-org">Organização</Label>
                  <Select 
                    value={newInviteForm.organizationId} 
                    onValueChange={(value) => setNewInviteForm({ ...newInviteForm, organizationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a organização" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations?.map((org: any) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewInviteModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateInvite} disabled={createInviteMutation.isPending}>
                {createInviteMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar Convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Modal Editar Usuário */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-violet-500" />
                Editar Usuário
              </DialogTitle>
              <DialogDescription>
                Atualize as informações do usuário.
              </DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-user-name">Nome</Label>
                  <Input
                    id="edit-user-name"
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-user-email">E-mail</Label>
                  <Input
                    id="edit-user-email"
                    type="email"
                    value={editingUser.email || ''}
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
                      <SelectItem value="consultor">Consultor</SelectItem>
                      {user?.role === 'admin_global' && (
                        <SelectItem value="admin_global">Admin Global</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-user-org">Organização</Label>
                  <Select 
                    value={editingUser.organizationId?.toString() || 'none'} 
                    onValueChange={(value) => setEditingUser({ ...editingUser, organizationId: value === 'none' ? null : parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a organização" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {organizations?.map((org: any) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-user-isActive"
                    checked={editingUser.isActive !== false && editingUser.isActive !== 0}
                    onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="edit-user-isActive">Usuário Ativo</Label>
                </div>

                {/* Gestão de Senhas - Apenas para Admin Global e Consultor */}
                {(user?.role === 'admin_global' || user?.role === 'consultor') && (
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-sm font-medium text-card-foreground mb-3 block">Gestão de Senha</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUserForPassword(editingUser);
                          generateTempPasswordMutation.mutate({ userId: editingUser.id });
                        }}
                        disabled={generateTempPasswordMutation.isPending}
                        className="text-xs"
                      >
                        {generateTempPasswordMutation.isPending ? (
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Shield className="w-3 h-3 mr-1" />
                        )}
                        Gerar Temporária
                      </Button>
                      {user?.role === 'admin_global' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUserForPassword(editingUser);
                            setShowSetPasswordDialog(true);
                          }}
                          className="text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Definir Senha
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja revogar a senha deste usuário? Ele precisará redefinir no próximo login.')) {
                            revokePasswordMutation.mutate({ userId: editingUser.id });
                          }
                        }}
                        disabled={revokePasswordMutation.isPending}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        {revokePasswordMutation.isPending ? (
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        Revogar Senha
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
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

        {/* Modal de Senha Temporária Gerada */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                Senha Temporária Gerada
              </DialogTitle>
              <DialogDescription>
                A senha temporária foi gerada com sucesso. Copie e envie ao usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-2">Senha Temporária (válida por 24 horas)</p>
                <p className="text-2xl font-mono font-bold text-violet-600 select-all">{generatedPassword}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPassword);
                    toast.success('Senha copiada!');
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Senha
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                O usuário deverá alterar a senha no primeiro acesso.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowPasswordDialog(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Definir Nova Senha */}
        <Dialog open={showSetPasswordDialog} onOpenChange={setShowSetPasswordDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-violet-500" />
                Definir Nova Senha
              </DialogTitle>
              <DialogDescription>
                Defina uma nova senha para {selectedUserForPassword?.name || selectedUserForPassword?.email}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                A senha deve ter no mínimo 8 caracteres. O usuário será obrigado a alterá-la no primeiro acesso.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowSetPasswordDialog(false);
                setNewPassword('');
              }}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (newPassword.length < 8) {
                    toast.error('A senha deve ter no mínimo 8 caracteres');
                    return;
                  }
                  setPasswordMutation.mutate({
                    userId: selectedUserForPassword.id,
                    newPassword: newPassword
                  });
                }}
                disabled={setPasswordMutation.isPending || newPassword.length < 8}
              >
                {setPasswordMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Definir Senha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
