<template>
  <div class="themes card">
    <div class="pnl-h">
      <span class="pnl-t">REACTION THEMES</span>
      <span class="th-badge font-mono">{{ themes.length }} detected</span>
    </div>
    <div class="pnl-b">
      <div v-for="(theme, i) in sortedThemes" :key="theme.label" class="th-row" :style="{ animationDelay: (i * 0.05) + 's' }">
        <div class="th-label">{{ theme.label }}</div>
        <div class="th-track">
          <div class="th-fill" :style="{ width: theme.percentage + '%', animationDelay: (i * 0.06 + 0.1) + 's' }"></div>
        </div>
        <div class="th-pct font-mono">{{ theme.percentage }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ themes: { type: Array, required: true } })
const sortedThemes = computed(() => [...props.themes].sort((a, b) => b.percentage - a.percentage))
</script>

<style scoped>
.themes { overflow: hidden; animation: fadeUp 0.3s ease-out both; animation-delay: 0.08s; }

.th-badge {
  font-size: 8px;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 600;
  background: var(--amber-bg);
  color: var(--amber);
  border: 1px solid var(--amber-border);
}

.th-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  animation: fadeIn 0.3s ease-out both;
}

.th-row:last-child { border-bottom: none; }

.th-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  flex: 0 0 38%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-track {
  flex: 1;
  height: 5px;
  background: var(--surface);
  border-radius: 3px;
  overflow: hidden;
}

.th-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--green);
  animation: barGrow 0.5s ease-out both;
  transform-origin: left;
}

@keyframes barGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.th-pct { font-size: 10px; font-weight: 600; color: var(--text3); min-width: 28px; text-align: right; }
</style>
