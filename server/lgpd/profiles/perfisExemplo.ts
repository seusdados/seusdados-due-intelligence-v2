/**
 * Perfis de exemplo v2 para geração de cláusulas LGPD
 * Inclui cenários expandidos com todos os campos do schema v2
 */

import { ContextoGlobal } from '../logic/contextPipeline';

export interface PerfilLGPD {
  id: string;
  nome: string;
  descricao: string;
  parametros: ContextoGlobal;
  contexto?: Partial<ContextoGlobal>; // Alias para compatibilidade
}

export const PERFIS_EXEMPLO: PerfilLGPD[] = [
  {
    id: 'saas_educacional_menores',
    nome: 'SaaS Educativo – Plataforma com Crianças/Adolescentes',
    descricao: 'Plataforma educacional que trata dados de estudantes menores de idade',
    parametros: {
      A1_tipo_contrato_juridico: 'licenca_uso_software',
      A2_natureza_relacao: 'B2B',
      A3_papel_global_cliente: 'controlador',
      A4_papel_global_contraparte: 'operador',
      A5_existe_controladoria_conjunta: false,
      A6_ente_pequeno_porte_LGPD: 'sponsor',
      A8_setor_regulado: ['educacao_MEC'],
      B1_trata_dados_pessoais: true,
      B2_trata_dados_comuns: true,
      B3_trata_dados_sensiveis: true,
      B4_trata_dados_sensiveis_em_larga_escala: 'media',
      B5_categorias_titulares: ['estudantes', 'pais_responsaveis', 'professores'],
      B6_trata_dados_criancas_0_12: true,
      B7_trata_dados_adolescentes_13_17: true,
      B10_volume_titulares_estimado: 'medio',
      C1_finalidades_principais: ['educacao', 'melhoria_produto'],
      C2_ha_decisao_automatizada_com_consequencia_juridica: false,
      C4_uso_para_marketing_direto: false,
      D1_base_legal_predominante_dados_comuns: ['execucao_contrato', 'consentimento'],
      D2_base_legal_predominante_dados_sensiveis: ['consentimento_especifico'],
      D3_base_legal_dados_menores_comuns: ['consentimento_responsavel'],
      D4_base_legal_dados_menores_sensiveis: ['consentimento_responsavel'],
      E1_ha_compartilhamento_com_terceiros: true,
      E2_tipos_terceiros: ['provedores_cloud', 'ferramentas_analytics'],
      E3_ha_suboperadores: true,
      E4_ha_transferencia_internacional: true,
      E5_natureza_paises_destino: 'nao_adequado',
      E6_usa_cloud_com_dados_pessoais: true,
      E7_modelo_cloud: 'SaaS',
      F1_nivel_seguranca_requerido: 'alto',
      F2_exige_ISO_27001: true,
      F5_exige_log_e_trilha_auditoria: true,
      F6_exige_criptografia_em_reposo_e_transito: true,
      F7_exige_controle_acesso_base_funcao_rbac: true,
      G1_prazo_notificacao_entre_partes_horas: 24,
      G4_coopera_para_notificar_ANPD_titulares: true,
      H1_criterio_geral_retencao: 'duracao_contrato_mais_prazo_legal',
      H2_prazo_retencao_depois_termino: '5 anos',
      H4_ha_backup_com_dados_pessoais: true,
      H6_eliminacao_inclui_suboperadores: true,
      H7_formato_devolucao_exigido: 'CSV ou JSON'
    }
  },
  {
    id: 'operador_saude',
    nome: 'Prestador de Serviços de Saúde – Clínicas, Laboratórios, Planos',
    descricao: 'Prestador de serviços de saúde que trata dados sensíveis em larga escala',
    parametros: {
      A1_tipo_contrato_juridico: 'prestacao_servico',
      A2_natureza_relacao: 'B2B',
      A3_papel_global_cliente: 'controlador',
      A4_papel_global_contraparte: 'operador',
      A5_existe_controladoria_conjunta: false,
      A6_ente_pequeno_porte_LGPD: 'nenhum',
      A8_setor_regulado: ['saude_ANS'],
      B1_trata_dados_pessoais: true,
      B2_trata_dados_comuns: true,
      B3_trata_dados_sensiveis: true,
      B4_trata_dados_sensiveis_em_larga_escala: 'alta',
      B5_categorias_titulares: ['pacientes', 'beneficiarios_plano_saude'],
      B10_volume_titulares_estimado: 'alto',
      C1_finalidades_principais: ['atendimento_clinico', 'faturamento_cobranca'],
      C2_ha_decisao_automatizada_com_consequencia_juridica: false,
      D1_base_legal_predominante_dados_comuns: ['execucao_contrato', 'cumprimento_obrigacao_legal'],
      D2_base_legal_predominante_dados_sensiveis: ['tutela_saude', 'cumprimento_obrigacao_legal'],
      E1_ha_compartilhamento_com_terceiros: true,
      E2_tipos_terceiros: ['operadoras_plano_saude', 'laboratorios'],
      E3_ha_suboperadores: true,
      E4_ha_transferencia_internacional: false,
      E5_natureza_paises_destino: 'nenhum',
      F1_nivel_seguranca_requerido: 'critico',
      F2_exige_ISO_27001: true,
      F5_exige_log_e_trilha_auditoria: true,
      F6_exige_criptografia_em_reposo_e_transito: true,
      F7_exige_controle_acesso_base_funcao_rbac: true,
      G1_prazo_notificacao_entre_partes_horas: 24,
      G4_coopera_para_notificar_ANPD_titulares: true,
      H1_criterio_geral_retencao: 'prazo_legal_regulatorio',
      H2_prazo_retencao_depois_termino: '20 anos (prontuário médico)',
      H4_ha_backup_com_dados_pessoais: true,
      H6_eliminacao_inclui_suboperadores: true
    }
  },
  {
    id: 'folha_pagamento_aprendizes',
    nome: 'Prestação de Serviços de Folha de Pagamento com Aprendizes',
    descricao: 'Serviço de folha de pagamento que inclui jovens aprendizes (menores)',
    parametros: {
      A1_tipo_contrato_juridico: 'prestacao_servico',
      A2_natureza_relacao: 'B2B',
      A3_papel_global_cliente: 'controlador',
      A4_papel_global_contraparte: 'operador',
      A5_existe_controladoria_conjunta: false,
      A6_ente_pequeno_porte_LGPD: 'nenhum',
      A8_setor_regulado: ['nenhum'],
      B1_trata_dados_pessoais: true,
      B2_trata_dados_comuns: true,
      B3_trata_dados_sensiveis: true,
      B4_trata_dados_sensiveis_em_larga_escala: 'media',
      B5_categorias_titulares: ['colaboradores', 'ex_colaboradores', 'estagiarios', 'aprendizes'],
      B7_trata_dados_adolescentes_13_17: true, // Aprendizes são menores
      B10_volume_titulares_estimado: 'medio',
      C1_finalidades_principais: ['gestao_folha_pagamento', 'beneficios_rh', 'compliance_trabalhista'],
      D1_base_legal_predominante_dados_comuns: ['execucao_contrato', 'cumprimento_obrigacao_legal'],
      D2_base_legal_predominante_dados_sensiveis: ['cumprimento_obrigacao_legal'],
      D3_base_legal_dados_menores_comuns: ['cumprimento_obrigacao_legal'],
      E1_ha_compartilhamento_com_terceiros: true,
      E2_tipos_terceiros: ['bancos', 'orgaos_governamentais', 'sindicatos'],
      E3_ha_suboperadores: false,
      E4_ha_transferencia_internacional: false,
      E5_natureza_paises_destino: 'nenhum',
      F1_nivel_seguranca_requerido: 'alto',
      F5_exige_log_e_trilha_auditoria: true,
      F6_exige_criptografia_em_reposo_e_transito: true,
      G1_prazo_notificacao_entre_partes_horas: 48,
      G4_coopera_para_notificar_ANPD_titulares: true,
      H1_criterio_geral_retencao: 'prazo_legal_trabalhista',
      H2_prazo_retencao_depois_termino: '5 anos (trabalhista) ou 30 anos (previdenciário)',
      H4_ha_backup_com_dados_pessoais: true,
      H6_eliminacao_inclui_suboperadores: true
    }
  },
  {
    id: 'marketing_b2c',
    nome: 'Campanhas de Marketing Direto B2C',
    descricao: 'Agência de marketing que realiza campanhas diretas para consumidores',
    parametros: {
      A1_tipo_contrato_juridico: 'prestacao_servico',
      A2_natureza_relacao: 'B2B',
      A3_papel_global_cliente: 'controlador',
      A4_papel_global_contraparte: 'operador',
      A5_existe_controladoria_conjunta: false,
      A6_ente_pequeno_porte_LGPD: 'sponsor',
      A8_setor_regulado: ['nenhum'],
      B1_trata_dados_pessoais: true,
      B2_trata_dados_comuns: true,
      B3_trata_dados_sensiveis: false,
      B4_trata_dados_sensiveis_em_larga_escala: 'nao',
      B5_categorias_titulares: ['consumidores', 'assinantes', 'usuarios_plataforma'],
      B10_volume_titulares_estimado: 'alto',
      C1_finalidades_principais: ['marketing_direto', 'analise_comportamental'],
      C2_ha_decisao_automatizada_com_consequencia_juridica: false,
      C4_uso_para_marketing_direto: true,
      D1_base_legal_predominante_dados_comuns: ['consentimento', 'interesse_legitimo'],
      D5_usa_interesse_legitimo_para_comuns: true,
      E1_ha_compartilhamento_com_terceiros: true,
      E2_tipos_terceiros: ['plataformas_ads', 'ferramentas_email_marketing'],
      E3_ha_suboperadores: true,
      E4_ha_transferencia_internacional: false,
      E5_natureza_paises_destino: 'nenhum',
      F1_nivel_seguranca_requerido: 'padrao',
      F5_exige_log_e_trilha_auditoria: true,
      G1_prazo_notificacao_entre_partes_horas: 48,
      G4_coopera_para_notificar_ANPD_titulares: true,
      H1_criterio_geral_retencao: 'duracao_contrato',
      H2_prazo_retencao_depois_termino: '2 anos',
      H4_ha_backup_com_dados_pessoais: true
    }
  },
  {
    id: 'saas_b2b_erp',
    nome: 'SaaS B2B – Gestão Empresarial (ERP/CRM/Financeiro)',
    descricao: 'Sistema de gestão empresarial sem dados sensíveis ou de menores',
    parametros: {
      A1_tipo_contrato_juridico: 'cloud_computing',
      A2_natureza_relacao: 'B2B',
      A3_papel_global_cliente: 'controlador',
      A4_papel_global_contraparte: 'operador',
      A5_existe_controladoria_conjunta: false,
      A6_ente_pequeno_porte_LGPD: 'nenhum',
      A8_setor_regulado: ['nenhum'],
      B1_trata_dados_pessoais: true,
      B2_trata_dados_comuns: true,
      B3_trata_dados_sensiveis: false,
      B4_trata_dados_sensiveis_em_larga_escala: 'nao',
      B5_categorias_titulares: ['colaboradores', 'clientes_b2b'],
      B10_volume_titulares_estimado: 'alto',
      C1_finalidades_principais: ['execucao_contrato', 'faturamento_cobranca', 'melhoria_produto'],
      E1_ha_compartilhamento_com_terceiros: false,
      E3_ha_suboperadores: true,
      E4_ha_transferencia_internacional: true,
      E5_natureza_paises_destino: 'nao_adequado',
      E6_usa_cloud_com_dados_pessoais: true,
      E7_modelo_cloud: 'SaaS',
      F1_nivel_seguranca_requerido: 'padrao',
      F5_exige_log_e_trilha_auditoria: true,
      G1_prazo_notificacao_entre_partes_horas: 48,
      G4_coopera_para_notificar_ANPD_titulares: true,
      H1_criterio_geral_retencao: 'duracao_contrato_mais_prazo_legal',
      H2_prazo_retencao_depois_termino: '5 anos',
      H7_formato_devolucao_exigido: 'CSV'
    }
  },
  {
    id: 'doacao_terceiro_setor',
    nome: 'Contrato de Doação e Apoio a ONG',
    descricao: 'Contrato de doação com ONG do terceiro setor',
    parametros: {
      A1_tipo_contrato_juridico: 'doacao',
      A2_natureza_relacao: 'B2B',
      A3_papel_global_cliente: 'controlador',
      A4_papel_global_contraparte: 'controlador',
      A5_existe_controladoria_conjunta: false,
      A6_ente_pequeno_porte_LGPD: 'contraparte',
      A8_setor_regulado: ['nenhum'],
      B1_trata_dados_pessoais: true,
      B2_trata_dados_comuns: true,
      B3_trata_dados_sensiveis: false,
      B4_trata_dados_sensiveis_em_larga_escala: 'nao',
      B5_categorias_titulares: ['doadores', 'beneficiarios_ongs'],
      B10_volume_titulares_estimado: 'medio',
      C1_finalidades_principais: ['execucao_contrato'],
      E1_ha_compartilhamento_com_terceiros: false,
      E3_ha_suboperadores: false,
      E4_ha_transferencia_internacional: false,
      E5_natureza_paises_destino: 'nenhum',
      F1_nivel_seguranca_requerido: 'padrao',
      G1_prazo_notificacao_entre_partes_horas: 72,
      G4_coopera_para_notificar_ANPD_titulares: true,
      H1_criterio_geral_retencao: 'duracao_contrato',
      H2_prazo_retencao_depois_termino: '5 anos'
    }
  },
  {
    id: 'sem_dados_pessoais',
    nome: 'Contrato sem Dados Pessoais',
    descricao: 'Relação contratual que não envolve tratamento de dados pessoais',
    parametros: {
      A1_tipo_contrato_juridico: 'prestacao_servico',
      A2_natureza_relacao: 'B2B',
      A3_papel_global_cliente: 'nenhum',
      A4_papel_global_contraparte: 'nenhum',
      B1_trata_dados_pessoais: false
    }
  }
];

export function getPerfilById(id: string): PerfilLGPD | undefined {
  return PERFIS_EXEMPLO.find(p => p.id === id);
}

export function listarPerfis(): { id: string; nome: string; descricao: string }[] {
  return PERFIS_EXEMPLO.map(p => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao
  }));
}
