# CrowdSimulator

Predict how audiences will react to social media posts before you publish. CrowdSimulator uses an AI agent to research your topic, generate realistic audience personas grounded in real-world context, then runs multi-agent simulations on Twitter and Reddit to forecast engagement, sentiment, and risk.

## How It Works

```
Compose Post → AI Research → Persona Generation → Confirm → Simulation → Report
```

1. **Compose** — Write your post, describe the target audience, pick platforms (Twitter/Reddit), set agent count and rounds.
2. **Research** — The AI agent performs 15-20+ web searches to understand current discourse, news, audience demographics, controversy risks, and cultural context around your topic.
3. **Persona Generation** — Based on research findings, the agent generates diverse audience profiles (supporters, skeptics, trolls, journalists, influencers, etc.) each grounded in specific research discoveries.
4. **Review & Confirm** — You review the generated personas and research sources before the simulation begins.
5. **Simulation** — OASIS multi-agent framework runs the simulation: AI agents react to your post with likes, reposts, comments, follows, and downvotes across multiple rounds.
6. **Report** — Sentiment scores, risk assessment, virality prediction, faction breakdown, reaction themes, strategic recommendations, and a suggested rewrite.

## A/B Testing

Toggle A/B mode in the compose view to test multiple post variants simultaneously. The same audience personas react to each variant independently, and the results view shows a side-by-side comparison with a recommended winner.

## Architecture

```
frontend/          Vue 3 + Vite + D3.js
  ├── views/       ComposeView, ResearchView, SimulateView, ResultsView
  ├── components/  ScenarioEditor, DualTimeline, InteractionGraph, ...
  └── composables/ useSimulation (shared WebSocket state)

agent-service/     Node.js + TypeScript
  ├── src/
  │   ├── server.ts   HTTP + WebSocket server, simulation pipeline
  │   └── tools/      web_search, fetch, shell, run_oasis, read_results
  └── scripts/
      ├── run_oasis.py      Python OASIS simulation runner
      └── read_results.py   SQLite results parser
```

The frontend connects via WebSocket to stream simulation progress in real-time. The backend runs a persistent AI agent (pi-agent-core) that maintains memory across simulation runs, so repeated simulations on similar topics can skip redundant research.

## Prerequisites

- Node.js 20+
- Python 3.10+ with pip
- An LLM API key (OpenRouter or AWS Bedrock)

## Setup

### Backend

```bash
cd agent-service
npm install

# Install Python dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API key
```

### Frontend

```bash
cd frontend
npm install
```

## Running

Start both services:

```bash
# Terminal 1 — backend (port 8010)
cd agent-service
npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend
npm run dev
```

Open http://localhost:5173

## Configuration

Environment variables in `agent-service/.env`:

| Variable | Description | Default |
|---|---|---|
| `CS_LLM_PROVIDER` | `openrouter` or `bedrock` | `openrouter` |
| `CS_LLM_MODEL` | Model ID | `anthropic/claude-sonnet-4` |
| `OPENROUTER_API_KEY` | OpenRouter API key | — |
| `PORT` | Backend server port | `8000` |

For AWS Bedrock, configure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` via environment or default credential chain.

## Key Features

- **Research-grounded personas** — Every simulated agent references real discourse, events, and community dynamics discovered during the research phase
- **Real-time streaming** — Watch research, persona generation, and simulation unfold live via WebSocket
- **Dual-platform simulation** — Separate Twitter and Reddit simulations capture platform-specific dynamics
- **Interactive network graph** — D3 force-directed graph with draggable nodes, theme-aware colors, curved edges, and hover tooltips
- **A/B variant testing** — Compare up to 4 post variants with shared audience, side-by-side results, and automated winner recommendation
- **Persistent agent memory** — The AI agent remembers past research across runs and can skip redundant searches
- **Dark/light theme** — Full theme support with CSS custom properties

## Tech Stack

**Frontend:** Vue 3, Vue Router, Vite, D3.js, Axios

**Backend:** Node.js, TypeScript, pi-agent-core, WebSocket (ws), Playwright, Readability

**Simulation:** OASIS multi-agent framework (Python), SQLite for results storage

**LLM:** Claude via OpenRouter or AWS Bedrock
