-- 0026_mapeamento_tokens_por_processo_timeline.sql
-- MySQL idempotente
SET @db := DATABASE();

-- 1) mapeamento_respondents: processId nullable (token por processo)
SET @t := 'mapeamento_respondents';
SET @c := 'processId';
SET @exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema=@db AND table_name=@t AND column_name=@c
);
SET @sql := IF(@exists=0,
  CONCAT('ALTER TABLE `',@t,'` ADD COLUMN `',@c,'` INT NULL AFTER `areaId`;'),
  'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- índice (org, process) para busca rápida
SET @idx := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema=@db AND table_name=@t AND index_name='idx_org_process'
);
SET @sql := IF(@idx=0,
  'CREATE INDEX idx_org_process ON mapeamento_respondents (organizationId, processId);',
  'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) timeline: mapeamento_timeline_events
SET @t := 'mapeamento_timeline_events';
SET @exists := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema=@db AND table_name=@t
);
SET @sql := IF(@exists=0, '
  CREATE TABLE mapeamento_timeline_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NOT NULL,
    contextId INT NULL,
    areaId INT NULL,
    processId INT NULL,
    respondentId INT NULL,
    eventType VARCHAR(60) NOT NULL,
    title VARCHAR(255) NULL,
    message TEXT NULL,
    metadata JSON NULL,
    createdById INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_org (organizationId),
    INDEX idx_context (contextId),
    INDEX idx_area (areaId),
    INDEX idx_process (processId),
    INDEX idx_type (eventType),
    INDEX idx_createdAt (createdAt)
  );
','SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
