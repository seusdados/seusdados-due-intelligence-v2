/**
 * db-push.ts — Executa drizzle-kit push com timeout.
 * Se falhar ou demorar demais, o processo sai com código 0
 * para não bloquear o start do servidor.
 */
import { execSync } from "child_process";

const TIMEOUT_MS = 30_000; // 30 segundos máximo

try {
  console.log("[db-push] Iniciando drizzle-kit push --force...");
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    timeout: TIMEOUT_MS,
  });
  console.log("[db-push] Schema sincronizado com sucesso.");
} catch (err: any) {
  console.error("[db-push] Falha ao sincronizar schema (servidor vai iniciar mesmo assim):", err.message || err);
}

process.exit(0);
