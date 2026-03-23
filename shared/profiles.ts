/**
 * Sistema de 8 Perfis Oficiais - Seusdados Design System v7.0
 * 
 * Categorias:
 * - Seusdados (Equipe Interna): admin_global, consultor
 * - Cliente: sponsor, comite, lider_processo, gestor_area, respondente
 * - Externo: terceiro
 */

export type ProfileRole = 
  | 'admin_global'
  | 'consultor'
  | 'sponsor'
  | 'comite'
  | 'lider_processo'
  | 'gestor_area'
  | 'respondente'
  | 'terceiro';

export type ProfileCategory = 'seusdados' | 'cliente' | 'externo';

// Mapeamento de roles para categorias
export const roleCategories: Record<ProfileRole, ProfileCategory> = {
  admin_global: 'seusdados',
  consultor: 'seusdados',
  sponsor: 'cliente',
  comite: 'cliente',
  lider_processo: 'cliente',
  gestor_area: 'cliente',
  respondente: 'cliente',
  terceiro: 'externo',
};

// Labels amigáveis para cada role
export const roleLabels: Record<ProfileRole, string> = {
  admin_global: 'Admin Global',
  consultor: 'Consultor',
  sponsor: 'Sponsor',
  comite: 'Comitê',
  lider_processo: 'Líder de Processo',
  gestor_area: 'Gestor de Área',
  respondente: 'Respondente',
  terceiro: 'Terceiro',
};

// Descrições de cada role
export const roleDescriptions: Record<ProfileRole, string> = {
  admin_global: 'Acesso total à plataforma Seusdados',
  consultor: 'Execução de assessments e entregas',
  sponsor: 'Executivo patrocinador do projeto',
  comite: 'Membro do comitê de privacidade',
  lider_processo: 'Líder de processo na organização',
  gestor_area: 'Gestor de área na organização',
  respondente: 'Respondente de avaliações e ações atribuídas',
  terceiro: 'Fornecedor ou parceiro externo',
};

// Cores de cada perfil
export const roleColors: Record<ProfileRole, string> = {
  admin_global: '#7c3aed',
  consultor: '#3b82f6',
  sponsor: '#ec4899',
  comite: '#f97316',
  lider_processo: '#10b981',
  gestor_area: '#06b6d4',
  respondente: '#8b5cf6',
  terceiro: '#6366f1',
};

// Classes Tailwind para cada perfil
export const roleTailwindClasses: Record<ProfileRole, { bg: string; text: string; lightBg: string }> = {
  admin_global: { bg: 'bg-violet-600', text: 'text-violet-600', lightBg: 'bg-violet-100' },
  consultor: { bg: 'bg-blue-500', text: 'text-blue-500', lightBg: 'bg-blue-100' },
  sponsor: { bg: 'bg-pink-500', text: 'text-pink-500', lightBg: 'bg-pink-100' },
  comite: { bg: 'bg-orange-500', text: 'text-orange-500', lightBg: 'bg-orange-100' },
  lider_processo: { bg: 'bg-emerald-500', text: 'text-emerald-500', lightBg: 'bg-emerald-100' },
  gestor_area: { bg: 'bg-cyan-500', text: 'text-cyan-500', lightBg: 'bg-cyan-100' },
  respondente: { bg: 'bg-purple-500', text: 'text-purple-500', lightBg: 'bg-purple-100' },
  terceiro: { bg: 'bg-indigo-500', text: 'text-indigo-500', lightBg: 'bg-indigo-100' },
};

// Helpers de verificação
export const isSeusdados = (role: ProfileRole): boolean => {
  return roleCategories[role] === 'seusdados';
};

export const isCliente = (role: ProfileRole): boolean => {
  return roleCategories[role] === 'cliente';
};

export const isExterno = (role: ProfileRole): boolean => {
  return roleCategories[role] === 'externo';
};

// Permissões por módulo
export type ModulePermission = 'view' | 'edit' | 'admin' | 'none';

export const modulePermissions: Record<string, Record<ProfileRole, ModulePermission>> = {
  dashboard: {
    admin_global: 'admin',
    consultor: 'view',
    sponsor: 'view',
    comite: 'view',
    lider_processo: 'view',
    gestor_area: 'view',
    respondente: 'view',
    terceiro: 'none',
  },
  conformidade: {
    admin_global: 'admin',
    consultor: 'edit',
    sponsor: 'view',
    comite: 'view',
    lider_processo: 'view',
    gestor_area: 'view',
    respondente: 'view', // Apenas domínios vinculados
    terceiro: 'none',
  },
  plano_acao: {
    admin_global: 'admin',
    consultor: 'edit',
    sponsor: 'view',
    comite: 'view',
    lider_processo: 'view',
    gestor_area: 'view',
    respondente: 'view', // Apenas ações atribuídas
    terceiro: 'none',
  },
  due_diligence: {
    admin_global: 'admin',
    consultor: 'edit',
    sponsor: 'view',
    comite: 'none',
    lider_processo: 'none',
    gestor_area: 'none',
    respondente: 'none',
    terceiro: 'view', // Apenas seus próprios questionários
  },
  contratos: {
    admin_global: 'admin',
    consultor: 'edit',
    sponsor: 'view',
    comite: 'none',
    lider_processo: 'none',
    gestor_area: 'none',
    respondente: 'none',
    terceiro: 'none',
  },
  governanca: {
    admin_global: 'admin',
    consultor: 'edit',
    sponsor: 'edit',
    comite: 'view',
    lider_processo: 'view',
    gestor_area: 'none',
    respondente: 'none',
    terceiro: 'none',
  },
  meudpo: {
    admin_global: 'admin',
    consultor: 'edit',
    sponsor: 'none',
    comite: 'none',
    lider_processo: 'none',
    gestor_area: 'none',
    respondente: 'none',
    terceiro: 'none',
  },
  ged: {
    admin_global: 'admin',
    consultor: 'edit',
    sponsor: 'view',
    comite: 'view',
    lider_processo: 'view',
    gestor_area: 'view',
    respondente: 'view', // Apenas documentos vinculados
    terceiro: 'none',
  },
};

// Função para verificar permissão
export function hasPermission(
  role: ProfileRole,
  module: string,
  requiredPermission: ModulePermission
): boolean {
  const permissions = modulePermissions[module];
  if (!permissions) return false;
  
  const userPermission = permissions[role];
  
  if (requiredPermission === 'none') return true;
  if (requiredPermission === 'view') return userPermission !== 'none';
  if (requiredPermission === 'edit') return userPermission === 'edit' || userPermission === 'admin';
  if (requiredPermission === 'admin') return userPermission === 'admin';
  
  return false;
}
