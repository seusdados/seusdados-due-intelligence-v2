-- Adicionar novo valor 'aguardando_nova_validacao' ao enum de status da tabela action_plans
-- Este status é usado quando o usuário reenvia a ação após ajustes solicitados pelo consultor
ALTER TABLE action_plans 
  MODIFY COLUMN status ENUM(
    'pendente',
    'em_andamento',
    'concluida_cliente',
    'pendente_validacao_dpo',
    'concluida',
    'cancelada',
    'recusada_cliente',
    'aguardando_validacao',
    'em_validacao',
    'ajustes_solicitados',
    'aguardando_nova_validacao'
  ) NOT NULL DEFAULT 'pendente';
