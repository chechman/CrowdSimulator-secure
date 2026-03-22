<template>
  <div class="sim-view">
    <!-- Status bar -->
    <div class="sv-bar">
      <div class="sv-left">
        <div class="dot-live" v-if="!sim.state.simulationComplete"></div>
        <div class="dot-done" v-else></div>
        <span class="sv-phase">{{ sim.state.phaseLabel }}</span>
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

    <!-- Progress -->
    <div class="sv-progress"><div class="sv-progress-fill" :style="{ width: sim.progressPct.value + '%' }"></div></div>

    <!-- Main grid -->
    <div class="sv-grid">
      <div class="sv-timeline">
        <DualTimeline :actions="sim.state.timelineActions" />
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
import { ref, watch, onMounted, onUnmounted, Transition } from 'vue'
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
let timer = null

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
}

/* Status bar */
.sv-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: var(--white);
  border-bottom: 1px solid var(--border);
  gap: 12px;
  flex-shrink: 0;
}

.sv-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.sv-phase {
  font-size: 12px;
  font-weight: 600;
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
  color: var(--text3);
  padding: 3px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  letter-spacing: 0.3px;
}

/* Progress */
.sv-progress {
  width: 100%;
  height: 2px;
  background: var(--border);
  flex-shrink: 0;
}

.sv-progress-fill {
  height: 100%;
  background: var(--green);
  transition: width 0.5s ease;
}

/* Grid */
.sv-grid {
  display: grid;
  grid-template-columns: 55fr 45fr;
  flex: 1;
  overflow: hidden;
}

.sv-timeline {
  overflow: hidden;
  display: flex;
  padding: 6px;
}

.sv-timeline > * { flex: 1; min-height: 0; }

.sv-sidebar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 6px 6px 0;
  overflow: hidden;
}

.sv-graph {
  flex: 4;
  min-height: 0;
  display: flex;
  flex-direction: column;
  transition: flex 0.3s ease;
}

.sv-graph.expanded {
  flex: 1;
}

.sv-graph-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 4px 8px;
  flex-shrink: 0;
}

.sv-graph-expand {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 3px;
  color: var(--text3);
  background: var(--surface);
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
}

.sv-engagement > * { flex: 1; min-height: 0; }

.sv-log {
  flex: 3;
  min-height: 0;
  display: flex;
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

@media (max-width: 1000px) {
  .sv-grid { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
  .sv-center { display: none; }
}
</style>
