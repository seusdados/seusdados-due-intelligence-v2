import { logger } from "./_core/logger";
/**
 * Serviço de Integração de Eventos de Maturidade
 * 
 * Este serviço é responsável por criar eventos automaticamente
 * quando ações são realizadas nos módulos do sistema, alimentando
 * os indicadores de maturidade LGPD.
 */

import { getDb } from './db';
import { sql } from 'drizzle-orm';

// Tipos de eventos por módulo
export const EVENT_TYPES = {
  // CPPD - Conformidade PPPD
  CPPD: {
    AVALIACAO_CRIADA: 'cppd_avaliacao_criada',
    AVALIACAO_CONCLUIDA: 'cppd_avaliacao_concluida',
    REUNIAO_AGENDADA: 'cppd_reuniao_agendada',
    REUNIAO_REALIZADA: 'cppd_reuniao_realizada',
    PLANO_ACAO_CRIADO: 'cppd_plano_acao_criado',
    PLANO_ACAO_CONCLUIDO: 'cppd_plano_acao_concluido',
  },
  // Contratos
  CONTRATOS: {
    ANALISE_INICIADA: 'contrato_analise_iniciada',
    ANALISE_CONCLUIDA: 'contrato_analise_concluida',
    RISCO_CRITICO_IDENTIFICADO: 'contrato_risco_critico',
    RISCO_TRATADO: 'contrato_risco_tratado',
    DPA_GERADO: 'contrato_dpa_gerado',
    DPA_APROVADO: 'contrato_dpa_aprovado',
    DPA_ASSINADO: 'contrato_dpa_assinado',
  },
  // Mapeamentos
  MAPEAMENTOS: {
    MAPEAMENTO_CRIADO: 'mapeamento_criado',
    MAPEAMENTO_CONCLUIDO: 'mapeamento_concluido',
    AREA_MAPEADA: 'mapeamento_area_mapeada',
    DPIA_NECESSARIO: 'mapeamento_dpia_necessario',
    DPIA_REALIZADO: 'mapeamento_dpia_realizado',
  },
  // Terceiros
  TERCEIROS: {
    AVALIACAO_CRIADA: 'terceiro_avaliacao_criada',
    AVALIACAO_CONCLUIDA: 'terceiro_avaliacao_concluida',
    RISCO_ALTO_IDENTIFICADO: 'terceiro_risco_alto',
    CORRECAO_SOLICITADA: 'terceiro_correcao_solicitada',
    CORRECAO_IMPLEMENTADA: 'terceiro_correcao_implementada',
  },
  // Governança
  GOVERNANCA: {
    REUNIAO_AGENDADA: 'governanca_reuniao_agendada',
    REUNIAO_REALIZADA: 'governanca_reuniao_realizada',
    DELIBERACAO_REGISTRADA: 'governanca_deliberacao',
    PLANO_MENSAL_CRIADO: 'governanca_plano_mensal',
    PLANO_MENSAL_EXECUTADO: 'governanca_plano_executado',
  },
  // Incidentes
  INCIDENTES: {
    INCIDENTE_REGISTRADO: 'incidente_registrado',
    INCIDENTE_TRATADO: 'incidente_tratado',
    INCIDENTE_COMUNICADO_ANPD: 'incidente_comunicado_anpd',
  },
  // Global
  GLOBAL: {
    TAREFA_PLANEJADA: 'tarefa_planejada',
    TAREFA_EXECUTADA: 'tarefa_executada',
  }
};

// Interface para criação de evento
interface CreateEventParams {
  tenantId: string;
  eventType: string;
  module: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  dueDate?: Date;
  status?: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado' | 'bloqueado';
}

/**
 * Cria um evento de maturidade no banco de dados
 */
export async function createMaturityEventInternal(params: CreateEventParams): Promise<{ id: string } | null> {
  const db = await getDb();
  if (!db) return null;

  const {
    tenantId,
    eventType,
    module,
    entityType,
    entityId,
    metadata = {},
    dueDate,
    status = 'pendente'
  } = params;

  try {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const dueDateStr = dueDate ? dueDate.toISOString().slice(0, 19).replace('T', ' ') : null;

    await db.execute(sql`
      INSERT INTO sd_events (
        id, tenant_id, event_type, module, entity_type, entity_id,
        metadata, status, due_date, created_at, updated_at
      ) VALUES (
        ${id}, ${tenantId}, ${eventType}, ${module}, ${entityType || null}, ${entityId || null},
        ${JSON.stringify(metadata)}, ${status}, ${dueDateStr}, ${now}, ${now}
      )
    `);

    return { id };
  } catch (error) {
    logger.error('[MaturityEventIntegration] Erro ao criar evento:', error);
    return null;
  }
}

/**
 * Atualiza o status de um evento existente
 */
export async function updateEventStatus(
  eventId: string,
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado' | 'bloqueado',
  completedAt?: Date
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const completedAtStr = completedAt ? completedAt.toISOString().slice(0, 19).replace('T', ' ') : null;

    if (status === 'concluido' && completedAtStr) {
      await db.execute(sql`
        UPDATE sd_events 
        SET status = ${status}, completed_at = ${completedAtStr}, updated_at = ${now}
        WHERE id = ${eventId}
      `);
    } else {
      await db.execute(sql`
        UPDATE sd_events 
        SET status = ${status}, updated_at = ${now}
        WHERE id = ${eventId}
      `);
    }

    return true;
  } catch (error) {
    logger.error('[MaturityEventIntegration] Erro ao atualizar evento:', error);
    return false;
  }
}

/**
 * Busca eventos por entidade (para verificar se já existe)
 */
export async function findEventByEntity(
  tenantId: string,
  entityType: string,
  entityId: string,
  eventType?: string
): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    let result;
    if (eventType) {
      result = await db.execute(sql`
        SELECT * FROM sd_events 
        WHERE tenant_id = ${tenantId} 
          AND entity_type = ${entityType} 
          AND entity_id = ${entityId}
          AND event_type = ${eventType}
        ORDER BY created_at DESC
        LIMIT 1
      `);
    } else {
      result = await db.execute(sql`
        SELECT * FROM sd_events 
        WHERE tenant_id = ${tenantId} 
          AND entity_type = ${entityType} 
          AND entity_id = ${entityId}
        ORDER BY created_at DESC
        LIMIT 1
      `);
    }

    const rows = result[0] as any[];
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    logger.error('[MaturityEventIntegration] Erro ao buscar evento:', error);
    return null;
  }
}

// ============================================
// FUNÇÕES DE INTEGRAÇÃO POR MÓDULO
// ============================================

/**
 * Registra evento quando uma avaliação CPPD é criada
 */
export async function onCppdAvaliacaoCriada(
  tenantId: string,
  avaliacaoId: string,
  framework: string
): Promise<void> {
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.CPPD.AVALIACAO_CRIADA,
    module: 'cppd',
    entityType: 'avaliacao_cppd',
    entityId: avaliacaoId,
    metadata: { framework },
    status: 'em_andamento'
  });
}

/**
 * Registra evento quando uma avaliação CPPD é concluída
 */
export async function onCppdAvaliacaoConcluida(
  tenantId: string,
  avaliacaoId: string,
  maturidadeMedia: number
): Promise<void> {
  // Atualizar evento existente ou criar novo
  const existingEvent = await findEventByEntity(
    tenantId,
    'avaliacao_cppd',
    avaliacaoId,
    EVENT_TYPES.CPPD.AVALIACAO_CRIADA
  );

  if (existingEvent) {
    await updateEventStatus(existingEvent.id, 'concluido', new Date());
  }

  // Criar evento de conclusão
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.CPPD.AVALIACAO_CONCLUIDA,
    module: 'cppd',
    entityType: 'avaliacao_cppd',
    entityId: avaliacaoId,
    metadata: { maturidadeMedia },
    status: 'concluido'
  });
}

/**
 * Registra evento quando uma reunião de governança é realizada
 */
export async function onReuniaoCppdRealizada(
  tenantId: string,
  reuniaoId: string,
  participantes: number
): Promise<void> {
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.CPPD.REUNIAO_REALIZADA,
    module: 'cppd',
    entityType: 'reuniao_cppd',
    entityId: reuniaoId,
    metadata: { participantes },
    status: 'concluido'
  });
}

/**
 * Registra evento quando uma análise de contrato é iniciada
 */
export async function onContratoAnaliseIniciada(
  tenantId: string,
  contratoId: string,
  nomeContrato: string
): Promise<void> {
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.CONTRATOS.ANALISE_INICIADA,
    module: 'contratos',
    entityType: 'contrato',
    entityId: contratoId,
    metadata: { nomeContrato },
    status: 'em_andamento'
  });
}

/**
 * Registra evento quando uma análise de contrato é concluída
 */
export async function onContratoAnaliseConcluida(
  tenantId: string,
  contratoId: string,
  riscoGeral: string,
  totalRiscos: number
): Promise<void> {
  // Atualizar evento de análise iniciada
  const existingEvent = await findEventByEntity(
    tenantId,
    'contrato',
    contratoId,
    EVENT_TYPES.CONTRATOS.ANALISE_INICIADA
  );

  if (existingEvent) {
    await updateEventStatus(existingEvent.id, 'concluido', new Date());
  }

  // Criar evento de conclusão
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.CONTRATOS.ANALISE_CONCLUIDA,
    module: 'contratos',
    entityType: 'contrato',
    entityId: contratoId,
    metadata: { riscoGeral, totalRiscos },
    status: 'concluido'
  });

  // Se houver risco crítico, criar evento específico
  if (riscoGeral === 'critico' || riscoGeral === 'alto' || riscoGeral === 'muito_critico') {
    await createMaturityEventInternal({
      tenantId,
      eventType: EVENT_TYPES.CONTRATOS.RISCO_CRITICO_IDENTIFICADO,
      module: 'contratos',
      entityType: 'contrato',
      entityId: contratoId,
      metadata: { riscoGeral },
      status: 'pendente'
    });
  }
}

/**
 * Registra evento quando um DPA é aprovado
 */
export async function onDpaAprovado(
  tenantId: string,
  contratoId: string,
  aprovadorNome: string
): Promise<void> {
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.CONTRATOS.DPA_APROVADO,
    module: 'contratos',
    entityType: 'contrato',
    entityId: contratoId,
    metadata: { aprovadorNome },
    status: 'concluido'
  });
}

/**
 * Registra evento quando um mapeamento é criado
 */
export async function onMapeamentoCriado(
  tenantId: string,
  mapeamentoId: string,
  areaNome: string
): Promise<void> {
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.MAPEAMENTOS.MAPEAMENTO_CRIADO,
    module: 'mapeamentos',
    entityType: 'mapeamento',
    entityId: mapeamentoId,
    metadata: { areaNome },
    status: 'em_andamento'
  });
}

/**
 * Registra evento quando um mapeamento é concluído
 */
export async function onMapeamentoConcluido(
  tenantId: string,
  mapeamentoId: string,
  totalAtividades: number,
  dpiaRequerido: boolean
): Promise<void> {
  // Atualizar evento de criação
  const existingEvent = await findEventByEntity(
    tenantId,
    'mapeamento',
    mapeamentoId,
    EVENT_TYPES.MAPEAMENTOS.MAPEAMENTO_CRIADO
  );

  if (existingEvent) {
    await updateEventStatus(existingEvent.id, 'concluido', new Date());
  }

  // Criar evento de conclusão
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.MAPEAMENTOS.MAPEAMENTO_CONCLUIDO,
    module: 'mapeamentos',
    entityType: 'mapeamento',
    entityId: mapeamentoId,
    metadata: { totalAtividades, dpiaRequerido },
    status: 'concluido'
  });

  // Se DPIA for necessário, criar evento
  if (dpiaRequerido) {
    await createMaturityEventInternal({
      tenantId,
      eventType: EVENT_TYPES.MAPEAMENTOS.DPIA_NECESSARIO,
      module: 'mapeamentos',
      entityType: 'mapeamento',
      entityId: mapeamentoId,
      metadata: {},
      status: 'pendente'
    });
  }
}

/**
 * Registra evento quando uma avaliação de terceiro é criada
 */
export async function onTerceiroAvaliacaoCriada(
  tenantId: string,
  avaliacaoId: string,
  terceiroNome: string
): Promise<void> {
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.TERCEIROS.AVALIACAO_CRIADA,
    module: 'terceiros',
    entityType: 'avaliacao_terceiro',
    entityId: avaliacaoId,
    metadata: { terceiroNome },
    status: 'em_andamento'
  });
}

/**
 * Registra evento quando uma avaliação de terceiro é concluída
 */
export async function onTerceiroAvaliacaoConcluida(
  tenantId: string,
  avaliacaoId: string,
  classificacaoRisco: string,
  pontuacao: number
): Promise<void> {
  // Atualizar evento de criação
  const existingEvent = await findEventByEntity(
    tenantId,
    'avaliacao_terceiro',
    avaliacaoId,
    EVENT_TYPES.TERCEIROS.AVALIACAO_CRIADA
  );

  if (existingEvent) {
    await updateEventStatus(existingEvent.id, 'concluido', new Date());
  }

  // Criar evento de conclusão
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.TERCEIROS.AVALIACAO_CONCLUIDA,
    module: 'terceiros',
    entityType: 'avaliacao_terceiro',
    entityId: avaliacaoId,
    metadata: { classificacaoRisco, pontuacao },
    status: 'concluido'
  });

  // Se risco alto, criar evento de correção necessária
  if (classificacaoRisco === 'alto' || classificacaoRisco === 'critico' || classificacaoRisco === 'muito_critico') {
    await createMaturityEventInternal({
      tenantId,
      eventType: EVENT_TYPES.TERCEIROS.RISCO_ALTO_IDENTIFICADO,
      module: 'terceiros',
      entityType: 'avaliacao_terceiro',
      entityId: avaliacaoId,
      metadata: { classificacaoRisco },
      status: 'pendente'
    });
  }
}

/**
 * Registra evento quando uma correção de terceiro é implementada
 */
export async function onTerceiroCorrecaoImplementada(
  tenantId: string,
  avaliacaoId: string,
  descricaoCorrecao: string
): Promise<void> {
  // Atualizar evento de risco alto se existir
  const existingEvent = await findEventByEntity(
    tenantId,
    'avaliacao_terceiro',
    avaliacaoId,
    EVENT_TYPES.TERCEIROS.RISCO_ALTO_IDENTIFICADO
  );

  if (existingEvent) {
    await updateEventStatus(existingEvent.id, 'concluido', new Date());
  }

  // Criar evento de correção implementada
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.TERCEIROS.CORRECAO_IMPLEMENTADA,
    module: 'terceiros',
    entityType: 'avaliacao_terceiro',
    entityId: avaliacaoId,
    metadata: { descricaoCorrecao },
    status: 'concluido'
  });
}

/**
 * Registra evento de tarefa planejada (global)
 */
export async function onTarefaPlanejada(
  tenantId: string,
  tarefaId: string,
  descricao: string,
  dueDate: Date
): Promise<void> {
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.GLOBAL.TAREFA_PLANEJADA,
    module: 'global',
    entityType: 'tarefa',
    entityId: tarefaId,
    metadata: { descricao },
    dueDate,
    status: 'pendente'
  });
}

/**
 * Registra evento de tarefa executada (global)
 */
export async function onTarefaExecutada(
  tenantId: string,
  tarefaId: string
): Promise<void> {
  // Atualizar evento de tarefa planejada
  const existingEvent = await findEventByEntity(
    tenantId,
    'tarefa',
    tarefaId,
    EVENT_TYPES.GLOBAL.TAREFA_PLANEJADA
  );

  if (existingEvent) {
    await updateEventStatus(existingEvent.id, 'concluido', new Date());
  }

  // Criar evento de execução
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.GLOBAL.TAREFA_EXECUTADA,
    module: 'global',
    entityType: 'tarefa',
    entityId: tarefaId,
    metadata: {},
    status: 'concluido'
  });
}

/**
 * Registra evento de incidente
 */
export async function onIncidenteRegistrado(
  tenantId: string,
  incidenteId: string,
  severidade: 'baixa' | 'media' | 'alta' | 'critica',
  descricao: string
): Promise<void> {
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.INCIDENTES.INCIDENTE_REGISTRADO,
    module: 'incidentes',
    entityType: 'incidente',
    entityId: incidenteId,
    metadata: { severidade, descricao },
    status: 'pendente'
  });
}

/**
 * Registra evento de incidente tratado
 */
export async function onIncidenteTratado(
  tenantId: string,
  incidenteId: string,
  acoesTomadas: string
): Promise<void> {
  // Atualizar evento de incidente registrado
  const existingEvent = await findEventByEntity(
    tenantId,
    'incidente',
    incidenteId,
    EVENT_TYPES.INCIDENTES.INCIDENTE_REGISTRADO
  );

  if (existingEvent) {
    await updateEventStatus(existingEvent.id, 'concluido', new Date());
  }

  // Criar evento de tratamento
  await createMaturityEventInternal({
    tenantId,
    eventType: EVENT_TYPES.INCIDENTES.INCIDENTE_TRATADO,
    module: 'incidentes',
    entityType: 'incidente',
    entityId: incidenteId,
    metadata: { acoesTomadas },
    status: 'concluido'
  });
}

export default {
  EVENT_TYPES,
  createMaturityEvent: createMaturityEventInternal,
  updateEventStatus,
  findEventByEntity,
  // CPPD
  onCppdAvaliacaoCriada,
  onCppdAvaliacaoConcluida,
  onReuniaoCppdRealizada,
  // Contratos
  onContratoAnaliseIniciada,
  onContratoAnaliseConcluida,
  onDpaAprovado,
  // Mapeamentos
  onMapeamentoCriado,
  onMapeamentoConcluido,
  // Terceiros
  onTerceiroAvaliacaoCriada,
  onTerceiroAvaliacaoConcluida,
  onTerceiroCorrecaoImplementada,
  // Global
  onTarefaPlanejada,
  onTarefaExecutada,
  // Incidentes
  onIncidenteRegistrado,
  onIncidenteTratado,
};
