# foreman-ai

AI Project Manager MCP server — persistent, cross-project backlog management for Claude Code.

Foreman gives Claude Code a shared backlog across all your projects. Add work items, track priorities, and ask "what should I work on next?" from any session.

## Install

```bash
npm install -g foreman-ai
```

## Configure

Add to your Claude Code MCP config (`~/.claude/settings.json` or project `.mcp.json`):

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

## Data Model

Items have: title, description, status (backlog/ready/in_progress/done/archived), priority, category (feature/bug/research/chore), ROI score (1-10), effort (small/medium/large), blocked_by, tags, and source tracking.

## Database

SQLite, stored at `~/.foreman/foreman.db` by default. Override with `--db <path>`.

## License

MIT
