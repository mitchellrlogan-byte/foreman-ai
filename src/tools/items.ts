import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db.js";
import type { Item } from "../types.js";

const StatusEnum = z.enum(["backlog", "ready", "in_progress", "done", "archived"]);
const CategoryEnum = z.enum(["feature", "bug", "research", "chore"]);
const EffortEnum = z.enum(["small", "medium", "large"]);
const SourceEnum = z.enum(["user", "claude", "auto"]);
const ExecutionModeEnum = z.enum(["manual", "auto"]);

function rowToItem(row: Record<string, unknown>): Item {
  return {
    ...row,
    blocked_by: JSON.parse(row.blocked_by as string),
    tags: JSON.parse(row.tags as string),
  } as Item;
}

export function registerItemTools(server: McpServer): void {
  server.tool(
    "pm_add_item",
    "Add a work item to the backlog.",
    {
      project_id: z.string().describe("Project slug"),
      title: z.string().describe("Item title"),
      description: z.string().optional(),
      status: StatusEnum.optional(),
      priority: z.number().int().optional().describe("Lower = higher priority"),
      category: CategoryEnum.optional(),
      roi_score: z.number().int().min(1).max(10).optional(),
      roi_reason: z.string().optional(),
      effort: EffortEnum.optional(),
      blocked_by: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      source: SourceEnum.optional(),
      execution_mode: ExecutionModeEnum.optional(),
      assigned_to: z.string().optional(),
    },
    async (args) => {
      const db = getDb();
      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO items (id, project_id, title, description, status, priority, category,
          roi_score, roi_reason, effort, blocked_by, tags, source, execution_mode,
          assigned_to, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        args.project_id,
        args.title,
        args.description ?? "",
        args.status ?? "backlog",
        args.priority ?? 100,
        args.category ?? "feature",
        args.roi_score ?? null,
        args.roi_reason ?? "",
        args.effort ?? null,
        JSON.stringify(args.blocked_by ?? []),
        JSON.stringify(args.tags ?? []),
        args.source ?? "user",
        args.execution_mode ?? "manual",
        args.assigned_to ?? "",
        now,
        now
      );

      return { content: [{ type: "text" as const, text: `Item '${args.title}' added (${id}).` }] };
    }
  );

  server.tool(
    "pm_update_item",
    "Update any fields on a work item.",
    {
      id: z.string().describe("Item UUID"),
      title: z.string().optional(),
      description: z.string().optional(),
      status: StatusEnum.optional(),
      priority: z.number().int().optional(),
      category: CategoryEnum.optional(),
      roi_score: z.number().int().min(1).max(10).optional(),
      roi_reason: z.string().optional(),
      effort: EffortEnum.optional(),
      blocked_by: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      source: SourceEnum.optional(),
      execution_mode: ExecutionModeEnum.optional(),
      assigned_to: z.string().optional(),
    },
    async (args) => {
      const db = getDb();
      const { id, ...updates } = args;
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
        return { content: [{ type: "text" as const, text: "No fields to update." }] };
      }

      // Set completed_at when moving to done
      if (updates.status === "done") {
        sets.push("completed_at = ?");
        values.push(now);
      }

      sets.push("updated_at = ?");
      values.push(now);
      values.push(id);

      db.prepare(`UPDATE items SET ${sets.join(", ")} WHERE id = ?`).run(...values);

      return { content: [{ type: "text" as const, text: `Item ${id} updated.` }] };
    }
  );

  server.tool(
    "pm_list_items",
    "List backlog items with optional filters. Defaults to current project, non-archived.",
    {
      project_id: z.string().optional().describe("Filter by project"),
      status: StatusEnum.optional().describe("Filter by status"),
      category: CategoryEnum.optional().describe("Filter by category"),
      tag: z.string().optional().describe("Filter by tag"),
    },
    async (args) => {
      const db = getDb();
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (args.project_id) {
        conditions.push("project_id = ?");
        params.push(args.project_id);
      }
      if (args.status) {
        conditions.push("status = ?");
        params.push(args.status);
      } else {
        conditions.push("status != 'archived'");
      }
      if (args.category) {
        conditions.push("category = ?");
        params.push(args.category);
      }
      if (args.tag) {
        conditions.push("tags LIKE ?");
        params.push(`%"${args.tag}"%`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const rows = db
        .prepare(`SELECT * FROM items ${where} ORDER BY priority ASC, roi_score DESC`)
        .all(...params) as Record<string, unknown>[];

      if (rows.length === 0) {
        return { content: [{ type: "text" as const, text: "No items found." }] };
      }

      const items = rows.map(rowToItem);
      const text = items
        .map(
          (i) =>
            `[${i.status}] **${i.title}** (${i.id.slice(0, 8)})\n  Project: ${i.project_id} | Priority: ${i.priority} | ROI: ${i.roi_score ?? "?"}/10 | ${i.category} | ${i.effort ?? "unsized"}`
        )
        .join("\n\n");

      return { content: [{ type: "text" as const, text: `${items.length} items:\n\n${text}` }] };
    }
  );

  server.tool(
    "pm_get_item",
    "Get full details of a single work item.",
    {
      id: z.string().describe("Item UUID (full or prefix)"),
    },
    async ({ id }) => {
      const db = getDb();
      const row = db
        .prepare("SELECT * FROM items WHERE id = ? OR id LIKE ?")
        .get(id, `${id}%`) as Record<string, unknown> | undefined;

      if (!row) {
        return { content: [{ type: "text" as const, text: `Item '${id}' not found.` }] };
      }

      const item = rowToItem(row);
      const text = JSON.stringify(item, null, 2);

      return { content: [{ type: "text" as const, text }] };
    }
  );

  server.tool(
    "pm_delete_item",
    "Delete a work item.",
    {
      id: z.string().describe("Item UUID"),
    },
    async ({ id }) => {
      const db = getDb();
      const result = db.prepare("DELETE FROM items WHERE id = ?").run(id);

      if (result.changes === 0) {
        return { content: [{ type: "text" as const, text: `Item '${id}' not found.` }] };
      }

      return { content: [{ type: "text" as const, text: `Item ${id} deleted.` }] };
    }
  );
}
