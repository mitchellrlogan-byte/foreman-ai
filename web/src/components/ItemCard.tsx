import { StatusBadge } from "./StatusBadge";
import type { Item } from "../lib/api";

export function ItemCard({ item, onClick }: { item: Item; onClick?: () => void }) {
  return (
    <div
      className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-gray-900 text-sm">{item.title}</h3>
        <StatusBadge status={item.status} />
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span>P{item.priority}</span>
        {item.roi_score && <span>ROI {item.roi_score}/10</span>}
        <span className="capitalize">{item.category}</span>
        {item.effort && <span className="capitalize">{item.effort}</span>}
        {item.execution_mode === "auto" && (
          <span className="text-purple-600 font-medium">auto</span>
        )}
      </div>

      {item.description && (
        <p className="mt-2 text-xs text-gray-600 line-clamp-2">{item.description}</p>
      )}

      {item.tags.length > 0 && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {item.tags.map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
