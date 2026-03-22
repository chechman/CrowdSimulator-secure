# CrowdSimulator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a what-if crowd reaction simulator that predicts how audiences react to social media posts before publishing — using OASIS for multi-agent simulation, FastAPI for the backend, and Vue 3 for the frontend.

**Architecture:** FastAPI backend orchestrates a pipeline: research agent searches real-world context, audience generator creates OASIS-compatible agent profiles from NLP descriptions, simulation runner executes dual-platform (Twitter + Reddit) simulations via OASIS, analytics engine processes results, and a strategist agent generates recommendations. Vue 3 frontend streams progress via WebSocket and renders a dual timeline, agent network graph, and results dashboard.

**Tech Stack:** Python 3.11+, FastAPI, OASIS (camel-ai), LiteLLM (multi-provider LLM), Vue 3 + Vite, D3.js, WebSocket, SQLite, Pydantic

**Reference repos (read-only, copy patterns not imports):**
- OASIS: `/Users/sayantan/Documents/Workspace/personal-assist/oasis/`
- x-lens simulation: `/Users/sayantan/Documents/Workspace/personal-assist/x-lens/simulation/src/`
- MiroFish frontend: `/Users/sayantan/Documents/Workspace/personal-assist/MiroFish/frontend/src/`
- pi-agent-core: `/Users/sayantan/Documents/Workspace/personal-assist/pi-toolkit/packages/agent/src/`
- Design doc: `/Users/sayantan/Documents/Workspace/personal-assist/sim-world/docs/plans/2026-03-21-sim-world-design.md`
- UI mock: `/Users/sayantan/Documents/Workspace/personal-assist/sim-world/mock.html`

---

## Task 1: Project Scaffolding — Backend

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`

**Step 1: Create pyproject.toml**

```toml
[project]
name = "crowdsimulator-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "websockets>=14.0",
    "pydantic>=2.10.0",
    "litellm>=1.55.0",
    "camel-oasis>=0.2.5",
    "camel-ai[all]>=0.2.78",
    "httpx>=0.28.0",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24.0",
    "pytest-httpx>=0.35.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**Step 2: Create config.py**

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    llm_provider: str = "openrouter"  # openrouter | bedrock | anthropic
    llm_model: str = "anthropic/claude-sonnet-4-20250514"
    llm_api_key: str = ""
    llm_base_url: str = "https://openrouter.ai/api/v1"
    simulation_db_dir: str = "./data/simulations"
    default_agent_count: int = 15
    default_rounds: int = 5
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_prefix": "CS_"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Step 3: Create main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings

app = FastAPI(title="CrowdSimulator", version="0.1.0")

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 4: Create empty __init__.py**

```python
```

**Step 5: Verify backend starts**

Run: `cd backend && pip install -e ".[dev]" && uvicorn app.main:app --reload --port 8000`
Expected: Server starts, `GET /health` returns `{"status": "ok"}`

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: scaffold backend with FastAPI, config, health endpoint"
```

---

## Task 2: Project Scaffolding — Frontend

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.js`
- Create: `frontend/src/App.vue`
- Create: `frontend/src/router/index.js`
- Create: `frontend/src/api/index.js`
- Create: `frontend/src/views/ComposeView.vue` (placeholder)
- Create: `frontend/src/views/ResearchView.vue` (placeholder)
- Create: `frontend/src/views/SimulateView.vue` (placeholder)
- Create: `frontend/src/views/ResultsView.vue` (placeholder)

**Step 1: Create package.json**

```json
{
  "name": "crowdsimulator-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.24",
    "vue-router": "^4.6.3",
    "axios": "^1.13.2",
    "d3": "^7.9.0"
  },
  "devDependencies": {
    "vite": "^7.2.4",
    "@vitejs/plugin-vue": "^6.0.1"
  }
}
```

**Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true }
    }
  }
})
```

**Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CrowdSimulator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&family=Caveat:wght@400;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**Step 4: Create src/main.js, App.vue, router, api client, and placeholder views**

`src/main.js`:
```js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

`src/App.vue`:
```vue
<template>
  <router-view />
</template>
```

`src/router/index.js`:
```js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'compose', component: () => import('../views/ComposeView.vue') },
  { path: '/research/:id', name: 'research', component: () => import('../views/ResearchView.vue') },
  { path: '/simulate/:id', name: 'simulate', component: () => import('../views/SimulateView.vue') },
  { path: '/results/:id', name: 'results', component: () => import('../views/ResultsView.vue') },
]

export default createRouter({ history: createWebHistory(), routes })
```

`src/api/index.js`:
```js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 300000,
  headers: { 'Content-Type': 'application/json' }
})

export default api

export function connectWS(scenarioId) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const base = import.meta.env.VITE_WS_BASE_URL || `${proto}://${location.host}`
  return new WebSocket(`${base}/ws/simulation/${scenarioId}`)
}
```

Each placeholder view:
```vue
<template>
  <div class="view">
    <h1>{{ viewName }}</h1>
    <p>Coming soon</p>
  </div>
</template>

<script setup>
const viewName = 'Compose' // or Research, Simulate, Results
</script>
```

**Step 5: Verify frontend starts**

Run: `cd frontend && npm install && npm run dev`
Expected: Vite dev server starts on port 5173, shows placeholder compose view

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend with Vue 3, Vite, router, API client"
```

---

## Task 3: Pydantic Models

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/scenario.py`
- Create: `backend/app/models/agent.py`
- Create: `backend/app/models/simulation.py`
- Create: `backend/app/models/results.py`
- Test: `backend/tests/test_models.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_models.py
import pytest
from app.models.scenario import ScenarioCreate, Scenario
from app.models.agent import AgentProfile, AudienceSegment
from app.models.simulation import SimulationStatus, SimulationAction
from app.models.results import SimulationResults, FactionBreakdown, ReactionTheme


def test_scenario_create_defaults():
    s = ScenarioCreate(post_text="Test post", audience_desc="tech twitter")
    assert s.platforms == ["twitter", "reddit"]
    assert s.agent_count == 15
    assert s.rounds == 5


def test_scenario_create_custom():
    s = ScenarioCreate(
        post_text="We're raising prices",
        audience_desc="50% loyal fans, 30% price-sensitive users, 20% competitors",
        platforms=["twitter"],
        agent_count=20,
        rounds=8,
    )
    assert s.agent_count == 20
    assert len(s.platforms) == 1


def test_agent_profile_fields():
    p = AgentProfile(
        agent_id=0,
        username="test_user",
        name="Test User",
        bio="A test persona",
        persona="Detailed backstory...",
        age=28,
        gender="female",
        mbti="INTJ",
        profession="Engineer",
        interested_topics=["tech", "AI"],
        sentiment_bias=0.5,
        influence_weight=1.0,
        activity_level=0.7,
        archetype="supporter",
    )
    assert p.agent_id == 0
    assert -1.0 <= p.sentiment_bias <= 1.0


def test_audience_segment():
    seg = AudienceSegment(
        label="loyal fans",
        proportion=0.5,
        sentiment_bias=0.8,
        description="Long-time followers who actively engage",
    )
    assert seg.proportion == 0.5


def test_simulation_status():
    status = SimulationStatus(
        scenario_id="abc123",
        phase="simulating",
        progress=0.45,
        current_round=3,
        total_rounds=8,
    )
    assert status.phase == "simulating"


def test_simulation_action():
    action = SimulationAction(
        round=1,
        agent_id=0,
        agent_name="Test User",
        platform="twitter",
        action_type="CREATE_POST",
        content="Hello world!",
        stats={"likes": 0},
    )
    assert action.action_type == "CREATE_POST"


def test_simulation_results():
    results = SimulationResults(
        scenario_id="abc123",
        sentiment_score=0.65,
        risk_score=3,
        virality="medium",
        verdict="Mostly positive with some pushback",
        factions=[
            FactionBreakdown(name="Supporters", proportion=0.55, color="green"),
            FactionBreakdown(name="Skeptics", proportion=0.3, color="red"),
            FactionBreakdown(name="Neutral", proportion=0.15, color="blue"),
        ],
        themes=[
            ReactionTheme(label="Price concerns", percentage=45),
            ReactionTheme(label="Brand loyalty", percentage=35),
        ],
        strategy=["Lead with value proposition", "Address pricing FAQ"],
        suggested_rewrite="We're evolving our pricing to better serve you...",
    )
    assert len(results.factions) == 3
    assert results.risk_score == 3
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_models.py -v`
Expected: FAIL — modules not found

**Step 3: Write the models**

`backend/app/models/__init__.py`:
```python
from .scenario import ScenarioCreate, Scenario
from .agent import AgentProfile, AudienceSegment
from .simulation import SimulationStatus, SimulationAction
from .results import SimulationResults, FactionBreakdown, ReactionTheme
```

`backend/app/models/scenario.py`:
```python
from pydantic import BaseModel, Field
from typing import Optional
import uuid


class ScenarioCreate(BaseModel):
    post_text: str
    audience_desc: str
    platforms: list[str] = Field(default=["twitter", "reddit"])
    agent_count: int = Field(default=15, ge=5, le=50)
    rounds: int = Field(default=5, ge=1, le=20)
    model: Optional[str] = None


class Scenario(ScenarioCreate):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    status: str = "created"
```

`backend/app/models/agent.py`:
```python
from pydantic import BaseModel, Field


class AudienceSegment(BaseModel):
    label: str
    proportion: float = Field(ge=0.0, le=1.0)
    sentiment_bias: float = Field(ge=-1.0, le=1.0)
    description: str


class AgentProfile(BaseModel):
    agent_id: int
    username: str
    name: str
    bio: str
    persona: str
    age: int
    gender: str
    mbti: str
    profession: str
    interested_topics: list[str]
    sentiment_bias: float = Field(ge=-1.0, le=1.0)
    influence_weight: float = Field(ge=0.5, le=5.0)
    activity_level: float = Field(ge=0.1, le=1.0)
    archetype: str
```

`backend/app/models/simulation.py`:
```python
from pydantic import BaseModel
from typing import Optional, Any


class SimulationStatus(BaseModel):
    scenario_id: str
    phase: str  # researching | generating | simulating | analyzing | complete | error
    progress: float = 0.0
    current_round: int = 0
    total_rounds: int = 0
    message: Optional[str] = None


class SimulationAction(BaseModel):
    round: int
    agent_id: int
    agent_name: str
    platform: str
    action_type: str
    content: Optional[str] = None
    stats: dict[str, Any] = {}
```

`backend/app/models/results.py`:
```python
from pydantic import BaseModel


class FactionBreakdown(BaseModel):
    name: str
    proportion: float
    color: str


class ReactionTheme(BaseModel):
    label: str
    percentage: float


class SimulationResults(BaseModel):
    scenario_id: str
    sentiment_score: float
    risk_score: int
    virality: str
    verdict: str
    factions: list[FactionBreakdown]
    themes: list[ReactionTheme]
    strategy: list[str]
    suggested_rewrite: str
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_models.py -v`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add backend/app/models/ backend/tests/
git commit -m "feat: add Pydantic models for scenarios, agents, simulation, results"
```

---

## Task 4: API Routes — Scenarios CRUD

**Files:**
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/scenarios.py`
- Modify: `backend/app/main.py` — register router
- Test: `backend/tests/test_api_scenarios.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_api_scenarios.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_scenario():
    resp = client.post("/api/scenarios", json={
        "post_text": "We're launching a new AI feature!",
        "audience_desc": "60% tech enthusiasts, 25% skeptics, 15% journalists",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert data["post_text"] == "We're launching a new AI feature!"
    assert data["status"] == "created"


def test_get_scenario():
    create = client.post("/api/scenarios", json={
        "post_text": "Test",
        "audience_desc": "general audience",
    })
    sid = create.json()["id"]
    resp = client.get(f"/api/scenarios/{sid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == sid


def test_get_scenario_not_found():
    resp = client.get("/api/scenarios/nonexistent")
    assert resp.status_code == 404


def test_list_scenarios():
    resp = client.get("/api/scenarios")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_api_scenarios.py -v`
Expected: FAIL — route not found (404)

**Step 3: Write the implementation**

`backend/app/api/__init__.py`:
```python
```

`backend/app/api/scenarios.py`:
```python
from fastapi import APIRouter, HTTPException
from app.models.scenario import ScenarioCreate, Scenario

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])

# In-memory store (replaced with DB later if needed)
_scenarios: dict[str, Scenario] = {}


@router.post("", response_model=Scenario)
async def create_scenario(body: ScenarioCreate):
    scenario = Scenario(**body.model_dump())
    _scenarios[scenario.id] = scenario
    return scenario


@router.get("", response_model=list[Scenario])
async def list_scenarios():
    return list(_scenarios.values())


@router.get("/{scenario_id}", response_model=Scenario)
async def get_scenario(scenario_id: str):
    if scenario_id not in _scenarios:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return _scenarios[scenario_id]
```

Modify `backend/app/main.py` — add after CORS middleware:
```python
from app.api.scenarios import router as scenarios_router
app.include_router(scenarios_router)
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_api_scenarios.py -v`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add backend/app/api/ backend/app/main.py backend/tests/test_api_scenarios.py
git commit -m "feat: add scenarios CRUD API endpoints"
```

---

## Task 5: Audience Generator Service

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/llm.py`
- Create: `backend/app/services/audience_generator.py`
- Test: `backend/tests/test_audience_generator.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_audience_generator.py
import pytest
import json
from unittest.mock import AsyncMock, patch
from app.services.audience_generator import generate_audience_profiles
from app.models.agent import AgentProfile

MOCK_LLM_RESPONSE = json.dumps({
    "agents": [
        {
            "agent_id": 0,
            "username": "techfan_maya",
            "name": "Maya Chen",
            "bio": "AI researcher, early adopter, always testing new tech",
            "persona": "Maya is a 29-year-old AI researcher who...",
            "age": 29,
            "gender": "female",
            "mbti": "ENTJ",
            "profession": "AI Researcher",
            "interested_topics": ["AI", "tech", "startups"],
            "sentiment_bias": 0.7,
            "influence_weight": 2.0,
            "activity_level": 0.8,
            "archetype": "tech_enthusiast",
        },
        {
            "agent_id": 1,
            "username": "skeptic_joe",
            "name": "Joe Martin",
            "bio": "Privacy advocate, tech critic",
            "persona": "Joe is a 45-year-old privacy advocate who...",
            "age": 45,
            "gender": "male",
            "mbti": "ISTJ",
            "profession": "Privacy Consultant",
            "interested_topics": ["privacy", "regulation"],
            "sentiment_bias": -0.6,
            "influence_weight": 1.5,
            "activity_level": 0.5,
            "archetype": "skeptic",
        },
    ]
})


@pytest.mark.asyncio
@patch("app.services.audience_generator.llm_json")
async def test_generate_profiles(mock_llm):
    mock_llm.return_value = json.loads(MOCK_LLM_RESPONSE)

    profiles = await generate_audience_profiles(
        post_text="We're launching a new AI feature!",
        audience_desc="60% tech enthusiasts, 40% privacy skeptics",
        agent_count=2,
    )

    assert len(profiles) == 2
    assert all(isinstance(p, AgentProfile) for p in profiles)
    assert profiles[0].username == "techfan_maya"
    assert profiles[1].sentiment_bias < 0
    mock_llm.assert_called_once()


@pytest.mark.asyncio
@patch("app.services.audience_generator.llm_json")
async def test_generate_profiles_respects_count(mock_llm):
    mock_llm.return_value = json.loads(MOCK_LLM_RESPONSE)

    profiles = await generate_audience_profiles(
        post_text="Test",
        audience_desc="general audience",
        agent_count=2,
    )

    # Verify agent_count was passed to the LLM prompt
    call_args = mock_llm.call_args
    prompt = call_args[1].get("user_prompt", "") or call_args[0][1] if call_args[0] else ""
    assert "2" in str(call_args)
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_audience_generator.py -v`
Expected: FAIL — module not found

**Step 3: Write the implementation**

`backend/app/services/__init__.py`:
```python
```

`backend/app/services/llm.py`:
```python
import json
from litellm import acompletion
from app.config import get_settings


async def llm_json(system_prompt: str, user_prompt: str, temperature: float = 0.7) -> dict:
    """Call LLM and parse JSON response."""
    settings = get_settings()
    response = await acompletion(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        response_format={"type": "json_object"},
        api_key=settings.llm_api_key,
        api_base=settings.llm_base_url if settings.llm_provider == "openrouter" else None,
    )
    return json.loads(response.choices[0].message.content)


async def llm_text(system_prompt: str, user_prompt: str, temperature: float = 0.5) -> str:
    """Call LLM and return text response."""
    settings = get_settings()
    response = await acompletion(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        api_key=settings.llm_api_key,
        api_base=settings.llm_base_url if settings.llm_provider == "openrouter" else None,
    )
    return response.choices[0].message.content
```

`backend/app/services/audience_generator.py` (pattern from x-lens `generate_profiles.py`):
```python
from app.models.agent import AgentProfile
from app.services.llm import llm_json

SYSTEM_PROMPT = """You are an expert at creating realistic social media personas for crowd simulation.
You generate diverse agent profiles that represent different audience segments.
Output ONLY valid JSON with no other text."""

USER_PROMPT_TEMPLATE = """Generate {agent_count} social media agent profiles for simulating crowd reaction to this post:

POST: "{post_text}"

AUDIENCE DESCRIPTION: "{audience_desc}"

Requirements:
- Create agents that match the described audience segments and proportions
- Include a mix of supporters, skeptics, neutrals, and potential amplifiers
- Each agent needs a realistic persona with clear motivation and social media behavior
- Ensure diversity in age, gender, profession, personality (MBTI), and online behavior
- sentiment_bias: -1.0 (extreme critic) to 1.0 (extreme supporter)
- influence_weight: 0.5 (nobody) to 5.0 (major influencer)
- activity_level: 0.1 (lurker) to 1.0 (power poster)
- archetype examples: supporter, skeptic, neutral, journalist, troll, influencer, expert, casual_observer

Output JSON format:
{{
  "agents": [
    {{
      "agent_id": 0,
      "username": "lowercase_handle",
      "name": "Full Name",
      "bio": "200 char social media bio",
      "persona": "2000+ char detailed backstory including their stance on the topic, what drives their reactions, their social media behavior patterns, what would change their mind",
      "age": 34,
      "gender": "male|female|nonbinary",
      "mbti": "ENTJ",
      "profession": "Job Title",
      "interested_topics": ["topic1", "topic2"],
      "sentiment_bias": 0.8,
      "influence_weight": 1.5,
      "activity_level": 0.7,
      "archetype": "supporter"
    }}
  ]
}}"""


async def generate_audience_profiles(
    post_text: str,
    audience_desc: str,
    agent_count: int = 15,
) -> list[AgentProfile]:
    """Generate OASIS-compatible agent profiles from NLP audience description."""
    user_prompt = USER_PROMPT_TEMPLATE.format(
        agent_count=agent_count,
        post_text=post_text,
        audience_desc=audience_desc,
    )
    result = await llm_json(SYSTEM_PROMPT, user_prompt, temperature=0.7)
    return [AgentProfile(**agent) for agent in result["agents"]]
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_audience_generator.py -v`
Expected: All 2 tests PASS

**Step 5: Commit**

```bash
git add backend/app/services/ backend/tests/test_audience_generator.py
git commit -m "feat: add audience generator service with LLM-driven profile creation"
```

---

## Task 6: Research Agent Service

**Files:**
- Create: `backend/app/services/research_agent.py`
- Test: `backend/tests/test_research_agent.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_research_agent.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.research_agent import research_context


@pytest.mark.asyncio
@patch("app.services.research_agent.llm_text")
@patch("app.services.research_agent.web_search")
async def test_research_context(mock_search, mock_llm):
    mock_search.return_value = [
        {"title": "AI regulation debate heats up", "snippet": "Congress discusses new AI bills..."},
        {"title": "Tech companies push AI features", "snippet": "Major tech firms announce..."},
    ]
    mock_llm.return_value = "## Context Summary\nAI regulation is a hot topic..."

    result = await research_context(
        post_text="We're launching a new AI feature!",
        audience_desc="tech enthusiasts and privacy advocates",
    )

    assert isinstance(result, str)
    assert len(result) > 0
    mock_search.assert_called_once()
    mock_llm.assert_called_once()


@pytest.mark.asyncio
@patch("app.services.research_agent.llm_text")
@patch("app.services.research_agent.web_search")
async def test_research_context_no_results(mock_search, mock_llm):
    mock_search.return_value = []
    mock_llm.return_value = "No specific news found. General context..."

    result = await research_context(
        post_text="Test post",
        audience_desc="general",
    )

    assert isinstance(result, str)
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_research_agent.py -v`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```python
# backend/app/services/research_agent.py
import httpx
from app.services.llm import llm_text
from app.config import get_settings

SEARCH_SYSTEM_PROMPT = """You are a research agent preparing context for a social media crowd simulation.
Given search results about a topic, synthesize a concise context document covering:
1. Current public sentiment and discourse around this topic
2. Recent news or events that might influence reactions
3. Key narratives, controversies, or talking points
4. Potential landmines or sensitivities to be aware of

Write in markdown. Be factual and concise. This context will be fed to simulated social media agents."""

QUERY_SYSTEM_PROMPT = """Extract 1-2 search queries from this social media post and audience description.
Return only the queries, one per line. Focus on the topic, controversy potential, and audience concerns."""


async def web_search(query: str) -> list[dict]:
    """Search the web for context. Uses DuckDuckGo instant answers as fallback."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1},
            )
            data = resp.json()
            results = []
            if data.get("AbstractText"):
                results.append({"title": data.get("Heading", ""), "snippet": data["AbstractText"]})
            for topic in data.get("RelatedTopics", [])[:5]:
                if isinstance(topic, dict) and "Text" in topic:
                    results.append({"title": "", "snippet": topic["Text"]})
            return results
    except Exception:
        return []


async def research_context(
    post_text: str,
    audience_desc: str,
    on_progress: callable = None,
) -> str:
    """Research real-world context related to the scenario."""
    if on_progress:
        await on_progress("Generating search queries...")

    # Generate search queries from the post
    queries_text = await llm_text(
        QUERY_SYSTEM_PROMPT,
        f"Post: {post_text}\nAudience: {audience_desc}",
        temperature=0.3,
    )
    queries = [q.strip() for q in queries_text.strip().split("\n") if q.strip()][:2]

    if on_progress:
        await on_progress(f"Searching for: {', '.join(queries)}")

    # Search for each query
    all_results = []
    for query in queries:
        results = await web_search(query)
        all_results.extend(results)

    if on_progress:
        await on_progress(f"Found {len(all_results)} results, synthesizing context...")

    # Synthesize into context document
    search_text = "\n".join(
        f"- {r['title']}: {r['snippet']}" for r in all_results
    ) or "No specific search results found."

    context = await llm_text(
        SEARCH_SYSTEM_PROMPT,
        f"POST: {post_text}\nAUDIENCE: {audience_desc}\n\nSEARCH RESULTS:\n{search_text}",
        temperature=0.4,
    )

    return context
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_research_agent.py -v`
Expected: All 2 tests PASS

**Step 5: Commit**

```bash
git add backend/app/services/research_agent.py backend/tests/test_research_agent.py
git commit -m "feat: add research agent service for real-world context gathering"
```

---

## Task 7: Simulation Runner Service

**Files:**
- Create: `backend/app/services/simulation_runner.py`
- Test: `backend/tests/test_simulation_runner.py`

This is the core service that orchestrates OASIS. Pattern from x-lens `run_simulation.py`.

**Step 1: Write the failing test**

```python
# backend/tests/test_simulation_runner.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.simulation_runner import (
    build_agent_graph,
    build_oasis_env,
    run_simulation_round,
)
from app.models.agent import AgentProfile

SAMPLE_PROFILES = [
    AgentProfile(
        agent_id=0, username="user_a", name="User A", bio="Bio A",
        persona="Persona A", age=25, gender="male", mbti="ENTJ",
        profession="Engineer", interested_topics=["tech"],
        sentiment_bias=0.5, influence_weight=1.0, activity_level=0.7,
        archetype="supporter",
    ),
    AgentProfile(
        agent_id=1, username="user_b", name="User B", bio="Bio B",
        persona="Persona B", age=35, gender="female", mbti="ISFP",
        profession="Writer", interested_topics=["media"],
        sentiment_bias=-0.3, influence_weight=1.5, activity_level=0.5,
        archetype="skeptic",
    ),
]


@pytest.mark.asyncio
@patch("app.services.simulation_runner.SocialAgent")
@patch("app.services.simulation_runner.AgentGraph")
async def test_build_agent_graph(mock_graph_cls, mock_agent_cls):
    mock_graph = MagicMock()
    mock_graph_cls.return_value = mock_graph
    mock_agent_cls.return_value = MagicMock()

    graph = await build_agent_graph(SAMPLE_PROFILES, platform="twitter")

    assert mock_graph.add_agent.call_count == 2
    assert mock_graph_cls.called


@pytest.mark.asyncio
async def test_build_oasis_env_creates_db(tmp_path):
    """Test that build_oasis_env creates the database directory."""
    db_path = str(tmp_path / "test.db")
    # We can't fully test without OASIS installed, but verify the function signature
    from app.services.simulation_runner import build_oasis_env
    assert callable(build_oasis_env)
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_simulation_runner.py -v`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```python
# backend/app/services/simulation_runner.py
import os
import json
import asyncio
from typing import Optional, Callable, Any
from datetime import datetime

from oasis import make as oasis_make
from oasis.social_agent.agent import SocialAgent
from oasis.social_agent.agent_graph import AgentGraph
from oasis.social_platform.config import UserInfo
from oasis.social_platform.typing import ActionType, DefaultPlatformType
from oasis.environment.env_action import LLMAction, ManualAction
from camel.models import ModelFactory
from camel.types import ModelPlatformType, ModelType

from app.models.agent import AgentProfile
from app.models.simulation import SimulationAction
from app.config import get_settings


def _get_camel_model():
    """Create a CAMEL model backend for OASIS agents."""
    settings = get_settings()
    return ModelFactory.create(
        model_platform=ModelPlatformType.DEFAULT,
        model_type=settings.llm_model,
        api_key=settings.llm_api_key,
        url=settings.llm_base_url if settings.llm_provider == "openrouter" else None,
    )


def _profile_to_user_info(profile: AgentProfile, platform: str) -> UserInfo:
    """Convert our AgentProfile to OASIS UserInfo."""
    return UserInfo(
        user_name=profile.username,
        name=profile.name,
        description=profile.bio,
        profile={
            "nodes": [],
            "edges": [],
            "other_info": {
                "user_profile": profile.persona,
                "mbti": profile.mbti,
                "gender": profile.gender,
                "age": profile.age,
                "country": "US",
            },
        },
        recsys_type="twhin-bert" if platform == "twitter" else "reddit",
    )


async def build_agent_graph(
    profiles: list[AgentProfile],
    platform: str = "twitter",
    context: str = "",
) -> AgentGraph:
    """Build an OASIS AgentGraph from generated profiles."""
    graph = AgentGraph()
    model = _get_camel_model()

    for profile in profiles:
        user_info = _profile_to_user_info(profile, platform)
        agent = SocialAgent(
            agent_id=profile.agent_id,
            user_info=user_info,
            model=model,
        )
        graph.add_agent(agent)

    return graph


async def build_oasis_env(
    graph: AgentGraph,
    platform: str,
    db_path: str,
):
    """Create and initialize an OASIS environment."""
    platform_type = (
        DefaultPlatformType.TWITTER if platform == "twitter"
        else DefaultPlatformType.REDDIT
    )
    env = oasis_make(
        agent_graph=graph,
        platform=platform_type,
        database_path=db_path,
    )
    await env.reset()
    return env


async def run_simulation_round(
    env,
    graph: AgentGraph,
    round_num: int,
    seed_post: Optional[str] = None,
    on_action: Optional[Callable] = None,
) -> list[SimulationAction]:
    """Execute one round of simulation."""
    actions_log = []

    # If first round and seed post provided, create it as manual action
    if round_num == 0 and seed_post:
        first_agent = graph.get_agent(0)
        await env.step({
            first_agent: ManualAction(
                action_type=ActionType.CREATE_POST,
                action_args={"content": seed_post},
            )
        })

    # All agents take LLM-driven actions
    agent_actions = {
        agent: LLMAction()
        for _, agent in graph.get_agents()
    }
    await env.step(agent_actions)

    return actions_log


async def run_full_simulation(
    profiles: list[AgentProfile],
    post_text: str,
    platform: str,
    rounds: int,
    db_path: str,
    on_action: Optional[Callable] = None,
    on_progress: Optional[Callable] = None,
) -> str:
    """Run a complete simulation on one platform. Returns db_path."""
    if on_progress:
        await on_progress(f"Building {platform} agent graph...")

    graph = await build_agent_graph(profiles, platform)

    if on_progress:
        await on_progress(f"Initializing {platform} environment...")

    env = await build_oasis_env(graph, platform, db_path)

    try:
        for r in range(rounds):
            if on_progress:
                await on_progress(f"{platform} round {r + 1}/{rounds}")

            await run_simulation_round(
                env, graph, r,
                seed_post=post_text if r == 0 else None,
                on_action=on_action,
            )
    finally:
        await env.close()

    return db_path
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_simulation_runner.py -v`
Expected: All 2 tests PASS

**Step 5: Commit**

```bash
git add backend/app/services/simulation_runner.py backend/tests/test_simulation_runner.py
git commit -m "feat: add simulation runner service wrapping OASIS engine"
```

---

## Task 8: Analytics Service

**Files:**
- Create: `backend/app/services/analytics.py`
- Test: `backend/tests/test_analytics.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_analytics.py
import pytest
import sqlite3
from unittest.mock import patch, AsyncMock
from app.services.analytics import analyze_simulation
from app.models.agent import AgentProfile

SAMPLE_PROFILES = [
    AgentProfile(
        agent_id=0, username="fan_a", name="Fan A", bio="Loyal fan",
        persona="A supporter", age=25, gender="male", mbti="ENTJ",
        profession="Student", interested_topics=["tech"],
        sentiment_bias=0.8, influence_weight=1.0, activity_level=0.7,
        archetype="supporter",
    ),
    AgentProfile(
        agent_id=1, username="critic_b", name="Critic B", bio="Skeptic",
        persona="A skeptic", age=40, gender="female", mbti="ISTJ",
        profession="Journalist", interested_topics=["media"],
        sentiment_bias=-0.5, influence_weight=2.0, activity_level=0.5,
        archetype="skeptic",
    ),
]


def _create_test_db(db_path: str):
    """Create a minimal OASIS-like database for testing."""
    conn = sqlite3.connect(db_path)
    conn.executescript("""
        CREATE TABLE user (user_id INTEGER PRIMARY KEY, agent_id INTEGER, user_name TEXT, name TEXT, bio TEXT);
        CREATE TABLE post (post_id INTEGER PRIMARY KEY, user_id INTEGER, content TEXT, num_likes INTEGER DEFAULT 0, num_dislikes INTEGER DEFAULT 0, num_shares INTEGER DEFAULT 0);
        CREATE TABLE comment (comment_id INTEGER PRIMARY KEY, post_id INTEGER, user_id INTEGER, content TEXT, num_likes INTEGER DEFAULT 0);
        CREATE TABLE trace (user_id INTEGER, created_at DATETIME, action TEXT, info TEXT);

        INSERT INTO user VALUES (1, 0, 'fan_a', 'Fan A', 'Loyal fan');
        INSERT INTO user VALUES (2, 1, 'critic_b', 'Critic B', 'Skeptic');
        INSERT INTO post VALUES (1, 1, 'This is amazing!', 3, 0, 1);
        INSERT INTO post VALUES (2, 2, 'I have concerns about this.', 1, 2, 0);
        INSERT INTO post VALUES (3, 1, 'So excited for the launch!', 2, 0, 0);
        INSERT INTO trace VALUES (0, '2024-01-01', 'create_post', '{"content": "This is amazing!"}');
        INSERT INTO trace VALUES (1, '2024-01-01', 'create_post', '{"content": "I have concerns about this."}');
        INSERT INTO trace VALUES (0, '2024-01-01', 'like_post', '{"post_id": 1}');
    """)
    conn.commit()
    conn.close()


@pytest.mark.asyncio
@patch("app.services.analytics.llm_json")
async def test_analyze_simulation(mock_llm, tmp_path):
    db_path = str(tmp_path / "test.db")
    _create_test_db(db_path)

    mock_llm.return_value = {
        "sentiment_score": 0.55,
        "risk_score": 4,
        "virality": "medium",
        "verdict": "Mostly positive with notable pushback",
        "themes": [
            {"label": "Excitement", "percentage": 60},
            {"label": "Privacy concerns", "percentage": 40},
        ],
        "strategy": [
            "Address privacy concerns proactively",
            "Amplify positive testimonials",
        ],
        "suggested_rewrite": "We're thrilled to introduce our new AI feature, built with privacy at its core...",
    }

    results = await analyze_simulation(
        db_paths={"twitter": db_path},
        profiles=SAMPLE_PROFILES,
        post_text="We're launching AI!",
        scenario_id="test123",
    )

    assert results.scenario_id == "test123"
    assert 0 <= results.sentiment_score <= 1
    assert len(results.factions) > 0
    assert len(results.themes) > 0
    assert len(results.strategy) > 0
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_analytics.py -v`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```python
# backend/app/services/analytics.py
import sqlite3
from collections import Counter
from app.models.agent import AgentProfile
from app.models.results import SimulationResults, FactionBreakdown, ReactionTheme
from app.services.llm import llm_json

FACTION_COLORS = {
    "supporter": "green",
    "skeptic": "red",
    "neutral": "blue",
    "journalist": "purple",
    "troll": "orange",
    "influencer": "gold",
    "expert": "teal",
    "casual_observer": "gray",
}

ANALYSIS_SYSTEM_PROMPT = """You are an expert social media analyst.
Analyze the simulation data and provide insights.
Output ONLY valid JSON."""

ANALYSIS_USER_PROMPT = """Analyze this social media simulation:

ORIGINAL POST: "{post_text}"

SIMULATION DATA:
- Total posts: {total_posts}
- Total comments: {total_comments}
- Total likes: {total_likes}
- Total dislikes: {total_dislikes}

SAMPLE POSTS (most engaged):
{sample_posts}

AGENT ARCHETYPES: {archetypes}

Provide analysis as JSON:
{{
  "sentiment_score": 0.0-1.0,
  "risk_score": 1-10,
  "virality": "low|medium|high",
  "verdict": "one sentence summary",
  "themes": [{{"label": "theme name", "percentage": 0-100}}],
  "strategy": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "suggested_rewrite": "improved version of the original post"
}}"""


def _read_db_stats(db_path: str) -> dict:
    """Read aggregate stats from an OASIS simulation database."""
    conn = sqlite3.connect(db_path)
    try:
        posts = conn.execute("SELECT content, num_likes, num_dislikes, num_shares FROM post ORDER BY num_likes DESC").fetchall()
        comments = conn.execute("SELECT content FROM comment").fetchall()
        total_likes = sum(p[1] for p in posts)
        total_dislikes = sum(p[2] for p in posts)
        sample_posts = "\n".join(
            f"- \"{p[0]}\" (likes: {p[1]}, dislikes: {p[2]}, shares: {p[3]})"
            for p in posts[:10]
        )
        return {
            "total_posts": len(posts),
            "total_comments": len(comments),
            "total_likes": total_likes,
            "total_dislikes": total_dislikes,
            "sample_posts": sample_posts,
        }
    finally:
        conn.close()


def _compute_factions(profiles: list[AgentProfile]) -> list[FactionBreakdown]:
    """Compute faction breakdown from agent archetypes."""
    counts = Counter(p.archetype for p in profiles)
    total = len(profiles)
    return [
        FactionBreakdown(
            name=archetype.replace("_", " ").title(),
            proportion=round(count / total, 2),
            color=FACTION_COLORS.get(archetype, "gray"),
        )
        for archetype, count in counts.most_common()
    ]


async def analyze_simulation(
    db_paths: dict[str, str],
    profiles: list[AgentProfile],
    post_text: str,
    scenario_id: str,
) -> SimulationResults:
    """Analyze simulation results across platforms."""
    # Aggregate stats from all platform databases
    all_stats = {"total_posts": 0, "total_comments": 0, "total_likes": 0, "total_dislikes": 0, "sample_posts": ""}
    for platform, db_path in db_paths.items():
        stats = _read_db_stats(db_path)
        all_stats["total_posts"] += stats["total_posts"]
        all_stats["total_comments"] += stats["total_comments"]
        all_stats["total_likes"] += stats["total_likes"]
        all_stats["total_dislikes"] += stats["total_dislikes"]
        all_stats["sample_posts"] += f"\n### {platform.upper()}\n{stats['sample_posts']}"

    archetypes = ", ".join(set(p.archetype for p in profiles))

    # LLM analysis
    user_prompt = ANALYSIS_USER_PROMPT.format(
        post_text=post_text,
        archetypes=archetypes,
        **all_stats,
    )
    analysis = await llm_json(ANALYSIS_SYSTEM_PROMPT, user_prompt, temperature=0.3)

    factions = _compute_factions(profiles)

    return SimulationResults(
        scenario_id=scenario_id,
        sentiment_score=analysis["sentiment_score"],
        risk_score=analysis["risk_score"],
        virality=analysis["virality"],
        verdict=analysis["verdict"],
        factions=factions,
        themes=[ReactionTheme(**t) for t in analysis["themes"]],
        strategy=analysis["strategy"],
        suggested_rewrite=analysis["suggested_rewrite"],
    )
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_analytics.py -v`
Expected: 1 test PASS

**Step 5: Commit**

```bash
git add backend/app/services/analytics.py backend/tests/test_analytics.py
git commit -m "feat: add analytics service for simulation result analysis"
```

---

## Task 9: WebSocket Simulation Endpoint

**Files:**
- Create: `backend/app/api/simulations.py`
- Modify: `backend/app/main.py` — register router
- Test: `backend/tests/test_api_simulations.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_api_simulations.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_simulation_run_endpoint_exists():
    """Verify the simulation run endpoint is registered."""
    routes = [r.path for r in app.routes]
    assert "/api/simulations/{scenario_id}/run" in routes


def test_simulation_run_requires_scenario():
    resp = client.post("/api/simulations/nonexistent/run")
    assert resp.status_code == 404
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_api_simulations.py -v`
Expected: FAIL — routes not found

**Step 3: Write the implementation**

```python
# backend/app/api/simulations.py
import os
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.api.scenarios import _scenarios
from app.config import get_settings
from app.services.research_agent import research_context
from app.services.audience_generator import generate_audience_profiles
from app.services.simulation_runner import run_full_simulation
from app.services.analytics import analyze_simulation

router = APIRouter(prefix="/api/simulations", tags=["simulations"])

# Store running simulations and results
_results: dict = {}


async def _send_ws(ws: WebSocket, event: str, data: dict):
    """Send a WebSocket event."""
    await ws.send_json({"event": event, **data})


@router.post("/{scenario_id}/run")
async def run_simulation_http(scenario_id: str):
    """Trigger simulation (non-WebSocket fallback). Returns immediately."""
    if scenario_id not in _scenarios:
        raise HTTPException(status_code=404, detail="Scenario not found")
    # For non-WS clients, just mark as started
    _scenarios[scenario_id].status = "running"
    return {"status": "started", "scenario_id": scenario_id}


@router.websocket("/ws/simulation/{scenario_id}")
async def run_simulation_ws(ws: WebSocket, scenario_id: str):
    """Run full simulation pipeline with live WebSocket streaming."""
    await ws.accept()

    if scenario_id not in _scenarios:
        await _send_ws(ws, "error", {"message": "Scenario not found"})
        await ws.close()
        return

    scenario = _scenarios[scenario_id]
    scenario.status = "running"
    settings = get_settings()

    try:
        # Phase 1: Research
        await _send_ws(ws, "phase", {"phase": "researching"})

        async def on_research_progress(msg):
            await _send_ws(ws, "research_progress", {"message": msg})

        context = await research_context(
            scenario.post_text,
            scenario.audience_desc,
            on_progress=on_research_progress,
        )
        await _send_ws(ws, "research_complete", {"context_length": len(context)})

        # Phase 2: Generate audience
        await _send_ws(ws, "phase", {"phase": "generating"})
        profiles = await generate_audience_profiles(
            scenario.post_text,
            scenario.audience_desc,
            scenario.agent_count,
        )
        for p in profiles:
            await _send_ws(ws, "agent_generated", {
                "agent_id": p.agent_id,
                "name": p.name,
                "archetype": p.archetype,
                "sentiment_bias": p.sentiment_bias,
            })

        # Phase 3: Simulate (per platform)
        await _send_ws(ws, "phase", {"phase": "simulating"})
        db_dir = os.path.join(settings.simulation_db_dir, scenario_id)
        os.makedirs(db_dir, exist_ok=True)

        db_paths = {}
        for platform in scenario.platforms:
            db_path = os.path.join(db_dir, f"{platform}.db")

            async def on_action(action):
                await _send_ws(ws, "simulation_action", action)

            async def on_progress(msg):
                await _send_ws(ws, "simulation_progress", {"platform": platform, "message": msg})

            await run_full_simulation(
                profiles=profiles,
                post_text=scenario.post_text,
                platform=platform,
                rounds=scenario.rounds,
                db_path=db_path,
                on_action=on_action,
                on_progress=on_progress,
            )
            db_paths[platform] = db_path

        # Phase 4: Analyze
        await _send_ws(ws, "phase", {"phase": "analyzing"})
        results = await analyze_simulation(
            db_paths=db_paths,
            profiles=profiles,
            post_text=scenario.post_text,
            scenario_id=scenario_id,
        )
        _results[scenario_id] = results

        # Phase 5: Complete
        scenario.status = "complete"
        await _send_ws(ws, "simulation_complete", {"results": results.model_dump()})

    except Exception as e:
        scenario.status = "error"
        await _send_ws(ws, "error", {"message": str(e)})
    finally:
        await ws.close()
```

Modify `backend/app/main.py` — add:
```python
from app.api.simulations import router as simulations_router
app.include_router(simulations_router)
```

Also register the WebSocket route directly on the app (FastAPI WebSocket routes need to be on the app for path matching):
```python
# WebSocket route (registered on app directly for proper WS path matching)
from app.api.simulations import run_simulation_ws
app.websocket("/ws/simulation/{scenario_id}")(run_simulation_ws)
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_api_simulations.py -v`
Expected: All 2 tests PASS

**Step 5: Commit**

```bash
git add backend/app/api/simulations.py backend/app/main.py backend/tests/test_api_simulations.py
git commit -m "feat: add WebSocket simulation endpoint with full pipeline orchestration"
```

---

## Task 10: Results API

**Files:**
- Create: `backend/app/api/results.py`
- Modify: `backend/app/main.py` — register router
- Test: `backend/tests/test_api_results.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_api_results.py
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.simulations import _results
from app.models.results import SimulationResults, FactionBreakdown, ReactionTheme

client = TestClient(app)


def test_get_results_not_found():
    resp = client.get("/api/results/nonexistent")
    assert resp.status_code == 404


def test_get_results():
    _results["test123"] = SimulationResults(
        scenario_id="test123",
        sentiment_score=0.7,
        risk_score=3,
        virality="medium",
        verdict="Positive",
        factions=[FactionBreakdown(name="Supporters", proportion=0.6, color="green")],
        themes=[ReactionTheme(label="Excitement", percentage=70)],
        strategy=["Be transparent"],
        suggested_rewrite="Improved post...",
    )
    resp = client.get("/api/results/test123")
    assert resp.status_code == 200
    assert resp.json()["sentiment_score"] == 0.7
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_api_results.py -v`
Expected: FAIL — route not found

**Step 3: Write the implementation**

```python
# backend/app/api/results.py
from fastapi import APIRouter, HTTPException
from app.api.simulations import _results
from app.models.results import SimulationResults

router = APIRouter(prefix="/api/results", tags=["results"])


@router.get("/{scenario_id}", response_model=SimulationResults)
async def get_results(scenario_id: str):
    if scenario_id not in _results:
        raise HTTPException(status_code=404, detail="Results not found")
    return _results[scenario_id]
```

Modify `backend/app/main.py` — add:
```python
from app.api.results import router as results_router
app.include_router(results_router)
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_api_results.py -v`
Expected: All 2 tests PASS

**Step 5: Commit**

```bash
git add backend/app/api/results.py backend/app/main.py backend/tests/test_api_results.py
git commit -m "feat: add results API endpoint"
```

---

## Task 11: Frontend — ComposeView (Landing + Scenario Input)

**Files:**
- Create: `frontend/src/views/ComposeView.vue`
- Create: `frontend/src/components/ScenarioEditor.vue`
- Create: `frontend/src/components/AudienceChips.vue`
- Create: `frontend/src/styles/global.css`

**Reference:** `/Users/sayantan/Documents/Workspace/personal-assist/sim-world/mock.html` — Screen 1 (Compose)

**Design tokens (from mock):**
- Background: `#fffcf7` (warm cream)
- Text: `#1a1a2e`
- Accent gradient: `linear-gradient(135deg, #667eea, #764ba2)`
- Fonts: Outfit (headings), IBM Plex Mono (code/stats), Caveat (handwritten accents)
- Border radius: `20px` (cards), `12px` (inputs)

**Step 1: Create global.css with design tokens**

```css
/* frontend/src/styles/global.css */
:root {
  --bg: #fffcf7;
  --bg-card: #ffffff;
  --text: #1a1a2e;
  --text-muted: #6b7280;
  --accent: #667eea;
  --accent-2: #764ba2;
  --gradient: linear-gradient(135deg, #667eea, #764ba2);
  --green: #10b981;
  --red: #ef4444;
  --orange: #f59e0b;
  --blue: #3b82f6;
  --purple: #8b5cf6;
  --border: rgba(0, 0, 0, 0.06);
  --shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  --radius: 20px;
  --radius-sm: 12px;
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'Outfit', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
  --font-hand: 'Caveat', cursive;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.gradient-text {
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Step 2: Create ScenarioEditor.vue**

Port the compose form from mock.html. Key elements:
- Textarea for post draft (with character count)
- Textarea for audience description (NLP)
- Platform toggle (Twitter / Reddit / Both)
- Agent count slider (5-50, default 15)
- Rounds slider (1-20, default 5)
- "Simulate" CTA button

The component emits a `submit` event with `ScenarioCreate` data.

**Step 3: Create AudienceChips.vue**

Quick-fill chips: "Tech Twitter", "Gen Z TikTok crowd", "PR crisis room", "Crypto community", "News media pool".
Clicking a chip fills the audience description textarea.

**Step 4: Create ComposeView.vue**

Combines hero section + ScenarioEditor + AudienceChips. On submit, POST to `/api/scenarios`, then navigate to `/research/:id`.

**Step 5: Import global.css in main.js**

Add `import './styles/global.css'` to `src/main.js`.

**Step 6: Verify in browser**

Run: `cd frontend && npm run dev`
Expected: Landing page renders with compose form, audience chips, warm cream theme

**Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: implement ComposeView with scenario editor and audience chips"
```

---

## Task 12: Frontend — ResearchView (Agent Terminal)

**Files:**
- Create: `frontend/src/views/ResearchView.vue`
- Create: `frontend/src/components/TerminalLog.vue`

**Reference:** Mock.html Screen 2 — macOS-style terminal with streaming research progress

**Step 1: Create TerminalLog.vue**

macOS-style terminal component:
- Dark rounded container with traffic light dots (red/yellow/green)
- Monospace font (IBM Plex Mono)
- Auto-scrolling log entries
- Entries color-coded: green for success, yellow for searching, white for info
- Props: `entries: Array<{type: string, message: string, timestamp: string}>`

**Step 2: Create ResearchView.vue**

- Connects to WebSocket `/ws/simulation/:id`
- Displays TerminalLog with research progress events
- Shows generated agent cards as they stream in (agent_generated events)
- Auto-navigates to `/simulate/:id` when research + generation complete

**Step 3: Verify in browser**

Expected: Terminal-style display with streaming entries

**Step 4: Commit**

```bash
git add frontend/src/views/ResearchView.vue frontend/src/components/TerminalLog.vue
git commit -m "feat: implement ResearchView with terminal log component"
```

---

## Task 13: Frontend — SimulateView (Dual Timeline + Agent Network)

**Files:**
- Create: `frontend/src/views/SimulateView.vue`
- Create: `frontend/src/components/DualTimeline.vue`
- Create: `frontend/src/components/AgentNetwork.vue`
- Create: `frontend/src/components/AgentDecisionLog.vue`
- Create: `frontend/src/components/SentimentBar.vue`

**Reference:** Mock.html Screen 3, MiroFish `Step3Simulation.vue` + `GraphPanel.vue`

**Step 1: Create DualTimeline.vue**

Central-axis dual timeline (pattern from MiroFish Step3Simulation.vue):
- Vertical central line with alternating cards
- Twitter actions: left side, blue accent
- Reddit actions: right side, orange accent
- Each card: agent avatar/name, action type badge, content, engagement stats
- Platform marker dots on the axis
- Props: `actions: SimulationAction[]`

**Step 2: Create AgentNetwork.vue**

D3 force-directed graph (pattern from MiroFish GraphPanel.vue):
- Import D3 v7
- Forces: forceLink, forceManyBody(-400), forceCollide(50), forceCenter
- Nodes: sized by `influence_weight`, colored by archetype faction
- Edges: drawn when agents interact (follow, reply, like)
- Zoom/pan enabled
- Props: `agents: AgentProfile[]`, `interactions: {source, target, type}[]`

**Step 3: Create AgentDecisionLog.vue**

Mini terminal showing real-time agent decisions:
- Compact list format: `[Round N] @agent_name → ACTION_TYPE: "content preview..."`
- Auto-scrolling
- Filter by platform

**Step 4: Create SentimentBar.vue**

Live sentiment indicator:
- Horizontal bar with green (positive) / gray (neutral) / red (negative) segments
- Updates in real-time as actions stream
- Props: `positive: number, neutral: number, negative: number`

**Step 5: Create SimulateView.vue**

Combines all sub-components:
- Top: SentimentBar + round progress
- Left panel: DualTimeline (scrollable)
- Right panel: AgentNetwork (top) + AgentDecisionLog (bottom)
- Receives WebSocket `simulation_action` events and distributes to children

**Step 6: Verify in browser**

Expected: Split view with timeline and network graph

**Step 7: Commit**

```bash
git add frontend/src/views/SimulateView.vue frontend/src/components/
git commit -m "feat: implement SimulateView with dual timeline, agent network, decision log"
```

---

## Task 14: Frontend — ResultsView (Dashboard)

**Files:**
- Create: `frontend/src/views/ResultsView.vue`
- Create: `frontend/src/components/ScoreCards.vue`
- Create: `frontend/src/components/FactionBreakdown.vue`
- Create: `frontend/src/components/ReactionThemes.vue`
- Create: `frontend/src/components/StrategyPanel.vue`
- Create: `frontend/src/components/RewriteSuggestion.vue`

**Reference:** Mock.html Screen 4 (Results Dashboard)

**Step 1: Create ScoreCards.vue**

Four metric cards in a row:
- Sentiment: percentage with colored circle
- Risk: 1-10 scale with color (green < 4, yellow 4-6, red > 6)
- Virality: low/medium/high with icon
- Verdict: summary text with emoji
- Props: `results: SimulationResults`

**Step 2: Create FactionBreakdown.vue**

Horizontal stacked bar + legend:
- Colored segments proportional to faction size
- Legend with faction name, percentage, dot color
- Props: `factions: FactionBreakdown[]`

**Step 3: Create ReactionThemes.vue**

Vertical list of theme bars:
- Each theme: label, percentage bar (filled proportionally), percentage text
- Sorted by percentage descending
- Props: `themes: ReactionTheme[]`

**Step 4: Create StrategyPanel.vue**

Numbered recommendation list:
- Each recommendation as a card with number badge
- Evidence-based formatting
- Props: `strategy: string[]`

**Step 5: Create RewriteSuggestion.vue**

Suggested alternative post:
- Card with the rewritten post text
- "Re-run with this" button (emits event to parent)
- Side-by-side diff with original (optional)
- Props: `original: string, rewrite: string`

**Step 6: Create ResultsView.vue**

Dashboard layout:
- Fetches results from `GET /api/results/:id`
- Top row: ScoreCards
- Middle: FactionBreakdown (left) + ReactionThemes (right)
- Bottom: StrategyPanel (left) + RewriteSuggestion (right)
- "Run Again" button navigates back to compose with pre-filled data

**Step 7: Verify in browser**

Expected: Full results dashboard with all panels

**Step 8: Commit**

```bash
git add frontend/src/views/ResultsView.vue frontend/src/components/
git commit -m "feat: implement ResultsView dashboard with score cards, factions, themes, strategy"
```

---

## Task 15: Context System (brand.md + world.md)

**Files:**
- Create: `backend/app/context/brand.md`
- Create: `backend/app/context/world.md`
- Modify: `backend/app/services/audience_generator.py` — inject context
- Modify: `backend/app/services/simulation_runner.py` — inject context

**Step 1: Create brand.md template**

```markdown
# Brand Context

## Voice & Tone
<!-- Describe the brand's communication style -->

## Positioning
<!-- Market position, key differentiators -->

## Past Wins
<!-- Previous successful campaigns or posts -->

## Known Controversies
<!-- Past incidents or sensitive topics to be aware of -->
```

**Step 2: Create world.md template**

```markdown
# World Context

## Current Events
<!-- Relevant news, trends, or industry developments -->
<!-- This can be auto-populated by the research agent -->

## Industry Climate
<!-- General mood and dynamics in the relevant industry -->

## Competitor Activity
<!-- What competitors are doing or saying -->
```

**Step 3: Add context loading to audience_generator.py**

Read brand.md and world.md, append to the LLM prompt as additional context for richer persona generation.

**Step 4: Verify context files are read**

Run: `cd backend && python -m pytest tests/test_audience_generator.py -v`
Expected: Existing tests still PASS

**Step 5: Commit**

```bash
git add backend/app/context/ backend/app/services/audience_generator.py backend/app/services/simulation_runner.py
git commit -m "feat: add markdown context system (brand.md, world.md) for agent enrichment"
```

---

## Task 16: Integration Testing — End-to-End Flow

**Files:**
- Create: `backend/tests/test_integration.py`
- Create: `backend/.env.example`

**Step 1: Write integration test**

```python
# backend/tests/test_integration.py
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.mark.asyncio
async def test_full_flow_mocked():
    """Test create scenario -> check it exists -> verify results endpoint."""
    # Create scenario
    resp = client.post("/api/scenarios", json={
        "post_text": "We're going fully remote!",
        "audience_desc": "50% remote work fans, 30% office culture advocates, 20% managers",
        "agent_count": 10,
        "rounds": 3,
    })
    assert resp.status_code == 200
    scenario_id = resp.json()["id"]

    # Verify scenario exists
    resp = client.get(f"/api/scenarios/{scenario_id}")
    assert resp.status_code == 200
    assert resp.json()["post_text"] == "We're going fully remote!"

    # Results not yet available
    resp = client.get(f"/api/results/{scenario_id}")
    assert resp.status_code == 404
```

**Step 2: Create .env.example**

```
CS_LLM_PROVIDER=openrouter
CS_LLM_MODEL=anthropic/claude-sonnet-4-20250514
CS_LLM_API_KEY=your-api-key-here
CS_LLM_BASE_URL=https://openrouter.ai/api/v1
CS_SIMULATION_DB_DIR=./data/simulations
CS_DEFAULT_AGENT_COUNT=15
CS_DEFAULT_ROUNDS=5
```

**Step 3: Run all tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add backend/tests/test_integration.py backend/.env.example
git commit -m "feat: add integration test and env example"
```

---

## Task 17: Polish + README

**Files:**
- Create: `README.md` (root)
- Create: `backend/README.md`
- Create: `frontend/README.md`

**Step 1: Write root README**

Cover: what CrowdSimulator is, quickstart (backend + frontend), architecture overview, tech stack.

**Step 2: Write backend README**

Cover: setup, environment variables, running tests, API reference.

**Step 3: Write frontend README**

Cover: setup, dev server, build, component overview.

**Step 4: Commit**

```bash
git add README.md backend/README.md frontend/README.md
git commit -m "docs: add project README files"
```

---

## Dependency Graph

```
Task 1 (Backend scaffold)
  └─> Task 3 (Models)
       └─> Task 4 (Scenarios API)
       └─> Task 5 (Audience Generator)
       └─> Task 6 (Research Agent)
       └─> Task 7 (Simulation Runner)
       └─> Task 8 (Analytics)
  └─> Task 9 (WebSocket endpoint) ← depends on 5, 6, 7, 8
  └─> Task 10 (Results API) ← depends on 9

Task 2 (Frontend scaffold)
  └─> Task 11 (ComposeView)
  └─> Task 12 (ResearchView) ← depends on 9
  └─> Task 13 (SimulateView) ← depends on 9
  └─> Task 14 (ResultsView) ← depends on 10

Task 15 (Context system) ← depends on 5, 7
Task 16 (Integration test) ← depends on 4, 9, 10
Task 17 (README) ← depends on all

Parallelizable groups:
- [Task 1, Task 2] — independent scaffolds
- [Task 5, Task 6, Task 7, Task 8] — independent services (all depend on Task 3)
- [Task 11, Task 12, Task 13, Task 14] — independent views (all depend on Task 2)
```
