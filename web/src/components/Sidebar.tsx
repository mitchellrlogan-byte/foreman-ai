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
