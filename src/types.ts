export type Status = "backlog" | "ready" | "in_progress" | "done" | "archived";
export type Category = "feature" | "bug" | "research" | "chore";
export type Effort = "small" | "medium" | "large";
export type Source = "user" | "claude" | "auto";
export type ExecutionMode = "manual" | "auto";

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
  status: Status;
  priority: number;
  category: Category;
  roi_score: number | null;
  roi_reason: string;
  effort: Effort | null;
  blocked_by: string[];
  tags: string[];
  source: Source;
  execution_mode: ExecutionMode;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Session {
  id: string;
  project_id: string;
  started_at: string;
  ended_at: string | null;
  summary: string;
  items_touched: string[];
}
