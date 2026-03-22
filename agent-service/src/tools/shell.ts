import { Type } from "@sinclair/typebox";
import { exec } from "node:child_process";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import { textResult } from "./helpers.js";

export function createShellTool(cwd?: string): AgentTool {
  return {
    name: "shell",
    label: "Shell Command",
    description:
      "Execute a shell command and return stdout and stderr. " +
      "Use for file operations, running Python scripts, inspecting simulation output, and other CLI tasks.",
    parameters: Type.Object({
      command: Type.String({ description: "The shell command to execute" }),
      timeout: Type.Optional(
        Type.Number({
          description: "Timeout in milliseconds (default: 300000)",
          default: 300000,
        })
      ),
    }),
    execute: async (_toolCallId, params: any, signal) => {
      return new Promise<AgentToolResult<void>>((resolve) => {
        const timeout = params.timeout ?? 300000;
        const child = exec(
          params.command,
          { timeout, maxBuffer: 10 * 1024 * 1024, cwd },
          (error, stdout, stderr) => {
            const parts: string[] = [];
            if (stdout) parts.push(`stdout:\n${stdout}`);
            if (stderr) parts.push(`stderr:\n${stderr}`);
            if (error && !stdout && !stderr) {
              parts.push(`error: ${error.message}`);
            }
            resolve(textResult(parts.join("\n\n") || "(no output)"));
          }
        );
        signal?.addEventListener("abort", () => child.kill());
      });
    },
  };
}
