import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../../db.js";
import type { Item } from "../../types.js";

function rowToItem(row: Record<string, unknown>): Item {
  return {
    ...row,
    blocked_by: JSON.parse(row.blocked_by as string),
    tags: JSON.parse(row.tags as string),
  } as Item;
}

export const itemsRouter = Router();

// List items with filters
itemsRouter.get("/", (req, res) => {
  const db = getDb();
  const { project_id, status, category, tag, execution_mode } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (project_id) {
    conditions.push("project_id = ?");
    params.push(project_id);
  }
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  } else {
    conditions.push("status != 'archived'");
  }
  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }
  if (tag) {
    conditions.push("tags LIKE ?");
    params.push(`%"${tag}"%`);
  }
  if (execution_mode) {
    conditions.push("execution_mode = ?");
    params.push(execution_mode);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM items ${where} ORDER BY priority ASC, roi_score DESC`)
    .all(...params) as Record<string, unknown>[];

  res.json(rows.map(rowToItem));
});

// Get single item
itemsRouter.get("/:id", (req, res) => {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM items WHERE id = ? OR id LIKE ?")
    .get(req.params.id, `${req.params.id}%`) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(rowToItem(row));
});

// Create item
itemsRouter.post("/", (req, res) => {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const b = req.body;

  db.prepare(`
    INSERT INTO items (id, project_id, title, description, status, priority, category,
      roi_score, roi_reason, effort, blocked_by, tags, source, execution_mode,
      assigned_to, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    b.project_id,
    b.title,
    b.description ?? "",
    b.status ?? "backlog",
    b.priority ?? 100,
    b.category ?? "feature",
    b.roi_score ?? null,
    b.roi_reason ?? "",
    b.effort ?? null,
    JSON.stringify(b.blocked_by ?? []),
    JSON.stringify(b.tags ?? []),
    b.source ?? "user",
    b.execution_mode ?? "manual",
    b.assigned_to ?? "",
    now,
    now
  );

  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Record<string, unknown>;
  res.status(201).json(rowToItem(row));
});

// Update item
itemsRouter.patch("/:id", (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const updates = req.body;
  const now = new Date().toISOString();

  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    if (key === "blocked_by" || key === "tags") {
      sets.push(`${key} = ?`);
      values.push(JSON.stringify(value));
    } else {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (sets.length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  if (updates.status === "done") {
    sets.push("completed_at = ?");
    values.push(now);
  }

  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);

  const result = db.prepare(`UPDATE items SET ${sets.join(", ")} WHERE id = ?`).run(...values);

  if (result.changes === 0) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(id) as Record<string, unknown>;
  res.json(rowToItem(row));
});

// Delete item
itemsRouter.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json({ deleted: true });
});

export const nextWorkRouter = Router();

nextWorkRouter.get("/", (req, res) => {
  const db = getDb();
  const projectId = req.query.project_id as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

  const conditions = ["i.status NOT IN ('done', 'archived')"];
  const params: unknown[] = [];

  if (projectId) {
    conditions.push("i.project_id = ?");
    params.push(projectId);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = db.prepare(`
    SELECT * FROM items i
    ${where}
    ORDER BY
      CASE i.status WHEN 'in_progress' THEN 0 WHEN 'ready' THEN 1 ELSE 2 END,
      i.priority ASC,
      COALESCE(i.roi_score, 0) DESC
    LIMIT ?
  `).all(...params, limit) as Record<string, unknown>[];

  // Filter out items blocked by incomplete items
  const doneIds = new Set(
    (db.prepare("SELECT id FROM items WHERE status = 'done'").all() as { id: string }[])
      .map(r => r.id)
  );

  const unblocked = rows.filter(row => {
    const blockedBy: string[] = JSON.parse(row.blocked_by as string);
    return blockedBy.every(id => doneIds.has(id));
  });

  res.json(unblocked.slice(0, limit).map(row => ({
    ...row,
    blocked_by: JSON.parse(row.blocked_by as string),
    tags: JSON.parse(row.tags as string),
  })));
});
