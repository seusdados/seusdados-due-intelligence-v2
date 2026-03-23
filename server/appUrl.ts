/**
 * Helper centralizado para obter a URL base da aplicação.
 * 
 * Ordem de prioridade:
 * 1. PUBLIC_APP_URL (configurada pelo admin — fonte canônica)
 * 2. VITE_APP_URL (legado, mantido para compatibilidade)
 * 3. Fallback construído a partir do VITE_APP_ID
 * 
 * Nunca retorna barra final.
 */
export function getAppBaseUrl(): string {
  const url =
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_APP_URL ||
    (process.env.VITE_APP_ID
      ? `https://${process.env.VITE_APP_ID}.manus.space`
      : "https://dll.seusdados.com");

  return url.replace(/\/+$/, "");
}
