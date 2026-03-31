import { useState, type ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";

export function AddItem() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const [executionMode, setExecutionMode] = useState("auto");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    setSaving(true);
    await api.items.create({
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      user_story: userStory.trim() || undefined,
      acceptance_criteria: acceptanceCriteria.trim() || undefined,
      notes: notes.trim() || undefined,
      category,
      effort: effort as "small" | "medium" | "large" | undefined || undefined,
      story_points: storyPoints ? parseInt(storyPoints) : undefined,
      due_date: dueDate || undefined,
      severity: (severity as "critical" | "high" | "medium" | "low") || undefined,
      environment: environment.trim() || undefined,
      execution_mode: executionMode,
      source: "user",
    });
    navigate(`/project/${projectId}`);
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <Link to={`/project/${projectId}`} className="text-[11px] text-[#4b6a8a] hover:text-[#94a3b8] mb-4 inline-block">
        ← Back
      </Link>
      <h1 className="text-[18px] font-bold text-[#e0f2fe] mb-5">Add Item</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title">
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#e0f2fe] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
            placeholder="What needs to be done?" autoFocus required
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
            placeholder="Details and context..."
          />
        </Field>

        <Field label="User Story">
          <textarea
            value={userStory} onChange={e => setUserStory(e.target.value)} rows={2}
            className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
            placeholder="As a [user], I want [feature], so that [benefit]..."
          />
        </Field>

        <Field label="Acceptance Criteria">
          <textarea
            value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} rows={3}
            className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
            placeholder="What does done look like? e.g. - User can log in&#10;- Error message shown on failure"
          />
        </Field>

        <Field label="Notes">
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
            placeholder="Freeform notes, links, decisions..."
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#94a3b8] focus:outline-none">
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="research">Research</option>
              <option value="chore">Chore</option>
            </select>
          </Field>
          <Field label="Effort">
            <select value={effort} onChange={e => setEffort(e.target.value)}
              className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#94a3b8] focus:outline-none">
              <option value="">Unsized</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Story Points">
            <input
              type="number" min="1" max="100" value={storyPoints}
              onChange={e => setStoryPoints(e.target.value)}
              className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
              placeholder="e.g. 3"
            />
          </Field>
          <Field label="Due Date">
            <input
              type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] [color-scheme:dark]"
            />
          </Field>
        </div>

        {category === "bug" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity">
              <select value={severity} onChange={e => setSeverity(e.target.value)}
                className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#94a3b8] focus:outline-none">
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
                className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded-md px-3 py-2 text-sm text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
                placeholder="prod / staging / local"
              />
            </Field>
          </div>
        )}

        <Field label="Execution Mode">
          <div className="flex gap-5">
            {[["manual", "Manual — I'll do it"], ["auto", "Auto — Claude does it"]].map(([val, lbl]) => (
              <label key={val} className="flex items-center gap-2 text-[12px] text-[#94a3b8] cursor-pointer">
                <input type="radio" value={val} checked={executionMode === val}
                  onChange={() => setExecutionMode(val)} className="accent-[#0ea5e9]" />
                {lbl}
              </label>
            ))}
          </div>
        </Field>

        <button
          type="submit" disabled={saving || !title.trim()}
          className="w-full py-2.5 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
        >
          {saving ? "Adding..." : "Add to Backlog"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#4b6a8a] mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
