import { useState, type FormEvent, type ReactNode } from "react";
import { api, type Project } from "../lib/api";

interface AddProjectModalProps {
  onClose: () => void;
  onAdded: (project: Project) => void;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AddProjectModal({ onClose, onAdded }: AddProjectModalProps) {
  const [name, setName] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !repoPath.trim()) return;
    setSaving(true);
    setError("");
    try {
      const project = await api.projects.create({
        id: slugify(name.trim()),
        name: name.trim(),
        repo_path: repoPath.trim(),
        description: description.trim() || undefined,
      });
      onAdded(project);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0d1b2a] border border-[#1a3a5c] rounded-lg w-full max-w-md p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-[#e0f2fe]">Add Project Manually</h2>
            <button onClick={onClose} className="text-[#4b6a8a] hover:text-[#94a3b8] text-lg leading-none">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Project Name">
              <input
                value={name} onChange={e => setName(e.target.value)}
                autoFocus required
                placeholder="My Project"
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#e0f2fe] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
              />
            </Field>

            <Field label="Full Path">
              <input
                value={repoPath} onChange={e => setRepoPath(e.target.value)}
                required
                placeholder="C:\Users\mitch\my-project"
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] font-mono focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
              />
            </Field>

            <Field label="Description (optional)">
              <input
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="What is this project?"
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
              />
            </Field>

            {error && <p className="text-[11px] text-[#f87171]">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="submit" disabled={saving || !name.trim() || !repoPath.trim()}
                className="flex-1 py-2 text-white text-[12px] font-semibold rounded transition-colors disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
              >
                {saving ? "Adding..." : "Add Project"}
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2 bg-[#0c1e30] text-[#4b6a8a] text-[12px] rounded hover:text-[#94a3b8]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1e4060] mb-1">{label}</label>
      {children}
    </div>
  );
}
