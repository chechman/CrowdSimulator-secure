<template>
  <div class="eng">
    <div class="eng-head">
      <span class="eng-title font-mono">ENGAGEMENT BREAKDOWN</span>
      <span class="eng-meta font-mono">{{ agents.length }} agents</span>
    </div>
    <div class="eng-body">
      <!-- Action type breakdown -->
      <div class="eng-section">
        <div class="eng-slbl font-mono">ACTION TYPES</div>
        <div class="eng-action-bars">
          <div v-for="at in actionBreakdown" :key="at.type" class="eng-abar">
            <span class="eng-atype font-mono" :class="at.cls">{{ at.label }}</span>
            <div class="eng-atrack">
              <div class="eng-afill" :class="at.cls" :style="{ width: at.pct + '%' }"></div>
            </div>
            <span class="eng-acount font-mono">{{ at.count }}</span>
          </div>
        </div>
      </div>

      <!-- Per-agent activity -->
      <div class="eng-section">
        <div class="eng-slbl font-mono">PER-AGENT ACTIVITY</div>
        <div class="eng-agents-list">
          <div v-for="a in agentStats" :key="a.agent_id" class="eng-agent">
            <div class="eng-agent-top">
              <div class="eng-aav" :style="{ background: archColor(a.archetype) }">
                {{ initials(a.name) }}
              </div>
              <span class="eng-aname">{{ a.name }}</span>
              <span class="eng-atotal font-mono">{{ a.total }}</span>
            </div>
            <div class="eng-agent-bar">
              <div
                v-for="seg in a.segments" :key="seg.type"
                class="eng-agent-seg" :class="seg.cls"
                :style="{ flex: seg.count }"
                :title="`${seg.label}: ${seg.count}`"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Platform split -->
      <div class="eng-section" v-if="platformSplit.length > 1">
        <div class="eng-slbl font-mono">PLATFORM SPLIT</div>
        <div class="eng-platforms">
          <div v-for="p in platformSplit" :key="p.name" class="eng-plat">
            <span class="eng-plat-dot" :class="p.name"></span>
            <span class="eng-plat-name font-mono">{{ p.name }}</span>
            <span class="eng-plat-count font-mono">{{ p.count }}</span>
            <div class="eng-plat-bar">
              <div class="eng-plat-fill" :class="p.name" :style="{ width: p.pct + '%' }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  agents: { type: Array, default: () => [] },
  interactions: { type: Array, default: () => [] }
})

// We receive actions from the parent via interactions prop (repurposed)
// But actually we need the full logActions. Let's add a new prop.

const colors = {
  supporter: '#059669', skeptic: '#dc2626', neutral: '#3b82f6',
  journalist: '#7c3aed', troll: '#f97316', influencer: '#d97706',
  expert: '#0891b2', casual_observer: '#6b7280'
}
const archColor = (arch) => colors[arch?.toLowerCase()] || '#6b7280'
const initials = (name) => {
  if (!name) return '?'
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const actionBreakdown = computed(() => {
  const counts = {}
  for (const i of props.interactions) {
    const t = i.action_type || 'UNKNOWN'
    counts[t] = (counts[t] || 0) + 1
  }
  const total = props.interactions.length || 1
  const types = Object.entries(counts).map(([type, count]) => ({
    type,
    label: { CREATE_POST: 'POST', LIKE: 'LIKE', REPOST: 'REPOST', COMMENT: 'REPLY', FOLLOW: 'FOLLOW', DO_NOTHING: 'IDLE' }[type] || type,
    cls: { CREATE_POST: 'c-post', LIKE: 'c-like', REPOST: 'c-repost', COMMENT: 'c-comment', FOLLOW: 'c-follow', DO_NOTHING: 'c-idle' }[type] || 'c-default',
    count,
    pct: Math.round((count / total) * 100)
  }))
  return types.sort((a, b) => b.count - a.count)
})

const agentStats = computed(() => {
  const byAgent = {}
  for (const i of props.interactions) {
    const id = i.agent_id
    if (!byAgent[id]) {
      const agent = props.agents.find(a => a.agent_id === id)
      byAgent[id] = {
        agent_id: id,
        name: agent?.name || i.agent_name || `Agent ${id}`,
        archetype: agent?.archetype || 'neutral',
        actions: {}
      }
    }
    const t = i.action_type || 'UNKNOWN'
    byAgent[id].actions[t] = (byAgent[id].actions[t] || 0) + 1
  }
  return Object.values(byAgent).map(a => {
    const total = Object.values(a.actions).reduce((s, c) => s + c, 0)
    const segments = Object.entries(a.actions).map(([type, count]) => ({
      type,
      label: { CREATE_POST: 'POST', LIKE: 'LIKE', REPOST: 'REPOST', COMMENT: 'REPLY', FOLLOW: 'FOLLOW', DO_NOTHING: 'IDLE' }[type] || type,
      cls: { CREATE_POST: 'c-post', LIKE: 'c-like', REPOST: 'c-repost', COMMENT: 'c-comment', FOLLOW: 'c-follow', DO_NOTHING: 'c-idle' }[type] || 'c-default',
      count
    }))
    return { ...a, total, segments }
  }).sort((a, b) => b.total - a.total)
})

const platformSplit = computed(() => {
  const counts = {}
  for (const i of props.interactions) {
    const p = i.platform || 'unknown'
    counts[p] = (counts[p] || 0) + 1
  }
  const total = props.interactions.length || 1
  return Object.entries(counts).map(([name, count]) => ({
    name,
    count,
    pct: Math.round((count / total) * 100)
  }))
})
</script>

<style scoped>
.eng {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.eng-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.eng-title { font-size: 10px; font-weight: 600; color: var(--text3); letter-spacing: 0.5px; }
.eng-meta { font-size: 9px; color: var(--text3); }

.eng-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px;
}

.eng-body::-webkit-scrollbar { width: 2px; }
.eng-body::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

.eng-section {
  margin-bottom: 12px;
}

.eng-section:last-child { margin-bottom: 0; }

.eng-slbl {
  font-size: 8px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

/* Action type bars */
.eng-abar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.eng-atype {
  font-size: 9px;
  font-weight: 600;
  min-width: 40px;
}

.eng-atrack {
  flex: 1;
  height: 6px;
  background: var(--surface);
  border-radius: 3px;
  overflow: hidden;
}

.eng-afill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.eng-acount {
  font-size: 9px;
  color: var(--text3);
  min-width: 24px;
  text-align: right;
}

/* Color classes */
.c-post { color: var(--purple); }
.c-like { color: var(--red); }
.c-repost { color: var(--blue); }
.c-comment { color: var(--green); }
.c-follow { color: #0891b2; }
.c-idle { color: var(--text3); }
.c-default { color: var(--text3); }

.eng-afill.c-post { background: var(--purple); }
.eng-afill.c-like { background: var(--red); }
.eng-afill.c-repost { background: var(--blue); }
.eng-afill.c-comment { background: var(--green); }
.eng-afill.c-follow { background: #0891b2; }
.eng-afill.c-idle { background: var(--text3); }
.eng-afill.c-default { background: var(--text3); }

/* Per-agent bars */
.eng-agents-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.eng-agent {
  padding: 4px 0;
}

.eng-agent-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.eng-aav {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.eng-aname {
  font-size: 11px;
  font-weight: 500;
  color: var(--text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.eng-atotal {
  font-size: 9px;
  color: var(--text3);
  font-weight: 600;
}

.eng-agent-bar {
  display: flex;
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
  gap: 1px;
}

.eng-agent-seg {
  min-width: 2px;
  transition: flex 0.3s ease;
}

.eng-agent-seg.c-post { background: var(--purple); }
.eng-agent-seg.c-like { background: var(--red); }
.eng-agent-seg.c-repost { background: var(--blue); }
.eng-agent-seg.c-comment { background: var(--green); }
.eng-agent-seg.c-follow { background: #0891b2; }
.eng-agent-seg.c-idle { background: var(--text3); }
.eng-agent-seg.c-default { background: var(--text3); }

/* Platform split */
.eng-platforms {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.eng-plat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.eng-plat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.eng-plat-dot.twitter { background: var(--blue); }
.eng-plat-dot.reddit { background: var(--reddit); }

.eng-plat-name {
  font-size: 10px;
  color: var(--text2);
  min-width: 48px;
}

.eng-plat-count {
  font-size: 9px;
  color: var(--text3);
  min-width: 24px;
}

.eng-plat-bar {
  flex: 1;
  height: 5px;
  background: var(--surface);
  border-radius: 3px;
  overflow: hidden;
}

.eng-plat-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.eng-plat-fill.twitter { background: var(--blue); }
.eng-plat-fill.reddit { background: var(--reddit); }
</style>
