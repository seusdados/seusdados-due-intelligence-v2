/**
 * Constantes de status compartilhadas para toda a plataforma Seusdados.
 * Garante consistência visual entre todas as telas e componentes.
 *
 * Paleta de status (conforme solicitado):
 * - Pendente        → amarelo/âmbar
 * - Em andamento    → azul
 * - Aguardando val. → roxo/violeta
 * - Em validação    → roxo escuro
 * - Ajustes         → laranja
 * - Validada        → verde
 * - Vencida         → vermelho
 * - Cancelada       → cinza
 */

export const ACTION_STATUS_COLORS: Record<string, string> = {
  pendente:                 "bg-amber-50 text-amber-800 border-amber-200",
  em_andamento:             "bg-blue-50 text-blue-800 border-blue-200",
  aguardando_validacao:        "bg-violet-100 text-violet-800 border-violet-200",
  pendente_validacao_dpo:      "bg-violet-100 text-violet-800 border-violet-200",
  aguardando_nova_validacao:   "bg-indigo-100 text-indigo-800 border-indigo-200",
  em_validacao:                "bg-purple-100 text-purple-800 border-purple-200",
  ajustes_solicitados:         "bg-orange-100 text-orange-800 border-orange-200",
  concluida:                "bg-green-100 text-green-800 border-green-200",
  concluida_cliente:        "bg-emerald-100 text-emerald-800 border-emerald-200",
  vencida:                  "bg-red-100 text-red-800 border-red-200",
  cancelada:                "bg-gray-100 text-gray-600 border-gray-200",
};

export const ACTION_STATUS_LABELS: Record<string, string> = {
  pendente:                 "Pendente",
  em_andamento:             "Em Andamento",
  aguardando_validacao:        "Aguardando Validação",
  pendente_validacao_dpo:      "Aguardando Validação",
  aguardando_nova_validacao:   "Aguardando Nova Validação",
  em_validacao:                "Em Validação",
  ajustes_solicitados:         "Ajustes Solicitados",
  concluida:                "Validada",
  concluida_cliente:        "Concluída (Cliente)",
  vencida:                  "Vencida",
  cancelada:                "Cancelada",
};

export const ACTION_PRIORITY_COLORS: Record<string, string> = {
  baixa:   "bg-slate-100 text-slate-700 border-slate-200",
  media:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  alta:    "bg-orange-100 text-orange-800 border-orange-200",
  critica: "bg-red-100 text-red-800 border-red-200",
};

export const ACTION_PRIORITY_LABELS: Record<string, string> = {
  baixa:   "Baixa",
  media:   "Média",
  alta:    "Alta",
  critica: "Crítica",
};

/** Retorna a cor do status ou um fallback neutro */
export function getActionStatusColor(status: string): string {
  return ACTION_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

/** Retorna o rótulo do status ou o próprio status como fallback */
export function getActionStatusLabel(status: string): string {
  return ACTION_STATUS_LABELS[status] ?? status;
}

/** Retorna a cor da prioridade ou um fallback neutro */
export function getActionPriorityColor(priority: string): string {
  return ACTION_PRIORITY_COLORS[priority] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

/** Retorna o rótulo da prioridade ou o próprio valor como fallback */
export function getActionPriorityLabel(priority: string): string {
  return ACTION_PRIORITY_LABELS[priority] ?? priority;
}
