<template>
  <div class="terminal">
    <div class="t-head">
      <div class="t-dots"><span class="d r"></span><span class="d y"></span><span class="d g"></span></div>
      <span class="t-title font-mono">{{ title }}</span>
      <span class="t-count font-mono" v-if="entries.length">{{ entries.length }}</span>
    </div>
    <div class="t-body" ref="bodyRef">
      <div v-for="(entry, i) in entries" :key="i" class="t-line" :class="entry.type">
        <span class="t-prefix">{{ entry.prefix || '>' }}</span>
        <span class="t-text">{{ entry.message }}</span>
      </div>
      <div v-if="loading" class="t-line typing">
        <span class="t-prefix">></span>
        <span class="t-cursor">_</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  title: { type: String, default: 'sim-world agent' },
  entries: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const bodyRef = ref(null)

watch(() => props.entries.length, () => {
  nextTick(() => { if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight })
})
</script>

<style scoped>
.terminal {
  background: var(--term-bg);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--term-border);
  display: flex;
  flex-direction: column;
}

.t-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--term-head);
  border-bottom: 1px solid var(--term-border);
}

.t-dots { display: flex; gap: 4px; }
.d { width: 7px; height: 7px; border-radius: 50%; }
.d.r { background: #ff5f57; }
.d.y { background: #febc2e; }
.d.g { background: #28c840; }

.t-title { font-size: 10px; color: var(--term-dim); letter-spacing: 0.3px; }
.t-count {
  margin-left: auto;
  font-size: 9px;
  color: var(--term-dim);
  background: var(--term-border);
  padding: 1px 6px;
  border-radius: 3px;
}

.t-body {
  padding: 8px 10px;
  flex: 1;
  overflow-y: auto;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.6;
  min-height: 0;
}

.t-body::-webkit-scrollbar { width: 2px; }
.t-body::-webkit-scrollbar-thumb { background: var(--term-border); border-radius: 2px; }

.t-line {
  display: flex;
  gap: 6px;
  animation: tIn 0.2s ease-out;
}

.t-prefix { color: var(--term-dim); flex-shrink: 0; min-width: 14px; user-select: none; }
.t-text { color: var(--term-text); word-break: break-word; }

/* Tool start */
.t-line.tool-start .t-prefix { color: var(--amber); }
.t-line.tool-start .t-text { color: var(--term-bright); font-weight: 500; }

/* Tool detail */
.t-line.tool-detail .t-prefix { color: transparent; }
.t-line.tool-detail .t-text { color: var(--blue); font-size: 10px; opacity: 0.8; }

/* Tool done */
.t-line.tool-done .t-prefix { color: var(--green); }
.t-line.tool-done .t-text { color: var(--green); }

/* Tool result */
.t-line.tool-result .t-prefix { color: transparent; }
.t-line.tool-result .t-text { color: var(--term-dim); font-size: 10px; }

/* Tool error */
.t-line.tool-error .t-prefix { color: var(--red); }
.t-line.tool-error .t-text { color: var(--red); }

/* Legacy types */
.t-line.search .t-prefix, .t-line.search .t-text { color: var(--blue); }
.t-line.found .t-prefix, .t-line.found .t-text { color: var(--green); }
.t-line.seed .t-prefix, .t-line.seed .t-text { color: var(--amber); }
.t-line.gen .t-prefix, .t-line.gen .t-text { color: var(--purple); }
.t-line.info .t-text { color: var(--term-dim); }
.t-line.phase .t-prefix, .t-line.phase .t-text { color: #f472b6; font-weight: 500; }
.t-line.error .t-prefix, .t-line.error .t-text { color: var(--red); }
.t-line.success .t-prefix, .t-line.success .t-text { color: var(--green); }
.t-line.thinking .t-text { color: var(--purple); font-style: italic; font-size: 10px; }

.t-cursor { color: var(--green); animation: blink 1s ease-in-out infinite; font-weight: 700; }

@keyframes tIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: none; }
}
</style>
