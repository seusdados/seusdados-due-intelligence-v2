import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { 
  ShieldCheck, 
  LayoutGrid, 
  ClipboardCheck, 
  Search, 
  FileText, 
  Landmark, 
  Headphones,
  Bell,
  User,
  ChevronDown,
  LogOut,
  Settings,
  HardDrive,
  Building2,
  Users,
  UserCog,
  UserPlus,
  Gauge,
  Scale,
  Map,
  Shield,
  ClipboardList,
  UserCheck,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  FileSearch,
  Bot,
  Brain,
  Activity,
  BookOpen,
  Tags,
  Play,
  Fingerprint,
  Cog,
  FolderKanban,
  FileEdit,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { OrganizationSelectorCompact } from "@/components/OrganizationSelectorCompact";
import { useOrganization } from "@/contexts/OrganizationContext";

// Tipos
type UserRole = 'admin_global' | 'admin_global' | 'consultor' | 'consultor' | 'sponsor' | 'sponsor' | 'comite' | 'lider_processo' | 'gestor_area' | 'sponsor' | 'terceiro';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  roles?: UserRole[];
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  items?: NavItem[];
  roles?: UserRole[];
}

// Definição das seções de navegação
const navSections: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutGrid,
    path: '/dashboard',
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    icon: Building2,
    roles: ['admin_global', 'consultor'],
    items: [
      { icon: Building2, label: "Organizações", path: "/cadastros", roles: ['admin_global', 'consultor'] },
      { icon: Users, label: "Terceiros", path: "/terceiros", roles: ['admin_global', 'consultor'] },
      { icon: UserCog, label: "Usuários", path: "/usuarios", roles: ['admin_global', 'consultor'] },
      { icon: UserPlus, label: "Convites", path: "/convites", roles: ['admin_global', 'consultor'] },
    ]
  },
  {
    id: 'avaliacoes',
    label: 'Avaliações',
    icon: ShieldCheck,
    items: [
      { icon: ShieldCheck, label: "Avaliações de Conformidade", path: "/avaliacoes", roles: ['admin_global', 'consultor', 'sponsor', 'lider_processo', 'gestor_area', 'comite'] },
      { icon: FileSearch, label: "Due Diligence", path: "/due-diligence", roles: ['admin_global', 'consultor'] },
      { icon: Scale, label: "Análise de Contratos", path: "/analise-contratos", roles: ['admin_global', 'consultor'] },
      { icon: Map, label: "Mapeamento de Dados", path: "/mapeamentos", roles: ['admin_global', 'consultor'] },
      { icon: Shield, label: "DPIA & Revisões", path: "/dpia", roles: ['admin_global', 'consultor'] },
      { icon: Shield, label: "Painel de RIPDs", path: "/ripd-admin", roles: ['admin_global', 'consultor'] },
      { icon: Gauge, label: "Dashboard Compliance", path: "/compliance", roles: ['admin_global', 'consultor'] },
    ]
  },
  {
    id: 'plano-acao',
    label: 'Plano de Ação',
    icon: ClipboardList,
    roles: ['admin_global', 'consultor', 'sponsor', 'lider_processo', 'gestor_area', 'respondente', 'comite'],
    items: [
      { icon: Activity, label: "Central Global de Acompanhamento", path: "/painel-global", roles: ['admin_global', 'consultor'] },
      { icon: ClipboardCheck, label: "Plano de Ação – Avaliações de Conformidade (Maturidade)", path: "/plano-acao/maturidade", roles: ['admin_global', 'consultor', 'sponsor', 'lider_processo', 'gestor_area', 'respondente', 'comite'] },
      { icon: FileSearch, label: "Plano de Ação – Análise de Contratos", path: "/plano-acao/contratos", roles: ['admin_global', 'consultor'] },
      { icon: FileText, label: "Plano de Ação – Due Diligence", path: "/plano-acao/due-diligence", roles: ['admin_global', 'consultor'] },
    ]
  },
  {
    id: 'governanca',
    label: 'Governança',
    icon: Landmark,
    roles: ['admin_global', 'consultor', 'sponsor', 'comite'],
    items: [
      { icon: Building2, label: "Comitê de Privacidade", path: "/governanca", roles: ['admin_global', 'consultor', 'sponsor', 'comite'] },
      { icon: UserCheck, label: "Direitos dos Titulares", path: "/central-direitos", roles: ['admin_global', 'consultor'] },
      { icon: AlertTriangle, label: "Gestão de Incidentes", path: "/incidentes", roles: ['admin_global', 'consultor', 'sponsor'] },
      { icon: Shield, label: "Incidentes + PA ANPD", path: "/pa-anpd", roles: ['admin_global', 'consultor', 'sponsor'] },
    ]
  },
  {
    id: 'meudpo',
    label: 'MeuDPO',
    icon: Headphones,
    roles: ['admin_global', 'consultor', 'sponsor', 'lider_processo', 'gestor_area'],
    items: [
      { icon: Headphones, label: "Tickets", path: "/meudpo", roles: ['admin_global', 'consultor', 'sponsor', 'lider_processo', 'gestor_area'] },
      { icon: BarChart3, label: "Painel SLA", path: "/meudpo/sla", roles: ['admin_global', 'consultor'] },
      { icon: Gauge, label: "Dashboard SLA", path: "/sla-dashboard", roles: ['admin_global', 'consultor'] },
      { icon: TrendingUp, label: "Produtividade", path: "/meudpo/produtividade", roles: ['admin_global', 'consultor'] },
      { icon: FileSearch, label: "Relatórios", path: "/meudpo/reports", roles: ['admin_global', 'consultor'] },
    ]
  },
  {
    id: 'documentos',
    label: 'GED',
    icon: HardDrive,
    roles: ['admin_global', 'consultor', 'sponsor', 'comite'],
    items: [
      { icon: HardDrive, label: "GED Seusdados", path: "/ged", roles: ['admin_global', 'consultor'] },
      { icon: FolderKanban, label: "GED Cliente", path: "/ged-cliente", roles: ['admin_global', 'consultor', 'sponsor', 'comite'] },
      { icon: FileEdit, label: "Templates", path: "/templates", roles: ['admin_global', 'consultor'] },
    ]
  },
  {
    id: 'ia',
    label: 'IA',
    icon: Bot,
    roles: ['admin_global', 'consultor'],
    items: [
      { icon: Bot, label: "Assistente IA", path: "/admin/ia", roles: ['admin_global', 'consultor'] },
      { icon: Brain, label: "Regras XAI", path: "/admin/ia/xai-regras", roles: ['admin_global', 'consultor'] },
      { icon: Activity, label: "Auditoria XAI", path: "/admin/ia/xai-auditoria", roles: ['admin_global', 'consultor'] },
    ]
  },
  {
    id: 'config',
    label: 'Config',
    icon: Cog,
    roles: ['admin_global', 'consultor'],
    items: [
      { icon: BookOpen, label: "Catálogo de Serviços", path: "/catalogo-servicos", roles: ['admin_global', 'consultor'] },
      { icon: Tags, label: "Tags e Categorias", path: "/meudpo/tags", roles: ['admin_global', 'consultor'] },
      { icon: FileText, label: "Templates de Resposta", path: "/meudpo/templates", roles: ['admin_global', 'consultor'] },
      { icon: Settings, label: "Config. MeuDPO", path: "/meudpo/config", roles: ['admin_global', 'consultor'] },
      { icon: Play, label: "Simulador CPPD", path: "/simulador-cppd", roles: ['admin_global', 'consultor'] },
      { icon: Fingerprint, label: "Assinatura Gov.br", path: "/admin/govbr-assinatura", roles: ['admin_global', 'consultor'] },
      { icon: TrendingUp, label: "Relatórios Atividades", path: "/relatorios-atividades", roles: ['admin_global', 'consultor'] },
      { icon: Shield, label: "Administração", path: "/admin", roles: ['admin_global'] },
      { icon: UserCog, label: "Gestão de Perfis", path: "/admin/perfis", roles: ['admin_global'] },
    ]
  },
];

// Cores dos perfis
const profileColors: Record<string, string> = {
  admin_global: 'bg-[var(--profile-admin)]',
  consultor: 'bg-[var(--profile-consultor)]',
  sponsor: 'bg-[var(--profile-sponsor)]',
  comite: 'bg-[var(--profile-comite)]',
  lider_processo: 'bg-teal-500',
  gestor_area: 'bg-sky-500',
  terceiro: 'bg-[var(--profile-terceiro)]',
};

// Labels dos perfis
const profileLabels: Record<string, string> = {
  admin_global: 'Admin Global',
  consultor: 'Consultor',
  sponsor: 'Sponsor',
  comite: 'Comitê',
  lider_processo: 'Líder de Processo',
  gestor_area: 'Gestor de Área',
  terceiro: 'Terceiro',
};

// Roles que precisam selecionar organização
const rolesNeedOrgSelector: UserRole[] = ['admin_global', 'consultor'];

export function NavMain() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const logoutMutation = trpc.auth.logout.useMutation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isFocusMode, toggleFocusMode } = useFocusMode();
  const breadcrumbs = useBreadcrumb();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      // Aguardar um pouco para garantir que a sessão foi limpa
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.href = "/";
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, redirecionar para home
      window.location.href = "/";
    }
  };

  // Handlers para hover nos menus
  const handleMouseEnter = (sectionId: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setOpenDropdown(sectionId);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setOpenDropdown(null);
    }, 150); // Pequeno delay para evitar fechamento acidental
    setHoverTimeout(timeout);
  };

  // Limpa timeout ao desmontar
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Define roles de Cliente
  const clienteRoles = ['sponsor', 'comite', 'lider_processo', 'gestor_area'];
  const isClienteUser = user && clienteRoles.includes(user.role);

  // Filtra seções baseado no role do usuário
  const visibleSections = navSections.filter(section => {
    // Para usuários Cliente, mostrar apenas Avaliações, Plano de Ação e GED
    if (isClienteUser) {
      return section.id === 'avaliacoes' || section.id === 'plano-acao' || section.id === 'documentos';
    }
    
    // Para outros usuários, aplicar filtragem normal
    if (!section.roles) return true;
    if (!user) return false;
    return section.roles.includes(user.role as UserRole);
  });

  // Filtra itens de submenu baseado no role
  const filterItems = (items?: NavItem[]) => {
    if (!items) return [];
    return items.filter(item => {
      if (!item.roles) return true;
      if (!user) return false;
      return item.roles.includes(user.role as UserRole);
    });
  };

  // Verifica se a rota atual está ativa
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location === '/' || location === '/dashboard' || location.startsWith('/dashboard');
    }
    return location.startsWith(path);
  };

  // Verifica se algum item do submenu está ativo
  const isSectionActive = (section: NavSection) => {
    if (section.path) return isActive(section.path);
    if (section.items) {
      return section.items.some(item => isActive(item.path));
    }
    return false;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const showOrgSelector = user && rolesNeedOrgSelector.includes(user.role as UserRole);

  if (isFocusMode) {
    return null;
  }

  return (
    <>
      <nav 
        className="bg-white dark:bg-[var(--bg-white)] border-b sticky top-0 z-40"
        style={{ 
          borderColor: 'var(--border-default)',
          boxShadow: 'var(--shadow-sm)' 
        }}
      >
        <div className="w-full px-4">
          <div className="flex items-center gap-4" style={{ height: '56px' }}>
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center gap-3 shrink-0 no-underline"
              style={{ color: 'var(--brand-accent)' }}
            >
            <img src="/logo-seusdados.png" alt="Seusdados" className="h-7" />
            </Link>
          
          {/* Navigation Tabs (Desktop) */}
          <div className="hidden lg:flex items-center flex-1" ref={dropdownRef}>
            {visibleSections.map((section) => {
              const filteredItems = filterItems(section.items);
              const hasSubmenu = filteredItems.length > 0;
              const active = isSectionActive(section);
              
              if (!hasSubmenu && section.path) {
                return (
                  <Link
                    key={section.id}
                    href={section.path}
                    className="relative px-3 flex items-center text-sm no-underline transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                    style={{ 
                      color: active ? 'var(--brand-accent)' : 'var(--text-secondary)',
                      fontWeight: active ? 600 : 500,
                      height: '56px'
                    }}
                  >
                    {section.label}
                    <span 
                      className="absolute left-0 right-0 h-[3px] transition-all duration-300 ease-out"
                      style={{ 
                        backgroundColor: 'var(--brand-accent)',
                        borderRadius: '3px 3px 0 0',
                        bottom: '-1px',
                        zIndex: 10,
                        opacity: active ? 1 : 0,
                        transform: active ? 'scaleX(1)' : 'scaleX(0)'
                      }}
                    />
                  </Link>
                );
              }
              
              return (
                <div 
                  key={section.id} 
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(section.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    className="relative px-3 flex items-center gap-1 text-sm bg-transparent border-none cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                    style={{ 
                      color: active || openDropdown === section.id ? 'var(--brand-accent)' : 'var(--text-secondary)',
                      fontWeight: active ? 600 : 500,
                      height: '56px'
                    }}
                  >
                    {section.label}
                    <ChevronDown 
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === section.id ? 'rotate-180' : ''}`} 
                    />
                    <span 
                      className="absolute left-0 right-0 h-[3px] transition-all duration-300 ease-out"
                      style={{ 
                        backgroundColor: 'var(--brand-accent)',
                        borderRadius: '3px 3px 0 0',
                        bottom: '-1px',
                        zIndex: 10,
                        opacity: active ? 1 : 0,
                        transform: active ? 'scaleX(1)' : 'scaleX(0)'
                      }}
                    />
                  </button>
                  
                  {/* Dropdown com animação */}
                  <div 
                    className={`absolute top-full left-0 w-56 bg-white dark:bg-[var(--bg-white)] rounded-lg py-1 z-50 transition-all duration-200 origin-top ${openDropdown === section.id ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none'}`}
                    style={{ 
                      border: '1px solid var(--border-default)',
                      boxShadow: 'var(--shadow-lg)' 
                    }}
                  >
                    {filteredItems.map((item) => {
                      // Para Due Diligence, usar rota com organizationId quando selecionada
                      const itemPath = item.path === '/due-diligence' && selectedOrganization?.id
                        ? `/cliente/${selectedOrganization.id}/due-diligence`
                        : item.path;
                      return (
                        <Link
                          key={item.path}
                          href={itemPath}
                          onClick={() => setOpenDropdown(null)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm no-underline transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                          style={{ 
                            color: isActive(item.path) ? 'var(--brand-accent)' : 'var(--text-secondary)',
                            backgroundColor: isActive(item.path) ? 'var(--brand-accent-light)' : 'transparent',
                            fontWeight: isActive(item.path) ? 500 : 400
                          }}
                        >
                          <item.icon className="w-[18px] h-[18px]" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Right side - Organization Selector, Notifications & User */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Organization Selector */}
            {showOrgSelector && (
              <div className="hidden md:block">
                <OrganizationSelectorCompact />
              </div>
            )}
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            {user && <NotificationBell />}
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-lg bg-transparent border-none cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className={`${profileColors[user.role] || 'bg-gray-500'} text-white text-xs font-semibold`}>
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {user.name.split(' ')[0]}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {profileLabels[user.role] || user.role}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 hidden md:block" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                    {selectedOrganization && (
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--brand-accent)' }}>
                        {selectedOrganization.name}
                      </p>
                    )}
                  </div>
                  <DropdownMenuItem onClick={() => setLocation('/perfil')}>
                    <User className="w-4 h-4 mr-2" />
                    Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/configuracoes')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <a 
                href={getLoginUrl()} 
                className="px-4 py-2 rounded-lg text-sm font-semibold no-underline transition-colors"
                style={{ 
                  backgroundColor: 'var(--brand-accent)', 
                  color: 'var(--text-inverse)' 
                }}
              >
                Entrar
              </a>
            )}

          </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default NavMain;
