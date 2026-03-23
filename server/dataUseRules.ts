/**
 * Rules engine determinístico (auditável) para sugerir base legal + acender risk signals.
 * R1..R7 conforme sua estratégia.
 */

export type RiskSignals = {
  sensitive?: boolean;
  children?: boolean;
  biometric?: boolean;
  health?: boolean;
  largeScale?: boolean;
  monitoring?: boolean;
  automatedDecision?: boolean;
  internationalTransfer?: boolean;
  broadSharing?: boolean;
};

export type LegalBasisSuggestion = {
  code: string;         // ex.: obrigacao_legal, execucao_contrato, legitimo_interesse, consentimento...
  rationale: string;    // "por quê"
  confidence: number;   // 0..1
  ruleId: string;       // R1..R7
};

export type DataUse = {
  subjectGroup: string;
  dataElement: string;
  purposes: string[];        // FIN-xx
  operations: string[];      // ex.: coleta, registro...
  systems: string[];
  channels: string[];
  recipients: string[];
  retentionPeriod?: string | null;
  necessity?: { required?: boolean; lessInvasiveAlt?: boolean; legalOrContractual?: boolean };
  riskSignals?: RiskSignals;
  legalBasisSuggested?: LegalBasisSuggestion | null;
  legalBasisValidated?: { code: string; justification?: string | null } | null;
};

function hasAny(text: string, keys: string[]) {
  const t = (text || "").toLowerCase();
  return keys.some(k => t.includes(k));
}

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

export function inferRiskSignals(input: {
  subjectGroup: string;
  dataElement: string;
  purposes: string[];
  internationalTransfer?: boolean;
  operatorsCount?: number;
  volumeFrequency?: string;
  monitoring?: boolean;
}): RiskSignals {
  const subject = normalize(input.subjectGroup);
  const data = normalize(input.dataElement);
  const purposes = input.purposes || [];

  const signals: RiskSignals = {};

  // R6 sensível
  if (hasAny(data, ["saúde","saude","biometr","relig","polít","polit","genét","genet","orientação","orientacao","sindical","racial"])) {
    signals.sensitive = true;
    if (hasAny(data, ["biometr"])) signals.biometric = true;
    if (hasAny(data, ["saúde","saude"])) signals.health = true;
  }

  // R7 crianças
  if (hasAny(subject, ["criança","crianca","adolesc","menor"])) {
    signals.children = true;
  }

  // transferência internacional
  if (input.internationalTransfer) signals.internationalTransfer = true;

  // compartilhamento amplo
  if ((input.operatorsCount || 0) >= 2) signals.broadSharing = true;

  // grande escala heurística
  if (hasAny(normalize(input.volumeFrequency || ""), ["mil","milh","grande escala","alto volume","diário","diario"])) {
    signals.largeScale = true;
  }

  if (input.monitoring) signals.monitoring = true;

  // decisões automatizadas (heurística por finalidade)
  if (purposes.includes("FIN-05") && hasAny(data, ["score","perfil","perfilhamento"])) {
    signals.automatedDecision = true;
  }

  return signals;
}

export function suggestLegalBasis(use: DataUse): LegalBasisSuggestion {
  const subject = normalize(use.subjectGroup);
  const data = normalize(use.dataElement);
  const purposes = use.purposes || [];

  // R1: fiscal/contábil
  if (purposes.includes("FIN-04") || hasAny(data, ["nf","nota fiscal","sped","fiscal","contáb","contab"])) {
    return { code: "obrigacao_legal", rationale: "R1: finalidade fiscal/contábil/regulatória.", confidence: 0.92, ruleId: "R1" };
  }

  // R3: RH obrigatório / saúde ocupacional
  if (hasAny(subject, ["colaborador","funcion","empregado","rh"]) && (purposes.includes("FIN-09") || purposes.includes("FIN-07"))) {
    if (purposes.includes("FIN-07") || hasAny(data, ["saúde","saude"])) {
      return { code: "tutela_saude", rationale: "R3: saúde ocupacional/medicina do trabalho (sensível).", confidence: 0.9, ruleId: "R3" };
    }
    return { code: "obrigacao_legal", rationale: "R3: obrigações trabalhistas/RH.", confidence: 0.85, ruleId: "R3" };
  }

  // R2: execução do contrato
  if (purposes.includes("FIN-02") || purposes.includes("FIN-08")) {
    return { code: "execucao_contrato", rationale: "R2: necessário para execução do contrato/atendimento.", confidence: 0.82, ruleId: "R2" };
  }

  // R4: marketing
  if (purposes.includes("FIN-06")) {
    return { code: "consentimento", rationale: "R4: marketing/comunicação → preferir consentimento (ajustável).", confidence: 0.78, ruleId: "R4" };
  }

  // R5: antifraude/segurança
  if (purposes.includes("FIN-05")) {
    return { code: "legitimo_interesse", rationale: "R5: segurança/antifraude → legítimo interesse (com mitigação).", confidence: 0.76, ruleId: "R5" };
  }

  // fallback: legítimo interesse com baixa confiança
  return { code: "legitimo_interesse", rationale: "Fallback: sugerido por ausência de regra específica — validar.", confidence: 0.55, ruleId: "RF" };
}

export function buildDataUses(args: {
  subjectGroups: string[];
  dataElements: Array<{ name: string; sensivel?: boolean }>;
  purposeByDataElement: Record<string, string[]>; // dataElement -> FIN-xx[]
  operationsByDataElement?: Record<string, string[]>;
  systems?: string[];
  channels?: string[];
  recipients?: string[];
  internationalTransfer?: boolean;
  operatorsCount?: number;
  volumeFrequency?: string;
  monitoring?: boolean;
}): DataUse[] {
  const uses: DataUse[] = [];
  for (const sg of args.subjectGroups || []) {
    for (const de of args.dataElements || []) {
      const name = de?.name;
      if (!name) continue;
      const purposes = args.purposeByDataElement?.[name] || [];
      if (!purposes.length) continue;

      const u: DataUse = {
        subjectGroup: sg,
        dataElement: name,
        purposes,
        operations: args.operationsByDataElement?.[name] || [],
        systems: args.systems || [],
        channels: args.channels || [],
        recipients: args.recipients || [],
      };

      u.riskSignals = inferRiskSignals({
        subjectGroup: sg,
        dataElement: name,
        purposes,
        internationalTransfer: !!args.internationalTransfer,
        operatorsCount: args.operatorsCount || 0,
        volumeFrequency: args.volumeFrequency,
        monitoring: !!args.monitoring,
      });
      u.legalBasisSuggested = suggestLegalBasis(u);
      uses.push(u);
    }
  }
  return uses;
}
