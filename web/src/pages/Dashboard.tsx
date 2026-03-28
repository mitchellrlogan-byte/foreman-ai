import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Project, type Item } from "../lib/api";

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.projects.list(),
      api.items.list({ status: "in_progress" }),
    ]).then(([p, items]) => {
      setProjects(p);
      setRecentItems(items);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Foreman AI</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          In Progress ({recentItems.length})
        </h2>
        {recentItems.length === 0 ? (
          <p className="text-gray-500 text-sm">Nothing in progress.</p>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-3 bg-yellow-50 border-yellow-200">
                <div className="font-medium text-sm">{item.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {item.project_id} &middot; P{item.priority} &middot; ROI {item.roi_score ?? "?"}/10
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          Projects ({projects.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/project/${p.id}`}
              className="border rounded-lg p-4 hover:border-blue-400 transition-colors"
            >
              <h3 className="font-medium text-gray-900">{p.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{p.description || "No description"}</p>
              <p className="text-xs text-gray-400 mt-2">{p.id}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
