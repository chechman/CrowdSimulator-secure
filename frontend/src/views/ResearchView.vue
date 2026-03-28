<template>
  <div class="research-view">
    <!-- Pipeline steps -->
    <PipelineSteps :phase="sim.state.phase" />

    <!-- Status bar -->
    <div class="rv-status">
      <div class="rv-status-left">
        <div class="dot-live" v-if="!researchDone"></div>
        <div class="dot-done" v-else></div>
        <span class="rv-phase">{{ sim.state.phaseLabel }}</span>
      </div>
      <div class="rv-status-right">
        <span class="rv-model font-mono" v-if="sim.state.modelName">{{ sim.state.modelName }}</span>
        <span class="rv-src-count font-mono" v-if="sim.state.researchSources.length">
          {{ sim.state.researchSources.length }} sources
        </span>
        <span class="rv-id font-mono">{{ scenarioId }}</span>
        <span class="rv-time font-mono">{{ elapsed }}s</span>
      </div>
    </div>

    <!-- Main layout -->
    <div class="rv-layout">
      <!-- Left: Terminal + Search Results -->
      <div class="rv-left">
        <!-- Tabs -->
        <div class="rv-tabs">
          <button
            class="rv-tab font-mono"
            :class="{ active: leftTab === 'terminal' }"
            @click="leftTab = 'terminal'"
          >
            TERMINAL
          </button>
          <button
            class="rv-tab font-mono"
            :class="{ active: leftTab === 'results' }"
            @click="leftTab = 'results'"
          >
            SEARCH RESULTS
            <span class="rv-tab-badge" v-if="sim.state.searchResults.length">{{ sim.state.searchResults.length }}</span>
          </button>
        </div>

        <!-- Terminal panel -->
        <div class="rv-terminal" v-show="leftTab === 'terminal'">
          <TerminalLog
            :title="'sim-world agent'"
            :entries="sim.state.terminalEntries"
            :loading="!researchDone"
          />
          <Transition name="seedFade">
            <div class="rv-seed" v-if="sim.state.contextPreview">
              <div class="rv-seed-head font-mono">SEED CONTEXT</div>
              <div class="rv-seed-body">{{ sim.state.contextPreview }}</div>
            </div>
          </Transition>
        </div>

        <!-- Search Results panel -->
        <div class="rv-search-results" v-show="leftTab === 'results'">
          <div class="sr-empty font-mono" v-if="sim.state.searchResults.length === 0">
            No search results yet...
          </div>
          <div
            v-for="(sr, idx) in sim.state.searchResults"
            :key="sr.toolCallId || idx"
            class="sr-card"
            :class="{ expanded: expandedResult === idx }"
            @click="expandedResult = expandedResult === idx ? null : idx"
          >
            <div class="sr-header">
              <span class="sr-icon font-mono">{{ sr.tool === 'web_search' ? '◎' : '↗' }}</span>
              <span class="sr-query">{{ sr.query }}</span>
              <span class="sr-dur font-mono" v-if="sr.duration">{{ sr.duration }}s</span>
              <span class="sr-idx font-mono">#{{ idx + 1 }}</span>
            </div>
            <div class="sr-preview" v-if="expandedResult !== idx">
              {{ sr.content.slice(0, 180).replace(/\n/g, ' ') }}...
            </div>
            <div class="sr-full" v-if="expandedResult === idx">
              <pre class="sr-content">{{ sr.content }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Agent cards -->
      <div class="rv-agents">
        <div class="rv-agents-head">
          <span class="rv-agents-title font-mono">AUDIENCE SNAPSHOT</span>
          <span class="rv-agents-count font-mono" v-if="sim.state.agents.length">
            {{ sim.state.agents.length }}
          </span>
        </div>

        <!-- Archetype breakdown mini-bar -->
        <div class="rv-arch-bar" v-if="archetypeBreakdown.length">
          <div
            v-for="a in archetypeBreakdown" :key="a.name"
            class="rv-arch-seg"
            :style="{ flex: a.count, background: archetypeColor(a.name) }"
            :title="`${a.name}: ${a.count}`"
          ></div>
        </div>

        <div class="rv-agents-list">
          <TransitionGroup name="agentPop">
            <div
              v-for="agent in sim.state.agents"
              :key="agent.agent_id"
              class="ag-card"
              :class="{ expanded: expandedAgent === agent.agent_id }"
              @click="toggleExpand(agent.agent_id)"
            >
              <div class="ag-top">
                <div class="ag-av" :style="{ background: archetypeColor(agent.archetype) }">
                  {{ initials(agent.name) }}
                </div>
                <div class="ag-info">
                  <div class="ag-name">{{ agent.name }}</div>
                  <div class="ag-handle font-mono">@{{ agent.username }}</div>
                </div>
                <span
                  class="ag-arch font-mono"
                  :style="{ background: archetypeBg(agent.archetype), color: archetypeColor(agent.archetype), borderColor: archetypeBorder(agent.archetype) }"
                >{{ agent.archetype }}</span>
              </div>

              <!-- Demographics row -->
              <div class="ag-demo">
                <span class="ag-tag font-mono" v-if="agent.age">{{ agent.age }}y</span>
                <span class="ag-tag font-mono" v-if="agent.gender">{{ agent.gender }}</span>
                <span class="ag-tag font-mono" v-if="agent.mbti">{{ agent.mbti }}</span>
                <span class="ag-tag font-mono" v-if="agent.profession">{{ agent.profession }}</span>
              </div>

              <!-- Metrics row -->
              <div class="ag-metrics">
                <div class="ag-metric">
                  <span class="ag-mlbl font-mono">SENT</span>
                  <div class="ag-bar-track">
                    <div class="ag-bar-fill" :style="{ width: sentimentPct(agent.sentiment_bias) + '%' }" :class="sentimentClass(agent.sentiment_bias)"></div>
                  </div>
                  <span class="ag-mval font-mono" :class="sentimentClass(agent.sentiment_bias)">{{ formatSentiment(agent.sentiment_bias) }}</span>
                </div>
                <div class="ag-metric">
                  <span class="ag-mlbl font-mono">INFL</span>
                  <div class="ag-dots">
                    <span v-for="n in 5" :key="n" class="ag-dot" :class="{ active: n <= Math.round((agent.influence_weight || 0)) }"></span>
                  </div>
                </div>
                <div class="ag-metric">
                  <span class="ag-mlbl font-mono">ACT</span>
                  <div class="ag-bar-track ag-bar-sm">
                    <div class="ag-bar-fill act" :style="{ width: (agent.activity_level || 0.5) * 100 + '%' }"></div>
                  </div>
                </div>
              </div>

              <div class="ag-bio" v-if="agent.bio">{{ agent.bio }}</div>

              <!-- Expanded details -->
              <Transition name="expand">
                <div class="ag-expanded" v-if="expandedAgent === agent.agent_id">
                  <!-- Research basis — what data shaped this agent -->
                  <div class="ag-research" v-if="agent.research_basis">
                    <span class="ag-research-lbl font-mono">RESEARCH BASIS</span>
                    <p class="ag-research-text">{{ agent.research_basis }}</p>
                  </div>
                  <div class="ag-topics" v-if="agent.interested_topics && agent.interested_topics.length">
                    <span class="ag-topics-lbl font-mono">INTERESTS</span>
                    <div class="ag-topic-tags">
                      <span v-for="t in agent.interested_topics" :key="t" class="ag-topic-tag font-mono">{{ t }}</span>
                    </div>
                  </div>
                  <div class="ag-persona" v-if="agent.persona">
                    <span class="ag-persona-lbl font-mono">PERSONA</span>
                    <p class="ag-persona-text">{{ agent.persona }}</p>
                  </div>
                </div>
              </Transition>
            </div>
          </TransitionGroup>
        </div>

        <!-- Empty state -->
        <div class="rv-agents-empty" v-if="sim.state.agents.length === 0 && !researchDone">
          <!-- Progress ring -->
          <div class="empty-ring-wrap">
            <svg class="empty-ring" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" stroke-width="2.5" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--green)" stroke-width="2.5"
                stroke-linecap="round"
                :stroke-dasharray="125.6"
                :stroke-dashoffset="125.6 - (sim.state.agents.length / expectedAgents) * 125.6"
                transform="rotate(-90 24 24)"
                class="empty-ring-progress"
              />
            </svg>
            <span class="empty-ring-text font-mono">{{ sim.state.agents.length }}<small>/{{ expectedAgents }}</small></span>
          </div>

          <div class="empty-text">
            <div class="empty-label font-mono">GENERATING PERSONAS</div>
            <div class="empty-sub">Researching your topic and building audience profiles</div>
          </div>

          <!-- Minimal skeleton hints -->
          <div class="skel-hints">
            <div class="skel-hint" v-for="n in skelCount" :key="n" :style="{ animationDelay: (n * 0.15) + 's' }">
              <div class="skel-dot shimmer"></div>
              <div class="skel-line shimmer" :style="{ width: (45 + (n * 7) % 40) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation bar -->
    <Transition name="confirmSlide">
      <div class="rv-confirm" v-if="sim.state.awaitingConfirmation">
        <div class="rv-confirm-info">
          <span class="rv-confirm-count font-mono">{{ sim.state.agents.length }} PERSONAS</span>
          <span class="rv-confirm-sep">grounded in</span>
          <span class="rv-confirm-count font-mono">{{ sim.state.sourcesCount || sim.state.researchSources.length }} SOURCES</span>
          <span class="rv-confirm-sep">— ready for simulation</span>
        </div>
        <button class="btn-main rv-confirm-btn" @click="handleConfirm">
          Confirm &amp; Start Simulation &rarr;
        </button>
      </div>
    </Transition>

    <!-- Error display -->
    <Transition name="confirmSlide">
      <div class="rv-error-panel" v-if="sim.state.errorMsg || sim.state.errors.length">
        <div class="rv-error-header">
          <span class="rv-error-badge">ERROR</span>
          <span class="rv-error-title">{{ sim.state.errorMsg || sim.state.errors[sim.state.errors.length - 1]?.message }}</span>
        </div>
        <div class="rv-error-actions">
          <button class="btn-main rv-retry-btn" @click="retrySimulation">Retry</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulation } from '../composables/useSimulation'
import TerminalLog from '../components/TerminalLog.vue'
import PipelineSteps from '../components/PipelineSteps.vue'
import api from '../api'

const route = useRoute()
const router = useRouter()
const sim = useSimulation()

const scenarioId = computed(() => route.params.id)
const elapsed = ref(0)
const expectedAgents = ref(5)
let timer = null
const expandedAgent = ref(null)
const expandedResult = ref(null)
const leftTab = ref('terminal')

const skelCount = computed(() => Math.min(expectedAgents.value, 6))

// Auto-switch to results tab when first result arrives
watch(() => sim.state.searchResults.length, (len) => {
  if (len === 1) leftTab.value = 'results'
})

const researchDone = computed(() =>
  sim.state.phase !== 'idle' && sim.state.phase !== 'researching'
)

// Navigate to simulate view AFTER confirmation (when phase becomes simulating)
watch(() => sim.state.phase, (phase) => {
  if (phase === 'simulating' && !sim.state.awaitingConfirmation) {
    setTimeout(() => router.push(`/simulate/${scenarioId.value}`), 600)
  }
})

function handleConfirm() {
  sim.confirmSimulation()
}

function retrySimulation() {
  sim.disconnect()
  sim.reset()
  sim.connect(scenarioId.value)
  elapsed.value = 0
}

function toggleExpand(id) {
  expandedAgent.value = expandedAgent.value === id ? null : id
}

// Archetype helpers
const archetypeColorMap = {
  supporter: '#059669', skeptic: '#dc2626', neutral: '#3b82f6',
  journalist: '#7c3aed', troll: '#f97316', influencer: '#d97706',
  expert: '#0891b2', casual_observer: '#6b7280'
}
const archetypeColor = (arch) => archetypeColorMap[arch?.toLowerCase()] || '#6b7280'
const archetypeBg = (arch) => {
  const map = { supporter: '#ecfdf5', skeptic: '#fef2f2', neutral: '#eff6ff', journalist: '#f5f3ff', troll: '#fff7ed', influencer: '#fffbeb', expert: '#ecfeff', casual_observer: '#f9fafb' }
  return map[arch?.toLowerCase()] || '#f9fafb'
}
const archetypeBorder = (arch) => {
  const map = { supporter: '#a7f3d0', skeptic: '#fecaca', neutral: '#bfdbfe', journalist: '#ddd6fe', troll: '#fed7aa', influencer: '#fde68a', expert: '#a5f3fc', casual_observer: '#e5e7eb' }
  return map[arch?.toLowerCase()] || '#e5e7eb'
}
const initials = (name) => {
  if (!name) return '?'
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
const sentimentPct = (val) => Math.round(((val || 0) + 1) / 2 * 100)
const sentimentClass = (val) => {
  if (val > 0.2) return 'positive'
  if (val < -0.2) return 'negative'
  return 'neutral-s'
}
const formatSentiment = (val) => {
  if (val == null) return '0.00'
  return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)
}

const archetypeBreakdown = computed(() => {
  const counts = {}
  for (const a of sim.state.agents) {
    const arch = a.archetype?.toLowerCase() || 'neutral'
    counts[arch] = (counts[arch] || 0) + 1
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
})

onMounted(async () => {
  timer = setInterval(() => { if (!researchDone.value) elapsed.value++ }, 1000)
  try {
    const { data } = await api.get(`/scenarios/${scenarioId.value}`)
    expectedAgents.value = data.agent_count || 5
  } catch {}
  sim.connect(scenarioId.value)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.research-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Status bar */
.rv-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--white);
  flex-shrink: 0;
}

.rv-status-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rv-phase {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.rv-status-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rv-model {
  font-size: 9px;
  color: var(--blue, #3b82f6);
  background: var(--blue-bg, #eff6ff);
  padding: 2px 8px;
  border-radius: 3px;
  border: 1px solid var(--blue, #3b82f6);
  opacity: 0.8;
}

.rv-id {
  font-size: 10px;
  color: var(--text3);
  padding: 2px 6px;
  background: var(--surface);
  border-radius: 3px;
}

.rv-time {
  font-size: 10px;
  color: var(--text3);
}

.rv-src-count {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--blue-bg, #eff6ff);
  color: var(--blue, #3b82f6);
  border: 1px solid var(--blue-border, #bfdbfe);
}

/* Layout */
.rv-layout {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 0;
  flex: 1;
  overflow: hidden;
}

.rv-left {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Tabs */
.rv-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.rv-tab {
  padding: 6px 14px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text3);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rv-tab:hover { color: var(--text2); }
.rv-tab.active {
  color: var(--text);
  border-bottom-color: var(--text);
}

.rv-tab-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  background: var(--blue);
  color: #fff;
  line-height: 1.2;
}

.rv-terminal {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.rv-terminal > :first-child {
  flex: 1;
  min-height: 0;
}

/* Search Results panel */
.rv-search-results {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.sr-empty {
  padding: 32px 0;
  text-align: center;
  font-size: 10px;
  color: var(--text3);
  letter-spacing: 0.5px;
}

.sr-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: border-color 0.12s;
}

.sr-card:hover { border-color: var(--border2); }
.sr-card.expanded { border-color: var(--blue-border, #bfdbfe); }

.sr-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.sr-icon {
  font-size: 12px;
  color: var(--blue);
  flex-shrink: 0;
}

.sr-query {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sr-dur {
  font-size: 9px;
  color: var(--text3);
  flex-shrink: 0;
}

.sr-idx {
  font-size: 9px;
  color: var(--text3);
  flex-shrink: 0;
  padding: 1px 4px;
  background: var(--surface);
  border-radius: 3px;
}

.sr-preview {
  font-size: 11px;
  color: var(--text3);
  line-height: 1.4;
  overflow: hidden;
}

.sr-full {
  margin-top: 6px;
  border-top: 1px solid var(--border);
  padding-top: 8px;
}

.sr-content {
  font-size: 11px;
  line-height: 1.6;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
}

/* Seed card */
.rv-seed {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  flex-shrink: 0;
}

.rv-seed-head {
  font-size: 10px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.rv-seed-body {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text2);
}

/* Agents panel */
.rv-agents {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  overflow: hidden;
}

.rv-agents-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--header-surface-mix);
  flex-shrink: 0;
}

.rv-agents-title {
  font-size: 10px;
  font-weight: 600;
  color: var(--blue);
  letter-spacing: 0.5px;
}

.rv-agents-count {
  font-size: 10px;
  font-weight: 600;
  color: var(--purple);
  background: var(--purple-bg);
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid var(--purple-border);
}

/* Archetype breakdown bar */
.rv-arch-bar {
  display: flex;
  height: 6px;
  flex-shrink: 0;
  background: var(--surface);
}

.rv-arch-seg {
  min-width: 2px;
  transition: flex 0.4s ease;
}

.rv-agents-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

/* Agent card */
.ag-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 4px;
  transition: border-color 0.12s, box-shadow 0.12s;
  cursor: pointer;
}

.ag-card:hover { border-color: var(--border2); }
.ag-card.expanded { border-color: var(--green-border); box-shadow: 0 0 0 1px var(--green-border); }

.ag-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.ag-av {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.ag-info { flex: 1; min-width: 0; }

.ag-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ag-handle {
  font-size: 10px;
  color: var(--text3);
}

.ag-arch {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: capitalize;
  border: 1px solid;
  letter-spacing: 0.2px;
  flex-shrink: 0;
}

/* Demographics */
.ag-demo {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.ag-tag {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--surface);
  color: var(--text2);
  border: 1px solid var(--border);
}

/* Metrics */
.ag-metrics {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 4px;
}

.ag-metric {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ag-mlbl {
  font-size: 8px;
  color: var(--text3);
  letter-spacing: 0.3px;
  min-width: 26px;
  font-weight: 600;
}

.ag-bar-track {
  flex: 1;
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.ag-bar-sm { max-width: 60px; }

.ag-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.ag-bar-fill.positive { background: var(--green); }
.ag-bar-fill.negative { background: var(--red); }
.ag-bar-fill.neutral-s { background: var(--text3); }
.ag-bar-fill.act { background: var(--amber); }

.ag-mval {
  font-size: 9px;
  font-weight: 600;
  min-width: 30px;
  text-align: right;
}

.ag-mval.positive { color: var(--green); }
.ag-mval.negative { color: var(--red); }
.ag-mval.neutral-s { color: var(--text3); }

.ag-dots {
  display: flex;
  gap: 3px;
}

.ag-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--border);
}

.ag-dot.active {
  background: var(--green);
}

.ag-bio {
  font-size: 11px;
  line-height: 1.4;
  color: var(--text3);
  border-top: 1px solid var(--border);
  padding-top: 4px;
  margin-top: 2px;
}

/* Expanded details */
.ag-expanded {
  border-top: 1px solid var(--border);
  padding-top: 8px;
  margin-top: 6px;
}

.ag-topics {
  margin-bottom: 8px;
}

.ag-topics-lbl {
  font-size: 8px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 4px;
}

.ag-topic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.ag-topic-tag {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--blue-bg);
  color: var(--blue);
  border: 1px solid var(--blue-border);
}

/* Research basis */
.ag-research {
  margin-bottom: 8px;
  padding: 6px 8px;
  background: var(--amber-bg, #fffbeb);
  border: 1px solid var(--amber-border, #fde68a);
  border-radius: 4px;
}

.ag-research-lbl {
  font-size: 8px;
  font-weight: 600;
  color: var(--amber, #d97706);
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 3px;
}

.ag-research-text {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text);
}

.ag-persona {
  margin-bottom: 4px;
}

.ag-persona-lbl {
  font-size: 8px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 4px;
}

.ag-persona-text {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text2);
  max-height: 120px;
  overflow-y: auto;
}

/* Empty state */
.rv-agents-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex: 1;
  padding: 32px 20px;
}

.empty-ring-wrap {
  position: relative;
  width: 64px;
  height: 64px;
}

.empty-ring {
  width: 100%;
  height: 100%;
}

.empty-ring-progress {
  transition: stroke-dashoffset 0.6s ease;
}

.empty-ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.empty-ring-text small {
  font-size: 10px;
  font-weight: 500;
  color: var(--text3);
}

.empty-text {
  text-align: center;
}

.empty-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: var(--text3);
  margin-bottom: 6px;
}

.empty-sub {
  font-size: 12px;
  color: var(--text3);
  line-height: 1.5;
}

/* Skeleton hints */
.skel-hints {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 220px;
}

.skel-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  animation: skelIn 0.3s ease forwards;
}

@keyframes skelIn {
  to { opacity: 0.5; }
}

.skel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skel-line {
  height: 6px;
  border-radius: 3px;
}

.shimmer {
  background: linear-gradient(90deg, var(--border) 0%, var(--surface) 40%, var(--border) 80%);
  background-size: 300% 100%;
  animation: shimmerSlide 1.8s infinite ease-in-out;
}

@keyframes shimmerSlide {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

/* Confirmation bar */
.rv-confirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--green-bg);
  border-top: 2px solid var(--green);
  flex-shrink: 0;
}

.rv-confirm-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rv-confirm-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--green);
}

.rv-confirm-sep {
  font-size: 12px;
  color: var(--text2);
}

.rv-confirm-btn {
  background: var(--green);
  color: #fff;
  padding: 10px 24px;
  font-size: 13px;
  border-radius: 6px;
}

.rv-confirm-btn:hover {
  background: #047857;
}

/* Error panel */
.rv-error-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #1a0a0a;
  border-top: 2px solid #dc2626;
  flex-shrink: 0;
  gap: 16px;
}
.rv-error-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.rv-error-badge {
  background: #dc2626;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 3px;
  font-family: var(--mono);
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.rv-error-title {
  color: #fca5a5;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rv-error-actions {
  flex-shrink: 0;
}
.rv-retry-btn {
  background: #dc2626;
  color: #fff;
  padding: 7px 18px;
  font-size: 12px;
  border-radius: 5px;
  cursor: pointer;
  border: none;
  font-weight: 600;
}
.rv-retry-btn:hover {
  background: #b91c1c;
}

/* Transitions */
.agentPop-enter-active { animation: agentAppear 0.3s ease; }
@keyframes agentAppear {
  from { opacity: 0; transform: scale(0.95) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.seedFade-enter-active { transition: all 0.4s ease-out; }
.seedFade-enter-from { opacity: 0; transform: translateY(8px); }

.confirmSlide-enter-active { transition: all 0.3s ease-out; }
.confirmSlide-enter-from { opacity: 0; transform: translateY(20px); }
.confirmSlide-leave-active { transition: all 0.2s ease-in; }
.confirmSlide-leave-to { opacity: 0; transform: translateY(20px); }

.expand-enter-active { transition: all 0.25s ease-out; }
.expand-enter-from { opacity: 0; max-height: 0; }
.expand-leave-active { transition: all 0.15s ease-in; }
.expand-leave-to { opacity: 0; max-height: 0; }

@media (max-width: 900px) {
  .rv-layout { grid-template-columns: 1fr; }
  .rv-agents { border-left: none; border-top: 1px solid var(--border); }
}
</style>
