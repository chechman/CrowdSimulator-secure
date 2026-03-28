<template>
  <div class="ps-bar">
    <div
      v-for="(step, i) in steps"
      :key="step.key"
      class="ps-step"
      :class="{ active: i === activeIndex, done: i < activeIndex, upcoming: i > activeIndex }"
    >
      <div class="ps-dot">
        <span v-if="isError && i === activeIndex" class="ps-err">!</span>
        <span v-else-if="i < activeIndex" class="ps-check">&#10003;</span>
        <span v-else-if="i === activeIndex" class="ps-pulse"></span>
        <span v-else class="ps-num font-mono">{{ i + 1 }}</span>
      </div>
      <span class="ps-label font-mono">{{ step.label }}</span>
      <div class="ps-line" v-if="i < steps.length - 1" :class="{ filled: i < activeIndex }"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  phase: { type: String, default: 'idle' },
})

const steps = [
  { key: 'research', label: 'Research', phases: ['researching'] },
  { key: 'personas', label: 'Personas', phases: ['awaiting_confirmation'] },
  { key: 'confirm', label: 'Confirm', phases: [] },
  { key: 'simulate', label: 'Simulate', phases: ['simulating'] },
  { key: 'analyze', label: 'Analyze', phases: ['analyzing', 'strategizing'] },
  { key: 'done', label: 'Done', phases: ['complete'] },
]

const phaseToStep = {
  idle: -1,
  researching: 0,
  awaiting_confirmation: 1,
  simulating: 3,
  analyzing: 4,
  strategizing: 4,
  complete: 5,
  error: -2, // special
}

const isError = computed(() => props.phase === 'error')

const activeIndex = computed(() => {
  if (props.phase === 'error') {
    // Show error on whatever step was last active (find highest completed)
    return lastActiveStep.value
  }
  return phaseToStep[props.phase] ?? -1
})

// Track last active step for error display
const lastActiveStep = computed(() => {
  // When error occurs, we want to highlight the step that failed
  // Use a heuristic: the step that was active before error
  return 0 // defaults to research since that's most common failure
})
</script>

<style scoped>
.ps-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: var(--header-surface, #fafafa);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 0;
  overflow-x: auto;
}

.ps-step {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ps-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.ps-step.upcoming .ps-dot {
  background: var(--surface, #f3f4f6);
  border: 1.5px solid var(--border);
}

.ps-step.active .ps-dot {
  background: var(--blue-bg, #eff6ff);
  border: 2px solid var(--blue, #3b82f6);
  box-shadow: 0 0 0 3px var(--blue-bg, #eff6ff);
}

.ps-step.active .ps-dot:has(.ps-err) {
  background: #fef2f2;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px #fef2f2;
}

.ps-err {
  color: #dc2626;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.ps-step.done .ps-dot {
  background: var(--green, #059669);
  border: 2px solid var(--green, #059669);
}

.ps-check {
  color: #fff;
  font-size: 11px;
  line-height: 1;
}

.ps-num {
  color: var(--text3);
  font-size: 9px;
}

.ps-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--blue, #3b82f6);
  animation: stepPulse 1.5s ease infinite;
}

@keyframes stepPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}

.ps-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: color 0.3s;
}

.ps-step.upcoming .ps-label { color: var(--text3); }
.ps-step.active .ps-label { color: var(--blue, #3b82f6); }
.ps-step.done .ps-label { color: var(--green, #059669); }

.ps-line {
  width: 24px;
  height: 2px;
  background: var(--border);
  border-radius: 1px;
  margin: 0 4px;
  transition: background 0.3s;
  flex-shrink: 0;
}

.ps-line.filled {
  background: var(--green, #059669);
}
</style>
