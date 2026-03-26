/**
 * Validação Pós-IA para Análise de Contratos LGPD
 * ==================================================
 * Seusdados Consultoria em Gestão de Dados Limitada
 * CNPJ 33.899.116/0001-63 | seusdados.com
 *
 * Implementa o Termo 1 (Engenharia Cognitiva):
 * - Validação de schema (nenhum campo obrigatório em branco)
 * - Preenchimento automático de campos vazios com "não identificado"
 * - Verificação de coerência entre campos
 * - Log de validação para auditoria
 */

import { logger } from "./_core/logger";
import type { AIAnalysisOutput } from "../shared/contractAnalysisTypes";

// ==================== TIPOS DE VALIDAÇÃO ====================

export interface ValidationIssue {
  field: string;
  severity: "erro" | "aviso" | "info";
  message: string;
  autoFixed: boolean;
  originalValue: unknown;
  fixedValue: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  autoFixCount: number;
  output: AIAnalysisOutput;
}

// ==================== VALIDAÇÃO PÓS-IA ====================

/**
 * Valida e corrige a saída da IA, garantindo que nenhum campo obrigatório fique em branco.
 * Campos vazios são preenchidos com "não identificado" (não inventa dados).
 */
export function validateAndFixAIOutput(raw: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  let autoFixCount = 0;

  // Clonar para não mutar o original
  const output = JSON.parse(JSON.stringify(raw || {}));

  // 1. Validar executiveSummary
  if (!output.executiveSummary || typeof output.executiveSummary !== "string" || output.executiveSummary.trim().length < 10) {
    issues.push({
      field: "executiveSummary",
      severity: "erro",
      message: "Resumo executivo ausente ou muito curto",
      autoFixed: true,
      originalValue: output.executiveSummary,
      fixedValue: "Análise realizada. O documento foi processado mas não foi possível gerar um resumo executivo detalhado. Recomenda-se revisão manual por consultor especializado.",
    });
    output.executiveSummary = "Análise realizada. O documento foi processado mas não foi possível gerar um resumo executivo detalhado. Recomenda-se revisão manual por consultor especializado.";
    autoFixCount++;
  }

  // 2. Validar complianceScore
  if (output.complianceScore === undefined || output.complianceScore === null || typeof output.complianceScore !== "number") {
    issues.push({
      field: "complianceScore",
      severity: "erro",
      message: "Pontuação de conformidade ausente",
      autoFixed: true,
      originalValue: output.complianceScore,
      fixedValue: 0,
    });
    output.complianceScore = 0;
    autoFixCount++;
  } else if (output.complianceScore < 0 || output.complianceScore > 100) {
    const fixed = Math.max(0, Math.min(100, Math.round(output.complianceScore)));
    issues.push({
      field: "complianceScore",
      severity: "aviso",
      message: `Pontuação fora do intervalo 0-100: ${output.complianceScore}`,
      autoFixed: true,
      originalValue: output.complianceScore,
      fixedValue: fixed,
    });
    output.complianceScore = fixed;
    autoFixCount++;
  }

  // 3. Validar analysisMap
  if (!output.analysisMap || typeof output.analysisMap !== "object") {
    issues.push({
      field: "analysisMap",
      severity: "erro",
      message: "Mapa de análise ausente",
      autoFixed: true,
      originalValue: output.analysisMap,
      fixedValue: {},
    });
    output.analysisMap = {};
    autoFixCount++;
  }

  // Validar campos do mapa
  const mapStringFields: Array<{ key: string; label: string }> = [
    { key: "partnerName", label: "Nome do parceiro" },
    { key: "contractType", label: "Tipo de contrato" },
    { key: "contractingParty", label: "Parte contratante" },
    { key: "contractedParty", label: "Parte contratada" },
    { key: "agentTypeJustification", label: "Justificativa do papel na LGPD" },
    { key: "contractObject", label: "Objeto do contrato" },
    { key: "commonData", label: "Dados comuns identificados" },
    { key: "titularRightsDetails", label: "Detalhes dos direitos dos titulares" },
    { key: "dataEliminationDetails", label: "Detalhes da eliminação de dados" },
    { key: "legalRisks", label: "Riscos legais" },
    { key: "securityRisks", label: "Riscos de segurança" },
    { key: "protectionClauseDetails", label: "Detalhes da cláusula de proteção" },
  ];

  for (const field of mapStringFields) {
    if (!output.analysisMap[field.key] || (typeof output.analysisMap[field.key] === "string" && output.analysisMap[field.key].trim() === "")) {
      issues.push({
        field: `analysisMap.${field.key}`,
        severity: "aviso",
        message: `${field.label}: não identificado no contrato`,
        autoFixed: true,
        originalValue: output.analysisMap[field.key],
        fixedValue: "Não identificado no documento analisado",
      });
      output.analysisMap[field.key] = "Não identificado no documento analisado";
      autoFixCount++;
    }
  }

  // Validar enums do mapa
  const validAgentTypes = ["controlador", "operador", "controlador_conjunto", "suboperador"];
  if (output.analysisMap.agentType && !validAgentTypes.includes(output.analysisMap.agentType)) {
    issues.push({
      field: "analysisMap.agentType",
      severity: "aviso",
      message: `Tipo de agente inválido: ${output.analysisMap.agentType}`,
      autoFixed: true,
      originalValue: output.analysisMap.agentType,
      fixedValue: null,
    });
    output.analysisMap.agentType = null;
    autoFixCount++;
  }

  const validStatuses = ["sim", "nao", "parcial"];
  for (const statusField of ["titularRightsStatus", "dataEliminationStatus", "hasProtectionClause"]) {
    if (output.analysisMap[statusField] && !validStatuses.includes(output.analysisMap[statusField])) {
      issues.push({
        field: `analysisMap.${statusField}`,
        severity: "aviso",
        message: `Status inválido: ${output.analysisMap[statusField]}`,
        autoFixed: true,
        originalValue: output.analysisMap[statusField],
        fixedValue: null,
      });
      output.analysisMap[statusField] = null;
      autoFixCount++;
    }
  }

  // Validar booleans do mapa
  for (const boolField of ["commonDataLargeScale", "sensitiveDataLargeScale", "hasElderlyData", "hasMinorData"]) {
    if (output.analysisMap[boolField] === undefined || output.analysisMap[boolField] === null) {
      output.analysisMap[boolField] = false;
    } else if (typeof output.analysisMap[boolField] !== "boolean") {
      output.analysisMap[boolField] = Boolean(output.analysisMap[boolField]);
    }
  }

  // Validar actionStatus
  if (!output.analysisMap.actionStatus || !["adequado", "ajustar"].includes(output.analysisMap.actionStatus)) {
    output.analysisMap.actionStatus = "ajustar";
  }

  // 4. Validar checklist
  if (!Array.isArray(output.checklist) || output.checklist.length === 0) {
    issues.push({
      field: "checklist",
      severity: "erro",
      message: "Checklist ausente ou vazio",
      autoFixed: false,
      originalValue: output.checklist,
      fixedValue: null,
    });
  } else {
    for (let i = 0; i < output.checklist.length; i++) {
      const item = output.checklist[i];
      if (!item.question || item.question.trim() === "") {
        issues.push({
          field: `checklist[${i}].question`,
          severity: "aviso",
          message: `Pergunta ${i + 1} do checklist sem texto`,
          autoFixed: true,
          originalValue: item.question,
          fixedValue: `Item ${i + 1} do checklist`,
        });
        item.question = `Item ${i + 1} do checklist`;
        autoFixCount++;
      }
      if (!item.status || !validStatuses.includes(item.status)) {
        issues.push({
          field: `checklist[${i}].status`,
          severity: "aviso",
          message: `Status inválido no item ${i + 1}: ${item.status}`,
          autoFixed: true,
          originalValue: item.status,
          fixedValue: "nao",
        });
        item.status = "nao";
        autoFixCount++;
      }
      if (!item.observations || item.observations.trim() === "") {
        item.observations = "Não identificado no documento analisado";
      }
      if (!item.itemNumber) {
        item.itemNumber = i + 1;
      }
    }
  }

  // 5. Validar risks
  if (!Array.isArray(output.risks)) {
    output.risks = [];
    issues.push({
      field: "risks",
      severity: "aviso",
      message: "Lista de riscos ausente, inicializada como vazia",
      autoFixed: true,
      originalValue: null,
      fixedValue: [],
    });
    autoFixCount++;
  } else {
    const validRiskLevels = ["1", "2", "3", "4", "5"];
    for (let i = 0; i < output.risks.length; i++) {
      const risk = output.risks[i];
      if (!risk.riskDescription || risk.riskDescription.trim() === "") {
        issues.push({
          field: `risks[${i}].riskDescription`,
          severity: "aviso",
          message: `Risco ${i + 1} sem descrição`,
          autoFixed: true,
          originalValue: risk.riskDescription,
          fixedValue: "Risco identificado sem descrição detalhada",
        });
        risk.riskDescription = "Risco identificado sem descrição detalhada";
        autoFixCount++;
      }
      if (!risk.riskLevel || !validRiskLevels.includes(String(risk.riskLevel))) {
        issues.push({
          field: `risks[${i}].riskLevel`,
          severity: "aviso",
          message: `Nível de risco inválido: ${risk.riskLevel}`,
          autoFixed: true,
          originalValue: risk.riskLevel,
          fixedValue: "3",
        });
        risk.riskLevel = "3";
        autoFixCount++;
      } else {
        risk.riskLevel = String(risk.riskLevel);
      }
      if (!risk.requiredAction || risk.requiredAction.trim() === "") {
        risk.requiredAction = "Avaliar e definir ação corretiva com consultor especializado";
      }
    }
  }

  // 6. Verificações de coerência
  // Se há dados sensíveis mas score > 80, emitir aviso
  if (output.analysisMap.sensitiveData && output.analysisMap.sensitiveData !== "Não identificado no documento analisado" && output.complianceScore > 80) {
    const hasSensitiveProtection = output.analysisMap.hasProtectionClause === "sim";
    if (!hasSensitiveProtection) {
      issues.push({
        field: "coerencia",
        severity: "aviso",
        message: "Dados sensíveis identificados mas pontuação alta sem cláusula de proteção confirmada. Verificar manualmente.",
        autoFixed: false,
        originalValue: null,
        fixedValue: null,
      });
    }
  }

  // Se há menores mas não há risco crítico relacionado
  if (output.analysisMap.hasMinorData === true) {
    const hasMinorRisk = output.risks?.some(
      (r: any) => r.riskDescription?.toLowerCase().includes("menor") || r.riskDescription?.toLowerCase().includes("criança")
    );
    if (!hasMinorRisk) {
      issues.push({
        field: "coerencia",
        severity: "aviso",
        message: "Dados de menores identificados mas nenhum risco específico registrado. Verificar manualmente.",
        autoFixed: false,
        originalValue: null,
        fixedValue: null,
      });
    }
  }

  const isValid = !issues.some((i) => i.severity === "erro" && !i.autoFixed);

  logger.debug(
    ` Validação pós-IA: ${issues.length} problemas encontrados, ${autoFixCount} corrigidos automaticamente, válido: ${isValid}`
  );

  return {
    isValid,
    issues,
    autoFixCount,
    output: output as AIAnalysisOutput,
  };
}

/**
 * Gera log de validação formatado para auditoria.
 */
export function formatValidationLog(result: ValidationResult): string {
  const lines: string[] = [
    `=== Relatório de Validação Pós-IA ===`,
    `Data: ${new Date().toISOString()}`,
    `Válido: ${result.isValid ? "Sim" : "Não"}`,
    `Problemas: ${result.issues.length}`,
    `Correções automáticas: ${result.autoFixCount}`,
    ``,
  ];

  for (const issue of result.issues) {
    lines.push(
      `[${issue.severity.toUpperCase()}] ${issue.field}: ${issue.message}${issue.autoFixed ? " (corrigido automaticamente)" : ""}`
    );
  }

  return lines.join("\n");
}
