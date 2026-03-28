import { Router } from "express";
import { getDb } from "../../db.js";
import type { Project } from "../../types.js";

export const projectsRouter = Router();

projectsRouter.get("/", (_req, res) => {
  const db = getDb();
  const projects = db.prepare("SELECT * FROM projects ORDER BY name").all() as Project[];
  res.json(projects);
});

projectsRouter.get("/:id", (req, res) => {
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as Project | undefined;

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(project);
});

projectsRouter.put("/:id", (req, res) => {
  const db = getDb();
  const { name, description, repo_path } = req.body;
  const now = new Date().toISOString();
  const id = req.params.id;

  const existing = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);

  if (existing) {
    db.prepare(
      "UPDATE projects SET name = ?, description = ?, repo_path = ?, updated_at = ? WHERE id = ?"
    ).run(name, description ?? "", repo_path ?? "", now, id);
  } else {
    db.prepare(
      "INSERT INTO projects (id, name, description, repo_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, name, description ?? "", repo_path ?? "", now, now);
  }

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  res.json(project);
});
