import { TourConfig } from "@/hooks/useTour";

export const dashboardTour: TourConfig = {
  id: "dashboard-tour",
  name: "Tour do Dashboard",
  steps: [
    {
      id: "welcome",
      target: "[data-tour='dashboard-header']",
      title: "Bem-vindo ao Seusdados Due Diligence!",
      content: "Este é o seu painel principal. Aqui você pode acessar todas as ferramentas de conformidade LGPD e due diligence de terceiros.",
      placement: "bottom",
    },
    {
      id: "organization-selector",
      target: "[data-tour='organization-selector']",
      title: "Seletor de Organização",
      content: "Selecione a organização que deseja gerenciar. Você pode alternar entre diferentes organizações a qualquer momento.",
      placement: "bottom",
    },
    {
      id: "sidebar-menu",
      target: "[data-tour='sidebar-menu']",
      title: "Menu de Navegação",
      content: "Use o menu lateral para acessar todos os módulos do sistema: Conformidade, Due Diligence, Análise de Contratos, Mapeamentos e muito mais.",
      placement: "right",
    },
    {
      id: "conformidade-card",
      target: "[data-tour='conformidade-card']",
      title: "Conformidade PPPD",
      content: "Avalie a conformidade da sua organização com a LGPD usando nossa matriz de risco 5×5 e gere planos de ação automaticamente.",
      placement: "bottom",
    },
    {
      id: "due-diligence-card",
      target: "[data-tour='due-diligence-card']",
      title: "Gestão de Terceiros",
      content: "Realize due diligence de fornecedores e parceiros, avaliando riscos de privacidade e conformidade contratual.",
      placement: "bottom",
    },
    {
      id: "contratos-card",
      target: "[data-tour='contratos-card']",
      title: "Análise de Contratos",
      content: "Analise contratos automaticamente com IA, identificando cláusulas LGPD, riscos e recomendações de adequação.",
      placement: "bottom",
    },
    {
      id: "acionar-dpo",
      target: "[data-tour='acionar-dpo']",
      title: "Acionar DPO",
      content: "Precisa de ajuda? Clique aqui para abrir um chamado diretamente com o DPO da sua organização.",
      placement: "left",
    },
    {
      id: "quick-actions",
      target: "[data-tour='quick-actions']",
      title: "Ações Rápidas",
      content: "Use os atalhos para criar rapidamente novas organizações, terceiros, avaliações e due diligences.",
      placement: "top",
    },
  ],
};

export const conformidadeTour: TourConfig = {
  id: "conformidade-tour",
  name: "Tour da Conformidade",
  steps: [
    {
      id: "avaliacao-lista",
      target: "[data-tour='avaliacao-lista']",
      title: "Lista de Avaliações",
      content: "Aqui você encontra todas as avaliações de conformidade realizadas. Clique em uma avaliação para ver os detalhes.",
      placement: "bottom",
    },
    {
      id: "nova-avaliacao",
      target: "[data-tour='nova-avaliacao']",
      title: "Nova Avaliação",
      content: "Clique aqui para iniciar uma nova avaliação de conformidade PPPD para sua organização.",
      placement: "left",
    },
    {
      id: "filtros",
      target: "[data-tour='filtros']",
      title: "Filtros",
      content: "Use os filtros para encontrar avaliações específicas por status, data ou organização.",
      placement: "bottom",
    },
  ],
};

export const dueDiligenceTour: TourConfig = {
  id: "due-diligence-tour",
  name: "Tour do Due Diligence",
  steps: [
    {
      id: "terceiros-lista",
      target: "[data-tour='terceiros-lista']",
      title: "Lista de Terceiros",
      content: "Visualize todos os terceiros cadastrados e suas avaliações de due diligence.",
      placement: "bottom",
    },
    {
      id: "nova-due-diligence",
      target: "[data-tour='nova-due-diligence']",
      title: "Nova Due Diligence",
      content: "Inicie uma nova avaliação de due diligence para um terceiro existente ou cadastre um novo.",
      placement: "left",
    },
  ],
};

export const mapeamentosTour: TourConfig = {
  id: "mapeamentos-tour",
  name: "Tour dos Mapeamentos",
  steps: [
    {
      id: "mapeamentos-lista",
      target: "[data-tour='mapeamentos-lista']",
      title: "Registro de Operações",
      content: "Aqui você encontra todos os mapeamentos de processos (ROT) da sua organização.",
      placement: "bottom",
    },
    {
      id: "wizard-mapeamento",
      target: "[data-tour='wizard-mapeamento']",
      title: "Wizard de Mapeamento",
      content: "Use o wizard para criar novos mapeamentos de forma guiada, preenchendo todas as informações necessárias.",
      placement: "bottom",
    },
    {
      id: "exportar-ropa",
      target: "[data-tour='exportar-ropa']",
      title: "Exportar ROPA",
      content: "Exporte o Registro de Operações de Tratamento em PDF ou Excel para apresentar à ANPD.",
      placement: "bottom",
    },
  ],
};

export default {
  dashboardTour,
  conformidadeTour,
  dueDiligenceTour,
  mapeamentosTour,
};
