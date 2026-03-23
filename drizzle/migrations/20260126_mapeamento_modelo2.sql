-- Migration: Modelo 2 (Mapeamento -> ROT 1:1 por processo) + Integração reversa + Lembretes
-- Data: 2026-01-26

-- 1) Vínculo Response -> ROT (1 ROT por processo / response)
ALTER TABLE mapeamento_responses
  ADD COLUMN IF NOT EXISTS rotId INT NULL;

CREATE INDEX IF NOT EXISTS idx_mapeamento_responses_rotId ON mapeamento_responses (rotId);

-- 2) Vínculo Contrato -> ROT (quando convertido) - já existe no schema, só adicionar índices se não existirem
CREATE INDEX IF NOT EXISTS cml_response_idx ON contract_mapeamento_links (responseId);

-- 3) Lembretes automáticos (tabelas com colunas camelCase, alinhadas ao schema Drizzle)
CREATE TABLE IF NOT EXISTS mapeamento_reminder_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  daysBeforeReminder INT NOT NULL DEFAULT 7,
  reminderFrequencyDays INT NOT NULL DEFAULT 7,
  maxReminders INT NOT NULL DEFAULT 3,
  emailTemplate TEXT NULL,
  isActive TINYINT NOT NULL DEFAULT 1,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mapeamento_reminder_config_org (organizationId)
);

CREATE TABLE IF NOT EXISTS mapeamento_reminder_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  respondentId INT NOT NULL,
  organizationId INT NOT NULL,
  reminderCount INT NOT NULL,
  emailSentTo VARCHAR(320) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  errorMessage TEXT NULL,
  sentAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mapeamento_reminder_history_org (organizationId),
  INDEX idx_mapeamento_reminder_history_respondent (respondentId)
);
