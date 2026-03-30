// src/executor/runner.ts
import Database from "better-sqlite3";
import os from "os";
import path from "path";
import fs from "fs";
import { execFileNoThrow } from "../utils/execFileNoThrow.js";

export interface RunResult {
  started: boolean;
  reason?: string;
  item_id?: string;
  execution_status?: string;
}

interface ItemRow {
  id: string;
  title: string;
  description: string;
  status: string;
  project_id: string;
  project_name: string;
  repo_path: string;
  blocked_by: string;
}

function buildPrompt(item: ItemRow): string {
  return `You are autonomously working on a backlog item for project "${item.project_name}".

Item ID: ${item.id}
Title: ${item.title}
Description: ${item.description}

Your task: complete this work in the project at ${item.repo_path}.

When finished, call pm_update_item to update the item status:
- Use status "done" if you completed the task successfully
- Use status "in_progress" if you made meaningful progress but the work needs human review
- If you cannot complete the task, leave the status unchanged

The Foreman MCP tools are available to you.`;
}

export async function run(db: Database.Database): Promise<RunResult> {
  // Check if already running
  const running = db
    .prepare("SELECT id FROM items WHERE execution_status = 'running'")
    .get();
  if (running) {
    return { started: false, reason: "already running" };
  }

  // Select next eligible item
  const rows = db
    .prepare(`
      SELECT items.*, projects.name as project_name, projects.repo_path
      FROM items
      JOIN projects ON items.project_id = projects.id
      WHERE items.execution_mode = 'auto'
        AND items.status IN ('ready', 'backlog')
        AND (items.execution_status IS NULL OR items.execution_status NOT IN ('running', 'queued'))
      ORDER BY
        CASE items.status WHEN 'ready' THEN 0 ELSE 1 END,
        items.priority ASC,
        COALESCE(items.roi_score, 0) DESC
    `)
    .all() as ItemRow[];

  // Filter blocked items
  const doneIds = new Set(
    (db.prepare("SELECT id FROM items WHERE status = 'done'").all() as { id: string }[]).map(
      (r) => r.id
    )
  );

  const eligible = rows.find((row) => {
    const blocked = JSON.parse(row.blocked_by || "[]") as string[];
    return blocked.every((depId) => doneIds.has(depId));
  });

  if (!eligible) {
    return { started: false, reason: "no items" };
  }

  const now = new Date().toISOString();

  // Mark queued
  db.prepare(
    "UPDATE items SET execution_status = 'queued', last_executed_at = ? WHERE id = ?"
  ).run(now, eligible.id);

  const prompt = buildPrompt(eligible);

  // Mark running
  db.prepare("UPDATE items SET execution_status = 'running' WHERE id = ?").run(
    eligible.id
  );

  // Determine cwd — use repo_path if it exists, otherwise homedir
  const cwd = eligible.repo_path && fs.existsSync(eligible.repo_path)
    ? eligible.repo_path
    : os.homedir();

  const result = await execFileNoThrow(
    "claude",
    ["--print", "--dangerously-skip-permissions", "-p", prompt],
    { cwd, timeoutMs: 30 * 60 * 1000 }
  );

  // Re-read item to check if Claude updated status
  const updated = db
    .prepare("SELECT status FROM items WHERE id = ?")
    .get(eligible.id) as { status: string } | undefined;

  const output = (result.stdout + result.stderr).slice(0, 10000);

  let executionStatus: string;

  if (result.timedOut || (result.exitCode !== 0 && updated?.status === eligible.status)) {
    executionStatus = "failed";
    db.prepare(
      "UPDATE items SET execution_status = 'failed', execution_output = ? WHERE id = ?"
    ).run(output, eligible.id);
  } else if (updated && updated.status !== eligible.status) {
    // Claude updated the status
    executionStatus = "done";
    db.prepare(
      "UPDATE items SET execution_status = 'done', execution_output = ? WHERE id = ?"
    ).run(output, eligible.id);
  } else {
    // Claude exited but didn't update status — set to in_progress for review
    executionStatus = "done";
    db.prepare(
      "UPDATE items SET status = 'in_progress', execution_status = 'done', execution_output = ? WHERE id = ?"
    ).run(output, eligible.id);
  }

  return { started: true, item_id: eligible.id, execution_status: executionStatus };
}
