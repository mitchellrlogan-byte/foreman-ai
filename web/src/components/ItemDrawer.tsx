import { useState, useEffect, type ChangeEvent, type ReactNode } from "react";
import { api, type Item } from "../lib/api";
import { StatusBadge } from "./StatusBadge";

type Attachment = { name: string; url: string };

interface ItemDrawerProps {
  item: Item | null;
  onClose: () => void;
  onUpdated: (item: Item) => void;
  onDeleted: (id: string) => void;
}

const STATUSES = ["backlog", "ready", "in_progress", "done", "archived"] as const;
const CATEGORIES = ["feature", "bug", "research", "chore"] as const;
const EFFORTS = ["", "small", "medium", "large"] as const;

export function ItemDrawer({ item, onClose, onUpdated, onDeleted }: ItemDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<Partial<Item>>({});
  const [newAttachName, setNewAttachName] = useState("");
  const [newAttachUrl, setNewAttachUrl] = useState("");

  useEffect(() => {
    if (item) {
      setForm({ ...item });
      setEditing(false);
      setConfirmDelete(false);
      setNewAttachName("");
      setNewAttachUrl("");
    }
  }, [item]);

  if (!item) return null;

  function field<K extends keyof Item>(key: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
    };
  }

  function addAttachment() {
    if (!newAttachName.trim() || !newAttachUrl.trim()) return;
    const existing: Attachment[] = (form.attachments as Attachment[]) ?? [];
    setForm(prev => ({
      ...prev,
      attachments: [...existing, { name: newAttachName.trim(), url: newAttachUrl.trim() }],
    }));
    setNewAttachName("");
    setNewAttachUrl("");
  }

  function removeAttachment(index: number) {
    const existing: Attachment[] = (form.attachments as Attachment[]) ?? [];
    setForm(prev => ({ ...prev, attachments: existing.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    try {
      const updated = await api.items.update(item.id, {
        title: form.title,
        description: form.description,
        user_story: form.user_story,
        acceptance_criteria: form.acceptance_criteria,
        notes: form.notes,
        attachments: form.attachments,
        status: form.status,
        category: form.category,
        priority: typeof form.priority === "string" ? parseInt(form.priority) : form.priority,
        roi_score: form.roi_score != null
          ? (typeof form.roi_score === "string" ? parseInt(form.roi_score) || null : form.roi_score)
          : null,
        story_points: form.story_points != null
          ? (typeof form.story_points === "string" ? parseInt(form.story_points) || null : form.story_points)
          : null,
        effort: form.effort as Item["effort"],
        due_date: form.due_date ?? null,
        severity: form.severity as Item["severity"],
        environment: form.environment,
        execution_mode: form.execution_mode,
      });
      onUpdated(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    await api.items.delete(item.id);
    onDeleted(item.id);
    onClose();
  }

  const attachments: Attachment[] = ((editing ? form.attachments : item.attachments) as Attachment[]) ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[400px] bg-[#0d1b2a] border-l border-[#132030] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#132030]">
          <StatusBadge status={editing ? (form.status ?? item.status) : item.status} />
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-[11px] px-3 py-1.5 rounded bg-[#0c2d4a] text-[#38bdf8] hover:bg-[#0c3a5c] transition-colors"
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[#4b6a8a] hover:text-[#94a3b8] text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            {editing ? (
              <input
                value={form.title ?? ""}
                onChange={field("title")}
                className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-3 py-2 text-sm text-[#e0f2fe] focus:outline-none focus:border-[#0ea5e9]"
              />
            ) : (
              <h2 className="text-[14px] font-semibold text-[#e0f2fe] leading-snug">{item.title}</h2>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[#1e4060] mb-1">Description</label>
            {editing ? (
              <textarea
                value={form.description ?? ""}
                onChange={field("description")}
                rows={4}
                className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-3 py-2 text-[12px] text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none"
              />
            ) : (
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                {item.description || <span className="text-[#1e4060] italic">No description</span>}
              </p>
            )}
          </div>

          {/* User Story */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[#1e4060] mb-1">User Story</label>
            {editing ? (
              <textarea
                value={form.user_story ?? ""}
                onChange={field("user_story")}
                rows={2}
                placeholder="As a [user], I want [feature], so that [benefit]..."
                className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-3 py-2 text-[12px] text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
              />
            ) : item.user_story ? (
              <p className="text-[12px] text-[#94a3b8] leading-relaxed whitespace-pre-wrap">{item.user_story}</p>
            ) : (
              <p className="text-[12px] text-[#1e4060] italic">Not specified</p>
            )}
          </div>

          {/* Acceptance Criteria */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[#1e4060] mb-1">Acceptance Criteria</label>
            {editing ? (
              <textarea
                value={form.acceptance_criteria ?? ""}
                onChange={field("acceptance_criteria")}
                rows={3}
                placeholder="What does done look like?"
                className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-3 py-2 text-[12px] text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
              />
            ) : item.acceptance_criteria ? (
              <p className="text-[12px] text-[#94a3b8] leading-relaxed whitespace-pre-wrap">{item.acceptance_criteria}</p>
            ) : (
              <p className="text-[12px] text-[#1e4060] italic">Not specified</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[#1e4060] mb-1">Notes</label>
            {editing ? (
              <textarea
                value={form.notes ?? ""}
                onChange={field("notes")}
                rows={3}
                placeholder="Freeform notes, links, decisions..."
                className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-3 py-2 text-[12px] text-[#94a3b8] focus:outline-none focus:border-[#0ea5e9] resize-none placeholder:text-[#1e4060]"
              />
            ) : item.notes ? (
              <p className="text-[12px] text-[#94a3b8] leading-relaxed whitespace-pre-wrap">{item.notes}</p>
            ) : (
              <p className="text-[12px] text-[#1e4060] italic">No notes</p>
            )}
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-[#1e4060] mb-1">Attachments</label>
            {attachments.length > 0 ? (
              <ul className="space-y-1 mb-2">
                {attachments.map((att, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#38bdf8] hover:underline truncate flex-1"
                    >
                      {att.name}
                    </a>
                    {editing && (
                      <button
                        onClick={() => removeAttachment(i)}
                        className="text-[#4b6a8a] hover:text-[#f87171] text-sm leading-none flex-shrink-0"
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              !editing && <p className="text-[12px] text-[#1e4060] italic mb-2">No attachments</p>
            )}
            {editing && (
              <div className="space-y-1.5">
                <input
                  value={newAttachName}
                  onChange={e => setNewAttachName(e.target.value)}
                  placeholder="Link name"
                  className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#e0f2fe] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
                />
                <div className="flex gap-1.5">
                  <input
                    value={newAttachUrl}
                    onChange={e => setNewAttachUrl(e.target.value)}
                    placeholder="URL or path"
                    className="flex-1 bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#e0f2fe] focus:outline-none focus:border-[#0ea5e9] placeholder:text-[#1e4060]"
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addAttachment(); } }}
                  />
                  <button
                    type="button"
                    onClick={addAttachment}
                    disabled={!newAttachName.trim() || !newAttachUrl.trim()}
                    className="px-2.5 py-1.5 bg-[#0c2d4a] text-[#38bdf8] text-[10px] rounded hover:bg-[#0c3a5c] disabled:opacity-40 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status + Category row */}
          <div className="grid grid-cols-2 gap-3">
            <DrawerField label="Status">
              {editing ? (
                <select value={form.status ?? item.status} onChange={field("status")}
                  className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#94a3b8] focus:outline-none">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              ) : (
                <span className="text-[12px] text-[#94a3b8] capitalize">{item.status.replace("_", " ")}</span>
              )}
            </DrawerField>

            <DrawerField label="Category">
              {editing ? (
                <select value={form.category ?? item.category} onChange={field("category")}
                  className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#94a3b8] focus:outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <span className="text-[12px] text-[#94a3b8] capitalize">{item.category}</span>
              )}
            </DrawerField>
          </div>

          {/* Priority + ROI + Effort row */}
          <div className="grid grid-cols-3 gap-3">
            <DrawerField label="Priority">
              {editing ? (
                <input type="number" value={form.priority ?? item.priority} onChange={field("priority")}
                  className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#94a3b8] focus:outline-none" />
              ) : (
                <span className="text-[12px] font-bold text-[#0ea5e9]">#{item.priority}</span>
              )}
            </DrawerField>

            <DrawerField label="ROI Score">
              {editing ? (
                <input type="number" min="1" max="10" value={form.roi_score ?? ""} onChange={field("roi_score")}
                  placeholder="1–10"
                  className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#94a3b8] focus:outline-none" />
              ) : (
                <span className="text-[12px] font-semibold text-[#10b981]">
                  {item.roi_score ?? <span className="text-[#1e4060]">—</span>}
                </span>
              )}
            </DrawerField>

            <DrawerField label="Effort">
              {editing ? (
                <select value={form.effort ?? ""} onChange={field("effort")}
                  className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#94a3b8] focus:outline-none">
                  {EFFORTS.map(e => <option key={e} value={e}>{e || "—"}</option>)}
                </select>
              ) : (
                <span className="text-[12px] text-[#94a3b8] capitalize">{item.effort ?? "—"}</span>
              )}
            </DrawerField>
          </div>

          {/* Story Points + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <DrawerField label="Story Points">
              {editing ? (
                <input type="number" min="1" max="100" value={form.story_points ?? ""} onChange={field("story_points")}
                  placeholder="e.g. 3"
                  className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#94a3b8] focus:outline-none" />
              ) : (
                <span className="text-[12px] font-semibold text-[#a78bfa]">
                  {item.story_points ?? <span className="text-[#1e4060]">—</span>}
                </span>
              )}
            </DrawerField>

            <DrawerField label="Due Date">
              {editing ? (
                <input type="date" value={form.due_date ?? ""} onChange={field("due_date")}
                  className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#94a3b8] focus:outline-none [color-scheme:dark]" />
              ) : item.due_date ? (
                <span className="text-[12px] text-[#f59e0b]">
                  {new Date(item.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              ) : (
                <span className="text-[12px] text-[#1e4060]">—</span>
              )}
            </DrawerField>
          </div>

          {/* Severity + Environment (bugs only) */}
          {((editing ? form.category : item.category) === "bug") && (
            <div className="grid grid-cols-2 gap-3">
              <DrawerField label="Severity">
                {editing ? (
                  <select value={form.severity ?? ""} onChange={field("severity")}
                    className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#94a3b8] focus:outline-none">
                    <option value="">Unknown</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                ) : (
                  <span className={`text-[12px] font-semibold capitalize ${
                    item.severity === "critical" ? "text-[#f87171]" :
                    item.severity === "high" ? "text-[#fb923c]" :
                    item.severity === "medium" ? "text-[#fbbf24]" :
                    item.severity === "low" ? "text-[#34d399]" : "text-[#1e4060]"
                  }`}>
                    {item.severity ?? "—"}
                  </span>
                )}
              </DrawerField>

              <DrawerField label="Environment">
                {editing ? (
                  <input type="text" value={form.environment ?? ""} onChange={field("environment")}
                    placeholder="prod / staging / local"
                    className="w-full bg-[#0c1e30] border border-[#1a3a5c] rounded px-2 py-1.5 text-[11px] text-[#94a3b8] focus:outline-none placeholder:text-[#1e4060]" />
                ) : (
                  <span className="text-[12px] text-[#94a3b8]">{item.environment || <span className="text-[#1e4060]">—</span>}</span>
                )}
              </DrawerField>
            </div>
          )}

          {/* Execution mode */}
          <DrawerField label="Execution Mode">
            {editing ? (
              <div className="flex gap-4">
                {["manual", "auto"].map(m => (
                  <label key={m} className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] cursor-pointer">
                    <input type="radio" value={m} checked={(form.execution_mode ?? item.execution_mode) === m}
                      onChange={field("execution_mode")} className="accent-[#0ea5e9]" />
                    {m}
                  </label>
                ))}
              </div>
            ) : (
              <span className="text-[12px] text-[#94a3b8]">{item.execution_mode}</span>
            )}
          </DrawerField>

          {/* Tags */}
          {item.tags.length > 0 && (
            <DrawerField label="Tags">
              <div className="flex gap-1.5 flex-wrap">
                {item.tags.map(tag => (
                  <span key={tag} className="text-[9px] px-2 py-0.5 rounded bg-[#0a1628] text-[#4b6a8a]">{tag}</span>
                ))}
              </div>
            </DrawerField>
          )}

          {/* Metadata */}
          <div className="pt-2 border-t border-[#132030] space-y-1">
            <MetaRow label="ID" value={item.id.slice(0, 8) + "..."} />
            <MetaRow label="Created" value={new Date(item.created_at).toLocaleDateString()} />
            <MetaRow label="Updated" value={new Date(item.updated_at).toLocaleDateString()} />
            {item.completed_at && <MetaRow label="Completed" value={new Date(item.completed_at).toLocaleDateString()} />}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-[#132030] flex items-center gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-[12px] font-semibold rounded transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => { setEditing(false); setForm({ ...item }); }}
                className="px-4 py-2 bg-[#0c1e30] text-[#4b6a8a] text-[12px] rounded hover:text-[#94a3b8] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : confirmDelete ? (
            <>
              <span className="text-[11px] text-[#f87171]">Delete this item?</span>
              <button onClick={handleDelete}
                className="px-4 py-2 bg-[#2d0f0f] text-[#f87171] text-[11px] rounded hover:bg-[#3d1515] transition-colors">
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-[#4b6a8a] text-[11px] rounded hover:text-[#94a3b8]">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="text-[11px] text-[#4b6a8a] hover:text-[#f87171] transition-colors ml-auto">
              Delete item
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] font-bold uppercase tracking-widest text-[#1e4060] mb-1">{label}</label>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[10px] text-[#1e4060]">{label}</span>
      <span className="text-[10px] text-[#4b6a8a] font-mono">{value}</span>
    </div>
  );
}
