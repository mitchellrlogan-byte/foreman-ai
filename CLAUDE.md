# Foreman AI

MCP server providing persistent, cross-project backlog management for Claude Code.

## Tech Stack
- TypeScript (ESM, Node16 module resolution)
- SQLite via better-sqlite3
- MCP SDK (@modelcontextprotocol/sdk)

## Build & Run
```bash
npm run build        # Compile TypeScript
npm start            # Run MCP server (stdio transport)
node dist/index.js --db ~/.foreman/foreman.db
```

## Project Structure
- `src/index.ts` — MCP server entry point, CLI arg parsing
- `src/db.ts` — SQLite initialization and migrations
- `src/types.ts` — Shared TypeScript types
- `src/tools/projects.ts` — pm_register_project, pm_list_projects
- `src/tools/items.ts` — CRUD tools (add, update, list, get, delete)
- `src/tools/smart.ts` — pm_next_work, pm_prioritize, pm_bulk_import

## Conventions
- All tool names prefixed with `pm_`
- JSON columns (blocked_by, tags) stored as stringified arrays in SQLite
- UUIDs for item IDs, slugs for project IDs
- Lower priority number = higher priority
