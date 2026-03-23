/**
 * Testes do Módulo LGPD v3 - Geração de Cláusulas Contratuais
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizarContextoGlobal,
  gerarClausulasLGPD,
  PERFIS_EXEMPLO,
  getPerfilById,
  inferirMenoresPorCategorias,
  calcularNivelRisco
} from './lgpd';

describe('Módulo LGPD v3', () => {
  describe('Normalização de Contexto', () => {
    it('deve normalizar contexto vazio com valores padrão', () => {
      const ctx = normalizarContextoGlobal({});
      expect(ctx).toBeDefined();
      expect(ctx.B1_trata_dados_pessoais !== false).toBe(true);
      // Valores padrão v3
      expect(ctx.G1_prazo_notificacao_entre_partes_horas).toBe(48);
      expect(ctx.G4_coopera_para_notificar_ANPD_titulares).toBe(true);
      expect(ctx.H1_criterio_geral_retencao).toBe('duracao_contrato_mais_prazo_legal');
    });

    it('deve detectar cenário sem dados pessoais', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: false
      });
      expect(ctx._scenario_sem_dados_pessoais).toBe(true);
    });

    it('deve inferir tratamento de menores por categorias de titulares', () => {
      const ctx = normalizarContextoGlobal({
        B5_categorias_titulares: ['estudantes', 'criancas']
      });
      expect(ctx.B6_trata_dados_criancas_0_12).toBe(true);
      expect(ctx.B7_trata_dados_adolescentes_13_17).toBe(true);
    });

    it('deve calcular nível de risco automaticamente', () => {
      const ctx = normalizarContextoGlobal({
        B3_trata_dados_sensiveis: true,
        B4_trata_dados_sensiveis_em_larga_escala: 'alta',
        B6_trata_dados_criancas_0_12: true
      });
      expect(ctx.R1_nivel_risco_global_estimado).toBeDefined();
      expect(['critico', 'alto', 'medio', 'baixo']).toContain(ctx.R1_nivel_risco_global_estimado);
    });
  });

  describe('Inferência de Menores por Categorias', () => {
    it('deve detectar adolescentes em categorias educacionais', () => {
      const result = inferirMenoresPorCategorias({ B5_categorias_titulares: ['estudantes'] });
      expect(result.B7_trata_dados_adolescentes_13_17).toBe(true);
    });

    it('deve detectar crianças em categorias explícitas', () => {
      const result = inferirMenoresPorCategorias({ B5_categorias_titulares: ['criancas'] });
      expect(result.B6_trata_dados_criancas_0_12).toBe(true);
    });

    it('deve detectar adolescentes em aprendizes', () => {
      const result = inferirMenoresPorCategorias({ B5_categorias_titulares: ['aprendizes'] });
      expect(result.B7_trata_dados_adolescentes_13_17).toBe(true);
    });

    it('deve retornar contexto para categorias sem menores', () => {
      const result = inferirMenoresPorCategorias({ B5_categorias_titulares: ['colaboradores', 'clientes_b2b'] });
      expect(result).toBeDefined();
      expect(typeof result.B6_trata_dados_criancas_0_12).toBe('boolean');
      expect(typeof result.B7_trata_dados_adolescentes_13_17).toBe('boolean');
    });
  });

  describe('Cálculo de Nível de Risco', () => {
    it('deve retornar risco crítico para dados sensíveis em larga escala com menores', () => {
      const nivel = calcularNivelRisco({
        B3_trata_dados_sensiveis: true,
        B4_trata_dados_sensiveis_em_larga_escala: 'alta',
        B6_trata_dados_criancas_0_12: true
      });
      expect(nivel).toBe('critico');
    });

    it('deve retornar risco alto ou crítico para dados sensíveis em larga escala', () => {
      const nivel = calcularNivelRisco({
        B3_trata_dados_sensiveis: true,
        B4_trata_dados_sensiveis_em_larga_escala: 'alta'
      });
      expect(['alto', 'critico']).toContain(nivel);
    });

    it('deve retornar risco baixo para dados comuns apenas', () => {
      const nivel = calcularNivelRisco({
        B2_trata_dados_comuns: true,
        B3_trata_dados_sensiveis: false
      });
      expect(nivel).toBe('baixo');
    });
  });

  describe('Geração de Cláusulas v3', () => {
    it('deve gerar cláusula mínima quando não há dados pessoais', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: false
      });
      const result = gerarClausulasLGPD(ctx);
      
      // v3 retorna estrutura diferente
      expect(result.clausulas.length).toBe(1);
      expect(result.versao).toBe('v3');
      expect(result.blocosAplicados).toBe(1);
    });

    it('deve gerar múltiplos blocos para contrato padrão com dados pessoais', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        B2_trata_dados_comuns: true,
        B3_trata_dados_sensiveis: false
      });
      const result = gerarClausulasLGPD(ctx);
      
      // v3 gera até 18 blocos, mas apenas os aplicáveis
      expect(result.clausulas.length).toBeGreaterThan(0);
      expect(result.versao).toBe('v3');
      expect(result.totalBlocos).toBe(17); // 18 blocos - 1 (menores não aplicável)
      
      // Verifica que contém blocos essenciais
      const blocos = result.clausulas.map(c => c.bloco);
      expect(blocos).toContain('01');
      expect(blocos).toContain('02');
      expect(blocos).toContain('03');
    });

    it('deve incluir bloco de menores quando há crianças', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        B6_trata_dados_criancas_0_12: true
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoMenores = result.clausulas.find(c => c.bloco === '05');
      expect(blocoMenores).toBeDefined();
      expect(blocoMenores!.aplicavel).toBe(true);
    });

    it('deve incluir papéis corretos no bloco de identificação', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        A3_papel_global_cliente: 'controlador',
        A4_papel_global_contraparte: 'operador'
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoIdentificacao = result.clausulas.find(c => c.bloco === '01');
      expect(blocoIdentificacao).toBeDefined();
      expect(blocoIdentificacao!.texto.toLowerCase()).toContain('controlador');
      expect(blocoIdentificacao!.texto.toLowerCase()).toContain('operador');
    });

    it('deve incluir finalidades no bloco 02', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        C1_finalidades_principais: ['execucao_contrato', 'marketing_direto']
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoFinalidades = result.clausulas.find(c => c.bloco === '02');
      expect(blocoFinalidades).toBeDefined();
      expect(blocoFinalidades!.texto.toLowerCase()).toContain('finalidade');
    });

    it('deve incluir medidas de segurança no bloco 06', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        F1_nivel_seguranca_requerido: 'alto',
        F2_exige_ISO_27001: true,
        F6_exige_criptografia_em_reposo_e_transito: true
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoSeguranca = result.clausulas.find(c => c.bloco === '06');
      expect(blocoSeguranca).toBeDefined();
      expect(blocoSeguranca!.texto.toLowerCase()).toContain('segurança');
    });

    it('deve incluir informações de retenção no bloco 16', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        H1_criterio_geral_retencao: 'prazo_legal_trabalhista',
        H2_prazo_retencao_depois_termino: '30 anos'
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoRetencao = result.clausulas.find(c => c.bloco === '16');
      expect(blocoRetencao).toBeDefined();
      expect(blocoRetencao!.texto.toLowerCase()).toContain('retenção');
    });
  });

  describe('Perfis de Exemplo v3', () => {
    it('deve ter 7 perfis de exemplo', () => {
      expect(PERFIS_EXEMPLO.length).toBe(7);
    });

    it('deve ter perfil de contrato sem dados pessoais', () => {
      const perfil = PERFIS_EXEMPLO.find(p => p.id === 'sem_dados_pessoais');
      expect(perfil).toBeDefined();
      expect(perfil?.parametros.B1_trata_dados_pessoais).toBe(false);
    });

    it('deve ter perfil educacional com menores', () => {
      const perfil = PERFIS_EXEMPLO.find(p => p.id === 'saas_educacional_menores');
      expect(perfil).toBeDefined();
      expect(perfil?.parametros.B6_trata_dados_criancas_0_12).toBe(true);
      expect(perfil?.parametros.B7_trata_dados_adolescentes_13_17).toBe(true);
    });

    it('deve ter perfil de folha com aprendizes', () => {
      const perfil = PERFIS_EXEMPLO.find(p => p.id === 'folha_pagamento_aprendizes');
      expect(perfil).toBeDefined();
      expect(perfil?.parametros.B7_trata_dados_adolescentes_13_17).toBe(true);
    });

    it('deve ter perfil de marketing B2C', () => {
      const perfil = PERFIS_EXEMPLO.find(p => p.id === 'marketing_b2c');
      expect(perfil).toBeDefined();
      expect(perfil?.parametros.C4_uso_para_marketing_direto).toBe(true);
    });

    it('deve retornar perfil por ID', () => {
      const perfil = getPerfilById('saas_b2b_erp');
      expect(perfil).toBeDefined();
      expect(perfil?.nome).toContain('ERP');
    });

    it('deve retornar undefined para ID inexistente', () => {
      const perfil = getPerfilById('perfil_inexistente');
      expect(perfil).toBeUndefined();
    });
  });

  describe('Geração de Cláusulas por Perfil v3', () => {
    it('deve gerar cláusulas para perfil educacional com bloco de menores', () => {
      const perfil = getPerfilById('saas_educacional_menores');
      expect(perfil).toBeDefined();
      
      const ctx = normalizarContextoGlobal(perfil!.parametros);
      const result = gerarClausulasLGPD(ctx);
      
      expect(result.clausulas.length).toBeGreaterThan(0);
      expect(result.clausulas.map(c => c.bloco)).toContain('05');
    });

    it('deve gerar apenas cláusula mínima para perfil sem dados', () => {
      const perfil = getPerfilById('sem_dados_pessoais');
      expect(perfil).toBeDefined();
      
      const ctx = normalizarContextoGlobal(perfil!.parametros);
      const result = gerarClausulasLGPD(ctx);
      
      expect(result.clausulas.length).toBe(1);
      expect(result.blocosAplicados).toBe(1);
    });

    it('deve gerar cláusulas para perfil de saúde', () => {
      const perfil = getPerfilById('operador_saude');
      expect(perfil).toBeDefined();
      
      const ctx = normalizarContextoGlobal(perfil!.parametros);
      const result = gerarClausulasLGPD(ctx);
      
      expect(result.clausulas.length).toBeGreaterThan(0);
      expect(result.versao).toBe('v3');
    });

    it('deve gerar cláusulas para perfil folha com aprendizes', () => {
      const perfil = getPerfilById('folha_pagamento_aprendizes');
      expect(perfil).toBeDefined();
      
      const ctx = normalizarContextoGlobal(perfil!.parametros);
      const result = gerarClausulasLGPD(ctx);
      
      expect(result.clausulas.length).toBeGreaterThan(0);
      // Deve ter bloco de menores pois aprendizes são adolescentes
      expect(result.clausulas.map(c => c.bloco)).toContain('05');
    });

    it('deve gerar cláusulas para perfil marketing B2C', () => {
      const perfil = getPerfilById('marketing_b2c');
      expect(perfil).toBeDefined();
      
      const ctx = normalizarContextoGlobal(perfil!.parametros);
      const result = gerarClausulasLGPD(ctx);
      
      expect(result.clausulas.length).toBeGreaterThan(0);
      expect(result.versao).toBe('v3');
    });
  });

  describe('Renderização de Templates v3', () => {
    it('deve renderizar bloco de menores quando há crianças', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        B6_trata_dados_criancas_0_12: true
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoMenores = result.clausulas.find(c => c.bloco === '05');
      expect(blocoMenores).toBeDefined();
      expect(blocoMenores!.texto.toLowerCase()).toContain('criança');
    });

    it('deve renderizar bloco de menores quando há adolescentes', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        B7_trata_dados_adolescentes_13_17: true
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoMenores = result.clausulas.find(c => c.bloco === '05');
      expect(blocoMenores).toBeDefined();
      expect(blocoMenores!.texto.toLowerCase()).toContain('adolescente');
    });

    it('deve renderizar bloco de menores com crianças e adolescentes', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        B6_trata_dados_criancas_0_12: true,
        B7_trata_dados_adolescentes_13_17: true
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoMenores = result.clausulas.find(c => c.bloco === '05');
      expect(blocoMenores).toBeDefined();
      expect(blocoMenores!.aplicavel).toBe(true);
    });

    it('deve incluir bloco de bases legais', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        D1_bases_legais_aplicaveis: ['consentimento', 'execucao_contrato']
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoBasesLegais = result.clausulas.find(c => c.bloco === '03');
      expect(blocoBasesLegais).toBeDefined();
      expect(blocoBasesLegais!.texto.toLowerCase()).toContain('base');
    });

    it('deve incluir bloco de compartilhamento quando há suboperadores', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        E1_permite_suboperadores: true
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoCompartilhamento = result.clausulas.find(c => c.bloco === '07-08');
      expect(blocoCompartilhamento).toBeDefined();
    });

    it('deve incluir bloco de incidentes', () => {
      const ctx = normalizarContextoGlobal({
        B1_trata_dados_pessoais: true,
        G1_prazo_notificacao_entre_partes_horas: 24
      });
      const result = gerarClausulasLGPD(ctx);
      
      const blocoIncidentes = result.clausulas.find(c => c.bloco === '12');
      expect(blocoIncidentes).toBeDefined();
      expect(blocoIncidentes!.texto.toLowerCase()).toContain('incidente');
    });
  });
});
