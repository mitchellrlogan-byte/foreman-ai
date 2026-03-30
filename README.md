# foreman-ai

**Persistent, cross-project backlog management for Claude Code.**

[![npm version](https://img.shields.io/npm/v/foreman-ai.svg)](https://www.npmjs.com/package/foreman-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-brightgreen.svg)](https://modelcontextprotocol.io)

---

<!-- TODO: add dashboard screenshot after v2.1 frontend is built -->
<!-- Take a screenshot of http://localhost:4040 after running `npm run dashboard`, save to docs/screenshots/dashboard.png -->
<!-- ![Foreman AI Dashboard](docs/screenshots/dashboard.png) -->

## The problem

Every Claude Code session starts from scratch.

You close the tab, lose the context, and spend the first five minutes of your next session figuring out where you left off. Multiply that across three projects and you're constantly context-switching with no single source of truth for what actually needs doing.

Jira is overkill. GitHub Issues doesn't talk to Claude. Sticky notes don't survive a reboot.

## What Foreman does

Foreman is an MCP server that gives Claude Code a **persistent, shared backlog** across all your projects. It runs locally, stores everything in a SQLite file, and surfaces 13 tools that let Claude read and write your backlog mid-session — no copy-pasting, no switching tabs.

The killer feature is one tool:

```
pm_next_work
```

Ask Claude "what should I work on?" and it returns your top unblocked items, ranked by priority and ROI score, filtered for dependencies. It's the thing you actually want at the start of every session.

---

## Install

```bash
npm install -g foreman-ai
```

Add to your Claude Code MCP config (`~/.claude/claude_desktop_config.json` or `~/.mcp.json`):

```json
{
  "mcpServers": {
    "foreman": {
      "command": "foreman-ai",
      "args": ["--db", "~/.foreman/foreman.db"]
    }
  }
}
```

Restart Claude Code. The `pm_*` tools are now available in every session, every project.

---

## How it works in practice

**Start a new session:**
> "Hey Claude, what should we work on in foreman-ai today?"

Claude calls `pm_next_work` and responds:
> "Your top unblocked items are: (1) Item detail drawer — ROI 9, small effort. (2) Edit/delete UI — ROI 8, small effort. Want to start on the drawer?"

**End a session:**
> "We're done for today — wrap up the session."

Claude calls `pm_end_session` with a summary of what was completed and which items were touched. Next time you open Claude, it knows exactly where you left off.

**Across projects:**
> "What's the highest-ROI thing I could work on across all my projects right now?"

Claude calls `pm_next_work` without a project filter and gives you a ranked list across everything — foreman-ai, paris-bets, haussmann, whatever you have registered.

---

## Web Dashboard

Manage your backlog from a browser instead of a chat window.

```bash
foreman-ai --web --port 4040
```

Open `http://localhost:4040`:

- **Dashboard** — live stats, your top `pm_next_work` items, in-progress items across all projects
- **Board view** — Kanban columns per project (Backlog → Ready → In Progress → Done)
- **Table view** — dense MS-Project-style data grid, sortable by priority/ROI
- **Item detail drawer** — click any item to view and edit all fields inline
- **Quick-add items** — `+ Add item` at the bottom of any column, or the global `+ New Item` button from anywhere
- **Scan for Projects** — point it at a directory, it finds all your git/npm repos and lets you register them in one click
- **Add Project manually** — paste a full path to register any project instantly
- **Execution page** — toggle auto-execution modes, see the auto queue, trigger manual runs
- Mobile-friendly — add items from your phone

Optional API key auth: `FOREMAN_API_KEY=yourkey foreman-ai --web`

---

## Auto-Execution

Let Claude work through your backlog autonomously. Mark any item as `execution_mode: auto` and enable one of three modes from the **Execution** page:

| Mode | How it works |
|------|-------------|
| **A — Session start** | Writes a hook to `~/.claude/CLAUDE.md`. At the start of every Claude Code session, Claude calls `pm_next_work` and picks up auto items before starting anything else. |
| **B — Scheduled** | Runs in the background on a configurable interval (30 min / 1 hour / 4 hours / 8 hours / daily). |
| **C — Manual** | Click "Run Now" from the dashboard to trigger a single execution immediately. |

Each run spawns `claude --print --dangerously-skip-permissions` in the project's repo, with a 30-minute timeout. Claude is prompted to call `pm_update_item` when done to mark items `done` or `in_progress`. Execution output is stored on the item and visible in the auto queue.

**Requires:** `claude` CLI installed globally — `npm install -g @anthropic/claude-code`

---

## Tools reference

### Projects
| Tool | What it does |
|------|-------------|
| `pm_register_project` | Register a project (run once per repo). Upserts — safe to re-run. |
| `pm_list_projects` | List all registered projects with item counts. |

### Backlog
| Tool | What it does |
|------|-------------|
| `pm_add_item` | Add a work item. Required: `project_id`, `title`. Optional: status, priority, category, ROI score, effort, tags, blocked_by. |
| `pm_update_item` | Update any field on an item. Partial updates — only send what changed. |
| `pm_list_items` | Query items with filters: project, status, category, tag, execution_mode. |
| `pm_get_item` | Get full detail on one item. Supports ID prefix matching. |
| `pm_delete_item` | Remove an item permanently. |

### Smart operations
| Tool | What it does |
|------|-------------|
| `pm_next_work` | **The main event.** Returns top N unblocked items ranked by status → priority → ROI. Filters out anything blocked by an incomplete dependency. |
| `pm_prioritize` | Bulk re-score ROI and priorities in one call. Useful after planning sessions. |
| `pm_bulk_import` | Import a JSON array of items. Good for migrating from another system. |

### Sessions
| Tool | What it does |
|------|-------------|
| `pm_start_session` | Begin a work session for a project. Auto-closes any open session first. |
| `pm_end_session` | Close the session with a summary and list of items touched. |
| `pm_list_sessions` | View past sessions — timestamps, duration, what was worked on. |

---

## Data model

Items carry enough metadata to make `pm_next_work` actually intelligent:

| Field | Values | Purpose |
|-------|--------|---------|
| `status` | `backlog` `ready` `in_progress` `done` `archived` | Current state |
| `priority` | integer (lower = higher) | Manual ordering |
| `roi_score` | 1–10 | Value vs effort rating for smart ranking |
| `effort` | `small` `medium` `large` | Scope estimate |
| `category` | `feature` `bug` `research` `chore` | Type filter |
| `blocked_by` | `[]` of item IDs | Dependency tracking — blocked items are excluded from `pm_next_work` |
| `execution_mode` | `manual` `auto` | Manual = you do it. Auto = Claude dispatch (coming in v2.3). |
| `tags` | `[]` of strings | Free-form labels |
| `source` | `user` `claude` `auto` | Who created this item |

---

## Usage patterns

**Register a project once:**
```
pm_register_project: { id: "my-app", name: "My App", repo_path: "/Users/me/my-app" }
```

**Seed your backlog:**
```
pm_bulk_import: {
  project_id: "my-app",
  items: [
    { title: "Add auth", category: "feature", priority: 1, roi_score: 9, effort: "medium" },
    { title: "Fix login bug", category: "bug", priority: 2, roi_score: 10, effort: "small" },
    { title: "Write tests", category: "chore", priority: 3, roi_score: 6, effort: "large" }
  ]
}
```

**Start every session with:**
```
pm_next_work: { project_id: "my-app", limit: 5 }
```

**Set dependencies so blocked work stays out of the way:**
```
pm_update_item: { id: "abc123", blocked_by: ["def456"] }
```
Item `abc123` won't appear in `pm_next_work` until `def456` is done.

---

## Configuration

| Flag | Env var | Default | Description |
|------|---------|---------|-------------|
| `--db <path>` | `FOREMAN_DB` | `~/.foreman/foreman.db` | SQLite database path |
| `--web` | — | off | Enable web dashboard mode |
| `--port <n>` | `FOREMAN_PORT` | `4040` | Dashboard port |
| — | `FOREMAN_API_KEY` | unset | Enables bearer token auth on the REST API |

The database directory is created automatically on first run.

---

## Roadmap

**v2.1 — Dashboard redesign** *(shipped)*
Full board and table views, item detail drawer, edit/delete in UI, Midnight+Teal visual design, API key auth.

**v2.2 — Project management UX** *(shipped)*
Quick-add items from anywhere. Scan your filesystem to discover and register projects in one click. No CLI required.

**v2.3 — Auto-Execution** *(current)*
Claude autonomously picks up and executes backlog items marked `execution_mode: "auto"`. Three toggleable modes from the dashboard: Mode A (session start — writes a hook to `~/.claude/CLAUDE.md`), Mode B (background scheduler), Mode C (manual "Run Now" trigger). Requires `claude` CLI (`npm install -g @anthropic/claude-code`).

---

## Deploy to Fly.io

Run the dashboard in the cloud so it's accessible from anywhere.

**Prerequisites:** [flyctl installed](https://fly.io/docs/hands-on/install-flyctl/) and logged in.

```bash
# 1. Set a unique app name in fly.toml  (app = "foreman-ai-your-name")

# 2. Create the app and volume
fly launch --no-deploy
fly volumes create foreman_data --size 1 --region ord

# 3. Set an API key (recommended for cloud)
fly secrets set FOREMAN_API_KEY=$(openssl rand -hex 32)

# 4. Deploy
fly deploy
```

Your dashboard is live at `https://foreman-ai-your-name.fly.dev`.

**Run with Docker:**

```bash
docker run -p 4040:4040 \
  -v ~/.foreman:/data \
  -e FOREMAN_DB=/data/foreman.db \
  foreman-ai:latest
```

---

## Why not just use GitHub Issues / Linear / Jira?

Those tools are built for humans reading a web UI. Foreman is built for an AI agent reading a backlog programmatically, mid-session, with zero latency and no auth dance.

It's also local-first. No account, no API rate limits, no internet required. Your backlog is a file on your machine.

If you want to integrate with GitHub Issues or Linear someday, Foreman's REST API makes it straightforward to sync. But for the core workflow — Claude asks what to do, does it, and logs what happened — nothing else is close.

---

## License

MIT
