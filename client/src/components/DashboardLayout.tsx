import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { NotificationBell } from "@/components/NotificationBell";
import CreateDPODemandButton from "@/components/CreateDPODemandButton";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  Building2, 
  Users, 
  UserCog,
  ClipboardCheck,
  FileSearch,
  Settings,
  Shield,
  Bell,
  Bot,
  UserPlus,
  HardDrive,
  Scale,
  FileEdit,
  Play,
  Brain,
  Activity,
  Headphones,
  BarChart3,
  FileText,
  TrendingUp,
  Tags,
  FolderKanban,
  ShieldCheck,
  Handshake,
  FileStack,
  Cog,
  Map,
  UserCheck,
  Gauge,
  Fingerprint,
  AlertTriangle,
  BookOpen,
  Moon,
  Sun,
  ClipboardList,
  ListTree
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Star, StarOff } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
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
import { OrganizationSelector } from "./OrganizationSelector";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { useIdleTimeout, IDLE_TIMEOUT_DEFAULTS } from "@/hooks/useIdleTimeout";
import { toast } from "sonner";

type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path?: string;
  roles?: ('admin_global' | 'admin_global' | 'consultor' | 'consultor' | 'sponsor' | 'sponsor' | 'comite' | 'sponsor' | 'terceiro' | 'lider_processo' | 'gestor_area' | 'respondente')[];
  badge?: string;
  clienteAllowed?: boolean;
  items?: MenuItem[];
  disabled?: boolean;
};

type MenuSection = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
};

// Menu reorganizado conforme análise de UX - Fase 4
// Estrutura: Cadastrar → Avaliar → Governar → Atender → Documentar → Configurar
const menuSections: MenuSection[] = [
  // === VISÃO GERAL ===
  {
    id: 'overview',
    label: 'Visão Geral',
    icon: LayoutDashboard,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: Activity, label: "Operacional", path: "/dashboard-operacional", roles: ['admin_global', 'consultor'] },
      { icon: BarChart3, label: "Métricas", path: "/metricas", roles: ['admin_global', 'consultor'] },
    ]
  },
  
  // === CADASTROS - Entidades Base ===
  {
    id: 'cadastros',
    label: 'Cadastros',
    icon: Building2,
    items: [
      { icon: Building2, label: "Organizações", path: "/cadastros", roles: ['admin_global', 'consultor'] },
      { icon: Users, label: "Terceiros", path: "/terceiros" },
      { icon: UserCog, label: "Usuários", path: "/usuarios", roles: ['admin_global', 'consultor'] },
      { icon: UserPlus, label: "Convites", path: "/convites", roles: ['admin_global', 'consultor'] },
    ]
  },
  
  // === AVALIAÇÕES - Ferramentas de Análise ===
  {
    id: 'avaliacoes',
    label: 'Avaliações',
    icon: ShieldCheck,
    items: [
      { icon: ClipboardCheck, label: "Avaliações de Conformidade", path: "/avaliacoes", clienteAllowed: true },
      { icon: Shield, label: "Framework SeusDados", path: "/seusdados", roles: ['admin_global', 'consultor'] },
      { icon: Gauge, label: "Maturidade LGPD", path: "/maturidade", roles: ['admin_global', 'consultor'] },
      { icon: FileSearch, label: "Due Diligence", path: "/due-diligence" },
      { icon: Scale, label: "Análise de Contratos", path: "/analise-contratos", roles: ['admin_global', 'consultor', 'sponsor'] },
      { icon: Map, label: "Mapeamento de Dados", path: "/mapeamentos", roles: ['admin_global', 'consultor', 'sponsor'] },
      { icon: Shield, label: "DPIA & Revisões", path: "/dpia", roles: ['admin_global', 'consultor'] },
      { icon: Gauge, label: "Dashboard Compliance", path: "/compliance", roles: ['admin_global', 'consultor'] },
      { 
        icon: ClipboardList, 
        label: "Plano de Ação", 
        items: [
          { icon: ClipboardList, label: "Avaliações de Conformidade (Maturidade)", path: "/plano-acao/maturidade" },
          { icon: FileSearch, label: "Análise de Contratos", path: "/plano-acao/contratos" },
          { icon: Shield, label: "Due Diligence", path: "/plano-acao/due-diligence" },
        ]
      },
    ]
  },
  
  // === GOVERNANÇA - Gestão Corporativa ===
  {
    id: 'governanca',
    label: 'Governança',
    icon: Building2,
    items: [
      { icon: Building2, label: "Comitê de Privacidade", path: "/governanca", roles: ['admin_global', 'consultor'] },
      { icon: ClipboardList, label: "Auditoria CPPD", path: "/governanca/auditoria", roles: ['admin_global', 'consultor'] },
      { icon: UserCheck, label: "Direitos dos Titulares", path: "/central-direitos", roles: ['admin_global', 'consultor'] },
      { icon: AlertTriangle, label: "Gestão de Incidentes", path: "/incidentes", roles: ['admin_global', 'consultor', 'sponsor'] },
    ]
  },
  
  // === MEUDPO - Central de Atendimento ===
  {
    id: 'meudpo',
    label: 'MeuDPO',
    icon: Headphones,
    items: [
      { icon: Headphones, label: "Tickets", path: "/meudpo" },
      { icon: BarChart3, label: "Painel SLA", path: "/meudpo/sla", roles: ['admin_global', 'consultor'] },
      { icon: Gauge, label: "Dashboard SLA", path: "/sla-dashboard", roles: ['admin_global', 'consultor'] },
      { icon: TrendingUp, label: "Produtividade", path: "/meudpo/produtividade", roles: ['admin_global', 'consultor'] },
      { icon: FileSearch, label: "Relatórios", path: "/meudpo/reports", roles: ['admin_global', 'consultor'] },
    ]
  },
  
  // === DOCUMENTOS ===
  {
    id: 'documentos',
    label: 'Documentos',
    icon: FileStack,
    items: [
      { icon: HardDrive, label: "GED Seusdados", path: "/ged", roles: ['admin_global', 'consultor'] },
      { icon: FolderKanban, label: "GED Cliente", path: "/ged-cliente", roles: ['admin_global', 'consultor', 'sponsor'], clienteAllowed: true },
      { icon: FileEdit, label: "Templates", path: "/templates", roles: ['admin_global', 'consultor'] },
    ]
  },
  
  // === INTELIGÊNCIA ARTIFICIAL ===
  {
    id: 'ia',
    label: 'Inteligência Artificial',
    icon: Bot,
    items: [
      { icon: Bot, label: "Assistente IA", path: "/admin/ia", roles: ['admin_global', 'consultor'] },
      { icon: Brain, label: "Regras XAI", path: "/admin/ia/xai-regras", roles: ['admin_global', 'consultor'] },
      { icon: Activity, label: "Auditoria XAI", path: "/admin/ia/xai-auditoria", roles: ['admin_global', 'consultor'] },
    ]
  },
  
  // === CONFIGURAÇÕES ===
  {
    id: 'config',
    label: 'Configurações',
    icon: Cog,
    items: [
      { icon: BookOpen, label: "Catálogo de Serviços", path: "/catalogo-servicos", roles: ['admin_global', 'consultor'] },
      { icon: Tags, label: "Tags e Categorias", path: "/meudpo/tags", roles: ['admin_global', 'consultor'] },
      { icon: FileText, label: "Templates de Resposta", path: "/meudpo/templates", roles: ['admin_global', 'consultor'] },
      { icon: Settings, label: "Config. MeuDPO", path: "/meudpo/config", roles: ['admin_global', 'consultor'] },
      { icon: Play, label: "Simulador CPPD", path: "/simulador-cppd", roles: ['admin_global', 'consultor'] },
      { icon: ListTree, label: "Taxonomia", path: "/taxonomia-admin", roles: ['admin_global', 'consultor'] },
      { icon: Fingerprint, label: "Assinatura Gov.br", path: "/admin/govbr-assinatura", roles: ['admin_global', 'consultor'] },
      { icon: TrendingUp, label: "Relatórios Atividades", path: "/relatorios-atividades", roles: ['admin_global', 'consultor'] },
      { icon: Shield, label: "Administração", path: "/admin", roles: ['admin_global'] },
    ]
  },
];

// Flatten para compatibilidade com código existente
const menuItems: MenuItem[] = menuSections.flatMap(section => section.items);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  
  // Query para contadores de pendências com polling a cada 30 segundos
  const { data: pendingCounts } = trpc.system.getPendingCounts.useQuery(
    {},
    { 
      refetchInterval: 30000,
      enabled: !!user
    }
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-violet-900 via-indigo-800 to-violet-800">
        {/* Logo */}
        <img src="/logo.png" alt="Seusdados" className="h-14 object-contain mb-8" />
        
        {/* Badge */}
        <div className="badge-visual-law mb-6">
          inteligência em proteção de dados
        </div>
        
        {/* Title - Escala Modular 1,35 */}
        <h1 className="heading-display text-white text-center mb-2">
          Programa de conformidade LGPD
        </h1>
        <h2 className="heading-1 text-amber-400 text-center mb-6">
          operação e governança
        </h2>
        
        {/* Subtitle */}
        <p className="body-large text-white/80 text-center max-w-xl mb-10 px-4">
          sistema modular integrado
        </p>
        
        {/* Login Button */}
        <Button
          onClick={() => {
            window.location.href = getLoginUrl();
          }}
          size="lg"
          className="btn-gold px-12 py-6 text-base shadow-xl hover:shadow-2xl transition-all"
        >
          acesso ao hub
        </Button>
        
        {/* Stats - Escala Modular */}
        <div className="flex gap-12 mt-16">
          <div className="text-center">
            <p className="stat-large text-amber-400">09</p>
            <p className="label-executive text-white/70 mt-2">DOMÍNIOS DE CONTROLE</p>
          </div>
          <div className="text-center">
            <p className="stat-large text-amber-400">21</p>
            <p className="label-executive text-white/70 mt-2">QUESTÕES DE AUDITORIA</p>
          </div>
          <div className="text-center">
            <p className="stat-large text-amber-400">05</p>
            <p className="label-executive text-white/70 mt-2">NÍVEIS DE MATURIDADE</p>
          </div>
          <div className="text-center">
            <p className="stat-large text-amber-400">5×5</p>
            <p className="label-executive text-white/70 mt-2">MATRIZ DE RISCO</p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 text-white/50 text-xs font-light">
          <div>
            <p>Seusdados Consultoria em Gestão de Dados Ltda.</p>
            <p>CNPJ 33.898.116/0001-63 | Responsável Técnico: Marcelo Fattori</p>
          </div>
          <div className="text-right">
            <p>www.seusdados.com | dpo@seusdados.com</p>
            <p>+55 11 4040 5552</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { selectedOrganization } = useOrganization();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const userRole = (user?.role as 'admin_global' | 'admin_global' | 'consultor' | 'consultor' | 'sponsor' | 'sponsor' | 'comite' | 'sponsor' | 'terceiro' | 'lider_processo' | 'gestor_area') || 'sponsor';
  const isAdminOrConsultor = userRole === 'admin_global' || userRole === 'consultor';
  
  // Estado para modal de confirmação de logout
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Estado para modal de aviso de inatividade
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  
  // Função para confirmar logout
  const handleLogoutConfirm = useCallback(() => {
    setShowLogoutConfirm(false);
    logout();
  }, [logout]);
  
  // Hook de auto-logout por inatividade
  const { showWarning, remainingTime, resetTimer } = useIdleTimeout({
    timeout: IDLE_TIMEOUT_DEFAULTS.TIMEOUT, // 30 minutos
    warningTime: IDLE_TIMEOUT_DEFAULTS.WARNING_TIME, // 2 minutos antes
    onWarning: () => {
      setShowIdleWarning(true);
      toast.warning('Sua sessão expirará em breve por inatividade');
    },
    onIdle: () => {
      setShowIdleWarning(false);
      toast.info('Sessão encerrada por inatividade');
      logout();
    },
    enabled: !!user, // Só ativar se o usuário estiver logado
  });
  
  // Função para continuar a sessão
  const handleContinueSession = useCallback(() => {
    setShowIdleWarning(false);
    resetTimer();
    toast.success('Sessão renovada com sucesso');
  }, [resetTimer]);
  
  // Estado de seções colapsadas (persistido no localStorage)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('menu-collapsed-sections');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Estado de favoritos (persistido no localStorage)
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('menu-favorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Persistir seções colapsadas
  useEffect(() => {
    localStorage.setItem('menu-collapsed-sections', JSON.stringify(collapsedSections));
  }, [collapsedSections]);
  
  // Persistir favoritos
  useEffect(() => {
    localStorage.setItem('menu-favorites', JSON.stringify(favorites));
  }, [favorites]);
  
  // Toggle de seção colapsada
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);
  
  // Toggle de favorito
  const toggleFavorite = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  }, []);
  
  // Obter itens favoritos
  const favoriteItems = menuSections
    .flatMap(section => section.items)
    .filter(item => favorites.includes(item.path))
    .filter(item => !item.roles || item.roles.includes(userRole));
  
  // Queries para badges dinâmicos de pendências
  const { data: pendingCounts } = trpc.system.getPendingCounts.useQuery(
    { organizationId: selectedOrganization?.id },
    { 
      enabled: !!selectedOrganization?.id,
      refetchInterval: 60000 // Atualizar a cada 1 minuto
    }
  );
  
  // Mapa de badges dinâmicos por path
  const dynamicBadges: Record<string, number | undefined> = {
    '/meudpo': pendingCounts?.unreadTickets,
    '/analise-contratos': pendingCounts?.expiringContracts,
    '/mapeamentos': pendingCounts?.pendingInterviews,
    '/due-diligence': pendingCounts?.pendingDueDiligence,
  };
  
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  const activeMenuItem = filteredMenuItems.find(item => item.path === location);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin_global':
        return <Badge variant="default" className="text-xs">Admin</Badge>;
      case 'consultor':
        return <Badge variant="secondary" className="text-xs">Consultor</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Cliente</Badge>;
    }
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      {/* Sidebar removido conforme solicitação do usuário */}
      {false && (
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img src="/logo.png" alt="Seusdados" className="h-6 object-contain" />
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 pt-0 overflow-y-auto">
            {/* Seletor de Organização Global */}
            <OrganizationSelector collapsed={isCollapsed} />
            
            {/* Seção de Favoritos */}
            {!isCollapsed && favoriteItems.length > 0 && (
              <div className="py-2 border-b border-sidebar-border">
                <div className="px-4 py-1.5 text-[10px] font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-amber-500" />
                  <span>Favoritos</span>
                </div>
                <SidebarMenu className="px-2">
                  {favoriteItems.map(item => {
                    const isActive = location === item.path || 
                      (item.path !== '/' && location.startsWith(item.path));
                    return (
                      <SidebarMenuItem key={`fav-${item.path}`}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-9 transition-all font-light group/item"
                        >
                          <item.icon
                            className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                          />
                          <span className="truncate">{item.label}</span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => toggleFavorite(item.path, e)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFavorite(item.path, e as any); }}
                            className="ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            )}
            
            {/* Menu organizado por seções */}
            <div className="flex flex-col gap-1 py-2">
              {menuSections.map((section, sectionIndex) => {
                // Filtrar itens da seção por role
                let sectionItems = section.items;
                
                // Para usuários Cliente, mostrar todos os itens mas marcar os desabilitados
                if (userRole === 'sponsor') {
                  // Mostrar todos os itens para Cliente
                  sectionItems = section.items;
                } else {
                  // Para outros usuários, filtrar por roles
                  sectionItems = section.items.filter(item => {
                    if (!item.roles) return true;
                    return item.roles.includes(userRole);
                  });
                }
                
                // Não renderizar seção vazia
                if (sectionItems.length === 0) return null;
                
                const isSectionCollapsed = collapsedSections[section.id];
                
                return (
                  <div key={section.id} className={sectionIndex > 0 ? "mt-1" : ""}>
                    {/* Label da Seção - Clicável para colapsar */}
                    {!isCollapsed && (
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full px-4 py-1.5 label-executive text-muted-foreground/70 flex items-center gap-1.5 hover:bg-accent/30 transition-colors rounded-sm"
                      >
                        {isSectionCollapsed ? (
                          <ChevronRight className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        <section.icon className="h-3 w-3" />
                        <span>{section.label}</span>
                      </button>
                    )}
                    {isCollapsed && sectionIndex > 0 && (
                      <div className="mx-3 my-1 border-t border-sidebar-border" />
                    )}
                    {/* Itens da Seção */}
                    {(!isSectionCollapsed || isCollapsed) && (
                      <SidebarMenu className="px-2">
                        {sectionItems.map(item => {
                          const isActive = item.path ? (location === item.path || 
                            (item.path !== '/' && location.startsWith(item.path))) : false;
                          const isFavorite = item.path ? favorites.includes(item.path) : false;
                          // Verificar se item está desabilitado para Cliente
                          const isDisabledForCliente = userRole === 'sponsor' && !item.clienteAllowed;
                          const isClientRole = ['sponsor', 'comite', 'lider_processo', 'gestor_area', 'respondente'].includes(userRole);
                          
                          // Se item tem subitens, renderizar como dropdown
                          if (item.items && item.items.length > 0) {
                            return (
                              <SidebarMenuItem key={item.label}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton className="h-9 transition-all font-light group/item">
                                      <item.icon className="h-4 w-4 shrink-0" />
                                      <span className="truncate">{item.label}</span>
                                      <ChevronDown className="ml-auto h-4 w-4" />
                                    </SidebarMenuButton>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent side="right" align="start">
                                    {item.items.map(subitem => {
                                      const isSubitemDisabled = isClientRole && subitem.disabled;
                                      return (
                                        <DropdownMenuItem
                                          key={subitem.path}
                                          onClick={() => !isSubitemDisabled && setLocation(subitem.path!)}
                                          disabled={isSubitemDisabled}
                                          className={isSubitemDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                                        >
                                          <subitem.icon className="h-4 w-4 mr-2" />
                                          <span>{subitem.label}</span>
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </SidebarMenuItem>
                            );
                          }
                          
                          // Renderizar item normal
                          return (
                            <SidebarMenuItem key={item.path}>
                              <SidebarMenuButton
                                isActive={isActive && !isDisabledForCliente}
                                onClick={() => !isDisabledForCliente && setLocation(item.path!)}
                                tooltip={isDisabledForCliente ? 'Módulo indisponível para seu perfil' : item.label}
                                className={`h-9 transition-all font-light group/item ${
                                  isDisabledForCliente ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                disabled={isDisabledForCliente}
                              >
                                <item.icon
                                  className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                                />
                                <span className="truncate">{item.label}</span>
                                {/* Badge dinâmico de pendências */}
                                {item.path && dynamicBadges[item.path] && dynamicBadges[item.path]! > 0 && (
                                  <Badge variant="destructive" className="ml-auto text-xs shrink-0 animate-pulse">
                                    {dynamicBadges[item.path]}
                                  </Badge>
                                )}
                                {/* Badge estático (Novo, etc) */}
                                {item.badge && item.path && !dynamicBadges[item.path] && (
                                  <Badge variant="secondary" className="ml-auto text-xs shrink-0">
                                    {item.badge}
                                  </Badge>
                                )}
                                {!isCollapsed && !item.badge && item.path && !dynamicBadges[item.path] && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => toggleFavorite(item.path!, e)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFavorite(item.path!, e as any); }}
                                    className={`ml-auto transition-opacity cursor-pointer ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}
                                  >
                                    {isFavorite ? (
                                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                    ) : (
                                      <Star className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-amber-500" />
                                    )}
                                  </span>
                                )}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    )}
                  </div>
                );
              })}
            </div>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0 bg-gradient-to-br from-violet-500 to-blue-500">
                    <AvatarFallback className="text-xs font-medium text-white bg-gradient-to-br from-violet-500 to-blue-500">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2">
                      <p className="body-small truncate leading-none">
                        {user?.name || "Usuário"}
                      </p>
                      {getRoleBadge(userRole)}
                    </div>
                    <p className="caption truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setLocation('/perfil')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTheme('light')} 
                  className={`cursor-pointer ${theme === 'light' ? 'bg-accent' : ''}`}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Tema Claro</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTheme('dark')} 
                  className={`cursor-pointer ${theme === 'dark' ? 'bg-accent' : ''}`}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Tema Escuro</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTheme('system')} 
                  className={`cursor-pointer ${theme === 'system' ? 'bg-accent' : ''}`}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Tema do Sistema</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowLogoutConfirm(true)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>
      )}

      <SidebarInset>
        {/* Header Mobile */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Seusdados" className="h-5 object-contain" />
                <span className="tracking-tight text-foreground font-medium">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdminOrConsultor && selectedOrganization && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  <Building2 className="h-3 w-3 mr-1" />
                  {selectedOrganization.name}
                </Badge>
              )}
              <NotificationBell />
            </div>
          </div>
        )}
        
        {/* Header Desktop - Indicador de Organização - REMOVIDO */}
        
        <main className="flex-1 p-3 md:p-4">{children}</main>
      </SidebarInset>
      
      {/* Modal de Confirmação de Logout */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Saída</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair da plataforma? Você precisará fazer login novamente para acessar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogoutConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal de Aviso de Inatividade */}
      <AlertDialog open={showIdleWarning} onOpenChange={setShowIdleWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Sessão Prestes a Expirar
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Sua sessão será encerrada automaticamente por inatividade.</p>
              <p className="text-lg font-semibold text-amber-600">
                Tempo restante: {Math.ceil(remainingTime / 1000)} segundos
              </p>
              <p className="text-sm text-muted-foreground">
                Clique em "Continuar" para manter sua sessão ativa.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleLogoutConfirm}>Sair Agora</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleContinueSession}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
