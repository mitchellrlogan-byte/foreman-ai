// src/web/routes/execute.ts
import { Router } from "express";
import { getDb } from "../../db.js";
import { run } from "../../executor/runner.js";

export const executeRouter = Router();

executeRouter.post("/", async (_req, res) => {
  const db = getDb();
  try {
    const result = await run(db);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});
