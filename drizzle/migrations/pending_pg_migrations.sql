-- ============================================================
-- Migrações pendentes convertidas para PostgreSQL
-- Data: 2026-03-23
-- ============================================================

-- [20260210] Contract Analysis Outputs Manifest
CREATE TABLE IF NOT EXISTS contract_analysis_outputs_manifest (
  "analysisId" BIGINT NOT NULL,
  "organizationId" BIGINT NOT NULL,
  "mapCount" INT NOT NULL DEFAULT 0,
  "checklistCount" INT NOT NULL DEFAULT 0,
  "riskCount" INT NOT NULL DEFAULT 0,
  "clauseCount" INT NOT NULL DEFAULT 0,
  "actionPlanCount" INT NOT NULL DEFAULT 0,
  "reportUrl" TEXT NULL,
  "generatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "integrityHash" VARCHAR(64) NULL,
  PRIMARY KEY ("analysisId")
);
CREATE INDEX IF NOT EXISTS idx_outputs_manifest_org ON contract_analysis_outputs_manifest("organizationId");

-- [20260208] Backfill contract_analyses
UPDATE contract_analyses SET attempts = 0 WHERE attempts IS NULL;
UPDATE contract_analyses SET "maxAttempts" = 3 WHERE "maxAttempts" IS NULL;
UPDATE contract_analyses SET progress = 0 WHERE progress IS NULL;
UPDATE contract_analyses
SET "startedAt" = "createdAt"
WHERE "contractAnalysisStatus" = 'analyzing'
  AND "startedAt" IS NULL;

-- [patch2-ripd-automation] RIPD evidences e colunas adicionais
CREATE TABLE IF NOT EXISTS ripd_evidences (
  id SERIAL PRIMARY KEY,
  "ripdId" INT NOT NULL,
  "organizationId" INT NOT NULL,
  "questionId" INT NULL,
  "riskId" INT NULL,
  "mitigationId" INT NULL,
  "gedDocumentId" INT NOT NULL,
  "evidenceType" VARCHAR(50) DEFAULT 'documento',
  tags JSON NULL,
  "uploadedByUserId" INT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE dpia_questions
  ADD COLUMN IF NOT EXISTS "evidenceRequired" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "evidenceMinCount" INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "evidenceHint" TEXT NULL;

ALTER TABLE dpia_responses
  ADD COLUMN IF NOT EXISTS "evidenceStatus" VARCHAR(20) DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS "evidenceCount" INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "aiValidation" JSON NULL;

ALTER TABLE dpia_risks
  ADD COLUMN IF NOT EXISTS "inherentLikelihood" INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "inherentImpact" INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "inherentScore" INT DEFAULT 9,
  ADD COLUMN IF NOT EXISTS "inherentLevel" VARCHAR(20) DEFAULT 'moderado',
  ADD COLUMN IF NOT EXISTS "residualLikelihood" INT NULL,
  ADD COLUMN IF NOT EXISTS "residualImpact" INT NULL,
  ADD COLUMN IF NOT EXISTS "residualScore" INT NULL,
  ADD COLUMN IF NOT EXISTS "residualLevel" VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS "acceptanceDecision" VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS "acceptanceJustification" TEXT NULL;

ALTER TABLE dpia_mitigations
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS "evidenceGedDocumentId" INT NULL;

ALTER TABLE dpia_assessments
  ADD COLUMN IF NOT EXISTS "workflowStatus" VARCHAR(30) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "meudpoTicketId" INT NULL,
  ADD COLUMN IF NOT EXISTS "linkedContractAnalysisId" INT NULL;

ALTER TABLE contract_analyses
  ADD COLUMN IF NOT EXISTS "linkedRipdId" INT NULL;

-- [add_rotId_to_contract_mapeamento_links]
ALTER TABLE contract_mapeamento_links
  ADD COLUMN IF NOT EXISTS rot_id INT NULL;
CREATE INDEX IF NOT EXISTS cml_rot_idx ON contract_mapeamento_links(rot_id);

-- [20260312 + 20260314] Adicionar valor 'aguardando_nova_validacao' ao status de action_plans
-- No PostgreSQL, status é TEXT, então apenas documentamos os valores aceitos
-- (não há ENUM nativo para alterar, o campo já aceita qualquer texto)
-- Nenhuma alteração necessária pois o campo é do tipo TEXT.

-- [20260224] clientRoles em users (já aplicado - verificado)
-- Nenhuma ação necessária.
