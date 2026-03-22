import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import { textResult } from "./helpers.js";

const FETCH_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Readability extraction (lazy-loaded)
// ---------------------------------------------------------------------------

let readabilityDeps: Promise<{
  Readability: typeof import("@mozilla/readability").Readability;
  parseHTML: typeof import("linkedom").parseHTML;
}> | null = null;

function loadReadability() {
  if (!readabilityDeps) {
    readabilityDeps = Promise.all([
      import("@mozilla/readability"),
      import("linkedom"),
    ]).then(([r, l]) => ({ Readability: r.Readability, parseHTML: l.parseHTML }));
  }
  return readabilityDeps;
}

// ---------------------------------------------------------------------------
// HTML → Markdown conversion
// ---------------------------------------------------------------------------

export function htmlToMarkdown(html: string): { text: string; title?: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? titleMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim()
    : undefined;

  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // Links
  text = text.replace(
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, body) => {
      const label = body.replace(/<[^>]+>/g, "").trim();
      return label ? `[${label}](${href})` : href;
    }
  );

  // Headings
  text = text.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, level: string, body: string) => {
      const prefix = "#".repeat(Math.min(6, parseInt(level, 10)));
      return `\n${prefix} ${body.replace(/<[^>]+>/g, "").trim()}\n`;
    }
  );

  // List items
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, body: string) => {
    const label = body.replace(/<[^>]+>/g, "").trim();
    return label ? `\n- ${label}` : "";
  });

  // Block elements
  text = text
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(
      /<\/(p|div|section|article|header|footer|table|tr|ul|ol)>/gi,
      "\n"
    );

  // Strip remaining tags + entities
  text = text.replace(/<[^>]+>/g, "");
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
  text = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return { text, title };
}

// ---------------------------------------------------------------------------
// Readability extraction
// ---------------------------------------------------------------------------

async function extractReadable(
  html: string,
  url: string
): Promise<{ text: string; title?: string }> {
  if (html.length > 1_000_000) return htmlToMarkdown(html);
  try {
    const { Readability, parseHTML } = await loadReadability();
    const { document } = parseHTML(html);
    const reader = new Readability(document as any, { charThreshold: 0 });
    const parsed = reader.parse();
    if (!parsed?.content) return htmlToMarkdown(html);
    const rendered = htmlToMarkdown(parsed.content);
    return { text: rendered.text, title: parsed.title || rendered.title };
  } catch {
    return htmlToMarkdown(html);
  }
}

// ---------------------------------------------------------------------------
// Tool
// ---------------------------------------------------------------------------

export function createFetchTool(): AgentTool {
  return {
    name: "fetch",
    label: "Web Fetch",
    description:
      "Fetch a URL and extract readable content. For HTML pages, extracts clean markdown using Readability. " +
      "For JSON, returns prettified JSON. Use for reading articles, blog posts, documentation, or any web content. " +
      "Returns extracted text, title, and metadata.",
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
          headers: {
            "User-Agent": FETCH_USER_AGENT,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.1",
            "Accept-Language": "en-US,en;q=0.9",
            ...params.headers,
          },
          body: params.body,
          signal,
        });

        if (!response.ok) {
          return textResult(
            `Fetch failed (${response.status} ${response.statusText})`
          );
        }

        const contentType = response.headers.get("content-type") || "";
        const rawText = await response.text();

        // JSON — prettify
        if (contentType.includes("application/json")) {
          try {
            const pretty = JSON.stringify(JSON.parse(rawText), null, 2);
            return textResult(
              `URL: ${params.url}\nContent-Type: ${contentType}\n\n${pretty}`
            );
          } catch {
            return textResult(
              `URL: ${params.url}\nContent-Type: ${contentType}\n\n${rawText}`
            );
          }
        }

        // HTML — extract with Readability
        const head = rawText.trimStart().slice(0, 256).toLowerCase();
        if (
          contentType.includes("text/html") ||
          head.startsWith("<!doctype") ||
          head.startsWith("<html")
        ) {
          const readable = await extractReadable(rawText, params.url);
          const titleLine = readable.title
            ? `Title: ${readable.title}\n`
            : "";
          return textResult(
            `URL: ${params.url}\n${titleLine}\n${readable.text}`
          );
        }

        // Everything else — raw
        return textResult(
          `URL: ${params.url}\nContent-Type: ${contentType}\n\n${rawText}`
        );
      } catch (err: any) {
        return textResult(`Fetch error: ${err.message}`);
      }
    },
  };
}
