import type { AgentToolResult } from "@mariozechner/pi-agent-core";

const MAX_TEXT_CHARS = 50_000;

export function truncateText(text: string, limit = MAX_TEXT_CHARS): string {
  if (text.length <= limit) return text;
  const kept = text.slice(0, limit);
  const dropped = text.length - limit;
  return `${kept}\n\n[...truncated ${dropped} characters]`;
}

export function textResult(text: string): AgentToolResult<void> {
  return {
    content: [{ type: "text", text: truncateText(text) }],
    details: undefined,
  };
}
