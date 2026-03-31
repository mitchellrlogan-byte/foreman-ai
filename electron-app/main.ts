import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  shell,
  ipcMain,
  nativeImage,
} from "electron";
import * as path from "path";
import * as http from "http";
import { ChildProcess, spawn } from "child_process";

const PORT = 4040;
const DASHBOARD_URL = `http://localhost:${PORT}`;

let tray: Tray | null = null;
let serverProcess: ChildProcess | null = null;
let serverReady = false;
let mainWindow: BrowserWindow | null = null;

// --- Server lifecycle ---

function getServerScript(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app", "dist", "index.js");
  }
  return path.join(__dirname, "..", "dist", "index.js");
}

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = getServerScript();
    const dbPath = path.join(app.getPath("userData"), "foreman.db");

    serverProcess = spawn(process.execPath, [script, "--web", "--port", String(PORT), "--db", dbPath], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production" },
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString();
      console.log("[server]", msg.trim());
      if (msg.includes("listening") || msg.includes("started") || msg.includes(String(PORT))) {
        serverReady = true;
        resolve();
      }
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      console.error("[server:err]", data.toString().trim());
    });

    serverProcess.on("error", (err) => {
      console.error("Failed to start server:", err);
      reject(err);
    });

    serverProcess.on("exit", (code) => {
      console.log("Server exited with code:", code);
      serverReady = false;
    });

    // Fallback: poll for server readiness
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      http.get(DASHBOARD_URL + "/api/projects", (res) => {
        if (res.statusCode !== undefined) {
          clearInterval(poll);
          serverReady = true;
          resolve();
        }
      }).on("error", () => {
        if (attempts >= 30) {
          clearInterval(poll);
          reject(new Error("Server did not start in time"));
        }
      });
    }, 500);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}

// --- Tray ---

function getTrayIcon(): Electron.NativeImage {
  const iconName = process.platform === "win32" ? "icon.ico" : "icon.png";
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", iconName)
    : path.join(__dirname, "..", "electron-app", "assets", iconName);

  try {
    return nativeImage.createFromPath(iconPath);
  } catch {
    // Return empty image as fallback
    return nativeImage.createEmpty();
  }
}

function createTray() {
  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip("Foreman AI");

  updateTrayMenu();

  tray.on("click", () => {
    openDashboard();
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
    {
      label: "Open Dashboard",
      click: () => openDashboard(),
    },
    { type: "separator" },
    {
      label: serverReady ? "Server: Running" : "Server: Starting...",
      enabled: false,
    },
    {
      label: `Port: ${PORT}`,
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Quit Foreman",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
}

function openDashboard() {
  if (!serverReady) {
    // Show a loading window if server isn't ready yet
    if (!mainWindow) {
      mainWindow = new BrowserWindow({
        width: 400,
        height: 300,
        resizable: false,
        center: true,
        title: "Foreman AI",
        webPreferences: { nodeIntegration: false },
      });
      mainWindow.loadURL("data:text/html,<html><body style='font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0d1f2d;color:#a8c5da'><div><h2>Starting Foreman...</h2><p>The dashboard will open shortly.</p></div></body></html>");
      mainWindow.on("closed", () => { mainWindow = null; });
    }
    return;
  }

  shell.openExternal(DASHBOARD_URL);

  // Close loading window if open
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
}

// --- App lifecycle ---

app.on("ready", async () => {
  // Hide dock icon on macOS (tray-only app)
  if (process.platform === "darwin") {
    app.dock?.hide();
  }

  createTray();

  try {
    await startServer();
    serverReady = true;
    updateTrayMenu();
    console.log("Foreman server ready at", DASHBOARD_URL);
  } catch (err) {
    console.error("Failed to start Foreman server:", err);
    updateTrayMenu();
  }
});

app.on("window-all-closed", () => {
  // Don't quit when all windows are closed — tray app keeps running
  if (process.platform !== "darwin") {
    // On Windows/Linux, keep running in tray
  }
});

app.on("before-quit", () => {
  stopServer();
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    openDashboard();
  });
}

// Handle IPC (future use)
ipcMain.handle("get-server-url", () => DASHBOARD_URL);
ipcMain.handle("get-server-status", () => ({ ready: serverReady, port: PORT }));
