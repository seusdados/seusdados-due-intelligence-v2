/**
 * LGPD Clause Templates v3
 * Sistema de templates de cláusulas contratuais LGPD com 18 blocos
 */

import { ContextoGlobal } from '../logic/contextNormalizer';

export interface ClausulaGerada {
  bloco: string;
  titulo: string;
  texto: string;
  aplicavel: boolean;
  condicao?: string;
}

export interface ResultadoGeracaoClausulas {
  clausulas: ClausulaGerada[];
  contextoNormalizado: ContextoGlobal;
  versao: string;
  dataGeracao: string;
  totalBlocos: number;
  blocosAplicados: number;
}

// Alias para compatibilidade com v2
export interface ClausulasGeradas {
  semDadosPessoais: boolean;
  clausulas: {
    id: string;
    titulo: string;
    conteudo: string;
  }[];
  contextoNormalizado: ContextoGlobal;
  nivelRisco: string;
  versao: string;
}

// ============================================================
// BLOCO 01 - IDENTIFICAÇÃO DAS PARTES E PAPÉIS
// ============================================================
function renderBloco01Identificacao(ctx: ContextoGlobal): ClausulaGerada {
  const papelCliente = ctx.A3_papel_global_cliente || 'controlador';
  const papelContraparte = ctx.A4_papel_global_contraparte || 'operador';
  const tipoContrato = ctx.A1_tipo_contrato_juridico || 'prestação de serviços';
  const naturezaRelacao = ctx.A2_natureza_relacao || 'B2B';
  
  let texto = `**1. Identificação das Partes e Papéis no Tratamento de Dados Pessoais**

Para os fins da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD), as partes declaram que, no âmbito deste contrato de ${tipoContrato.replace(/_/g, ' ')}:

`;

  if (papelCliente === 'controlador' && papelContraparte === 'operador') {
    texto += `- O CONTRATANTE atua como **CONTROLADOR** dos dados pessoais, sendo responsável pelas decisões referentes ao tratamento de dados pessoais;
- O CONTRATADO atua como **OPERADOR**, realizando o tratamento de dados pessoais em nome do Controlador, conforme suas instruções documentadas.`;
  } else if (papelCliente === 'controlador' && papelContraparte === 'controlador') {
    texto += `- Ambas as partes atuam como **CONTROLADORES INDEPENDENTES**, cada qual responsável pelas decisões referentes ao tratamento de dados pessoais em sua esfera de atuação.`;
  } else if (ctx.A5_existe_controladoria_conjunta) {
    texto += `- As partes atuam como **CONTROLADORES CONJUNTOS**, compartilhando as decisões referentes ao tratamento de dados pessoais, nos termos do art. 42 da LGPD.

As responsabilidades de cada parte como controlador conjunto serão definidas em instrumento específico, que deverá contemplar, no mínimo:
- A divisão de responsabilidades pelo atendimento aos direitos dos titulares;
- O ponto de contato para os titulares exercerem seus direitos;
- As respectivas obrigações quanto à segurança dos dados.`;
  } else {
    texto += `- O CONTRATANTE atua como **${papelCliente.toUpperCase().replace(/_/g, ' ')}**;
- O CONTRATADO atua como **${papelContraparte.toUpperCase().replace(/_/g, ' ')}**.`;
  }

  texto += `

A natureza da relação entre as partes é ${naturezaRelacao}.`;

  if (ctx.A8_setor_regulado && ctx.A8_setor_regulado.length > 0 && ctx.A8_setor_regulado[0] !== 'nenhum') {
    const setores = ctx.A8_setor_regulado.map(s => s.replace(/_/g, ' ')).join(', ');
    texto += `

As partes reconhecem que o tratamento de dados pessoais no âmbito deste contrato está sujeito a regulamentação setorial específica (${setores}), comprometendo-se a observar as normas aplicáveis além da LGPD.`;
  }

  return {
    bloco: '01',
    titulo: 'Identificação das Partes e Papéis',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 02 - FINALIDADES DO TRATAMENTO
// ============================================================
function renderBloco02Finalidades(ctx: ContextoGlobal): ClausulaGerada {
  const finalidades = ctx.C1_finalidades_principais || ['execução do contrato'];
  
  let texto = `**2. Finalidades do Tratamento de Dados Pessoais**

O tratamento de dados pessoais no âmbito deste contrato será realizado exclusivamente para as seguintes finalidades:

`;

  finalidades.forEach((f, i) => {
    texto += `${i + 1}. ${f.replace(/_/g, ' ').charAt(0).toUpperCase() + f.replace(/_/g, ' ').slice(1)};\n`;
  });

  texto += `
Qualquer tratamento de dados pessoais para finalidade diversa das acima especificadas dependerá de prévia autorização por escrito do Controlador, ressalvadas as hipóteses de cumprimento de obrigação legal ou regulatória.`;

  if (ctx.C2_ha_decisao_automatizada_com_consequencia_juridica) {
    texto += `

As partes reconhecem que o tratamento de dados pessoais no âmbito deste contrato poderá envolver decisões automatizadas com potencial de produzir efeitos jurídicos significativos aos titulares. Nestes casos, será garantido ao titular o direito de solicitar revisão da decisão, nos termos do art. 20 da LGPD.`;
  }

  if (ctx.C3_ha_perfilhamento_profiling_comercial) {
    texto += `

O tratamento poderá incluir atividades de perfilamento (profiling) para fins comerciais, sempre observando os princípios da necessidade, adequação e transparência, e garantindo ao titular o direito de oposição.`;
  }

  if (ctx.C4_uso_para_marketing_direto) {
    texto += `

O uso de dados pessoais para fins de marketing direto dependerá de consentimento específico do titular, que poderá ser revogado a qualquer momento, sem prejuízo da licitude do tratamento realizado anteriormente.`;
  }

  return {
    bloco: '02',
    titulo: 'Finalidades do Tratamento',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 03 - BASES LEGAIS
// ============================================================
function renderBloco03BasesLegais(ctx: ContextoGlobal): ClausulaGerada {
  const basesComuns = ctx.D1_base_legal_predominante_dados_comuns || ['execucao_contrato'];
  const basesSensiveis = ctx.D2_base_legal_predominante_dados_sensiveis || [];
  
  let texto = `**3. Bases Legais para o Tratamento**

O tratamento de dados pessoais no âmbito deste contrato fundamenta-se nas seguintes bases legais previstas na LGPD:

**Para dados pessoais comuns (art. 7º):**
`;

  basesComuns.forEach(b => {
    const baseFormatada = formatarBaseLegal(b);
    texto += `- ${baseFormatada};\n`;
  });

  if (ctx.B3_trata_dados_sensiveis && basesSensiveis.length > 0) {
    texto += `
**Para dados pessoais sensíveis (art. 11):**
`;
    basesSensiveis.forEach(b => {
      const baseFormatada = formatarBaseLegal(b);
      texto += `- ${baseFormatada};\n`;
    });
  }

  if (ctx.D5_usa_interesse_legitimo_para_comuns) {
    texto += `
Quando a base legal for o legítimo interesse do controlador ou de terceiro, as partes comprometem-se a:
- Documentar a avaliação de legítimo interesse (LIA) previamente ao início do tratamento;
- Garantir a transparência ao titular sobre o uso dessa base legal;
- Assegurar que os direitos e liberdades fundamentais do titular não prevaleçam sobre o interesse legítimo alegado.`;

    if (ctx.D6_possui_LIA_documentado) {
      texto += `

O Controlador declara possuir Relatório de Legítimo Interesse (LIA) documentado para as operações de tratamento baseadas nesta hipótese legal.`;
    }
  }

  texto += `

As partes reconhecem que o consentimento, quando utilizado como base legal, deve ser livre, informado, inequívoco e específico para finalidades determinadas, podendo ser revogado a qualquer momento pelo titular.`;

  return {
    bloco: '03',
    titulo: 'Bases Legais',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 04 - TIPOS DE DADOS TRATADOS
// ============================================================
function renderBloco04TiposDados(ctx: ContextoGlobal): ClausulaGerada {
  const tiposComuns = ctx.B11_tipos_dados_comuns || ['dados cadastrais', 'dados de contato'];
  const tiposSensiveis = ctx.B12_tipos_dados_sensiveis || [];
  const categoriasTitulares = ctx.B5_categorias_titulares || ['titulares'];
  
  let texto = `**4. Categorias de Dados Pessoais e Titulares**

No âmbito deste contrato, poderão ser tratados dados pessoais das seguintes categorias de titulares:
`;

  categoriasTitulares.forEach(c => {
    texto += `- ${c.replace(/_/g, ' ').charAt(0).toUpperCase() + c.replace(/_/g, ' ').slice(1)};\n`;
  });

  texto += `
As categorias de dados pessoais comuns que poderão ser tratados incluem:
`;

  tiposComuns.forEach(t => {
    texto += `- ${t.replace(/_/g, ' ')};\n`;
  });

  if (ctx.B3_trata_dados_sensiveis && tiposSensiveis.length > 0) {
    texto += `
As categorias de dados pessoais sensíveis que poderão ser tratados incluem:
`;
    tiposSensiveis.forEach(t => {
      texto += `- ${t.replace(/_/g, ' ')};\n`;
    });

    texto += `
O tratamento de dados sensíveis será limitado ao estritamente necessário para as finalidades contratadas e observará medidas de segurança reforçadas.`;
  }

  if (ctx.B10_volume_titulares_estimado) {
    const volume = ctx.B10_volume_titulares_estimado.replace(/_/g, ' ');
    texto += `

O volume estimado de titulares cujos dados serão tratados é considerado ${volume}.`;
  }

  return {
    bloco: '04',
    titulo: 'Tipos de Dados Tratados',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 05 - MENORES (CRIANÇAS E ADOLESCENTES)
// ============================================================
function renderBloco05Menores(ctx: ContextoGlobal): ClausulaGerada {
  const trataCriancas = ctx.B6_trata_dados_criancas_0_12;
  const trataAdolescentes = ctx.B7_trata_dados_adolescentes_13_17;
  const aplicavel = trataCriancas || trataAdolescentes;
  
  if (!aplicavel) {
    return {
      bloco: '05',
      titulo: 'Tratamento de Dados de Menores',
      texto: '',
      aplicavel: false,
      condicao: 'Não há tratamento de dados de crianças ou adolescentes'
    };
  }

  let tipoMenores = '';
  if (trataCriancas && trataAdolescentes) {
    tipoMenores = 'crianças e adolescentes';
  } else if (trataCriancas) {
    tipoMenores = 'crianças';
  } else {
    tipoMenores = 'adolescentes';
  }

  let texto = `**5. Tratamento de Dados Pessoais de Crianças e Adolescentes**

As partes reconhecem que, no âmbito deste contrato, poderá haver tratamento de dados pessoais de ${tipoMenores} e comprometem-se a observar o disposto no artigo 14 da LGPD e no Enunciado CD/ANPD nº 1, garantindo sempre o melhor interesse do menor.

O tratamento de dados pessoais de menores será limitado ao mínimo necessário para a execução das obrigações decorrentes deste contrato e para o cumprimento de obrigações legais, regulatórias ou de políticas públicas aplicáveis.

`;

  const basesLegaisMenores = ctx.D3_base_legal_dados_menores_comuns || [];
  const basesLegaisMenoresSensiveis = ctx.D4_base_legal_dados_menores_sensiveis || [];
  
  if (basesLegaisMenores.includes('consentimento_responsavel') || basesLegaisMenoresSensiveis.includes('consentimento_responsavel')) {
    texto += `Quando a base legal aplicável exigir consentimento, este será obtido de pelo menos um dos pais ou responsável legal, de forma específica e destacada, em linguagem clara e acessível.

`;
  }

  texto += `As partes adotarão medidas técnicas e administrativas reforçadas para proteger esses dados, incluindo controle de acesso restrito, registros de operações e revisão periódica da necessidade de sua conservação.`;

  if (ctx._inferido_criancas_por_categoria || ctx._inferido_adolescentes_por_categoria) {
    texto += `

_Nota: O tratamento de dados de menores foi inferido automaticamente com base nas categorias de titulares informadas._`;
  }

  return {
    bloco: '05',
    titulo: 'Tratamento de Dados de Menores',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 06 - SEGURANÇA DA INFORMAÇÃO
// ============================================================
function renderBloco06Seguranca(ctx: ContextoGlobal): ClausulaGerada {
  const nivelSeguranca = ctx.F1_nivel_seguranca_requerido || 'padrao';
  
  let texto = `**6. Medidas de Segurança da Informação**

As partes comprometem-se a adotar medidas técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou difusão, nos termos do art. 46 da LGPD.

`;

  if (nivelSeguranca === 'alto' || nivelSeguranca === 'critico') {
    texto += `Considerando o nível de segurança requerido (**${nivelSeguranca}**), as partes implementarão, no mínimo, as seguintes medidas:

`;
  } else {
    texto += `As medidas de segurança incluirão, no mínimo:

`;
  }

  texto += `- Controle de acesso aos sistemas que tratam dados pessoais;
- Registro de logs de acesso e operações realizadas;
- Procedimentos de autenticação de usuários;
`;

  if (ctx.F6_exige_criptografia_em_reposo_e_transito) {
    texto += `- Criptografia de dados pessoais em repouso e em trânsito;
`;
  }

  if (ctx.F7_exige_controle_acesso_base_funcao_rbac) {
    texto += `- Controle de acesso baseado em função (RBAC);
`;
  }

  if (ctx.F5_exige_log_e_trilha_auditoria) {
    texto += `- Trilha de auditoria completa das operações de tratamento;
`;
  }

  if (ctx.F8_exige_backup_seguro) {
    texto += `- Backup seguro e criptografado dos dados pessoais;
`;
  }

  if (ctx.F2_exige_ISO_27001) {
    texto += `
O Operador declara manter certificação ISO 27001 vigente ou compromete-se a implementar controles equivalentes aos exigidos pela norma.`;
  }

  if (ctx.F3_exige_SOC2) {
    texto += `
O Operador declara manter relatório SOC 2 Tipo II vigente ou compromete-se a obter tal certificação no prazo acordado entre as partes.`;
  }

  if (ctx.F4_exige_pentest_periodico) {
    texto += `
O Operador realizará testes de penetração (pentest) periodicamente, disponibilizando os resultados ao Controlador quando solicitado.`;
  }

  if (ctx.F9_exige_plano_continuidade) {
    texto += `
O Operador manterá plano de continuidade de negócios e recuperação de desastres que contemple a proteção dos dados pessoais tratados.`;
  }

  return {
    bloco: '06',
    titulo: 'Segurança da Informação',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCOS 07/08 - COMPARTILHAMENTO E SUBOPERADORES
// ============================================================
function renderBlocos0708CompartilhamentoSuboperadores(ctx: ContextoGlobal): ClausulaGerada {
  const haCompartilhamento = ctx.E1_ha_compartilhamento_com_terceiros;
  const haSuboperadores = ctx.E3_ha_suboperadores;
  
  let texto = `**7. Compartilhamento de Dados Pessoais e Uso de Suboperadores**

`;

  if (haCompartilhamento) {
    const tiposTerceiros = ctx.E2_tipos_terceiros || ['prestadores de serviço'];
    texto += `**7.1.** O Operador poderá compartilhar dados pessoais com terceiros exclusivamente para as finalidades previstas neste contrato, nas seguintes categorias:

`;
    tiposTerceiros.forEach(t => {
      texto += `- ${t.replace(/_/g, ' ')};\n`;
    });

    texto += `
O compartilhamento dependerá de prévia autorização do Controlador, salvo quando necessário para cumprimento de obrigação legal ou regulatória.

`;
  } else {
    texto += `**7.1.** As partes declaram que não haverá compartilhamento de dados pessoais com terceiros, além das hipóteses exigidas por lei ou autoridade competente.

`;
  }

  if (haSuboperadores) {
    texto += `**7.2.** O Operador poderá utilizar suboperadores para a execução de atividades específicas de tratamento, desde que:

a) Obtenha autorização prévia e específica do Controlador;
b) Celebre contrato escrito com o suboperador, impondo obrigações de proteção de dados equivalentes às previstas neste instrumento;
c) Permaneça integralmente responsável perante o Controlador pelos atos do suboperador;
d) Mantenha lista atualizada dos suboperadores utilizados, disponibilizando-a ao Controlador quando solicitado.

`;
  } else {
    texto += `**7.2.** O Operador declara que não utilizará suboperadores para o tratamento de dados pessoais sem autorização prévia e expressa do Controlador.

`;
  }

  texto += `O Controlador poderá, a qualquer tempo, solicitar informações sobre os terceiros e suboperadores envolvidos no tratamento, bem como exigir a substituição daqueles que não demonstrem conformidade adequada com a LGPD.`;

  return {
    bloco: '07-08',
    titulo: 'Compartilhamento e Suboperadores',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 09 - TRANSFERÊNCIA INTERNACIONAL
// ============================================================
function renderBloco09TransferenciaInternacional(ctx: ContextoGlobal): ClausulaGerada {
  const haTransferencia = ctx.E4_ha_transferencia_internacional;
  
  if (!haTransferencia) {
    return {
      bloco: '09',
      titulo: 'Transferência Internacional',
      texto: '',
      aplicavel: false,
      condicao: 'Não há transferência internacional de dados'
    };
  }

  const naturezaPaises = ctx.E5_natureza_paises_destino || 'nao_adequado';
  const paises = ctx.E8_paises_destino || [];
  const mecanismo = ctx.E9_mecanismo_transferencia || 'clausulas_padrao';
  
  let texto = `**9. Transferência Internacional de Dados Pessoais**

As partes reconhecem que o tratamento de dados pessoais no âmbito deste contrato poderá envolver transferência internacional de dados.

`;

  if (paises.length > 0) {
    texto += `Os dados pessoais poderão ser transferidos para os seguintes países/regiões: ${paises.join(', ')}.

`;
  }

  if (naturezaPaises === 'adequado_anpd' || naturezaPaises === 'adequado_ue_gdpr') {
    texto += `Os países de destino são reconhecidos como adequados pela ANPD ou pela Comissão Europeia, dispensando mecanismos adicionais de transferência.

`;
  } else {
    texto += `Considerando que os países de destino não possuem decisão de adequação, a transferência será realizada mediante:

`;
    
    switch (mecanismo) {
      case 'clausulas_padrao':
        texto += `- Cláusulas-padrão contratuais aprovadas pela ANPD ou equivalentes internacionais reconhecidos;`;
        break;
      case 'normas_corporativas':
        texto += `- Normas corporativas globais (Binding Corporate Rules) aprovadas pela autoridade competente;`;
        break;
      case 'consentimento':
        texto += `- Consentimento específico e destacado do titular, informado dos riscos envolvidos;`;
        break;
      default:
        texto += `- Mecanismo de transferência adequado conforme art. 33 da LGPD;`;
    }

    texto += `

`;
  }

  texto += `O Operador compromete-se a notificar o Controlador sobre qualquer alteração nos países de destino ou nos mecanismos de transferência utilizados.`;

  if (ctx.R1_nivel_risco_global_estimado === 'critico') {
    texto += `

Considerando o nível crítico de risco associado ao tratamento, as partes implementarão medidas suplementares de proteção para a transferência internacional, incluindo criptografia de ponta a ponta e avaliação periódica da legislação do país de destino.`;
  }

  return {
    bloco: '09',
    titulo: 'Transferência Internacional',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 10 - REGISTROS E EVIDÊNCIAS
// ============================================================
function renderBloco10RegistrosEvidencias(ctx: ContextoGlobal): ClausulaGerada {
  const prazoDisponibilizacao = ctx.M3_prazo_disponibilizacao_registros_dias || 5;
  
  let texto = `**10. Registros das Operações de Tratamento**

O Operador manterá registro das operações de tratamento de dados pessoais realizadas em nome do Controlador, nos termos do art. 37 da LGPD, contendo, no mínimo:

- Categorias de dados pessoais tratados;
- Finalidades do tratamento;
- Categorias de titulares;
- Período de retenção;
- Medidas de segurança adotadas.

`;

  if (ctx.M2_formato_registro) {
    texto += `Os registros serão mantidos em formato ${ctx.M2_formato_registro.replace(/_/g, ' ')}.

`;
  }

  texto += `O Operador disponibilizará os registros ao Controlador em até ${prazoDisponibilizacao} dias úteis após solicitação formal.

`;

  if (ctx.M4_compartilha_RIPD_quando_exigido) {
    texto += `Quando exigido pela ANPD ou pelo Controlador, o Operador colaborará na elaboração do Relatório de Impacto à Proteção de Dados Pessoais (RIPD), fornecendo as informações necessárias sobre as operações de tratamento realizadas.`;
  }

  return {
    bloco: '10',
    titulo: 'Registros e Evidências',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 11 - DIREITOS DOS TITULARES
// ============================================================
function renderBloco11DireitosTitulares(ctx: ContextoGlobal): ClausulaGerada {
  const prazoResposta = ctx.I3_prazo_resposta_solicitacoes_dias_uteis || 15;
  const operadorApoia = ctx.I4_operador_apoia_atendimento_controlador !== false;
  
  let texto = `**11. Direitos dos Titulares**

As partes comprometem-se a garantir o exercício dos direitos dos titulares previstos no art. 18 da LGPD, incluindo:

- Confirmação da existência de tratamento;
- Acesso aos dados;
- Correção de dados incompletos, inexatos ou desatualizados;
- Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;
- Portabilidade dos dados;
- Eliminação dos dados tratados com consentimento;
- Informação sobre compartilhamento;
- Revogação do consentimento.

`;

  if (ctx.I1_canal_direitos_titulares_tipo && ctx.I2_canal_direitos_titulares_contato) {
    texto += `O canal para exercício dos direitos dos titulares é: ${ctx.I1_canal_direitos_titulares_tipo.replace(/_/g, ' ')} - ${ctx.I2_canal_direitos_titulares_contato}.

`;
  }

  texto += `As solicitações dos titulares serão atendidas no prazo de ${prazoResposta} dias úteis, contados do recebimento da solicitação.

`;

  if (operadorApoia) {
    texto += `O Operador apoiará o Controlador no atendimento às solicitações dos titulares, fornecendo as informações necessárias e implementando as medidas técnicas requeridas no prazo acordado.`;
  }

  return {
    bloco: '11',
    titulo: 'Direitos dos Titulares',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 12 - INCIDENTES DE SEGURANÇA
// ============================================================
function renderBloco12Incidentes(ctx: ContextoGlobal): ClausulaGerada {
  const prazoNotificacao = ctx.G1_prazo_notificacao_entre_partes_horas || 48;
  const conteudoMinimo = ctx.G3_conteudo_minimo_notificacao || [];
  const cooperaANPD = ctx.G4_coopera_para_notificar_ANPD_titulares !== false;
  
  let texto = `**12. Notificação e Gestão de Incidentes de Segurança**

Em caso de incidente de segurança envolvendo dados pessoais tratados em razão deste contrato, a parte que dele tiver ciência deverá notificar a outra parte em até **${prazoNotificacao} horas**, contadas da ciência do fato, sob pena de caracterizar descumprimento contratual.

A notificação deverá conter, sempre que possível:
`;

  if (conteudoMinimo.length > 0) {
    conteudoMinimo.forEach(item => {
      texto += `- ${item.replace(/_/g, ' ')};\n`;
    });
  } else {
    texto += `- Descrição geral do incidente;
- Categorias de dados pessoais afetados;
- Número estimado de titulares;
- Riscos potenciais e medidas adotadas.
`;
  }

  if (cooperaANPD) {
    texto += `
As partes cooperarão de boa-fé na avaliação da necessidade de comunicação do incidente à ANPD e aos titulares afetados, nos termos do art. 48 da LGPD.
`;
  }

  if (ctx.G5_possui_plano_resposta_incidentes) {
    texto += `
O Operador declara possuir plano de resposta a incidentes documentado e testado periodicamente.`;
  }

  if (ctx.R1_nivel_risco_global_estimado === 'critico') {
    texto += `

Considerando o nível crítico de risco associado ao tratamento de dados pessoais no âmbito deste contrato, as partes reconhecem a necessidade de priorizar a resposta a incidentes e manter planos e registros atualizados sobre tais eventos.`;
  }

  return {
    bloco: '12',
    titulo: 'Incidentes de Segurança',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 13 - AUDITORIA
// ============================================================
function renderBloco13Auditoria(ctx: ContextoGlobal): ClausulaGerada {
  const permiteAuditoria = ctx.L3_permite_auditoria_controlador !== false;
  const prazoAviso = ctx.L5_prazo_aviso_auditoria_dias || 10;
  const frequencia = ctx.L4_frequencia_auditoria || 'anual';
  
  let texto = `**13. Auditoria e Verificação de Conformidade**

`;

  if (permiteAuditoria) {
    texto += `O Controlador poderá, diretamente ou por meio de auditor independente, realizar auditorias para verificar a conformidade do Operador com as obrigações de proteção de dados previstas neste contrato e na LGPD.

As auditorias serão realizadas com frequência ${frequencia.replace(/_/g, ' ')}, mediante aviso prévio de ${prazoAviso} dias úteis, salvo em casos de urgência decorrentes de incidentes de segurança.

O Operador compromete-se a:
- Disponibilizar acesso às instalações, sistemas e documentos relevantes;
- Fornecer as informações solicitadas no prazo acordado;
- Implementar as recomendações de auditoria em prazo razoável.

`;
  } else {
    texto += `O Operador fornecerá ao Controlador, mediante solicitação, relatórios de conformidade e certificações que demonstrem a adequação às obrigações de proteção de dados.

`;
  }

  texto += `Os custos das auditorias serão suportados pelo Controlador, salvo quando a auditoria revelar não conformidade material, caso em que os custos serão de responsabilidade do Operador.`;

  return {
    bloco: '13',
    titulo: 'Auditoria',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 14 - OBRIGAÇÕES DAS PARTES
// ============================================================
function renderBloco14ObrigacoesPartes(ctx: ContextoGlobal): ClausulaGerada {
  const papelCliente = ctx.A3_papel_global_cliente || 'controlador';
  const papelContraparte = ctx.A4_papel_global_contraparte || 'operador';
  
  let texto = `**14. Obrigações das Partes**

**14.1. Obrigações do ${papelCliente === 'controlador' ? 'Controlador' : 'Contratante'}:**

a) Fornecer instruções claras e documentadas sobre o tratamento de dados pessoais;
b) Garantir a licitude da coleta e do tratamento dos dados pessoais;
c) Atender às solicitações dos titulares, com apoio do Operador quando necessário;
d) Notificar o Operador sobre alterações nas instruções de tratamento;
e) Realizar avaliações de impacto quando exigido pela LGPD.

**14.2. Obrigações do ${papelContraparte === 'operador' ? 'Operador' : 'Contratado'}:**

a) Tratar os dados pessoais exclusivamente conforme as instruções documentadas do Controlador;
b) Garantir que as pessoas autorizadas a tratar dados pessoais estejam sujeitas a obrigação de confidencialidade;
c) Implementar as medidas de segurança previstas neste contrato;
d) Auxiliar o Controlador no atendimento às solicitações dos titulares;
e) Auxiliar o Controlador na elaboração de relatórios de impacto;
f) Notificar o Controlador sobre incidentes de segurança;
g) Eliminar ou devolver os dados pessoais ao término do contrato;
h) Disponibilizar informações necessárias para demonstrar conformidade.

`;

  if (ctx.J3_possui_encarregado_nomeado) {
    texto += `**14.3.** Ambas as partes declaram possuir Encarregado pelo Tratamento de Dados Pessoais (DPO) nomeado, cujos dados de contato serão compartilhados entre as partes.`;
    
    if (ctx.J4_encarregado_contato) {
      texto += `

Contato do Encarregado: ${ctx.J4_encarregado_contato}`;
    }
  }

  return {
    bloco: '14',
    titulo: 'Obrigações das Partes',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 15 - RESPONSABILIDADE CIVIL
// ============================================================
function renderBloco15ResponsabilidadeCivil(ctx: ContextoGlobal): ClausulaGerada {
  const regime = ctx.K1_regime_responsabilidade_contratual || 'solidaria';
  const limite = ctx.K2_limite_responsabilidade || 'sem_limite';
  const haRegresso = ctx.K4_ha_direito_regresso_explicito !== false;
  
  let texto = `**15. Responsabilidade Civil e Indenização**

`;

  if (regime === 'solidaria') {
    texto += `As partes respondem solidariamente pelos danos causados aos titulares em razão do tratamento de dados pessoais realizado em violação à LGPD, nos termos do art. 42.

`;
  } else {
    texto += `Cada parte responderá pelos danos causados aos titulares em razão de violação à LGPD decorrente de sua própria conduta, observado o disposto no art. 42 da LGPD.

`;
  }

  if (haRegresso) {
    texto += `A parte que reparar o dano ao titular terá direito de regresso contra a outra parte, na medida de sua participação no evento danoso.

`;
  }

  if (limite !== 'sem_limite') {
    texto += `A responsabilidade contratual de cada parte está limitada a ${limite.replace(/_/g, ' ')}, exceto em casos de dolo ou culpa grave.

`;
  }

  if (ctx.K3_possui_seguro_cyber) {
    texto += `O Operador declara manter seguro de responsabilidade civil para riscos cibernéticos (cyber insurance) com cobertura adequada ao volume e sensibilidade dos dados tratados.

`;
  }

  if (ctx.K5_clausula_indenizacao) {
    texto += `A parte que der causa a condenação judicial ou administrativa relacionada ao tratamento de dados pessoais objeto deste contrato indenizará a outra parte pelos valores despendidos, incluindo custas processuais e honorários advocatícios.`;
  }

  return {
    bloco: '15',
    titulo: 'Responsabilidade Civil',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 16 - RETENÇÃO E ELIMINAÇÃO
// ============================================================
function renderBloco16RetencaoEliminacao(ctx: ContextoGlobal): ClausulaGerada {
  const criterioRetencao = ctx.H1_criterio_geral_retencao || 'duracao_contrato_mais_prazo_legal';
  const prazoAposTermino = ctx.H2_prazo_retencao_depois_termino || '5 anos';
  const eliminaSuboperadores = ctx.H6_eliminacao_inclui_suboperadores !== false;
  const formatoDevolucao = ctx.H7_formato_devolucao_exigido || 'formato_original';
  
  let texto = `**16. Retenção e Eliminação de Dados Pessoais**

Os dados pessoais tratados no âmbito deste contrato serão retidos pelo período necessário para:
- Cumprimento das finalidades contratadas;
- Cumprimento de obrigações legais e regulatórias;
- Exercício regular de direitos em processo judicial, administrativo ou arbitral.

`;

  texto += `O critério geral de retenção é: ${criterioRetencao.replace(/_/g, ' ')}.

`;

  texto += `Após o término do contrato, os dados pessoais serão mantidos por ${prazoAposTermino} para cumprimento de obrigações legais, após o que serão eliminados de forma segura.

`;

  texto += `Ao término do contrato ou mediante solicitação do Controlador, o Operador deverá:

a) Devolver todos os dados pessoais ao Controlador em formato ${formatoDevolucao.replace(/_/g, ' ')}; ou
b) Eliminar todos os dados pessoais de forma segura e irreversível, mediante certificação por escrito.

`;

  if (ctx.H4_ha_backup_com_dados_pessoais) {
    texto += `Os dados pessoais armazenados em backups serão eliminados conforme a política de retenção de backups, não excedendo ${ctx.H5_prazo_eliminacao_backup || '90 dias'} após a eliminação dos dados em produção.

`;
  }

  if (eliminaSuboperadores) {
    texto += `A obrigação de eliminação estende-se aos suboperadores utilizados, devendo o Operador garantir a eliminação completa em toda a cadeia de tratamento.`;
  }

  if (ctx.H8_metodo_eliminacao) {
    texto += `

O método de eliminação a ser utilizado é: ${ctx.H8_metodo_eliminacao.replace(/_/g, ' ')}.`;
  }

  return {
    bloco: '16',
    titulo: 'Retenção e Eliminação',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 17 - GOVERNANÇA
// ============================================================
function renderBloco17Governanca(ctx: ContextoGlobal): ClausulaGerada {
  let texto = `**17. Governança e Programa de Privacidade**

`;

  if (ctx.J1_possui_politica_privacidade_formal) {
    texto += `O Operador declara possuir Política de Privacidade formal, disponível aos titulares e colaboradores.

`;
  }

  if (ctx.J2_possui_programa_privacidade) {
    texto += `O Operador declara manter Programa de Privacidade estruturado, contemplando:
- Mapeamento de dados pessoais;
- Avaliação de riscos;
- Controles de segurança;
- Treinamento de colaboradores;
- Gestão de incidentes;
- Atendimento aos direitos dos titulares.

`;
  }

  if (ctx.J3_possui_encarregado_nomeado) {
    texto += `O Operador possui Encarregado pelo Tratamento de Dados Pessoais (DPO) nomeado, responsável por:
- Aceitar reclamações e comunicações dos titulares;
- Receber comunicações da ANPD;
- Orientar funcionários e contratados sobre práticas de proteção de dados;
- Executar as demais atribuições previstas em normas complementares.

`;
  }

  if (ctx.J5_possui_procedimento_gestao_incidentes) {
    texto += `O Operador possui procedimento documentado de gestão de incidentes de segurança.

`;
  }

  if (ctx.J6_realiza_treinamentos_periodicos) {
    texto += `O Operador realiza treinamentos periódicos sobre proteção de dados pessoais para seus colaboradores.

`;
  }

  if (ctx.J7_possui_comite_privacidade) {
    texto += `O Operador possui Comitê de Privacidade ou estrutura equivalente para governança de dados pessoais.`;
  }

  return {
    bloco: '17',
    titulo: 'Governança',
    texto,
    aplicavel: true
  };
}

// ============================================================
// BLOCO 18 - DEVOLUÇÃO E PORTABILIDADE
// ============================================================
function renderBloco18DevolucaoPortabilidade(ctx: ContextoGlobal): ClausulaGerada {
  const permitePortabilidade = ctx.N1_permite_portabilidade !== false;
  const formatoPortabilidade = ctx.N2_formato_portabilidade || 'CSV ou JSON';
  const prazoPortabilidade = ctx.N3_prazo_portabilidade_dias || 15;
  const custoPortabilidade = ctx.N4_custo_portabilidade || 'sem_custo';
  
  let texto = `**18. Devolução e Portabilidade de Dados**

`;

  if (permitePortabilidade) {
    texto += `O Controlador poderá, a qualquer momento durante a vigência do contrato ou em seu término, solicitar a portabilidade dos dados pessoais para outro fornecedor de serviço ou produto.

A portabilidade será realizada em formato ${formatoPortabilidade}, estruturado, de uso comum e leitura automatizada, no prazo de ${prazoPortabilidade} dias úteis após a solicitação.

`;

    if (custoPortabilidade === 'sem_custo') {
      texto += `A portabilidade será realizada sem custo adicional para o Controlador.

`;
    } else {
      texto += `Os custos da portabilidade serão: ${custoPortabilidade.replace(/_/g, ' ')}.

`;
    }
  }

  texto += `Ao término do contrato, independentemente do motivo:

a) O Operador disponibilizará ao Controlador, no prazo de ${prazoPortabilidade} dias úteis, cópia integral dos dados pessoais tratados;
b) Após confirmação de recebimento pelo Controlador, o Operador eliminará todos os dados pessoais de seus sistemas, conforme cláusula de eliminação;
c) O Operador fornecerá certificação por escrito da eliminação completa dos dados.

`;

  texto += `A obrigação de devolução não se aplica aos dados que o Operador seja obrigado a reter por força de lei ou regulamento, devendo informar ao Controlador sobre tais exceções.`;

  return {
    bloco: '18',
    titulo: 'Devolução e Portabilidade',
    texto,
    aplicavel: true
  };
}

// ============================================================
// CLÁUSULA MÍNIMA SEM DADOS PESSOAIS
// ============================================================
function renderClausulaMinimaSemDadosPessoais(): ClausulaGerada {
  const texto = `**Cláusula de Proteção de Dados**

As partes declaram, para os devidos fins, que a presente relação contratual não envolve o tratamento de dados pessoais, na acepção do art. 5º, inciso I, da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

Na hipótese de futura inclusão de atividades que envolvam o tratamento de dados pessoais, as partes comprometem-se a celebrar aditivo específico com cláusulas de proteção de dados em conformidade com a LGPD.`;

  return {
    bloco: 'minima',
    titulo: 'Cláusula Mínima (Sem Dados Pessoais)',
    texto,
    aplicavel: true
  };
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================
function formatarBaseLegal(base: string): string {
  const mapeamento: Record<string, string> = {
    'execucao_contrato': 'Execução de contrato ou de procedimentos preliminares (art. 7º, V)',
    'obrigacao_legal': 'Cumprimento de obrigação legal ou regulatória (art. 7º, II)',
    'consentimento': 'Consentimento do titular (art. 7º, I)',
    'interesse_legitimo': 'Legítimo interesse do controlador ou de terceiro (art. 7º, IX)',
    'exercicio_direitos': 'Exercício regular de direitos em processo (art. 7º, VI)',
    'protecao_vida': 'Proteção da vida ou da incolumidade física (art. 7º, VII)',
    'tutela_saude': 'Tutela da saúde (art. 7º, VIII)',
    'protecao_credito': 'Proteção do crédito (art. 7º, X)',
    'politicas_publicas': 'Execução de políticas públicas (art. 7º, III)',
    'estudos_pesquisa': 'Realização de estudos por órgão de pesquisa (art. 7º, IV)',
    'consentimento_responsavel': 'Consentimento específico do responsável legal (art. 14)',
    'obrigacao_legal_sensivel': 'Cumprimento de obrigação legal (art. 11, II, a)',
    'saude_sensivel': 'Tutela da saúde em procedimento realizado por profissionais de saúde (art. 11, II, f)',
    'prevencao_fraude': 'Prevenção à fraude e à segurança do titular (art. 11, II, g)'
  };
  
  return mapeamento[base] || base.replace(/_/g, ' ');
}

// ============================================================
// FUNÇÃO PRINCIPAL DE GERAÇÃO v3
// ============================================================
export function gerarClausulasLGPD(contexto: ContextoGlobal): ResultadoGeracaoClausulas {
  const clausulas: ClausulaGerada[] = [];
  
  // Se não trata dados pessoais, retornar apenas cláusula mínima
  if (contexto._scenario_sem_dados_pessoais || contexto.B1_trata_dados_pessoais === false) {
    clausulas.push(renderClausulaMinimaSemDadosPessoais());
    
    return {
      clausulas,
      contextoNormalizado: contexto,
      versao: 'v3',
      dataGeracao: new Date().toISOString(),
      totalBlocos: 1,
      blocosAplicados: 1
    };
  }
  
  // Renderizar todos os 18 blocos em sequência
  const blocos = [
    renderBloco01Identificacao(contexto),
    renderBloco02Finalidades(contexto),
    renderBloco03BasesLegais(contexto),
    renderBloco04TiposDados(contexto),
    renderBloco05Menores(contexto),
    renderBloco06Seguranca(contexto),
    renderBlocos0708CompartilhamentoSuboperadores(contexto),
    renderBloco09TransferenciaInternacional(contexto),
    renderBloco10RegistrosEvidencias(contexto),
    renderBloco11DireitosTitulares(contexto),
    renderBloco12Incidentes(contexto),
    renderBloco13Auditoria(contexto),
    renderBloco14ObrigacoesPartes(contexto),
    renderBloco15ResponsabilidadeCivil(contexto),
    renderBloco16RetencaoEliminacao(contexto),
    renderBloco17Governanca(contexto),
    renderBloco18DevolucaoPortabilidade(contexto)
  ];
  
  // Adicionar apenas blocos aplicáveis
  blocos.forEach(bloco => {
    if (bloco.aplicavel) {
      clausulas.push(bloco);
    }
  });
  
  return {
    clausulas,
    contextoNormalizado: contexto,
    versao: 'v3',
    dataGeracao: new Date().toISOString(),
    totalBlocos: blocos.length,
    blocosAplicados: clausulas.length
  };
}

// ============================================================
// FUNÇÃO DE GERAÇÃO DE TEXTO COMPLETO
// ============================================================
export function gerarTextoCompletoClausulas(resultado: ResultadoGeracaoClausulas): string {
  let texto = `CLÁUSULAS DE PROTEÇÃO DE DADOS PESSOAIS
========================================

Gerado em: ${new Date(resultado.dataGeracao).toLocaleString('pt-BR')}
Versão do módulo: ${resultado.versao}
Blocos aplicados: ${resultado.blocosAplicados} de ${resultado.totalBlocos}

`;

  resultado.clausulas.forEach(clausula => {
    texto += `${clausula.texto}\n\n`;
  });

  return texto;
}

// Alias para compatibilidade com código existente
export function renderClausulaSemDadosPessoais(): string {
  return renderClausulaMinimaSemDadosPessoais().texto;
}

export function renderBloco05MenoresTexto(ctx: ContextoGlobal): string {
  const resultado = renderBloco05Menores(ctx);
  return resultado.aplicavel ? resultado.texto : '';
}
