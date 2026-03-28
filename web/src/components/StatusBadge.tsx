const statusColors: Record<string, string> = {
  backlog: "bg-gray-100 text-gray-700",
  ready: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  done: "bg-green-100 text-green-700",
  archived: "bg-gray-50 text-gray-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] ?? "bg-gray-100"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
