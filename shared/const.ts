export const COOKIE_NAME = "app_session_id";

// Duração de sessão - 8 horas para segurança (antes era 1 ano)
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 8; // 8 horas
export const ONE_YEAR_MS = SESSION_DURATION_MS; // Alias para compatibilidade
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Faça login para continuar (10001)';
export const NOT_ADMIN_ERR_MSG = 'Você não possui permissão para realizar esta ação. Apenas administradores podem executar esta operação. (10002)';
