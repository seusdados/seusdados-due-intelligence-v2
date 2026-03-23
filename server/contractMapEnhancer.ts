/**
 * contractMapEnhancer.ts
 * 
 * Melhorias automáticas no Mapa de Análise:
 * - Papel LGPD: determinação automática com base na árvore Seusdados
 * - Vigência: extração de datas via regex
 * - Dados Pessoais: classificação como Expressamente previstos / Implícitos / Inferência
 * - Nunca retornar null em campos do mapa
 */

import { logger } from "./_core/logger";

// ==================== ÁRVORE DE DECISÃO LGPD ====================

interface LgpdRoleRule {
  keywords: RegExp;
  role: string;
  confidence: "alta" | "media" | "baixa";
  explanation: string;
}

const LGPD_ROLE_RULES: LgpdRoleRule[] = [
  // Operador: presta serviço sob instruções do controlador
  {
    keywords: /presta[çc][ãa]o.*servi[çc]o|terceiriz|outsourc|processamento.*dados|armazenamento.*dados|hospedagem|cloud|nuvem|saas|iaas|paas|backup|suporte.*t[ée]cnico|manuten[çc][ãa]o.*sistema|desenvolvimento.*software|consultoria.*ti|data.*center/i,
    role: "Operador",
    confidence: "alta",
    explanation: "O contratado processa dados pessoais sob instruções do contratante"
  },
  // Suboperador: subcontratado pelo operador
  {
    keywords: /subcontrat|sub.?operador|sub.?processador|terceiro.*contratado.*pelo.*operador/i,
    role: "Suboperador",
    confidence: "alta",
    explanation: "Subcontratado pelo operador para processar dados"
  },
  // Controlador conjunto: ambas as partes definem finalidade
  {
    keywords: /parceria|joint.*venture|cons[óo]rcio|coopera[çc][ãa]o.*t[ée]cnica|acordo.*coopera[çc][ãa]o|compartilhamento.*m[úu]tuo/i,
    role: "Controlador Conjunto",
    confidence: "media",
    explanation: "Ambas as partes podem definir finalidades e meios de tratamento"
  },
  // Controlador: define finalidade e meios
  {
    keywords: /compra.*venda|fornecimento.*produto|licenciamento|franquia|distribui[çc][ãa]o|representa[çc][ãa]o.*comercial|corretagem|intermedia[çc][ãa]o/i,
    role: "Controlador",
    confidence: "media",
    explanation: "A contraparte define finalidades próprias para tratamento de dados"
  },
];

/**
 * Determina automaticamente o papel LGPD com base no objeto contratual.
 * Nunca retorna vazio.
 */
export function determineLgpdRole(contractObject: string | null, contractType: string | null): {
  role: string;
  confidence: "alta" | "media" | "baixa";
  explanation: string;
  searchProof: string;
} {
  const text = `${contractObject || ""} ${contractType || ""}`.toLowerCase();

  for (const rule of LGPD_ROLE_RULES) {
    if (rule.keywords.test(text)) {
      return {
        role: rule.role,
        confidence: rule.confidence,
        explanation: rule.explanation,
        searchProof: `Palavras-chave identificadas no objeto contratual que indicam papel de ${rule.role}`,
      };
    }
  }

  // Fallback: nunca retornar vazio
  return {
    role: "Operador (presunção)",
    confidence: "baixa",
    explanation: "Não foi possível determinar com certeza. Presume-se Operador por ser o papel mais comum em contratos de prestação de serviço. Recomenda-se revisão manual.",
    searchProof: "Nenhuma palavra-chave específica encontrada no objeto contratual. Aplicada presunção padrão.",
  };
}

// ==================== EXTRAÇÃO DE VIGÊNCIA ====================

interface DateExtraction {
  startDate: string | null;
  endDate: string | null;
  duration: string | null;
  autoRenewal: boolean;
  searchProof: string;
}

const DATE_PATTERNS = [
  // dd/mm/yyyy ou dd-mm-yyyy
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
  // dd de mês de yyyy
  /(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/gi,
  // mês/yyyy
  /(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/gi,
];

const DURATION_PATTERNS = [
  /vig[êe]ncia.*?(\d+)\s*(meses?|anos?|dias?)/i,
  /prazo.*?(\d+)\s*(meses?|anos?|dias?)/i,
  /dura[çc][ãa]o.*?(\d+)\s*(meses?|anos?|dias?)/i,
  /per[ií]odo.*?(\d+)\s*(meses?|anos?|dias?)/i,
];

const AUTO_RENEWAL_PATTERNS = [
  /renova[çc][ãa]o.*autom[áa]tica/i,
  /prorrog.*autom[áa]tic/i,
  /renov.*sucessiv/i,
  /prorroga.*por.*igual.*per[ií]odo/i,
];

const MONTH_MAP: Record<string, string> = {
  "janeiro": "01", "fevereiro": "02", "março": "03", "marco": "03",
  "abril": "04", "maio": "05", "junho": "06",
  "julho": "07", "agosto": "08", "setembro": "09",
  "outubro": "10", "novembro": "11", "dezembro": "12",
};

/**
 * Extrai datas de vigência do texto contratual via regex.
 * Se não identificar, marca como NÃO IDENTIFICADO + prova de busca.
 */
export function extractContractDates(contractText: string | null): DateExtraction {
  if (!contractText) {
    return {
      startDate: null,
      endDate: null,
      duration: null,
      autoRenewal: false,
      searchProof: "Texto contratual não disponível para extração de datas.",
    };
  }

  const text = contractText;
  const foundDates: string[] = [];
  const proofParts: string[] = [];

  // Extrair datas no formato dd/mm/yyyy
  const dateRegex1 = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
  let match;
  while ((match = dateRegex1.exec(text)) !== null) {
    foundDates.push(`${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${match[3]}`);
    proofParts.push(`Data encontrada: ${match[0]} (posição ${match.index})`);
  }

  // Extrair datas no formato "dd de mês de yyyy"
  const dateRegex2 = /(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/gi;
  while ((match = dateRegex2.exec(text)) !== null) {
    const month = MONTH_MAP[match[2].toLowerCase()] || "01";
    foundDates.push(`${match[1].padStart(2, "0")}/${month}/${match[3]}`);
    proofParts.push(`Data encontrada: ${match[0]} (posição ${match.index})`);
  }

  // Extrair duração
  let duration: string | null = null;
  for (const pattern of DURATION_PATTERNS) {
    const dMatch = pattern.exec(text);
    if (dMatch) {
      duration = `${dMatch[1]} ${dMatch[2]}`;
      proofParts.push(`Duração encontrada: ${dMatch[0]}`);
      break;
    }
  }

  // Verificar renovação automática
  const autoRenewal = AUTO_RENEWAL_PATTERNS.some(p => p.test(text));
  if (autoRenewal) {
    proofParts.push("Cláusula de renovação automática identificada");
  }

  // Determinar início e fim
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (foundDates.length >= 2) {
    startDate = foundDates[0];
    endDate = foundDates[foundDates.length - 1];
  } else if (foundDates.length === 1) {
    startDate = foundDates[0];
  }

  if (!startDate && !endDate && !duration) {
    proofParts.push("BUSCA REALIZADA: Padrões de data (dd/mm/aaaa, dd de mês de aaaa), duração (vigência de X meses/anos) e renovação automática. RESULTADO: Nenhuma data ou prazo identificado no texto.");
  }

  return {
    startDate,
    endDate,
    duration,
    autoRenewal,
    searchProof: proofParts.length > 0 ? proofParts.join(". ") : "Nenhuma informação de vigência encontrada no texto contratual.",
  };
}

// ==================== CLASSIFICAÇÃO DE DADOS PESSOAIS ====================

interface PersonalDataClassification {
  category: string;
  examples: string[];
  classification: "expressamente_previsto" | "implicito_pelo_objeto" | "inferencia";
  explanation: string;
}

const EXPLICIT_DATA_PATTERNS: Array<{ pattern: RegExp; category: string; examples: string[] }> = [
  { pattern: /nome.*completo|nome.*titular|identifica[çc][ãa]o.*pessoal/i, category: "Dados de Identificação", examples: ["Nome completo", "Documento de identidade"] },
  { pattern: /cpf|cnpj|rg|identidade|passaporte/i, category: "Documentos", examples: ["CPF", "CNPJ", "RG"] },
  { pattern: /endere[çc]o|cep|logradouro|bairro|cidade|estado|pa[ií]s/i, category: "Dados de Endereço", examples: ["Endereço completo", "CEP", "Cidade"] },
  { pattern: /e-?mail|correio.*eletr[ôo]nico/i, category: "Dados de Contato", examples: ["E-mail"] },
  { pattern: /telefone|celular|whatsapp/i, category: "Dados de Contato", examples: ["Telefone", "Celular"] },
  { pattern: /dados.*banc[áa]rios|conta.*banc[áa]ria|ag[êe]ncia|pix/i, category: "Dados Financeiros", examples: ["Conta bancária", "Agência", "Chave PIX"] },
  { pattern: /sa[úu]de|m[ée]dico|cl[ií]nico|diagn[óo]stico|exame|prontu[áa]rio/i, category: "Dados Sensíveis de Saúde", examples: ["Dados médicos", "Diagnósticos"] },
  { pattern: /biom[ée]tric|digital|facial|[ií]ris|reconhecimento/i, category: "Dados Biométricos", examples: ["Biometria", "Reconhecimento facial"] },
  { pattern: /crian[çc]a|adolescente|menor|idade/i, category: "Dados de Menores", examples: ["Dados de crianças e adolescentes"] },
  { pattern: /geolocaliza[çc][ãa]o|gps|localiza[çc][ãa]o/i, category: "Dados de Geolocalização", examples: ["Geolocalização", "GPS"] },
  { pattern: /ip|cookie|navega[çc][ãa]o|log.*acesso/i, category: "Dados de Navegação", examples: ["Endereço IP", "Cookies", "Logs de acesso"] },
];

const IMPLICIT_DATA_BY_CONTRACT_TYPE: Record<string, PersonalDataClassification[]> = {
  "prestacao_servico": [
    { category: "Dados de Identificação", examples: ["Nome", "CPF"], classification: "implicito_pelo_objeto", explanation: "Prestação de serviço requer identificação das partes" },
    { category: "Dados de Contato", examples: ["E-mail", "Telefone"], classification: "implicito_pelo_objeto", explanation: "Comunicação entre as partes requer dados de contato" },
  ],
  "saas": [
    { category: "Dados de Acesso", examples: ["Login", "Senha", "IP"], classification: "implicito_pelo_objeto", explanation: "Plataforma SaaS coleta dados de acesso dos usuários" },
    { category: "Dados de Uso", examples: ["Logs de atividade", "Preferências"], classification: "implicito_pelo_objeto", explanation: "Plataforma registra uso para funcionamento" },
  ],
  "recursos_humanos": [
    { category: "Dados Trabalhistas", examples: ["CTPS", "PIS/PASEP", "Salário"], classification: "implicito_pelo_objeto", explanation: "Gestão de RH requer dados trabalhistas" },
    { category: "Dados de Saúde", examples: ["Atestados", "Exames admissionais"], classification: "implicito_pelo_objeto", explanation: "Obrigações trabalhistas exigem dados de saúde" },
  ],
};

/**
 * Classifica dados pessoais encontrados no contrato.
 * Retorna lista de dados classificados como Expressamente previstos, Implícitos ou Inferência.
 */
export function classifyPersonalData(
  contractText: string | null,
  contractObject: string | null,
  contractType: string | null,
  commonData: string | null,
  sensitiveData: string | null
): PersonalDataClassification[] {
  const results: PersonalDataClassification[] = [];
  const fullText = `${contractText || ""} ${contractObject || ""} ${commonData || ""} ${sensitiveData || ""}`;

  // 1. Dados expressamente previstos (mencionados no texto)
  for (const pattern of EXPLICIT_DATA_PATTERNS) {
    if (pattern.pattern.test(fullText)) {
      results.push({
        category: pattern.category,
        examples: pattern.examples,
        classification: "expressamente_previsto",
        explanation: `Mencionado expressamente no texto contratual`,
      });
    }
  }

  // 2. Dados implícitos pelo objeto contratual
  const type = (contractType || "").toLowerCase();
  let implicitKey = "prestacao_servico"; // default
  if (type.includes("saas") || type.includes("software") || type.includes("plataforma")) {
    implicitKey = "saas";
  } else if (type.includes("rh") || type.includes("recurso") || type.includes("trabalh")) {
    implicitKey = "recursos_humanos";
  }

  const implicitData = IMPLICIT_DATA_BY_CONTRACT_TYPE[implicitKey] || [];
  for (const data of implicitData) {
    // Não duplicar se já foi encontrado como expresso
    if (!results.some(r => r.category === data.category)) {
      results.push(data);
    }
  }

  // 3. Inferências baseadas no objeto contratual
  const object = (contractObject || "").toLowerCase();
  if (object.includes("marketing") || object.includes("publicidade") || object.includes("campanha")) {
    if (!results.some(r => r.category === "Dados de Perfil")) {
      results.push({
        category: "Dados de Perfil",
        examples: ["Preferências", "Histórico de compras", "Segmentação"],
        classification: "inferencia",
        explanation: "Atividades de marketing tipicamente envolvem dados de perfil e segmentação",
      });
    }
  }
  if (object.includes("entrega") || object.includes("log[ií]stica") || object.includes("transporte")) {
    if (!results.some(r => r.category === "Dados de Endereço")) {
      results.push({
        category: "Dados de Endereço",
        examples: ["Endereço de entrega", "CEP"],
        classification: "inferencia",
        explanation: "Serviços de logística requerem dados de endereço para entrega",
      });
    }
  }

  // Se nenhum dado foi encontrado, retornar inferência mínima
  if (results.length === 0) {
    results.push({
      category: "Dados de Identificação",
      examples: ["Nome", "CPF/CNPJ"],
      classification: "inferencia",
      explanation: "Todo contrato envolve, no mínimo, dados de identificação das partes",
    });
    results.push({
      category: "Dados de Contato",
      examples: ["E-mail", "Telefone"],
      classification: "inferencia",
      explanation: "Comunicação contratual requer dados de contato",
    });
  }

  return results;
}

// ==================== SANITIZAÇÃO DO MAPA ====================

/**
 * Garante que nenhum campo do mapa retorne null.
 * Substitui null por valores padrão descritivos.
 */
export function sanitizeMapFields(mapData: Record<string, any>): Record<string, any> {
  const defaults: Record<string, string> = {
    contractType: "NÃO IDENTIFICADO — Tipo contratual não especificado no documento",
    partnerName: "NÃO IDENTIFICADO — Nome da contraparte não encontrado",
    agentType: "NÃO IDENTIFICADO — Papel LGPD não determinado",
    startDate: "NÃO IDENTIFICADO — Data de início não encontrada no documento",
    endDate: "NÃO IDENTIFICADO — Data de término não encontrada no documento",
    contractObject: "NÃO IDENTIFICADO — Objeto contratual não especificado",
    commonData: "NÃO IDENTIFICADO — Dados pessoais comuns não identificados",
    sensitiveData: "Nenhum dado sensível identificado",
    titularRightsStatus: "NÃO IDENTIFICADO — Cláusula de direitos do titular não encontrada",
    titularRightsDetails: "NÃO IDENTIFICADO — Detalhes sobre direitos do titular não encontrados",
    dataEliminationStatus: "NÃO IDENTIFICADO — Cláusula de eliminação de dados não encontrada",
    dataEliminationDetails: "NÃO IDENTIFICADO — Detalhes sobre eliminação de dados não encontrados",
    incidentNotification: "NÃO IDENTIFICADO — Cláusula de notificação de incidentes não encontrada",
    securityMeasures: "NÃO IDENTIFICADO — Medidas de segurança não especificadas",
    internationalTransfer: "NÃO IDENTIFICADO — Cláusula de transferência internacional não encontrada",
    subprocessors: "NÃO IDENTIFICADO — Cláusula sobre suboperadores não encontrada",
    dpoContact: "NÃO IDENTIFICADO — Contato do encarregado não especificado",
    legalBasis: "NÃO IDENTIFICADO — Base legal não especificada",
    dataRetention: "NÃO IDENTIFICADO — Prazo de retenção não especificado",
  };

  const sanitized: Record<string, any> = { ...mapData };

  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (sanitized[key] === null || sanitized[key] === undefined || sanitized[key] === "") {
      sanitized[key] = defaultValue;
    }
  }

  // Garantir que nenhum outro campo seja null
  for (const [key, value] of Object.entries(sanitized)) {
    if (value === null || value === undefined) {
      sanitized[key] = "NÃO IDENTIFICADO";
    }
  }

  return sanitized;
}

/**
 * Aplica todas as melhorias automáticas ao mapa de análise.
 */
export function enhanceAnalysisMap(
  mapData: Record<string, any>,
  contractText: string | null
): {
  enhancedMap: Record<string, any>;
  lgpdRole: ReturnType<typeof determineLgpdRole>;
  dateExtraction: DateExtraction;
  personalData: PersonalDataClassification[];
  enhancements: string[];
} {
  const enhancements: string[] = [];

  // 1. Sanitizar campos null
  let enhanced = sanitizeMapFields(mapData);
  enhancements.push("Campos vazios substituídos por valores descritivos");

  // 2. Determinar papel LGPD
  const lgpdRole = determineLgpdRole(enhanced.contractObject, enhanced.contractType);
  if (!enhanced.agentType || enhanced.agentType.includes("NÃO IDENTIFICADO") || enhanced.agentType === "nao_definido") {
    enhanced.agentType = lgpdRole.role.toLowerCase().replace(/\s+/g, "_").replace(/[()]/g, "");
    enhanced.agentTypeExplanation = lgpdRole.explanation;
    enhanced.agentTypeConfidence = lgpdRole.confidence;
    enhanced.agentTypeSearchProof = lgpdRole.searchProof;
    enhancements.push(`Papel LGPD determinado automaticamente: ${lgpdRole.role} (confiança: ${lgpdRole.confidence})`);
  }

  // 3. Extrair vigência
  const dateExtraction = extractContractDates(contractText);
  if (dateExtraction.startDate && (!enhanced.startDate || enhanced.startDate.includes("NÃO IDENTIFICADO"))) {
    enhanced.startDate = dateExtraction.startDate;
    enhancements.push(`Data de início extraída: ${dateExtraction.startDate}`);
  }
  if (dateExtraction.endDate && (!enhanced.endDate || enhanced.endDate.includes("NÃO IDENTIFICADO"))) {
    enhanced.endDate = dateExtraction.endDate;
    enhancements.push(`Data de término extraída: ${dateExtraction.endDate}`);
  }
  if (dateExtraction.duration) {
    enhanced.contractDuration = dateExtraction.duration;
    enhancements.push(`Duração extraída: ${dateExtraction.duration}`);
  }
  if (dateExtraction.autoRenewal) {
    enhanced.autoRenewal = true;
    enhancements.push("Renovação automática identificada");
  }
  enhanced.dateSearchProof = dateExtraction.searchProof;

  // 4. Classificar dados pessoais
  const personalData = classifyPersonalData(
    contractText,
    enhanced.contractObject,
    enhanced.contractType,
    enhanced.commonData,
    enhanced.sensitiveData
  );
  enhanced.personalDataClassification = personalData;
  enhancements.push(`${personalData.length} categorias de dados pessoais classificadas`);

  return {
    enhancedMap: enhanced,
    lgpdRole,
    dateExtraction,
    personalData,
    enhancements,
  };
}
