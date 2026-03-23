/**
 * LGPD Context Pipeline v3
 * Pipeline principal de normalização do ContextoGlobal com suporte a 18 blocos
 */

import { ContextoGlobal, inferirMenoresPorCategorias, aplicarValoresPadrao } from './contextNormalizer';
import { calcularNivelRisco } from './riskCalculator';

export type { ContextoGlobal } from './contextNormalizer';
export type { NivelRisco } from './riskCalculator';

/**
 * Normaliza o ContextoGlobal v3:
 * - Aplica valores padrão para campos não preenchidos
 * - Infere crianças/adolescentes com base nas categorias de titulares
 * - Calcula nível de risco global (R1)
 * - Trata cenário sem dados pessoais
 */
export function normalizarContextoGlobal(contextoRaw: Partial<ContextoGlobal>): ContextoGlobal {
  // Aplicar valores padrão primeiro
  let ctx = aplicarValoresPadrao(contextoRaw as ContextoGlobal);
  
  // Inferir menores por categorias
  ctx = inferirMenoresPorCategorias(ctx);
  
  // Verificar se trata dados pessoais
  const trataDados = ctx.B1_trata_dados_pessoais !== false;
  
  if (!trataDados) {
    ctx.B1_trata_dados_pessoais = false;
    ctx.R1_nivel_risco_global_estimado = 'baixo';
    ctx._scenario_sem_dados_pessoais = true;
    ctx._versao_modulo = 'v3';
    return ctx;
  }
  
  // Calcular nível de risco
  const nivelRisco = calcularNivelRisco(ctx);
  ctx.R1_nivel_risco_global_estimado = nivelRisco;
  ctx._versao_modulo = 'v3';
  
  return ctx;
}

/**
 * Valida se o contexto possui os campos obrigatórios
 */
export function validarContextoObrigatorio(contexto: Partial<ContextoGlobal>): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  
  if (!contexto.A1_tipo_contrato_juridico) {
    erros.push('A1_tipo_contrato_juridico é obrigatório');
  }
  
  if (!contexto.A2_natureza_relacao) {
    erros.push('A2_natureza_relacao é obrigatório');
  }
  
  if (!contexto.A3_papel_global_cliente) {
    erros.push('A3_papel_global_cliente é obrigatório');
  }
  
  if (!contexto.A4_papel_global_contraparte) {
    erros.push('A4_papel_global_contraparte é obrigatório');
  }
  
  if (contexto.B1_trata_dados_pessoais === undefined) {
    erros.push('B1_trata_dados_pessoais é obrigatório');
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
}
