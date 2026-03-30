import { useState } from "react";
import { api, type Project, type ScanResult } from "../lib/api";

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
