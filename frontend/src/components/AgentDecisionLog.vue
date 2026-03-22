<template>
  <div class="dl">
    <div class="dl-head">
      <span class="dl-title font-mono">ACTIVITY FEED</span>
      <span class="dl-count font-mono" v-if="actions.length">{{ actions.length }}</span>
    </div>
    <div class="dl-body" ref="bodyRef">
      <div v-for="(action, i) in actions" :key="i" class="dl-item" :class="action.platform">
        <div class="dl-item-top">
          <div class="dl-av" :style="{ background: avBg(action) }">
            {{ initials(action.agent_name) }}
          </div>
          <div class="dl-meta">
            <span class="dl-name">{{ action.agent_name }}</span>
            <span class="dl-round font-mono">R{{ action.round }}</span>
          </div>
          <span class="dl-badge font-mono" :class="actClass(action.action_type)">{{ badgeLabel(action.action_type) }}</span>
        </div>
        <div class="dl-content" v-if="action.content">{{ action.content }}</div>
        <div class="dl-content dl-no-content" v-else>{{ actionDesc(action) }}</div>
        <div class="dl-stats font-mono" v-if="action.stats">
          <span v-if="action.stats.likes" class="dl-stat">&#9829; {{ action.stats.likes }}</span>
          <span v-if="action.stats.reposts" class="dl-stat">&#8635; {{ action.stats.reposts }}</span>
          <span v-if="action.stats.replies" class="dl-stat">&#9993; {{ action.stats.replies }}</span>
          <span v-if="action.stats.upvotes" class="dl-stat">&#9650; {{ action.stats.upvotes }}</span>
          <span v-if="action.stats.downvotes" class="dl-stat">&#9660; {{ action.stats.downvotes }}</span>
        </div>
      </div>
      <div v-if="actions.length === 0" class="dl-empty font-mono">WAITING FOR ACTIONS</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({ actions: { type: Array, default: () => [] } })
const bodyRef = ref(null)

const initials = (name) => {
  if (!name) return '?'
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const avBg = (a) => a.platform === 'twitter' ? '#eff6ff' : '#fef2f2'

const actClass = (type) => ({
  CREATE_POST: 'b-post', LIKE: 'b-like', REPOST: 'b-repost',
  COMMENT: 'b-comment', FOLLOW: 'b-follow', DO_NOTHING: 'b-idle'
}[type] || 'b-default')

const badgeLabel = (type) => ({
  CREATE_POST: 'post', LIKE: 'like', REPOST: 'repost',
  COMMENT: 'reply', FOLLOW: 'follow', DO_NOTHING: 'idle'
}[type] || type?.toLowerCase() || 'action')

const actionDesc = (action) => {
  const t = action.action_type
  if (t === 'LIKE') return 'liked a post'
  if (t === 'REPOST') return 'reposted'
  if (t === 'FOLLOW') return 'followed a user'
  if (t === 'DO_NOTHING') return 'observing...'
  return t?.toLowerCase().replace(/_/g, ' ') || ''
}

watch(() => props.actions.length, () => {
  nextTick(() => { if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight })
})
</script>

<style scoped>
.dl {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.dl-title { font-size: 10px; font-weight: 600; color: var(--text3); letter-spacing: 0.5px; }
.dl-count {
  font-size: 10px; font-weight: 600;
  color: var(--green);
  background: var(--green-bg);
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid var(--green-border);
}

.dl-body {
  padding: 6px;
  overflow-y: auto;
  flex: 1;
  min-height: 60px;
}

.dl-body::-webkit-scrollbar { width: 2px; }
.dl-body::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

.dl-item {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 4px;
  animation: dlIn 0.2s ease-out;
  transition: border-color 0.12s;
}

.dl-item:hover { border-color: var(--border2); }
.dl-item.twitter { border-left: 2px solid var(--blue); }
.dl-item.reddit { border-left: 2px solid var(--reddit); }

.dl-item-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.dl-av {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
  color: var(--text);
  flex-shrink: 0;
}

.dl-meta {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.dl-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dl-round {
  font-size: 9px;
  color: var(--text3);
  flex-shrink: 0;
}

.dl-badge {
  font-size: 8px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.b-post { background: var(--purple-bg); color: var(--purple); border: 1px solid var(--purple-border); }
.b-like { background: var(--red-bg); color: var(--red); border: 1px solid var(--red-border); }
.b-repost { background: var(--blue-bg); color: var(--blue); border: 1px solid var(--blue-border); }
.b-comment { background: var(--green-bg); color: var(--green); border: 1px solid var(--green-border); }
.b-follow { background: #ecfdf5; color: #0891b2; border: 1px solid #a7f3d0; }
.b-idle { background: var(--surface); color: var(--text3); border: 1px solid var(--border); }
.b-default { background: var(--surface); color: var(--text3); border: 1px solid var(--border); }

.dl-content {
  font-size: 12px;
  line-height: 1.45;
  color: var(--text2);
}

.dl-no-content {
  color: var(--text3);
  font-style: italic;
  font-size: 11px;
}

.dl-stats {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 9px;
  color: var(--text3);
}

.dl-stat {
  display: flex;
  align-items: center;
  gap: 2px;
}

.dl-empty {
  color: var(--text3);
  text-align: center;
  padding: 24px 0;
  font-size: 10px;
  letter-spacing: 0.5px;
}

@keyframes dlIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}
</style>
