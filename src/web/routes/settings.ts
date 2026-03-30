// src/web/routes/settings.ts
import { Router } from "express";
import os from "os";
import path from "path";
import fs from "fs";
import { getDb } from "../../db.js";
import { startScheduler, stopScheduler } from "../../executor/scheduler.js";

export const settingsRouter = Router();

const FOREMAN_BLOCK_START = "<!-- foreman-auto-execution-start -->";
const FOREMAN_BLOCK_END = "<!-- foreman-auto-execution-end -->";
const FOREMAN_BLOCK_CONTENT = `${FOREMAN_BLOCK_START}
## Foreman Auto-Execution
At the start of every session, call pm_next_work.
For any items returned with execution_mode "auto", execute them before starting other work.
Use pm_update_item to mark each item "done" or "in_progress" when finished.
${FOREMAN_BLOCK_END}`;

function getClaudeMdPath(): string {
  return path.join(os.homedir(), ".claude", "CLAUDE.md");
}

function writeClaudeMdBlock(enable: boolean): void {
  const filePath = getClaudeMdPath();

  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    // File doesn't exist — start with empty
  }

  // Remove existing block
  const startIdx = content.indexOf(FOREMAN_BLOCK_START);
  const endIdx = content.indexOf(FOREMAN_BLOCK_END);
  if (startIdx !== -1 && endIdx !== -1) {
    content =
      content.slice(0, startIdx).trimEnd() +
      content.slice(endIdx + FOREMAN_BLOCK_END.length);
  }

  if (enable) {
    content = content.trimEnd() + "\n\n" + FOREMAN_BLOCK_CONTENT + "\n";
  } else {
    content = content.trimEnd() + "\n";
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function getSettings() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    mode_a_enabled: map["mode_a_enabled"] === "true",
    mode_b_enabled: map["mode_b_enabled"] === "true",
    mode_b_interval_minutes: parseInt(map["mode_b_interval_minutes"] ?? "60", 10),
  };
}

settingsRouter.get("/", (_req, res) => {
  res.json(getSettings());
});

settingsRouter.put("/", (req, res) => {
  const db = getDb();
  const body = req.body as Partial<{
    mode_a_enabled: boolean;
    mode_b_enabled: boolean;
    mode_b_interval_minutes: number;
  }>;

  const update = db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
  );

  const prev = getSettings();

  if (body.mode_a_enabled !== undefined) {
    update.run("mode_a_enabled", String(body.mode_a_enabled));
    if (body.mode_a_enabled !== prev.mode_a_enabled) {
      writeClaudeMdBlock(body.mode_a_enabled);
    }
  }

  if (body.mode_b_enabled !== undefined) {
    update.run("mode_b_enabled", String(body.mode_b_enabled));
  }

  if (body.mode_b_interval_minutes !== undefined) {
    update.run("mode_b_interval_minutes", String(body.mode_b_interval_minutes));
  }

  const intervalChanged =
    body.mode_b_interval_minutes !== undefined &&
    body.mode_b_interval_minutes !== prev.mode_b_interval_minutes;
  const modeChanged =
    body.mode_b_enabled !== undefined &&
    body.mode_b_enabled !== prev.mode_b_enabled;

  if (modeChanged || intervalChanged) {
    if (getSettings().mode_b_enabled) {
      startScheduler(db);
    } else {
      stopScheduler();
    }
  }

  res.json(getSettings());
});
