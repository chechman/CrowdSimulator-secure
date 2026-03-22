import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { Agent, type AgentEvent } from "@mariozechner/pi-agent-core";
import { getModel, type Message, type Model } from "@mariozechner/pi-ai";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  createWebSearchTool,
  createFetchTool,
  createShellTool,
  createRunOasisTool,
  createReadResultsTool,
} from "./tools/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Scenario {
  id: string;
  post_text: string;
  audience_desc: string;
  platforms: string[];
  agent_count: number;
  rounds: number;
  model?: string;
  status: string;
}

interface SimulationResults {
  scenario_id: string;
  sentiment_score: number;
  risk_score: number;
  virality: string;
  verdict: string;
  factions: Array<{ name: string; proportion: number; color: string }>;
  themes: Array<{ label: string; percentage: number }>;
  strategy: string[];
  suggested_rewrite: string;
  agents: Array<Record<string, any>>;
  actions: Array<Record<string, any>>;
}

// Mutable state shared between the persistent agent subscription and the
// active WebSocket connection. Only one simulation runs at a time.
interface ActiveSession {
  ws: WebSocket | null;
  phase: string;
  pipelinePhase: number; // 0=idle, 1=research+profiles, 2=simulate+analyze
  finalContent: string;
  toolStarts: Map<string, { name: string; startTime: number }>;
  confirmResolve: ((confirmed: boolean) => void) | null;
  profilesSent: boolean;
  collectedAgents: Array<Record<string, any>>;
  collectedActions: Array<Record<string, any>>;
  collectedSources: Array<{ query: string; url?: string; tool: string }>;
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

const scenarios = new Map<string, Scenario>();
const results = new Map<string, SimulationResults>();
const DATA_DIR = join(process.cwd(), "data");

// ---------------------------------------------------------------------------
// Persistent agent — survives across simulation runs, builds memory
// ---------------------------------------------------------------------------

let persistentAgent: Agent | null = null;
let agentBusy = false;

const active: ActiveSession = { ws: null, phase: "idle", pipelinePhase: 0, finalContent: "", toolStarts: new Map(), confirmResolve: null, profilesSent: false, collectedAgents: [], collectedActions: [], collectedSources: [] };

const SYSTEM_PROMPT = `You are CrowdSimulator, an AI agent that predicts how audiences will react to social media posts before they are published.

You have MEMORY — your conversation history persists across simulation runs. You can reference research, audiences, and results from previous simulations. When a user runs a new simulation:
- Check if your prior research is relevant — skip redundant web searches if you already have recent context
- Compare new results against previous ones to spot trends
- Reuse audience profiles or adapt them if the audience description is similar

## Your Tools
- **web_search**: Search the web via Google. IMPORTANT: Keep queries simple and broad (3-6 words). NEVER use long quoted phrases — they return nothing. Good: "CEO scandal resignation 2024". Bad: "backlash history executives adultery scandal 'resign' 'apology tour'"
- **fetch**: Fetch web pages for deeper content analysis
- **shell**: Run shell commands for file operations and other tasks
- **run_oasis_simulation**: Run a multi-agent OASIS simulation on Twitter or Reddit
- **read_simulation_results**: Read and analyze results from a completed simulation

## Your Pipeline

When given a post and audience description, execute this pipeline:

### Phase 1: Deep Research (CRITICAL — be thorough)
You MUST conduct extensive research. This is the foundation of the entire simulation.
Perform AT LEAST 15-20 different web_search queries covering ALL of these angles:

1. **Topic sentiment & discourse** (3-4 searches): Current public opinion, recent debates, trending takes
2. **News & events** (3-4 searches): Breaking news, recent developments, upcoming events related to the topic
3. **Audience demographics** (2-3 searches): Who talks about this topic, their platforms, age groups, communities
4. **Controversy & risks** (2-3 searches): Past backlash, cancelled brands/people, sensitive angles
5. **Competitor/similar posts** (2-3 searches): How similar content performed, viral examples, failed examples
6. **Cultural context** (2-3 searches): Memes, slang, in-group language, community norms
7. **Platform-specific patterns** (1-2 searches): How this topic plays on Twitter vs Reddit specifically

For important sources, use fetch to get the full content. Aim to reference 20+ distinct sources.

After completing research, output a structured research summary:
\`\`\`research_summary
## Key Findings
- [Finding 1]: [Source URL]
- [Finding 2]: [Source URL]
...

## Audience Landscape
[Description of key audience segments and their likely stances]

## Risk Factors
[Specific risks identified from research]

## Opportunities
[Positive angles identified from research]
\`\`\`

### Phase 2: Generate Research-Grounded Agents
Based on your research, generate diverse agent profiles. CRITICAL: Each agent must be GROUNDED in your research findings. The persona must reference specific real-world context you discovered.

Each profile must be a JSON object with these exact fields:
- agent_id (int, starting at 0)
- username (lowercase handle)
- name (full name)
- bio (200 char social media bio)
- persona (2000+ char detailed backstory: personality, beliefs, online behavior, posting style, reaction patterns. MUST reference specific findings from your research — real events, real discourse, real community dynamics)
- age (int)
- gender ("male"|"female"|"nonbinary")
- mbti (e.g., "ENTJ")
- profession (job title)
- interested_topics (string array)
- sentiment_bias (-1.0 extreme critic to 1.0 extreme supporter)
- influence_weight (0.5 nobody to 5.0 major influencer)
- activity_level (0.1 lurker to 1.0 power poster)
- archetype ("supporter"|"skeptic"|"neutral"|"journalist"|"troll"|"influencer"|"expert"|"casual_observer")
- research_basis (string — 2-3 sentences explaining WHICH specific research findings shaped this agent's perspective and why they would react the way they do)

Ensure diversity: mix of archetypes, ages, genders, sentiments, influence levels.

### Phase 3: Simulate
Call run_oasis_simulation for each platform with the generated profiles.
Always pass the work_dir parameter so files are stored per-scenario.
This runs a multi-agent simulation where AI agents react to the post.

### Phase 4: Analyze
Call read_simulation_results to get engagement data from the simulation databases.
Pass the work_dir parameter so it finds the correct files.

### Phase 5: Strategize
Analyze the simulation results and provide:

Your FINAL response must be a JSON object:
{
  "scenario_id": "<provided>",
  "sentiment_score": 0.0-1.0,
  "risk_score": 1-10,
  "virality": "low|medium|high",
  "verdict": "One sentence summary",
  "factions": [{"name": "Faction Name", "proportion": 0.0-1.0, "color": "green|red|blue|purple|orange|gold|teal|gray"}],
  "themes": [{"label": "Theme name", "percentage": 0-100}],
  "strategy": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "suggested_rewrite": "Improved version of the original post"
}

IMPORTANT: Your very last message must be ONLY this JSON object.`;

// ---------------------------------------------------------------------------
// Model resolution
// ---------------------------------------------------------------------------

function resolveModel(provider: string, modelId?: string): Model<any> {
  if (provider === "openrouter") {
    const id = modelId || "anthropic/claude-sonnet-4";
    return getModel("openrouter", id as any);
  }
  const id = modelId || "anthropic.claude-sonnet-4-20250514-v1:0";
  return getModel("amazon-bedrock", id as any);
}

function convertToLlm(messages: any[]): Message[] {
  return messages.filter(
    (m: any) => m.role === "user" || m.role === "assistant" || m.role === "toolResult"
  );
}

// ---------------------------------------------------------------------------
// Agent event handler — uses mutable `active` session state
// ---------------------------------------------------------------------------

function handleAgentEvent(event: AgentEvent) {
  const ws = active.ws;
  const wsOpen = ws && ws.readyState === ws.OPEN;

  // Always process agent_end to capture final content, even if WS is closed
  if (event.type === "agent_end") {
    // Only send strategizing phase for pipeline phase 2
    if (active.pipelinePhase === 2) {
      active.phase = "strategizing";
      if (wsOpen) {
        wsSend(ws!, "phase", { phase: "strategizing", message: "Finalizing strategy..." });
      }
    }

    const allTexts: string[] = [];
    for (const msg of event.messages) {
      if (msg.role === "assistant" && Array.isArray(msg.content)) {
        for (const block of msg.content as any[]) {
          if (block.type === "text" && block.text) {
            allTexts.push(block.text);
          }
        }
      }
    }
    active.finalContent = allTexts.join("\n\n");
    console.log(`[agent_end] Collected ${allTexts.length} text blocks, total ${active.finalContent.length} chars`);
    return;
  }

  if (!wsOpen) return;

  switch (event.type) {
    case "agent_start":
      wsSend(ws, "phase", {
        phase: "researching",
        message: "Agent is researching context...",
      });
      break;

    case "tool_execution_start": {
      const tool = event.toolName;
      const args = event.args || {};
      const toolCallId = (event as any).toolCallId || `${tool}-${Date.now()}`;

      // Track start time for duration calculation
      active.toolStarts.set(toolCallId, { name: tool, startTime: Date.now() });

      // Send rich tool_start event for ALL tools
      const toolEvent: Record<string, any> = {
        event_type: "tool_start",
        tool_name: tool,
        tool_call_id: toolCallId,
      };

      if (tool === "web_search") {
        toolEvent.label = `Search → ${args.query || ""}`;
        toolEvent.query = args.query || "";
        active.collectedSources.push({ query: args.query || "", tool: "web_search" });
      } else if (tool === "fetch") {
        toolEvent.label = `${(args.method || "GET")} → ${args.url || ""}`;
        toolEvent.url = args.url || "";
        active.collectedSources.push({ query: args.url || "", url: args.url || "", tool: "fetch" });
      } else if (tool === "shell") {
        toolEvent.label = `$ ${(args.command || "").slice(0, 120)}`;
        toolEvent.command = (args.command || "").slice(0, 200);
      } else if (tool === "run_oasis_simulation") {
        const profileCount = (args.profiles || []).length;
        toolEvent.label = `OASIS ${args.platform || ""} → ${profileCount} agents, ${args.rounds || 5} rounds`;
        toolEvent.platform = args.platform || "";
        toolEvent.agent_count = profileCount;

        // Emit agent_generated for each profile (skip if already sent during Phase 1)
        const profiles = args.profiles || [];
        if (!active.profilesSent) for (const p of profiles) {
          if (p && typeof p === "object") {
            const agentData = {
              agent_id: p.agent_id,
              name: p.name || "",
              username: p.username || "",
              archetype: p.archetype || "neutral",
              sentiment_bias: p.sentiment_bias ?? 0,
              influence_weight: p.influence_weight ?? 1,
              bio: p.bio || "",
              persona: p.persona || "",
              age: p.age,
              gender: p.gender || "",
              mbti: p.mbti || "",
              profession: p.profession || "",
              interested_topics: p.interested_topics || [],
              activity_level: p.activity_level || "medium",
            };
            active.collectedAgents.push(agentData);
            wsSend(ws, "agent_generated", agentData);
          }
        }

        active.phase = "simulating";
        wsSend(ws, "phase", {
          phase: "simulating",
          message: `Running ${args.platform || ""} simulation...`,
        });
      } else if (tool === "read_simulation_results") {
        toolEvent.label = "Reading simulation results...";
        active.phase = "analyzing";
        wsSend(ws, "phase", {
          phase: "analyzing",
          message: "Analyzing simulation data...",
        });
      } else {
        toolEvent.label = tool;
      }

      wsSend(ws, "research_event", toolEvent);
      console.log(`[tool_start] ${tool}: ${toolEvent.label}`);
      break;
    }

    case "tool_execution_end": {
      const tool = event.toolName;
      const toolCallId = (event as any).toolCallId || `${tool}-unknown`;
      const startInfo = active.toolStarts.get(toolCallId);
      const duration = startInfo ? ((Date.now() - startInfo.startTime) / 1000).toFixed(1) : null;
      active.toolStarts.delete(toolCallId);

      // Extract result from tool output
      let resultPreview = "";
      let resultFull = "";
      const result = (event as any).result;
      if (result && Array.isArray(result.content)) {
        for (const block of result.content) {
          if (block.type === "text" && block.text) {
            resultFull = block.text;
            resultPreview = block.text.slice(0, 200).replace(/\n/g, " ↵ ");
            break;
          }
        }
      }

      const isError = (event as any).isError || resultPreview.startsWith("error") || resultPreview.startsWith("Fetch error");

      const toolEndEvent: Record<string, any> = {
        event_type: "tool_end",
        tool_name: tool,
        tool_call_id: toolCallId,
        duration: duration ? parseFloat(duration) : null,
        result_preview: resultPreview.slice(0, 160),
        is_error: isError,
      };

      // Send full result content for search and fetch tools so the UI can display it
      if ((tool === "web_search" || tool === "fetch") && resultFull && !isError) {
        toolEndEvent.result_content = resultFull;
      }

      wsSend(ws, "research_event", toolEndEvent);

      if (tool === "read_simulation_results") {
        active.phase = "strategizing";
        wsSend(ws, "phase", {
          phase: "strategizing",
          message: "Generating analysis and strategy...",
        });
      }
      console.log(`[tool_end] ${tool} completed in ${duration || "?"}s`);
      break;
    }

    case "tool_execution_update": {
      const tool = event.toolName;
      const data = event.partialResult as any;
      if (tool === "run_oasis_simulation" && data) {
        const details = data.details || {};
        if (details.type === "action") {
          active.collectedActions.push(details);
          wsSend(ws, "simulation_action", details);
        } else if (details.type === "progress") {
          wsSend(ws, "simulation_progress", {
            platform: details.platform || "",
            message: details.message || "",
          });
        }
      }
      break;
    }

    case "message_update": {
      const evt = event.assistantMessageEvent as any;
      if (evt.type === "text" && evt.text?.trim()) {
        // Stream text deltas for all phases
        wsSend(ws, "research_event", {
          event_type: "text_delta",
          text: evt.text,
          phase: active.phase,
        });
      }
      break;
    }

    case "message_end": {
      if (event.message.role === "assistant" && Array.isArray(event.message.content)) {
        const text = (event.message.content as any[])
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("");
        if (text && active.phase === "researching") {
          if (text.includes("## ") || text.includes("**")) {
            wsSend(ws, "research_event", {
              event_type: "message_end",
              text: text.slice(0, 300),
            });
          }
        }
      }
      break;
    }

    // agent_end is handled above (before the wsOpen check)
  }
}

// ---------------------------------------------------------------------------
// Get or create persistent agent
// ---------------------------------------------------------------------------

function getOrCreateAgent(): Agent {
  if (persistentAgent) return persistentAgent;

  const provider = process.env.CS_LLM_PROVIDER || "openrouter";
  const modelId = process.env.CS_LLM_MODEL;
  const model = resolveModel(provider, modelId);

  mkdirSync(DATA_DIR, { recursive: true });

  const tools = [
    createWebSearchTool(),
    createFetchTool(),
    createShellTool(DATA_DIR),
    createRunOasisTool(DATA_DIR),
    createReadResultsTool(DATA_DIR),
  ];

  persistentAgent = new Agent({
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model,
      thinkingLevel: "off",
      tools,
    },
    convertToLlm,
  });

  // Single subscription — uses mutable `active` session state
  persistentAgent.subscribe(handleAgentEvent);

  console.log(`Agent created with provider=${provider} model=${modelId || "(default)"}`);
  return persistentAgent;
}

// ---------------------------------------------------------------------------
// Simulation runner (uses persistent agent)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Profile extraction from Phase 1 agent output
// ---------------------------------------------------------------------------

function extractProfiles(content: string): any[] {
  // Strategy 1: Find ALL ```json fences and try each (profiles usually come after research_summary)
  const jsonFenceRegex = /```json\s*\n?([\s\S]*?)```/g;
  let match;
  while ((match = jsonFenceRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
        console.log(`[profiles] Extracted ${parsed.length} profiles from json fence`);
        return parsed;
      }
    } catch {}
  }

  // Strategy 2: Find ALL ``` fences and try parsing as JSON array (skip non-JSON like research_summary)
  const fenceRegex = /```(?!\w*summary)(\w*)\s*\n?([\s\S]*?)```/g;
  while ((match = fenceRegex.exec(content)) !== null) {
    const body = match[2].trim();
    if (!body.startsWith("[") && !body.startsWith("{")) continue; // skip non-JSON
    try {
      let parsed = JSON.parse(body);
      if (!Array.isArray(parsed) && typeof parsed === "object" && parsed.profiles) {
        parsed = parsed.profiles; // handle {profiles: [...]} wrapper
      }
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
        console.log(`[profiles] Extracted ${parsed.length} profiles from generic fence`);
        return parsed;
      }
    } catch {}
  }

  // Strategy 3: Find JSON arrays by bracket depth — look for arrays of objects with profile-like keys
  let depth = 0;
  let start = -1;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "[") {
      if (depth === 0) start = i;
      depth++;
    } else if (content[i] === "]") {
      depth--;
      if (depth === 0 && start >= 0) {
        const slice = content.slice(start, i + 1);
        if (slice.length > 200) { // profile arrays are large
          try {
            const parsed = JSON.parse(slice);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
              // Check for any profile-like key
              const first = parsed[0];
              if (first.agent_id || first.name || first.username || first.archetype || first.persona) {
                console.log(`[profiles] Extracted ${parsed.length} profiles by bracket depth`);
                return parsed;
              }
            }
          } catch {}
        }
        start = -1;
      }
    }
  }

  // Debug: dump content boundaries
  console.error(`[profiles] Failed to extract profiles from ${content.length} chars`);
  console.error(`[profiles] First 500 chars:\n${content.slice(0, 500)}`);
  console.error(`[profiles] Last 500 chars:\n${content.slice(-500)}`);
  // Also check for any fence-like markers
  const fences = [...content.matchAll(/```(\w*)/g)].map(m => m[1] || "(empty)");
  console.error(`[profiles] Fences found: ${fences.join(", ")}`);
  return [];
}

// ---------------------------------------------------------------------------
// Simulation runner (two-phase pipeline with confirmation gate)
// ---------------------------------------------------------------------------

async function runSimulation(ws: WebSocket, scenario: Scenario) {
  if (agentBusy) {
    throw new Error("Agent is busy with another simulation. Please wait and try again.");
  }

  agentBusy = true;
  active.ws = ws;
  active.phase = "researching";
  active.pipelinePhase = 1;
  active.finalContent = "";
  active.profilesSent = false;
  active.confirmResolve = null;

  try {
    const agent = getOrCreateAgent();

    const workDir = join(DATA_DIR, scenario.id);
    mkdirSync(workDir, { recursive: true });

    const platforms = scenario.platforms.join(" and ");

    console.log(`[sim] Starting simulation for scenario ${scenario.id}`);
    console.log(`[sim] Post: "${scenario.post_text.slice(0, 100)}..."`);
    console.log(`[sim] Platforms: ${platforms}, Agents: ${scenario.agent_count}, Rounds: ${scenario.rounds}`);

    // ── Phase 1: Research + Generate Profiles ──────────────────────────
    const phase1Prompt = `Run a crowd simulation for this scenario:

SCENARIO ID: ${scenario.id}

POST TEXT: "${scenario.post_text}"

AUDIENCE DESCRIPTION: "${scenario.audience_desc || "general social media audience"}"

PLATFORMS: ${platforms}
NUMBER OF AGENTS: ${scenario.agent_count || 15}
SIMULATION ROUNDS: ${scenario.rounds || 5}
WORK DIRECTORY: ${workDir}

FOR THIS STEP: Execute ONLY Phase 1 (Deep Research) and Phase 2 (Generate Research-Grounded Agents).

STEP 1 — DEEP RESEARCH:
Conduct AT LEAST 15-20 different web_search queries across all these angles:
- Topic sentiment & current discourse (3-4 searches)
- Breaking news & recent events (3-4 searches)
- Audience demographics & communities (2-3 searches)
- Controversy, backlash history, risks (2-3 searches)
- Similar posts that went viral or failed (2-3 searches)
- Cultural context, memes, community norms (2-3 searches)
- Platform-specific patterns (1-2 searches)

Use fetch on important sources for deeper content. Be thorough — this research is the foundation.

After research, output a structured research summary in a \`\`\`research_summary code fence.

STEP 2 — GENERATE ${scenario.agent_count || 15} AGENTS:
Each agent MUST be grounded in your research. Include a research_basis field explaining which findings shaped this agent.

Output the complete profiles as a JSON array in a \`\`\`json code fence.
Each profile must include ALL required fields: agent_id, username, name, bio, persona, age, gender, mbti, profession, interested_topics, sentiment_bias, influence_weight, activity_level, archetype, research_basis.

DO NOT call run_oasis_simulation yet — the user needs to review and confirm the profiles first.`;

    await agent.prompt(phase1Prompt);
    await agent.waitForIdle();

    console.log(`[sim] Phase 1 complete. Extracting profiles...`);

    // Extract profiles from Phase 1 output
    const profiles = extractProfiles(active.finalContent);

    if (profiles.length === 0) {
      throw new Error("Agent did not produce valid agent profiles. Check server logs.");
    }

    // Send full profile data to frontend and collect for results
    const wsOpen = ws && ws.readyState === ws.OPEN;
    active.collectedAgents = [];
    for (const p of profiles) {
      const agentData = {
        agent_id: p.agent_id,
        name: p.name || "",
        username: p.username || "",
        archetype: p.archetype || "neutral",
        sentiment_bias: p.sentiment_bias ?? 0,
        influence_weight: p.influence_weight ?? 1,
        activity_level: p.activity_level ?? 0.5,
        bio: p.bio || "",
        persona: p.persona || "",
        age: p.age,
        gender: p.gender || "",
        mbti: p.mbti || "",
        profession: p.profession || "",
        interested_topics: p.interested_topics || [],
        research_basis: p.research_basis || "",
      };
      active.collectedAgents.push(agentData);
      if (wsOpen) wsSend(ws, "agent_generated", agentData);
    }

    // Extract research summary from Phase 1 output
    let researchSummary = "";
    const rsMat = active.finalContent.match(/```research_summary\s*\n([\s\S]*?)```/);
    if (rsMat) researchSummary = rsMat[1].trim();

    if (wsOpen) {
      active.profilesSent = true;

      wsSend(ws, "agents_ready", {
        count: profiles.length,
        platforms: scenario.platforms,
        rounds: scenario.rounds,
        sources_count: active.collectedSources.length,
        research_summary: researchSummary,
        sources: active.collectedSources,
      });
      wsSend(ws, "phase", {
        phase: "awaiting_confirmation",
        message: `${profiles.length} personas generated — review and confirm`,
      });
    }

    active.phase = "awaiting_confirmation";
    console.log(`[sim] Sent ${profiles.length} profiles. Waiting for confirmation...`);

    // ── Wait for user confirmation ─────────────────────────────────────
    const confirmed = await new Promise<boolean>((resolve) => {
      active.confirmResolve = resolve;
      // Timeout after 10 minutes
      setTimeout(() => {
        if (active.confirmResolve === resolve) {
          resolve(false);
        }
      }, 600000);
    });
    active.confirmResolve = null;

    if (!confirmed) {
      throw new Error("Simulation cancelled or confirmation timed out.");
    }

    console.log(`[sim] User confirmed. Starting Phase 2...`);

    // ── Phase 2: Simulate + Analyze + Strategize ───────────────────────
    active.pipelinePhase = 2;
    active.phase = "simulating";
    active.finalContent = "";

    if (ws.readyState === ws.OPEN) {
      wsSend(ws, "phase", { phase: "simulating", message: "Starting simulation..." });
    }

    const phase2Prompt = `The user has reviewed and confirmed the ${profiles.length} agent profiles you generated.
Now proceed with the remaining phases:

WORK DIRECTORY: ${workDir}

1. Call run_oasis_simulation for each platform (${platforms}) using the profiles you generated above
   - Always pass work_dir="${workDir}"
   - Use ${scenario.rounds || 5} rounds
2. Call read_simulation_results to analyze the simulation data
   - Always pass work_dir="${workDir}"
3. Analyze results thoroughly and provide your final strategy

Your FINAL response must be ONLY a JSON object with these fields:
{
  "scenario_id": "${scenario.id}",
  "sentiment_score": 0.0-1.0,
  "risk_score": 1-10,
  "virality": "low|medium|high",
  "verdict": "Detailed 2-3 sentence summary of the simulation findings",
  "factions": [{"name": "Faction Name", "proportion": 0.0-1.0, "color": "green|red|blue|purple|orange|gold|teal|gray"}],
  "themes": [{"label": "Theme name", "percentage": 0-100}],
  "strategy": ["Detailed recommendation 1", "Detailed recommendation 2", "Detailed recommendation 3"],
  "suggested_rewrite": "Improved version of the original post"
}`;

    await agent.prompt(phase2Prompt);
    await agent.waitForIdle();

    console.log(`[sim] Phase 2 complete. Parsing results...`);

    // Parse final JSON from agent output — try multiple extraction strategies
    const rawContent = active.finalContent;
    console.log(`[parse] Attempting to extract JSON from ${rawContent.length} chars of agent output`);

    let result: any = null;

    // Strategy 1: Extract from ```json code fences
    const jsonFenceMatch = rawContent.match(/```json\s*([\s\S]*?)```/);
    if (jsonFenceMatch) {
      try {
        result = JSON.parse(jsonFenceMatch[1].trim());
        console.log("[parse] Extracted from ```json fence");
      } catch {}
    }

    // Strategy 2: Extract from generic ``` code fences
    if (!result) {
      const fenceMatch = rawContent.match(/```\s*([\s\S]*?)```/);
      if (fenceMatch) {
        try {
          result = JSON.parse(fenceMatch[1].trim());
          console.log("[parse] Extracted from ``` fence");
        } catch {}
      }
    }

    // Strategy 3: Find JSON objects and pick the one with expected fields
    if (!result) {
      // Find all top-level { ... } blocks by tracking brace depth
      const candidates: string[] = [];
      let depth = 0;
      let start = -1;
      for (let i = 0; i < rawContent.length; i++) {
        if (rawContent[i] === "{") {
          if (depth === 0) start = i;
          depth++;
        } else if (rawContent[i] === "}") {
          depth--;
          if (depth === 0 && start >= 0) {
            candidates.push(rawContent.slice(start, i + 1));
            start = -1;
          }
        }
      }

      // Try candidates in reverse order (last one is most likely the final result)
      for (let i = candidates.length - 1; i >= 0; i--) {
        try {
          const candidate = JSON.parse(candidates[i]);
          if (candidate.sentiment_score !== undefined || candidate.verdict || candidate.factions || candidate.risk_score !== undefined) {
            result = candidate;
            console.log(`[parse] Found result JSON in candidate ${i + 1}/${candidates.length}`);
            break;
          }
        } catch {}
      }
    }

    // Strategy 4: Greedy regex — first { to last }
    if (!result) {
      const greedyMatch = rawContent.match(/\{[\s\S]*\}/);
      if (greedyMatch) {
        try {
          result = JSON.parse(greedyMatch[0]);
          console.log("[parse] Extracted via greedy regex");
        } catch (e: any) {
          console.error("[parse] Greedy regex match found but failed to parse:", e.message);
        }
      }
    }

    if (!result) {
      console.error("[parse] FAILED — no valid JSON found. Raw content (first 1000 chars):", rawContent.slice(0, 1000));
      console.error("[parse] Raw content (last 500 chars):", rawContent.slice(-500));
      throw new Error("Agent did not produce valid JSON results. Check server logs for details.");
    }

    const simResults: SimulationResults = {
      scenario_id: scenario.id,
      sentiment_score: result.sentiment_score ?? 0.5,
      risk_score: result.risk_score ?? 5,
      virality: result.virality ?? "medium",
      verdict: result.verdict ?? "",
      factions: result.factions ?? [],
      themes: result.themes ?? [],
      strategy: result.strategy ?? [],
      suggested_rewrite: result.suggested_rewrite ?? "",
      agents: active.collectedAgents,
      actions: active.collectedActions,
    };

    results.set(scenario.id, simResults);
    scenario.status = "complete";

    wsSend(ws, "simulation_complete", { results: simResults });
  } finally {
    active.ws = null;
    active.phase = "idle";
    active.pipelinePhase = 0;
    active.profilesSent = false;
    active.confirmResolve = null;
    active.collectedAgents = [];
    active.collectedActions = [];
    active.collectedSources = [];
    agentBusy = false;
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function jsonResponse(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function wsSend(ws: WebSocket, eventType: string, data: Record<string, any>) {
  try {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ event: eventType, ...data }));
    }
  } catch {
    // Client disconnected
  }
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || "8000");

const httpServer = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // POST /api/scenarios
    if (req.method === "POST" && path === "/api/scenarios") {
      const body = await parseBody(req);
      const id = randomUUID().replace(/-/g, "").slice(0, 12);
      const scenario: Scenario = {
        id,
        post_text: body.post_text || "",
        audience_desc: body.audience_desc || "",
        platforms: body.platforms || ["twitter", "reddit"],
        agent_count: body.agent_count ?? 15,
        rounds: body.rounds ?? 5,
        model: body.model,
        status: "created",
      };
      scenarios.set(id, scenario);
      return jsonResponse(res, 200, scenario);
    }

    // GET /api/scenarios
    if (req.method === "GET" && path === "/api/scenarios") {
      return jsonResponse(res, 200, [...scenarios.values()]);
    }

    // GET /api/scenarios/:id
    const scenarioMatch = path.match(/^\/api\/scenarios\/([^/]+)$/);
    if (req.method === "GET" && scenarioMatch) {
      const s = scenarios.get(scenarioMatch[1]);
      if (!s) return jsonResponse(res, 404, { detail: "Scenario not found" });
      return jsonResponse(res, 200, s);
    }

    // GET /api/results/:id
    const resultsMatch = path.match(/^\/api\/results\/([^/]+)$/);
    if (req.method === "GET" && resultsMatch) {
      const r = results.get(resultsMatch[1]);
      if (!r) return jsonResponse(res, 404, { detail: "Results not found" });
      return jsonResponse(res, 200, r);
    }

    jsonResponse(res, 404, { detail: "Not found" });
  } catch (err: any) {
    console.error("HTTP error:", err);
    jsonResponse(res, 500, { detail: err.message || "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const match = url.pathname.match(/^\/api\/simulations\/ws\/([^/]+)$/);

  if (match) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      const scenarioId = match[1];
      const scenario = scenarios.get(scenarioId);

      if (!scenario) {
        wsSend(ws, "error", { message: "Scenario not found" });
        ws.close();
        return;
      }

      scenario.status = "running";

      // Listen for client messages (confirmation, etc.)
      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.action === "confirm" && active.confirmResolve) {
            console.log(`[ws] Received confirmation from client`);
            active.confirmResolve(true);
          }
        } catch {}
      });

      runSimulation(ws, scenario)
        .catch((err) => {
          console.error("Simulation error:", err);
          scenario.status = "error";
          wsSend(ws, "error", { message: String(err.message || err) });
        })
        .finally(() => {
          try {
            ws.close();
          } catch {}
        });
    });
  } else {
    socket.destroy();
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`CrowdSimulator server listening on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
