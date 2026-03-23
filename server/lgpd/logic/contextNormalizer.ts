/**
 * LGPD Context Normalizer v3
 * Infere automaticamente tratamento de crianças/adolescentes com base nas categorias de titulares
 * Schema expandido com todos os parâmetros CORE + AVANÇADOS (18 blocos)
 */

export interface ContextoGlobal {
  // Bloco A - Identificação das Partes
  A1_tipo_contrato_juridico?: string;
  A2_natureza_relacao?: string;
  A3_papel_global_cliente?: string;
  A4_papel_global_contraparte?: string;
  A5_existe_controladoria_conjunta?: boolean;
  A6_ente_pequeno_porte_LGPD?: string;
  A7_pertence_grupo_economico?: boolean;
  A8_setor_regulado?: string[];
  
  // Bloco B - Dados Pessoais
  B1_trata_dados_pessoais?: boolean;
  B2_trata_dados_comuns?: boolean;
  B3_trata_dados_sensiveis?: boolean;
  B4_trata_dados_sensiveis_em_larga_escala?: string;
  B5_categorias_titulares?: string[];
  B6_trata_dados_criancas_0_12?: boolean;
  B7_trata_dados_adolescentes_13_17?: boolean;
  B8_trata_dados_idosos_60?: boolean;
  B9_trata_dados_pessoas_com_deficiencia?: boolean;
  B10_volume_titulares_estimado?: string;
  B11_tipos_dados_comuns?: string[];
  B12_tipos_dados_sensiveis?: string[];
  
  // Bloco C - Finalidades
  C1_finalidades_principais?: string[];
  C2_ha_decisao_automatizada_com_consequencia_juridica?: boolean;
  C3_ha_perfilhamento_profiling_comercial?: boolean;
  C4_uso_para_marketing_direto?: boolean;
  C5_finalidades_secundarias?: string[];
  
  // Bloco D - Bases Legais
  D1_base_legal_predominante_dados_comuns?: string[];
  D2_base_legal_predominante_dados_sensiveis?: string[];
  D3_base_legal_dados_menores_comuns?: string[];
  D4_base_legal_dados_menores_sensiveis?: string[];
  D5_usa_interesse_legitimo_para_comuns?: boolean;
  D6_possui_LIA_documentado?: boolean;
  
  // Bloco E - Compartilhamento e Transferência
  E1_ha_compartilhamento_com_terceiros?: boolean;
  E2_tipos_terceiros?: string[];
  E3_ha_suboperadores?: boolean;
  E4_ha_transferencia_internacional?: boolean;
  E5_natureza_paises_destino?: string;
  E6_usa_cloud_com_dados_pessoais?: boolean;
  E7_modelo_cloud?: string;
  E8_paises_destino?: string[];
  E9_mecanismo_transferencia?: string;
  
  // Bloco F - Segurança da Informação
  F1_nivel_seguranca_requerido?: string;
  F2_exige_ISO_27001?: boolean;
  F3_exige_SOC2?: boolean;
  F4_exige_pentest_periodico?: boolean;
  F5_exige_log_e_trilha_auditoria?: boolean;
  F6_exige_criptografia_em_reposo_e_transito?: boolean;
  F7_exige_controle_acesso_base_funcao_rbac?: boolean;
  F8_exige_backup_seguro?: boolean;
  F9_exige_plano_continuidade?: boolean;
  
  // Bloco G - Incidentes
  G1_prazo_notificacao_entre_partes_horas?: number;
  G2_marco_temporal_notificacao?: string;
  G3_conteudo_minimo_notificacao?: string[];
  G4_coopera_para_notificar_ANPD_titulares?: boolean;
  G5_possui_plano_resposta_incidentes?: boolean;
  G6_realiza_simulacoes_periodicas?: boolean;
  
  // Bloco H - Retenção e Eliminação
  H1_criterio_geral_retencao?: string;
  H2_prazo_retencao_depois_termino?: string;
  H3_retencao_especifica_por_tipo_dado?: Record<string, string>;
  H4_ha_backup_com_dados_pessoais?: boolean;
  H5_prazo_eliminacao_backup?: string;
  H6_eliminacao_inclui_suboperadores?: boolean;
  H7_formato_devolucao_exigido?: string;
  H8_metodo_eliminacao?: string;
  
  // Bloco I - Direitos dos Titulares
  I1_canal_direitos_titulares_tipo?: string;
  I2_canal_direitos_titulares_contato?: string;
  I3_prazo_resposta_solicitacoes_dias_uteis?: number;
  I4_operador_apoia_atendimento_controlador?: boolean;
  I5_direitos_garantidos?: string[];
  I6_processo_verificacao_identidade?: string;
  
  // Bloco J - Governança
  J1_possui_politica_privacidade_formal?: boolean;
  J2_possui_programa_privacidade?: boolean;
  J3_possui_encarregado_nomeado?: boolean;
  J4_encarregado_contato?: string;
  J5_possui_procedimento_gestao_incidentes?: boolean;
  J6_realiza_treinamentos_periodicos?: boolean;
  J7_possui_comite_privacidade?: boolean;
  
  // Bloco K - Responsabilidade
  K1_regime_responsabilidade_contratual?: string;
  K2_limite_responsabilidade?: string;
  K3_possui_seguro_cyber?: boolean;
  K4_ha_direito_regresso_explicito?: boolean;
  K5_clausula_indenizacao?: boolean;
  
  // Bloco L - Lei Aplicável e Auditoria
  L1_lei_aplicavel_principal?: string;
  L2_foro_principal?: string;
  L3_permite_auditoria_controlador?: boolean;
  L4_frequencia_auditoria?: string;
  L5_prazo_aviso_auditoria_dias?: number;
  
  // Bloco M - Registros e Evidências
  M1_mantem_registro_operacoes?: boolean;
  M2_formato_registro?: string;
  M3_prazo_disponibilizacao_registros_dias?: number;
  M4_compartilha_RIPD_quando_exigido?: boolean;
  
  // Bloco N - Portabilidade e Devolução
  N1_permite_portabilidade?: boolean;
  N2_formato_portabilidade?: string;
  N3_prazo_portabilidade_dias?: number;
  N4_custo_portabilidade?: string;
  
  // Bloco R - Riscos
  R1_nivel_risco_global_estimado?: string;
  R2_fatores_risco?: string[];
  R3_mitigacoes_aplicadas?: string[];
  
  // Campos inferidos
  _inferido_criancas_por_categoria?: boolean;
  _inferido_adolescentes_por_categoria?: boolean;
  _scenario_sem_dados_pessoais?: boolean;
  _versao_modulo?: string;
  
  // Permitir campos adicionais
  [key: string]: any;
}

// Categorias que indicam forte probabilidade de CRIANÇAS (0-12)
const CATEGORIAS_HINT_CRIANCAS = new Set([
  "criancas",
  "educacao_infantil",
  "alunos_ensino_fundamental",
  "estudantes_fundamental",
  "menores",
  "filhos",
  "dependentes_menores"
]);

// Categorias que indicam forte probabilidade de ADOLESCENTES (13-17)
const CATEGORIAS_HINT_ADOLESCENTES = new Set([
  "aprendizes",
  "estudantes",
  "alunos_ensino_medio",
  "jovens_aprendizes",
  "estagiarios",
  "adolescentes",
  "menores_aprendizes"
]);

/**
 * Inferir automaticamente tratamento de crianças/adolescentes com base em categorias de titulares.
 * Regra segura ("by default"):
 * - Se houver categorias que normalmente envolvem menores, e NÃO houver cláusula clara excluindo menores,
 *   considerar que há tratamento de menores (B6/B7 = True).
 */
export function inferirMenoresPorCategorias(contexto: ContextoGlobal): ContextoGlobal {
  const ctx = { ...contexto };
  
  const categorias = ctx.B5_categorias_titulares || [];
  const categoriasNorm = new Set(categorias.map(c => String(c).trim().toLowerCase()));
  
  let trataCriancas = Boolean(ctx.B6_trata_dados_criancas_0_12);
  let trataAdolescentes = Boolean(ctx.B7_trata_dados_adolescentes_13_17);
  
  // Verificar interseção com categorias de crianças
  const temCriancas = Array.from(categoriasNorm).some(c => CATEGORIAS_HINT_CRIANCAS.has(c));
  if (temCriancas) {
    trataCriancas = true;
  }
  
  // Verificar interseção com categorias de adolescentes
  const temAdolescentes = Array.from(categoriasNorm).some(c => CATEGORIAS_HINT_ADOLESCENTES.has(c));
  if (temAdolescentes) {
    trataAdolescentes = true;
  }
  
  ctx.B6_trata_dados_criancas_0_12 = trataCriancas;
  ctx.B7_trata_dados_adolescentes_13_17 = trataAdolescentes;
  
  ctx._inferido_criancas_por_categoria = temCriancas;
  ctx._inferido_adolescentes_por_categoria = temAdolescentes;
  
  return ctx;
}

/**
 * Aplicar valores padrão para campos não preenchidos (v3)
 */
export function aplicarValoresPadrao(contexto: ContextoGlobal): ContextoGlobal {
  const ctx = { ...contexto };
  
  // Valores padrão para segurança
  if (ctx.F1_nivel_seguranca_requerido === undefined) {
    ctx.F1_nivel_seguranca_requerido = 'padrao';
  }
  
  // Valores padrão para incidentes
  if (ctx.G1_prazo_notificacao_entre_partes_horas === undefined) {
    ctx.G1_prazo_notificacao_entre_partes_horas = 48;
  }
  
  if (ctx.G4_coopera_para_notificar_ANPD_titulares === undefined) {
    ctx.G4_coopera_para_notificar_ANPD_titulares = true;
  }
  
  // Valores padrão para retenção
  if (ctx.H1_criterio_geral_retencao === undefined) {
    ctx.H1_criterio_geral_retencao = 'duracao_contrato_mais_prazo_legal';
  }
  
  if (ctx.H2_prazo_retencao_depois_termino === undefined) {
    ctx.H2_prazo_retencao_depois_termino = '5 anos';
  }
  
  // Valores padrão para direitos dos titulares
  if (ctx.I3_prazo_resposta_solicitacoes_dias_uteis === undefined) {
    ctx.I3_prazo_resposta_solicitacoes_dias_uteis = 15;
  }
  
  if (ctx.I4_operador_apoia_atendimento_controlador === undefined) {
    ctx.I4_operador_apoia_atendimento_controlador = true;
  }
  
  // Valores padrão para auditoria
  if (ctx.L3_permite_auditoria_controlador === undefined) {
    ctx.L3_permite_auditoria_controlador = true;
  }
  
  if (ctx.L5_prazo_aviso_auditoria_dias === undefined) {
    ctx.L5_prazo_aviso_auditoria_dias = 10;
  }
  
  // Valores padrão para registros
  if (ctx.M1_mantem_registro_operacoes === undefined) {
    ctx.M1_mantem_registro_operacoes = true;
  }
  
  if (ctx.M3_prazo_disponibilizacao_registros_dias === undefined) {
    ctx.M3_prazo_disponibilizacao_registros_dias = 5;
  }
  
  // Valores padrão para portabilidade
  if (ctx.N3_prazo_portabilidade_dias === undefined) {
    ctx.N3_prazo_portabilidade_dias = 15;
  }
  
  // Marcar versão do módulo
  ctx._versao_modulo = 'v3';
  
  return ctx;
}
