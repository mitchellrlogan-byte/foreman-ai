import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDb } from "../db.js";
import type { Project } from "../types.js";

export function registerProjectTools(server: McpServer): void {
  server.tool(
    "pm_register_project",
    "Register a project with Foreman. Run once per project to enable backlog tracking.",
    {
      id: z.string().describe("Slug ID for the project, e.g. 'paris-bets'"),
      name: z.string().describe("Display name"),
      description: z.string().optional().describe("Project description"),
      repo_path: z.string().optional().describe("Filesystem path to repo root"),
    },
    async ({ id, name, description, repo_path }) => {
      const db = getDb();
      const now = new Date().toISOString();

      const existing = db
        .prepare("SELECT id FROM projects WHERE id = ?")
        .get(id) as Project | undefined;

      if (existing) {
        db.prepare(
          "UPDATE projects SET name = ?, description = ?, repo_path = ?, updated_at = ? WHERE id = ?"
        ).run(name, description ?? "", repo_path ?? "", now, id);

        return { content: [{ type: "text" as const, text: `Project '${id}' updated.` }] };
      }

      db.prepare(
        "INSERT INTO projects (id, name, description, repo_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(id, name, description ?? "", repo_path ?? "", now, now);

      return { content: [{ type: "text" as const, text: `Project '${id}' registered.` }] };
    }
  );

  server.tool(
    "pm_list_projects",
    "List all registered projects.",
    {},
    async () => {
      const db = getDb();
      const projects = db.prepare("SELECT * FROM projects ORDER BY name").all() as Project[];

      if (projects.length === 0) {
        return { content: [{ type: "text" as const, text: "No projects registered. Use pm_register_project first." }] };
      }

      const text = projects
        .map((p) => `**${p.name}** (${p.id})\n  ${p.description || "No description"}\n  Path: ${p.repo_path || "not set"}`)
        .join("\n\n");

      return { content: [{ type: "text" as const, text }] };
    }
  );
}
