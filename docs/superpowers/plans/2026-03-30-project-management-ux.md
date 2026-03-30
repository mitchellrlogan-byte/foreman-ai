# Project Management UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Foreman AI dashboard fully self-sufficient — users can register projects and create backlog items entirely in the browser with no CLI required.

**Architecture:** Four new React components (NewItemModal, ScanProjectsModal, AddProjectModal, inline QuickAdd in BoardView) plus one new Express route (`GET /api/scan-projects`). The Sidebar gains two buttons below the project list. App.tsx gets a global `+ New Item` button in the header. All project registration flows use the existing `PUT /api/projects/:id` endpoint.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Express 5, Node.js `fs` module for filesystem scanning

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `web/src/lib/api.ts` | Add `api.projects.create()` and `api.scanProjects()` |
| Create | `src/web/routes/scan.ts` | `GET /api/scan-projects?path=` endpoint |
| Modify | `src/web/server.ts` | Mount `/api/scan-projects` route |
| Modify | `web/src/components/Sidebar.tsx` | Add Scan + Add Manual buttons; accept `onProjectAdded` callback |
| Create | `web/src/components/ScanProjectsModal.tsx` | Scan filesystem modal |
| Create | `web/src/components/AddProjectModal.tsx` | Manual path entry modal |
| Create | `web/src/components/NewItemModal.tsx` | Global new item modal with project selector |
| Modify | `web/src/App.tsx` | Add global `+ New Item` button in header; wire project refresh |
| Modify | `web/src/pages/ProjectView.tsx` | Add inline quick-add footer to each kanban column |

---

## Task 1: Add `api.projects.create()` and `api.scanProjects()` to frontend API client

**Files:**
- Modify: `web/src/lib/api.ts`

- [ ] **Step 1: Add `projects.create` and `scanProjects` to `web/src/lib/api.ts`**

Add a `ScanResult` interface and extend the `api` object. The full updated export section:

```typescript
export interface ScanResult {
  name: string;
  path: string;
  already_registered: boolean;
}

export const api = {
  projects: {
    list: () => request<Project[]>("/projects"),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (data: { id: string; name: string; repo_path: string; description?: string }) =>
      request<Project>(`/projects/${data.id}`, { method: "PUT", body: JSON.stringify(data) }),
  },
  items: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<Item[]>(`/items${qs}`);
    },
    get: (id: string) => request<Item>(`/items/${id}`),
    create: (data: Partial<Item>) =>
      request<Item>("/items", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Item>) =>
      request<Item>(`/items/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/items/${id}`, { method: "DELETE" }),
  },
  nextWork: (params?: { project_id?: string; limit?: number }) => {
    const qs = params ? "?" + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString() : "";
    return request<Item[]>(`/next-work${qs}`);
  },
  scanProjects: (path: string) =>
    request<ScanResult[]>(`/scan-projects?path=${encodeURIComponent(path)}`),
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/api.ts
git commit -m "feat: add projects.create and scanProjects to API client"
```

---

## Task 2: Backend scan-projects endpoint

**Files:**
- Create: `src/web/routes/scan.ts`
- Modify: `src/web/server.ts`

- [ ] **Step 1: Create `src/web/routes/scan.ts`**

```typescript
import { Router } from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { getDb } from "../../db.js";

export const scanRouter = Router();

scanRouter.get("/", (req, res) => {
  const rawPath = (req.query.path as string) || os.homedir();
  const scanPath = rawPath.replace(/^~/, os.homedir());

  if (!fs.existsSync(scanPath)) {
    res.status(400).json({ error: `Path does not exist: ${scanPath}` });
    return;
  }

  const db = getDb();
  const registeredPaths = new Set(
    (db.prepare("SELECT repo_path FROM projects").all() as { repo_path: string }[])
      .map(r => r.repo_path)
  );

  const results: { name: string; path: string; already_registered: boolean }[] = [];

  function isProject(dir: string): boolean {
    return fs.existsSync(path.join(dir, ".git")) ||
           fs.existsSync(path.join(dir, "package.json"));
  }

  function scan(dir: string, depth: number): void {
    if (depth > 3) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (isProject(fullPath)) {
        results.push({
          name: entry.name,
          path: fullPath,
          already_registered: registeredPaths.has(fullPath),
        });
      } else {
        scan(fullPath, depth + 1);
      }
    }
  }

  scan(scanPath, 1);
  res.json(results);
});
```

- [ ] **Step 2: Mount the route in `src/web/server.ts`**

Add the import after the existing route imports:

```typescript
import { scanRouter } from "./routes/scan.js";
```

Add the route mount after `/api/next-work`:

```typescript
app.use("/api/scan-projects", scanRouter);
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Then test:

```bash
node dist/index.js --web --port 4041 &
sleep 2
curl "http://localhost:4041/api/scan-projects?path=C%3A%5CUsers%5Cmitch"
kill %1
```

Expected: JSON array with objects like `{ "name": "foreman-ai", "path": "...", "already_registered": false }`.

- [ ] **Step 4: Commit**

```bash
git add src/web/routes/scan.ts src/web/server.ts
git commit -m "feat: add GET /api/scan-projects filesystem discovery endpoint"
```

---

## Task 3: AddProjectModal component

**Files:**
- Create: `web/src/components/AddProjectModal.tsx`

- [ ] **Step 1: Create `web/src/components/AddProjectModal.tsx`**

```typescript
import { useState, type FormEvent, type ReactNode } from "react";
import { api, type Project } from "../lib/api";

interface AddProjectModalProps {
  onClose: () => void;
  onAdded: (project: Project) => void;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AddProjectModal({ onClose, onAdded }: AddProjectModalProps) {
  const [name, setName] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !repoPath.trim()) return;
    setSaving(true);
    setError("");
    try {
      const project = await api.projects.create({
        id: slugify(name.trim()),
        name: name.trim(),
        repo_path: repoPath.trim(),
        description: description.trim() || undefined,
      });
      onAdded(project);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0d1b2a] border border-[#1a3a5c] rounded-lg w-full max-w-md p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-[#e0f2fe]">Add Project Manually</h2>
            <button onClick={onClose} className="text-[#4b6a8a] hover:text-[#94a3b8] text-lg leading-none">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Project Name">
              <input
                value={name} onChange={e => setName(e.target.value)}
                autoFocus required
                placeholder="My Project"
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#e0f2fe] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
              />
            </Field>

            <Field label="Full Path">
              <input
                value={repoPath} onChange={e => setRepoPath(e.target.value)}
                required
                placeholder="C:\Users\mitch\my-project"
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] font-mono focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
              />
            </Field>

            <Field label="Description (optional)">
              <input
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="What is this project?"
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
              />
            </Field>

            {error && <p className="text-[11px] text-[#f87171]">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="submit" disabled={saving || !name.trim() || !repoPath.trim()}
                className="flex-1 py-2 text-white text-[12px] font-semibold rounded transition-colors disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
              >
                {saving ? "Adding..." : "Add Project"}
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2 bg-[#0c1e30] text-[#4b6a8a] text-[12px] rounded hover:text-[#94a3b8]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1e4060] mb-1">{label}</label>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/AddProjectModal.tsx
git commit -m "feat: add AddProjectModal component"
```

---

## Task 4: ScanProjectsModal component

**Files:**
- Create: `web/src/components/ScanProjectsModal.tsx`

- [ ] **Step 1: Create `web/src/components/ScanProjectsModal.tsx`**

```typescript
import { useState } from "react";
import { api, type Project, type ScanResult } from "../lib/api";
import os from "os";

interface ScanProjectsModalProps {
  onClose: () => void;
  onAdded: (projects: Project[]) => void;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ScanProjectsModal({ onClose, onAdded }: ScanProjectsModalProps) {
  const [scanPath, setScanPath] = useState("~");
  const [results, setResults] = useState<ScanResult[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScan] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");

  async function handleScan() {
    setScan(true);
    setError("");
    setResults(null);
    try {
      const found = await api.scanProjects(scanPath);
      setResults(found);
      // Pre-select all unregistered
      setSelected(new Set(found.filter(r => !r.already_registered).map(r => r.path)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScan(false);
    }
  }

  async function handleRegister() {
    if (!results) return;
    setRegistering(true);
    const toRegister = results.filter(r => selected.has(r.path));
    const added: Project[] = [];
    for (const r of toRegister) {
      try {
        const p = await api.projects.create({ id: slugify(r.name), name: r.name, repo_path: r.path });
        added.push(p);
      } catch {
        // skip duplicates
      }
    }
    onAdded(added);
    onClose();
  }

  function toggleSelect(path: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const newCount = results ? results.filter(r => !r.already_registered).length : 0;
  const selectedCount = selected.size;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0d1b2a] border border-[#1a3a5c] rounded-lg w-full max-w-md p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-[#e0f2fe]">Scan for Projects</h2>
            <button onClick={onClose} className="text-[#4b6a8a] hover:text-[#94a3b8] text-lg leading-none">×</button>
          </div>

          <p className="text-[11px] text-[#4b6a8a] mb-3">Finds all git/npm repos under a folder.</p>

          {/* Path input + scan */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1e4060] mb-1">Root Directory</label>
            <div className="flex gap-2">
              <input
                value={scanPath} onChange={e => setScanPath(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScan()}
                placeholder="~"
                className="flex-1 bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] font-mono focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
              />
              <button
                onClick={handleScan} disabled={scanning}
                className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-[12px] font-semibold rounded transition-colors disabled:opacity-50"
              >
                {scanning ? "Scanning..." : "Scan"}
              </button>
            </div>
          </div>

          {error && <p className="text-[11px] text-[#f87171] mb-3">{error}</p>}

          {/* Results */}
          {results !== null && (
            <div className="mb-4">
              <div className="text-[10px] text-[#4b6a8a] mb-2">
                Found {results.length} project{results.length !== 1 ? "s" : ""} · {newCount} unregistered
              </div>
              <div className="space-y-1 max-h-[240px] overflow-y-auto">
                {results.map(r => (
                  <div
                    key={r.path}
                    onClick={() => !r.already_registered && toggleSelect(r.path)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-[12px] ${
                      r.already_registered
                        ? "opacity-40 cursor-default"
                        : "bg-[#0c1e30] cursor-pointer hover:bg-[#0e2440]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={r.already_registered || selected.has(r.path)}
                      disabled={r.already_registered}
                      onChange={() => toggleSelect(r.path)}
                      onClick={e => e.stopPropagation()}
                      className="accent-[#0ea5e9] flex-shrink-0"
                    />
                    <span className="flex-1 text-[#e0f2fe] truncate">{r.name}</span>
                    {r.already_registered && (
                      <span className="text-[9px] text-[#4b6a8a] flex-shrink-0">registered</span>
                    )}
                    <span
                      className="text-[10px] text-[#1e4060] flex-shrink-0 border-b border-dashed border-[#1a3a5c] cursor-help"
                      title={r.path}
                    >
                      📁
                    </span>
                  </div>
                ))}
                {results.length === 0 && (
                  <p className="text-[11px] text-[#1e4060] text-center py-4">No projects found in this directory.</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {results !== null && selectedCount > 0 && (
              <button
                onClick={handleRegister} disabled={registering}
                className="flex-1 py-2 text-white text-[12px] font-semibold rounded transition-colors disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
              >
                {registering ? "Registering..." : `Register ${selectedCount} Selected`}
              </button>
            )}
            <button onClick={onClose}
              className="px-4 py-2 bg-[#0c1e30] text-[#4b6a8a] text-[12px] rounded hover:text-[#94a3b8]">
              {results !== null && selectedCount > 0 ? "Cancel" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Fix the `os` import — browser code can't use Node's `os` module**

Remove the `import os from "os"` line (it was a mistake — the `~` default is just a string, no expansion needed in the browser). The `scanPath` starts as `"~"` and the backend handles `~` expansion.

The file should start with just:

```typescript
import { useState } from "react";
import { api, type Project, type ScanResult } from "../lib/api";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/ScanProjectsModal.tsx
git commit -m "feat: add ScanProjectsModal component"
```

---

## Task 5: Update Sidebar with project management buttons

**Files:**
- Modify: `web/src/components/Sidebar.tsx`

- [ ] **Step 1: Rewrite `web/src/components/Sidebar.tsx`**

```typescript
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Project } from "../lib/api";
import { ScanProjectsModal } from "./ScanProjectsModal";
import { AddProjectModal } from "./AddProjectModal";

interface SidebarProps {
  projects: Project[];
  onProjectAdded: (projects: Project[]) => void;
}

const PROJECT_COLORS = [
  "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

export function Sidebar({ projects, onProjectAdded }: SidebarProps) {
  const location = useLocation();
  const [showScan, setShowScan] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <aside className="w-[210px] bg-[#080f1a] border-r border-[#132030] flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="h-[52px] flex items-center px-4 gap-3 border-b border-[#132030]">
        <div className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #14b8a6)" }}>
          F
        </div>
        <span className="text-sm font-bold text-[#e0f2fe] tracking-tight">Foreman</span>
        <span className="ml-auto text-[9px] bg-[#0c2d4a] text-[#38bdf8] px-1.5 py-0.5 rounded">v2</span>
      </div>

      {/* Nav */}
      <nav className="pt-2">
        <div className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[1.2px] text-[#1e4060]">
          Navigation
        </div>
        <SidebarLink to="/" active={location.pathname === "/"} label="Dashboard" icon="⊞" />
        <SidebarLink to="/sessions" active={location.pathname === "/sessions"} label="Sessions" icon="⊙" />
      </nav>

      {/* Projects */}
      <div className="pt-2 flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[1.2px] text-[#1e4060]">
          Projects
        </div>
        <div className="px-2">
          {projects.map((p, i) => {
            const isActive = location.pathname.startsWith(`/project/${p.id}`);
            return (
              <Link
                key={p.id}
                to={`/project/${p.id}`}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#0c2438] text-[#bfdbfe]"
                    : "text-[#4b6a8a] hover:bg-[#0c1e30] hover:text-[#94a3b8]"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }}
                />
                <span className="truncate">{p.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Project management buttons */}
        <div className="px-2 pt-2 pb-1 space-y-1">
          <button
            onClick={() => setShowScan(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-[#38bdf8] hover:bg-[#0c1e30] transition-colors border border-dashed border-[#1a3a5c]"
          >
            <span className="text-[13px]">⊕</span> Scan for Projects
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-[#4b6a8a] hover:bg-[#0c1e30] hover:text-[#94a3b8] transition-colors border border-dashed border-[#132030]"
          >
            <span className="text-[13px]">✎</span> Add Manually
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-[#132030] px-4 py-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #7c3aed)" }}>
          M
        </div>
        <span className="text-[11px] text-[#4b6a8a]">mitch</span>
      </div>

      {showScan && (
        <ScanProjectsModal
          onClose={() => setShowScan(false)}
          onAdded={p => { onProjectAdded(p); setShowScan(false); }}
        />
      )}
      {showAdd && (
        <AddProjectModal
          onClose={() => setShowAdd(false)}
          onAdded={p => { onProjectAdded([p]); setShowAdd(false); }}
        />
      )}
    </aside>
  );
}

function SidebarLink({ to, active, label, icon }: {
  to: string; active: boolean; label: string; icon: string;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-[7px] text-[12px] border-l-2 transition-colors ${
        active
          ? "bg-[#0c1e30] text-[#38bdf8] border-[#0ea5e9]"
          : "text-[#4b6a8a] border-transparent hover:bg-[#0c1e30] hover:text-[#94a3b8]"
      }`}
    >
      <span className="w-4 text-center text-[13px]">{icon}</span>
      {label}
    </Link>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: One error — `App.tsx` passes `projects` to `<Sidebar>` but not `onProjectAdded`. This is expected and will be fixed in Task 7.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/Sidebar.tsx
git commit -m "feat: add Scan and Add Manually buttons to Sidebar"
```

---

## Task 6: NewItemModal component

**Files:**
- Create: `web/src/components/NewItemModal.tsx`

- [ ] **Step 1: Create `web/src/components/NewItemModal.tsx`**

```typescript
import { useState, type FormEvent, type ReactNode } from "react";
import { api, type Project, type Item } from "../lib/api";

interface NewItemModalProps {
  projects: Project[];
  defaultProjectId?: string;
  onClose: () => void;
  onCreated: (item: Item) => void;
}

export function NewItemModal({ projects, defaultProjectId, onClose, onCreated }: NewItemModalProps) {
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("feature");
  const [effort, setEffort] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    setSaving(true);
    setError("");
    try {
      const item = await api.items.create({
        project_id: projectId,
        title: title.trim(),
        category,
        effort: effort as Item["effort"] || undefined,
        source: "user",
      });
      onCreated(item);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0d1b2a] border border-[#1a3a5c] rounded-lg w-full max-w-md p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-[#e0f2fe]">New Item</h2>
            <button onClick={onClose} className="text-[#4b6a8a] hover:text-[#94a3b8] text-lg leading-none">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Project">
              <select
                value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Title">
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                autoFocus required
                placeholder="What needs to be done?"
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#e0f2fe] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Category">
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]">
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="research">Research</option>
                  <option value="chore">Chore</option>
                </select>
              </Field>
              <Field label="Effort">
                <select value={effort} onChange={e => setEffort(e.target.value)}
                  className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]">
                  <option value="">Unsized</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </Field>
            </div>

            {error && <p className="text-[11px] text-[#f87171]">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="submit" disabled={saving || !title.trim() || !projectId}
                className="flex-1 py-2 text-white text-[12px] font-semibold rounded transition-colors disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
              >
                {saving ? "Adding..." : "Add to Backlog"}
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2 bg-[#0c1e30] text-[#4b6a8a] text-[12px] rounded hover:text-[#94a3b8]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1e4060] mb-1">{label}</label>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: Only the pre-existing App.tsx error from Task 5.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/NewItemModal.tsx
git commit -m "feat: add NewItemModal with project selector"
```

---

## Task 7: Wire global "+ New Item" button into App.tsx

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Rewrite `web/src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { NewItemModal } from "./components/NewItemModal";
import { Dashboard } from "./pages/Dashboard";
import { ProjectView } from "./pages/ProjectView";
import { AddItem } from "./pages/AddItem";
import { api, type Project } from "./lib/api";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewItem, setShowNewItem] = useState(false);

  useEffect(() => {
    api.projects.list().then(setProjects).catch(() => {});
  }, []);

  function handleProjectAdded(added: Project[]) {
    setProjects(prev => {
      const ids = new Set(prev.map(p => p.id));
      return [...prev, ...added.filter(p => !ids.has(p.id))];
    });
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#080f1a]">
        <Sidebar projects={projects} onProjectAdded={handleProjectAdded} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Global header */}
          <div className="h-[52px] border-b border-[#132030] flex items-center px-5 flex-shrink-0">
            <div className="flex-1" />
            <button
              onClick={() => setShowNewItem(true)}
              className="px-3 py-1.5 text-[11px] font-semibold text-white rounded-md"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
            >
              + New Item
            </button>
          </div>
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard onProjectsLoaded={setProjects} />} />
              <Route path="/project/:id" element={<ProjectView />} />
              <Route path="/project/:id/add" element={<AddItem />} />
            </Routes>
          </main>
        </div>
      </div>

      {showNewItem && (
        <NewItemModal
          projects={projects}
          onClose={() => setShowNewItem(false)}
          onCreated={() => setShowNewItem(false)}
        />
      )}
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
cd web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/App.tsx
git commit -m "feat: add global + New Item button to App header"
```

---

## Task 8: Inline quick-add footer in BoardView

**Files:**
- Modify: `web/src/pages/ProjectView.tsx`

- [ ] **Step 1: Add `QuickAdd` component and wire into `BoardView` in `web/src/pages/ProjectView.tsx`**

Add the `QuickAdd` component at the bottom of the file:

```typescript
function QuickAdd({ projectId, status, onCreated }: {
  projectId: string;
  status: string;
  onCreated: (item: Item) => void;
}) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const item = await api.items.create({ project_id: projectId, title: title.trim(), status, source: "user" });
      onCreated(item);
      setTitle("");
      setActive(false);
    } finally {
      setSaving(false);
    }
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="w-full text-left text-[10px] text-[#1e4060] hover:text-[#4b6a8a] px-1 py-1.5 transition-colors"
      >
        + Add item
      </button>
    );
  }

  return (
    <div className="mt-1">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") { setActive(false); setTitle(""); }
        }}
        placeholder="Item title..."
        disabled={saving}
        className="w-full bg-[#0a1628] border border-[#0ea5e9] rounded px-2 py-1.5 text-[11px] text-[#e0f2fe] focus:outline-none placeholder:text-[#1e4060]"
      />
      <div className="flex gap-1 mt-1">
        <button
          onClick={handleSubmit} disabled={saving || !title.trim()}
          className="text-[10px] px-2 py-1 bg-[#0ea5e9] text-white rounded disabled:opacity-50"
        >
          {saving ? "..." : "Add"}
        </button>
        <button
          onClick={() => { setActive(false); setTitle(""); }}
          className="text-[10px] px-2 py-1 text-[#4b6a8a] hover:text-[#94a3b8]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

Update `BoardView` to accept `projectId` and wire in `QuickAdd`. Replace the `BoardView` function:

```typescript
function BoardView({ items, projectId, onSelect, onCreated }: {
  items: Item[];
  projectId: string;
  onSelect: (item: Item) => void;
  onCreated: (item: Item) => void;
}) {
  const COL_LABELS: Record<string, string> = {
    backlog: "Backlog", ready: "Ready", in_progress: "In Progress", done: "Done",
  };
  const COL_COLORS: Record<string, string> = {
    backlog: "#4b6a8a", ready: "#34d399", in_progress: "#38bdf8", done: "#4b6a8a",
  };

  return (
    <div className="flex gap-3 h-full min-h-[400px]">
      {BOARD_STATUSES.map(status => {
        const col = items.filter(i => i.status === status);
        return (
          <div key={status} className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color: COL_COLORS[status] }}>
                {COL_LABELS[status]}
              </span>
              <span className="text-[10px] bg-[#0a1628] text-[#4b6a8a] px-1.5 py-0.5 rounded-full">{col.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {col.map(item => (
                <ItemCard key={item.id} item={item} onClick={() => onSelect(item)} />
              ))}
              {col.length === 0 && (
                <div className="text-[10px] text-[#1e4060] text-center py-4">—</div>
              )}
            </div>
            <QuickAdd projectId={projectId} status={status} onCreated={onCreated} />
          </div>
        );
      })}
    </div>
  );
}
```

Update the `ProjectView` component to:
1. Add `handleCreated` handler
2. Pass `projectId` and `onCreated` to `BoardView`

In the `ProjectView` function, add after `handleDeleted`:

```typescript
function handleCreated(item: Item) {
  setItems(prev => [...prev, item]);
}
```

And update the `BoardView` usage in the JSX:

```typescript
{view === "board" ? (
  <BoardView items={visibleItems} projectId={id!} onSelect={setSelectedItem} onCreated={handleCreated} />
) : (
  <TableView items={visibleItems} onSelect={setSelectedItem} />
)}
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
cd web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/ProjectView.tsx
git commit -m "feat: add inline quick-add footer to kanban board columns"
```

---

## Task 9: Full build verification + deploy

- [ ] **Step 1: Build everything**

```bash
npm run build:all
```

Expected: TypeScript compiles, Vite builds. `web/dist/` updated.

- [ ] **Step 2: Smoke test locally**

```bash
node dist/index.js --web --port 4040
```

Open http://localhost:4040. Verify:
- Sidebar shows "Scan for Projects" and "Add Manually" buttons below project list
- Click "Scan for Projects" → enter `C:\Users\mitch` → Scan → 5 results appear, foreman-ai greyed out as already registered
- Click "Add Manually" → fill in name + path → project appears in sidebar
- Click `+ New Item` in header → modal opens with project dropdown → submit → item added
- On a project board → click `+ Add item` at column bottom → type title → Enter → card appears

- [ ] **Step 3: Deploy**

```bash
~/.fly/bin/fly.exe deploy
```

Expected: `Visit your newly deployed app at https://foreman-ai.fly.dev/`

- [ ] **Step 4: Final commit if any changes needed**

```bash
git add -A
git commit -m "feat: complete v2.2 project management UX — scan projects, add manually, quick-add items"
```
