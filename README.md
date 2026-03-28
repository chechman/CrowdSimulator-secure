# CrowdSimulator

Predict how the internet will react to your post before you publish it. CrowdSimulator researches your topic in real-time, generates realistic audience personas grounded in actual web discourse, and simulates their reactions — arguments, support, pile-ons, and consensus.

![CrowdSimulator — AI agent researching topic context in real-time](img_1.png)
![CrowdSimulator — AI agent researching topic context in real-time](img_2.png)

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

CrowdSimulator uses [OpenRouter](https://openrouter.ai) as a unified LLM gateway. You need **one API key** — OpenRouter routes requests to the right provider (Anthropic, Perplexity, Minimax, etc.) behind the scenes.

Get your key at **https://openrouter.ai/keys**

| Variable | Description | Required | Default |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | **Yes** | — |
| `CS_LLM_MODEL` | Agent LLM model | No | `anthropic/claude-sonnet-4` |
| `CS_SEARCH_MODEL` | Web search model | No | `perplexity/sonar` |
| `PORT` | Backend port | No | `8000` |

**What the key powers:**
- **Agent LLM** (`CS_LLM_MODEL`) — Research, persona generation, analysis. Any model on OpenRouter works.
- **Web search** (`CS_SEARCH_MODEL`) — Real-time topic research via Perplexity Sonar, routed through the same OpenRouter key.

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


## Prerequisites

- Node.js 20+
- Python 3.10+
- OpenRouter API key ([get one here](https://openrouter.ai/keys))

## Recommended Models


**Web search** (`CS_SEARCH_MODEL`):

| Model | Notes |
|---|---|
| `perplexity/sonar` | Default, fast |


## Tech Stack

**Frontend:** Vue 3, Vue Router, Vite, D3.js, Three.js, Axios

**Backend:** Node.js, TypeScript, pi-agent-core, WebSocket (ws), Playwright, Readability

**Simulation:** OASIS multi-agent framework (Python), SQLite

**LLM:** OpenRouter (Claude, Minimax, Perplexity, etc.)

## License

MIT
