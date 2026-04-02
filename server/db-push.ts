/**
 * db-push.ts — Executa drizzle-kit push com timeout.
 * Se falhar ou demorar demais, o processo sai com código 0
 * para não bloquear o start do servidor.
 */
import { execSync } from "child_process";

const TIMEOUT_MS = 20_000; // 20 segundos máximo

try {
  console.log("[db-push] Iniciando drizzle-kit push --force...");
  console.log("[db-push] DATABASE_URL definida:", !!process.env.DATABASE_URL);
  const startTime = Date.now();
  execSync("node_modules/.bin/drizzle-kit push --force", {
    stdio: "inherit",
    timeout: TIMEOUT_MS,
  });
  console.log(`[db-push] Schema sincronizado com sucesso em ${Date.now() - startTime}ms.`);
} catch (err: any) {
  console.error("[db-push] Falha ao sincronizar schema (servidor vai iniciar mesmo assim):", err.message || err);
}

process.exit(0);
