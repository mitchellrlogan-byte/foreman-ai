import { Router } from "express";
import { getDb } from "../../db.js";
import type { Session } from "../../types.js";

function rowToSession(row: Record<string, unknown>): Session {
  return {
    ...row,
    items_touched: JSON.parse(row.items_touched as string),
  } as Session;
}

export const sessionsRouter = Router();

sessionsRouter.get("/", (req, res) => {
  const db = getDb();
  const { project_id, limit } = req.query;
  const max = Math.min(parseInt(limit as string) || 20, 50);

  let query = "SELECT * FROM sessions";
  const params: unknown[] = [];

  if (project_id) {
    query += " WHERE project_id = ?";
    params.push(project_id);
  }

  query += " ORDER BY started_at DESC LIMIT ?";
  params.push(max);

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  res.json(rows.map(rowToSession));
});

sessionsRouter.get("/:id", (req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(rowToSession(row));
});
