import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db.js";
import type { Session } from "../types.js";

function rowToSession(row: Record<string, unknown>): Session {
  return {
    ...row,
    items_touched: JSON.parse(row.items_touched as string),
  } as Session;
}

export function registerSessionTools(server: McpServer): void {
  server.tool(
    "pm_start_session",
    "Start a work session. Call at the beginning of a Claude Code session to enable tracking.",
    {
      project_id: z.string().describe("Project slug for this session"),
    },
    async ({ project_id }) => {
      const db = getDb();

      // Check project exists
      const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(project_id);
      if (!project) {
        return {
          content: [{ type: "text" as const, text: `Project '${project_id}' not found. Register it first with pm_register_project.` }],
        };
      }

      // Close any open sessions for this project
      const now = new Date().toISOString();
      db.prepare(
        "UPDATE sessions SET ended_at = ? WHERE project_id = ? AND ended_at IS NULL"
      ).run(now, project_id);

      const id = uuidv4();
      db.prepare(
        "INSERT INTO sessions (id, project_id, started_at) VALUES (?, ?, ?)"
      ).run(id, project_id, now);

      return {
        content: [{ type: "text" as const, text: `Session started (${id.slice(0, 8)}). Use pm_end_session when done.` }],
      };
    }
  );

  server.tool(
    "pm_end_session",
    "End the current work session. Logs summary and items touched.",
    {
      project_id: z.string().describe("Project slug"),
      summary: z.string().optional().describe("What was accomplished this session"),
      items_touched: z.array(z.string()).optional().describe("Array of item IDs worked on"),
    },
    async ({ project_id, summary, items_touched }) => {
      const db = getDb();
      const now = new Date().toISOString();

      // Find the open session for this project
      const session = db.prepare(
        "SELECT * FROM sessions WHERE project_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1"
      ).get(project_id) as Record<string, unknown> | undefined;

      if (!session) {
        return {
          content: [{ type: "text" as const, text: `No active session for '${project_id}'. Start one with pm_start_session.` }],
        };
      }

      db.prepare(
        "UPDATE sessions SET ended_at = ?, summary = ?, items_touched = ? WHERE id = ?"
      ).run(
        now,
        summary ?? "",
        JSON.stringify(items_touched ?? []),
        session.id as string
      );

      const startedAt = session.started_at as string;
      const startTime = new Date(startedAt).getTime();
      const endTime = new Date(now).getTime();
      const durationMin = Math.round((endTime - startTime) / 60000);

      return {
        content: [{
          type: "text" as const,
          text: `Session ended (${(session.id as string).slice(0, 8)}). Duration: ${durationMin} minutes. ${(items_touched ?? []).length} items touched.`,
        }],
      };
    }
  );

  server.tool(
    "pm_list_sessions",
    "List past work sessions. Shows what was done and when.",
    {
      project_id: z.string().optional().describe("Filter by project (omit for all)"),
      limit: z.number().int().min(1).max(50).optional().describe("Number of sessions (default 10)"),
    },
    async ({ project_id, limit }) => {
      const db = getDb();
      const max = limit ?? 10;

      let query = "SELECT * FROM sessions";
      const params: unknown[] = [];

      if (project_id) {
        query += " WHERE project_id = ?";
        params.push(project_id);
      }

      query += " ORDER BY started_at DESC LIMIT ?";
      params.push(max);

      const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

      if (rows.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No sessions found." }],
        };
      }

      const sessions = rows.map(rowToSession);
      const text = sessions
        .map((s) => {
          const duration = s.ended_at
            ? `${Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)} min`
            : "active";
          return `**${s.project_id}** (${s.id.slice(0, 8)}) — ${s.started_at.slice(0, 16)} [${duration}]\n  ${s.summary || "No summary"}\n  Items: ${s.items_touched.length > 0 ? s.items_touched.map((id) => id.slice(0, 8)).join(", ") : "none"}`;
        })
        .join("\n\n");

      return {
        content: [{ type: "text" as const, text: `${sessions.length} sessions:\n\n${text}` }],
      };
    }
  );
}
