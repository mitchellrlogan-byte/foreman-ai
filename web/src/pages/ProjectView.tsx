import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type Item, type Project } from "../lib/api";
import { ItemCard } from "../components/ItemCard";
import { ItemDrawer } from "../components/ItemDrawer";
import { StatusBadge } from "../components/StatusBadge";

type ViewMode = "board" | "table";
const BOARD_STATUSES = ["backlog", "ready", "in_progress", "done"] as const;

export function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [view, setView] = useState<ViewMode>("board");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

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

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {view === "board" ? (
          <BoardView items={visibleItems} projectId={id!} onSelect={setSelectedItem} onCreated={handleCreated} />
        ) : (
          <TableView items={visibleItems} onSelect={setSelectedItem} />
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
