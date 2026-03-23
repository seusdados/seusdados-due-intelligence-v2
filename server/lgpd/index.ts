/**
 * LGPD Module v3
 * Módulo de geração de cláusulas contratuais LGPD com 18 blocos
 */

// Logic exports
export type { ContextoGlobal } from './logic/contextNormalizer';
export { inferirMenoresPorCategorias, aplicarValoresPadrao } from './logic/contextNormalizer';
export type { NivelRisco } from './logic/riskCalculator';
export { calcularNivelRisco } from './logic/riskCalculator';
export { normalizarContextoGlobal } from './logic/contextPipeline';

// Template exports
export type { ClausulasGeradas, ClausulaGerada, ResultadoGeracaoClausulas, ResultadoGeracaoClausulas as ResultadoClausulas } from './templates/clauseTemplates';
export { 
  gerarClausulasLGPD,
  gerarTextoCompletoClausulas,
  renderClausulaSemDadosPessoais,
  renderBloco05MenoresTexto
} from './templates/clauseTemplates';

// Profile exports
export type { PerfilLGPD } from './profiles/perfisExemplo';
export { PERFIS_EXEMPLO, getPerfilById } from './profiles/perfisExemplo';
