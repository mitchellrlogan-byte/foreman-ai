import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { corsMiddleware, apiKeyAuth } from "./middleware.js";
import { projectsRouter } from "./routes/projects.js";
import { itemsRouter, nextWorkRouter } from "./routes/items.js";
import { sessionsRouter } from "./routes/sessions.js";
import { scanRouter } from "./routes/scan.js";
import { settingsRouter } from "./routes/settings.js";
import { executeRouter } from "./routes/execute.js";
import { startScheduler } from "../executor/scheduler.js";
import { getDb } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function startWebServer(port: number): void {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json());
  app.use("/api/*path", apiKeyAuth);

  // REST API routes
  app.use("/api/projects", projectsRouter);
  app.use("/api/items", itemsRouter);
  app.use("/api/next-work", nextWorkRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/scan-projects", scanRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/execute", executeRouter);

  // Start Mode B scheduler if enabled
  const db = getDb();
  const modeBRow = db
    .prepare("SELECT value FROM settings WHERE key = 'mode_b_enabled'")
    .get() as { value: string } | undefined;
  if (modeBRow?.value === "true") {
    startScheduler(db);
  }

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", version: "2.0.0" });
  });

  // Serve frontend static files
  const webDist = path.join(__dirname, "..", "..", "web", "dist");
  app.use(express.static(webDist));

  // SPA fallback — serve index.html for all non-API routes
  app.get("*path", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });

  app.listen(port, () => {
    console.error(`Foreman dashboard running at http://localhost:${port}`);
  });
}
