/**
 * Script para gerar exemplos de cláusulas LGPD v3
 * Perfis: folha_pagamento_aprendizes, saas_educacional_menores, operador_saude
 */

import { normalizarContextoGlobal } from './logic/contextPipeline';
import { gerarClausulasLGPD, gerarTextoCompletoClausulas } from './templates/clauseTemplates';
import { PERFIS_EXEMPLO, getPerfilById } from './profiles/perfisExemplo';

// Perfis solicitados
const perfisParaGerar = [
  'folha_pagamento_aprendizes',
  'saas_educacional_menores',
  'operador_saude'
];

export function gerarExemplosClausulas() {
  const resultados: { perfil: string; nome: string; clausulas: string }[] = [];

  for (const perfilId of perfisParaGerar) {
    const perfil = getPerfilById(perfilId);
    
    if (!perfil) {
      console.error(`Perfil não encontrado: ${perfilId}`);
      continue;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`GERANDO CLÁUSULAS PARA: ${perfil.nome}`);
    console.log(`${'='.repeat(80)}\n`);

    // Normalizar contexto
    const contextoNormalizado = normalizarContextoGlobal(perfil.parametros);

    // Gerar cláusulas
    const resultado = gerarClausulasLGPD(contextoNormalizado);

    // Gerar texto completo
    const textoCompleto = gerarTextoCompletoClausulas(resultado);

    console.log(textoCompleto);
    console.log(`\nBlocos aplicados: ${resultado.blocosAplicados} de ${resultado.totalBlocos}`);

    resultados.push({
      perfil: perfilId,
      nome: perfil.nome,
      clausulas: textoCompleto
    });
  }

  return resultados;
}

// Executar diretamente
gerarExemplosClausulas();
