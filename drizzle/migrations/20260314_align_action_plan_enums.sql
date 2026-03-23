-- Alinha os enums do módulo de action_plans com os status e eventos já usados pelo código.
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
    'aguardando_nova_validacao',
    'em_validacao',
    'ajustes_solicitados'
  ) NOT NULL DEFAULT 'pendente';

ALTER TABLE action_plan_history
  MODIFY COLUMN changeType ENUM(
    'atribuicao',
    'reatribuicao',
    'aceite',
    'recusa',
    'status',
    'prazo',
    'edicao',
    'envio_validacao',
    'validacao_aprovada',
    'validacao_recusada',
    'ajustes_solicitados',
    'transferencia_validacao'
  ) NOT NULL;
