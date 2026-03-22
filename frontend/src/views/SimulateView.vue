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
      <div class="sv-sidebar">
        <div class="sv-graph">
          <InteractionGraph :agents="sim.state.agents" :actions="sim.state.logActions" />
        </div>
        <div class="sv-engagement">
          <AgentNetwork :agents="sim.state.agents" :interactions="sim.state.logActions" />
        </div>
        <div class="sv-log">
          <AgentDecisionLog :actions="sim.state.logActions" />
        </div>
      </div>
    </div>

    <div class="error-banner" v-if="sim.state.errorMsg">{{ sim.state.errorMsg }}</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
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
}

.sv-graph > * { flex: 1; min-height: 0; }

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

.error-banner {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  border-radius: 6px;
  color: var(--red);
  font-size: 11px;
  z-index: 100;
  animation: fadeUp 0.2s ease-out;
}

@media (max-width: 1000px) {
  .sv-grid { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
  .sv-center { display: none; }
}
</style>
