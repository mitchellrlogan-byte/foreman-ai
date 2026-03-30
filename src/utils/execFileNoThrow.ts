import { execFile } from "child_process";

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
 */
export function execFileNoThrow(
  file: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {}
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const { cwd, timeoutMs = 30 * 60 * 1000 } = options;
    let timedOut = false;

    const child = execFile(
      file,
      args,
      { cwd, env: process.env, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({
          exitCode: error ? (error.code as number ?? 1) : 0,
          stdout,
          stderr,
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
