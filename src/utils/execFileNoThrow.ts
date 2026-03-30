import { execFile } from "child_process";
import path from "path";

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Runs an executable with args. Never throws — always resolves with exit info.
 * Uses execFile (not exec/spawn with shell:true) to prevent command injection.
 * timeoutMs defaults to 30 minutes.
 * On Windows, appends .cmd to the file name so npm global scripts resolve correctly.
 */
export function execFileNoThrow(
  file: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {}
): Promise<ExecResult> {
  // On Windows, npm global binaries are .cmd wrappers (unless caller passes full path or .exe)
  const resolvedFile =
    process.platform === "win32" && !path.isAbsolute(file) && !file.includes(".")
      ? `${file}.cmd`
      : file;

  return new Promise((resolve) => {
    const { cwd, timeoutMs = 30 * 60 * 1000 } = options;
    let timedOut = false;

    const child = execFile(
      resolvedFile,
      args,
      { cwd, env: process.env, maxBuffer: 10 * 1024 * 1024, shell: process.platform === "win32" },
      (error, stdout, stderr) => {
        const stderrOut = error?.code === "ENOENT"
          ? `Command not found: ${resolvedFile}. Install the claude CLI via npm install -g @anthropic/claude-code`
          : stderr;
        resolve({
          exitCode: error ? 1 : 0,
          stdout,
          stderr: stderrOut,
          timedOut,
        });
      }
    );

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.on("close", () => clearTimeout(timer));
  });
}
