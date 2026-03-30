// src/executor/scheduler.ts
import Database from "better-sqlite3";
import { run } from "./runner.js";

let timer: ReturnType<typeof setInterval> | null = null;

export function startScheduler(db: Database.Database): void {
  stopScheduler();

  const row = db
    .prepare("SELECT value FROM settings WHERE key = 'mode_b_interval_minutes'")
    .get() as { value: string } | undefined;

  const minutes = parseInt(row?.value ?? "60", 10);
  const ms = minutes * 60 * 1000;

  timer = setInterval(async () => {
    const enabled = db
      .prepare("SELECT value FROM settings WHERE key = 'mode_b_enabled'")
      .get() as { value: string } | undefined;

    if (enabled?.value === "true") {
      await run(db).catch((err: unknown) =>
        console.error("Scheduler run error:", err)
      );
    }
  }, ms);
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
