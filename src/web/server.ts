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

  const db = getDb();

  // Archive done items older than 7 days — run on startup and daily
  function archiveOldDoneItems() {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE items SET status = 'archived', updated_at = ?
      WHERE status = 'done'
        AND completed_at IS NOT NULL
        AND completed_at < datetime('now', '-7 days')
    `).run(now);
  }
  archiveOldDoneItems();
  setInterval(archiveOldDoneItems, 24 * 60 * 60 * 1000);

  // Start Mode B scheduler if enabled
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
  app.use((_req, res) => {
    res.sendFile("index.html", { root: webDist });
  });

  app.listen(port, () => {
    console.error(`Foreman dashboard running at http://localhost:${port}`);
  });
}
