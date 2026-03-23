-- Contract Analysis Outputs Manifest (fonte de verdade para fidelidade de outputs)
-- MySQL/TiDB: cria tabela se não existir.

CREATE TABLE IF NOT EXISTS contract_analysis_outputs_manifest (
  analysisId BIGINT NOT NULL,
  organizationId BIGINT NOT NULL,

  mapCount INT NOT NULL DEFAULT 0,
  checklistCount INT NOT NULL DEFAULT 0,
  riskCount INT NOT NULL DEFAULT 0,
  clauseCount INT NOT NULL DEFAULT 0,
  actionPlanCount INT NOT NULL DEFAULT 0,

  reportUrl TEXT NULL,
  generatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  integrityHash VARCHAR(64) NULL,

  PRIMARY KEY (analysisId),
  INDEX idx_outputs_manifest_org (organizationId)
);

SELECT 'contract_analysis_outputs_manifest_migration_applied' AS ok;
