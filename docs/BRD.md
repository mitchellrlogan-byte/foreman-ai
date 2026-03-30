# Business Requirements Document — Foreman AI

**Version:** 2.0
**Date:** 2026-03-30
**Status:** Draft

---

## 1. Executive Summary

Foreman AI is a persistent, cross-project backlog management system built specifically for Claude Code and the MCP (Model Context Protocol) ecosystem. It allows AI agents and human developers to maintain structured work queues that survive across sessions, projects, and conversations — solving the core problem of context loss between Claude Code sessions.

---

## 2. Problem Statement

Claude Code sessions are ephemeral. Every new conversation starts from scratch, with no memory of what was being worked on, what was decided, or what the next priority is. Developers working across multiple projects lose continuity and spend cognitive effort re-establishing context.

Existing tools (Jira, Linear, GitHub Issues) are designed for human-facing workflows, not AI-agent workflows. They don't integrate with the MCP protocol and cannot be queried or updated programmatically by an AI agent mid-session.

---

## 3. Goals

- Provide a persistent backlog that survives across Claude Code sessions
- Allow Claude to autonomously query "what should I work on next?" (`pm_next_work`)
- Support multi-project management from a single unified interface
- Offer both an AI-native interface (MCP tools) and a human-friendly web dashboard
- Track work sessions for productivity visibility and context reconstruction

---

## 4. Non-Goals

- Full team collaboration (no multi-user permissions in v2)
- Real-time notifications or webhooks
- Git or GitHub integration (tracked for future)
- Mobile app

---

## 5. Target Users

**Primary:** Solo developers using Claude Code for AI-assisted development across multiple projects.

**Secondary:** Small teams where one developer manages the backlog and Claude agents execute items.

---

## 6. Feature Requirements

### 6.1 MCP Tool Interface (Core — existing)

| Tool | Description | Priority |
|------|-------------|----------|
| `pm_register_project` | Create or update a project | Must Have |
| `pm_list_projects` | List all registered projects | Must Have |
| `pm_add_item` | Add a work item to the backlog | Must Have |
| `pm_update_item` | Update any field on an item | Must Have |
| `pm_list_items` | Query items with filters | Must Have |
| `pm_get_item` | Fetch a single item by ID | Must Have |
| `pm_delete_item` | Remove an item | Must Have |
| `pm_next_work` | Return prioritized unblocked items | Must Have |
| `pm_prioritize` | Bulk re-score ROI and priorities | Must Have |
| `pm_bulk_import` | Import items from JSON | Must Have |
| `pm_start_session` | Begin a work session | Must Have |
| `pm_end_session` | Close a session with summary | Must Have |
| `pm_list_sessions` | View past sessions | Must Have |

### 6.2 Web Dashboard (v2.1 — in progress)

| Feature | Description | Priority |
|---------|-------------|----------|
| Dashboard overview | Stats, Next Work widget, In Progress items, project grid | Must Have |
| Project board view | Kanban columns (Backlog → Ready → In Progress → Done) | Must Have |
| Project table view | Dense MS-Project-style sortable data grid | Must Have |
| Item detail drawer | Slide-over panel showing all item fields | Must Have |
| Add item form | Create new items with all metadata fields | Must Have |
| Edit item | Update any field inline or via form | Must Have |
| Delete item | Remove with confirmation | Must Have |
| Status update | Move items between statuses from board or drawer | Must Have |
| Visual style | Midnight blue + teal (Option C design direction) | Must Have |

### 6.3 Dashboard Enhancements (v2.2)

| Feature | Description | Priority |
|---------|-------------|----------|
| Session analytics page | Duration, items touched, velocity over time | Should Have |
| Search / filter UI | Full-text title search, filter by tag/category/status | Should Have |
| Sort controls | Sort by priority, ROI, created date in table view | Should Have |
| pm_next_work widget | Prominent "What to work on" section on dashboard | Must Have |

### 6.4 Power Features (v2.3)

| Feature | Description | Priority |
|---------|-------------|----------|
| Auto-execution dispatch | Trigger Claude to execute `auto` mode items | Could Have |
| Dependency graph | Visual graph of `blocked_by` relationships | Could Have |
| Export (CSV/JSON) | Export backlog from dashboard | Could Have |

---

## 7. Release Plan

### v2.1 — Dashboard Redesign (Current Sprint)
**Goal:** Complete the web dashboard so it's fully usable for day-to-day project management.

- New visual design (Midnight + Teal)
- Dashboard with Next Work widget, In Progress, project grid
- Project board (kanban) + table toggle
- Item detail slide-over drawer
- Edit and delete items in UI
- Boards are functional end-to-end

**Success Criteria:** Can manage an entire project backlog without ever touching the MCP CLI.

### v2.2 — Smart Features
**Goal:** Make the dashboard feel AI-native, not just a CRUD app.

- Session analytics page with productivity charts
- Search and filter controls
- Sort by priority/ROI in table view
- Refine pm_next_work display (explanations for why each item is ranked)

**Success Criteria:** Looking at the dashboard tells you everything you need to know in under 10 seconds.

### v2.3 — Power Features
**Goal:** Unlock advanced capabilities for power users.

- Auto-execution: Claude can pick up and execute `auto` mode items autonomously
- Dependency visualization
- Export functionality
- Optional: GitHub Issues sync

**Success Criteria:** An AI agent can manage and execute its own backlog with minimal human intervention.

---

## 8. Success Metrics

- Dashboard is the primary interface for reviewing backlog (not CLI)
- `pm_next_work` is called at the start of every Claude Code session
- Sessions are tracked for every active project
- Zero context loss between sessions for active projects

---

## 9. Constraints

- Must run locally (no required cloud services)
- Database is a single SQLite file at `~/.foreman/foreman.db`
- MCP transport is stdio (not HTTP) for Claude Code compatibility
- API key auth is optional (local-friendly default)
