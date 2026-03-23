/**
 * Motor de Maturidade por Evidências
 * Serviço de cálculo de indicadores de maturidade baseado em eventos
 * 
 * Princípio: tudo o que impacta maturidade deve virar evento padronizado.
 * Indicadores não leem módulos diretamente, apenas eventos.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { ENV } from "./_core/env";
import { sql } from "drizzle-orm";

// Conexão lazy para queries SQL raw
let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool() {
  if (!ENV.databaseUrl) return null;
  if (!_pool) {
    _pool = new pg.Pool({ connectionString: ENV.databaseUrl, ssl: { rejectUnauthorized: false } });
    _db = drizzle(_pool);
  }
  return _pool;
}

function requireDb() {
  getPool();
  if (!_db) throw new Error("DATABASE_URL not configured");
  return _db;
}

// Keep `db` as a proxy getter for backward compat within this file
const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (requireDb() as any)[prop];
  },
});

// Tipos para os indicadores
export interface IndicatorResult {
  indicatorId: string;
  name: string;
  module: string;
  calculatedValue: number | null;
  cutoff: number | null;
  cutoffDays: number | null;
  passed: boolean;
  eventsCount: number;
  windowStart: string;
  windowEnd: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface MaturityEvaluation {
  tenantId: number;
  currentStage: number;
  indicators: IndicatorResult[];
  suggestedPromotion: boolean;
  promotionBlockedReason: string | null;
  blockingIncidents: number;
  overallScore: number;
  evaluatedAt: string;
}

// Janela padrão de 90 dias
const DEFAULT_WINDOW_DAYS = 90;

/**
 * Calcula a data de início da janela de análise
 */
function getWindowStart(windowDays: number = DEFAULT_WINDOW_DAYS): string {
  const date = new Date();
  date.setDate(date.getDate() - windowDays);
  return date.toISOString().split('T')[0];
}

/**
 * Calcula a data de fim da janela de análise (hoje)
 */
function getWindowEnd(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calcula a taxa de execução planejada
 * execucao = eventos_concluidos_planejados / eventos_planejados
 */
export async function calculateExecutionRate(tenantId: number, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<IndicatorResult> {
  const windowStart = getWindowStart(windowDays);
  const windowEnd = getWindowEnd();
  
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total_planejados,
      SUM(CASE WHEN status = 'concluido' AND executed_flag = 1 THEN 1 ELSE 0 END) as concluidos_planejados
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND planned_flag = 1
      AND created_at >= ${windowStart}
      AND created_at <= ${windowEnd}
  `);
  
  const row = (result as any)[0]?.[0] || { total_planejados: 0, concluidos_planejados: 0 };
  const totalPlanejados = Number(row.total_planejados) || 0;
  const concluidosPlanejados = Number(row.concluidos_planejados) || 0;
  
  const calculatedValue = totalPlanejados > 0 ? concluidosPlanejados / totalPlanejados : null;
  const cutoff = 0.85;
  
  return {
    indicatorId: 'execucao_planejada',
    name: 'Taxa de Execução Planejada',
    module: 'global',
    calculatedValue,
    cutoff,
    cutoffDays: null,
    passed: calculatedValue !== null && calculatedValue >= cutoff,
    eventsCount: totalPlanejados,
    windowStart,
    windowEnd,
  };
}

/**
 * Calcula o tempo médio de fechamento de ações CPPD
 * tempo_medio = média(end_date - start_date)
 */
export async function calculateCppdClosingTime(tenantId: number, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<IndicatorResult> {
  const windowStart = getWindowStart(windowDays);
  const windowEnd = getWindowEnd();
  
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      AVG(end_date::date - start_date::date) as tempo_medio
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'cppd'
      AND event_type = 'tarefa'
      AND status = 'concluido'
      AND end_date IS NOT NULL
      AND start_date IS NOT NULL
      AND created_at >= ${windowStart}
      AND created_at <= ${windowEnd}
  `);
  
  const row = (result as any)[0]?.[0] || { total: 0, tempo_medio: null };
  const total = Number(row.total) || 0;
  const tempoMedio = row.tempo_medio !== null ? Number(row.tempo_medio) : null;
  
  const cutoffDays = 30;
  
  return {
    indicatorId: 'tempo_fechamento_cppd',
    name: 'Tempo Médio de Fechamento CPPD',
    module: 'cppd',
    calculatedValue: tempoMedio,
    cutoff: null,
    cutoffDays,
    passed: tempoMedio !== null && tempoMedio <= cutoffDays,
    eventsCount: total,
    windowStart,
    windowEnd,
  };
}

/**
 * Calcula a taxa de reuniões CPPD realizadas
 * reunioes = realizadas / programadas
 */
export async function calculateCppdMeetings(tenantId: number, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<IndicatorResult> {
  const windowStart = getWindowStart(windowDays);
  const windowEnd = getWindowEnd();
  
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total_programadas,
      SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) as realizadas
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'cppd'
      AND event_type = 'reuniao'
      AND created_at >= ${windowStart}
      AND created_at <= ${windowEnd}
  `);
  
  const row = (result as any)[0]?.[0] || { total_programadas: 0, realizadas: 0 };
  const totalProgramadas = Number(row.total_programadas) || 0;
  const realizadas = Number(row.realizadas) || 0;
  
  const calculatedValue = totalProgramadas > 0 ? realizadas / totalProgramadas : null;
  const cutoff = 0.90;
  
  return {
    indicatorId: 'reunioes_cppd',
    name: 'Reuniões CPPD Realizadas',
    module: 'cppd',
    calculatedValue,
    cutoff,
    cutoffDays: null,
    passed: calculatedValue !== null && calculatedValue >= cutoff,
    eventsCount: totalProgramadas,
    windowStart,
    windowEnd,
  };
}

/**
 * Calcula a cobertura de DPIA para processos de alto risco
 * dpia_cobertura = dpias_concluidos_alto_risco / total_processos_alto_risco
 */
export async function calculateDpiaHighRiskCoverage(tenantId: number, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<IndicatorResult> {
  const windowStart = getWindowStart(windowDays);
  const windowEnd = getWindowEnd();
  
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total_alto_risco,
      SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) as concluidos
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'dpia'
      AND event_type = 'dpia'
      AND risk_level = 'alto'
      AND created_at >= ${windowStart}
      AND created_at <= ${windowEnd}
  `);
  
  const row = (result as any)[0]?.[0] || { total_alto_risco: 0, concluidos: 0 };
  const totalAltoRisco = Number(row.total_alto_risco) || 0;
  const concluidos = Number(row.concluidos) || 0;
  
  const calculatedValue = totalAltoRisco > 0 ? concluidos / totalAltoRisco : null;
  const cutoff = 0.80;
  
  return {
    indicatorId: 'dpia_risco_alto',
    name: 'Cobertura DPIA Risco Alto',
    module: 'dpia',
    calculatedValue,
    cutoff,
    cutoffDays: null,
    passed: calculatedValue !== null && calculatedValue >= cutoff,
    eventsCount: totalAltoRisco,
    windowStart,
    windowEnd,
  };
}

/**
 * Calcula o tratamento de contratos de alto risco
 * tratamento = planos_executados / planos_programados
 */
export async function calculateHighRiskContracts(tenantId: number, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<IndicatorResult> {
  const windowStart = getWindowStart(windowDays);
  const windowEnd = getWindowEnd();
  
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total_programados,
      SUM(CASE WHEN status = 'concluido' AND executed_flag = 1 THEN 1 ELSE 0 END) as executados
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'contratos'
      AND event_type = 'contrato_risco'
      AND risk_level = 'alto'
      AND created_at >= ${windowStart}
      AND created_at <= ${windowEnd}
  `);
  
  const row = (result as any)[0]?.[0] || { total_programados: 0, executados: 0 };
  const totalProgramados = Number(row.total_programados) || 0;
  const executados = Number(row.executados) || 0;
  
  const calculatedValue = totalProgramados > 0 ? executados / totalProgramados : null;
  const cutoff = 0.70;
  
  return {
    indicatorId: 'contratos_alto_risco',
    name: 'Tratamento Contratos Alto Risco',
    module: 'contratos',
    calculatedValue,
    cutoff,
    cutoffDays: null,
    passed: calculatedValue !== null && calculatedValue >= cutoff,
    eventsCount: totalProgramados,
    windowStart,
    windowEnd,
  };
}

/**
 * Calcula a cobertura de mapeamentos por área
 * mapeamento = areas_mapeadas / areas_existentes
 */
export async function calculateMappingCoverage(tenantId: number, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<IndicatorResult> {
  const windowStart = getWindowStart(windowDays);
  const windowEnd = getWindowEnd();
  
  // Conta áreas existentes
  const areasResult = await db.execute(sql`
    SELECT COUNT(*) as total_areas
    FROM sd_areas
    WHERE tenant_id = ${tenantId}
      AND is_active = 1
  `);
  
  const totalAreas = Number((areasResult as any)[0]?.[0]?.total_areas) || 0;
  
  // Conta áreas com mapeamento concluído
  const mappedResult = await db.execute(sql`
    SELECT COUNT(DISTINCT area_id) as areas_mapeadas
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'mapeamentos'
      AND event_type = 'mapeamento_area'
      AND status = 'concluido'
      AND area_id IS NOT NULL
      AND created_at >= ${windowStart}
      AND created_at <= ${windowEnd}
  `);
  
  const areasMapeadas = Number((mappedResult as any)[0]?.[0]?.areas_mapeadas) || 0;
  
  const calculatedValue = totalAreas > 0 ? areasMapeadas / totalAreas : null;
  const cutoff = 0.80;
  
  return {
    indicatorId: 'mapeamento_cobertura',
    name: 'Cobertura de Mapeamentos',
    module: 'mapeamentos',
    calculatedValue,
    cutoff,
    cutoffDays: null,
    passed: calculatedValue !== null && calculatedValue >= cutoff,
    eventsCount: totalAreas,
    windowStart,
    windowEnd,
  };
}

/**
 * Calcula as correções efetivadas em terceiros
 * terceiros = correcoes_realizadas / correcoes_propostas
 */
export async function calculateThirdPartyCorrections(tenantId: number, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<IndicatorResult> {
  const windowStart = getWindowStart(windowDays);
  const windowEnd = getWindowEnd();
  
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total_propostas,
      SUM(CASE WHEN status = 'concluido' AND executed_flag = 1 THEN 1 ELSE 0 END) as realizadas
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'terceiros'
      AND event_type = 'terceiro'
      AND risk_level IN ('medio', 'alto')
      AND created_at >= ${windowStart}
      AND created_at <= ${windowEnd}
  `);
  
  const row = (result as any)[0]?.[0] || { total_propostas: 0, realizadas: 0 };
  const totalPropostas = Number(row.total_propostas) || 0;
  const realizadas = Number(row.realizadas) || 0;
  
  const calculatedValue = totalPropostas > 0 ? realizadas / totalPropostas : null;
  const cutoff = 0.70;
  
  return {
    indicatorId: 'terceiros_correcoes',
    name: 'Correções de Terceiros',
    module: 'terceiros',
    calculatedValue,
    cutoff,
    cutoffDays: null,
    passed: calculatedValue !== null && calculatedValue >= cutoff,
    eventsCount: totalPropostas,
    windowStart,
    windowEnd,
  };
}

/**
 * Verifica se há incidentes de alto risco não contidos (bloqueador)
 * SE existir incidente_alto AND status != contido ENTÃO bloquear_sugestao = true
 */
export async function checkBlockingIncidents(tenantId: number, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<{ blocked: boolean; count: number; reason: string | null }> {
  const windowStart = getWindowStart(windowDays);
  const windowEnd = getWindowEnd();
  
  const result = await db.execute(sql`
    SELECT COUNT(*) as incidentes_abertos
    FROM sd_events
    WHERE tenant_id = ${tenantId}
      AND module = 'incidentes'
      AND event_type = 'incidente'
      AND risk_level = 'alto'
      AND status NOT IN ('concluido', 'bloqueado')
      AND created_at >= ${windowStart}
      AND created_at <= ${windowEnd}
  `);
  
  const count = Number((result as any)[0]?.[0]?.incidentes_abertos) || 0;
  
  return {
    blocked: count > 0,
    count,
    reason: count > 0 ? `Existem ${count} incidente(s) de alto risco não contido(s)` : null,
  };
}

/**
 * Avalia a maturidade completa de uma organização
 */
export async function evaluateMaturity(tenantId: number): Promise<MaturityEvaluation> {
  // Calcula todos os indicadores
  const indicators = await Promise.all([
    calculateExecutionRate(tenantId),
    calculateCppdClosingTime(tenantId),
    calculateCppdMeetings(tenantId),
    calculateDpiaHighRiskCoverage(tenantId),
    calculateHighRiskContracts(tenantId),
    calculateMappingCoverage(tenantId),
    calculateThirdPartyCorrections(tenantId),
  ]);
  
  // Verifica incidentes bloqueadores
  const blockingCheck = await checkBlockingIncidents(tenantId);
  
  // Obtém o estágio atual
  const stageResult = await db.execute(sql`
    SELECT current_stage FROM sd_maturity_stage WHERE tenant_id = ${tenantId}
  `);
  const currentStage = Number((stageResult as any)[0]?.[0]?.current_stage) || 1;
  
  // Calcula se pode sugerir promoção
  // A sugestão aparece se TODAS forem verdadeiras:
  // - Execução ≥ corte
  // - Governança dentro do prazo
  // - DPIA risco alto ≥ corte
  // - Contratos críticos tratados
  // - Terceiros críticos controlados
  // - Nenhum incidente alto não contido
  
  const allIndicatorsPassed = indicators.every(ind => {
    // Se não há dados suficientes, não bloqueia
    if (ind.calculatedValue === null && ind.eventsCount === 0) return true;
    return ind.passed;
  });
  
  const suggestedPromotion = allIndicatorsPassed && !blockingCheck.blocked;
  
  // Calcula score geral (média ponderada dos indicadores que têm valor)
  const validIndicators = indicators.filter(ind => ind.calculatedValue !== null);
  const overallScore = validIndicators.length > 0
    ? validIndicators.reduce((sum, ind) => {
        if (ind.cutoff) {
          return sum + (ind.calculatedValue! / ind.cutoff);
        } else if (ind.cutoffDays && ind.calculatedValue !== null) {
          // Para indicadores de tempo, inverte a lógica (menor é melhor)
          return sum + (ind.cutoffDays / Math.max(ind.calculatedValue, 1));
        }
        return sum;
      }, 0) / validIndicators.length
    : 0;
  
  return {
    tenantId,
    currentStage,
    indicators,
    suggestedPromotion,
    promotionBlockedReason: blockingCheck.reason,
    blockingIncidents: blockingCheck.count,
    overallScore: Math.min(overallScore, 1) * 100, // Normaliza para 0-100
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Registra um evento no motor de maturidade
 */
export async function registerEvent(event: {
  tenantId: number;
  module: 'checklist' | 'cppd' | 'dpia' | 'contratos' | 'mapeamentos' | 'terceiros' | 'incidentes';
  eventType: 'tarefa' | 'reuniao' | 'treinamento' | 'dpia' | 'contrato_risco' | 'mapeamento_area' | 'terceiro' | 'incidente';
  riskLevel?: 'baixo' | 'medio' | 'alto';
  areaId?: number;
  entityId?: number;
  entityType?: string;
  expectedDate?: string;
  startDate?: string;
  endDate?: string;
  status?: 'programado' | 'em_andamento' | 'pendente' | 'concluido' | 'bloqueado';
  conformity?: 'conforme' | 'parcialmente_conforme' | 'nao_conforme';
  plannedFlag?: boolean;
  executedFlag?: boolean;
  evidenceLink?: string;
  responsibleId?: number;
  createdById?: number;
  metadata?: any;
}): Promise<number> {
  const eventId = crypto.randomUUID();
  
  const result = await db.execute(sql`
    INSERT INTO sd_events (
      event_id, tenant_id, module, event_type, risk_level, area_id, entity_id, entity_type,
      expected_date, start_date, end_date, status, conformity, planned_flag, executed_flag,
      evidence_link, responsible_id, created_by_id, metadata
    ) VALUES (
      ${eventId},
      ${event.tenantId},
      ${event.module},
      ${event.eventType},
      ${event.riskLevel || null},
      ${event.areaId || null},
      ${event.entityId || null},
      ${event.entityType || null},
      ${event.expectedDate || null},
      ${event.startDate || null},
      ${event.endDate || null},
      ${event.status || 'programado'},
      ${event.conformity || null},
      ${event.plannedFlag !== false ? 1 : 0},
      ${event.executedFlag ? 1 : 0},
      ${event.evidenceLink || null},
      ${event.responsibleId || null},
      ${event.createdById || null},
      ${event.metadata ? JSON.stringify(event.metadata) : null}
    ) RETURNING id
  `);
  
  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id ?? 0;
}

/**
 * Atualiza o status de um evento existente
 */
export async function updateEventStatus(
  eventId: number,
  status: 'programado' | 'em_andamento' | 'pendente' | 'concluido' | 'bloqueado',
  endDate?: string,
  executedFlag?: boolean
): Promise<void> {
  await db.execute(sql`
    UPDATE sd_events
    SET status = ${status},
        end_date = COALESCE(${endDate || null}, end_date),
        executed_flag = COALESCE(${executedFlag !== undefined ? (executedFlag ? 1 : 0) : null}, executed_flag),
        updated_at = NOW()
    WHERE id = ${eventId}
  `);
}

/**
 * Salva o histórico de um indicador calculado
 */
export async function saveIndicatorHistory(tenantId: number, indicator: IndicatorResult): Promise<void> {
  await db.execute(sql`
    INSERT INTO sd_indicator_history (
      tenant_id, indicator_id, calculated_value, cutoff, passed,
      window_start, window_end, events_count, metadata
    ) VALUES (
      ${tenantId},
      ${indicator.indicatorId},
      ${indicator.calculatedValue},
      ${indicator.cutoff},
      ${indicator.passed ? 1 : 0},
      ${indicator.windowStart},
      ${indicator.windowEnd},
      ${indicator.eventsCount},
      ${JSON.stringify({ name: indicator.name, module: indicator.module })}
    )
  `);
}

/**
 * Registra uma decisão de promoção de maturidade
 */
export async function recordMaturityDecision(
  tenantId: number,
  previousStage: number,
  newStage: number,
  approvedById: number,
  justification: string,
  evidenceLinks: string[],
  indicatorSnapshot: any
): Promise<void> {
  // Atualiza o estágio atual
  await db.execute(sql`
    INSERT INTO sd_maturity_stage (tenant_id, current_stage, previous_stage, last_updated, last_evaluated_at)
    VALUES (${tenantId}, ${newStage}, ${previousStage}, CURRENT_DATE, NOW())
    ON CONFLICT (tenant_id) DO UPDATE SET
      current_stage = EXCLUDED.current_stage,
      previous_stage = EXCLUDED.previous_stage,
      last_updated = CURRENT_DATE,
      last_evaluated_at = NOW(),
      suggested_promotion = false
  `);
  
  // Registra no log de decisões
  await db.execute(sql`
    INSERT INTO sd_maturity_decision_log (
      tenant_id, previous_stage, new_stage, decision_date, approved_by_id,
      justification, evidence_links, indicator_snapshot
    ) VALUES (
      ${tenantId},
      ${previousStage},
      ${newStage},
      NOW(),
      ${approvedById},
      ${justification},
      ${JSON.stringify(evidenceLinks)},
      ${JSON.stringify(indicatorSnapshot)}
    )
  `);
}
