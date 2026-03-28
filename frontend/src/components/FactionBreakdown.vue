<template>
  <div class="faction card">
    <div class="pnl-h">
      <span class="pnl-t">FACTIONS</span>
      <span class="pnl-meta font-mono">{{ factions.length }} groups</span>
    </div>
    <div class="pnl-b">
      <div class="f-bar">
        <div
          v-for="(f, i) in sortedFactions"
          :key="f.name"
          class="f-seg"
          :style="{ width: (f.proportion * 100) + '%', background: resolveColor(f.color), animationDelay: (i * 0.05) + 's' }"
          :title="f.name + ': ' + Math.round(f.proportion * 100) + '%'"
        ></div>
      </div>
      <div class="f-list">
        <div v-for="f in sortedFactions" :key="f.name" class="f-item">
          <span class="f-dot" :style="{ background: resolveColor(f.color) }"></span>
          <span class="f-name">{{ f.name }}</span>
          <span class="f-pct font-mono">{{ Math.round(f.proportion * 100) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ factions: { type: Array, required: true } })

const colorMap = {
  green: 'var(--green)', red: 'var(--red)', blue: 'var(--blue)',
  purple: 'var(--purple)', orange: 'var(--amber)', gold: '#d97706',
  teal: '#0891b2', gray: 'var(--text3)'
}
const resolveColor = (c) => colorMap[c] || c
const sortedFactions = computed(() => [...props.factions].sort((a, b) => b.proportion - a.proportion))
</script>

<style scoped>
.faction {
  overflow: hidden;
  animation: fadeUp 0.3s ease-out both;
  animation-delay: 0.05s;
  border-radius: 12px;
  background: var(--elevated-surface);
}

.f-bar {
  display: flex;
  height: 10px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
  gap: 1px;
}

.f-seg {
  height: 100%;
  min-width: 3px;
  animation: segGrow 0.5s ease-out both;
}

.f-seg:first-child { border-radius: 4px 0 0 4px; }
.f-seg:last-child { border-radius: 0 4px 4px 0; }
.f-seg:only-child { border-radius: 4px; }

@keyframes segGrow {
  from { transform: scaleX(0); opacity: 0; }
  to { transform: scaleX(1); opacity: 1; }
}

.f-list { display: flex; flex-direction: column; }

.f-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.f-item:hover {
  background: linear-gradient(90deg, var(--blue-bg), transparent);
}

.f-item:last-child { border-bottom: none; }

.f-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0 4px var(--surface2); }
.f-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--text); }
.f-pct { font-size: 11px; font-weight: 700; color: var(--text2); }
</style>
