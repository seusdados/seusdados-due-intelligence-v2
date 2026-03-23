import { sql } from "drizzle-orm";
import { getDb } from "./db";
import * as dpiaService from "./dpiaService";
import { rotOperations, mapeamentoResponses, gedDocuments, users, mapeamentoGedDocuments } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

type AnyRow = Record<string, any>;

function asBool(v: any): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return ["1", "true", "sim", "yes", "y"].includes(s);
  }
  return false;
}

function riskLevelToScale(riskLevel?: string): number {
  const s = (riskLevel || "").toLowerCase();
  if (s === "baixa" || s === "baixo") return 2;
  if (s === "media" || s === "média" || s === "moderada" || s === "moderado") return 3;
  if (s === "alta" || s === "alto") return 4;
  if (s === "extrema" || s === "critico" || s === "critica") return 5;
  return 3;
}

async function pickActorUserId(organizationId: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.organizationId, organizationId))
    .limit(20);

  const priority = ["admin_global", "consultor", "sponsor"];
  for (const pr of priority) {
    const found = rows.find(r => r.role === pr);
    if (found?.id) return found.id;
  }
  // fallback seguro
  return rows[0]?.id ?? 1;
}

async function detectRipdEvidenceType(db: any, preferred: string[]): Promise<string> {
  const { rows: r0 } = await db.execute(sql`
    SELECT COLUMN_TYPE as ct
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'ripd_evidences'
      AND column_name = 'evidenceType'
    LIMIT 1
  `);
  const ct = (r0 as AnyRow[])[0]?.ct as string | undefined;
  if (!ct) return preferred[0] || "outro";

  const m = ct.match(/enum\((.*)\)/i);
  if (!m) return preferred[0] || "outro";

  const values = m[1]
    .split(",")
    .map(s => s.trim().replace(/^'/,"").replace(/'$/,""));
  for (const p of preferred) if (values.includes(p)) return p;

  // fallback para algum valor existente
  return values.includes("outro") ? "outro" : values[0] || (preferred[0] || "outro");
}

async function upsertEvidenceLink(db: any, params: {
  organizationId: number;
  ripdId: number;
  questionId: number;
  gedDocumentId: number;
  uploadedByUserId: number;
  evidenceType: string;
  description?: string;
  tags?: any;
}) {
  // evita duplicar
  const { rows: ex0 } = await db.execute(sql`
    SELECT id FROM ripd_evidences
    WHERE "organizationId"=${params.organizationId}
      AND "ripdId"=${params.ripdId}
      AND "questionId"=${params.questionId}
      AND "gedDocumentId"=${params.gedDocumentId}
    LIMIT 1
  `);
  const exists = ((ex0 as AnyRow[])?.length ?? 0) > 0;
  if (exists) return;

  await db.execute(sql`
    INSERT INTO ripd_evidences
      ("ripdId", "organizationId", "questionId", "gedDocumentId", "evidenceType", description, tags, "uploadedByUserId", "createdAt")
    VALUES
      (${params.ripdId}, ${params.organizationId}, ${params.questionId}, ${params.gedDocumentId},
       ${params.evidenceType}, ${params.description ?? null}, ${params.tags ?? null}, ${params.uploadedByUserId}, NOW())
  `);
}

async function recalcEvidenceForQuestion(db: any, dpiaId: number, questionId: number) {
  // busca policy
  const { rows: q0 } = await db.execute(sql`
    SELECT "evidenceRequired" as required, "evidenceMinCount" as minCount
    FROM dpia_questions
    WHERE id=${questionId}
    LIMIT 1
  `);
  const required = Number((q0 as AnyRow[])[0]?.required ?? 0) === 1;
  const minCount = Number((q0 as AnyRow[])[0]?.minCount ?? 0);

  // conta evidências reais
  const { rows: c0 } = await db.execute(sql`
    SELECT COUNT(*) as c
    FROM ripd_evidences
    WHERE "ripdId"=${dpiaId}
      AND "questionId"=${questionId}
  `);
  const count = Number((c0 as AnyRow[])[0]?.c ?? 0);

  // status (sem inventar "not_required": mantemos missing/partial/provided/validated)
  let status = "missing";
  if (!required) status = "validated";
  else if (count <= 0) status = "missing";
  else if (count < minCount) status = "partial";
  else status = "provided";

  // atualiza dpia_responses se colunas existirem
  // (colunas novas são camelCase; as demais são snake_case)
  await db.execute(sql`
    UPDATE dpia_responses
    SET "evidenceCount"=${count}, "evidenceStatus"=${status}
    WHERE dpia_id=${dpiaId} AND question_id=${questionId}
  `);
}

async function bootstrapQuestionnaire(db: any, organizationId: number, dpiaId: number, rotId: number, actorUserId: number) {
  // pega perguntas
  const { rows: qRows0 } = await db.execute(sql`
    SELECT id, display_order, question_text, question_type
    FROM dpia_questions
    ORDER BY display_order ASC
  `);
  const questions = (qRows0 as AnyRow[]) || [];

  // rot + response (se houver)
  const [rot] = await db.select().from(rotOperations).where(eq(rotOperations.id, rotId)).limit(1);
  const [resp] = await db.select().from(mapeamentoResponses).where(eq(mapeamentoResponses.rotId, rotId)).limit(1);

  const legalBase = (rot as any)?.legalBase || (resp as any)?.legalBase;
  const consentApplicable = (String(legalBase || "").toLowerCase().includes("consent") || String(legalBase || "").toLowerCase().includes("consentimento"));

  const ropa = (resp as any)?.ropaData || {};
  const dataCats = (resp as any)?.dataCategories || (rot as any)?.dataCategories || [];
  const titularCats = (resp as any)?.titularCategories || (rot as any)?.titularCategory ? [ (rot as any).titularCategory ] : [];

  // busca riscos e mitigacoes para preencher 22/25
  const { rows: r0 } = await db.execute(sql`SELECT title, description, "inherentLevel", "residualLevel" FROM dpia_risks WHERE dpia_id=${dpiaId} ORDER BY id ASC`);
  const risks = (r0 as AnyRow[]) || [];

  const { rows: m0 } = await db.execute(sql`SELECT title, description FROM dpia_mitigations WHERE dpia_id=${dpiaId} ORDER BY id ASC`);
  const mitigations = (m0 as AnyRow[]) || [];

  const riskLevel = (resp as any)?.riskLevel || (rot as any)?.riskLevel || "moderada";
  const scale = riskLevelToScale(riskLevel);

  // monta respostas deterministicamente
  const answersByOrder: Record<number, { text?: string; value?: string; json?: any }> = {
    1: { text: (rot as any)?.purpose || (rot as any)?.description || (rot as any)?.title || "Finalidade não informada (preencher)" },
    2: { value: "sim", text: "Com base no mapeamento, o tratamento é necessário para cumprir a finalidade descrita. Validar pela área." },
    3: { value: dataCats?.length > 8 ? "parcialmente" : "sim", text: "Avaliação inicial de minimização baseada nas categorias de dados informadas. Revisar se há excessos." },
    4: { text: `Base legal indicada no mapeamento/ROT: ${legalBase || "Não informada (preencher)"}` },
    5: { text: "Transparência recomendada: política de privacidade, aviso no ponto de coleta e cláusulas contratuais quando aplicável." },
    6: { value: "parcialmente", text: "Recomenda-se formalizar procedimento de atendimento a solicitações (acesso, correção, eliminação, oposição) e registrar SLA." },
    7: consentApplicable
      ? { value: (resp as any)?.consentObtained ? "sim" : "nao", text: "Se a base legal for consentimento, confirmar forma clara e específica (registro do aceite)." }
      : { text: "Não se aplica: base legal não é consentimento (confirmar)." },
    8: consentApplicable
      ? { value: "nao", text: "Recomenda-se fornecer mecanismo simples de revogação (portal/canal), com registro." }
      : { text: "Não se aplica (confirmar)." },
    9: { text: `Medidas informadas: ${JSON.stringify((resp as any)?.securityMeasures || [])}\nComplementos sugeridos: RBAC, MFA, logs, criptografia, backups e treinamento.` },
    10:{ value:"parcialmente", text:"Recomenda-se manter políticas de segurança documentadas (PSI, gestão de acesso, incidentes) e revisões periódicas." },
    11:{ value:"parcialmente", text:"Recomenda-se treinamento periódico de colaboradores com registro de presença/conteúdo." },
    12:{ value:"parcialmente", text:"Recomenda-se plano de resposta a incidentes (playbooks, responsáveis, comunicação, evidências)." },
    13:{ value: asBool((resp as any)?.internationalTransfer) ? "sim" : "nao", text: "Resposta baseada no mapeamento. Confirmar com TI/fornecedores." },
    14:{ text: `Países: ${JSON.stringify((resp as any)?.internationalCountries || [])}` },
    15:{ text: asBool((resp as any)?.internationalTransfer) ? "Mecanismo deve ser validado (cláusulas contratuais, garantias, bases legais). Anexar evidências." : "Não se aplica." },
    16:{ value: ((resp as any)?.sharing?.length ?? 0) > 0 ? "sim" : "nao", text: "Compartilhamento baseado no que foi informado. Revisar operadores e destinatários." },
    17:{ value: ((resp as any)?.sharing?.length ?? 0) > 0 ? "parcialmente" : "nao", text: "Se houver terceiros, recomenda-se DPA/cláusulas LGPD e requisitos de segurança; anexar contratos." },
    18:{ value:"parcialmente", text:"Recomenda-se avaliação/auditoria de fornecedores críticos (questionários, relatórios, ISO, SOC2)." },
    19:{ text: `Retenção informada: ${(resp as any)?.retentionPeriod || "Não informada"} | Base/justificativa: ${ropa?.retentionLegalBasis || "Não informada"}` },
    20:{ value: ropa?.disposalCriteria ? "sim" : "parcialmente", text: `Eliminação/descartes: ${ropa?.disposalCriteria || "Não informado (definir procedimento)"}` },
    21:{ value:"parcialmente", text:"Avaliar possibilidades de anonimização/pseudonimização e minimização contínua." },
    22:{ text: risks.length ? risks.map(r=>`- ${r.title}: ${r.description}`).join("\n") : "Riscos principais serão definidos/validados (gerado automaticamente com base no mapeamento)." },
    23:{ value: String(scale), text:`Probabilidade inicial inferida do nível de risco do mapeamento (${riskLevel}). Validar.` },
    24:{ value: String(scale), text:`Impacto inicial inferido do nível de risco do mapeamento (${riskLevel}). Validar.` },
    25:{ text: mitigations.length ? mitigations.map(m=>`- ${m.title}: ${m.description}`).join("\n") : "Medidas de mitigação serão definidas/validadas." },
    26:{ value:"parcialmente", text:"Avaliar proporcionalidade após validação dos riscos e evidências." },
    27:{ value:"nao", text:"Cronograma deve ser definido em plano de ação com responsáveis e prazos." }
  };

  // salva respostas (upsert) - não exigimos responseValue para todos
  for (const q of questions) {
    const order = Number(q.display_order);
    const a = answersByOrder[order] || {};
    await dpiaService.saveDpiaResponse({
      dpiaId,
      questionId: Number(q.id),
      responseText: a.text,
      responseValue: a.value,
      responseJson: a.json,
      riskScore: undefined,
      notes: "AUTO: gerado a partir do ROT/Mapeamento. Requer validação humana.",
      answeredById: actorUserId
    });
  }

  // recalc evidências para perguntas que têm policy
  for (const q of questions) {
    const qid = Number(q.id);
    await recalcEvidenceForQuestion(db, dpiaId, qid);
  }
}

async function linkRotPopAsEvidence(db: any, organizationId: number, dpiaId: number, rotId: number, actorUserId: number) {
  // tenta via tabela de vínculo mapeamento_ged_documents; fallback por fileKey
  let rotDocId: number | null = null;
  let popDocId: number | null = null;

  try {
    const links = await db.select().from(mapeamentoGedDocuments).where(eq(mapeamentoGedDocuments.rotId, rotId));
    for (const l of links as any[]) {
      if (l.documentType === "rot" && l.isLatest) rotDocId = l.gedDocumentId;
      if (l.documentType === "pop" && l.isLatest) popDocId = l.gedDocumentId;
    }
  } catch (_) {}

  if (!rotDocId || !popDocId) {
    const [rot] = await db.select().from(rotOperations).where(eq(rotOperations.id, rotId)).limit(1);
    if (rot?.rotFileKey) {
      const [d] = await db.select().from(gedDocuments).where(and(eq(gedDocuments.fileKey, rot.rotFileKey), eq(gedDocuments.organizationId, organizationId))).limit(1);
      if (d?.id) rotDocId = d.id;
    }
    if (rot?.popFileKey) {
      const [d] = await db.select().from(gedDocuments).where(and(eq(gedDocuments.fileKey, rot.popFileKey), eq(gedDocuments.organizationId, organizationId))).limit(1);
      if (d?.id) popDocId = d.id;
    }
  }

  // escolhe evidenceType compatível com enum real do banco (antigo ou novo)
  const rotType = await detectRipdEvidenceType(db, ["documento", "report", "outro", "other", "procedure"]);
  const popType = await detectRipdEvidenceType(db, ["procedimento", "procedure", "documento", "outro", "other"]);

  // Vincular ROT como evidência para perguntas-chave (1,4,19)
  if (rotDocId) {
    for (const q of [1,4,19]) {
      await upsertEvidenceLink(db, {
        organizationId, ripdId: dpiaId, questionId: q, gedDocumentId: rotDocId,
        uploadedByUserId: actorUserId, evidenceType: rotType,
        description: "AUTO: ROT gerado no mapeamento", tags: JSON.stringify(["auto", "rot", "mapeamento"])
      });
      await recalcEvidenceForQuestion(db, dpiaId, q);
    }
  }

  // Vincular POP como evidência (9,10,12,20)
  if (popDocId) {
    for (const q of [9,10,12,20]) {
      await upsertEvidenceLink(db, {
        organizationId, ripdId: dpiaId, questionId: q, gedDocumentId: popDocId,
        uploadedByUserId: actorUserId, evidenceType: popType,
        description: "AUTO: POP gerado no mapeamento", tags: JSON.stringify(["auto", "pop", "mapeamento"])
      });
      await recalcEvidenceForQuestion(db, dpiaId, q);
    }
  }
}

export async function ensureRipdFromRot(opts: {
  rotId: number;
  organizationId: number;
  actorUserId?: number;
}) {
  const db = await getDb();
  const actorUserId = opts.actorUserId ?? await pickActorUserId(opts.organizationId);

  // idempotência: se já existe, retorna id
  const { rows: ex0 } = await db.execute(sql`
    SELECT id FROM dpia_assessments
    WHERE organization_id=${opts.organizationId}
      AND source_type='mapeamento'
      AND source_id=${opts.rotId}
    LIMIT 1
  `);
  const existingId = (ex0 as AnyRow[])[0]?.id as number | undefined;

  let dpiaId: number;
  if (existingId) {
    dpiaId = existingId;
  } else {
    const gen = await dpiaService.generateDpiaFromMapeamento(opts.rotId, opts.organizationId, actorUserId);
    dpiaId = gen.dpiaId;
  }

  // bootstrap questionário + vincula evidências geradas
  await bootstrapQuestionnaire(db, opts.organizationId, dpiaId, opts.rotId, actorUserId);
  await linkRotPopAsEvidence(db, opts.organizationId, dpiaId, opts.rotId, actorUserId);

  return { dpiaId, actorUserId };
}
