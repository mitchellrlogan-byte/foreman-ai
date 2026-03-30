import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { ProjectView } from "./pages/ProjectView";
import { AddItem } from "./pages/AddItem";
import { api, type Project } from "./lib/api";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.projects.list().then(setProjects).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#080f1a]">
        <Sidebar projects={projects} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard onProjectsLoaded={setProjects} />} />
            <Route path="/project/:id" element={<ProjectView />} />
            <Route path="/project/:id/add" element={<AddItem />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
