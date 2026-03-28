import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db.js";
import type { Item } from "../types.js";

function rowToItem(row: Record<string, unknown>): Item {
  return {
    ...row,
    blocked_by: JSON.parse(row.blocked_by as string),
    tags: JSON.parse(row.tags as string),
  } as Item;
}

export function registerSmartTools(server: McpServer): void {
  server.tool(
    "pm_next_work",
    "What should I work on next? Returns top unblocked items sorted by priority and ROI. This is the killer feature.",
    {
      project_id: z.string().optional().describe("Filter by project (omit for all projects)"),
      limit: z.number().int().min(1).max(20).optional().describe("Number of items to return (default 5)"),
    },
    async ({ project_id, limit }) => {
      const db = getDb();
      const max = limit ?? 5;

      // Get all non-archived, non-done items
      let query = `SELECT * FROM items WHERE status NOT IN ('done', 'archived')`;
      const params: unknown[] = [];

      if (project_id) {
        query += " AND project_id = ?";
        params.push(project_id);
      }

      const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
      const items = rows.map(rowToItem);

      // Filter out blocked items: an item is blocked if any of its blocked_by IDs
      // correspond to items that are NOT done
      const doneIds = new Set(
        (db.prepare("SELECT id FROM items WHERE status = 'done'").all() as { id: string }[]).map(
          (r) => r.id
        )
      );

      const unblocked = items.filter((item) =>
        item.blocked_by.every((blockerId) => doneIds.has(blockerId))
      );

      // Sort: lower priority number first, then higher ROI score, then ready before backlog
      const statusOrder: Record<string, number> = { in_progress: 0, ready: 1, backlog: 2 };
      unblocked.sort((a, b) => {
        const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
        if (statusDiff !== 0) return statusDiff;

        const priDiff = a.priority - b.priority;
        if (priDiff !== 0) return priDiff;

        return (b.roi_score ?? 0) - (a.roi_score ?? 0);
      });

      const top = unblocked.slice(0, max);

      if (top.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No actionable items found. Either everything is done, blocked, or archived.",
            },
          ],
        };
      }

      const text = top
        .map(
          (i, idx) =>
            `${idx + 1}. **${i.title}** (${i.id.slice(0, 8)})\n   Status: ${i.status} | Priority: ${i.priority} | ROI: ${i.roi_score ?? "?"}/10 | ${i.category} | ${i.effort ?? "unsized"}\n   ${i.description ? i.description.slice(0, 120) : "No description"}${i.roi_reason ? `\n   ROI reason: ${i.roi_reason}` : ""}`
        )
        .join("\n\n");

      return {
        content: [{ type: "text" as const, text: `Top ${top.length} items to work on:\n\n${text}` }],
      };
    }
  );

  server.tool(
    "pm_prioritize",
    "Re-score and re-rank items by ROI. Provide item IDs with new scores.",
    {
      updates: z
        .array(
          z.object({
            id: z.string(),
            roi_score: z.number().int().min(1).max(10),
            roi_reason: z.string().optional(),
            priority: z.number().int().optional(),
          })
        )
        .describe("Array of items with new ROI scores"),
    },
    async ({ updates }) => {
      const db = getDb();
      const now = new Date().toISOString();

      const stmt = db.prepare(
        "UPDATE items SET roi_score = ?, roi_reason = COALESCE(?, roi_reason), priority = COALESCE(?, priority), updated_at = ? WHERE id = ?"
      );

      let updated = 0;
      for (const u of updates) {
        const result = stmt.run(u.roi_score, u.roi_reason ?? null, u.priority ?? null, now, u.id);
        updated += result.changes;
      }

      return {
        content: [{ type: "text" as const, text: `Updated ${updated} of ${updates.length} items.` }],
      };
    }
  );

  server.tool(
    "pm_bulk_import",
    "Import items from a JSON array. Each object needs at minimum: project_id and title.",
    {
      items: z
        .array(
          z.object({
            project_id: z.string(),
            title: z.string(),
            description: z.string().optional(),
            status: z.string().optional(),
            priority: z.number().int().optional(),
            category: z.string().optional(),
            roi_score: z.number().int().optional(),
            roi_reason: z.string().optional(),
            effort: z.string().optional(),
            blocked_by: z.array(z.string()).optional(),
            tags: z.array(z.string()).optional(),
            source: z.string().optional(),
          })
        )
        .describe("Array of items to import"),
    },
    async ({ items }) => {
      const db = getDb();
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO items (id, project_id, title, description, status, priority, category,
          roi_score, roi_reason, effort, blocked_by, tags, source, execution_mode,
          assigned_to, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', '', ?, ?)
      `);

      let imported = 0;
      for (const item of items) {
        stmt.run(
          uuidv4(),
          item.project_id,
          item.title,
          item.description ?? "",
          item.status ?? "backlog",
          item.priority ?? 100,
          item.category ?? "feature",
          item.roi_score ?? null,
          item.roi_reason ?? "",
          item.effort ?? null,
          JSON.stringify(item.blocked_by ?? []),
          JSON.stringify(item.tags ?? []),
          item.source ?? "auto",
          now,
          now
        );
        imported++;
      }

      return {
        content: [{ type: "text" as const, text: `Imported ${imported} items.` }],
      };
    }
  );
}
