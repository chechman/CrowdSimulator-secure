<template>
  <div class="sb-wrap">
    <div class="sb-bar">
      <div class="sb-seg sb-pos" :style="{ width: positive + '%' }" v-if="positive > 0">
        <span class="sb-pct" v-if="positive >= 12">{{ positive }}%</span>
      </div>
      <div class="sb-seg sb-neut" :style="{ width: neutral + '%' }" v-if="neutral > 0">
        <span class="sb-pct" v-if="neutral >= 12">{{ neutral }}%</span>
      </div>
      <div class="sb-seg sb-neg" :style="{ width: negative + '%' }" v-if="negative > 0">
        <span class="sb-pct" v-if="negative >= 12">{{ negative }}%</span>
      </div>
    </div>
    <div class="sb-legend">
      <span class="sb-item"><span class="sb-dot" style="background:var(--green)"></span><span class="font-mono">pos</span></span>
      <span class="sb-item"><span class="sb-dot" style="background:var(--amber)"></span><span class="font-mono">neut</span></span>
      <span class="sb-item"><span class="sb-dot" style="background:var(--red)"></span><span class="font-mono">neg</span></span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  positive: { type: Number, default: 33 },
  neutral: { type: Number, default: 34 },
  negative: { type: Number, default: 33 }
})
</script>

<style scoped>
.sb-wrap { display: flex; flex-direction: column; gap: 3px; }

.sb-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: var(--border);
}

.sb-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.6s ease;
  min-width: 0;
}

.sb-pos { background: var(--green); }
.sb-neut { background: var(--amber); }
.sb-neg { background: var(--red); }

.sb-pct {
  font-family: var(--mono);
  font-size: 7px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.sb-legend {
  display: flex;
  gap: 8px;
}

.sb-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 8px;
  color: var(--text3);
  letter-spacing: 0.3px;
}

.sb-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
}
</style>
