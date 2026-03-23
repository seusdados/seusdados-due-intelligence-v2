import type { AlertaXAI, ClausulaLGPDExplicavel, AcaoPlanoExplicavel } from "../../shared/xaiTypes";

// Motor XAI (stub plug & play)
// Objetivo: evitar quebra de build. Pode ser substituído pelo motor completo.

type AnalyzeOptions = {
  usuario?: string;
  organizationId?: number;
};

const RULES = {
  policy_set: "Seusdados-XAI-PolicySet-1.0",
  rules: [
    {
      id: "R_INCIDENT_48H",
      categoria: "incidentes",
      gravidade: "alta",
      keywords: ["incidente", "vazamento", "violação", "notificação", "48"],
      titulo: "Notificação de incidente – verificar prazo",
      referencia_legal: "LGPD art. 48; boas práticas ANPD",
      recomendacao: "Incluir obrigação de notificar em até 48 horas da ciência do fato (entre as Partes).",
    },
    {
      id: "R_SECURITY_GENERIC",
      categoria: "seguranca",
      gravidade: "media",
      keywords: ["segurança", "seguranca", "confidencialidade", "criptografia"],
      titulo: "Segurança da informação – verificar concretude",
      referencia_legal: "LGPD art. 46",
      recomendacao: "Especificar medidas mínimas (controle de acesso, logs, criptografia em trânsito, backups, etc.).",
    },
  ],
} as const;

export function getLoadedRules() {
  return RULES;
}

function findSnippets(text: string, kw: string, window = 160): string[] {
  const low = text.toLowerCase();
  const k = kw.toLowerCase();
  const out: string[] = [];
  let idx = 0;
  while (idx >= 0 && out.length < 3) {
    idx = low.indexOf(k, idx);
    if (idx < 0) break;
    const start = Math.max(0, idx - window);
    const end = Math.min(text.length, idx + k.length + window);
    out.push(text.slice(start, end).replace(/\s+/g, " ").trim());
    idx = idx + k.length;
  }
  return out;
}

export async function analyzeContractWithXai(contractText: string, _opts?: AnalyzeOptions): Promise<AlertaXAI[]> {
  const text = contractText || "";
  const low = text.toLowerCase();
  const alertas: AlertaXAI[] = [];

  for (const r of RULES.rules) {
    const hit = r.keywords.some((k) => low.includes(k.toLowerCase()));
    if (!hit) continue;
    const snippets = r.keywords.flatMap((k) => findSnippets(text, k)).slice(0, 5);
    alertas.push({
      id: r.id,
      categoria: r.categoria,
      gravidade: r.gravidade as any,
      titulo: r.titulo,
      descricao: "Sinal de atenção identificado por regra determinística (stub XAI).",
      evidencia: {
        trechos: snippets,
        palavras_chave: [...r.keywords] as string[],
      },
      recomendacao: r.recomendacao,
      referencia_legal: r.referencia_legal,
      confidence: snippets.length ? 70 : 55,
    });
  }

  return alertas;
}

export async function generateClausulaWithXai(input: {
  titulo: string;
  contexto?: Record<string, unknown>;
  alertas?: AlertaXAI[];
}): Promise<ClausulaLGPDExplicavel> {
  return {
    id: input.titulo.replace(/\s+/g, "-").toLowerCase(),
    titulo: input.titulo,
    conteudo:
      `Cláusula sugerida (stub XAI): ${input.titulo}.\n` +
      `Detalhe e ajuste conforme o contexto do contrato e o papel LGPD das Partes.`,
    aplicavel: true,
    explicacao: "Gerada por template determinístico de fallback.",
    fontes: {
      regras: (input.alertas || []).map((a) => a.id).slice(0, 5),
    },
  };
}

export async function generateAcaoPlanoWithXai(input: {
  alertas: AlertaXAI[];
}): Promise<AcaoPlanoExplicavel[]> {
  const plans: AcaoPlanoExplicavel[] = [];
  for (const a of input.alertas.slice(0, 10)) {
    plans.push({
      id: `acao-${a.id}`,
      titulo: `Endereçar: ${a.titulo}`,
      descricao: a.recomendacao || a.descricao,
      prioridade: a.gravidade === "alta" ? "alta" : a.gravidade === "media" ? "media" : "baixa",
      prazo_sugerido_dias: a.gravidade === "alta" ? 30 : a.gravidade === "media" ? 60 : 90,
      justificativa: a.referencia_legal || "Boas práticas de LGPD/ISO.",
      evidencias: a.evidencia?.trechos?.slice(0, 3),
    });
  }
  return plans;
}
