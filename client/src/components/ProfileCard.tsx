import { LucideIcon, Shield, Users, Briefcase, UserCheck, Building2, Scale, UserCog, User, ExternalLink, ClipboardList, LayoutGrid } from "lucide-react";

// Tipos de perfil
export type ProfileRole = 
  | 'admin_global'
  | 'admin_global'
  | 'consultor'
  | 'consultor'
  | 'sponsor'
  | 'sponsor'
  | 'comite'
  | 'lider_processo'
  | 'gestor_area'
  | 'sponsor'
  | 'terceiro';

// Configuração de cada perfil
interface ProfileConfig {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  lightBg: string;
  category: 'seusdados' | 'sponsor' | 'externo';
}

export const profileConfigs: Record<ProfileRole, ProfileConfig> = {
  admin_global: {
    label: 'Admin Global',
    description: 'Acesso total à plataforma',
    icon: Shield,
    color: '#7c3aed',
    bgColor: 'bg-violet-600',
    lightBg: 'bg-violet-100',
    category: 'seusdados',
  },
  consultor: {
    label: 'Consultor',
    description: 'Execução de avaliações e entregas',
    icon: UserCheck,
    color: '#3b82f6',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-100',
    category: 'seusdados',
  },
  sponsor: {
    label: 'Sponsor',
    description: 'Executivo patrocinador do projeto',
    icon: Building2,
    color: '#ec4899',
    bgColor: 'bg-pink-500',
    lightBg: 'bg-pink-100',
    category: 'sponsor',
  },
  comite: {
    label: 'Comitê',
    description: 'Membro do comitê de privacidade',
    icon: Users,
    color: '#f97316',
    bgColor: 'bg-orange-500',
    lightBg: 'bg-orange-100',
    category: 'sponsor',
  },
  lider_processo: {
    label: 'Líder de Processo',
    description: 'Responsável por processos de tratamento de dados',
    icon: ClipboardList,
    color: '#14b8a6',
    bgColor: 'bg-teal-500',
    lightBg: 'bg-teal-100',
    category: 'sponsor',
  },
  gestor_area: {
    label: 'Gestor de Área',
    description: 'Gestor responsável por área organizacional',
    icon: LayoutGrid,
    color: '#0ea5e9',
    bgColor: 'bg-sky-500',
    lightBg: 'bg-sky-100',
    category: 'sponsor',
  },
  terceiro: {
    label: 'Terceiro',
    description: 'Fornecedor ou parceiro externo',
    icon: ExternalLink,
    color: '#6366f1',
    bgColor: 'bg-indigo-500',
    lightBg: 'bg-indigo-100',
    category: 'externo',
  },
};

// Helpers para verificar categoria
export const isSeusdados = (role: ProfileRole): boolean => {
  return ['admin_global', 'consultor'].includes(role);
};

export const isCliente = (role: ProfileRole): boolean => {
  return ['sponsor', 'comite', 'lider_processo', 'gestor_area'].includes(role);
};

export const isExterno = (role: ProfileRole): boolean => {
  return role === 'terceiro';
};

// Componente de Card de Perfil
interface ProfileCardProps {
  role: ProfileRole;
  name?: string;
  email?: string;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProfileCard({
  role,
  name,
  email,
  showDescription = false,
  size = 'md',
  className = '',
}: ProfileCardProps) {
  const config = profileConfigs[role] || profileConfigs.sponsor;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={`${config.lightBg} rounded-xl ${sizeClasses[size]} ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`${config.bgColor} ${iconSizes[size]} rounded-xl flex items-center justify-center`}>
          <Icon className="w-1/2 h-1/2 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {name && (
            <p className={`font-semibold text-[var(--text-primary)] truncate ${textSizes[size]}`}>
              {name}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span 
              className="px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: config.color }}
            >
              {config.label}
            </span>
            {email && (
              <span className="text-xs text-[var(--text-muted)] truncate">
                {email}
              </span>
            )}
          </div>
          {showDescription && (
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {config.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Badge simples de perfil
interface ProfileBadgeProps {
  role: ProfileRole;
  size?: 'sm' | 'md';
}

export function ProfileBadge({ role, size = 'md' }: ProfileBadgeProps) {
  const config = profileConfigs[role] || profileConfigs.sponsor;
  const Icon = config.icon;

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white font-medium ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}
      style={{ backgroundColor: config.color }}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {config.label}
    </span>
  );
}

export default ProfileCard;
