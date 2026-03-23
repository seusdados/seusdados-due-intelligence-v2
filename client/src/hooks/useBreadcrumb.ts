import { useLocation } from 'wouter';
import { useMemo } from 'react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
  '/': [{ label: 'Dashboard', path: '/' }],
  '/dashboard': [{ label: 'Dashboard', path: '/dashboard' }],
  '/avaliacoes': [{ label: 'Avaliações', path: '/avaliacoes' }, { label: 'Maturidade LGPD', path: '/avaliacoes' }],
  '/seusdados': [{ label: 'Avaliações', path: '/seusdados' }, { label: 'Framework SeusDados', path: '/seusdados' }],
  '/due-diligence': [{ label: 'Avaliações', path: '/due-diligence' }, { label: 'Due Diligence', path: '/due-diligence' }],
  '/maturidade': [{ label: 'Avaliações', path: '/maturidade' }, { label: 'Maturidade LGPD', path: '/maturidade' }],
  '/cadastros': [{ label: 'Cadastros', path: '/cadastros' }],
  '/usuarios': [{ label: 'Cadastros', path: '/cadastros' }, { label: 'Usuários', path: '/usuarios' }],
  '/convites': [{ label: 'Cadastros', path: '/cadastros' }, { label: 'Convites', path: '/convites' }],
  '/terceiros': [{ label: 'Cadastros', path: '/cadastros' }, { label: 'Terceiros', path: '/terceiros' }],
  '/governanca': [{ label: 'Governança', path: '/governanca' }],
  '/meudpo': [{ label: 'MeuDPO', path: '/meudpo' }],
  '/ged': [{ label: 'GED', path: '/ged' }],
  '/dpia': [{ label: 'Avaliações', path: '/dpia' }, { label: 'DPIA & Revisões', path: '/dpia' }],
  '/painel-global': [{ label: 'Plano de Ação', path: '/painel-global' }, { label: 'Central Global de Acompanhamento', path: '/painel-global' }],
  '/plano-acao/maturidade': [{ label: 'Plano de Ação', path: '/plano-acao/maturidade' }, { label: 'Avaliações de Conformidade', path: '/plano-acao/maturidade' }],
  '/plano-acao/contratos': [{ label: 'Plano de Ação', path: '/plano-acao/contratos' }, { label: 'Análise de Contratos', path: '/plano-acao/contratos' }],
  '/plano-acao/due-diligence': [{ label: 'Plano de Ação', path: '/plano-acao/due-diligence' }, { label: 'Due Diligence', path: '/plano-acao/due-diligence' }],
  '/mapeamentos': [{ label: 'Avaliações', path: '/mapeamentos' }, { label: 'Mapeamento de Dados', path: '/mapeamentos' }],
  '/analise-contratos': [{ label: 'Avaliações', path: '/analise-contratos' }, { label: 'Análise de Contratos', path: '/analise-contratos' }],
  '/central-direitos': [{ label: 'Governança', path: '/governanca' }, { label: 'Direitos dos Titulares', path: '/central-direitos' }],
  '/incidentes': [{ label: 'Governança', path: '/governanca' }, { label: 'Gestão de Incidentes', path: '/incidentes' }],
  '/pa-anpd': [{ label: 'Governança', path: '/governanca' }, { label: 'PA ANPD', path: '/pa-anpd' }],
  '/perfil': [{ label: 'Perfil', path: '/perfil' }],
  '/config': [{ label: 'Configurações', path: '/config' }],
};

export function useBreadcrumb(): BreadcrumbItem[] {
  const [location] = useLocation();

  return useMemo(() => {
    // Tenta encontrar correspondência exata
    if (breadcrumbMap[location]) {
      return breadcrumbMap[location];
    }

    // Tenta encontrar correspondência por prefixo
    for (const [path, breadcrumbs] of Object.entries(breadcrumbMap)) {
      if (location.startsWith(path) && path !== '/') {
        return breadcrumbs;
      }
    }

    // Fallback: cria breadcrumb a partir da URL
    const parts = location.split('/').filter(Boolean);
    if (parts.length === 0) {
      return [{ label: 'Dashboard', path: '/' }];
    }

    return parts.map((part, index) => ({
      label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      path: '/' + parts.slice(0, index + 1).join('/'),
    }));
  }, [location]);
}
