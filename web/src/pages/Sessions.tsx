import { useEffect, useState } from "react";
import { api, type Session, type SessionAnalytics, type Project } from "../lib/api";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function sessionDurationMs(session: Session): number | null {
  if (!session.ended_at) return null;
  return new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
}

// ── Stat Card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#0c1e30] border border-[#132030] rounded-lg px-4 py-3 flex flex-col gap-1">
      <div className="text-[10px] text-[#4b6a8a] uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold leading-tight" style={{ color }}>{value}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function Sessions() {
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.sessions.analytics(),
      api.projects.list(),
    ]).then(([a, p]) => {
      setAnalytics(a);
      setProjects(p);
      setLoading(false);
    }).catch((e: Error) => {
      setError(e.message);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#1e4060] text-sm">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5">
        <div className="text-[#ef4444] text-sm">Failed to load sessions: {error}</div>
      </div>
    );
  }

  if (!analytics) return null;

  const projectById = Object.fromEntries(projects.map(p => [p.id, p]));

  const projectName = (pid: string) => projectById[pid]?.name ?? pid;

  const mostActiveName = analytics.mostActiveProject
    ? projectName(analytics.mostActiveProject)
    : "—";

  // Sort sessions by started_at desc (already sorted by backend, but ensure)
  const sessions = [...analytics.sessions].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  // Per-project rows sorted by session count desc
  const perProjectRows = Object.entries(analytics.perProject).sort(
    ([, a], [, b]) => b.count - a.count
  );

  return (
    <div className="p-5 max-w-5xl">
      <div className="mb-5">
        <h1 className="text-[15px] font-bold text-[#e0f2fe] mb-0.5">Sessions</h1>
        <p className="text-[11px] text-[#4b6a8a]">Work sessions logged by Claude Code agents</p>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total Sessions"
          value={String(analytics.totalSessions)}
          color="#e0f2fe"
        />
        <StatCard
          label="Time Tracked"
          value={analytics.totalDurationMs > 0 ? formatDuration(analytics.totalDurationMs) : "—"}
          color="#00b4d8"
        />
        <StatCard
          label="Avg Duration"
          value={analytics.avgDurationMs > 0 ? formatDuration(analytics.avgDurationMs) : "—"}
          color="#38bdf8"
        />
        <StatCard
          label="Most Active Project"
          value={mostActiveName}
          color="#10b981"
        />
      </div>

      {/* ── Sessions Table ── */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-[#0ea5e9]">
            Session Log
          </h2>
          <span className="text-[9px] bg-[#0c2d4a] text-[#38bdf8] px-2 py-0.5 rounded-full">
            {sessions.length}
          </span>
        </div>

        {sessions.length === 0 ? (
          <p className="text-[12px] text-[#1e4060]">
            No sessions yet. Sessions are created by pm_start_session / pm_end_session.
          </p>
        ) : (
          <div className="border border-[#132030] rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[160px_1fr_90px_80px_80px] gap-0 bg-[#0a1628] border-b border-[#132030]">
              {["Date", "Project", "Duration", "Items", ""].map((h, i) => (
                <div
                  key={i}
                  className="px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-[#1e4060]"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Table rows */}
            {sessions.map(session => {
              const durationMs = sessionDurationMs(session);
              const isExpanded = expandedId === session.id;
              const isInProgress = session.ended_at === null;

              return (
                <div key={session.id} className="border-b border-[#0c1e30] last:border-b-0">
                  {/* Main row */}
                  <button
                    className="w-full grid grid-cols-[160px_1fr_90px_80px_80px] gap-0 hover:bg-[#0c1e30] transition-colors text-left"
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  >
                    <div className="px-3 py-2.5 text-[11px] text-[#94a3b8]">
                      {formatDate(session.started_at)}
                    </div>
                    <div className="px-3 py-2.5 text-[11px] text-[#bfdbfe] truncate">
                      {projectName(session.project_id)}
                      {session.summary && (
                        <span className="ml-2 text-[#4b6a8a]">
                          {session.summary.length > 60
                            ? session.summary.slice(0, 60) + "…"
                            : session.summary}
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2.5 text-[11px]">
                      {isInProgress ? (
                        <span className="text-[#f59e0b] font-medium">In Progress</span>
                      ) : durationMs !== null ? (
                        <span className="text-[#94a3b8]">{formatDuration(durationMs)}</span>
                      ) : (
                        <span className="text-[#4b6a8a]">—</span>
                      )}
                    </div>
                    <div className="px-3 py-2.5 text-[11px] text-[#4b6a8a]">
                      {session.items_touched.length > 0 ? (
                        <span className="text-[#38bdf8]">{session.items_touched.length}</span>
                      ) : "—"}
                    </div>
                    <div className="px-3 py-2.5 text-[10px] text-[#4b6a8a]">
                      {isExpanded ? "▲" : "▼"}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-[#080f1a] border-t border-[#132030]">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-[9px] uppercase tracking-wide text-[#1e4060] mb-1">Started</div>
                          <div className="text-[11px] text-[#94a3b8]">{formatDateTime(session.started_at)}</div>
                        </div>
                        {session.ended_at && (
                          <div>
                            <div className="text-[9px] uppercase tracking-wide text-[#1e4060] mb-1">Ended</div>
                            <div className="text-[11px] text-[#94a3b8]">{formatDateTime(session.ended_at)}</div>
                          </div>
                        )}
                      </div>
                      {session.summary && (
                        <div className="mb-3">
                          <div className="text-[9px] uppercase tracking-wide text-[#1e4060] mb-1">Summary</div>
                          <div className="text-[12px] text-[#a8c5da] leading-relaxed">{session.summary}</div>
                        </div>
                      )}
                      {session.items_touched.length > 0 && (
                        <div>
                          <div className="text-[9px] uppercase tracking-wide text-[#1e4060] mb-1">
                            Items Worked ({session.items_touched.length})
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {session.items_touched.map(id => (
                              <span
                                key={id}
                                className="text-[9px] bg-[#0c2d4a] text-[#38bdf8] px-2 py-0.5 rounded font-mono"
                              >
                                {id.slice(0, 8)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Per-Project Breakdown ── */}
      {perProjectRows.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-[#4b6a8a]">
              Per-Project Breakdown
            </h2>
          </div>
          <div className="border border-[#132030] rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_90px_120px_160px] bg-[#0a1628] border-b border-[#132030]">
              {["Project", "Sessions", "Total Time", "Last Active"].map(h => (
                <div key={h} className="px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-[#1e4060]">
                  {h}
                </div>
              ))}
            </div>
            {perProjectRows.map(([pid, data]) => (
              <div
                key={pid}
                className="grid grid-cols-[1fr_90px_120px_160px] border-b border-[#0c1e30] last:border-b-0 hover:bg-[#0c1e30] transition-colors"
              >
                <div className="px-3 py-2.5 text-[12px] font-medium text-[#bfdbfe]">
                  {projectName(pid)}
                </div>
                <div className="px-3 py-2.5 text-[12px] text-[#38bdf8] font-semibold">
                  {data.count}
                </div>
                <div className="px-3 py-2.5 text-[11px] text-[#94a3b8]">
                  {data.totalMs > 0 ? formatDuration(data.totalMs) : "—"}
                </div>
                <div className="px-3 py-2.5 text-[11px] text-[#4b6a8a]">
                  {formatDate(data.lastActive)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
