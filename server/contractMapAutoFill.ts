/**
 * Autopreenchimento obrigatório do mapa LGPD
 * Garante que lgpdAgentType, vigência, dados nunca ficam null
 */

export interface AutoFillMapInput {
  contractText?: string;
  extractedText?: string;
  contractType?: string;
  partnerName?: string;
  contractName?: string;
  analysisMap?: Record<string, any>;
}

export interface AutoFilledMap {
  lgpdAgentType: string;
  agentTypeJustification: string;
  startDate: string;
  endDate: string;
  commonData: string;
  sensitiveData: string;
  commonDataInferred: boolean;
  sensitiveDataInferred: boolean;
}

/**
 * Extrai papel LGPD com justificativa
 */
function extractLgpdAgentType(
  text: string,
  contractType: string,
  partnerName: string
): { agentType: string; justification: string } {
  const textLower = text.toLowerCase();

  // Sinais de Operador
  const operadorSignals = [
    /processamento\s+de\s+dados\s+em\s+nome\s+de/i,
    /operador\s+de\s+dados/i,
    /processará\s+dados\s+conforme\s+instruções/i,
    /não\s+determinará\s+finalidade/i,
    /sob\s+instrução\s+do\s+contratante/i,
  ];

  // Sinais de Controlador
  const controladorSignals = [
    /controlador\s+de\s+dados/i,
    /determina\s+finalidade\s+e\s+meios/i,
    /responsável\s+pelo\s+tratamento/i,
    /define\s+finalidade/i,
  ];

  // Sinais de Controlador Conjunto
  const conjuntoSignals = [
    /controlador\s+conjunto/i,
    /conjuntamente\s+determinam/i,
    /acordo\s+de\s+controlador\s+conjunto/i,
  ];

  const hasOperadorSignals = operadorSignals.some(r => r.test(textLower));
  const hasControladorSignals = controladorSignals.some(r => r.test(textLower));
  const hasConjuntoSignals = conjuntoSignals.some(r => r.test(textLower));

  // Lógica de inferência
  if (hasConjuntoSignals) {
    return {
      agentType: 'controlador_conjunto',
      justification: `Identificado como controlador conjunto. Sinais: acordo de controlador conjunto detectado no texto.`
    };
  }

  if (hasOperadorSignals) {
    return {
      agentType: 'operador',
      justification: `Identificado como operador. Sinais: processamento sob instrução, sem determinação de finalidade/meios.`
    };
  }

  if (hasControladorSignals) {
    return {
      agentType: 'controlador',
      justification: `Identificado como controlador. Sinais: determinação de finalidade e meios detectada no texto.`
    };
  }

  // Fallback baseado em tipo de contrato
  const contractTypeLower = (contractType || '').toLowerCase();
  if (
    contractTypeLower.includes('prestação de serviço') ||
    contractTypeLower.includes('consultoria') ||
    contractTypeLower.includes('dpo') ||
    contractTypeLower.includes('saas')
  ) {
    return {
      agentType: 'operador',
      justification: `Inferido como operador pela natureza do serviço (${contractType}). Não identificado explicitamente no contrato; aplicado padrão conservador.`
    };
  }

  // Fallback final
  return {
    agentType: 'controlador',
    justification: `Não identificado no contrato; inferido pela natureza do serviço. Aplicado padrão conservador (controlador). Parceiro: ${partnerName || 'N/A'}.`
  };
}

/**
 * Extrai vigência com regex robusta
 */
function extractVigencia(text: string): { startDate: string; endDate: string } {
  const textLower = text.toLowerCase();

  // Padrões de data em português
  const patterns = [
    // dd/mm/aaaa até dd/mm/aaaa
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(?:até|a)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    // dd de mês de aaaa
    /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i,
    // vigência de ... a ...
    /vigência\s+(?:de\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(?:até|a)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    // prazo de X meses
    /prazo\s+(?:de\s+)?(\d+)\s+meses/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1] && match[2] && match[3] && match[4] && match[5] && match[6]) {
        // Formato dd/mm/aaaa até dd/mm/aaaa
        return {
          startDate: `${match[1]}/${match[2]}/${match[3]}`,
          endDate: `${match[4]}/${match[5]}/${match[6]}`
        };
      }
      if (match[1] && match[2] && match[3] && !match[4]) {
        // Formato dd de mês de aaaa (apenas início)
        return {
          startDate: `${match[1]} de ${match[2]} de ${match[3]}`,
          endDate: 'NÃO IDENTIFICADO'
        };
      }
      if (match[1] && !isNaN(Number(match[1]))) {
        // Prazo em meses
        const months = Number(match[1]);
        return {
          startDate: 'NÃO IDENTIFICADO',
          endDate: `${months} meses (a partir da data de assinatura)`
        };
      }
    }
  }

  return {
    startDate: 'NÃO IDENTIFICADO',
    endDate: 'NÃO IDENTIFICADO'
  };
}

/**
 * Infere dados comuns/sensíveis baseado no tipo de contrato
 */
function inferDataCategories(
  text: string,
  contractType: string
): { commonData: string; sensitiveData: string; commonInferred: boolean; sensitiveInferred: boolean } {
  const textLower = text.toLowerCase();

  let commonData = '';
  let sensitiveData = '';
  let commonInferred = false;
  let sensitiveInferred = false;

  // Procurar por dados explícitos no texto
  const dataSignals = {
    identificadores: /(?:id|identificador|login|email|cpf|cnpj|rg|passport|usuario|usuário)/i,
    dispositivos: /(?:hostname|device|deviceid|mac\s+address|imei|serial)/i,
    rede: /(?:ip\s+address|ip|ipv4|ipv6|porta|port)/i,
    logs: /(?:log|auditoria|audit|timestamp|evento|event)/i,
    biometrico: /(?:biométrico|biometrico|fingerprint|face|facial|iris)/i,
    saude: /(?:saúde|saude|médico|medico|diagnóstico|diagnostico|doença|doenca|medicamento|prescription)/i,
    educacao: /(?:educação|educacao|aluno|student|grade|nota|disciplina)/i,
    financeiro: /(?:financeiro|banco|conta|cartão|cartao|salário|salario|renda)/i,
  };

  // Verificar sinais no texto
  const hasIdentificadores = dataSignals.identificadores.test(textLower);
  const hasDispositivos = dataSignals.dispositivos.test(textLower);
  const hasRede = dataSignals.rede.test(textLower);
  const hasLogs = dataSignals.logs.test(textLower);
  const hasBiometrico = dataSignals.biometrico.test(textLower);
  const hasSaude = dataSignals.saude.test(textLower);
  const hasEducacao = dataSignals.educacao.test(textLower);
  const hasFinanceiro = dataSignals.financeiro.test(textLower);

  // Montar lista de dados comuns
  const commonDataList = [];
  if (hasIdentificadores) commonDataList.push('identificadores de usuário (ID, login, e-mail)');
  if (hasDispositivos) commonDataList.push('identificadores de dispositivo (hostname, deviceId)');
  if (hasRede) commonDataList.push('IP, portas, logs de acesso');
  if (hasLogs) commonDataList.push('telemetria, eventos de segurança, timestamps');

  // Tipo de contrato pode implicar dados
  const contractTypeLower = (contractType || '').toLowerCase();
  if (contractTypeLower.includes('saas') || contractTypeLower.includes('software')) {
    if (!commonDataList.includes('identificadores de usuário (ID, login, e-mail)')) {
      commonDataList.push('identificadores de usuário (ID, login, e-mail corporativo)');
      commonInferred = true;
    }
    if (!commonDataList.includes('IP, portas, logs de acesso')) {
      commonDataList.push('IP, logs de acesso, telemetria');
      commonInferred = true;
    }
  }

  if (contractTypeLower.includes('antivírus') || contractTypeLower.includes('segurança')) {
    if (!commonDataList.includes('telemetria, eventos de segurança, timestamps')) {
      commonDataList.push('eventos de segurança, hashes, metadados');
      commonInferred = true;
    }
  }

  commonData = commonDataList.length > 0
    ? commonDataList.join('; ')
    : 'NÃO IDENTIFICADO (sem sinais no texto)';

  // Montar lista de dados sensíveis
  const sensitiveDataList = [];
  if (hasBiometrico) sensitiveDataList.push('dados biométricos');
  if (hasSaude) sensitiveDataList.push('dados de saúde');
  if (hasEducacao) sensitiveDataList.push('dados educacionais');
  if (hasFinanceiro) sensitiveDataList.push('dados financeiros');

  sensitiveData = sensitiveDataList.length > 0
    ? sensitiveDataList.join('; ')
    : 'NÃO IDENTIFICADO';

  return { commonData, sensitiveData, commonDataInferred: commonInferred, sensitiveDataInferred: sensitiveInferred };
}

/**
 * Aplica autopreenchimento ao mapa
 */
export function autoFillAnalysisMap(input: AutoFillMapInput): AutoFilledMap {
  const text = (input.contractText || input.extractedText || '').substring(0, 50000); // Limitar tamanho
  const contractType = input.contractType || 'Indefinido';
  const partnerName = input.partnerName || 'Parceiro';

  // Extrair papel LGPD
  const { agentType, justification } = extractLgpdAgentType(text, contractType, partnerName);

  // Extrair vigência
  const { startDate, endDate } = extractVigencia(text);

  // Inferir dados
  const { commonData, sensitiveData, commonInferred, sensitiveInferred } = inferDataCategories(text, contractType);

  return {
    lgpdAgentType: agentType,
    agentTypeJustification: justification,
    startDate,
    endDate,
    commonData,
    sensitiveData,
    commonDataInferred: commonInferred,
    sensitiveDataInferred: sensitiveInferred
  };
}
