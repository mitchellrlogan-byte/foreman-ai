import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type Item, type Project } from "../lib/api";
import { ItemCard } from "../components/ItemCard";

type StatusTab = "backlog" | "ready" | "in_progress" | "done" | "all";

export function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<StatusTab>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.projects.get(id),
      api.items.list({ project_id: id }),
    ]).then(([p, i]) => {
      setProject(p);
      setItems(i);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!project) return <div className="p-8 text-red-500">Project not found.</div>;

  const filtered = tab === "all" ? items : items.filter((i) => i.status === tab);
  const tabs: StatusTab[] = ["all", "backlog", "ready", "in_progress", "done"];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link to="/" className="text-sm text-blue-600 hover:underline">&larr; Dashboard</Link>

      <h1 className="text-2xl font-bold text-gray-900 mt-2">{project.name}</h1>
      <p className="text-gray-500 text-sm mb-6">{project.description}</p>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {tabs.map((t) => {
          const count = t === "all" ? items.length : items.filter((i) => i.status === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.replace("_", " ")} ({count})
            </button>
          );
        })}
      </div>

      <Link
        to={`/project/${id}/add`}
        className="inline-block mb-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
      >
        + Add Item
      </Link>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm">No items.</p>
        ) : (
          filtered.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
