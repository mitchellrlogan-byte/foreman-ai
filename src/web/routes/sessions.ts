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
  const { project_id, limit, all } = req.query;

  let query = "SELECT * FROM sessions";
  const params: unknown[] = [];

  if (project_id) {
    query += " WHERE project_id = ?";
    params.push(project_id);
  }

  query += " ORDER BY started_at DESC";

  // If `all=true` is passed, skip limit (for analytics); otherwise cap at 200
  if (all !== "true") {
    const max = Math.min(parseInt(limit as string) || 20, 200);
    query += " LIMIT ?";
    params.push(max);
  }

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  res.json(rows.map(rowToSession));
});

sessionsRouter.get("/analytics", (req, res) => {
  const db = getDb();

  // Fetch all completed sessions (ended_at not null)
  const rows = db.prepare(
    "SELECT * FROM sessions ORDER BY started_at DESC"
  ).all() as Record<string, unknown>[];

  const sessions = rows.map(rowToSession);

  const completed = sessions.filter(s => s.ended_at !== null);

  // Total duration in seconds
  const totalDurationMs = completed.reduce((acc, s) => {
    const start = new Date(s.started_at).getTime();
    const end = new Date(s.ended_at!).getTime();
    return acc + (end - start);
  }, 0);

  const avgDurationMs = completed.length > 0 ? totalDurationMs / completed.length : 0;

  // Per-project breakdown
  const projectMap: Record<string, { count: number; totalMs: number; lastActive: string }> = {};
  for (const s of sessions) {
    const pid = s.project_id;
    if (!projectMap[pid]) {
      projectMap[pid] = { count: 0, totalMs: 0, lastActive: s.started_at };
    }
    projectMap[pid].count++;
    if (s.ended_at) {
      const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
      projectMap[pid].totalMs += ms;
    }
    if (s.started_at > projectMap[pid].lastActive) {
      projectMap[pid].lastActive = s.started_at;
    }
  }

  // Most active project by session count
  let mostActiveProject: string | null = null;
  let maxCount = 0;
  for (const [pid, data] of Object.entries(projectMap)) {
    if (data.count > maxCount) {
      maxCount = data.count;
      mostActiveProject = pid;
    }
  }

  res.json({
    totalSessions: sessions.length,
    completedSessions: completed.length,
    totalDurationMs,
    avgDurationMs,
    mostActiveProject,
    perProject: projectMap,
    sessions,
  });
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
