<template>
  <div class="strategy card">
    <div class="pnl-h">
      <span class="pnl-t">STRATEGY</span>
      <span class="pnl-meta font-mono">{{ strategy.length }} recommendations</span>
    </div>
    <div class="pnl-b">
      <div v-for="(item, i) in strategy" :key="i" class="st-card" :style="{ animationDelay: (i * 0.06 + 0.1) + 's' }">
        <div class="st-num font-mono">{{ i + 1 }}</div>
        <div class="st-text">{{ item }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ strategy: { type: Array, required: true } })
</script>

<style scoped>
.strategy {
  overflow: hidden;
  animation: fadeUp 0.3s ease-out both;
  animation-delay: 0.1s;
  background: var(--elevated-surface);
}

.st-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: var(--panel-glass);
  border: 1px solid var(--border);
  border-left: 3px solid var(--green);
  border-radius: 10px;
  margin-bottom: 8px;
  animation: fadeIn 0.3s ease-out both;
}

.st-card:nth-child(2) { border-left-color: var(--blue); }
.st-card:nth-child(3) { border-left-color: var(--amber); }

.st-card:last-child { margin-bottom: 0; }

.st-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--text);
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.st-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
  flex: 1;
  padding-top: 2px;
}
</style>
