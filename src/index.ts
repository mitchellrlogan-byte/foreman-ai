#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initDb } from "./db.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerItemTools } from "./tools/items.js";
import { registerSmartTools } from "./tools/smart.js";
import { registerSessionTools } from "./tools/sessions.js";
import path from "path";
import os from "os";

function getDbPath(): string {
  const args = process.argv.slice(2);
  const dbIndex = args.indexOf("--db");
  if (dbIndex !== -1 && args[dbIndex + 1]) {
    const raw = args[dbIndex + 1];
    if (raw.startsWith("~")) {
      return path.join(os.homedir(), raw.slice(1));
    }
    return path.resolve(raw);
  }
  return path.join(os.homedir(), ".foreman", "foreman.db");
}

async function main(): Promise<void> {
  const dbPath = getDbPath();
  initDb(dbPath);

  const server = new McpServer({
    name: "foreman-ai",
    version: "1.1.0",
  });

  registerProjectTools(server);
  registerItemTools(server);
  registerSmartTools(server);
  registerSessionTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Foreman failed to start:", err);
  process.exit(1);
});
