/**
 * Serviço de Alertas Automáticos para Riscos e Prazos
 * Monitora contratos e gera alertas quando:
 * - Riscos críticos são identificados
 * - Prazos de aditamentos estão próximos
 * - Conformidade está abaixo do esperado
 * - DPAs estão pendentes de aprovação
 */

import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { TRPCError } from '@trpc/server';

export type AlertType = 
  | 'critical_risk' 
  | 'high_risk' 
  | 'deadline_approaching' 
  | 'dpa_pending' 
  | 'compliance_low' 
  | 'amendment_required';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Alert {
  id: number;
  organizationId: number;
  contractAnalysisId?: number;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  contractName?: string;
  dueDate?: Date;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
}

export interface CreateAlertInput {
  organizationId: number;
  contractAnalysisId?: number;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  contractName?: string;
  dueDate?: Date;
}

/**
 * Cria um novo alerta
 */
export async function createAlert(input: CreateAlertInput): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db.execute(sql`
    INSERT INTO contract_alerts (
      organization_id, 
      contract_analysis_id, 
      alert_type, 
      severity, 
      title, 
      description, 
      contract_name, 
      due_date
    ) VALUES (
      ${input.organizationId},
      ${input.contractAnalysisId || null},
      ${input.alertType},
      ${input.severity},
      ${input.title},
      ${input.description || null},
      ${input.contractName || null},
      ${input.dueDate || null}
    )
    RETURNING id
  `);

  return (result as any).rows?.[0]?.id ?? (result as any)[0]?.id;
}

/**
 * Busca alertas de uma organização
 */
export async function getAlertsByOrganization(
  organizationId: number,
  options?: {
    includeRead?: boolean;
    includeDismissed?: boolean;
    limit?: number;
    alertTypes?: AlertType[];
  }
): Promise<Alert[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const includeRead = options?.includeRead ?? false;
  const includeDismissed = options?.includeDismissed ?? false;
  const limit = options?.limit ?? 50;

  let query = sql`
    SELECT 
      id,
      organization_id as organizationId,
      contract_analysis_id as contractAnalysisId,
      alert_type as alertType,
      severity,
      title,
      description,
      contract_name as contractName,
      due_date as dueDate,
      is_read as isRead,
      is_dismissed as isDismissed,
      created_at as createdAt
    FROM contract_alerts
    WHERE organization_id = ${organizationId}
  `;

  if (!includeRead) {
    query = sql`${query} AND is_read = FALSE`;
  }

  if (!includeDismissed) {
    query = sql`${query} AND is_dismissed = FALSE`;
  }

  query = sql`${query} ORDER BY 
    CASE severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      WHEN 'low' THEN 4 
    END,
    created_at DESC
    LIMIT ${limit}
  `;

  const result = await db.execute(query);
  return (result as any)[0] as Alert[];
}

/**
 * Conta alertas não lidos por organização
 */
export async function countUnreadAlerts(organizationId: number): Promise<{
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low
    FROM contract_alerts
    WHERE organization_id = ${organizationId}
      AND is_read = FALSE
      AND is_dismissed = FALSE
  `);

  const row = (result as any)[0][0];
  return {
    total: Number(row.total) || 0,
    critical: Number(row.critical) || 0,
    high: Number(row.high) || 0,
    medium: Number(row.medium) || 0,
    low: Number(row.low) || 0
  };
}

/**
 * Marca alerta como lido
 */
export async function markAlertAsRead(alertId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db.execute(sql`
    UPDATE contract_alerts 
    SET is_read = TRUE 
    WHERE id = ${alertId}
  `);
}

/**
 * Marca alerta como dispensado
 */
export async function dismissAlert(alertId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db.execute(sql`
    UPDATE contract_alerts 
    SET is_dismissed = TRUE 
    WHERE id = ${alertId}
  `);
}

/**
 * Marca todos os alertas de uma organização como lidos
 */
export async function markAllAlertsAsRead(organizationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  await db.execute(sql`
    UPDATE contract_alerts 
    SET is_read = TRUE 
    WHERE organization_id = ${organizationId}
  `);
}

/**
 * Gera alertas automáticos baseados nas análises de contratos
 */
export async function generateAlertsFromAnalysis(
  organizationId: number,
  analysisId: number,
  analysisData: {
    contractName: string;
    conformityScore?: number;
    risks?: Array<{ severity: string; description: string }>;
    dpaStatus?: string;
    endDate?: string;
  }
): Promise<number[]> {
  const alertIds: number[] = [];

  // Alerta para riscos críticos
  const criticalRisks = analysisData.risks?.filter(r => r.severity === 'critical') || [];
  if (criticalRisks.length > 0) {
    const id = await createAlert({
      organizationId,
      contractAnalysisId: analysisId,
      alertType: 'critical_risk',
      severity: 'critical',
      title: `${criticalRisks.length} risco(s) crítico(s) identificado(s)`,
      description: criticalRisks.map(r => r.description).join('; '),
      contractName: analysisData.contractName
    });
    alertIds.push(id);
  }

  // Alerta para riscos altos
  const highRisks = analysisData.risks?.filter(r => r.severity === 'high') || [];
  if (highRisks.length >= 3) {
    const id = await createAlert({
      organizationId,
      contractAnalysisId: analysisId,
      alertType: 'high_risk',
      severity: 'high',
      title: `${highRisks.length} riscos altos identificados`,
      description: 'Múltiplos riscos de alta severidade requerem atenção',
      contractName: analysisData.contractName
    });
    alertIds.push(id);
  }

  // Alerta para conformidade baixa
  if (analysisData.conformityScore !== undefined && analysisData.conformityScore < 0.6) {
    const id = await createAlert({
      organizationId,
      contractAnalysisId: analysisId,
      alertType: 'compliance_low',
      severity: analysisData.conformityScore < 0.4 ? 'critical' : 'high',
      title: `Conformidade baixa: ${Math.round(analysisData.conformityScore * 100)}%`,
      description: 'O contrato apresenta conformidade abaixo do esperado com a LGPD',
      contractName: analysisData.contractName
    });
    alertIds.push(id);
  }

  // Alerta para DPA pendente
  if (analysisData.dpaStatus === 'pending') {
    const id = await createAlert({
      organizationId,
      contractAnalysisId: analysisId,
      alertType: 'dpa_pending',
      severity: 'medium',
      title: 'DPA aguardando aprovação',
      description: 'O Acordo de Processamento de Dados está pendente de aprovação',
      contractName: analysisData.contractName
    });
    alertIds.push(id);
  }

  // Alerta para prazo de contrato próximo
  if (analysisData.endDate) {
    const endDate = new Date(analysisData.endDate);
    const daysUntilEnd = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
      const id = await createAlert({
        organizationId,
        contractAnalysisId: analysisId,
        alertType: 'deadline_approaching',
        severity: daysUntilEnd <= 7 ? 'critical' : daysUntilEnd <= 14 ? 'high' : 'medium',
        title: `Contrato expira em ${daysUntilEnd} dias`,
        description: 'Verifique a necessidade de renovação ou aditamento',
        contractName: analysisData.contractName,
        dueDate: endDate
      });
      alertIds.push(id);
    }
  }

  return alertIds;
}

/**
 * Verifica todos os contratos de uma organização e gera alertas
 */
export async function scanOrganizationForAlerts(organizationId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  // Buscar análises da organização
  const analysesResult = await db.execute(sql`
    SELECT 
      id,
      contract_name as contractName,
      conformity_score as conformityScore,
      risks,
      dpa_approval_status as dpaStatus,
      end_date as endDate
    FROM contract_analyses
    WHERE organization_id = ${organizationId}
  `);

  const analyses = (analysesResult as any)[0] as any[];
  let totalAlerts = 0;

  for (const analysis of analyses) {
    // Verificar se já existe alerta recente para esta análise
    const existingResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM contract_alerts 
      WHERE contract_analysis_id = ${analysis.id}
        AND created_at > NOW() - INTERVAL '24 HOUR'
    `);
    
    const existingCount = (existingResult as any)[0][0].count;
    if (existingCount > 0) continue;

    // Gerar alertas
    const risks = analysis.risks ? JSON.parse(analysis.risks) : [];
    const alertIds = await generateAlertsFromAnalysis(organizationId, analysis.id, {
      contractName: analysis.contractName,
      conformityScore: analysis.conformityScore,
      risks,
      dpaStatus: analysis.dpaStatus,
      endDate: analysis.endDate
    });

    totalAlerts += alertIds.length;
  }

  return totalAlerts;
}
