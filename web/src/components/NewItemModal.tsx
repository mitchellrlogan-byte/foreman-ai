import { useState, type FormEvent, type ReactNode } from "react";
import { api, type Project, type Item } from "../lib/api";

interface NewItemModalProps {
  projects: Project[];
  defaultProjectId?: string;
  onClose: () => void;
  onCreated: (item: Item) => void;
}

export function NewItemModal({ projects, defaultProjectId, onClose, onCreated }: NewItemModalProps) {
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [userStory, setUserStory] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("feature");
  const [effort, setEffort] = useState("");
  const [storyPoints, setStoryPoints] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [severity, setSeverity] = useState("");
  const [environment, setEnvironment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    setSaving(true);
    setError("");
    try {
      const item = await api.items.create({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        user_story: userStory.trim() || undefined,
        acceptance_criteria: acceptanceCriteria.trim() || undefined,
        notes: notes.trim() || undefined,
        category,
        effort: effort as Item["effort"] || undefined,
        story_points: storyPoints ? parseInt(storyPoints) : undefined,
        due_date: dueDate || undefined,
        severity: (severity as Item["severity"]) || undefined,
        environment: environment.trim() || undefined,
        source: "user",
        execution_mode: "auto",
      });
      onCreated(item);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
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
            <h2 className="text-[14px] font-bold text-[#e0f2fe]">New Item</h2>
            <button onClick={onClose} className="text-[#4b6a8a] hover:text-[#94a3b8] text-lg leading-none">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Project">
              <select
                value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Title">
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                autoFocus required
                placeholder="What needs to be done?"
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#e0f2fe] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Details and context..."
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
              />
            </Field>

            <Field label="User Story">
              <textarea
                value={userStory} onChange={e => setUserStory(e.target.value)} rows={2}
                placeholder="As a [user], I want [feature], so that [benefit]..."
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
              />
            </Field>

            <Field label="Acceptance Criteria">
              <textarea
                value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} rows={2}
                placeholder="What does done look like?"
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Freeform notes, links, decisions..."
                className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Category">
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]">
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="research">Research</option>
                  <option value="chore">Chore</option>
                </select>
              </Field>
              <Field label="Effort">
                <select value={effort} onChange={e => setEffort(e.target.value)}
                  className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]">
                  <option value="">Unsized</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Story Points">
                <input
                  type="number" min="1" max="100" value={storyPoints}
                  onChange={e => setStoryPoints(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
                />
              </Field>
              <Field label="Due Date">
                <input
                  type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] [color-scheme:dark]"
                />
              </Field>
            </div>

            {category === "bug" && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Severity">
                  <select value={severity} onChange={e => setSeverity(e.target.value)}
                    className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9]">
                    <option value="">Unknown</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </Field>
                <Field label="Environment">
                  <input
                    type="text" value={environment} onChange={e => setEnvironment(e.target.value)}
                    placeholder="prod / staging / local"
                    className="w-full bg-[#080f1a] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
                  />
                </Field>
              </div>
            )}

            {error && <p className="text-[11px] text-[#f87171]">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="submit" disabled={saving || !title.trim() || !projectId}
                className="flex-1 py-2 text-white text-[12px] font-semibold rounded transition-colors disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
              >
                {saving ? "Adding..." : "Add to Backlog"}
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
