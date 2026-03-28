<template>
  <div class="sim-view">
    <!-- Status bar -->
    <div class="sv-bar">
      <div class="sv-left">
        <div class="dot-live" v-if="!sim.state.simulationComplete"></div>
        <div class="dot-done" v-else></div>
        <span class="sv-phase">{{ sim.state.phaseLabel }}</span>
        <span v-if="sim.state.isAB && sim.state.currentVariant" class="sv-variant-pill font-mono" :class="'vp-' + sim.state.currentVariant.id.toLowerCase()">
          VAR {{ sim.state.currentVariant.id }}
        </span>
      </div>
      <div class="sv-center">
        <SentimentBar
          :positive="sim.sentiment.value.positive"
          :neutral="sim.sentiment.value.neutral"
          :negative="sim.sentiment.value.negative"
        />
      </div>
      <div class="sv-right">
        <span class="sv-pill font-mono">R{{ sim.state.currentRound }}<span v-if="sim.state.totalRounds">/{{ sim.state.totalRounds }}</span></span>
        <span class="sv-pill font-mono">{{ sim.state.agents.length }} agents</span>
        <span class="sv-pill font-mono">{{ formatTime(elapsed) }}</span>
      </div>
    </div>

    <!-- A/B variant tabs -->
    <div class="sv-variant-bar" v-if="sim.state.isAB && sim.state.variants.length > 0">
      <button
        v-for="v in sim.state.variants"
        :key="v.id"
        class="sv-vtab font-mono"
        :class="[
          'vtab-' + v.id.toLowerCase(),
          { active: activeVariantTab === v.id, done: !!sim.state.variantResults[v.id] }
        ]"
        @click="activeVariantTab = v.id"
      >
        <span class="vtab-id">{{ v.id }}</span>
        <span class="vtab-text">{{ v.text?.slice(0, 40) }}{{ v.text?.length > 40 ? '...' : '' }}</span>
        <span class="vtab-status" v-if="sim.state.variantResults[v.id]">&#10003;</span>
        <span class="vtab-status running" v-else-if="sim.state.currentVariant?.id === v.id">&#9679;</span>
      </button>
    </div>

    <!-- Progress -->
    <div class="sv-progress"><div class="sv-progress-fill" :style="{ width: sim.progressPct.value + '%' }"></div></div>

    <!-- Main grid -->
    <div class="sv-grid">
      <div class="sv-timeline">
        <DualTimeline :actions="filteredTimelineActions" />
      </div>
      <div class="sv-sidebar" :class="{ 'graph-expanded': graphExpanded }">
        <div class="sv-graph" :class="{ expanded: graphExpanded }">
          <div class="sv-graph-toolbar">
            <button class="sv-graph-expand font-mono" @click="graphExpanded = !graphExpanded">
              {{ graphExpanded ? '⊟ COLLAPSE' : '⊞ EXPAND' }}
            </button>
          </div>
          <div class="sv-graph-content">
            <InteractionGraph :agents="sim.state.agents" :actions="sim.state.logActions" />
          </div>
        </div>
        <div class="sv-engagement" v-show="!graphExpanded">
          <AgentNetwork :agents="sim.state.agents" :interactions="sim.state.logActions" />
        </div>
        <div class="sv-log" v-show="!graphExpanded">
          <AgentDecisionLog :actions="sim.state.logActions" />
        </div>
      </div>
    </div>

    <!-- Error stack -->
    <Transition name="errors">
      <div class="sv-errors" v-if="sim.state.errors.length">
        <div class="sv-error" v-for="(err, i) in sim.state.errors" :key="i" :class="err.type">
          <span class="sv-error-badge font-mono">{{ err.type === 'fatal' ? 'ERROR' : err.tool ? err.tool.toUpperCase() + ' FAILED' : 'ERROR' }}</span>
          <span class="sv-error-msg">{{ err.message }}</span>
          <button class="sv-error-dismiss" @click="sim.state.errors.splice(i, 1)">&times;</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, Transition } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulation } from '../composables/useSimulation'
import DualTimeline from '../components/DualTimeline.vue'
import AgentNetwork from '../components/AgentNetwork.vue'
import InteractionGraph from '../components/InteractionGraph.vue'
import AgentDecisionLog from '../components/AgentDecisionLog.vue'
import SentimentBar from '../components/SentimentBar.vue'

const route = useRoute()
const router = useRouter()
const sim = useSimulation()

const elapsed = ref(0)
const graphExpanded = ref(false)
const activeVariantTab = ref('A')
let timer = null

const filteredTimelineActions = computed(() => {
  if (!sim.state.isAB) return sim.state.timelineActions
  return sim.state.timelineActions.filter(a => a.variant_id === activeVariantTab.value)
})

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

watch(() => sim.state.simulationComplete, (complete) => {
  if (complete) setTimeout(() => router.push(`/results/${route.params.id}`), 1500)
})

onMounted(() => {
  timer = setInterval(() => { if (!sim.state.simulationComplete) elapsed.value++ }, 1000)
  sim.connect(route.params.id)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  sim.disconnect()
})
</script>

<style scoped>
.sim-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--page-tint);
}

/* Status bar */
.sv-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--header-surface);
  border-bottom: 1px solid var(--border);
  gap: 12px;
  flex-shrink: 0;
  box-shadow: inset 0 -1px 0 rgba(255,255,255,0.7);
}

.sv-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.sv-phase {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.sv-center {
  flex: 1;
  max-width: 240px;
}

.sv-right {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.sv-pill {
  font-size: 10px;
  color: var(--text2);
  padding: 5px 10px;
  background: var(--panel-glass);
  border: 1px solid var(--border);
  border-radius: 999px;
  letter-spacing: 0.3px;
}

/* Progress */
.sv-progress {
  width: 100%;
  height: 4px;
  background: rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.sv-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--green), #34d399, var(--blue));
  transition: width 0.5s ease;
}

/* Grid */
.sv-grid {
  display: grid;
  grid-template-columns: 55fr 45fr;
  flex: 1;
  overflow: hidden;
  gap: 8px;
  padding: 8px;
}

.sv-timeline {
  overflow: hidden;
  display: flex;
  min-width: 0;
}

.sv-timeline > * { flex: 1; min-height: 0; }

.sv-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.sv-graph {
  flex: 4;
  min-height: 0;
  display: flex;
  flex-direction: column;
  transition: flex 0.3s ease;
  background: var(--panel-glass);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--panel-shadow);
}

.sv-graph.expanded {
  flex: 1;
}

.sv-graph-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 10px;
  flex-shrink: 0;
  background: var(--header-surface-mix);
  border-bottom: 1px solid var(--border);
}

.sv-graph-expand {
  font-size: 10px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--blue);
  background: var(--blue-bg);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.12s;
  letter-spacing: 0.3px;
}

.sv-graph-expand:hover {
  border-color: var(--border2);
  color: var(--text2);
}

.sv-graph-content {
  flex: 1;
  min-height: 0;
  display: flex;
}

.sv-graph-content > * { flex: 1; min-height: 0; }

.sv-sidebar.graph-expanded .sv-engagement,
.sv-sidebar.graph-expanded .sv-log {
  display: none;
}

.sv-engagement {
  flex: 3;
  min-height: 0;
  display: flex;
  background: var(--panel-glass);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--panel-shadow);
}

.sv-engagement > * { flex: 1; min-height: 0; }

.sv-log {
  flex: 3;
  min-height: 0;
  display: flex;
  background: var(--panel-glass);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--panel-shadow);
}

.sv-log > * { flex: 1; min-height: 0; }

/* Error stack */
.sv-errors {
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 420px;
}

.sv-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  border-radius: 6px;
  animation: slideIn 0.2s ease-out;
}

.sv-error.fatal {
  border-color: var(--red);
  box-shadow: 0 0 12px var(--red-bg);
}

.sv-error-badge {
  font-size: 8px;
  font-weight: 700;
  color: var(--red);
  background: var(--white);
  border: 1px solid var(--red-border);
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.sv-error-msg {
  font-size: 11px;
  color: var(--red);
  line-height: 1.35;
  flex: 1;
  word-break: break-word;
}

.sv-error-dismiss {
  font-size: 14px;
  color: var(--red);
  opacity: 0.5;
  cursor: pointer;
  background: none;
  border: none;
  flex-shrink: 0;
  line-height: 1;
  padding: 0 2px;
}

.sv-error-dismiss:hover { opacity: 1; }

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.errors-enter-active { transition: all 0.2s ease-out; }
.errors-enter-from { opacity: 0; transform: translateY(10px); }
.errors-leave-active { transition: all 0.15s ease-in; }
.errors-leave-to { opacity: 0; }

/* Variant pill in status bar */
.sv-variant-pill {
  font-size: 9px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}

.vp-a { background: var(--blue-bg); color: var(--blue); border: 1px solid var(--blue-border); }
.vp-b { background: var(--purple-bg); color: var(--purple); border: 1px solid var(--purple-border); }
.vp-c { background: var(--green-bg); color: var(--green); border: 1px solid var(--green-border); }
.vp-d { background: var(--amber-bg, #fffbeb); color: var(--amber); border: 1px solid var(--amber-border, #fde68a); }

/* Variant tab bar */
.sv-variant-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  background: var(--elevated-surface);
  flex-shrink: 0;
  overflow-x: auto;
  box-shadow: inset 0 -1px 0 rgba(255,255,255,0.7);
}

.sv-vtab {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 10px;
  color: var(--text3);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 0;
}

.sv-vtab:not(:last-child) {
  border-right: 1px solid var(--border);
}

.sv-vtab:hover { color: var(--text2); background: var(--panel-glass-strong); }

.sv-vtab.active {
  color: var(--text);
  background: var(--panel-glass-strong);
}

.vtab-a.active { border-bottom-color: var(--blue); }
.vtab-b.active { border-bottom-color: var(--purple); }
.vtab-c.active { border-bottom-color: var(--green); }
.vtab-d.active { border-bottom-color: var(--amber); }

.vtab-id {
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
}

.vtab-a .vtab-id { color: var(--blue); }
.vtab-b .vtab-id { color: var(--purple); }
.vtab-c .vtab-id { color: var(--green); }
.vtab-d .vtab-id { color: var(--amber); }

.vtab-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 9px;
  color: var(--text3);
}

.vtab-status {
  font-size: 10px;
  color: var(--green);
  flex-shrink: 0;
}

.vtab-status.running {
  color: var(--blue);
  animation: pulse 1.5s ease infinite;
}

.sv-vtab.done { opacity: 0.7; }
.sv-vtab.done.active { opacity: 1; }

@media (max-width: 1000px) {
  .sv-grid { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
  .sv-center { display: none; }
}
</style>
