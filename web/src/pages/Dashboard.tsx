import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Project, type Item } from "../lib/api";

interface DashboardProps {
  onProjectsLoaded?: (projects: Project[]) => void;
}

export function Dashboard({ onProjectsLoaded }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [inProgress, setInProgress] = useState<Item[]>([]);
  const [nextWork, setNextWork] = useState<Item[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.projects.list(),
      api.items.list({ status: "in_progress" }),
      api.nextWork({ limit: 5 }),
      api.items.list(),
    ]).then(([p, ip, nw, all]) => {
      setProjects(p);
      setInProgress(ip);
      setNextWork(nw);
      setAllItems(all);
      onProjectsLoaded?.(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [onProjectsLoaded]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#1e4060] text-sm">Loading...</div>
      </div>
    );
  }

  const doneCount = allItems.filter(i => i.status === "done").length;
  const readyCount = allItems.filter(i => i.status === "ready").length;

  const PROJECT_COLORS = [
    "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b",
    "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
  ];

  function projectDonePercent(projectId: string) {
    const projItems = allItems.filter(i => i.project_id === projectId);
    if (projItems.length === 0) return 0;
    return Math.round((projItems.filter(i => i.status === "done").length / projItems.length) * 100);
  }

  function projectItemCount(projectId: string) {
    return allItems.filter(i => i.project_id === projectId && i.status !== "archived").length;
  }

  return (
    <div className="p-5 max-w-5xl">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { num: allItems.length, label: "Total Items", color: "#e0f2fe" },
          { num: readyCount, label: "Ready to Start", color: "#f59e0b" },
          { num: inProgress.length, label: "In Progress", color: "#0ea5e9" },
          { num: doneCount, label: "Completed", color: "#10b981" },
        ].map(({ num, label, color }) => (
          <div key={label} className="bg-[#0c1e30] border border-[#132030] rounded-lg px-4 py-3">
            <div className="text-2xl font-bold leading-none mb-1" style={{ color }}>{num}</div>
            <div className="text-[10px] text-[#4b6a8a] uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      {/* Next Work */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-[#0ea5e9]">⚡ Next Work</h2>
          <span className="text-[9px] bg-[#0c2d4a] text-[#38bdf8] px-2 py-0.5 rounded-full">pm_next_work</span>
        </div>
        {nextWork.length === 0 ? (
          <p className="text-[12px] text-[#1e4060]">No actionable items. Add some to your backlog.</p>
        ) : (
          <div className="space-y-1.5">
            {nextWork.map((item, i) => (
              <NextWorkRow key={item.id} item={item} rank={i + 1} />
            ))}
          </div>
        )}
      </section>

      {/* In Progress */}
      {inProgress.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-[#38bdf8]">🔵 In Progress</h2>
            <span className="text-[9px] bg-[#0c2d4a] text-[#38bdf8] px-2 py-0.5 rounded-full">{inProgress.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {inProgress.map(item => (
              <Link
                key={item.id}
                to={`/project/${item.project_id}`}
                className="bg-[#0c1e30] border border-[#1a3a5c] border-l-[3px] rounded-lg p-3 hover:bg-[#0e2440] transition-colors"
                style={{ borderLeftColor: "#0ea5e9" }}
              >
                <div className="text-[12px] font-semibold text-[#e0f2fe] mb-1 leading-snug">{item.title}</div>
                <div className="text-[10px] text-[#4b6a8a]">
                  {item.project_id} · {item.category}
                  {item.roi_score != null && <span className="text-[#0ea5e9] ml-1">ROI {item.roi_score}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-[#4b6a8a]">📁 Projects</h2>
        </div>
        {projects.length === 0 ? (
          <p className="text-[12px] text-[#1e4060]">No projects registered. Use pm_register_project in Claude Code.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {projects.map((p, i) => {
              const pct = projectDonePercent(p.id);
              const count = projectItemCount(p.id);
              const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
              return (
                <Link
                  key={p.id}
                  to={`/project/${p.id}`}
                  className="bg-[#0c1e30] border border-[#132030] rounded-lg p-3 hover:border-[#1a5276] transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
                    <span className="text-[12px] font-semibold text-[#bfdbfe] truncate">{p.name}</span>
                  </div>
                  <div className="text-[10px] text-[#4b6a8a] mb-2">{count} items</div>
                  <div className="h-[3px] bg-[#0a1628] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, #14b8a6)` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function NextWorkRow({ item, rank }: { item: Item; rank: number }) {
  const STATUS_COLORS: Record<string, string> = {
    ready: "#34d399", in_progress: "#38bdf8", backlog: "#4b6a8a",
  };

  return (
    <Link
      to={`/project/${item.project_id}`}
      className="flex items-center gap-3 px-3 py-2 bg-[#0c1e30] border border-[#132030] rounded-md hover:border-[#1a5276] transition-colors"
    >
      <div className="w-5 h-5 bg-[#0a1628] border border-[#1a3a5c] rounded text-[9px] text-[#38bdf8] flex items-center justify-center font-bold flex-shrink-0">
        {rank}
      </div>
      <div className="flex-1 text-[12px] text-[#bfdbfe] truncate">{item.title}</div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.roi_score != null && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0f1e10] text-[#10b981] font-medium">ROI {item.roi_score}</span>
        )}
        {item.effort && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e1a0a] text-[#fbbf24] font-medium capitalize">{item.effort}</span>
        )}
        <span
          className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
          style={{
            backgroundColor: STATUS_COLORS[item.status] ? `${STATUS_COLORS[item.status]}22` : "#13203022",
            color: STATUS_COLORS[item.status] ?? "#4b6a8a"
          }}
        >
          {item.status.replace("_", " ")}
        </span>
      </div>
    </Link>
  );
}
