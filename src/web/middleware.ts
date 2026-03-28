import type { Request, Response, NextFunction } from "express";
import cors from "cors";

export const corsMiddleware = cors({
  origin: true,
  credentials: true,
});

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.FOREMAN_API_KEY;

  // If no API key is configured, allow all requests (local use)
  if (!apiKey) {
    next();
    return;
  }

  const provided = req.headers["x-api-key"] || req.query["api_key"];
  if (provided !== apiKey) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  next();
}
