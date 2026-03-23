/**
 * Motor de Maturidade por Evidências
 * 
 * Serviço responsável por calcular indicadores de maturidade baseados em eventos
 * operacionais rastreáveis, com sugestão (não automática) de promoção de estágio.
 * 
 * Conforme especificação técnica v1.0
 */

import { getDb } from './db';
import { sql } from 'drizzle-orm';
import { logger } from './_core/logger';
import { TRPCError } from '@trpc/server';

// Tipos de módulos suportados
export type MaturityModule = 'checklist' | 'cppd' | 'dpia' | 'contratos' | 'mapeamentos' | 'terceiros' | 'incidentes';

// Tipos de eventos
export type EventType = 'tarefa' | 'reuniao' | 'treinamento' | 'dpia' | 'contrato_risco' | 'mapeamento_area' | 'terceiro' | 'incidente';

// Níveis de risco
export type RiskLevel = 'baixo' | 'medio' | 'alto';

// Status de eventos
export type EventStatus = 'programado' | 'em_andamento' | 'pendente' | 'concluido' | 'bloqueado' | 'contido';

// Conformidade
export type Conformity = 'conforme' | 'parcialmente_conforme' | 'nao_conforme';

// Interface de evento
export interface MaturityEvent {
  event_id: string;
  tenant_id: string;
  module: MaturityModule;
  event_type: EventType;
  risk_level?: RiskLevel;
  area_id?: string;
  expected_date?: Date;
  start_date?: Date;
  end_date?: Date;
  status: EventStatus;
  conformity?: Conformity;
  planned_flag: boolean;
  executed_flag: boolean;
  evidence_link?: string;
  responsible_id?: string;
  metadata?: Record<string, any>;
}

// Interface de indicador calculado
export interface CalculatedIndicator {
  indicator_id: string;
  name: string;
  module: string;
  value: number;
  cutoff: number;
  cutoff_days?: number;
  is_passing: boolean;
  details: {
    numerator: number;
    denominator: number;
    formula: string;
  };
}

// Interface de resultado de maturidade
export interface MaturityResult {
  tenant_id: string;
  current_stage: number;
  indicators: CalculatedIndicator[];
  blocking_reasons: string[];
  can_suggest_promotion: boolean;
  trend: {
    period1: number;
    period2: number;
    period3: number;
    direction: 'up' | 'down' | 'stable';
  };
  calculated_at: Date;
}

// Janela padrão de 90 dias
const DEFAULT_WINDOW_DAYS = 90;

/**
 * Calcula a data de início da janela de análise
 */
function getWindowStartDate(windowDays: number = DEFAULT_WINDOW_DAYS): Date {
  const date = new Date();
  date.setDate(date.getDate() - windowDays);
  return date;
}

/**
 * Formata data para SQL
 */
function formatDateForSQL(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calcula a taxa de execução planejada (global)
 * execucao = eventos_concluidos_planejados / eventos_planejados
 */
export async function calculateExecutionRate(tenantId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<CalculatedIndicator> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const windowStart = formatDateForSQL(getWindowStartDate(windowDays));

  const result = await db.execute(sql`
    SELECT 
      COUNT(CASE WHEN status = 'concluido' AND planned_flag = 1 THEN 1 END) as concluidos_planejados,
      COUNT(CASE WHEN planned_flag = 1 THEN 1 END) as planejados
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND created_at >= ${windowStart}
  `);

  const rows = (result as unknown as any[][])[0] || [];
  const data = rows[0] || { concluidos_planejados: 0, planejados: 0 };
  
  const numerator = Number(data.concluidos_planejados) || 0;
  const denominator = Number(data.planejados) || 1;
  const value = denominator > 0 ? numerator / denominator : 0;
  const cutoff = 0.85;

  return {
    indicator_id: 'execucao_planejada',
    name: 'Taxa de Execução Planejada',
    module: 'global',
    value,
    cutoff,
    is_passing: value >= cutoff,
    details: {
      numerator,
      denominator,
      formula: 'concluidos_planejados / planejados'
    }
  };
}

/**
 * Calcula o tempo médio de fechamento de ações CPPD
 * tempo_medio = média(end_date - start_date)
 */
export async function calculateCppdClosingTime(tenantId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<CalculatedIndicator> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const windowStart = formatDateForSQL(getWindowStartDate(windowDays));

  const result = await db.execute(sql`
    SELECT 
      AVG(end_date::date - start_date::date) as tempo_medio,
      COUNT(*) as total
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'cppd'
      AND event_type = 'tarefa'
      AND status = 'concluido'
      AND start_date IS NOT NULL
      AND end_date IS NOT NULL
      AND created_at >= ${windowStart}
  `);

  const rows = (result as unknown as any[][])[0] || [];
  const data = rows[0] || { tempo_medio: null, total: 0 };
  
  const value = Number(data.tempo_medio) || 0;
  const cutoff_days = 30;

  return {
    indicator_id: 'tempo_fechamento_cppd',
    name: 'Tempo Médio de Fechamento CPPD',
    module: 'cppd',
    value,
    cutoff: 0,
    cutoff_days,
    is_passing: value <= cutoff_days,
    details: {
      numerator: value,
      denominator: Number(data.total) || 0,
      formula: 'avg(end_date - start_date)'
    }
  };
}

/**
 * Calcula a taxa de reuniões realizadas CPPD
 * reunioes = realizadas / programadas
 */
export async function calculateCppdMeetings(tenantId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<CalculatedIndicator> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const windowStart = formatDateForSQL(getWindowStartDate(windowDays));

  const result = await db.execute(sql`
    SELECT 
      COUNT(CASE WHEN status = 'concluido' THEN 1 END) as realizadas,
      COUNT(*) as programadas
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'cppd'
      AND event_type = 'reuniao'
      AND created_at >= ${windowStart}
  `);

  const rows = (result as unknown as any[][])[0] || [];
  const data = rows[0] || { realizadas: 0, programadas: 0 };
  
  const numerator = Number(data.realizadas) || 0;
  const denominator = Number(data.programadas) || 1;
  const value = denominator > 0 ? numerator / denominator : 0;
  const cutoff = 0.90;

  return {
    indicator_id: 'reunioes_cppd',
    name: 'Reuniões Realizadas CPPD',
    module: 'cppd',
    value,
    cutoff,
    is_passing: value >= cutoff,
    details: {
      numerator,
      denominator,
      formula: 'realizadas / programadas'
    }
  };
}

/**
 * Calcula a cobertura de DPIA para processos de alto risco
 * dpia_cobertura = dpias_concluidos_alto_risco / total_processos_alto_risco
 */
export async function calculateDpiaHighRiskCoverage(tenantId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<CalculatedIndicator> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const windowStart = formatDateForSQL(getWindowStartDate(windowDays));

  const result = await db.execute(sql`
    SELECT 
      COUNT(CASE WHEN status = 'concluido' THEN 1 END) as concluidos,
      COUNT(*) as total
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'dpia'
      AND event_type = 'dpia'
      AND risk_level = 'alto'
      AND created_at >= ${windowStart}
  `);

  const rows = (result as unknown as any[][])[0] || [];
  const data = rows[0] || { concluidos: 0, total: 0 };
  
  const numerator = Number(data.concluidos) || 0;
  const denominator = Number(data.total) || 1;
  const value = denominator > 0 ? numerator / denominator : 0;
  const cutoff = 0.80;

  return {
    indicator_id: 'dpia_risco_alto',
    name: 'Cobertura DPIA Risco Alto',
    module: 'dpia',
    value,
    cutoff,
    is_passing: value >= cutoff,
    details: {
      numerator,
      denominator,
      formula: 'dpia_concluido_alto / total_alto'
    }
  };
}

/**
 * Calcula o tratamento de contratos críticos
 * tratamento = planos_executados / planos_programados
 */
export async function calculateCriticalContractsTreatment(tenantId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<CalculatedIndicator> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const windowStart = formatDateForSQL(getWindowStartDate(windowDays));

  const result = await db.execute(sql`
    SELECT 
      COUNT(CASE WHEN status = 'concluido' THEN 1 END) as executados,
      COUNT(*) as programados
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'contratos'
      AND event_type = 'contrato_risco'
      AND risk_level = 'alto'
      AND created_at >= ${windowStart}
  `);

  const rows = (result as unknown as any[][])[0] || [];
  const data = rows[0] || { executados: 0, programados: 0 };
  
  const numerator = Number(data.executados) || 0;
  const denominator = Number(data.programados) || 1;
  const value = denominator > 0 ? numerator / denominator : 0;
  const cutoff = 0.70;

  return {
    indicator_id: 'contratos_alto_risco',
    name: 'Tratamento Contratos Críticos',
    module: 'contratos',
    value,
    cutoff,
    is_passing: value >= cutoff,
    details: {
      numerator,
      denominator,
      formula: 'planos_executados / planos_programados'
    }
  };
}

/**
 * Calcula a cobertura de mapeamentos por área
 * mapeamento = areas_mapeadas / areas_existentes
 */
export async function calculateMappingCoverage(tenantId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<CalculatedIndicator> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar total de áreas
  const areasResult = await db.execute(sql`
    SELECT COUNT(*) as total_areas
    FROM sd_areas
    WHERE tenant_id = ${tenantId}
  `);

  const areasRows = (areasResult as unknown as any[][])[0] || [];
  const totalAreas = Number(areasRows[0]?.total_areas) || 1;

  const windowStart = formatDateForSQL(getWindowStartDate(windowDays));

  // Buscar áreas com mapeamento concluído
  const mappedResult = await db.execute(sql`
    SELECT COUNT(DISTINCT area_id) as areas_mapeadas
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'mapeamentos'
      AND event_type = 'mapeamento_area'
      AND status = 'concluido'
      AND area_id IS NOT NULL
      AND created_at >= ${windowStart}
  `);

  const mappedRows = (mappedResult as unknown as any[][])[0] || [];
  const areasMapeadas = Number(mappedRows[0]?.areas_mapeadas) || 0;

  const value = totalAreas > 0 ? areasMapeadas / totalAreas : 0;
  const cutoff = 0.80;

  return {
    indicator_id: 'mapeamento_cobertura',
    name: 'Cobertura de Mapeamentos',
    module: 'mapeamentos',
    value,
    cutoff,
    is_passing: value >= cutoff,
    details: {
      numerator: areasMapeadas,
      denominator: totalAreas,
      formula: 'areas_mapeadas / areas_existentes'
    }
  };
}

/**
 * Calcula as correções efetivadas de terceiros
 * terceiros = correcoes_realizadas / correcoes_propostas
 */
export async function calculateThirdPartyCorrections(tenantId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<CalculatedIndicator> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const windowStart = formatDateForSQL(getWindowStartDate(windowDays));

  const result = await db.execute(sql`
    SELECT 
      COUNT(CASE WHEN status = 'concluido' THEN 1 END) as realizadas,
      COUNT(*) as propostas
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'terceiros'
      AND event_type = 'terceiro'
      AND risk_level IN ('medio', 'alto')
      AND created_at >= ${windowStart}
  `);

  const rows = (result as unknown as any[][])[0] || [];
  const data = rows[0] || { realizadas: 0, propostas: 0 };
  
  const numerator = Number(data.realizadas) || 0;
  const denominator = Number(data.propostas) || 1;
  const value = denominator > 0 ? numerator / denominator : 0;
  const cutoff = 0.70;

  return {
    indicator_id: 'terceiros_correcoes',
    name: 'Correções de Terceiros',
    module: 'terceiros',
    value,
    cutoff,
    is_passing: value >= cutoff,
    details: {
      numerator,
      denominator,
      formula: 'correcoes_realizadas / correcoes_propostas'
    }
  };
}

/**
 * Verifica se há incidentes de alto risco não contidos (regra de bloqueio)
 */
export async function checkBlockingIncidents(tenantId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<{ blocked: boolean; reasons: string[] }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const windowStart = formatDateForSQL(getWindowStartDate(windowDays));

  const result = await db.execute(sql`
    SELECT event_id, status, created_at
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'incidentes'
      AND event_type = 'incidente'
      AND risk_level = 'alto'
      AND status != 'contido'
      AND created_at >= ${windowStart}
  `);

  const rows = (result as unknown as any[][])[0] || [];
  
  if (rows.length > 0) {
    return {
      blocked: true,
      reasons: rows.map((r: any) => `Incidente de alto risco não contido (ID: ${r.event_id}, Status: ${r.status})`)
    };
  }

  return { blocked: false, reasons: [] };
}

/**
 * Obtém o estágio atual de maturidade do tenant
 */
export async function getCurrentMaturityStage(tenantId: string): Promise<{ current_stage: number; previous_stage: number | null }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db.execute(sql`
    SELECT current_stage, previous_stage
    FROM sd_maturity_stage
    WHERE tenant_id = ${tenantId}
  `);

  const rows = (result as unknown as any[][])[0] || [];
  
  if (rows.length === 0) {
    // Criar registro inicial
    await db.execute(sql`
      INSERT INTO sd_maturity_stage (tenant_id, current_stage, last_updated)
      VALUES (${tenantId}, 1, CURRENT_DATE)
    `);
    return { current_stage: 1, previous_stage: null };
  }

  return {
    current_stage: rows[0].current_stage,
    previous_stage: rows[0].previous_stage
  };
}

/**
 * Calcula todos os indicadores de maturidade para um tenant
 */
export async function calculateAllIndicators(tenantId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<MaturityResult> {
  const [
    executionRate,
    cppdClosingTime,
    cppdMeetings,
    dpiaHighRisk,
    criticalContracts,
    mappingCoverage,
    thirdPartyCorrections,
    blockingCheck,
    maturityStage
  ] = await Promise.all([
    calculateExecutionRate(tenantId, windowDays),
    calculateCppdClosingTime(tenantId, windowDays),
    calculateCppdMeetings(tenantId, windowDays),
    calculateDpiaHighRiskCoverage(tenantId, windowDays),
    calculateCriticalContractsTreatment(tenantId, windowDays),
    calculateMappingCoverage(tenantId, windowDays),
    calculateThirdPartyCorrections(tenantId, windowDays),
    checkBlockingIncidents(tenantId, windowDays),
    getCurrentMaturityStage(tenantId)
  ]);

  const indicators = [
    executionRate,
    cppdClosingTime,
    cppdMeetings,
    dpiaHighRisk,
    criticalContracts,
    mappingCoverage,
    thirdPartyCorrections
  ];

  // Verificar se todos os indicadores estão passando
  const allPassing = indicators.every(i => i.is_passing);
  
  // Pode sugerir promoção se todos passarem E não houver bloqueios
  const canSuggestPromotion = allPassing && !blockingCheck.blocked;

  // Calcular tendência (simplificado - em produção seria baseado em histórico real)
  const trend = {
    period1: indicators.filter(i => i.is_passing).length / indicators.length,
    period2: indicators.filter(i => i.is_passing).length / indicators.length,
    period3: indicators.filter(i => i.is_passing).length / indicators.length,
    direction: 'stable' as 'up' | 'down' | 'stable'
  };

  return {
    tenant_id: tenantId,
    current_stage: maturityStage.current_stage,
    indicators,
    blocking_reasons: blockingCheck.reasons,
    can_suggest_promotion: canSuggestPromotion,
    trend,
    calculated_at: new Date()
  };
}

/**
 * Registra uma decisão de promoção de maturidade
 */
export async function recordMaturityDecision(
  tenantId: string,
  newStage: number,
  approvedBy: string,
  approvedByName: string,
  justification: string,
  evidenceLinks: string[],
  indicatorsSnapshot: CalculatedIndicator[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const currentStage = await getCurrentMaturityStage(tenantId);

  // Registrar no log de decisões
  await db.execute(sql`
    INSERT INTO sd_maturity_decision_log 
    (tenant_id, previous_stage, new_stage, approved_by, approved_by_name, justification, evidence_links, indicators_snapshot)
    VALUES (
      ${tenantId},
      ${currentStage.current_stage},
      ${newStage},
      ${approvedBy},
      ${approvedByName},
      ${justification},
      ${JSON.stringify(evidenceLinks)},
      ${JSON.stringify(indicatorsSnapshot)}
    )
  `);

  // Atualizar estágio atual
  await db.execute(sql`
    UPDATE sd_maturity_stage
    SET previous_stage = current_stage,
        current_stage = ${newStage},
        last_updated = CURRENT_DATE
    WHERE tenant_id = ${tenantId}
  `);
}

/**
 * Cria um novo evento de maturidade
 */
export async function createMaturityEvent(event: Omit<MaturityEvent, 'event_id'>): Promise<string> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const eventId = crypto.randomUUID();

  await db.execute(sql`
    INSERT INTO sd_events (
      event_id, tenant_id, module, event_type, risk_level, area_id,
      expected_date, start_date, end_date, status, conformity,
      planned_flag, executed_flag, evidence_link, responsible_id, metadata
    ) VALUES (
      ${eventId},
      ${event.tenant_id},
      ${event.module},
      ${event.event_type},
      ${event.risk_level || null},
      ${event.area_id || null},
      ${event.expected_date ? formatDateForSQL(event.expected_date) : null},
      ${event.start_date ? formatDateForSQL(event.start_date) : null},
      ${event.end_date ? formatDateForSQL(event.end_date) : null},
      ${event.status},
      ${event.conformity || null},
      ${event.planned_flag ? 1 : 0},
      ${event.executed_flag ? 1 : 0},
      ${event.evidence_link || null},
      ${event.responsible_id || null},
      ${event.metadata ? JSON.stringify(event.metadata) : null}
    )
  `);

  return eventId;
}

/**
 * Atualiza um evento existente
 */
export async function updateMaturityEvent(eventId: string, updates: Partial<MaturityEvent>): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Using parameterized query to prevent SQL injection
  await db.execute(sql`
    UPDATE sd_events SET
      status = COALESCE(${updates.status ?? null}, status),
      end_date = COALESCE(${updates.end_date ? formatDateForSQL(updates.end_date) : null}, end_date),
      executed_flag = COALESCE(${updates.executed_flag !== undefined ? (updates.executed_flag ? 1 : 0) : null}, executed_flag),
      evidence_link = COALESCE(${updates.evidence_link ?? null}, evidence_link),
      conformity = COALESCE(${updates.conformity ?? null}, conformity)
    WHERE event_id = ${eventId}
  `);
}

/**
 * Lista eventos de um tenant com filtros
 */
export async function listEvents(
  tenantId: string,
  filters?: {
    module?: MaturityModule;
    event_type?: EventType;
    status?: EventStatus;
    risk_level?: RiskLevel;
    from_date?: Date;
    to_date?: Date;
  }
): Promise<MaturityEvent[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Using parameterized query to prevent SQL injection
  const result = await db.execute(sql`
    SELECT * FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND (${filters?.module ?? null} IS NULL OR module = ${filters?.module ?? null})
      AND (${filters?.event_type ?? null} IS NULL OR event_type = ${filters?.event_type ?? null})
      AND (${filters?.status ?? null} IS NULL OR status = ${filters?.status ?? null})
      AND (${filters?.risk_level ?? null} IS NULL OR risk_level = ${filters?.risk_level ?? null})
      AND (${filters?.from_date ? formatDateForSQL(filters.from_date) : null} IS NULL OR created_at >= ${filters?.from_date ? formatDateForSQL(filters.from_date) : null})
      AND (${filters?.to_date ? formatDateForSQL(filters.to_date) : null} IS NULL OR created_at <= ${filters?.to_date ? formatDateForSQL(filters.to_date) : null})
    ORDER BY created_at DESC
    LIMIT 1000
  `);

  return ((result as unknown as any[][])[0] || []).map(row => ({
    ...row,
    planned_flag: Boolean(row.planned_flag),
    executed_flag: Boolean(row.executed_flag),
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined
  }));
}

/**
 * Obtém histórico de decisões de maturidade
 */
export async function getMaturityDecisionHistory(tenantId: string): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db.execute(sql`
    SELECT *
    FROM sd_maturity_decision_log
    WHERE tenant_id = ${tenantId}
    ORDER BY decision_date DESC
  `);

  return ((result as unknown as any[][])[0] || []).map(row => ({
    ...row,
    evidence_links: row.evidence_links ? JSON.parse(row.evidence_links) : [],
    indicators_snapshot: row.indicators_snapshot ? JSON.parse(row.indicators_snapshot) : []
  }));
}
