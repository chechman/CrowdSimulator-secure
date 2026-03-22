<template>
  <div class="results-view">
    <div class="results-inner">
      <!-- Loading -->
      <template v-if="loading">
        <div class="skel-grid">
          <div v-for="n in 4" :key="n" class="skel skel-card"></div>
        </div>
        <div class="skel-row">
          <div class="skel skel-panel"></div>
          <div class="skel skel-panel"></div>
        </div>
      </template>

      <!-- Content -->
      <template v-else-if="results">
        <!-- Header -->
        <div class="res-head">
          <div class="res-head-left">
            <h1 class="res-title">Simulation Report</h1>
            <span class="res-badge font-mono">{{ results.scenario_id }}</span>
            <span class="res-badge font-mono" v-if="results.agents">{{ results.agents.length }} agents</span>
            <span class="res-badge font-mono" v-if="results.actions">{{ results.actions.length }} actions</span>
          </div>
          <div class="res-head-right">
            <button class="btn-outline" @click="router.push('/')">
              &larr; New Simulation
            </button>
          </div>
        </div>

        <!-- Original post preview -->
        <div class="res-original" v-if="originalPost">
          <span class="res-orig-lbl font-mono">ORIGINAL POST</span>
          <p class="res-orig-text">{{ originalPost }}</p>
        </div>

        <!-- Score cards -->
        <section class="res-section">
          <ScoreCards :results="results" />
        </section>

        <!-- Factions + Themes -->
        <section class="res-row two-col">
          <FactionBreakdown :factions="results.factions" />
          <ReactionThemes :themes="results.themes" />
        </section>

        <!-- Agent Interaction Graph -->
        <section class="res-section" v-if="results.agents && results.agents.length">
          <div class="card">
            <div class="pnl-h">
              <span class="pnl-t">AGENT INTERACTION NETWORK</span>
              <span class="pnl-meta font-mono">{{ results.agents.length }} nodes · {{ edgeCount }} links</span>
            </div>
            <div class="pnl-b graph-container">
              <InteractionGraph :agents="results.agents" :actions="results.actions || []" />
            </div>
          </div>
        </section>

        <!-- Agent Profiles -->
        <section class="res-section" v-if="results.agents && results.agents.length">
          <div class="card">
            <div class="pnl-h">
              <span class="pnl-t">AGENT PROFILES</span>
              <span class="pnl-meta font-mono">{{ results.agents.length }} personas</span>
            </div>
            <div class="pnl-b">
              <!-- Archetype breakdown bar -->
              <div class="rp-arch-bar" v-if="archetypeBreakdown.length">
                <div
                  v-for="a in archetypeBreakdown" :key="a.name"
                  class="rp-arch-seg"
                  :style="{ flex: a.count, background: archColor(a.name) }"
                  :title="`${a.name}: ${a.count}`"
                ></div>
              </div>
              <div class="rp-arch-legend">
                <span v-for="a in archetypeBreakdown" :key="a.name" class="rp-arch-item font-mono">
                  <span class="rp-arch-dot" :style="{ background: archColor(a.name) }"></span>
                  {{ a.name }} ({{ a.count }})
                </span>
              </div>
              <div class="rp-grid">
                <div
                  v-for="agent in results.agents" :key="agent.agent_id"
                  class="rp-card"
                  :class="{ expanded: expandedAgent === agent.agent_id }"
                  @click="expandedAgent = expandedAgent === agent.agent_id ? null : agent.agent_id"
                >
                  <div class="rp-top">
                    <div class="rp-av" :style="{ background: archColor(agent.archetype) }">
                      {{ initials(agent.name) }}
                    </div>
                    <div class="rp-info">
                      <div class="rp-name">{{ agent.name }}</div>
                      <div class="rp-handle font-mono">@{{ agent.username }}</div>
                    </div>
                    <span class="rp-arch-badge font-mono" :style="{ color: archColor(agent.archetype) }">{{ agent.archetype }}</span>
                  </div>
                  <div class="rp-demo font-mono">
                    <span v-if="agent.age">{{ agent.age }}y</span>
                    <span v-if="agent.gender">{{ agent.gender }}</span>
                    <span v-if="agent.mbti">{{ agent.mbti }}</span>
                    <span v-if="agent.profession">{{ agent.profession }}</span>
                  </div>
                  <div class="rp-metrics">
                    <div class="rp-m">
                      <span class="rp-ml font-mono">SENT</span>
                      <span class="rp-mv font-mono" :class="sentClass(agent.sentiment_bias)">{{ fmtSent(agent.sentiment_bias) }}</span>
                    </div>
                    <div class="rp-m">
                      <span class="rp-ml font-mono">INFL</span>
                      <span class="rp-mv font-mono">{{ (agent.influence_weight || 0).toFixed(1) }}</span>
                    </div>
                    <div class="rp-m">
                      <span class="rp-ml font-mono">ACTS</span>
                      <span class="rp-mv font-mono">{{ agentActionCounts[agent.agent_id] || 0 }}</span>
                    </div>
                  </div>
                  <div class="rp-bio" v-if="agent.bio">{{ agent.bio }}</div>
                  <!-- Expanded -->
                  <div class="rp-expanded" v-if="expandedAgent === agent.agent_id">
                    <div class="rp-research" v-if="agent.research_basis">
                      <span class="rp-sub-lbl font-mono">RESEARCH BASIS</span>
                      <p>{{ agent.research_basis }}</p>
                    </div>
                    <div class="rp-topics" v-if="agent.interested_topics && agent.interested_topics.length">
                      <span class="rp-sub-lbl font-mono">INTERESTS</span>
                      <div class="rp-tag-row">
                        <span v-for="t in agent.interested_topics" :key="t" class="rp-tag font-mono">{{ t }}</span>
                      </div>
                    </div>
                    <div class="rp-persona" v-if="agent.persona">
                      <span class="rp-sub-lbl font-mono">PERSONA</span>
                      <p>{{ agent.persona }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Platform Engagement Breakdown -->
        <section class="res-row two-col" v-if="results.actions && results.actions.length">
          <div class="card">
            <div class="pnl-h">
              <span class="pnl-t">PLATFORM BREAKDOWN</span>
              <span class="pnl-meta font-mono">by action type</span>
            </div>
            <div class="pnl-b">
              <div class="pb-row" v-for="plat in platformStats" :key="plat.name">
                <div class="pb-plat">
                  <span class="pb-dot" :class="plat.name"></span>
                  <span class="pb-name font-mono">{{ plat.name.toUpperCase() }}</span>
                  <span class="pb-total font-mono">{{ plat.total }}</span>
                </div>
                <div class="pb-bars">
                  <div
                    v-for="at in plat.types" :key="at.type"
                    class="pb-bar"
                    :style="{ width: at.pct + '%', background: actionColor(at.type) }"
                    :title="`${at.type}: ${at.count}`"
                  ></div>
                </div>
                <div class="pb-legend">
                  <span v-for="at in plat.types" :key="at.type" class="pb-lg font-mono">
                    <span class="pb-lg-dot" :style="{ background: actionColor(at.type) }"></span>
                    {{ at.type.replace(/_/g, ' ').toLowerCase() }} ({{ at.count }})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Type Distribution -->
          <div class="card">
            <div class="pnl-h">
              <span class="pnl-t">ACTION DISTRIBUTION</span>
              <span class="pnl-meta font-mono">{{ results.actions.length }} total</span>
            </div>
            <div class="pnl-b">
              <div v-for="at in actionTypeDist" :key="at.type" class="ad-row">
                <span class="ad-label font-mono">{{ at.type.replace(/_/g, ' ') }}</span>
                <div class="ad-track">
                  <div class="ad-fill" :style="{ width: at.pct + '%', background: actionColor(at.type) }"></div>
                </div>
                <span class="ad-val font-mono">{{ at.count }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Simulation Feed / Timeline -->
        <section class="res-section" v-if="results.actions && results.actions.length">
          <div class="card">
            <div class="pnl-h">
              <span class="pnl-t">SIMULATION FEED</span>
              <div class="feed-controls">
                <button
                  class="feed-filter font-mono"
                  :class="{ active: feedFilter === 'all' }"
                  @click="feedFilter = 'all'"
                >ALL</button>
                <button
                  class="feed-filter font-mono"
                  :class="{ active: feedFilter === 'twitter' }"
                  @click="feedFilter = 'twitter'"
                >TWITTER</button>
                <button
                  class="feed-filter font-mono"
                  :class="{ active: feedFilter === 'reddit' }"
                  @click="feedFilter = 'reddit'"
                >REDDIT</button>
                <button
                  class="feed-filter font-mono"
                  :class="{ active: feedFilter === 'content' }"
                  @click="feedFilter = 'content'"
                >WITH CONTENT</button>
              </div>
            </div>
            <div class="pnl-b feed-list">
              <div v-for="action in filteredFeed" :key="action._key" class="feed-item" :class="action.platform">
                <div class="feed-round font-mono">R{{ action.round }}</div>
                <div class="feed-av" :style="{ background: agentColor(action.agent_id) }">
                  {{ initials(action.agent_name) }}
                </div>
                <div class="feed-body">
                  <div class="feed-top">
                    <span class="feed-name">{{ action.agent_name }}</span>
                    <span class="feed-type font-mono" :class="'ft-' + (action.action_type || '').toLowerCase()">{{ (action.action_type || '').replace(/_/g, ' ').toLowerCase() }}</span>
                    <span class="feed-plat font-mono">{{ action.platform }}</span>
                  </div>
                  <div class="feed-content" v-if="action.content">{{ action.content }}</div>
                  <div class="feed-stats font-mono" v-if="action.stats">
                    <span v-if="action.stats.likes">&#9829; {{ action.stats.likes }}</span>
                    <span v-if="action.stats.reposts">&#8635; {{ action.stats.reposts }}</span>
                    <span v-if="action.stats.replies">&#9993; {{ action.stats.replies }}</span>
                    <span v-if="action.stats.upvotes">&#9650; {{ action.stats.upvotes }}</span>
                    <span v-if="action.stats.downvotes">&#9660; {{ action.stats.downvotes }}</span>
                  </div>
                </div>
              </div>
              <div v-if="filteredFeed.length === 0" class="feed-empty font-mono">No actions match filter</div>
            </div>
          </div>
        </section>

        <!-- Strategy + Rewrite -->
        <section class="res-row two-col-55">
          <StrategyPanel :strategy="results.strategy" />
          <RewriteSuggestion
            :original="originalPost"
            :rewrite="results.suggested_rewrite"
            @rerun="handleRerun"
          />
        </section>

        <!-- Footer actions -->
        <div class="res-footer">
          <button class="btn-main" @click="router.push('/')">
            Run Another Simulation &rarr;
          </button>
        </div>
      </template>

      <!-- Error -->
      <template v-else-if="error">
        <div class="res-error">
          <div class="res-error-icon">!</div>
          <h2>Something went wrong</h2>
          <p>{{ error }}</p>
          <button class="btn-main" @click="loadResults">Retry</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import ScoreCards from '../components/ScoreCards.vue'
import FactionBreakdown from '../components/FactionBreakdown.vue'
import ReactionThemes from '../components/ReactionThemes.vue'
import StrategyPanel from '../components/StrategyPanel.vue'
import RewriteSuggestion from '../components/RewriteSuggestion.vue'
import InteractionGraph from '../components/InteractionGraph.vue'

const route = useRoute()
const router = useRouter()
const results = ref(null)
const loading = ref(true)
const error = ref(null)
const originalPost = ref('')
const expandedAgent = ref(null)
const feedFilter = ref('all')

const archColors = {
  supporter: '#059669', skeptic: '#dc2626', neutral: '#3b82f6',
  journalist: '#7c3aed', troll: '#f97316', influencer: '#d97706',
  expert: '#0891b2', casual_observer: '#6b7280'
}
const archColor = (arch) => archColors[arch?.toLowerCase()] || '#6b7280'
const initials = (name) => name ? name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
const sentClass = (v) => v > 0.2 ? 'pos' : v < -0.2 ? 'neg' : 'neut'
const fmtSent = (v) => v == null ? '0.00' : v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)

const actionColorMap = {
  CREATE_POST: '#7c3aed', CREATE_COMMENT: '#059669', COMMENT: '#059669',
  LIKE: '#ef4444', LIKE_POST: '#ef4444', LIKE_COMMENT: '#ef4444',
  REPOST: '#3b82f6', FOLLOW: '#0891b2', DO_NOTHING: '#9ca3af',
  UPVOTE_POST: '#f97316', DOWNVOTE_POST: '#6366f1',
}
const actionColor = (type) => actionColorMap[type] || '#6b7280'

const agentActionCounts = computed(() => {
  if (!results.value?.actions) return {}
  const counts = {}
  for (const a of results.value.actions) {
    if (a.agent_id !== undefined) counts[a.agent_id] = (counts[a.agent_id] || 0) + 1
  }
  return counts
})

const agentColor = (id) => {
  const agent = results.value?.agents?.find(a => a.agent_id === id)
  return archColor(agent?.archetype)
}

const archetypeBreakdown = computed(() => {
  if (!results.value?.agents) return []
  const counts = {}
  for (const a of results.value.agents) {
    const arch = a.archetype?.toLowerCase() || 'neutral'
    counts[arch] = (counts[arch] || 0) + 1
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
})

const edgeCount = computed(() => {
  if (!results.value?.actions) return 0
  const links = new Set()
  const byRound = {}
  for (const a of results.value.actions) {
    const r = a.round || 0
    if (!byRound[r]) byRound[r] = []
    byRound[r].push(a)
  }
  for (const roundActions of Object.values(byRound)) {
    const commenting = roundActions.filter(a => ['CREATE_COMMENT', 'COMMENT', 'LIKE_COMMENT', 'LIKE_POST', 'REPOST'].includes(a.action_type))
    for (let i = 0; i < commenting.length; i++) {
      for (let j = i + 1; j < commenting.length; j++) {
        const a = commenting[i].agent_id, b = commenting[j].agent_id
        if (a !== undefined && b !== undefined && a !== b) links.add([Math.min(a, b), Math.max(a, b)].join('-'))
      }
    }
  }
  return links.size
})

const platformStats = computed(() => {
  if (!results.value?.actions) return []
  const plats = {}
  for (const a of results.value.actions) {
    const p = a.platform || 'unknown'
    if (!plats[p]) plats[p] = {}
    const t = a.action_type || 'UNKNOWN'
    plats[p][t] = (plats[p][t] || 0) + 1
  }
  return Object.entries(plats).map(([name, types]) => {
    const total = Object.values(types).reduce((s, c) => s + c, 0)
    const typeList = Object.entries(types).map(([type, count]) => ({ type, count, pct: Math.round(count / total * 100) })).sort((a, b) => b.count - a.count)
    return { name, total, types: typeList }
  })
})

const actionTypeDist = computed(() => {
  if (!results.value?.actions) return []
  const counts = {}
  for (const a of results.value.actions) {
    const t = a.action_type || 'UNKNOWN'
    counts[t] = (counts[t] || 0) + 1
  }
  const total = results.value.actions.length
  return Object.entries(counts).map(([type, count]) => ({ type, count, pct: Math.round(count / total * 100) })).sort((a, b) => b.count - a.count)
})

const filteredFeed = computed(() => {
  if (!results.value?.actions) return []
  let actions = results.value.actions.map((a, i) => ({ ...a, _key: `act-${i}` }))
  if (feedFilter.value === 'twitter') actions = actions.filter(a => a.platform === 'twitter')
  else if (feedFilter.value === 'reddit') actions = actions.filter(a => a.platform === 'reddit')
  else if (feedFilter.value === 'content') actions = actions.filter(a => a.content)
  return actions
})

async function loadResults() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get(`/results/${route.params.id}`)
    results.value = data
    try {
      const scenario = await api.get(`/scenarios/${route.params.id}`)
      originalPost.value = scenario.data.post_text || ''
    } catch {
      originalPost.value = '(original post not available)'
    }
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Failed to load results'
  } finally {
    loading.value = false
  }
}

async function handleRerun(rewriteText) {
  try {
    const { data: scenario } = await api.get(`/scenarios/${route.params.id}`)
    const { data: newScenario } = await api.post('/scenarios', {
      post_text: rewriteText,
      audience_desc: scenario.audience_desc,
      platforms: scenario.platforms,
      agent_count: scenario.agent_count,
      rounds: scenario.rounds
    })
    router.push(`/research/${newScenario.id}`)
  } catch (e) {
    console.error('Failed to create rerun scenario:', e)
  }
}

onMounted(loadResults)
</script>

<style scoped>
.results-view {
  height: 100%;
  overflow-y: auto;
}

.results-inner {
  max-width: 1060px;
  margin: 0 auto;
  padding: 20px 24px 48px;
}

/* Header */
.res-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  animation: fadeUp 0.3s ease-out both;
}

.res-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.res-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.res-badge {
  font-size: 9px;
  padding: 2px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text3);
}

.btn-outline {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text2);
  background: var(--white);
  transition: all 0.12s;
}

.btn-outline:hover {
  border-color: var(--border2);
  color: var(--text);
}

/* Original post */
.res-original {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
  animation: fadeUp 0.3s ease-out both;
  animation-delay: 0.03s;
}

.res-orig-lbl {
  font-size: 9px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 4px;
}

.res-orig-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
  font-style: italic;
}

/* Sections */
.res-section {
  margin-bottom: 10px;
}

.res-row {
  display: grid;
  gap: 10px;
  margin-bottom: 10px;
}

.two-col { grid-template-columns: 1fr 1fr; }
.two-col-55 { grid-template-columns: 55fr 45fr; }

/* Graph container */
.graph-container {
  height: 360px;
  padding: 0;
}

.graph-container > * {
  height: 100%;
}

/* Agent Profiles */
.rp-arch-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
  gap: 1px;
}

.rp-arch-seg {
  min-width: 3px;
}

.rp-arch-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-bottom: 12px;
}

.rp-arch-item {
  font-size: 9px;
  color: var(--text3);
  display: flex;
  align-items: center;
  gap: 3px;
  text-transform: capitalize;
}

.rp-arch-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.rp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.rp-card {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  transition: border-color 0.12s;
  cursor: pointer;
}

.rp-card:hover { border-color: var(--border2); }
.rp-card.expanded { border-color: var(--green-border); box-shadow: 0 0 0 1px var(--green-border); }

.rp-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.rp-av {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.rp-info { flex: 1; min-width: 0; }
.rp-name { font-size: 11px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp-handle { font-size: 9px; color: var(--text3); }

.rp-arch-badge {
  font-size: 8px;
  font-weight: 600;
  text-transform: capitalize;
  flex-shrink: 0;
}

.rp-demo {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-bottom: 4px;
}

.rp-demo span {
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 2px;
  background: var(--surface);
  color: var(--text3);
}

.rp-metrics {
  display: flex;
  gap: 8px;
  margin-bottom: 3px;
}

.rp-m {
  display: flex;
  align-items: center;
  gap: 3px;
}

.rp-ml { font-size: 7px; color: var(--text3); font-weight: 600; }
.rp-mv { font-size: 9px; font-weight: 600; }
.rp-mv.pos { color: var(--green); }
.rp-mv.neg { color: var(--red); }
.rp-mv.neut { color: var(--text3); }

.rp-bio {
  font-size: 10px;
  color: var(--text3);
  line-height: 1.3;
  border-top: 1px solid var(--border);
  padding-top: 3px;
  margin-top: 2px;
}

.rp-expanded {
  border-top: 1px solid var(--border);
  padding-top: 6px;
  margin-top: 4px;
}

.rp-research {
  background: var(--amber-bg, #fffbeb);
  border: 1px solid var(--amber-border, #fde68a);
  border-radius: 4px;
  padding: 5px 7px;
  margin-bottom: 6px;
}

.rp-research p {
  font-size: 10px;
  line-height: 1.4;
  color: var(--text);
}

.rp-sub-lbl {
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 3px;
}

.rp-research .rp-sub-lbl { color: var(--amber, #d97706); }
.rp-topics .rp-sub-lbl, .rp-persona .rp-sub-lbl { color: var(--text3); }

.rp-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.rp-tag {
  font-size: 8px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--blue-bg, #eff6ff);
  color: var(--blue, #3b82f6);
  border: 1px solid var(--blue-border, #bfdbfe);
}

.rp-topics { margin-bottom: 6px; }

.rp-persona p {
  font-size: 10px;
  line-height: 1.4;
  color: var(--text2);
  max-height: 80px;
  overflow-y: auto;
}

/* Platform Breakdown */
.pb-row {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.pb-row:last-child { border-bottom: none; }

.pb-plat {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
}

.pb-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.pb-dot.twitter { background: var(--blue, #1d9bf0); }
.pb-dot.reddit { background: var(--reddit, #dc2626); }

.pb-name { font-size: 10px; font-weight: 600; color: var(--text); }
.pb-total { font-size: 9px; color: var(--text3); }

.pb-bars {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  gap: 1px;
  margin-bottom: 4px;
}

.pb-bar {
  min-width: 2px;
  border-radius: 2px;
}

.pb-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 8px;
}

.pb-lg {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 8px;
  color: var(--text3);
}

.pb-lg-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
}

/* Action Distribution */
.ad-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
}

.ad-row:last-child { border-bottom: none; }

.ad-label {
  font-size: 9px;
  color: var(--text2);
  min-width: 80px;
  text-transform: lowercase;
}

.ad-track {
  flex: 1;
  height: 4px;
  background: var(--surface);
  border-radius: 2px;
  overflow: hidden;
}

.ad-fill {
  height: 100%;
  border-radius: 2px;
}

.ad-val {
  font-size: 9px;
  font-weight: 600;
  color: var(--text3);
  min-width: 24px;
  text-align: right;
}

/* Feed */
.feed-controls {
  display: flex;
  gap: 3px;
}

.feed-filter {
  font-size: 8px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--text3);
  background: var(--surface);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.12s;
  letter-spacing: 0.3px;
}

.feed-filter:hover { border-color: var(--border2); color: var(--text2); }
.feed-filter.active { background: var(--green-bg); color: var(--green); border-color: var(--green-border); }

.feed-list {
  max-height: 500px;
  overflow-y: auto;
}

.feed-list::-webkit-scrollbar { width: 2px; }
.feed-list::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

.feed-item {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  align-items: flex-start;
}

.feed-item:last-child { border-bottom: none; }

.feed-item.twitter { border-left: 2px solid var(--blue, #1d9bf0); padding-left: 8px; }
.feed-item.reddit { border-left: 2px solid var(--reddit, #dc2626); padding-left: 8px; }

.feed-round {
  font-size: 8px;
  color: var(--text3);
  min-width: 20px;
  padding-top: 2px;
}

.feed-av {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.feed-body { flex: 1; min-width: 0; }

.feed-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.feed-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
}

.feed-type {
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 2px;
  background: var(--surface);
  color: var(--text3);
  font-weight: 600;
}

.ft-create_post { background: var(--purple-bg); color: var(--purple); }
.ft-comment, .ft-create_comment { background: var(--green-bg); color: var(--green); }
.ft-like, .ft-like_post, .ft-like_comment { background: var(--red-bg); color: var(--red); }
.ft-repost { background: var(--blue-bg); color: var(--blue); }

.feed-plat {
  font-size: 8px;
  color: var(--text3);
  margin-left: auto;
}

.feed-content {
  font-size: 11px;
  line-height: 1.45;
  color: var(--text2);
  margin-bottom: 2px;
}

.feed-stats {
  font-size: 8px;
  color: var(--text3);
  display: flex;
  gap: 8px;
}

.feed-empty {
  padding: 20px;
  text-align: center;
  font-size: 10px;
  color: var(--text3);
}

.res-footer {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  animation: fadeUp 0.3s ease-out both;
  animation-delay: 0.2s;
}

/* Skeleton */
.skel {
  background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.skel-card { height: 90px; }

.skel-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.skel-panel { height: 200px; }

/* Error */
.res-error {
  text-align: center;
  padding: 60px 28px;
}

.res-error-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  color: var(--red);
  font-size: 18px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.res-error h2 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 6px;
}

.res-error p {
  color: var(--text2);
  font-size: 12px;
  margin-bottom: 14px;
}

@media (max-width: 900px) {
  .two-col, .two-col-55 { grid-template-columns: 1fr; }
  .rp-grid { grid-template-columns: 1fr; }
  .skel-grid { grid-template-columns: 1fr 1fr; }
  .res-head { flex-direction: column; align-items: flex-start; gap: 8px; }
}
</style>
