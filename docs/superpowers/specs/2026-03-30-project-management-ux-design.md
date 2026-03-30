# Project Management UX + Quick-Add Items Design

**Date:** 2026-03-30
**Status:** Approved
**Release:** v2.2

---

## Overview

Two features that make the dashboard fully self-sufficient — no CLI or MCP tools required for day-to-day use.

1. **Quick-Add Items** — create backlog items directly from the board or dashboard without navigating away
2. **Project Management UI** — register projects from the dashboard via filesystem scan or manual path entry

---

## Feature 1: Quick-Add Items

### Inline Column Footer (Board View)

Each kanban column has a `+ Add item` affordance at the bottom of the card list. Clicking it expands an inline input field within that column.

- Title input appears in-place at the bottom of the column
- Hit **Enter** to create the item (status = that column's status, project = current project)
- Hit **Escape** to cancel
- Newly created item appears at the bottom of the column immediately
- No page navigation required

### Global "+ New Item" Button (Header)

A persistent `+ New Item` button in the top header bar, visible on all pages (Dashboard, Board, Table).

- Opens a modal overlay
- **Project selector dropdown** — pre-filled with current project if on a project page; shows all registered projects otherwise
- **Title** — required text input
- **Category** — dropdown (feature / bug / research / chore), defaults to feature
- **Effort** — dropdown (unsized / small / medium / large), optional
- Submit creates the item and closes the modal
- On success, if the user is currently viewing that project's board, the new item appears without a page reload

### Data flow

Both paths call `POST /api/items` with `project_id`, `title`, and optional fields. No new endpoints required.

---

## Feature 2: Project Management UI

### Sidebar Buttons

Below the project list in the sidebar, two buttons are always visible:

```
⊕ Scan for Projects
✎ Add Manually
```

### Scan for Projects Flow

1. Click **Scan for Projects** → modal opens
2. **Root directory input** — pre-filled with `~` (user home directory). User can paste any path.
3. Click **Scan** → calls `GET /api/scan-projects?path=<encoded_path>`
4. Backend walks the directory up to **3 levels deep**, finds folders containing `.git` or `package.json`
5. Results display as a checklist:
   - Already-registered projects: shown greyed out, checkbox disabled, labelled "already registered"
   - New projects: checked by default
   - Full path shown as a **tooltip on the 📁 icon** (hover to see) — not displayed inline
6. **"Register N Selected" button** — calls `POST /api/projects` for each checked item in sequence
7. On success: modal closes, new projects appear in sidebar immediately

### Add Manually Flow

1. Click **Add Manually** → modal opens
2. Fields:
   - **Project Name** — text input, required
   - **Full Path** — text input, required. User pastes the full filesystem path (e.g. `C:\Users\mitch\Downloads\DayForge\dayforge-complete`)
   - **Description** — text input, optional
3. Submit → calls `POST /api/projects`
4. On success: modal closes, project appears in sidebar immediately

### New Backend Endpoint

`GET /api/scan-projects?path=<directory>`

- Auth: respects `FOREMAN_API_KEY` if set
- Walks `path` up to 3 levels deep
- Returns folders that contain `.git` or `package.json` at their root
- Each result includes: `{ name: string, path: string, already_registered: boolean }`
- `name` is derived from the folder name (can be overridden in the UI)
- Returns 400 if path doesn't exist or isn't readable

---

## Files to Create / Modify

| Action | File | Purpose |
|--------|------|---------|
| Modify | `web/src/components/Sidebar.tsx` | Add Scan + Manual buttons below project list |
| Create | `web/src/components/ScanProjectsModal.tsx` | Scan flow modal |
| Create | `web/src/components/AddProjectModal.tsx` | Manual add modal |
| Create | `web/src/components/NewItemModal.tsx` | Global new item modal with project selector |
| Modify | `web/src/pages/ProjectView.tsx` | Add inline column footer quick-add |
| Modify | `web/src/App.tsx` | Add global "+ New Item" button to header |
| Modify | `web/src/lib/api.ts` | Add `api.scanProjects()` and `api.projects.create()` |
| Create | `src/web/routes/scan.ts` | GET /api/scan-projects endpoint |
| Modify | `src/web/server.ts` | Mount scan route |

---

## Non-Goals

- Drag-and-drop between columns (v2.3)
- Moving items between projects from the UI
- Editing project name/path after registration
- Recursive scan beyond 3 levels deep
