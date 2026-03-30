# Technical Requirements Document — Foreman AI

**Version:** 2.0
**Date:** 2026-03-30
**Status:** Draft

---

## 1. System Architecture

Foreman AI is a dual-mode Node.js executable:

```
┌─────────────────────────────────────────────────────────┐
│                     foreman-ai binary                   │
│                                                         │
│  Mode 1: MCP Server (default)                           │
│    stdio transport ← → Claude Code / MCP client         │
│                                                         │
│  Mode 2: Web Server (--web flag)                        │
│    Express HTTP API + serves React SPA                  │
└─────────────────────────────────────────────────────────┘
                          │
                    better-sqlite3
                          │
               ~/.foreman/foreman.db (SQLite)
```

Both modes share the same database layer (`src/db.ts`) and business logic. The MCP tools and REST API expose the same underlying operations.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 18+ |
| Language | TypeScript (ESM) | 5.x |
| Module resolution | Node16 | — |
| Database | SQLite via better-sqlite3 | ^9 |
| MCP protocol | @modelcontextprotocol/sdk | ^1 |
| HTTP server | Express | ^5 |
| Validation | Zod | ^3 |
| Frontend framework | React | 19 |
| Frontend build | Vite | 8 |
| CSS | Tailwind CSS | v4 |
| Router | React Router | v7 |
| HTTP client | fetch (native) | — |

---

## 3. Database Schema

### projects
```sql
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,   -- slug, e.g. "foreman-ai"
  name        TEXT NOT NULL,
  description TEXT,
  repo_path   TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
```

### items
```sql
CREATE TABLE items (
  id             TEXT PRIMARY KEY,  -- UUID
  project_id     TEXT NOT NULL REFERENCES projects(id),
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'backlog',
    -- backlog | ready | in_progress | done | archived
  priority       INTEGER NOT NULL DEFAULT 50,
    -- lower = higher priority
  category       TEXT NOT NULL DEFAULT 'feature',
    -- feature | bug | research | chore
  roi_score      INTEGER,           -- 1–10
  effort         TEXT,              -- small | medium | large
  execution_mode TEXT DEFAULT 'manual',  -- manual | auto
  blocked_by     TEXT DEFAULT '[]', -- JSON array of item IDs
  tags           TEXT DEFAULT '[]', -- JSON array of strings
  source         TEXT DEFAULT 'user', -- user | claude | auto
  assigned_to    TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  completed_at   TEXT
);
CREATE INDEX idx_items_project ON items(project_id);
CREATE INDEX idx_items_status  ON items(status);
```

### sessions
```sql
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,  -- UUID
  project_id    TEXT NOT NULL REFERENCES projects(id),
  started_at    TEXT NOT NULL,
  ended_at      TEXT,
  summary       TEXT,
  items_touched TEXT DEFAULT '[]'  -- JSON array of item IDs
);
```

---

## 4. MCP Tool Contracts

All tools are defined with Zod schemas. Inputs are validated before reaching the database layer.

### pm_next_work
**Input:** `{ project_id?: string, limit?: number (default 5) }`
**Logic:**
1. Fetch all non-done, non-archived items for the project (or all projects)
2. Filter out items where any ID in `blocked_by` is not in status `done`
3. Sort by: `status_order` (in_progress → ready → backlog) → `priority` (asc) → `roi_score` (desc)
4. Return top N

### pm_prioritize
**Input:** `{ project_id: string, updates: Array<{ id: string, roi_score?: number, priority?: number }> }`
**Logic:** Bulk update ROI scores and priorities in a single transaction.

### pm_bulk_import
**Input:** `{ project_id: string, items: Array<ItemInput> }`
**Logic:** Insert all items in a single transaction. Returns count of inserted items.

---

## 5. REST API

Base path: `/api`
Auth: Optional `Authorization: Bearer <FOREMAN_API_KEY>` header (skipped if env var not set)

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create/upsert project |
| GET | `/api/projects/:id` | Get project by ID |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Items
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/items` | List items (query: project_id, status, category, tag, execution_mode) |
| POST | `/api/items` | Create item |
| GET | `/api/items/:id` | Get item |
| PATCH | `/api/items/:id` | Update item (partial) |
| DELETE | `/api/items/:id` | Delete item |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions` | List sessions (query: project_id) |
| POST | `/api/sessions` | Start session |
| GET | `/api/sessions/:id` | Get session |
| PATCH | `/api/sessions/:id` | Update/end session |

### Smart
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/next-work` | pm_next_work equivalent (query: project_id, limit) |
| GET | `/api/scan-projects` | Scan filesystem for git/npm projects (query: path) — returns `{ name, path, already_registered }[]` |

---

## 6. Frontend Architecture

### File Structure
```
web/
  src/
    App.tsx               # Router setup
    api/
      client.ts           # All fetch() calls, typed responses
    components/
      Sidebar.tsx          # Left nav, project list, Scan + Add Manual buttons
      ItemCard.tsx         # Kanban card
      ItemDrawer.tsx       # Slide-over detail/edit panel (v2.1)
      NewItemModal.tsx     # Global + New Item modal with project selector (v2.2)
      ScanProjectsModal.tsx # Scan filesystem for projects, bulk-register (v2.2)
      AddProjectModal.tsx  # Register project by pasting path (v2.2)
      StatusBadge.tsx      # Color-coded status chip
      TagBadge.tsx         # Category/ROI/effort tags
    pages/
      DashboardPage.tsx    # Overview: stats, next work, in-progress, projects
      ProjectPage.tsx      # Board + Table toggle for one project
      SessionsPage.tsx     # Session analytics (v2.2)
    hooks/
      useItems.ts          # Data fetching hook
      useProjects.ts       # Project data hook
  index.html
  vite.config.ts
  tailwind.config.ts
```

### Design System
- **Color palette:** Deep blue (`#080f1a`, `#0d1b2a`, `#0c1e30`) + cyan accent (`#0ea5e9`, `#38bdf8`) + teal secondary (`#14b8a6`)
- **Typography:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI'`)
- **Border radius:** 6–8px for cards, 4–5px for badges
- **Spacing:** 8px base unit
- **Status colors:**
  - Backlog: `#4b6a8a` (muted blue-gray)
  - Ready: `#34d399` (green)
  - In Progress: `#38bdf8` (cyan)
  - Done: `#4b6a8a` (muted, reduced opacity)

### Routing
```
/                     → DashboardPage
/projects/:id         → ProjectPage (board view default)
/projects/:id/table   → ProjectPage (table view)
/sessions             → SessionsPage (v2.2)
```

### API Client Pattern
All API calls go through `web/src/api/client.ts`. Base URL defaults to `http://localhost:4040`. Components use the client directly (no state management library — local `useState` + `useEffect` is sufficient for this scope).

---

## 7. Build & Deployment

### Development
```bash
# Terminal 1 — backend (MCP mode, no web server needed)
npm run build && node dist/index.js

# Terminal 2 — frontend dev server
cd web && npm run dev   # http://localhost:5173, proxies API to :4040
```

### Production
```bash
npm run build:all       # Compiles TS + builds React into web/dist/
node dist/index.js --web --port 4040
# Express serves web/dist/ as static files + /api routes
```

### npx / global install
```bash
npx foreman-ai --web --port 4040
```

---

## 8. Configuration

| CLI Flag | Env Var | Default | Description |
|----------|---------|---------|-------------|
| `--db <path>` | `FOREMAN_DB` | `~/.foreman/foreman.db` | SQLite file location |
| `--web` | — | false | Enable web server mode |
| `--port <n>` | `FOREMAN_PORT` | `4040` | HTTP port |
| — | `FOREMAN_API_KEY` | (unset) | Enables bearer auth if set |

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Cold start time | < 500ms |
| MCP tool response time | < 100ms for list/get, < 200ms for writes |
| Dashboard page load | < 1s (local) |
| Database size | Single file, no maintenance required up to ~100k items |
| Concurrency | WAL mode enabled; single-writer, multi-reader safe |
| Portability | Runs on macOS, Linux, Windows (via WSL or native Node) |

---

## 10. Open Technical Questions

1. **Frontend state management:** Currently raw `useState/useEffect`. If complexity grows past 5 pages, evaluate Zustand or React Query.
2. **API versioning:** Currently unversioned (`/api/...`). Add `/api/v1/` prefix before any breaking changes.
3. **Auto-execution:** The `execution_mode: "auto"` field is reserved. Implementation will require a Claude API client, prompt templates, and a job queue — tracked for v2.3.
4. **WebSocket for live updates:** Requires server-side event emitter + client subscription. Deferred to v2.2+ based on user demand.
