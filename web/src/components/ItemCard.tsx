import type { Item } from "../lib/api";

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  feature:  { bg: "#0c2438",  text: "#38bdf8" },
  bug:      { bg: "#2d0f0f",  text: "#f87171" },
  chore:    { bg: "#1a1a2e",  text: "#818cf8" },
  research: { bg: "#0f2a1a",  text: "#34d399" },
};

export function ItemCard({ item, onClick }: { item: Item; onClick?: () => void }) {
  const catStyle = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.feature;
  const borderStyle = item.status === "in_progress"
    ? { borderLeft: "2px solid #0ea5e9" }
    : item.status === "ready"
    ? { borderLeft: "2px solid #34d399" }
    : {};

  return (
    <div
      className="bg-[#0c1e30] border border-[#132030] rounded-md p-2.5 mb-1.5 cursor-pointer transition-colors hover:border-[#1a5276]"
      style={borderStyle}
      onClick={onClick}
    >
      <div className="text-[11px] text-[#bfdbfe] mb-1.5 leading-snug">{item.title}</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="text-[8px] px-1.5 py-0.5 rounded font-medium"
          style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
        >
          {item.category}
        </span>
        {item.roi_score != null && (
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#0f1e10] text-[#10b981] font-medium">
            ROI {item.roi_score}
          </span>
        )}
        {item.effort && (
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1e1a0a] text-[#fbbf24] font-medium capitalize">
            {item.effort}
          </span>
        )}
        {item.tags.slice(0, 2).map(tag => (
          <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-[#0a1628] text-[#4b6a8a]">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
