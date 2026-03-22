<template>
  <div class="rewrite card">
    <div class="pnl-h">
      <span class="pnl-t">SUGGESTED REWRITE</span>
    </div>
    <div class="pnl-b">
      <div class="rw-compare">
        <div class="rw-col rw-orig">
          <div class="rw-label font-mono"><span class="rw-dot orig-dot"></span> ORIGINAL</div>
          <div class="rw-text orig-text">{{ original }}</div>
        </div>
        <div class="rw-col rw-sugg">
          <div class="rw-label font-mono"><span class="rw-dot sugg-dot"></span> SUGGESTED</div>
          <div class="rw-text sugg-text">{{ rewrite }}</div>
        </div>
      </div>
      <button class="btn-main rw-btn" @click="$emit('rerun', rewrite)">
        Re-run with this &rarr;
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  original: { type: String, required: true },
  rewrite: { type: String, required: true }
})
defineEmits(['rerun'])
</script>

<style scoped>
.rewrite { overflow: hidden; animation: fadeUp 0.3s ease-out both; animation-delay: 0.12s; }

.rw-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.rw-col {
  padding: 8px 10px;
  border-radius: 4px;
}

.rw-orig {
  background: var(--surface);
  border: 1px solid var(--border);
}

.rw-sugg {
  background: var(--green-bg);
  border: 1px solid var(--green-border);
}

.rw-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.rw-dot { width: 4px; height: 4px; border-radius: 50%; }
.orig-dot { background: var(--text3); }
.sugg-dot { background: var(--green); }

.rw-text { font-size: 11px; line-height: 1.5; color: var(--text); }
.orig-text { opacity: 0.6; }
.sugg-text { font-weight: 500; }

.rw-btn {
  width: 100%;
  padding: 8px 16px;
  font-size: 12px;
}

@media (max-width: 600px) { .rw-compare { grid-template-columns: 1fr; } }
</style>
