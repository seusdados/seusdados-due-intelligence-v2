import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type Organization = {
  id: number;
  name: string;
  tradeName?: string | null;
  cnpj?: string | null;
};

type OrganizationContextType = {
  selectedOrganization: Organization | null;
  setSelectedOrganization: (org: Organization | null) => void;
  clearSelectedOrganization: () => void;
  isOrganizationRequired: boolean;
  isAutoSelecting: boolean;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const STORAGE_KEY = 'seusdados_selected_organization';
const TOAST_PREFERENCES_KEY = 'seusdados_toast_preferences';

type ToastPreferences = {
  showAutoSelectToast: boolean;
  showManualSelectToast: boolean;
  showClearSelectToast: boolean;
};

const defaultToastPreferences: ToastPreferences = {
  showAutoSelectToast: true,
  showManualSelectToast: true,
  showClearSelectToast: true,
};

// Função para obter preferências de toast
function getToastPreferences(): ToastPreferences {
  try {
    const saved = localStorage.getItem(TOAST_PREFERENCES_KEY);
    if (saved) {
      return { ...defaultToastPreferences, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Erro ao carregar preferências de toast:', e);
  }
  return defaultToastPreferences;
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedOrganization, setSelectedOrganizationState] = useState<Organization | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const hasShownAutoSelectToast = useRef(false);

  // Query para buscar organizações (usado para seleção automática)
  const { data: organizations, isLoading: isLoadingOrgs } = trpc.organization.list.useQuery(
    undefined,
    { 
      enabled: !!user && !selectedOrganization && initialized,
      staleTime: 5 * 60 * 1000 // 5 minutos
    }
  );

  // Carregar organização salva do localStorage ao inicializar
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSelectedOrganizationState(parsed);
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setInitialized(true);
    }
  }, [user]);

  // Limpar organização selecionada quando usuário faz logout
  useEffect(() => {
    if (!user && initialized) {
      setSelectedOrganizationState(null);
      localStorage.removeItem(STORAGE_KEY);
      hasShownAutoSelectToast.current = false;
    }
  }, [user, initialized]);

  // Seleção automática de organização para clientes
  useEffect(() => {
    if (!user || !initialized || selectedOrganization) return;
    
    // Para clientes com organizationId definido, usar diretamente
    if (user.role === 'sponsor' && user.organizationId) {
      setIsAutoSelecting(true);
      
      // Buscar dados completos da organização
      if (organizations) {
        const userOrg = organizations.find(org => org.id === user.organizationId);
        if (userOrg) {
          setSelectedOrganizationState({
            id: userOrg.id,
            name: userOrg.name,
            tradeName: userOrg.tradeName,
            cnpj: userOrg.cnpj
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            id: userOrg.id,
            name: userOrg.name,
            tradeName: userOrg.tradeName,
            cnpj: userOrg.cnpj
          }));
          
          // Mostrar toast de confirmação para cliente (se habilitado)
          if (!hasShownAutoSelectToast.current) {
            hasShownAutoSelectToast.current = true;
            const prefs = getToastPreferences();
            if (prefs.showAutoSelectToast) {
              toast.success('Organização selecionada automaticamente', {
                description: `Você está acessando como ${userOrg.tradeName || userOrg.name}`,
                duration: 4000,
              });
            }
          }
        } else {
          // Fallback se não encontrar nos dados
          setSelectedOrganizationState({
            id: user.organizationId,
            name: 'Minha Organização',
          });
        }
        setIsAutoSelecting(false);
      }
      return;
    }
    
    // Para admin_global e consultor: selecionar automaticamente se houver apenas 1 organização
    if ((user.role === 'admin_global' || user.role === 'consultor') && organizations) {
      if (organizations.length === 1) {
        setIsAutoSelecting(true);
        const org = organizations[0];
        setSelectedOrganizationState({
          id: org.id,
          name: org.name,
          tradeName: org.tradeName,
          cnpj: org.cnpj
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          id: org.id,
          name: org.name,
          tradeName: org.tradeName,
          cnpj: org.cnpj
        }));
        
        // Mostrar toast de confirmação para admin/consultor (se habilitado)
        if (!hasShownAutoSelectToast.current) {
          hasShownAutoSelectToast.current = true;
          const prefs = getToastPreferences();
          if (prefs.showAutoSelectToast) {
            toast.success('Organização selecionada automaticamente', {
              description: `Única organização disponível: ${org.tradeName || org.name}`,
              duration: 4000,
            });
          }
        }
        setIsAutoSelecting(false);
      }
    }
  }, [user, initialized, selectedOrganization, organizations]);

  const setSelectedOrganization = (org: Organization | null) => {
    setSelectedOrganizationState(org);
    if (org) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(org));
      // Mostrar toast ao selecionar manualmente (se habilitado)
      const prefs = getToastPreferences();
      if (prefs.showManualSelectToast) {
        toast.success('Organização alterada', {
          description: `Agora você está acessando ${org.tradeName || org.name}`,
          duration: 3000,
        });
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearSelectedOrganization = () => {
    setSelectedOrganizationState(null);
    localStorage.removeItem(STORAGE_KEY);
    hasShownAutoSelectToast.current = false;
    // Mostrar toast ao limpar seleção (se habilitado)
    const prefs = getToastPreferences();
    if (prefs.showClearSelectToast) {
      toast.info('Seleção de organização limpa', {
        description: 'Selecione uma organização para continuar',
        duration: 3000,
      });
    }
  };

  // Verificar se o usuário precisa selecionar uma organização
  // Admin global e consultores podem selecionar qualquer organização
  // Clientes usam automaticamente sua própria organização
  const isOrganizationRequired = user?.role === 'admin_global' || user?.role === 'consultor';

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        setSelectedOrganization,
        clearSelectedOrganization,
        isOrganizationRequired,
        isAutoSelecting: isAutoSelecting || isLoadingOrgs,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
