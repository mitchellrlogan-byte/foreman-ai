import { Router } from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { getDb } from "../../db.js";

export const scanRouter = Router();

scanRouter.get("/", (req, res) => {
  const rawPath = (req.query.path as string) || os.homedir();
  const scanPath = rawPath.replace(/^~/, os.homedir());

  if (!fs.existsSync(scanPath)) {
    res.status(400).json({ error: `Path does not exist: ${scanPath}` });
    return;
  }

  const db = getDb();
  const registeredPaths = new Set(
    (db.prepare("SELECT repo_path FROM projects").all() as { repo_path: string }[])
      .map(r => r.repo_path)
  );

  const results: { name: string; path: string; already_registered: boolean }[] = [];

  function isProject(dir: string): boolean {
    return fs.existsSync(path.join(dir, ".git")) ||
           fs.existsSync(path.join(dir, "package.json"));
  }

  function scan(dir: string, depth: number): void {
    if (depth > 3) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (isProject(fullPath)) {
        results.push({
          name: entry.name,
          path: fullPath,
          already_registered: registeredPaths.has(fullPath),
        });
      } else {
        scan(fullPath, depth + 1);
      }
    }
  }

  scan(scanPath, 1);
  res.json(results);
});
