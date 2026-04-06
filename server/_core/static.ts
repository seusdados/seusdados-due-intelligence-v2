import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function getDistPath() {
  return process.env.NODE_ENV === "development"
    ? path.resolve(import.meta.dirname, "../..", "dist", "public")
    : path.resolve(import.meta.dirname, "public");
}

// Serve static assets early (before CORS checks) so CSS/JS aren't blocked
export function serveStaticAssets(app: Express) {
  const distPath = getDistPath();
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));
}

// SPA fallback — must be registered last, after all API routes
export function serveStatic(app: Express) {
  const distPath = getDistPath();

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
