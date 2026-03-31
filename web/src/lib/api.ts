const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = localStorage.getItem("foreman_api_key");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem("foreman_api_key");
    window.dispatchEvent(new Event("foreman:unauthorized"));
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

export const auth = {
  getKey: () => localStorage.getItem("foreman_api_key"),
  setKey: (key: string) => localStorage.setItem("foreman_api_key", key),
  clearKey: () => localStorage.removeItem("foreman_api_key"),
  isProtected: async () => {
    // Check if the API requires a key by hitting health endpoint without one
    // Health endpoint is unauthenticated, so we check items instead
    try {
      await request<unknown>("/projects");
      return false; // No auth required
    } catch (e) {
      return e instanceof Error && e.message === "UNAUTHORIZED";
    }
  },
};

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
  execution_status: string | null;
  last_executed_at: string | null;
  execution_output: string | null;
  acceptance_criteria?: string;
  notes?: string;
  attachments?: Array<{ name: string; url: string }>;
  due_date?: string | null;
  story_points?: number | null;
  user_story?: string | null;
  severity?: "critical" | "high" | "medium" | "low" | null;
  environment?: string | null;
}

export interface ScanResult {
  name: string;
  path: string;
  already_registered: boolean;
}

export interface Session {
  id: string;
  project_id: string;
  started_at: string;
  ended_at: string | null;
  summary: string;
  items_touched: string[];
}

export interface SessionAnalytics {
  totalSessions: number;
  completedSessions: number;
  totalDurationMs: number;
  avgDurationMs: number;
  mostActiveProject: string | null;
  perProject: Record<string, { count: number; totalMs: number; lastActive: string }>;
  sessions: Session[];
}

export const api = {
  projects: {
    list: () => request<Project[]>("/projects"),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (data: { id: string; name: string; repo_path: string; description?: string }) =>
      request<Project>(`/projects/${data.id}`, { method: "PUT", body: JSON.stringify(data) }),
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
  scanProjects: (path: string) =>
    request<ScanResult[]>(`/scan-projects?path=${encodeURIComponent(path)}`),
  settings: {
    get: () => request<{ mode_a_enabled: boolean; mode_b_enabled: boolean; mode_b_interval_minutes: number }>("/settings"),
    update: (data: Partial<{ mode_a_enabled: boolean; mode_b_enabled: boolean; mode_b_interval_minutes: number }>) =>
      request<{ mode_a_enabled: boolean; mode_b_enabled: boolean; mode_b_interval_minutes: number }>("/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
  execute: () => request<{ started: boolean; reason?: string; item_id?: string; execution_status?: string }>("/execute", { method: "POST" }),
  sessions: {
    list: (params?: { project_id?: string; limit?: number; all?: boolean }) => {
      const qs = params
        ? "?" + new URLSearchParams(
            Object.fromEntries(
              Object.entries(params)
                .filter(([, v]) => v != null)
                .map(([k, v]) => [k, String(v)])
            )
          ).toString()
        : "";
      return request<Session[]>(`/sessions${qs}`);
    },
    analytics: () => request<SessionAnalytics>("/sessions/analytics"),
  },
};
