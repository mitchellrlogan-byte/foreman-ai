// web/src/pages/ExecutionPage.tsx
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import type { Item } from "../lib/api";

interface Settings {
  mode_a_enabled: boolean;
  mode_b_enabled: boolean;
  mode_b_interval_minutes: number;
}

const INTERVAL_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "4 hours", value: 240 },
  { label: "8 hours", value: 480 },
  { label: "Daily", value: 1440 },
];

export function ExecutionPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [autoItems, setAutoItems] = useState<Item[]>([]);
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [runMsg, setRunMsg] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api.settings.get().then(setSettings).catch(() => {});
    api.items.list({ execution_mode: "auto" }).then(setAutoItems).catch(() => {});
  }, []);

  async function toggleSetting(key: keyof Settings, value: boolean | number) {
    try {
      const updated = await api.settings.update({ [key]: value });
      setSettings(updated);
    } catch {
      // ignore
    }
  }

  async function handleRunNow() {
    setRunStatus("running");
    setRunMsg("Running...");
    try {
      const result = await api.execute();
      if (result.started) {
        setRunStatus("done");
        setRunMsg(`Started: ${result.item_id ?? ""} -> ${result.execution_status ?? ""}`);
        // Refresh items
        api.items.list({ execution_mode: "auto" }).then(setAutoItems).catch(() => {});
      } else {
        setRunStatus("idle");
        setRunMsg(result.reason ?? "No items to run");
      }
    } catch (err) {
      setRunStatus("error");
      setRunMsg(err instanceof Error ? err.message : "Error");
    }
  }

  if (!settings) {
    return (
      <div className="p-6 text-[#4b6a8a] text-sm">Loading...</div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-[#e0f2fe] text-xl font-bold mb-1">Auto-Execution</h1>
        <p className="text-[#4b6a8a] text-sm">
          Dispatch Claude to autonomously work on backlog items marked as auto.
        </p>
      </div>

      {/* Mode Controls */}
      <section className="bg-[#0d1b2a] border border-[#132030] rounded-lg p-5 space-y-5">
        <h2 className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider">Execution Modes</h2>

        {/* Mode A */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[#e0f2fe] text-sm font-semibold">Mode A — Session Start</div>
            <div className="text-[#4b6a8a] text-xs mt-0.5">
              Claude picks up auto items at the start of each Claude Code session
            </div>
          </div>
          <Toggle
            enabled={settings.mode_a_enabled}
            onChange={(v) => toggleSetting("mode_a_enabled", v)}
          />
        </div>

        {/* Mode B */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-[#e0f2fe] text-sm font-semibold">Mode B — Scheduled</div>
            <div className="text-[#4b6a8a] text-xs mt-0.5">
              Runs automatically in the background on a schedule
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[#4b6a8a] text-xs">Every</span>
              <select
                value={settings.mode_b_interval_minutes}
                onChange={(e) => toggleSetting("mode_b_interval_minutes", parseInt(e.target.value, 10))}
                className="bg-[#0c1e30] border border-[#1a3a5c] text-[#94a3b8] text-xs rounded px-2 py-1"
              >
                {INTERVAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <Toggle
            enabled={settings.mode_b_enabled}
            onChange={(v) => toggleSetting("mode_b_enabled", v)}
          />
        </div>

        {/* Mode C */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[#e0f2fe] text-sm font-semibold">Mode C — Manual</div>
            <div className="text-[#4b6a8a] text-xs mt-0.5">
              Trigger one run immediately from the dashboard
            </div>
            {runMsg && (
              <div className={`mt-1 text-xs ${runStatus === "error" ? "text-red-400" : "text-[#38bdf8]"}`}>
                {runMsg}
              </div>
            )}
          </div>
          <button
            onClick={handleRunNow}
            disabled={runStatus === "running"}
            className="px-3 py-1.5 text-xs font-semibold rounded-md text-white disabled:opacity-50 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
          >
            {runStatus === "running" ? "Running..." : "Run Now"}
          </button>
        </div>
      </section>

      {/* Auto Queue */}
      <section className="space-y-3">
        <h2 className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider">
          Auto Queue ({autoItems.length})
        </h2>
        {autoItems.length === 0 ? (
          <div className="text-[#4b6a8a] text-sm">
            No items marked as auto. Set an item's execution_mode to "auto" to add it here.
          </div>
        ) : (
          <div className="space-y-2">
            {autoItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#0d1b2a] border border-[#132030] rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[#e0f2fe] text-sm font-medium truncate">{item.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={item.status} />
                      {item.execution_status && (
                        <ExecBadge status={item.execution_status} />
                      )}
                      {item.last_executed_at && (
                        <span className="text-[#2d4a62] text-[10px]">
                          Last run: {new Date(item.last_executed_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.execution_output && (
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="text-[10px] text-[#38bdf8] hover:text-[#0ea5e9] flex-shrink-0"
                    >
                      {expandedId === item.id ? "hide" : "output"}
                    </button>
                  )}
                </div>
                {expandedId === item.id && item.execution_output && (
                  <pre className="mt-3 bg-[#060d16] border border-[#0c1e30] rounded p-3 text-[10px] text-[#4b6a8a] overflow-auto max-h-48 whitespace-pre-wrap">
                    {item.execution_output}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
        enabled ? "bg-[#0ea5e9]" : "bg-[#1a3a5c]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    backlog: "#4b6a8a",
    ready: "#34d399",
    in_progress: "#38bdf8",
    done: "#4b6a8a",
    archived: "#2d4a62",
  };
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ color: colors[status] ?? "#4b6a8a", border: `1px solid ${colors[status] ?? "#4b6a8a"}33` }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function ExecBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "#f59e0b",
    running: "#38bdf8",
    done: "#34d399",
    failed: "#ef4444",
  };
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ color: colors[status] ?? "#4b6a8a", background: `${colors[status] ?? "#4b6a8a"}22` }}
    >
      exec: {status}
    </span>
  );
}
