/**
 * LGPD Risk Calculator
 * Calcula R1_nivel_risco_global_estimado com base nos parâmetros do ContextoGlobal
 */

import { ContextoGlobal } from './contextNormalizer';

export type NivelRisco = 'critico' | 'alto' | 'medio' | 'baixo';

/**
 * Calcula R1_nivel_risco_global_estimado com base nos parâmetros do ContextoGlobal.
 * Pressupõe que inferirMenoresPorCategorias() já foi aplicada.
 */
export function calcularNivelRisco(contexto: ContextoGlobal): NivelRisco {
  const B3 = Boolean(contexto.B3_trata_dados_sensiveis);
  const B4 = contexto.B4_trata_dados_sensiveis_em_larga_escala || 'nao';
  const B6 = Boolean(contexto.B6_trata_dados_criancas_0_12);
  const B7 = Boolean(contexto.B7_trata_dados_adolescentes_13_17);
  const B10 = contexto.B10_volume_titulares_estimado || 'muito_baixo';
  
  const E4 = Boolean(contexto.E4_ha_transferencia_internacional);
  const E5 = contexto.E5_natureza_paises_destino || 'nenhum';
  
  const A8 = contexto.A8_setor_regulado || [];
  let setoresRegulados: string[];
  if (typeof A8 === 'string') {
    setoresRegulados = A8 === '' || A8 === 'nenhum' ? [] : [A8];
  } else {
    setoresRegulados = A8 || [];
  }
  
  const D5 = Boolean(contexto.D5_usa_interesse_legitimo_para_comuns);
  const C3 = Boolean(contexto.C3_ha_perfilhamento_profiling_comercial);
  
  // CRÍTICO
  if (
    (B3 && (B4 === 'alta' || B4 === 'muito_alta')) ||
    B6 ||
    B7 ||
    (E4 && E5 === 'nao_adequado' && (B3 || B6 || B7))
  ) {
    return 'critico';
  }
  
  // ALTO
  if (
    (B3 && B4 === 'media') ||
    (E4 && E5 !== 'adequado_anpd' && E5 !== 'adequado_ue_gdpr') ||
    (setoresRegulados.length > 0 && B3)
  ) {
    return 'alto';
  }
  
  // MÉDIO
  if (
    B10 === 'alto' || B10 === 'medio' ||
    D5 ||
    C3
  ) {
    return 'medio';
  }
  
  // BAIXO
  return 'baixo';
}
