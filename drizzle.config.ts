import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Enable SSL for any non-localhost connection (DO requires SSL for remote hosts)
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

// pg v8.20 treats sslmode=require as verify-full (validates certs).
// DigitalOcean Dev DB uses self-signed certs, so we need uselibpqcompat=true
// to get standard libpq behavior (SSL without certificate validation).
let dbUrl = connectionString;
if (!isLocal) {
  // Ensure sslmode=require
  if (/sslmode=/.test(dbUrl)) {
    dbUrl = dbUrl.replace(/sslmode=[^&]*/g, 'sslmode=require');
  } else {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  // Add uselibpqcompat so pg doesn't upgrade require→verify-full
  if (!/uselibpqcompat=/.test(dbUrl)) {
    dbUrl += '&uselibpqcompat=true';
  }
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false } as any,
  },
});
