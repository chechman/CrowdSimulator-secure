# CrowdSimulator

Predict how the internet will react to your post before you publish it. CrowdSimulator researches your topic in real-time, generates realistic audience personas grounded in actual web discourse, and simulates their reactions — arguments, support, pile-ons, and consensus.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/CrowdSimulator.git
cd CrowdSimulator

# 2. Backend setup
cd agent-service
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Configure (only 1 API key needed)
cp .env.example .env
# Edit .env — add your OpenRouter API key (get one at https://openrouter.ai/keys)

# 4. Frontend setup
cd ../frontend
npm install

# 5. Run
# Terminal 1:
cd agent-service && npm run dev

# Terminal 2:
cd frontend && npm run dev

# 6. Open http://localhost:5173
```

## API Keys

You need **one API key**: an [OpenRouter](https://openrouter.ai/keys) key. This powers both:
- The LLM agent (research, persona generation, analysis)
- Web search (Perplexity Sonar, routed through OpenRouter)

| Variable | Description | Required |
|---|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Yes |
| `CS_LLM_MODEL` | Model to use | No (default: `anthropic/claude-sonnet-4`) |
| `CS_LLM_PROVIDER` | `openrouter` or `bedrock` | No (default: `openrouter`) |
| `PORT` | Backend port | No (default: `8000`) |

For AWS Bedrock instead of OpenRouter, set `CS_LLM_PROVIDER=bedrock` and configure `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.

## How It Works

```
Compose Post → AI Research → Persona Generation → Review → Simulation → Report
```

1. **Compose** — Write your post, describe audience, pick platforms (Twitter/Reddit), set agent count and rounds
2. **Research** — AI agent runs 15-20+ web searches on topic sentiment, breaking news, audience demographics, controversy risks, cultural context
3. **Persona Generation** — Generates diverse audience profiles (supporters, skeptics, trolls, journalists, influencers) grounded in research
4. **Review & Confirm** — Review personas and research sources before simulation
5. **Simulation** — OASIS multi-agent framework runs the sim: agents react with likes, reposts, comments, follows, downvotes across rounds
6. **Report** — Sentiment score, risk assessment, virality prediction, faction breakdown, themes, strategy recommendations, suggested rewrite

## A/B Testing

Toggle A/B mode to test up to 4 post variants. Same audience reacts to each variant independently — results show side-by-side comparison with a recommended winner.

## Architecture

```
frontend/              Vue 3 + Vite + D3.js + Three.js
  ├── views/           ComposeView, ResearchView, SimulateView, ResultsView
  ├── components/      ScenarioEditor, DualTimeline, InteractionGraph, CrowdScene
  └── composables/     useSimulation (shared WebSocket state)

agent-service/         Node.js + TypeScript
  ├── src/
  │   ├── server.ts    HTTP + WebSocket server, simulation pipeline
  │   └── tools/       web_search, fetch, shell, run_oasis, read_results
  └── scripts/
      ├── run_oasis.py       Python OASIS simulation runner
      └── read_results.py    SQLite results parser
```

Real-time WebSocket streaming — watch research, persona generation, and simulation unfold live.

## Prerequisites

- Node.js 20+
- Python 3.10+
- OpenRouter API key ([get one here](https://openrouter.ai/keys))

## Recommended Models

| Model | Cost | Speed | Quality |
|---|---|---|---|
| `anthropic/claude-sonnet-4` | $$$ | Medium | Best |
| `anthropic/claude-haiku-4.5` | $ | Fast | Good |
| `minimax/minimax-m2.7` | $ | Fast | Good |

Web search always uses `perplexity/sonar` via OpenRouter (cheap, $1/M tokens).

## Key Features

- **Research-grounded personas** — Every agent references real discourse, events, and community dynamics
- **Real-time streaming** — Watch everything unfold live via WebSocket
- **Dual-platform simulation** — Separate Twitter and Reddit sims capture platform-specific dynamics
- **3D crowd visualization** — Three.js particle network on compose and results pages
- **Interactive network graph** — D3 force-directed graph with draggable nodes and tooltips
- **A/B variant testing** — Compare up to 4 variants side-by-side
- **Persistent agent memory** — AI remembers past research, skips redundant searches
- **Dark/light theme** — Full theme support

## Tech Stack

**Frontend:** Vue 3, Vue Router, Vite, D3.js, Three.js, Axios

**Backend:** Node.js, TypeScript, pi-agent-core, WebSocket (ws), Playwright, Readability

**Simulation:** OASIS multi-agent framework (Python), SQLite

**LLM:** OpenRouter (Claude, Minimax, etc.) or AWS Bedrock

## License

MIT
