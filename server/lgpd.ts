/**
 * Motor simples de cláusulas LGPD (fallback) – plug & play
 *
 * Este arquivo garante que o módulo compile e funcione mesmo se o motor
 * completo ainda não estiver presente no monorepo.
 *
 * Filosofia: regras determinísticas e auditáveis.
 */

export type ContextoGlobal = {
  A1_tipo_contrato_juridico?: string;
  A2_natureza_relacao?: string;
  A3_papel_global_cliente?: 'controlador' | 'operador' | 'controlador_conjunto' | 'suboperador';
  A4_papel_global_contraparte?: 'controlador' | 'operador' | 'controlador_conjunto' | 'suboperador';
  A8_setor_regulado?: string[];

  B1_trata_dados_pessoais?: boolean;
  B2_trata_dados_comuns?: boolean;
  B3_trata_dados_sensiveis?: boolean;
  B4_trata_dados_sensiveis_em_larga_escala?: 'sim' | 'nao';
  B5_categorias_titulares?: string[];
  B6_trata_dados_criancas_0_12?: boolean;
  B7_trata_dados_adolescentes_13_17?: boolean;
  B10_volume_titulares_estimado?: 'baixo' | 'medio' | 'alto';

  E4_ha_transferencia_internacional?: boolean;
  E5_natureza_paises_destino?: string;

  G1_prazo_notificacao_entre_partes_horas?: number;
  G4_coopera_para_notificar_ANPD_titulares?: boolean;
};

export type ClausulaGerada = {
  bloco: string;
  titulo: string;
  texto: string;
  aplicavel: boolean;
  motivo?: string;
};

export type ResultadoClausulas = {
  contexto: ContextoGlobal;
  scoreRisco: number; // 0-100 (maior = mais risco)
  clausulas: ClausulaGerada[];
};

export type PerfilExemplo = {
  id: string;
  nome: string;
  descricao?: string;
  parametros: ContextoGlobal;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const PERFIS_EXEMPLO: PerfilExemplo[] = [
  {
    id: 'b2b_operador_prestador_servico',
    nome: 'B2B – Prestação de serviço (cliente controlador)',
    descricao: 'Cenário típico: cliente é controlador e fornecedor é operador.',
    parametros: {
      A1_tipo_contrato_juridico: 'prestacao_servico',
      A2_natureza_relacao: 'B2B',
      A3_papel_global_cliente: 'controlador',
      A4_papel_global_contraparte: 'operador',
      B1_trata_dados_pessoais: true,
      B2_trata_dados_comuns: true,
      B3_trata_dados_sensiveis: false,
      E4_ha_transferencia_internacional: false,
      G1_prazo_notificacao_entre_partes_horas: 48,
      G4_coopera_para_notificar_ANPD_titulares: true,
    },
  },
  {
    id: 'b2b_controlador_conjunto',
    nome: 'B2B – Controladores conjuntos',
    descricao: 'Cenário com decisões conjuntas sobre finalidades/meios.',
    parametros: {
      A1_tipo_contrato_juridico: 'parceria',
      A2_natureza_relacao: 'B2B',
      A3_papel_global_cliente: 'controlador_conjunto',
      A4_papel_global_contraparte: 'controlador_conjunto',
      B1_trata_dados_pessoais: true,
      B2_trata_dados_comuns: true,
      B3_trata_dados_sensiveis: false,
      E4_ha_transferencia_internacional: false,
      G1_prazo_notificacao_entre_partes_horas: 48,
      G4_coopera_para_notificar_ANPD_titulares: true,
    },
  },
];

export function getPerfilById(id: string): PerfilExemplo | null {
  return PERFIS_EXEMPLO.find((p) => p.id === id) ?? null;
}

export function normalizarContextoGlobal(input: ContextoGlobal): ContextoGlobal & { scoreRisco: number } {
  const ctx: ContextoGlobal = { ...input };

  if (ctx.B1_trata_dados_pessoais === undefined) ctx.B1_trata_dados_pessoais = true;
  if (ctx.B2_trata_dados_comuns === undefined) ctx.B2_trata_dados_comuns = ctx.B1_trata_dados_pessoais;
  if (ctx.B3_trata_dados_sensiveis === undefined) ctx.B3_trata_dados_sensiveis = false;
  if (!ctx.A3_papel_global_cliente) ctx.A3_papel_global_cliente = 'controlador';
  if (!ctx.A4_papel_global_contraparte) ctx.A4_papel_global_contraparte = 'operador';
  if (!ctx.A2_natureza_relacao) ctx.A2_natureza_relacao = 'B2B';
  if (!ctx.A1_tipo_contrato_juridico) ctx.A1_tipo_contrato_juridico = 'prestacao_servico';
  if (!ctx.G1_prazo_notificacao_entre_partes_horas) ctx.G1_prazo_notificacao_entre_partes_horas = 48;
  if (ctx.G4_coopera_para_notificar_ANPD_titulares === undefined) ctx.G4_coopera_para_notificar_ANPD_titulares = true;

  // Score de risco simples (heurístico)
  let risk = 20;
  if (ctx.B1_trata_dados_pessoais) risk += 10;
  if (ctx.B3_trata_dados_sensiveis) risk += 15;
  if (ctx.B6_trata_dados_criancas_0_12 || ctx.B7_trata_dados_adolescentes_13_17) risk += 15;
  if (ctx.E4_ha_transferencia_internacional) risk += 10;
  if ((ctx.G1_prazo_notificacao_entre_partes_horas ?? 48) > 48) risk += 10;
  if (ctx.A3_papel_global_cliente === 'controlador_conjunto' || ctx.A4_papel_global_contraparte === 'controlador_conjunto') risk += 8;
  if (ctx.B4_trata_dados_sensiveis_em_larga_escala === 'sim') risk += 10;

  return { ...ctx, scoreRisco: clamp(risk, 0, 100) };
}

function clauseHeader(bloco: string, titulo: string) {
  return `### ${titulo} (${bloco})\n\n`;
}

export function gerarClausulasLGPD(ctxIn: ContextoGlobal & { scoreRisco?: number }): ResultadoClausulas {
  const n = normalizarContextoGlobal(ctxIn);
  const prazo = n.G1_prazo_notificacao_entre_partes_horas ?? 48;

  const clausulas: ClausulaGerada[] = [];
  const add = (c: ClausulaGerada) => clausulas.push(c);

  // A. Definições e papéis
  add({
    bloco: 'A',
    titulo: 'Papéis LGPD e definições essenciais',
    aplicavel: true,
    texto:
      clauseHeader('A', 'Papéis LGPD e definições essenciais') +
      `As Partes reconhecem e declaram seus papéis para fins da Lei nº 13.709/2018 (LGPD): Cliente como ${n.A3_papel_global_cliente} e Contraparte como ${n.A4_papel_global_contraparte}.\n` +
      `As definições de “dados pessoais”, “dados pessoais sensíveis”, “tratamento”, “incidente de segurança”, “controlador” e “operador” seguem o art. 5º da LGPD.`,
  });

  // B. Finalidade / instruções
  add({
    bloco: 'B',
    titulo: 'Finalidade, instruções e limitação do tratamento',
    aplicavel: !!n.B1_trata_dados_pessoais,
    motivo: n.B1_trata_dados_pessoais ? undefined : 'Sem tratamento de dados pessoais',
    texto:
      clauseHeader('B', 'Finalidade, instruções e limitação do tratamento') +
      `A Contraparte tratará dados pessoais exclusivamente para a execução do objeto contratual e conforme instruções documentadas do Cliente, vedado o uso para finalidades próprias ou incompatíveis.\n` +
      `A Contraparte deverá manter registro interno das operações de tratamento relacionadas a este contrato e assegurar que seus colaboradores/subcontratados observem estas obrigações.`,
  });

  // C. Segurança
  add({
    bloco: 'C',
    titulo: 'Segurança da informação (medidas técnicas e administrativas)',
    aplicavel: !!n.B1_trata_dados_pessoais,
    texto:
      clauseHeader('C', 'Segurança da informação (medidas técnicas e administrativas)') +
      `A Contraparte implementará medidas técnicas e administrativas aptas a proteger os dados pessoais contra acessos não autorizados e situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou difusão (art. 46 da LGPD), incluindo, no mínimo: controle de acesso, criptografia em trânsito, segregação de ambientes, backups, gestão de vulnerabilidades e logs.\n` +
      `Quando aplicável, a Contraparte observará boas práticas alinhadas à ISO/IEC 27001 e 27002.`,
  });

  // D. Subcontratação
  add({
    bloco: 'D',
    titulo: 'Subcontratação (suboperadores) e flow-down',
    aplicavel: !!n.B1_trata_dados_pessoais,
    texto:
      clauseHeader('D', 'Subcontratação (suboperadores) e flow-down') +
      `A subcontratação de operações de tratamento dependerá de autorização prévia do Cliente. Suboperadores deverão assumir obrigações equivalentes às deste instrumento, inclusive segurança e confidencialidade, permanecendo a Contraparte responsável por seus atos.`,
  });

  // E. Transferência internacional
  add({
    bloco: 'E',
    titulo: 'Transferência internacional de dados',
    aplicavel: !!n.E4_ha_transferencia_internacional,
    motivo: n.E4_ha_transferencia_internacional ? undefined : 'Sem transferência internacional prevista',
    texto:
      clauseHeader('E', 'Transferência internacional de dados') +
      `Caso haja transferência internacional de dados, a Contraparte somente a realizará mediante base legal aplicável e mecanismos de adequação previstos nos arts. 33 a 36 da LGPD, assegurando transparência quanto aos países de destino e às salvaguardas aplicadas.`,
  });

  // G. Incidentes
  add({
    bloco: 'G',
    titulo: 'Incidentes de segurança e notificação',
    aplicavel: !!n.B1_trata_dados_pessoais,
    texto:
      clauseHeader('G', 'Incidentes de segurança e notificação') +
      `A Contraparte comunicará o Cliente sobre incidentes de segurança que possam acarretar risco ou dano relevante aos titulares, em até ${prazo} (quarenta e oito) horas da ciência do fato, incluindo natureza do incidente, dados afetados, medidas de contenção e plano de remediação.\n` +
      `A Contraparte cooperará com o Cliente para atendimento a titulares e à ANPD, quando aplicável.`,
  });

  // F. Retenção / eliminação
  add({
    bloco: 'F',
    titulo: 'Retenção, devolução e eliminação dos dados',
    aplicavel: !!n.B1_trata_dados_pessoais,
    texto:
      clauseHeader('F', 'Retenção, devolução e eliminação dos dados') +
      `Encerrado o contrato, a Contraparte deverá, conforme instruções do Cliente, devolver ou eliminar os dados pessoais, ressalvadas hipóteses legais de guarda. A eliminação deve ser segura e rastreável, com registro do procedimento.`,
  });

  // H. Auditoria
  add({
    bloco: 'H',
    titulo: 'Auditoria e evidências de conformidade',
    aplicavel: !!n.B1_trata_dados_pessoais,
    texto:
      clauseHeader('H', 'Auditoria e evidências de conformidade') +
      `O Cliente poderá solicitar evidências razoáveis de conformidade (políticas, certificações, relatórios) e, quando necessário, realizar auditoria mediante aviso prévio e critérios de confidencialidade e razoabilidade, sem interromper indevidamente as atividades da Contraparte.`,
  });

  return {
    contexto: n,
    scoreRisco: n.scoreRisco,
    clausulas,
  };
}
