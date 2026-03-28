# foreman-ai

AI Project Manager MCP server — persistent, cross-project backlog management for Claude Code.

Foreman gives Claude Code a shared backlog across all your projects. Add work items, track priorities, and ask "what should I work on next?" from any session. Includes a web dashboard for managing your backlog from any browser.

## Install

```bash
npm install -g foreman-ai
```

## Configure

Add to your MCP config (`~/.mcp.json`):

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

Restart Claude Code — all `pm_*` tools are now available in every session, every project.

## Web Dashboard

Start the dashboard to manage your backlog from any browser or phone:

```bash
foreman-ai --web --port 4040
```

Then open `http://localhost:4040`. Features:
- View all projects and backlog items
- Add items from your phone (mobile-friendly)
- Filter by status, category, project
- Set execution mode: manual or auto (for future async dispatch)

Optional API key auth via `FOREMAN_API_KEY` environment variable.

## Tools

### Project Management
- **pm_register_project** — Register a project (run once per project)
- **pm_list_projects** — List all registered projects

### Backlog CRUD
- **pm_add_item** — Add a work item (required: project_id, title)
- **pm_update_item** — Update any field on an item
- **pm_list_items** — List items with filters (project, status, category, tag)
- **pm_get_item** — Get full detail on one item
- **pm_delete_item** — Remove an item

### Smart Operations
- **pm_next_work** — "What should I work on?" Top unblocked items by priority and ROI
- **pm_prioritize** — Re-score items with new ROI scores
- **pm_bulk_import** — Import items from JSON array

### Session Tracking
- **pm_start_session** — Start a work session for a project
- **pm_end_session** — End session with summary and items touched
- **pm_list_sessions** — View past sessions with duration and details

## Data Model

Items have: title, description, status (backlog/ready/in_progress/done/archived), priority, category (feature/bug/research/chore), ROI score (1-10), effort (small/medium/large), blocked_by, tags, source tracking, and execution mode (manual/auto).

## Database

SQLite, stored at `~/.foreman/foreman.db` by default. Override with `--db <path>`.

## License

MIT
