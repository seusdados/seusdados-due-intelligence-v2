/**
 * Premium ROPA/ROT snapshot builder.
 * Objetivo:
 * - Guardar um JSON estruturado (ropaData) ligado ao processo
 * - Gerar Markdown "auditável" para GED
 * - Calcular completude e sugerir evidências mínimas
 * - Definir heurística para disparo automático de RIPD/DPIA
 */

export type DataCategory = { name: string; sensivel?: boolean };

export type OperatorRecord = {
  name: string;
  serviceType?: string; // ex.: SaaS, Contabilidade, Callcenter
  role?: "operador" | "controlador_conjunto" | "destinatario" | "suboperador" | "outro";
  dataShared?: string[];
  country?: string;
  hasContract?: boolean;
  hasDpa?: boolean;
  hasSecurityAnnex?: boolean;
  notes?: string;
};

export type RopaData = {
  collectionSources?: string[];
  collectionChannels?: string[];
  systemsUsed?: string[];
  operators?: OperatorRecord[];
  accessProfiles?: string[];
  logsAndTraceability?: string;
  disposalCriteria?: string;
  volumeFrequency?: string;
  additionalNotes?: string;
  // flags extras
  childrenOrTeens?: boolean;
  systematicMonitoring?: boolean;
  largeScale?: boolean;
};

export type RopaSnapshot = {
  version: "premium-v1";
  processTitle: string;
  areaName?: string;
  purpose?: string;
  legalBase?: string;
  dataSubjects?: string[];
  dataCategories?: DataCategory[];
  retentionPeriod?: string;
  storageLocation?: string;
  securityMeasures?: string[];
  internationalTransfer?: boolean;
  internationalCountries?: string[];
  sharing?: string[];
  riskLevel?: string;
  riskScore?: number;
  ropaData?: RopaData;
};

export function computeRopaCompleteness(s: RopaSnapshot) {
  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];

  if (!s.processTitle) missingRequired.push("processTitle");
  if (!s.legalBase) missingRequired.push("legalBase");
  if (!s.dataSubjects?.length) missingRequired.push("dataSubjects");
  if (!s.dataCategories?.length) missingRequired.push("dataCategories");
  if (!s.retentionPeriod) missingRequired.push("retentionPeriod");
  if (!s.storageLocation) missingRequired.push("storageLocation");
  if (!s.securityMeasures?.length) missingRequired.push("securityMeasures");

  if (!s.ropaData?.collectionChannels?.length) missingRecommended.push("collectionChannels");
  if (!s.ropaData?.systemsUsed?.length) missingRecommended.push("systemsUsed");
  if (!s.ropaData?.accessProfiles?.length) missingRecommended.push("accessProfiles");
  if (!s.ropaData?.logsAndTraceability) missingRecommended.push("logsAndTraceability");
  if (!s.ropaData?.disposalCriteria) missingRecommended.push("disposalCriteria");

  const total = missingRequired.length + missingRecommended.length;
  const base = 12;
  const percent = Math.max(0, Math.min(1, (base - total) / base));

  return {
    percent,
    missingRequired,
    missingRecommended,
    canTriggerRipd: missingRequired.length === 0,
  };
}

export function shouldTriggerRipd(s: RopaSnapshot) {
  const hasSensitive = (s.dataCategories || []).some((d) => !!d?.sensivel);
  const hasSharing = (s.sharing || []).length > 0 || (s.ropaData?.operators || []).length > 0;
  const hasIntl = !!s.internationalTransfer;
  const flags = s.ropaData || {};

  const highRisk = ["alta", "extrema", "critico", "crítico", "alto"].includes(String(s.riskLevel || "").toLowerCase());
  const children = !!flags.childrenOrTeens;
  const monitoring = !!flags.systematicMonitoring;
  const largeScale = !!flags.largeScale;

  return highRisk || hasSensitive || hasSharing || hasIntl || children || monitoring || largeScale;
}

export function suggestEvidence(s: RopaSnapshot) {
  const items: { title: string; reason: string }[] = [];
  items.push({ title: "ROT/ROPA gerado", reason: "Registro formal do tratamento." });

  if (s.legalBase) items.push({ title: "Evidência de base legal", reason: "Contrato, obrigação legal/regulatória, LI, consentimento etc." });
  if ((s.ropaData?.operators || []).length) items.push({ title: "Contratos/DPA com operadores", reason: "Quando há terceiros tratando dados." });
  if (s.internationalTransfer) items.push({ title: "Garantias transferência internacional", reason: "Cláusulas/garantias aplicáveis, fornecedor, países." });
  if (s.ropaData?.logsAndTraceability) items.push({ title: "Provas de logs/rastreabilidade", reason: "Print/relatório/SIEM, retenção de logs." });
  if (s.securityMeasures?.length) items.push({ title: "Controles de segurança", reason: "RBAC, MFA, criptografia, backup etc." });
  if (s.retentionPeriod) items.push({ title: "Política/tabela de retenção", reason: "Justificativa e prazo por norma/contrato." });
  if (s.ropaData?.disposalCriteria) items.push({ title: "Procedimento de descarte", reason: "Eliminação/anonimização ao final." });

  return items;
}

function fmtList(v?: any[]) {
  if (!v || v.length === 0) return "\u2014";
  return v.map((x) => String(x)).join(", ");
}

function fmtDataCats(v?: DataCategory[]) {
  if (!v || v.length === 0) return "\u2014";
  const comuns: string[] = [];
  const sens: string[] = [];
  for (const c of v) {
    if (!c?.name) continue;
    if (c.sensivel) sens.push(c.name);
    else comuns.push(c.name);
  }
  return [
    `- Dados comuns: ${comuns.length ? comuns.join(", ") : "\u2014"}`,
    `- Dados sensíveis: ${sens.length ? sens.join(", ") : "\u2014"}`,
  ].join("\n");
}

function fmtOperators(v?: OperatorRecord[]) {
  if (!v || v.length === 0) return "\u2014";
  return v
    .map((o) => {
      const lines = [
        `- **${o.name}** (${o.role || "operador"})`,
        `  - Serviço: ${o.serviceType || "\u2014"}`,
        `  - Dados compartilhados: ${fmtList(o.dataShared || [])}`,
        `  - País: ${o.country || "\u2014"}`,
        `  - Contrato: ${o.hasContract ? "Sim" : "Não/Não sei"}`,
        `  - DPA/Aditivo LGPD: ${o.hasDpa ? "Sim" : "Não/Não sei"}`,
        `  - Anexo de Segurança/SLA: ${o.hasSecurityAnnex ? "Sim" : "Não/Não sei"}`,
        `  - Observações: ${o.notes || "\u2014"}`,
      ];
      return lines.join("\n");
    })
    .join("\n");
}

export function generateRopaMarkdown(s: RopaSnapshot) {
  const c = computeRopaCompleteness(s);
  const ev = suggestEvidence(s);

  return `# ROPA \u2014 Registro de Operações de Tratamento (Premium)

**Processo:** ${s.processTitle}
**Área:** ${s.areaName || "\u2014"}
**Gerado em:** ${new Date().toISOString()}

---

## 1. Finalidade
${s.purpose || "\u2014"}

## 2. Base Legal
${s.legalBase || "\u2014"}

## 3. Titulares
${fmtList(s.dataSubjects)}

## 4. Categorias de Dados
${fmtDataCats(s.dataCategories)}

## 5. Fontes de Coleta
${fmtList(s.ropaData?.collectionSources)}

## 6. Canais de Coleta
${fmtList(s.ropaData?.collectionChannels)}

## 7. Sistemas Utilizados
${fmtList(s.ropaData?.systemsUsed)}

## 8. Perfis de Acesso
${fmtList(s.ropaData?.accessProfiles)}

## 9. Operadores / Terceiros
${fmtOperators(s.ropaData?.operators)}

## 10. Compartilhamento
${fmtList(s.sharing)}

## 11. Transferência Internacional
${s.internationalTransfer ? `Sim \u2014 Países: ${fmtList(s.internationalCountries)}` : "Não"}

## 12. Retenção
- Período: ${s.retentionPeriod || "\u2014"}
- Local: ${s.storageLocation || "\u2014"}
- Critério de descarte: ${s.ropaData?.disposalCriteria || "\u2014"}

## 13. Medidas de Segurança
${fmtList(s.securityMeasures)}

## 14. Logs e Rastreabilidade
${s.ropaData?.logsAndTraceability || "\u2014"}

## 15. Volume / Frequência
${s.ropaData?.volumeFrequency || "\u2014"}

## 16. Flags Especiais
- Crianças/Adolescentes: ${s.ropaData?.childrenOrTeens ? "Sim" : "Não"}
- Monitoramento Sistemático: ${s.ropaData?.systematicMonitoring ? "Sim" : "Não"}
- Larga Escala: ${s.ropaData?.largeScale ? "Sim" : "Não"}

## 17. Risco
- Nível: ${s.riskLevel || "\u2014"}
- Score: ${s.riskScore ?? "\u2014"}

## 18. Completude
- Percentual: ${(c.percent * 100).toFixed(0)}%
- Campos obrigatórios faltantes: ${c.missingRequired.length ? c.missingRequired.join(", ") : "nenhum"}
- Campos recomendados faltantes: ${c.missingRecommended.length ? c.missingRecommended.join(", ") : "nenhum"}

## 19. Evidências Sugeridas
${ev.map((e) => `- **${e.title}**: ${e.reason}`).join("\n")}

## 20. Necessidade de RIPD/DPIA
${shouldTriggerRipd(s) ? "**SIM** \u2014 Este tratamento requer Relatório de Impacto à Proteção de Dados Pessoais." : "Não identificada necessidade automática."}

---

*Documento gerado automaticamente pelo Sistema Seusdados Due Diligence \u2014 versão premium-v1*
`;
}
