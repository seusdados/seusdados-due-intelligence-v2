-- 0024_mapeamento_ripd_rot_ropa_hardening.sql
-- MySQL idempotente (usa information_schema + dynamic SQL)
-- Objetivo:
-- 1) Garantir colunas hardening em DPIA (evidenceRequired/evidenceMinCount/evidenceHint/evidenceExamples/allowedMimeTypes, evidenceStatus/evidenceCount/aiValidation,
--    campos inherent/residual, acceptanceDecision/auditTrail, evidenceGedDocumentId)
-- 2) Garantir ropaData JSON em mapeamento_responses
-- 3) Seed inicial de políticas de evidência (sem sobrescrever customizações)

SET @db := DATABASE();

-- Helper macro (manual): cria coluna se não existir
-- (MySQL não tem ADD COLUMN IF NOT EXISTS em todas versões; usamos dynamic SQL)

-- =========================
-- (A) mapeamento_responses: ropaData JSON
-- =========================
SET @t := 'mapeamento_responses';
SET @c := 'ropaData';
SET @exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema=@db AND table_name=@t AND column_name=@c
);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` JSON NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

-- =========================
-- (B) dpia_questions: evidências (campos camelCase)
-- =========================
SET @t := 'dpia_questions';

SET @c := 'evidenceRequired';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` TINYINT(1) NOT NULL DEFAULT 0;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

SET @c := 'evidenceMinCount';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` INT NOT NULL DEFAULT 0;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

SET @c := 'evidenceHint';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` TEXT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

SET @c := 'evidenceExamples';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` JSON NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

SET @c := 'allowedMimeTypes';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` JSON NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

-- =========================
-- (C) dpia_responses: evidência status + count + aiValidation
-- =========================
SET @t := 'dpia_responses';

SET @c := 'evidenceStatus';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` VARCHAR(20) NOT NULL DEFAULT ''missing'';'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

SET @c := 'evidenceCount';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` INT NOT NULL DEFAULT 0;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

SET @c := 'aiValidation';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` JSON NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

-- =========================
-- (D) dpia_risks: campos inherent/residual + governança
-- =========================
SET @t := 'dpia_risks';

-- Lista (se não existir, cria como NULLABLE para retrocompatibilidade)
SET @cols := 'inherentLikelihoodScore,inherentImpactScore,inherentRiskScore,inherentLevel,residualLikelihoodScore,residualImpactScore,residualRiskScore,residualLevel,inherentLikelihoodRationale,inherentImpactRationale,residualLikelihoodRationale,residualImpactRationale,acceptanceDecision,auditTrail';
-- A cada coluna, cria se não existir
-- NOTE: loop manual (mais compatível com runners)
-- inherentLikelihoodScore
SET @c := 'inherentLikelihoodScore';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` INT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'inherentImpactScore';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` INT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'inherentRiskScore';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` INT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'inherentLevel';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` VARCHAR(20) NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'residualLikelihoodScore';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` INT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'residualImpactScore';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` INT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'residualRiskScore';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` INT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'residualLevel';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` VARCHAR(20) NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'inherentLikelihoodRationale';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` TEXT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'inherentImpactRationale';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` TEXT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'residualLikelihoodRationale';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` TEXT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'residualImpactRationale';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` TEXT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'acceptanceDecision';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` VARCHAR(50) NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint
SET @c := 'auditTrail';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` JSON NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

-- =========================
-- (E) dpia_mitigations: evidenceGedDocumentId
-- =========================
SET @t := 'dpia_mitigations';
SET @c := 'evidenceGedDocumentId';
SET @exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name=@t AND column_name=@c);
SET @sql := IF(@exists=0, CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` INT NULL;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- statement-breakpoint

-- =========================
-- (F) Seed de evidências por pergunta (sem sobrescrever se já setado)
-- Baseado em display_order (mais estável do que id)
-- =========================
-- Marcamos evidenceRequired/minCount/hint/examples apenas se evidenceRequired=0 AND evidenceMinCount=0 (ou NULL)
UPDATE dpia_questions
SET
  evidenceRequired = 1,
  evidenceMinCount = 1,
  evidenceHint = 'Anexe documento/prova que justifique a base legal (ex.: contrato, norma interna, obrigação legal/regulatória, termo de consentimento quando aplicável).',
  evidenceExamples = JSON_ARRAY('Contrato/termo', 'Print do fluxo com aceite', 'Referência de lei/regulação', 'Termo de consentimento'),
  allowedMimeTypes = JSON_ARRAY('application/pdf','image/png','image/jpeg')
WHERE display_order = 4
  AND (COALESCE(evidenceRequired,0)=0)
  AND (COALESCE(evidenceMinCount,0)=0);
-- statement-breakpoint

UPDATE dpia_questions
SET
  evidenceRequired = 1,
  evidenceMinCount = 1,
  evidenceHint = 'Anexe evidências de controles de segurança (ex.: política, print de MFA, logs, criptografia, RBAC, backups, relatório de acesso).',
  evidenceExamples = JSON_ARRAY('Política de Segurança', 'Print MFA', 'Print de RBAC/perfis', 'Relatório de logs', 'Config de criptografia'),
  allowedMimeTypes = JSON_ARRAY('application/pdf','image/png','image/jpeg','text/plain')
WHERE display_order IN (9,10,12)
  AND (COALESCE(evidenceRequired,0)=0)
  AND (COALESCE(evidenceMinCount,0)=0);
-- statement-breakpoint

UPDATE dpia_questions
SET
  evidenceRequired = 1,
  evidenceMinCount = 1,
  evidenceHint = 'Anexe evidência de retenção e/ou eliminação (ex.: política de retenção, tabela de temporalidade, procedimento de descarte/anonimização).',
  evidenceExamples = JSON_ARRAY('Política de retenção', 'Tabela de temporalidade', 'Procedimento de descarte'),
  allowedMimeTypes = JSON_ARRAY('application/pdf','image/png','image/jpeg')
WHERE display_order IN (19,20)
  AND (COALESCE(evidenceRequired,0)=0)
  AND (COALESCE(evidenceMinCount,0)=0);
-- statement-breakpoint

UPDATE dpia_questions
SET
  evidenceRequired = 1,
  evidenceMinCount = 1,
  evidenceHint = 'Se houver compartilhamento, anexe contratos/DPA com cláusulas de proteção de dados, ou comprovantes equivalentes.',
  evidenceExamples = JSON_ARRAY('DPA (Aditivo LGPD)', 'Contrato com cláusula de privacidade', 'Anexo de segurança do fornecedor'),
  allowedMimeTypes = JSON_ARRAY('application/pdf','image/png','image/jpeg')
WHERE display_order IN (17)
  AND (COALESCE(evidenceRequired,0)=0)
  AND (COALESCE(evidenceMinCount,0)=0);
