import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { corsMiddleware, apiKeyAuth } from "./middleware.js";
import { projectsRouter } from "./routes/projects.js";
import { itemsRouter } from "./routes/items.js";
import { sessionsRouter } from "./routes/sessions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function startWebServer(port: number): void {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json());
  app.use("/api/*path", apiKeyAuth);

  // REST API routes
  app.use("/api/projects", projectsRouter);
  app.use("/api/items", itemsRouter);
  app.use("/api/sessions", sessionsRouter);

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
