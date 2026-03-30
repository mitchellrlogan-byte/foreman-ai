#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initDb } from "./db.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerItemTools } from "./tools/items.js";
import { registerSmartTools } from "./tools/smart.js";
import { registerSessionTools } from "./tools/sessions.js";
import { startWebServer } from "./web/server.js";
import path from "path";
import os from "os";

function getArg(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function getDbPath(): string {
  const raw = getArg("--db");
  if (raw) {
    if (raw.startsWith("~")) {
      return path.join(os.homedir(), raw.slice(1));
    }
    return path.resolve(raw);
  }
  if (process.env.FOREMAN_DB) {
    return process.env.FOREMAN_DB;
  }
  return path.join(os.homedir(), ".foreman", "foreman.db");
}

async function main(): Promise<void> {
  const dbPath = getDbPath();
  initDb(dbPath);

  const webMode = hasFlag("--web");
  const port = parseInt(getArg("--port") || process.env.FOREMAN_PORT || "4040", 10);

  if (webMode) {
    // Web-only mode: start HTTP server, no MCP stdio
    startWebServer(port);
  } else {
    // Default: MCP server over stdio
    const server = new McpServer({
      name: "foreman-ai",
      version: "2.0.0",
    });

    registerProjectTools(server);
    registerItemTools(server);
    registerSmartTools(server);
    registerSessionTools(server);

    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((err) => {
  console.error("Foreman failed to start:", err);
  process.exit(1);
});
