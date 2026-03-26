/**
 * Helper centralizado para obter a URL base da aplicação.
 * 
 * Ordem de prioridade:
 * 1. PUBLIC_APP_URL (configurada pelo admin — fonte canônica)
 * 2. VITE_APP_URL (legado, mantido para compatibilidade)
 * 3. Fallback padrão
 * 
 * Nunca retorna barra final.
 */
export function getAppBaseUrl(): string {
  const url =
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_APP_URL ||
    "https://sea-turtle-app-l53fc.ondigitalocean.app";
  return url.replace(/\/+$/, "");
}
