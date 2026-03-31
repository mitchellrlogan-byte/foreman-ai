import { useEffect, useState, useCallback, useRef } from "react";
import type React from "react";
import { useParams, Link } from "react-router-dom";
import { api, type Item, type Project } from "../lib/api.js";
import { ItemCard } from "../components/ItemCard.js";
import { ItemDrawer } from "../components/ItemDrawer.js";
import { StatusBadge } from "../components/StatusBadge.js";

type ViewMode = "board" | "table";
type SortKey = "priority" | "roi" | "created";
type SortDir = "asc" | "desc";
const BOARD_STATUSES = ["backlog", "ready", "in_progress", "done"] as const;

const STATUS_OPTIONS = ["all", "backlog", "ready", "in_progress", "done"] as const;
const CATEGORY_OPTIONS = ["all", "feature", "bug", "research", "chore"] as const;

export function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [view, setView] = useState<ViewMode>("board");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([api.projects.get(id), api.items.list({ project_id: id })])
      .then(([p, i]) => { setProject(p); setItems(i); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function handleUpdated(updated: Item) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedItem(updated);
  }

  function handleDeleted(deletedId: string) {
    setItems(prev => prev.filter(i => i.id !== deletedId));
    setSelectedItem(null);
  }

  function handleCreated(item: Item) {
    setItems(prev => [...prev, item]);
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#1e4060] text-sm">Loading...</div>;
  if (!project) return <div className="flex items-center justify-center h-64 text-[#f87171] text-sm">Project not found.</div>;

  const visibleItems = items.filter(i => i.status !== "archived");

  const filteredItems = visibleItems.filter(item => {
    if (search.trim() && !item.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="h-[52px] border-b border-[#132030] flex items-center px-5 gap-3 flex-shrink-0">
        <div className="flex-1">
          <span className="text-[14px] font-bold text-[#e0f2fe]">{project.name}</span>
          {project.description && (
            <span className="ml-2 text-[11px] text-[#4b6a8a]">{project.description}</span>
          )}
        </div>
        {/* View toggle */}
        <div className="flex bg-[#0a1628] border border-[#1a3a5c] rounded-md overflow-hidden">
          {(["board", "table"] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-[11px] font-medium transition-colors capitalize ${
                view === v ? "bg-[#0c2d4a] text-[#38bdf8]" : "text-[#4b6a8a] hover:text-[#94a3b8]"
              }`}
            >
              {v === "board" ? "⊟ Board" : "☰ Table"}
            </button>
          ))}
        </div>
        <Link
          to={`/project/${id}/add`}
          className="px-3 py-1.5 text-[11px] font-semibold text-white rounded-md transition-colors"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
        >
          + Add Item
        </Link>
      </div>

      {/* Filter toolbar */}
      <div className="border-b border-[#132030] flex items-center px-5 gap-2 flex-shrink-0 py-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items..."
          className="bg-[#0a1628] border border-[#1a3a5c] rounded px-2.5 py-1.5 text-[11px] text-[#a8c5da] placeholder:text-[#2a4a6a] focus:outline-none focus:border-[#00b4d8] w-48 transition-colors"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#0a1628] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#a8c5da] focus:outline-none focus:border-[#00b4d8] transition-colors cursor-pointer"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s === "all" ? "All Statuses" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-[#0a1628] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#a8c5da] focus:outline-none focus:border-[#00b4d8] transition-colors cursor-pointer"
        >
          {CATEGORY_OPTIONS.map(c => (
            <option key={c} value={c}>
              {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        {(search || statusFilter !== "all" || categoryFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); }}
            className="text-[10px] text-[#4b6a8a] hover:text-[#a8c5da] transition-colors px-1"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-[10px] text-[#2a4a6a]">
          {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {view === "board" ? (
          <BoardView items={filteredItems} projectId={id!} onSelect={setSelectedItem} onCreated={handleCreated} onItemsChanged={setItems} onDeleted={handleDeleted} />
        ) : (
          <TableView items={filteredItems} onSelect={setSelectedItem} />
        )}
      </div>

      <ItemDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

function BoardView({ items, projectId, onSelect, onCreated, onItemsChanged, onDeleted }: {
  items: Item[];
  projectId: string;
  onSelect: (item: Item) => void;
  onCreated: (item: Item) => void;
  onItemsChanged: (updater: (prev: Item[]) => Item[]) => void;
  onDeleted: (id: string) => void;
}) {
  const COL_LABELS: Record<string, string> = {
    backlog: "Backlog", ready: "Ready", in_progress: "In Progress", done: "Done",
  };
  const COL_COLORS: Record<string, string> = {
    backlog: "#4b6a8a", ready: "#34d399", in_progress: "#38bdf8", done: "#4b6a8a",
  };

  // Shared drag state lifted to BoardView so cross-column drops work
  const draggingId = useRef<string | null>(null);

  function handleDrop(toStatus: string, toId: string | null) {
    const fromId = draggingId.current;
    draggingId.current = null;
    if (!fromId) return;

    const draggedItem = items.find(i => i.id === fromId);
    if (!draggedItem) return;

    const fromStatus = draggedItem.status;
    const targetCol = [...items.filter(i => i.status === toStatus)].sort((a, b) => a.priority - b.priority);

    // Remove dragged item from target col (if same col, it's already there)
    const withoutDragged = targetCol.filter(i => i.id !== fromId);

    // Insert before toId, or at end if toId is null
    const insertAt = toId ? withoutDragged.findIndex(i => i.id === toId) : withoutDragged.length;
    const insertIdx = insertAt === -1 ? withoutDragged.length : insertAt;
    withoutDragged.splice(insertIdx, 0, { ...draggedItem, status: toStatus });

    // Assign priorities spaced by 10
    const reordered = withoutDragged.map((item, idx) => ({ ...item, priority: (idx + 1) * 10 }));

    onItemsChanged(prev => {
      const other = prev.filter(i => i.status !== toStatus && i.id !== fromId);
      return [...other, ...reordered];
    });

    // Persist — update status if changed, always update priority
    reordered.forEach(item => {
      const orig = items.find(i => i.id === item.id);
      const updates: Partial<Item> = { priority: item.priority };
      if (fromStatus !== toStatus && item.id === fromId) updates.status = toStatus as Item["status"];
      if (!orig || orig.priority !== item.priority || (updates.status && orig.status !== updates.status)) {
        api.items.update(item.id, updates).catch(() => {});
      }
    });
  }

  return (
    <div className="flex gap-3 h-full min-h-[400px]">
      {BOARD_STATUSES.map(status => {
        const col = [...items.filter(i => i.status === status)].sort((a, b) => a.priority - b.priority);
        return (
          <BoardColumn
            key={status}
            status={status}
            label={COL_LABELS[status]}
            color={COL_COLORS[status]}
            items={col}
            projectId={projectId}
            onSelect={onSelect}
            onCreated={onCreated}
            onDeleted={onDeleted}
            draggingId={draggingId}
            onDrop={handleDrop}
          />
        );
      })}
    </div>
  );
}

function BoardColumn({ status, label, color, items, projectId, onSelect, onCreated, onDeleted, draggingId, onDrop }: {
  status: string;
  label: string;
  color: string;
  items: Item[];
  projectId: string;
  onSelect: (item: Item) => void;
  onCreated: (item: Item) => void;
  onDeleted: (id: string) => void;
  draggingId: React.MutableRefObject<string | null>;
  onDrop: (toStatus: string, toId: string | null) => void;
}) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [colDragOver, setColDragOver] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color }}>
          {label}
        </span>
        <span className="text-[10px] bg-[#0a1628] text-[#4b6a8a] px-1.5 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div
        className={`flex-1 overflow-y-auto rounded transition-colors ${colDragOver ? "bg-[#0c1e30]/60" : ""}`}
        onDragOver={e => { e.preventDefault(); setColDragOver(true); }}
        onDragLeave={() => setColDragOver(false)}
        onDrop={e => { e.preventDefault(); setColDragOver(false); setDragOverId(null); onDrop(status, null); }}
      >
        {items.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={e => { e.stopPropagation(); draggingId.current = item.id; }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(item.id); setColDragOver(false); }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(null); onDrop(status, item.id); }}
            onDragEnd={() => { draggingId.current = null; setDragOverId(null); setColDragOver(false); }}
            className={`transition-opacity ${dragOverId === item.id ? "opacity-40 border-t-2 border-[#0ea5e9]" : ""}`}
            style={{ cursor: "grab" }}
          >
            <ItemCard item={item} onClick={() => onSelect(item)} onDeleted={onDeleted} compact={status === "done"} />
          </div>
        ))}
        {items.length === 0 && (
          <div className={`text-[10px] text-center py-4 transition-colors ${colDragOver ? "text-[#0ea5e9]" : "text-[#1e4060]"}`}>
            {colDragOver ? "Drop here" : "—"}
          </div>
        )}
      </div>
      <QuickAdd projectId={projectId} status={status} onCreated={onCreated} />
    </div>
  );
}

function QuickAdd({ projectId, status, onCreated }: {
  projectId: string;
  status: string;
  onCreated: (item: Item) => void;
}) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const item = await api.items.create({ project_id: projectId, title: title.trim(), status, source: "user", execution_mode: "auto" });
      onCreated(item);
      setTitle("");
      setActive(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
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
      {error && <p className="text-[9px] text-[#f87171] mt-0.5">{error}</p>}
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

      <ItemDrawer
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

function BoardView({ items, projectId, onSelect, onCreated, onItemsChanged, onDeleted }: {
  items: Item[];
  projectId: string;
  onSelect: (item: Item) => void;
  onCreated: (item: Item) => void;
  onItemsChanged: (updater: (prev: Item[]) => Item[]) => void;
  onDeleted: (id: string) => void;
}) {
  const COL_LABELS: Record<string, string> = {
    backlog: "Backlog", ready: "Ready", in_progress: "In Progress", done: "Done",
  };
  const COL_COLORS: Record<string, string> = {
    backlog: "#4b6a8a", ready: "#34d399", in_progress: "#38bdf8", done: "#4b6a8a",
  };

  // Shared drag state lifted to BoardView so cross-column drops work
  const draggingId = useRef<string | null>(null);

  function handleDrop(toStatus: string, toId: string | null) {
    const fromId = draggingId.current;
    draggingId.current = null;
    if (!fromId) return;

    const draggedItem = items.find(i => i.id === fromId);
    if (!draggedItem) return;

    const fromStatus = draggedItem.status;
    const targetCol = [...items.filter(i => i.status === toStatus)].sort((a, b) => a.priority - b.priority);

    // Remove dragged item from target col (if same col, it's already there)
    const withoutDragged = targetCol.filter(i => i.id !== fromId);

    // Insert before toId, or at end if toId is null
    const insertAt = toId ? withoutDragged.findIndex(i => i.id === toId) : withoutDragged.length;
    const insertIdx = insertAt === -1 ? withoutDragged.length : insertAt;
    withoutDragged.splice(insertIdx, 0, { ...draggedItem, status: toStatus });

    // Assign priorities spaced by 10
    const reordered = withoutDragged.map((item, idx) => ({ ...item, priority: (idx + 1) * 10 }));

    onItemsChanged(prev => {
      const other = prev.filter(i => i.status !== toStatus && i.id !== fromId);
      return [...other, ...reordered];
    });

    // Persist — update status if changed, always update priority
    reordered.forEach(item => {
      const orig = items.find(i => i.id === item.id);
      const updates: Partial<Item> = { priority: item.priority };
      if (fromStatus !== toStatus && item.id === fromId) updates.status = toStatus as Item["status"];
      if (!orig || orig.priority !== item.priority || (updates.status && orig.status !== updates.status)) {
        api.items.update(item.id, updates).catch(() => {});
      }
    });
  }

  return (
    <div className="flex gap-3 h-full min-h-[400px]">
      {BOARD_STATUSES.map(status => {
        const col = [...items.filter(i => i.status === status)].sort((a, b) => a.priority - b.priority);
        return (
          <BoardColumn
            key={status}
            status={status}
            label={COL_LABELS[status]}
            color={COL_COLORS[status]}
            items={col}
            projectId={projectId}
            onSelect={onSelect}
            onCreated={onCreated}
            onDeleted={onDeleted}
            draggingId={draggingId}
            onDrop={handleDrop}
          />
        );
      })}
    </div>
  );
}

function BoardColumn({ status, label, color, items, projectId, onSelect, onCreated, onDeleted, draggingId, onDrop }: {
  status: string;
  label: string;
  color: string;
  items: Item[];
  projectId: string;
  onSelect: (item: Item) => void;
  onCreated: (item: Item) => void;
  onDeleted: (id: string) => void;
  draggingId: React.MutableRefObject<string | null>;
  onDrop: (toStatus: string, toId: string | null) => void;
}) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [colDragOver, setColDragOver] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-[1px]" style={{ color }}>
          {label}
        </span>
        <span className="text-[10px] bg-[#0a1628] text-[#4b6a8a] px-1.5 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div
        className={`flex-1 overflow-y-auto rounded transition-colors ${colDragOver ? "bg-[#0c1e30]/60" : ""}`}
        onDragOver={e => { e.preventDefault(); setColDragOver(true); }}
        onDragLeave={() => setColDragOver(false)}
        onDrop={e => { e.preventDefault(); setColDragOver(false); setDragOverId(null); onDrop(status, null); }}
      >
        {items.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={e => { e.stopPropagation(); draggingId.current = item.id; }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(item.id); setColDragOver(false); }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(null); onDrop(status, item.id); }}
            onDragEnd={() => { draggingId.current = null; setDragOverId(null); setColDragOver(false); }}
            className={`transition-opacity ${dragOverId === item.id ? "opacity-40 border-t-2 border-[#0ea5e9]" : ""}`}
            style={{ cursor: "grab" }}
          >
            <ItemCard item={item} onClick={() => onSelect(item)} onDeleted={onDeleted} compact={status === "done"} />
          </div>
        ))}
        {items.length === 0 && (
          <div className={`text-[10px] text-center py-4 transition-colors ${colDragOver ? "text-[#0ea5e9]" : "text-[#1e4060]"}`}>
            {colDragOver ? "Drop here" : "—"}
          </div>
        )}
      </div>
      <QuickAdd projectId={projectId} status={status} onCreated={onCreated} />
    </div>
  );
}

function QuickAdd({ projectId, status, onCreated }: {
  projectId: string;
  status: string;
  onCreated: (item: Item) => void;
}) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const item = await api.items.create({ project_id: projectId, title: title.trim(), status, source: "user", execution_mode: "auto" });
      onCreated(item);
      setTitle("");
      setActive(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
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
      {error && <p className="text-[9px] text-[#f87171] mt-0.5">{error}</p>}
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

function TableView({ items, onSelect }: { items: Item[]; onSelect: (item: Item) => void }) {
  const sorted = [...items].sort((a, b) => a.priority - b.priority || (b.roi_score ?? 0) - (a.roi_score ?? 0));

  return (
    <div className="w-full">
      <div className="grid gap-2 px-2.5 pb-2 text-[9px] font-bold uppercase tracking-[0.8px] text-[#1e4060] border-b border-[#132030]"
        style={{ gridTemplateColumns: "1fr 100px 50px 50px 80px" }}>
        <span>Title</span>
        <span>Status</span>
        <span>Pri</span>
        <span>ROI</span>
        <span>Effort</span>
      </div>
      {sorted.map(item => (
        <div
          key={item.id}
          className="grid gap-2 px-2.5 py-2.5 items-center border-b border-[#0d1a26] cursor-pointer hover:bg-[#0c1e30] transition-colors"
          style={{ gridTemplateColumns: "1fr 100px 50px 50px 80px" }}
          onClick={() => onSelect(item)}
        >
          <span className="text-[12px] text-[#bfdbfe] truncate">{item.title}</span>
          <span><StatusBadge status={item.status} /></span>
          <span className="text-[12px] font-bold text-[#0ea5e9]">{item.priority}</span>
          <span className="text-[11px] font-semibold text-[#10b981]">{item.roi_score ?? "—"}</span>
          <span className="text-[10px] text-[#4b6a8a] capitalize">{item.effort ?? "—"}</span>
        </div>
      ))}
      {sorted.length === 0 && (
        <div className="text-[12px] text-[#1e4060] text-center py-8">No items. Add one above.</div>
      )}
    </div>
  );
}

function SortIndicator({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="text-[#2a4a6a] ml-0.5">↕</span>;
  return <span className="text-[#00b4d8] ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

function TableView({ items, onSelect }: { items: Item[]; onSelect: (item: Item) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "priority") {
      cmp = a.priority - b.priority;
    } else if (sortKey === "roi") {
      cmp = (a.roi_score ?? -1) - (b.roi_score ?? -1);
    } else if (sortKey === "created") {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const thClass = "flex items-center gap-0.5 cursor-pointer select-none hover:text-[#a8c5da] transition-colors";

  return (
    <div className="w-full">
      <div className="grid gap-2 px-2.5 pb-2 text-[9px] font-bold uppercase tracking-[0.8px] text-[#1e4060] border-b border-[#132030]"
        style={{ gridTemplateColumns: "1fr 100px 60px 60px 80px 90px" }}>
        <span>Title</span>
        <span>Status</span>
        <button className={thClass} onClick={() => toggleSort("priority")}>
          Pri <SortIndicator col="priority" sortKey={sortKey} sortDir={sortDir} />
        </button>
        <button className={thClass} onClick={() => toggleSort("roi")}>
          ROI <SortIndicator col="roi" sortKey={sortKey} sortDir={sortDir} />
        </button>
        <span>Effort</span>
        <button className={thClass} onClick={() => toggleSort("created")}>
          Created <SortIndicator col="created" sortKey={sortKey} sortDir={sortDir} />
        </button>
      </div>
      {sorted.map(item => (
        <div
          key={item.id}
          className="grid gap-2 px-2.5 py-2.5 items-center border-b border-[#0d1a26] cursor-pointer hover:bg-[#0c1e30] transition-colors"
          style={{ gridTemplateColumns: "1fr 100px 60px 60px 80px 90px" }}
          onClick={() => onSelect(item)}
        >
          <span className="text-[12px] text-[#bfdbfe] truncate">{item.title}</span>
          <span><StatusBadge status={item.status} /></span>
          <span className="text-[12px] font-bold text-[#0ea5e9]">{item.priority}</span>
          <span className="text-[11px] font-semibold text-[#10b981]">{item.roi_score ?? "—"}</span>
          <span className="text-[10px] text-[#4b6a8a] capitalize">{item.effort ?? "—"}</span>
          <span className="text-[10px] text-[#2a4a6a]">
            {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      ))}
      {sorted.length === 0 && (
        <div className="text-[12px] text-[#1e4060] text-center py-8">No items match your filters.</div>
      )}
    </div>
  );
}
