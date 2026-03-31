import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export function initDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  migrate(db);
  return db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      repo_path TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'backlog',
      priority INTEGER NOT NULL DEFAULT 100,
      category TEXT NOT NULL DEFAULT 'feature',
      roi_score INTEGER,
      roi_reason TEXT NOT NULL DEFAULT '',
      effort TEXT,
      blocked_by TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL DEFAULT 'user',
      execution_mode TEXT NOT NULL DEFAULT 'manual',
      assigned_to TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      summary TEXT NOT NULL DEFAULT '',
      items_touched TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_items_project ON items(project_id);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
  `);

  // v2.3 migrations — execution columns (safe re-run)
  for (const col of [
    "ALTER TABLE items ADD COLUMN execution_status TEXT",
    "ALTER TABLE items ADD COLUMN last_executed_at TEXT",
    "ALTER TABLE items ADD COLUMN execution_output TEXT",
  ]) {
    try { db.exec(col); } catch { /* column already exists */ }
  }

  // v2.4 migrations — acceptance criteria, notes, attachments (safe re-run)
  for (const col of [
    "ALTER TABLE items ADD COLUMN acceptance_criteria TEXT",
    "ALTER TABLE items ADD COLUMN notes TEXT",
    "ALTER TABLE items ADD COLUMN attachments TEXT DEFAULT '[]'",
  ]) {
    try { db.exec(col); } catch { /* column already exists */ }
  }

  // v2.5 migrations — Jira-inspired fields (safe re-run)
  for (const col of [
    "ALTER TABLE items ADD COLUMN due_date TEXT",
    "ALTER TABLE items ADD COLUMN story_points INTEGER",
    "ALTER TABLE items ADD COLUMN user_story TEXT",
    "ALTER TABLE items ADD COLUMN severity TEXT",
    "ALTER TABLE items ADD COLUMN environment TEXT",
  ]) {
    try { db.exec(col); } catch { /* column already exists */ }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Insert defaults only when key doesn't exist
  const insertDefault = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  insertDefault.run("mode_a_enabled", "false");
  insertDefault.run("mode_b_enabled", "false");
  insertDefault.run("mode_b_interval_minutes", "60");
}
