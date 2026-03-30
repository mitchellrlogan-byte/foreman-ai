import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { NewItemModal } from "./components/NewItemModal";
import { Dashboard } from "./pages/Dashboard";
import { ProjectView } from "./pages/ProjectView";
import { AddItem } from "./pages/AddItem";
import { api, type Project } from "./lib/api";

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}

function AppInner() {
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewItem, setShowNewItem] = useState(false);

  // Extract current project ID from URL like /project/my-project or /project/my-project/add
  const projectMatch = location.pathname.match(/^\/project\/([^/]+)/);
  const currentProjectId = projectMatch ? projectMatch[1] : undefined;

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

      {showNewItem && (
        <NewItemModal
          projects={projects}
          defaultProjectId={currentProjectId}
          onClose={() => setShowNewItem(false)}
          onCreated={() => setShowNewItem(false)}
        />
      )}
    </div>
  );
}
