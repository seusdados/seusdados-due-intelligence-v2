import { logger } from "./_core/logger";
// server/rotService.ts
import { getDb } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  rotOperations,
  rotTasks,
  users,
} from "../drizzle/schema";
import type { InferInsertModel } from "drizzle-orm";

type InsertRotOperation = InferInsertModel<typeof rotOperations>;
type InsertRotTask = InferInsertModel<typeof rotTasks>;
import { invokeLLM } from "./_core/llm";

// ==========================
// ROT OPERATIONS
// ==========================

export async function createRot(data: Omit<InsertRotOperation, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db.insert(rotOperations).values({
    ...data,
    alternativeBases: data.alternativeBases || [],
    risksIfNoConsent: data.risksIfNoConsent || [],
  }).returning({ id: rotOperations.id });

  return Number(result[0]?.id || 0);
}

export async function listRots(organizationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: rotOperations.id,
      title: rotOperations.title,
      description: rotOperations.description,
      department: rotOperations.department,
      titularCategory: rotOperations.titularCategory,
      purpose: rotOperations.purpose,
      legalBase: rotOperations.legalBase,
      requiresConsent: rotOperations.requiresConsent,
      status: rotOperations.status,
      createdAt: rotOperations.createdAt,
      updatedAt: rotOperations.updatedAt,
      createdByName: users.name,
    })
    .from(rotOperations)
    .leftJoin(users, eq(rotOperations.createdById, users.id))
    .where(eq(rotOperations.organizationId, organizationId))
    .orderBy(desc(rotOperations.createdAt));
}

export async function getRotById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) return null;

  const [rot] = await db
    .select()
    .from(rotOperations)
    .where(
      and(
        eq(rotOperations.id, id),
        eq(rotOperations.organizationId, organizationId)
      )
    );

  return rot || null;
}

export async function getRotByIdSimple(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [rot] = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.id, id));

  return rot || null;
}

export async function updateRot(
  id: number,
  data: Partial<InsertRotOperation>
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(rotOperations)
    .set(data as any)
    .where(eq(rotOperations.id, id));
}

export async function deleteRot(id: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Primeiro deletar as tarefas associadas
  await db.delete(rotTasks).where(eq(rotTasks.rotId, id));
  // Depois deletar o ROT
  await db.delete(rotOperations).where(eq(rotOperations.id, id));
}

// ==========================
// ROT TASKS
// ==========================

export async function createTask(data: Omit<InsertRotTask, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db.insert(rotTasks).values({
    ...data,
    completed: 0,
  }).returning({ id: rotTasks.id });

  return Number(result[0]?.id || 0);
}

export async function listTasks(rotId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: rotTasks.id,
      rotId: rotTasks.rotId,
      assigneeId: rotTasks.assigneeId,
      title: rotTasks.title,
      description: rotTasks.description,
      dueDate: rotTasks.dueDate,
      priority: rotTasks.priority,
      completed: rotTasks.completed,
      completedAt: rotTasks.completedAt,
      createdAt: rotTasks.createdAt,
      assigneeName: users.name,
    })
    .from(rotTasks)
    .leftJoin(users, eq(rotTasks.assigneeId, users.id))
    .where(eq(rotTasks.rotId, rotId))
    .orderBy(desc(rotTasks.createdAt));
}

export async function completeTask(taskId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(rotTasks)
    .set({
      completed: 1,
      completedAt: new Date().toISOString(),
    })
    .where(eq(rotTasks.id, taskId));
}

export async function updateTaskStatus(taskId: number, completed: boolean) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db
    .update(rotTasks)
    .set({
      completed: completed ? 1 : 0,
      completedAt: completed ? new Date().toISOString() : null,
    })
    .where(eq(rotTasks.id, taskId));
}

export async function deleteTask(taskId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db.delete(rotTasks).where(eq(rotTasks.id, taskId));
}

// ==========================
// IA - ANÁLISE DE CONSENTIMENTO
// ==========================

interface DataCategory {
  name: string;
  sensivel: boolean;
}

interface AIAnalysisResult {
  legalBasis: string;
  requiresConsent: boolean;
  alternativeBases: string[];
  risksIfNoConsent: string[];
  justification: string;
  recommendations: string[];
  riskLevel: "baixo" | "medio" | "alto" | "critico";
}

export async function analyzeWithAI(
  activityDescription: string,
  dataCategories: DataCategory[],
  titularCategory: string
): Promise<AIAnalysisResult> {
  const hasSensitiveData = dataCategories.some(d => d.sensivel);
  const dataList = dataCategories.map(d => `${d.name}${d.sensivel ? " (sensível)" : ""}`).join(", ");

  const prompt = `Você é um especialista em LGPD (Lei Geral de Proteção de Dados) do Brasil.

Analise a seguinte atividade de tratamento de dados pessoais e forneça uma análise completa:

**Atividade:** ${activityDescription}

**Categoria de Titular:** ${titularCategory}

**Dados Tratados:** ${dataList}

**Contém dados sensíveis:** ${hasSensitiveData ? "Sim" : "Não"}

Por favor, forneça sua análise no seguinte formato JSON:

{
  "legalBasis": "Base legal mais adequada (art. 7º ou 11º da LGPD)",
  "requiresConsent": true/false,
  "alternativeBases": ["Outras bases legais aplicáveis"],
  "risksIfNoConsent": ["Riscos se não houver consentimento adequado"],
  "justification": "Justificativa detalhada para a base legal escolhida",
  "recommendations": ["Recomendações de conformidade"],
  "riskLevel": "baixo|medio|alto|critico"
}

Considere:
- Art. 7º para dados pessoais comuns
- Art. 11º para dados sensíveis
- Princípios de necessidade, adequação e proporcionalidade
- Direitos dos titulares
- Obrigações do controlador`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um especialista em LGPD e proteção de dados. Responda sempre em JSON válido." },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'IA não respondeu' });
    }

    // Tentar extrair JSON da resposta
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta da IA não contém JSON válido' });
    }

    const analysis = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
    return analysis;
  } catch (error) {
    logger.error("Erro na análise de IA:", error);
    // Retornar análise padrão em caso de erro
    return {
      legalBasis: hasSensitiveData ? "Art. 11, I - Consentimento" : "Art. 7, I - Consentimento",
      requiresConsent: true,
      alternativeBases: [],
      risksIfNoConsent: ["Risco de não conformidade com a LGPD"],
      justification: "Análise automática não disponível. Recomenda-se revisão manual.",
      recommendations: ["Revisar manualmente a base legal aplicável"],
      riskLevel: hasSensitiveData ? "alto" : "medio",
    };
  }
}

// ==========================
// ESTATÍSTICAS
// ==========================

export async function getRotStats(organizationId: number) {
  const db = await getDb();
  if (!db) return { total: 0, rascunho: 0, emRevisao: 0, aprovado: 0, arquivado: 0 };

  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      rascunho: sql<number>`SUM(CASE WHEN status = 'rascunho' THEN 1 ELSE 0 END)`,
      emRevisao: sql<number>`SUM(CASE WHEN status = 'em_revisao' THEN 1 ELSE 0 END)`,
      aprovado: sql<number>`SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END)`,
      arquivado: sql<number>`SUM(CASE WHEN status = 'arquivado' THEN 1 ELSE 0 END)`,
    })
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId));

  return {
    total: Number(stats?.total || 0),
    rascunho: Number(stats?.rascunho || 0),
    emRevisao: Number(stats?.emRevisao || 0),
    aprovado: Number(stats?.aprovado || 0),
    arquivado: Number(stats?.arquivado || 0),
  };
}


// ==========================
// GERAÇÃO DE BASE LEGAL E ANÁLISE COM IA
// ==========================

export async function generateBaseLegalWithAI(rotId: number): Promise<{
  baseLegal: string;
  riskAnalysis: string;
  recommendations: string;
  riskLevel: string;
}> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar o ROT
  const [rot] = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.id, rotId));

  if (!rot) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'ROT não encontrado' });
  }

  // Verificar se há dados sensíveis
  const dataCategories = rot.dataCategories as { name: string; sensivel: boolean }[] || [];
  const hasSensitiveData = dataCategories.some(cat => cat.sensivel);
  const dataList = dataCategories.map(cat => `${cat.name}${cat.sensivel ? ' (sensível)' : ''}`).join(', ');

  const prompt = `Você é um especialista em LGPD (Lei Geral de Proteção de Dados) e deve analisar a seguinte operação de tratamento de dados pessoais:

**Título da Operação:** ${rot.title}
**Descrição:** ${rot.description || 'Não informada'}
**Departamento:** ${rot.department || 'Não informado'}
**Categoria de Titular:** ${rot.titularCategory || 'Não informada'}
**Finalidade:** ${rot.purpose || rot.description || 'Não informada'}
**Dados Tratados:** ${dataList || 'Não informados'}
**Contém Dados Sensíveis:** ${hasSensitiveData ? 'Sim' : 'Não'}

Por favor, forneça uma análise completa no seguinte formato JSON:

{
  "baseLegal": "A base legal mais adequada conforme Art. 7 ou Art. 11 da LGPD, com justificativa detalhada",
  "riskAnalysis": "Análise detalhada dos riscos associados ao tratamento, considerando: volume de dados, sensibilidade, compartilhamento, transferência internacional, período de retenção, medidas de segurança necessárias",
  "recommendations": "Recomendações específicas para adequação à LGPD, incluindo: medidas técnicas, organizacionais, documentação necessária, treinamentos, revisões periódicas",
  "riskLevel": "baixo|medio|alto|critico"
}

Considere:
- Art. 7 da LGPD para dados pessoais comuns
- Art. 11 da LGPD para dados pessoais sensíveis
- Princípios da LGPD: finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação, responsabilização
- Direitos dos titulares
- Obrigações do controlador e operador`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um especialista em LGPD e proteção de dados. Responda sempre em JSON válido." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lgpd_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              baseLegal: { type: "string", description: "Base legal aplicável com justificativa" },
              riskAnalysis: { type: "string", description: "Análise detalhada de riscos" },
              recommendations: { type: "string", description: "Recomendações de adequação" },
              riskLevel: { type: "string", enum: ["baixo", "medio", "alto", "critico"], description: "Nível de risco" }
            },
            required: ["baseLegal", "riskAnalysis", "recommendations", "riskLevel"],
            additionalProperties: false
          }
        }
      }
    });

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Resposta vazia da IA' });
    }
    const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);

    const analysis = JSON.parse(content);

    // Atualizar o ROT com a análise
    await db
      .update(rotOperations)
      .set({
        legalBase: analysis.baseLegal,
        aiAnalysis: {
          riskAnalysis: analysis.riskAnalysis,
          recommendations: analysis.recommendations,
          riskLevel: analysis.riskLevel,
        },
        aiGeneratedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(rotOperations.id, rotId));

    return analysis;
  } catch (error) {
    logger.error("Erro na geração de base legal com IA:", error);
    
    // Retornar análise padrão em caso de erro
    const defaultAnalysis = {
      baseLegal: hasSensitiveData 
        ? "Art. 11, I da LGPD - Consentimento do titular para tratamento de dados sensíveis. Recomenda-se obter consentimento específico e destacado para cada finalidade de tratamento."
        : "Art. 7, I da LGPD - Consentimento do titular. Alternativamente, verificar aplicabilidade de outras bases legais como legítimo interesse (Art. 7, IX) ou execução de contrato (Art. 7, V).",
      riskAnalysis: "Análise automática não disponível. Recomenda-se revisão manual considerando: volume de dados tratados, sensibilidade das informações, compartilhamento com terceiros, transferência internacional, período de retenção e medidas de segurança implementadas.",
      recommendations: "1. Documentar todas as operações de tratamento no ROPA\n2. Implementar medidas técnicas de segurança adequadas\n3. Treinar colaboradores sobre proteção de dados\n4. Estabelecer procedimentos para atendimento aos direitos dos titulares\n5. Revisar periodicamente as bases legais aplicáveis",
      riskLevel: hasSensitiveData ? "alto" : "medio"
    };

    // Salvar análise padrão
    await db
      .update(rotOperations)
      .set({
        legalBase: defaultAnalysis.baseLegal,
        aiAnalysis: {
          riskAnalysis: defaultAnalysis.riskAnalysis,
          recommendations: defaultAnalysis.recommendations,
          riskLevel: defaultAnalysis.riskLevel,
        },
        aiGeneratedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(rotOperations.id, rotId));

    return defaultAnalysis;
  }
}

// ==========================
// EXPORTAÇÃO ROPA
// ==========================

export async function getRotsForROPA(organizationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId))
    .orderBy(desc(rotOperations.createdAt));
}



// ==========================
// GERAÇÃO DE POP COM IA
// ==========================

export interface POPContent {
  title: string;
  objective: string;
  scope: string;
  definitions: string[];
  responsibilities: { role: string; responsibility: string }[];
  procedures: { step: number; action: string; details: string }[];
  securityMeasures: string[];
  dataRetention: string;
  incidentResponse: string;
  references: string[];
  revisionHistory: { version: string; date: string; description: string }[];
}

export async function generatePOPWithAI(rotId: number): Promise<POPContent> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar o ROT
  const [rot] = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.id, rotId));

  if (!rot) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'ROT não encontrado' });
  }

  const dataCategories = (rot.dataCategories as Array<{ sensivel?: boolean }>) || [];
  const hasSensitiveData = dataCategories.some((d: any) => d.sensivel);

  // Gerar POP padrão baseado nos dados do ROT (sem depender da IA por enquanto)
  logger.info("[POP-GEN] Gerando POP padrão para:", rot.title);
    
    // Retornar POP padrão em caso de erro
    return {
      title: `POP - ${rot.title}`,
      objective: `Estabelecer procedimentos para o tratamento de dados pessoais relacionados a ${rot.title}, garantindo conformidade com a LGPD.`,
      scope: `Este procedimento aplica-se ao departamento de ${rot.department || "toda a organização"} e abrange o tratamento de dados de ${rot.titularCategory}.`,
      definitions: [
        "Dados Pessoais: Informação relacionada a pessoa natural identificada ou identificável",
        "Titular: Pessoa natural a quem se referem os dados pessoais",
        "Tratamento: Toda operação realizada com dados pessoais",
        "Controlador: Pessoa responsável pelas decisões sobre o tratamento",
        "Operador: Pessoa que realiza o tratamento em nome do controlador"
      ],
      responsibilities: [
        { role: "DPO/Encarregado", responsibility: "Supervisionar a conformidade com a LGPD e orientar colaboradores" },
        { role: "Gestor da Área", responsibility: "Garantir que a equipe siga os procedimentos estabelecidos" },
        { role: "Colaboradores", responsibility: "Executar o tratamento conforme os procedimentos definidos" },
        { role: "TI", responsibility: "Manter a segurança dos sistemas e dados" }
      ],
      procedures: [
        { step: 1, action: "Coleta de Dados", details: "Coletar apenas os dados necessários para a finalidade específica, informando o titular sobre o tratamento" },
        { step: 2, action: "Registro", details: "Registrar a operação de tratamento no sistema, incluindo finalidade e base legal" },
        { step: 3, action: "Armazenamento", details: "Armazenar os dados em local seguro com controle de acesso" },
        { step: 4, action: "Uso", details: "Utilizar os dados apenas para a finalidade informada ao titular" },
        { step: 5, action: "Compartilhamento", details: "Compartilhar dados apenas quando necessário e com base legal adequada" },
        { step: 6, action: "Eliminação", details: "Eliminar os dados quando não mais necessários ou quando solicitado pelo titular" }
      ],
      securityMeasures: [
        "Controle de acesso baseado em perfis",
        "Criptografia de dados sensíveis",
        "Backup regular dos dados",
        "Monitoramento de acessos",
        "Treinamento de colaboradores"
      ],
      dataRetention: "Os dados serão mantidos pelo período necessário para cumprimento da finalidade ou conforme exigência legal, sendo eliminados de forma segura após este período.",
      incidentResponse: "Em caso de incidente de segurança, comunicar imediatamente o DPO, registrar o ocorrido, avaliar riscos aos titulares e, se necessário, comunicar à ANPD e aos titulares afetados.",
      references: [
        "Lei nº 13.709/2018 (LGPD)",
        `${rot.legalBase}`,
        "Política de Privacidade da Organização",
        "Política de Segurança da Informação"
      ],
      revisionHistory: [
        { version: "1.0", date: new Date().toISOString().split('T')[0], description: "Versão inicial gerada automaticamente" }
      ]
    };
}

// Função para converter POP em Markdown
export function convertPOPToMarkdown(pop: POPContent): string {
  return `# ${pop.title}

## 1. Objetivo

${pop.objective}

## 2. Escopo

${pop.scope}

## 3. Definições

${pop.definitions.map((d, i) => `${i + 1}. ${d}`).join("\n")}

## 4. Responsabilidades

| Cargo/Função | Responsabilidade |
|--------------|------------------|
${pop.responsibilities.map(r => `| ${r.role} | ${r.responsibility} |`).join("\n")}

## 5. Procedimentos

${pop.procedures.map(p => `### ${p.step}. ${p.action}

${p.details}
`).join("\n")}

## 6. Medidas de Segurança

${pop.securityMeasures.map((m, i) => `${i + 1}. ${m}`).join("\n")}

## 7. Retenção de Dados

${pop.dataRetention}

## 8. Resposta a Incidentes

${pop.incidentResponse}

## 9. Referências

${pop.references.map((r, i) => `${i + 1}. ${r}`).join("\n")}

## 10. Histórico de Revisões

| Versão | Data | Descrição |
|--------|------|-----------|
${pop.revisionHistory.map(r => `| ${r.version} | ${r.date} | ${r.description} |`).join("\n")}

---

*Documento gerado automaticamente pelo Sistema Seusdados Due Diligence*
*Data de geração: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}*
`;
}


// ==========================
// DASHBOARD DE MAPEAMENTOS
// ==========================

export interface DashboardStats {
  totalMapeamentos: number;
  porStatus: { status: string; count: number }[];
  porDepartamento: { departamento: string; count: number; riskLevel: string }[];
  porNivelRisco: { nivel: string; count: number }[];
  entrevistasPendentes: number;
  entrevistasConcluidas: number;
  progressoGeral: number;
}

export async function getDashboardStats(organizationId: number): Promise<DashboardStats> {
  const db = await getDb();
  if (!db) {
    return {
      totalMapeamentos: 0,
      porStatus: [],
      porDepartamento: [],
      porNivelRisco: [],
      entrevistasPendentes: 0,
      entrevistasConcluidas: 0,
      progressoGeral: 0,
    };
  }

  // Total de mapeamentos
  const rots = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId));

  const totalMapeamentos = rots.length;

  // Por status
  const statusCount: Record<string, number> = {};
  for (const rot of rots) {
    const status = rot.status || "rascunho";
    statusCount[status] = (statusCount[status] || 0) + 1;
  }
  const porStatus = Object.entries(statusCount).map(([status, count]) => ({ status, count }));

  // Por departamento com nível de risco
  const deptRisk: Record<string, { count: number; risks: string[] }> = {};
  for (const rot of rots) {
    const dept = rot.department || "Não especificado";
    if (!deptRisk[dept]) {
      deptRisk[dept] = { count: 0, risks: [] };
    }
    deptRisk[dept].count++;
    const aiData = rot.aiAnalysis as { riskLevel?: string } | null;
    if (aiData?.riskLevel) {
      deptRisk[dept].risks.push(aiData.riskLevel);
    }
  }
  const porDepartamento = Object.entries(deptRisk).map(([departamento, data]) => {
    // Calcular nível de risco predominante
    const riskCounts: Record<string, number> = {};
    for (const risk of data.risks) {
      riskCounts[risk] = (riskCounts[risk] || 0) + 1;
    }
    const maxRisk = Object.entries(riskCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      departamento,
      count: data.count,
      riskLevel: maxRisk?.[0] || "baixo",
    };
  });

  // Por nível de risco
  const riskCount: Record<string, number> = { baixo: 0, medio: 0, alto: 0, critico: 0 };
  for (const rot of rots) {
    const aiData = rot.aiAnalysis as { riskLevel?: string } | null;
    const risk = aiData?.riskLevel || "baixo";
    riskCount[risk] = (riskCount[risk] || 0) + 1;
  }
  const porNivelRisco = Object.entries(riskCount).map(([nivel, count]) => ({ nivel, count }));

  // Entrevistas (simulado - baseado em status)
  const entrevistasConcluidas = rots.filter(r => r.status === "aprovado" || r.status === "em_revisao").length;
  const entrevistasPendentes = rots.filter(r => r.status === "em_revisao").length;

  // Progresso geral
  const progressoGeral = totalMapeamentos > 0 
    ? Math.round((entrevistasConcluidas / totalMapeamentos) * 100) 
    : 0;

  return {
    totalMapeamentos,
    porStatus,
    porDepartamento,
    porNivelRisco,
    entrevistasPendentes,
    entrevistasConcluidas,
    progressoGeral,
  };
}

export interface TimelineItem {
  id: number;
  tipo: "criacao" | "atualizacao" | "aprovacao" | "entrevista";
  titulo: string;
  descricao: string;
  data: string;
  status?: string;
  departamento?: string;
}

export async function getTimeline(organizationId: number, limit: number = 20): Promise<TimelineItem[]> {
  const db = await getDb();
  if (!db) return [];

  const rots = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId))
    .orderBy(desc(rotOperations.updatedAt))
    .limit(limit);

  const timeline: TimelineItem[] = [];

  for (const rot of rots) {
    // Evento de criação
    timeline.push({
      id: rot.id,
      tipo: "criacao",
      titulo: rot.title,
      descricao: `Mapeamento "${rot.title}" criado`,
      data: rot.createdAt,
      status: rot.status || "rascunho",
      departamento: rot.department || undefined,
    });

    // Se foi atualizado depois da criação
    if (rot.updatedAt && rot.updatedAt !== rot.createdAt) {
      timeline.push({
        id: rot.id,
        tipo: "atualizacao",
        titulo: rot.title,
        descricao: `Mapeamento "${rot.title}" atualizado`,
        data: rot.updatedAt,
        status: rot.status || "rascunho",
        departamento: rot.department || undefined,
      });
    }

    // Se foi aprovado
    if (rot.status === "aprovado") {
      timeline.push({
        id: rot.id,
        tipo: "aprovacao",
        titulo: rot.title,
        descricao: `Mapeamento "${rot.title}" aprovado`,
        data: rot.updatedAt || rot.createdAt,
        status: "aprovado",
        departamento: rot.department || undefined,
      });
    }
  }

  // Ordenar por data decrescente
  return timeline.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, limit);
}

// ==========================
// MAPA DE CALOR DE RISCOS
// ==========================

export interface RiskHeatmapData {
  departamento: string;
  baixo: number;
  medio: number;
  alto: number;
  critico: number;
  total: number;
}

export async function getRiskHeatmap(organizationId: number): Promise<RiskHeatmapData[]> {
  const db = await getDb();
  if (!db) return [];

  const rots = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId));

  const heatmap: Record<string, RiskHeatmapData> = {};

  for (const rot of rots) {
    const dept = rot.department || "Não especificado";
    const aiData = rot.aiAnalysis as { riskLevel?: string } | null;
    const risk = aiData?.riskLevel || "baixo";

    if (!heatmap[dept]) {
      heatmap[dept] = {
        departamento: dept,
        baixo: 0,
        medio: 0,
        alto: 0,
        critico: 0,
        total: 0,
      };
    }

    heatmap[dept][risk as keyof Omit<RiskHeatmapData, "departamento" | "total">]++;
    heatmap[dept].total++;
  }

  return Object.values(heatmap).sort((a, b) => b.total - a.total);
}


// ==========================
// EXPORTAÇÃO EM LOTE ZIP
// ==========================

import archiver from "archiver";
import { organizations } from "../drizzle/schema";
import { TRPCError } from '@trpc/server';

export async function exportAllDocumentsZip(organizationId: number): Promise<{ buffer: Buffer; filename: string }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const rots = await db
    .select()
    .from(rotOperations)
    .where(eq(rotOperations.organizationId, organizationId))
    .orderBy(rotOperations.title);

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  const orgName = org?.name || "Organizacao";
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `ROPA_${orgName.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.zip`;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("end", () => {
      resolve({ buffer: Buffer.concat(chunks), filename });
    });
    archive.on("error", reject);

    const readme = `# ROPA - Registro de Operações de Tratamento
Organização: ${orgName}
Data de Exportação: ${new Date().toLocaleDateString("pt-BR")}
Total de Registros: ${rots.length}

## Conteúdo
Este arquivo contém todos os documentos de mapeamento de dados pessoais da organização.

## Estrutura de Pastas
- /ROT/ - Registros de Operações de Tratamento
- /POP/ - Procedimentos Operacionais Padrão
- /Resumo/ - Documentos consolidados
`;
    archive.append(readme, { name: "README.md" });

    for (const rot of rots) {
      const rotContent = generateROTMarkdownForZip(rot);
      const rotFilename = `ROT/${rot.title?.replace(/[^a-zA-Z0-9]/g, "_") || `rot_${rot.id}`}.md`;
      archive.append(rotContent, { name: rotFilename });

      const popContent = generatePOPMarkdownForZip(rot);
      const popFilename = `POP/${rot.title?.replace(/[^a-zA-Z0-9]/g, "_") || `pop_${rot.id}`}_POP.md`;
      archive.append(popContent, { name: popFilename });
    }

    const summaryContent = generateSummaryMarkdownForZip(rots, orgName);
    archive.append(summaryContent, { name: "Resumo/ROPA_Consolidado.md" });

    const csvContent = generateROPACSVForZip(rots);
    archive.append(csvContent, { name: "Resumo/ROPA_Dados.csv" });

    archive.finalize();
  });
}

function generateROTMarkdownForZip(rot: any): string {
  const dataCategories = typeof rot.dataCategories === "string" 
    ? JSON.parse(rot.dataCategories || "[]") 
    : rot.dataCategories || [];
  const securityMeasures = typeof rot.securityMeasures === "string"
    ? JSON.parse(rot.securityMeasures || "[]")
    : rot.securityMeasures || [];

  return `# ROT - ${rot.title || "Sem título"}

## Informações Gerais
- **Departamento:** ${rot.department || "Não especificado"}
- **Status:** ${rot.status || "Rascunho"}
- **Nível de Risco:** ${rot.riskLevel || "Não avaliado"}

## Descrição
${rot.description || "Não especificada"}

## Categoria de Titular
${rot.titularCategory || "Não especificada"}

## Dados Tratados
${dataCategories.length > 0 
  ? dataCategories.map((d: any) => `- ${typeof d === "string" ? d : d.name}${d.sensivel ? " (Sensível)" : ""}`).join("\n")
  : "Nenhum dado especificado"}

## Base Legal
${rot.legalBase || "Não especificada"}

## Medidas de Segurança
${securityMeasures.length > 0 
  ? securityMeasures.map((m: string) => `- ${m}`).join("\n")
  : "Nenhuma medida especificada"}

---
*Documento gerado pelo Seusdados Due Diligence*
`;
}

function generatePOPMarkdownForZip(rot: any): string {
  return `# POP - ${rot.title || "Sem título"}

## 1. Objetivo
Estabelecer procedimentos para tratamento de dados pessoais na atividade "${rot.title}".

## 2. Escopo
Aplica-se ao departamento de ${rot.department || "não especificado"}.

## 3. Procedimento

### 3.1 Coleta
1. Verificar necessidade dos dados
2. Informar titular sobre finalidade
3. Obter consentimento quando necessário

### 3.2 Armazenamento
1. Armazenar em sistemas autorizados
2. Aplicar controles de acesso
3. Manter backup

### 3.3 Descarte
1. Eliminar após período de retenção
2. Usar métodos seguros
3. Documentar eliminação

---
*Documento gerado pelo Seusdados Due Diligence*
`;
}

function generateSummaryMarkdownForZip(rots: any[], orgName: string): string {
  const byDepartment: Record<string, number> = {};
  const byRisk: Record<string, number> = {};

  for (const rot of rots) {
    const dept = rot.department || "Não especificado";
    const risk = rot.riskLevel || "Não avaliado";
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    byRisk[risk] = (byRisk[risk] || 0) + 1;
  }

  return `# ROPA Consolidado - ${orgName}
Data: ${new Date().toLocaleDateString("pt-BR")}

## Resumo
- **Total:** ${rots.length} operações
- **Departamentos:** ${Object.keys(byDepartment).length}

## Por Departamento
${Object.entries(byDepartment).map(([d, c]) => `- ${d}: ${c}`).join("\n")}

## Por Risco
${Object.entries(byRisk).map(([r, c]) => `- ${r}: ${c}`).join("\n")}

## Lista

| Título | Departamento | Risco |
|--------|--------------|-------|
${rots.map(r => `| ${r.title || "N/A"} | ${r.department || "N/A"} | ${r.riskLevel || "N/A"} |`).join("\n")}

---
*Seusdados Due Diligence*
`;
}

function generateROPACSVForZip(rots: any[]): string {
  const headers = ["ID", "Título", "Departamento", "Base Legal", "Risco", "Status"];
  const rows = rots.map(rot => [
    rot.id,
    `"${(rot.title || "").replace(/"/g, '""')}"`,
    `"${(rot.department || "").replace(/"/g, '""')}"`,
    `"${(rot.legalBase || "").replace(/"/g, '""')}"`,
    rot.riskLevel || "",
    rot.status || ""
  ].join(","));

  return [headers.join(","), ...rows].join("\n");
}
