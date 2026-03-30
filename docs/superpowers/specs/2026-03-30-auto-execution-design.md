# Auto-Execution Design

**Date:** 2026-03-30
**Status:** Approved
**Release:** v2.3

---

## Overview

Foreman can dispatch Claude Code to autonomously work on backlog items marked `execution_mode: "auto"`. Three toggleable modes let users control when execution fires: at session start (Mode A), on a schedule (Mode B), or on-demand from the dashboard (Mode C).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Execution Engine                     │
│   src/executor/runner.ts                                │
│   Spawns claude CLI, captures output, updates status    │
└────────────┬──────────────┬────────────────┬────────────┘
             │              │                │
         Mode A          Mode B           Mode C
    (session start)    (scheduler)    (manual trigger)
    CLAUDE.md hook    setInterval     POST /api/execute
                      in server.ts    dashboard button
```

**New files:**
- `src/executor/runner.ts` — core execution engine
- `src/executor/scheduler.ts` — Mode B scheduled runner
- `src/web/routes/execute.ts` — `POST /api/execute` endpoint
- `src/web/routes/settings.ts` — `GET/PUT /api/settings` endpoint
- `web/src/pages/ExecutionPage.tsx` — dashboard controls + log

**Modified files:**
- `src/db.ts` — migration for new columns + settings table
- `src/web/server.ts` — mount new routes, init scheduler
- `web/src/components/Sidebar.tsx` — add Execution nav link
- `web/src/App.tsx` — add `/execution` route

---

## Data Model

### items table additions

```sql
ALTER TABLE items ADD COLUMN execution_status TEXT;
  -- null | 'queued' | 'running' | 'done' | 'failed'
ALTER TABLE items ADD COLUMN last_executed_at TEXT;
ALTER TABLE items ADD COLUMN execution_output TEXT;
  -- stdout/stderr from last run (truncated to 10000 chars)
```

### settings table (new)

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Default rows inserted on first run:

| key | default |
|-----|---------|
| `mode_a_enabled` | `false` |
| `mode_b_enabled` | `false` |
| `mode_b_interval_minutes` | `60` |

### Item execution lifecycle

```
ready + auto → (runner picks up)
  → execution_status: 'queued'
  → execution_status: 'running'
  → Claude calls pm_update_item (status: done | in_progress)
  → execution_status: 'done'

If Claude exits without calling pm_update_item:
  → item status set to 'in_progress' (for review)
  → execution_status: 'done'

If process times out or crashes:
  → execution_status: 'failed'
  → item status unchanged
```

---

## Execution Engine (`src/executor/runner.ts`)

### Selection query

```sql
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
LIMIT 1
```

Blocked items (where any `blocked_by` ID is not done) are excluded via post-query filtering, consistent with `pm_next_work`.

### Execution steps

1. Select item (query above)
2. If no item → return `{ started: false, reason: "no items" }`
3. If another item has `execution_status = 'running'` → return `{ started: false, reason: "already running" }`
4. Set `execution_status = 'queued'`, `last_executed_at = now()`
5. Build prompt (see below)
6. Spawn: `claude --print --dangerously-skip-permissions -p "<prompt>"` with `cwd = repo_path`
7. Set `execution_status = 'running'`
8. Capture stdout/stderr, enforce 30-minute timeout (`SIGTERM` on timeout)
9. On process exit:
   - Re-read item from DB
   - If item `status` changed → Claude updated it; set `execution_status = 'done'`
   - If item `status` unchanged → set item `status = 'in_progress'`, `execution_status = 'done'`
   - If timed out or exit code non-zero with no status change → set `execution_status = 'failed'`
10. Save `execution_output` (truncated to 10000 chars)
11. Return `{ started: true, item_id, execution_status }`

### Prompt template

```
You are autonomously working on a backlog item for project "{project_name}".

Item ID: {id}
Title: {title}
Description: {description}

Your task: complete this work in the project at {repo_path}.

When finished, call pm_update_item to update the item status:
- Use status "done" if you completed the task successfully
- Use status "in_progress" if you made meaningful progress but the work needs human review
- If you cannot complete the task, leave the status unchanged

The Foreman MCP tools are available to you.
```

### Concurrency

One item runs at a time. Concurrent trigger calls check for a `running` item and return `{ started: false, reason: "already running" }`.

---

## Mode A — Session Start

When `mode_a_enabled = true`, Foreman writes a managed block to `~/.claude/CLAUDE.md`:

```markdown
<!-- foreman-auto-execution-start -->
## Foreman Auto-Execution
At the start of every session, call pm_next_work.
For any items returned with execution_mode "auto", execute them before starting other work.
Use pm_update_item to mark each item "done" or "in_progress" when finished.
<!-- foreman-auto-execution-end -->
```

Toggling Mode A off removes the block between the comment markers. Foreman manages only its own block — other CLAUDE.md content is untouched.

The `~/.claude/CLAUDE.md` path on Windows: `C:\Users\<username>\.claude\CLAUDE.md` (resolved via `os.homedir()`).

---

## Mode B — Scheduled

`src/executor/scheduler.ts` exports `startScheduler(db)` and `stopScheduler()`.

On `startScheduler`:
- Reads `mode_b_interval_minutes` from settings
- Creates an `setInterval` timer
- Each tick: calls `runner.run(db)` if Mode B is still enabled

`server.ts` calls `startScheduler(db)` after mounting routes when `--web` flag is set.

When interval setting changes via `PUT /api/settings`, the scheduler restarts with the new interval.

---

## Mode C — Manual Trigger

```
POST /api/execute
Auth: respects FOREMAN_API_KEY
Response: { started: boolean, reason?: string, item_id?: string }
```

Immediately calls `runner.run(db)`. Returns the result directly. The dashboard "Run Now" button calls this and shows inline feedback.

---

## Settings API

```
GET  /api/settings        → { mode_a_enabled, mode_b_enabled, mode_b_interval_minutes }
PUT  /api/settings        → partial update, returns updated settings
```

PUT body example:
```json
{ "mode_b_enabled": true, "mode_b_interval_minutes": 240 }
```

When `mode_a_enabled` changes → write/remove CLAUDE.md block.
When `mode_b_enabled` or `mode_b_interval_minutes` changes → restart scheduler.

---

## Dashboard UI (`web/src/pages/ExecutionPage.tsx`)

### Route

`/execution` — linked from sidebar as "Execution" with a ▶ icon.

### Layout (three sections)

**1. Mode controls**

```
Auto-Execution Settings

○ Mode A — Session start        [ON / OFF toggle]
  Claude picks up auto items at the start of each Claude Code session

○ Mode B — Scheduled            [ON / OFF toggle]
  [Every 1 hour ▾]  runs automatically in background
  (interval options: 30 min / 1 hour / 4 hours / 8 hours / daily)

○ Mode C — Manual               [▶ Run Now]  [status: idle | running...]
```

**2. Auto queue**

Table of items with `execution_mode: auto`, showing: title, project, status, execution_status, last_executed_at. Includes an "execution_mode" toggle on each item (to flag items as auto from this page). Inline `execution_output` expand on click.

**3. Execution log**

Last 20 completed executions: item title, project, started at, duration, status badge (done / failed). Collapsible output panel per row.

---

## Test Items

Two items to use for smoke testing after implementation:

1. **"Can drag items in backlog to change order"** (ff9118d4) — feature, ROI 5, small
2. **"Default for New Backlog item should be Auto- Claude does it"** (275cb841) — chore, small

Steps: mark both as `execution_mode: auto`, go to Execution page, click "Run Now", verify Claude works on them.

---

## Non-Goals

- Parallel execution (one item at a time only)
- Execution history beyond `execution_output` on the item (no separate runs table)
- Email/push notifications on completion
- Per-item timeout configuration (30 min global)
- Rollback if Claude's changes are wrong
