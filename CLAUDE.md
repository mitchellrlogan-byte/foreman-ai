# Foreman AI

MCP server providing persistent, cross-project backlog management for Claude Code.

## Tech Stack
- TypeScript (ESM, Node16 module resolution)
- SQLite via better-sqlite3
- MCP SDK (@modelcontextprotocol/sdk)
- Express 5 (web dashboard)
- React + Vite + TailwindCSS (frontend)

## Build & Run
```bash
npm run build        # Compile TypeScript (server only)
npm run build:all    # Build server + frontend
npm start            # Run MCP server (stdio transport)
npm run dashboard    # Start web dashboard on port 4040
node dist/index.js --db ~/.foreman/foreman.db
node dist/index.js --web --port 4040
```

## Project Structure
- `src/index.ts` — MCP server entry point, CLI arg parsing, --web flag
- `src/db.ts` — SQLite initialization and migrations
- `src/types.ts` — Shared TypeScript types
- `src/tools/projects.ts` — pm_register_project, pm_list_projects
- `src/tools/items.ts` — CRUD tools (add, update, list, get, delete)
- `src/tools/smart.ts` — pm_next_work, pm_prioritize, pm_bulk_import
- `src/tools/sessions.ts` — pm_start_session, pm_end_session, pm_list_sessions
- `src/web/server.ts` — Express HTTP server for dashboard
- `src/web/middleware.ts` — CORS, API key auth
- `src/web/routes/` — REST API routes (projects, items, sessions)
- `web/` — React frontend (Vite + Tailwind)

## Conventions
- All tool names prefixed with `pm_`
- JSON columns (blocked_by, tags) stored as stringified arrays in SQLite
- UUIDs for item IDs, slugs for project IDs
- Lower priority number = higher priority
