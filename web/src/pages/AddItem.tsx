import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export function AddItem() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("feature");
  const [effort, setEffort] = useState("");
  const [executionMode, setExecutionMode] = useState("manual");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    setSaving(true);
    await api.items.create({
      project_id: projectId,
      title: title.trim(),
      description: description.trim(),
      category,
      effort: effort || undefined,
      execution_mode: executionMode,
      source: "user",
    } as Parameters<typeof api.items.create>[0]);

    navigate(`/project/${projectId}`);
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Add Item</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="What needs to be done?"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={3}
            placeholder="Details, context, acceptance criteria..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="research">Research</option>
              <option value="chore">Chore</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effort</label>
            <select
              value={effort}
              onChange={(e) => setEffort(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Unsized</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Execution Mode</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="manual"
                checked={executionMode === "manual"}
                onChange={() => setExecutionMode("manual")}
              />
              Manual — I'll do it
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="auto"
                checked={executionMode === "auto"}
                onChange={() => setExecutionMode("auto")}
              />
              Auto — Claude does it
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add to Backlog"}
        </button>
      </form>
    </div>
  );
}
