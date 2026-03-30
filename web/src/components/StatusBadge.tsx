const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  backlog:     { bg: "#132030",  text: "#4b6a8a", label: "Backlog" },
  ready:       { bg: "#0f2a1a",  text: "#34d399", label: "Ready" },
  in_progress: { bg: "#0c2438",  text: "#38bdf8", label: "In Progress" },
  done:        { bg: "#0f1e10",  text: "#4b6a8a", label: "Done" },
  archived:    { bg: "#0d1117",  text: "#374151", label: "Archived" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.backlog;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}
