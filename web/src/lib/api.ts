const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

export interface Project {
  id: string;
  name: string;
  description: string;
  repo_path: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  category: string;
  roi_score: number | null;
  roi_reason: string;
  effort: string | null;
  blocked_by: string[];
  tags: string[];
  source: string;
  execution_mode: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export const api = {
  projects: {
    list: () => request<Project[]>("/projects"),
    get: (id: string) => request<Project>(`/projects/${id}`),
  },
  items: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request<Item[]>(`/items${qs}`);
    },
    get: (id: string) => request<Item>(`/items/${id}`),
    create: (data: Partial<Item>) =>
      request<Item>("/items", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Item>) =>
      request<Item>(`/items/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/items/${id}`, { method: "DELETE" }),
  },
  nextWork: (params?: { project_id?: string; limit?: number }) => {
    const qs = params ? "?" + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString() : "";
    return request<Item[]>(`/next-work${qs}`);
  },
};
