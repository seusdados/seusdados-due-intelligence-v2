-- 20260208_contract_analysis_backfill.sql
-- Backfill para colunas de produção que possam estar NULL em linhas antigas

UPDATE contract_analyses SET attempts = 0 WHERE attempts IS NULL;
UPDATE contract_analyses SET maxAttempts = 3 WHERE maxAttempts IS NULL;
UPDATE contract_analyses SET progress = 0 WHERE progress IS NULL;

-- Se houver análises presas em analyzing sem startedAt, alinhar startedAt ao createdAt (opcional)
UPDATE contract_analyses
SET startedAt = createdAt
WHERE contractAnalysisStatus = 'analyzing'
  AND startedAt IS NULL;

-- (Opcional) Se houver analyzing 0% sem heartbeat, você pode "deixar o sweep re-enfileirar"
-- Não alteramos status aqui de propósito.
