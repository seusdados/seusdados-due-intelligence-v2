import { getDb } from "../db";
import { irIncidents, irCases, irActs, irDeadlines, irTacs, irSanctions, irCisDocuments, irCisDocumentVersions, irEvidences } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const uuidv4 = () => randomUUID();

// Helper para obter instância do banco
const getDatabase = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db;
};

// ==================== TENANT SCOPING (P0) ====================
async function assertIncidentInOrg(db: any, organizationId: number, incidentId: string) {
  const rows = await db
    .select({ id: irIncidents.id })
    .from(irIncidents)
    .where(and(eq(irIncidents.id, incidentId), eq(irIncidents.organizationId, organizationId)))
    .limit(1);
  if (!rows[0]) {
    throw new Error("INCIDENT_NOT_FOUND_OR_FORBIDDEN");
  }
}

async function assertCaseInOrg(db: any, organizationId: number, caseId: string) {
  // case -> incident -> org
  const rows = await db
    .select({ id: irCases.id })
    .from(irCases)
    .innerJoin(irIncidents, eq(irCases.incidentId, irIncidents.id))
    .where(and(eq(irCases.id, caseId), eq(irIncidents.organizationId, organizationId)))
    .limit(1);
  if (!rows[0]) {
    throw new Error("CASE_NOT_FOUND_OR_FORBIDDEN");
  }
}

function safeJsonParse<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Service para gerenciar Incidentes de Segurança (PAISI)
 */
export const incidentService = {
  async createIncident(
    organizationId: number,
    data: {
      title: string;
      description?: string;
      incidentType: string;
      severity: string;
      discoveryDate: Date;
      reportedBy?: number;
    }
  ) {
    const db = await getDatabase();
    const id = uuidv4();
    await db.insert(irIncidents).values({
      id,
      organizationId,
      title: data.title,
      description: data.description,
      incidentType: data.incidentType as any,
      severity: data.severity as any,
      discoveryDate: data.discoveryDate.toISOString() as any,
      status: "aberto" as any,
      stage: 0,
      reportedBy: data.reportedBy,
    });
    return { id, ...data };
  },

  async listIncidents(organizationId: number, status?: string, severity?: string) {
    const db = await getDatabase();
    const conditions = [eq(irIncidents.organizationId, organizationId)];
    if (status) {
      conditions.push(eq(irIncidents.status, status as any));
    }
    if (severity) {
      conditions.push(eq(irIncidents.severity, severity as any));
    }
    return await db.select().from(irIncidents).where(and(...conditions));
  },

  async getIncidentById(organizationId: number, incidentId: string) {
    const db = await getDatabase();
    const result = await db
      .select()
      .from(irIncidents)
      .where(and(eq(irIncidents.id, incidentId), eq(irIncidents.organizationId, organizationId)))
      .limit(1);
    return result[0] || null;
  },

  async updateIncidentStage(organizationId: number, incidentId: string, stage: number) {
    const db = await getDatabase();
    await assertIncidentInOrg(db, organizationId, incidentId);
    await db.update(irIncidents).set({ stage }).where(eq(irIncidents.id, incidentId));
  },
};

/**
 * Service para gerenciar Casos Administrativos (ANPD-PA)
 */
export const caseService = {
  async createCaseFromIncident(
    incidentId: string,
    organizationId: number,
    data: { title: string; description?: string; caseNumber: string }
  ) {
    const db = await getDatabase();
    const id = uuidv4();

    // Calcula prazos em dias úteis
    const today = new Date();
    const cisInitialDeadline = addBusinessDays(today, 30).toISOString();
    const cisFinalDeadline = addBusinessDays(today, 60).toISOString();

    await db.insert(irCases).values({
      id,
      incidentId,
      caseNumber: data.caseNumber,
      title: data.title,
      description: data.description,
      status: "aberto",
      cisStatus: "nao_iniciado",
      cisInitialDeadline: cisInitialDeadline as any,
      cisFinalDeadline: cisFinalDeadline as any,
      doubleDeadlineApplied: 0,
    });

    return { id, ...data, cisInitialDeadline, cisFinalDeadline };
  },

  async listCasesByIncident(organizationId: number, incidentId: string) {
    const db = await getDatabase();
    await assertIncidentInOrg(db, organizationId, incidentId);
    return await db.select().from(irCases).where(eq(irCases.incidentId, incidentId));
  },

  async getCaseById(organizationId: number, caseId: string) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    const result = await db.select().from(irCases).where(eq(irCases.id, caseId));
    const caseData = result[0];
    if (!caseData) return null;

    const acts = await db.select().from(irActs).where(eq(irActs.caseId, caseId));
    const deadlines = await db.select().from(irDeadlines).where(eq(irDeadlines.caseId, caseId));
    const tacResult = await db.select().from(irTacs).where(eq(irTacs.caseId, caseId));
    const sanctionResult = await db.select().from(irSanctions).where(eq(irSanctions.caseId, caseId));

    return { ...caseData, acts, deadlines, tac: tacResult[0], sanction: sanctionResult[0] };
  },

  async updateCaseStatus(organizationId: number, caseId: string, status: string) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    await db.update(irCases).set({ status: status as any }).where(eq(irCases.id, caseId));
  },
};

/**
 * Service para gerenciar Atos Processuais
 */
export const actService = {
  async addAct(
    organizationId: number,
    caseId: string,
    data: { actType: string; description: string; actDate: Date; recordedBy?: number }
  ) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    const id = uuidv4();
    await db.insert(irActs).values({
      id,
      caseId,
      actType: data.actType,
      description: data.description,
      actDate: data.actDate.toISOString() as any,
      recordedBy: data.recordedBy,
    });
    return { id, ...data };
  },

  async listActsByCase(organizationId: number, caseId: string) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    return await db.select().from(irActs).where(eq(irActs.caseId, caseId));
  },
};

/**
 * Service para gerenciar Prazos
 */
export const deadlineService = {
  async addDeadline(organizationId: number, caseId: string, data: { category: string; dueDate: Date }) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    const id = uuidv4();
    await db.insert(irDeadlines).values({
      id,
      caseId,
      category: data.category,
      dueDate: data.dueDate.toISOString() as any,
      status: "pendente",
    });
    return { id, ...data };
  },

  async listDeadlinesByCase(organizationId: number, caseId: string) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    return await db.select().from(irDeadlines).where(eq(irDeadlines.caseId, caseId));
  },

  async updateDeadlineStatus(organizationId: number, deadlineId: string, status: string) {
    const db = await getDatabase();
    // scope via deadline -> case
    const rows = await db.select({ caseId: irDeadlines.caseId }).from(irDeadlines).where(eq(irDeadlines.id, deadlineId)).limit(1);
    if (!rows[0]) throw new Error('DEADLINE_NOT_FOUND');
    await assertCaseInOrg(db, organizationId, rows[0].caseId as any);
    await db.update(irDeadlines).set({ status: status as any }).where(eq(irDeadlines.id, deadlineId));
  },

  async checkAlertDeadlines() {
    const db = await getDatabase();
    const now = new Date();
    const alertThreshold = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 horas

    const deadlines = await db.select().from(irDeadlines).where(eq(irDeadlines.status, "pendente" as any));

    for (const deadline of deadlines) {
      const dueDate = new Date(deadline.dueDate as any);
      if (dueDate <= alertThreshold && dueDate > now) {
        await db.update(irDeadlines).set({ status: "em_alerta" }).where(eq(irDeadlines.id, deadline.id));
      } else if (dueDate <= now) {
        await db.update(irDeadlines).set({ status: "vencido" }).where(eq(irDeadlines.id, deadline.id));
      }
    }
  },
};

/**
 * Service para gerenciar CIS (Comunicação de Incidente de Segurança)
 */
export const cisService = {
  /**
   * Salva rascunho (upsert) do CIS atual e registra uma nova versão.
   * - Não envia para ANPD.
   * - UX: autosave seguro (leigo não perde trabalho).
   */
  async saveDraft(
    organizationId: number,
    caseId: string,
    data: {
      affectedDataTypes: string[];
      affectedIndividuals: number;
      riskAssessment: string;
      mitigationMeasures: string[];
      content?: string;
      aiDraft?: string;
    }
  ) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);

    // upsert no documento atual (tabela mantém UNIQUE caseId)
    const currentId = uuidv4();
    const payload = {
      id: currentId,
      caseId,
      status: "rascunho" as any,
      content: data.content ?? null,
      affectedDataTypes: JSON.stringify(data.affectedDataTypes ?? []) as any,
      affectedIndividuals: String(data.affectedIndividuals ?? 0) as any,
      riskAssessment: data.riskAssessment ?? null,
      mitigationMeasures: JSON.stringify(data.mitigationMeasures ?? []) as any,
      aiDraft: data.aiDraft ?? null,
    };

    // Armazenar todos os dados extras no campo content como JSON
    const fullContent = {
      ...safeJsonParse(data.content, {}),
      affectedDataTypes: data.affectedDataTypes,
      affectedIndividuals: data.affectedIndividuals,
      riskAssessment: data.riskAssessment,
      mitigationMeasures: data.mitigationMeasures,
      aiDraft: data.aiDraft,
    };

    // Se já existe, atualiza. Se não existe, insere.
    const existing = await db.select({ id: irCisDocuments.id }).from(irCisDocuments).where(eq(irCisDocuments.caseId, caseId)).limit(1);
    if (existing[0]) {
      await db.update(irCisDocuments).set({
        status: "rascunho" as any,
        content: JSON.stringify(fullContent) as any,
      }).where(eq(irCisDocuments.caseId, caseId));
    } else {
      await db.insert(irCisDocuments).values({
        id: payload.id,
        caseId: payload.caseId,
        status: "rascunho" as any,
        content: JSON.stringify(fullContent) as any,
      } as any);
    }

    // registra versão (histórico imutável)
    await db.insert(irCisDocumentVersions).values({
      id: uuidv4(),
      caseId,
      versionStatus: "rascunho" as any,
      content: JSON.stringify(fullContent) as any,
    } as any);

    const current = await db.select().from(irCisDocuments).where(eq(irCisDocuments.caseId, caseId)).limit(1);
    return current[0] || null;
  },

  async getCurrent(organizationId: number, caseId: string) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    const rows = await db.select().from(irCisDocuments).where(eq(irCisDocuments.caseId, caseId)).limit(1);
    const doc = rows[0];
    if (!doc) return null;
    
    // Extrair dados do campo content (onde armazenamos os dados extras)
    const contentData = safeJsonParse<any>(doc.content as any, {});
    return {
      ...doc,
      affectedDataTypes: contentData.affectedDataTypes ?? [],
      affectedIndividuals: contentData.affectedIndividuals ?? null,
      riskAssessment: contentData.riskAssessment ?? null,
      mitigationMeasures: contentData.mitigationMeasures ?? [],
      aiDraft: contentData.aiDraft ?? null,
    };
  },

  
  /**
   * Sugestões automáticas (semi-automático) para pré-preencher o CIS.
   * - NÃO salva nada no banco.
   * - Usa dados já existentes do incidente/caso/evidências para reduzir digitação.
   */
  async getPrefill(organizationId: number, caseId: string) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);

    // carrega caso + incidente (contexto)
    const ctxRows = await db
      .select({
        caseId: irCases.id,
        caseTitle: irCases.title,
        caseNumber: irCases.caseNumber,
        caseDescription: irCases.description,
        incidentId: irIncidents.id,
        incidentTitle: irIncidents.title,
        incidentDescription: irIncidents.description,
        incidentType: irIncidents.incidentType,
        severity: irIncidents.severity,
        discoveryDate: irIncidents.discoveryDate,
        incidentStatus: irIncidents.status,
      })
      .from(irCases)
      .innerJoin(irIncidents, eq(irCases.incidentId, irIncidents.id))
      .where(and(eq(irCases.id, caseId), eq(irIncidents.organizationId, organizationId)))
      .limit(1);

    const ctxRow = ctxRows[0];
    if (!ctxRow) {
      throw new Error("CASE_NOT_FOUND_OR_FORBIDDEN");
    }

    // evidências (títulos + descrições) para inferência leve
    const evRows = await db
      .select({ title: irEvidences.title, description: irEvidences.description, status: irEvidences.status })
      .from(irEvidences)
      .where(eq(irEvidences.caseId, caseId));

    const corpus = [
      ctxRow.caseTitle,
      ctxRow.caseDescription,
      ctxRow.incidentTitle,
      ctxRow.incidentDescription,
      String(ctxRow.incidentType ?? ""),
      ...evRows.map((e: any) => `${e.title ?? ""} ${e.description ?? ""}`),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const keywords: Record<string, string[]> = {
      credenciais: ["senha", "password", "credencial", "login", "oauth", "token", "mfa", "2fa", "cookie", "sessao", "session"],
      financeiros: ["cartao", "cartão", "credito", "crédito", "debito", "débito", "pix", "banco", "conta", "boleto", "fatura", "pagamento"],
      saude: ["saude", "saúde", "prontuario", "prontuário", "exame", "laudo", "clinica", "clínica", "medico", "médico"],
      criancas: ["crianca", "criança", "adolescente", "menor", "estudante", "aluno", "escola"],
      identificacao: ["cpf", "rg", "cnpj", "nome", "endereco", "endereço", "telefone", "email", "e-mail", "nascimento", "cep"],
      biometria: ["biometr", "faceid", "finger", "impressao digital", "impressão digital"],
      localizacao: ["gps", "geolocal", "localiza", "ip", "endereco ip", "endereço ip"],
      imagem_audio: ["foto", "imagem", "video", "vídeo", "audio", "áudio", "whatsapp", "print", "screenshot"],
      ransomware: ["ransom", "criptograf", "encript", "extors", "double extortion", "resgate"],
      phishing: ["phish", "spoof", "boleto falso", "engenharia social"],
      vazamento: ["vazou", "leak", "exfiltr", "dump", "paste", "forum", "dark web", "telegram", "github", "bucket"],
    };

    const hits: Record<string, number> = {};
    for (const [k, arr] of Object.entries(keywords)) {
      hits[k] = arr.reduce((acc, w) => (corpus.includes(w) ? acc + 1 : acc), 0);
    }

    const suggestedDataTypes: string[] = [];
    const pushUnique = (v: string) => {
      if (!suggestedDataTypes.includes(v)) suggestedDataTypes.push(v);
    };

    // Taxonomia simples e leiga (pode ser mapeada com ROTs depois)
    if (hits.identificacao) pushUnique("Dados de identificação e contato (nome, e-mail, telefone, CPF etc.)");
    if (hits.credenciais || hits.phishing) pushUnique("Credenciais de acesso (login, senha, tokens)");
    if (hits.financeiros) pushUnique("Dados financeiros (cartão, conta, PIX, transações)");
    if (hits.saude) pushUnique("Dados de saúde (prontuários, exames, laudos)");
    if (hits.biometria) pushUnique("Dados biométricos (face, digital etc.)");
    if (hits.localizacao) pushUnique("Dados de localização e identificadores online (IP, geolocalização)");
    if (hits.imagem_audio) pushUnique("Imagens, áudios e anexos (prints, fotos, conversas)");
    if (hits.criancas) pushUnique("Dados de crianças e adolescentes");

    // se nada foi inferido, usar fallback mínimo
    if (!suggestedDataTypes.length) {
      pushUnique("Dados pessoais ainda em avaliação (não confirmado)");
    }

    const suggestedMeasures: string[] = [];
    const pushM = (v: string) => {
      if (!suggestedMeasures.includes(v)) suggestedMeasures.push(v);
    };

    // Medidas por padrão do incidente (linguagem operacional)
    if (hits.phishing || hits.credenciais) {
      pushM("Revogar sessões/tokens e redefinir senhas das contas afetadas");
      pushM("Reforçar MFA e revisar acessos privilegiados");
    }
    if (hits.ransomware) {
      pushM("Isolar máquinas/servidores afetados e preservar evidências (logs, imagens, backups)");
      pushM("Validar integridade de backups e executar plano de recuperação (DR/restore)");
    }
    if (hits.vazamento) {
      pushM("Conter a exposição (revogar acessos, corrigir configuração, remover links públicos)");
      pushM("Mapear dados potencialmente expostos e rastrear origem/escopo do vazamento");
    }
    // medidas sempre úteis
    pushM("Registrar linha do tempo do incidente e centralizar evidências");
    pushM("Avaliar necessidade de comunicação a titulares e a outros órgãos/partes relevantes");

    // sugestão de número de titulares (heurística)
    const numberCandidates: number[] = [];
    const numberRegex = /\b(\d{1,7})\b/g;
    let m: RegExpExecArray | null;
    while ((m = numberRegex.exec(corpus))) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) numberCandidates.push(n);
      if (numberCandidates.length > 25) break;
    }
    const suggestedIndividuals = numberCandidates.length ? Math.max(...numberCandidates) : 0;

    const severity = String(ctxRow.severity ?? "").toLowerCase();
    const discovery = ctxRow.discoveryDate ? new Date(String(ctxRow.discoveryDate)) : null;

    const riskAssessment =
      `Contexto: ${ctxRow.incidentTitle || ctxRow.caseTitle} (tipo: ${ctxRow.incidentType || "não informado"}, severidade: ${ctxRow.severity || "não informada"}).\n` +
      `Detecção: ${discovery ? discovery.toISOString().slice(0, 10) : "data não informada"}.\n` +
      `Dados possivelmente envolvidos: ${suggestedDataTypes.join("; ")}.\n` +
      `Avaliação preliminar: com base nas informações já registradas, o risco é ${severity || "indefinido"} e depende da confirmação do escopo (sistemas atingidos, volume de titulares e exposição efetiva).\n` +
      `Recomendação: confirmar escopo, contenção e evidências antes do envio final à ANPD.`;

    const content =
      `Resumo do incidente\n` +
      `- Título: ${ctxRow.incidentTitle || ctxRow.caseTitle}\n` +
      `- Tipo: ${ctxRow.incidentType || "não informado"}\n` +
      `- Severidade: ${ctxRow.severity || "não informada"}\n` +
      `- Data de descoberta: ${discovery ? discovery.toISOString().slice(0, 10) : "não informada"}\n\n` +
      `Evidências já registradas: ${evRows.length}.\n` +
      `Tipos de dados possivelmente envolvidos: ${suggestedDataTypes.join("; ")}.\n\n` +
      `Medidas iniciais sugeridas:\n` +
      suggestedMeasures.map((x) => `- ${x}`).join("\n") +
      `\n`;

    return {
      context: {
        caseId: ctxRow.caseId,
        caseNumber: ctxRow.caseNumber,
        incidentId: ctxRow.incidentId,
        incidentType: ctxRow.incidentType,
        severity: ctxRow.severity,
        evidences: evRows.length,
      },
      suggestions: {
        affectedDataTypes: suggestedDataTypes,
        mitigationMeasures: suggestedMeasures,
        affectedIndividuals: suggestedIndividuals,
        riskAssessment,
        content,
      },
      signals: {
        hits,
      },
    };
  },
async listVersions(organizationId: number, caseId: string) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    return await db.select().from(irCisDocumentVersions).where(eq(irCisDocumentVersions.caseId, caseId)).orderBy(desc(irCisDocumentVersions.createdAt));
  },

  /** Envia para revisão (consultoria). */
  async submitForReview(organizationId: number, caseId: string, userId: number) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    await db.update(irCisDocuments).set({ status: "em_analise" as any }).where(eq(irCisDocuments.caseId, caseId));
    await db.insert(irCisDocumentVersions).values({
      id: uuidv4(),
      caseId,
      versionStatus: "em_analise" as any,
      createdBy: userId,
    } as any);
  },

  /** Finaliza (pronto para submissão). */
  async finalize(organizationId: number, caseId: string, userId: number) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    await db.update(irCisDocuments).set({ status: "finalizado" as any }).where(eq(irCisDocuments.caseId, caseId));
    await db.insert(irCisDocumentVersions).values({
      id: uuidv4(),
      caseId,
      versionStatus: "finalizado" as any,
      createdBy: userId,
    } as any);
  },

  /** Marca como enviado e registra trilha (não executa submissão externa). */
  async markAsSent(organizationId: number, caseId: string, submittedBy: number) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    await db.update(irCisDocuments).set({
      status: "enviado" as any,
      submittedAt: new Date().toISOString() as any,
    }).where(eq(irCisDocuments.caseId, caseId));

    await db.insert(irCisDocumentVersions).values({
      id: uuidv4(),
      caseId,
      versionStatus: "enviado" as any,
      createdBy: submittedBy,
    } as any);
  },
};

/**
 * Service para gerenciar TACs (Termos de Ajustamento de Conduta)
 */
export const tacService = {
  async createTac(organizationId: number, caseId: string, data: { obligations: string; deadline: Date }) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    const id = uuidv4();
    await db.insert(irTacs).values({
      id,
      caseId,
      obligations: data.obligations as any,
      deadline: data.deadline.toISOString() as any,
      status: "pendente" as any,
    });
    return { id, ...data };
  },

  async signTac(organizationId: number, caseId: string) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    await db.update(irTacs).set({ signedAt: new Date().toISOString() as any }).where(eq(irTacs.caseId, caseId));
  },

  async markTacFulfilled(organizationId: number, caseId: string) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    await db.update(irTacs).set({ fulfilledAt: new Date().toISOString() as any }).where(eq(irTacs.caseId, caseId));
  },
};

/**
 * Service para gerenciar Sanções
 */
export const sanctionService = {
  async calculateSanction(
    organizationId: number,
    caseId: string,
    data: { gravity: string; damage: string; economicAdvantage?: number; annualRevenue?: number }
  ) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    const baseValue = 50000; // Valor base em reais
    const gravityFactor = data.gravity === "grave" ? 3 : data.gravity === "media" ? 2 : 1;
    const damageFactor = data.damage === "severo" ? 3 : data.damage === "moderado" ? 2 : 1;
    const economicFactor = (data.economicAdvantage || 0) / (data.annualRevenue || 1000000);

    const sanctionValue = baseValue * gravityFactor * damageFactor * (1 + economicFactor);

    const id = uuidv4();
    await db.insert(irSanctions).values({
      id,
      caseId,
      gravity: data.gravity,
      damageLevel: data.damage,
      fineAmount: String(sanctionValue),
    });

    return { id, sanctionValue };
  },
};

/**
 * Service para gerenciar Evidências
 */
export const evidenceService = {
  async listEvidencesByCase(organizationId: number, caseId: string) {
    const db = await getDatabase();
    await assertCaseInOrg(db, organizationId, caseId);
    return await db.select().from(irEvidences).where(eq(irEvidences.caseId, caseId));
  },

  async updateEvidenceStatus(organizationId: number, evidenceId: string, status: string, collectedBy?: number) {
    const db = await getDatabase();
    const rows = await db.select({ caseId: irEvidences.caseId }).from(irEvidences).where(eq(irEvidences.id, evidenceId)).limit(1);
    if (!rows[0]) throw new Error('EVIDENCE_NOT_FOUND');
    await assertCaseInOrg(db, organizationId, rows[0].caseId as any);
    await db
      .update(irEvidences)
      .set({ status: status as any, collectedAt: new Date().toISOString() as any, collectedBy })
      .where(eq(irEvidences.id, evidenceId));
  },
};

/**
 * Utilitário: Adiciona dias úteis a uma data
 */
function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date);
  let count = 0;

  while (count < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }

  return result;
}
