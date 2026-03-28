import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { ProjectView } from "./pages/ProjectView";
import { AddItem } from "./pages/AddItem";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:id" element={<ProjectView />} />
          <Route path="/project/:id/add" element={<AddItem />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
