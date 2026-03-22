import { Type } from "@sinclair/typebox";
import { exec, spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { AgentTool, AgentToolResult, AgentToolUpdateCallback } from "@mariozechner/pi-agent-core";

const SCRIPTS_DIR = join(import.meta.dirname, "..", "scripts");
const VENV_PYTHON = join(import.meta.dirname, "..", ".venv", "bin", "python3");

// ---------------------------------------------------------------------------
// Helpers (following x-lens patterns)
// ---------------------------------------------------------------------------

const MAX_TEXT_CHARS = 50_000;

function truncateText(text: string, limit = MAX_TEXT_CHARS): string {
  if (text.length <= limit) return text;
  const kept = text.slice(0, limit);
  const dropped = text.length - limit;
  return `${kept}\n\n[...truncated ${dropped} characters]`;
}

function textResult(text: string): AgentToolResult<void> {
  return {
    content: [{ type: "text", text: truncateText(text) }],
    details: undefined,
  };
}

// ---------------------------------------------------------------------------
// Shell tool (from x-lens pattern)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fetch tool (from x-lens pattern)
// ---------------------------------------------------------------------------

export function createFetchTool(): AgentTool {
  return {
    name: "fetch",
    label: "HTTP Fetch",
    description:
      "Make an HTTP request and return the response. Supports GET, POST, PUT, PATCH, DELETE methods. " +
      "Use for reading articles, APIs, blog posts, documentation, or any web content.",
    parameters: Type.Object({
      url: Type.String({ description: "The URL to fetch" }),
      method: Type.Optional(
        Type.String({
          description: "HTTP method (default: GET)",
          default: "GET",
        })
      ),
      headers: Type.Optional(
        Type.Record(Type.String(), Type.String(), {
          description: "HTTP headers as key-value pairs",
        })
      ),
      body: Type.Optional(
        Type.String({ description: "Request body (for POST/PUT/PATCH)" })
      ),
    }),
    execute: async (_toolCallId, params: any, signal) => {
      try {
        const response = await globalThis.fetch(params.url, {
          method: params.method ?? "GET",
          headers: params.headers,
          body: params.body,
          signal,
        });

        const statusLine = `${response.status} ${response.statusText}`;
        const headerEntries = [...response.headers.entries()]
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        const responseText = await response.text();

        return textResult(
          `Status: ${statusLine}\n\nHeaders:\n${headerEntries}\n\nBody:\n${responseText}`
        );
      } catch (err: any) {
        return textResult(`Fetch error: ${err.message}`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Web Search tool (DuckDuckGo - no browser dependency needed)
// ---------------------------------------------------------------------------

export function createWebSearchTool(): AgentTool {
  return {
    name: "web_search",
    label: "Web Search",
    description:
      "Search the web for information using DuckDuckGo. Returns search results with titles, URLs, and snippets. " +
      "Use this to find news, discourse, audience patterns, case studies, and real-world context. " +
      "For deeper content, use the fetch tool on URLs from search results.",
    parameters: Type.Object({
      query: Type.String({ description: "The search query" }),
    }),
    execute: async (_toolCallId, params: any, signal) => {
      const query = params.query || "";
      try {
        // Use DuckDuckGo HTML search for real results
        const resp = await globalThis.fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
          {
            signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            },
          }
        );
        const html = await resp.text();
        const results: string[] = [];

        // Parse result entries from HTML
        const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
        const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

        const links: { url: string; title: string }[] = [];
        let match;
        while ((match = resultRegex.exec(html)) !== null) {
          const rawUrl = match[1];
          const title = match[2].replace(/<[^>]+>/g, "").trim();
          // Decode DuckDuckGo redirect URL
          let url = rawUrl;
          const uddg = rawUrl.match(/uddg=([^&]+)/);
          if (uddg) url = decodeURIComponent(uddg[1]);
          links.push({ url, title });
        }

        const snippets: string[] = [];
        while ((match = snippetRegex.exec(html)) !== null) {
          snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
        }

        for (let i = 0; i < Math.min(links.length, 8); i++) {
          const link = links[i];
          const snippet = snippets[i] || "";
          results.push(`${i + 1}. **${link.title}**\n   ${link.url}\n   ${snippet}`);
        }

        // Fallback: try Instant Answer API if HTML parsing failed
        if (results.length === 0) {
          const apiResp = await globalThis.fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
            { signal }
          );
          const data = await apiResp.json();
          if (data.AbstractText) {
            results.push(`**${data.Heading || ""}**: ${data.AbstractText}`);
          }
          if (data.AbstractURL) {
            results.push(`Source: ${data.AbstractURL}`);
          }
          for (const topic of (data.RelatedTopics || []).slice(0, 10)) {
            if (topic && typeof topic === "object" && topic.Text) {
              const url = topic.FirstURL ? ` (${topic.FirstURL})` : "";
              results.push(`- ${topic.Text}${url}`);
            }
          }
        }

        return textResult(
          results.length > 0
            ? `Search results for "${query}":\n\n${results.join("\n\n")}`
            : "No results found. Try a different query or use the fetch tool directly on a relevant URL."
        );
      } catch (e: any) {
        return textResult(`Search failed: ${e.message}`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// OASIS-specific tools
// ---------------------------------------------------------------------------

export function createRunOasisTool(defaultWorkDir: string): AgentTool {
  return {
    name: "run_oasis_simulation",
    label: "Run OASIS Simulation",
    description:
      "Run a multi-agent social media simulation using the OASIS framework. " +
      "Takes agent profiles (JSON array), a platform, number of rounds, the post text, and a work_dir. " +
      "This writes profiles to a file, runs the OASIS Python simulation, and streams real-time actions. " +
      "Each profile must have: agent_id, username, name, bio, persona, age, gender, mbti, profession, " +
      "interested_topics, sentiment_bias, influence_weight, activity_level, archetype.",
    parameters: Type.Object({
      profiles: Type.Array(Type.Any(), { description: "Array of agent profile objects" }),
      platform: Type.String({ description: "Platform: 'twitter' or 'reddit'" }),
      rounds: Type.Number({ description: "Number of simulation rounds", default: 5 }),
      post_text: Type.String({ description: "The social media post to simulate reactions to" }),
      work_dir: Type.Optional(Type.String({ description: "Working directory for this simulation's files" })),
    }),
    execute: async (_toolCallId, params: any, signal, onUpdate) => {
      const profiles = params.profiles || [];
      const platform = params.platform || "twitter";
      const rounds = params.rounds || 5;
      const postText = params.post_text || "";
      const workDir = params.work_dir || defaultWorkDir;

      const { mkdirSync } = await import("node:fs");
      mkdirSync(workDir, { recursive: true });

      // Write profiles to temp file
      const profilesPath = join(workDir, `profiles_${platform}.json`);
      await writeFile(profilesPath, JSON.stringify(profiles, null, 2));

      const dbPath = join(workDir, `${platform}.db`);

      const args = [
        join(SCRIPTS_DIR, "run_oasis.py"),
        "--profiles", profilesPath,
        "--platform", platform,
        "--rounds", String(rounds),
        "--db-path", dbPath,
        "--post-text", postText,
      ];

      return new Promise<AgentToolResult<void>>((resolve) => {
        const child = spawn(VENV_PYTHON, args, { cwd: workDir });
        const stderrChunks: string[] = [];
        const summaryLines: string[] = [];

        // Read stdout line by line — OASIS script outputs JSONL
        const rl = createInterface({ input: child.stdout });
        rl.on("line", (line) => {
          try {
            const event = JSON.parse(line);
            // Stream simulation events via onUpdate for real-time frontend display
            if (onUpdate) {
              onUpdate({
                content: [{ type: "text", text: `[${platform}] ${event.type}: ${event.message || event.action_type || ""}` }],
                details: event,
              });
            }
            // Collect summary
            if (event.type === "action") {
              summaryLines.push(
                `R${event.round} ${event.agent_name} (${event.action_type}): ${(event.content || "").slice(0, 100)}`
              );
            } else if (event.type === "progress") {
              summaryLines.push(`[progress] ${event.message}`);
            }
          } catch {
            summaryLines.push(line);
          }
        });

        child.stderr.on("data", (chunk) => {
          stderrChunks.push(chunk.toString());
        });

        const timer = setTimeout(() => child.kill(), 600000);
        signal?.addEventListener("abort", () => child.kill());

        child.on("close", (code) => {
          clearTimeout(timer);
          const parts: string[] = [];
          if (summaryLines.length) parts.push(summaryLines.join("\n"));
          if (stderrChunks.length) parts.push(`[stderr] ${stderrChunks.join("")}`);
          if (code !== 0) parts.push(`[exit code ${code}]`);
          parts.push(`\nSimulation DB: ${dbPath}`);
          parts.push(`Profiles file: ${profilesPath}`);
          resolve(textResult(parts.join("\n") || "(no output)"));
        });
      });
    },
  };
}

export function createReadResultsTool(defaultWorkDir: string): AgentTool {
  return {
    name: "read_simulation_results",
    label: "Read Simulation Results",
    description:
      "Read the results of a completed OASIS simulation from its SQLite database(s). " +
      "Returns a markdown summary of posts, comments, engagement metrics, and action breakdown. " +
      "Call this after run_oasis_simulation completes to analyze the results.",
    parameters: Type.Object({
      db_paths: Type.String({
        description:
          "Comma-separated platform=path pairs, e.g. 'twitter=./twitter.db,reddit=./reddit.db'",
      }),
      profiles_file: Type.String({
        description: "Path to the profiles JSON file used for the simulation",
      }),
      work_dir: Type.Optional(Type.String({ description: "Working directory for this simulation" })),
    }),
    execute: async (_toolCallId, params: any, signal) => {
      const cwd = params.work_dir || defaultWorkDir;
      const cmd =
        `"${VENV_PYTHON}" "${join(SCRIPTS_DIR, "read_results.py")}" ` +
        `--db-paths "${params.db_paths}" ` +
        `--profiles "${params.profiles_file}"`;

      return new Promise<AgentToolResult<void>>((resolve) => {
        const child = exec(
          cmd,
          { timeout: 60000, maxBuffer: 5 * 1024 * 1024, cwd },
          (error, stdout, stderr) => {
            const parts: string[] = [];
            if (stdout) parts.push(stdout.trim());
            if (stderr) parts.push(`[stderr] ${stderr.trim()}`);
            if (error) parts.push(`[error] ${error.message}`);
            resolve(textResult(parts.join("\n") || "(no output)"));
          }
        );
        signal?.addEventListener("abort", () => child.kill());
      });
    },
  };
}
