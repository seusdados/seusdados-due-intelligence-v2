-- Migração: Adicionar coluna rotId à tabela contract_mapeamento_links
-- Permite vincular mapeamentos convertidos em ROT

ALTER TABLE contract_mapeamento_links 
ADD COLUMN IF NOT EXISTS rot_id INT NULL AFTER response_id;

-- Criar índice para buscas por rotId
CREATE INDEX IF NOT EXISTS cml_rot_idx ON contract_mapeamento_links(rot_id);
