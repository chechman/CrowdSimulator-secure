<template>
  <div class="tl-wrap">
    <div class="tl-head">
      <div class="tl-pills">
        <div class="tl-pill"><span class="tl-dot tw"></span> Twitter <span class="tl-cnt font-mono">{{ twitterCount }}</span></div>
        <div class="tl-pill"><span class="tl-dot rd"></span> Reddit <span class="tl-cnt font-mono">{{ redditCount }}</span></div>
      </div>
      <span class="tl-live font-mono"><span class="fd"></span> LIVE</span>
    </div>
    <div class="tl-feed" ref="feedRef">
      <div class="tl-axis"></div>
      <TransitionGroup name="tl-anim">
        <div
          v-for="(action, i) in actions"
          :key="action._key || i"
          class="tl-item"
          :class="action.platform === 'twitter' ? 'left' : 'right'"
        >
          <div class="tl-marker" :class="action.platform"></div>
          <div class="tl-card">
            <div class="tl-card-top">
              <div class="tl-av" :style="{ background: avBg(action), color: avFg(action) }">{{ initials(action.agent_name) }}</div>
              <div class="tl-meta">
                <div class="tl-name">{{ action.agent_name }}</div>
                <div class="tl-handle font-mono">{{ action.platform === 'twitter' ? '@' : 'r/' }}{{ action.agent_name?.toLowerCase().replace(/\s+/g, '_') }}</div>
              </div>
              <span class="tl-badge font-mono" :class="badgeClass(action.action_type)">{{ badgeLabel(action.action_type) }}</span>
            </div>
            <div class="tl-body" v-if="action.content">{{ action.content }}</div>
            <div class="tl-body tl-body-action" v-else><span class="tl-desc">{{ actionDesc(action) }}</span></div>
            <div class="tl-foot">
              <span class="tl-round font-mono">R{{ action.round }}</span>
              <div class="tl-stats font-mono" v-if="action.stats">
                <span v-if="action.stats.likes" class="st heart">{{ action.stats.likes }}</span>
                <span v-if="action.stats.reposts" class="st repost">{{ action.stats.reposts }}</span>
                <span v-if="action.stats.replies" class="st reply">{{ action.stats.replies }}</span>
                <span v-if="action.stats.upvotes" class="st up">{{ action.stats.upvotes }}</span>
                <span v-if="action.stats.downvotes" class="st dn">{{ action.stats.downvotes }}</span>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
      <div v-if="actions.length === 0" class="tl-empty">
        <div class="pulse-ring"></div>
        <span class="font-mono">WAITING FOR ACTIONS</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({ actions: { type: Array, default: () => [] } })
const feedRef = ref(null)

const twitterCount = computed(() => props.actions.filter(a => a.platform === 'twitter').length)
const redditCount = computed(() => props.actions.filter(a => a.platform === 'reddit').length)

const initials = (name) => { if (!name) return '?'; return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) }
const avBg = (a) => a.platform === 'twitter' ? '#eff6ff' : '#fef2f2'
const avFg = (a) => a.platform === 'twitter' ? '#1d9bf0' : '#dc2626'

const badgeClass = (type) => ({ CREATE_POST: 'b-post', LIKE: 'b-like', REPOST: 'b-repost', COMMENT: 'b-comment', FOLLOW: 'b-follow', DO_NOTHING: 'b-idle' }[type] || 'b-default')
const badgeLabel = (type) => ({ CREATE_POST: 'post', LIKE: 'like', REPOST: 'repost', COMMENT: 'reply', FOLLOW: 'follow', DO_NOTHING: 'idle' }[type] || type?.toLowerCase() || 'action')
const actionDesc = (action) => {
  const t = action.action_type
  if (t === 'LIKE') return 'liked a post'
  if (t === 'REPOST') return 'reposted'
  if (t === 'FOLLOW') return 'followed a user'
  if (t === 'DO_NOTHING') return 'observing...'
  return t?.toLowerCase().replace(/_/g, ' ') || ''
}

watch(() => props.actions.length, () => {
  nextTick(() => { if (feedRef.value) feedRef.value.scrollTop = feedRef.value.scrollHeight })
})
</script>

<style scoped>
.tl-wrap {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.tl-pills { display: flex; gap: 12px; }
.tl-pill { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: var(--text2); }
.tl-dot { width: 5px; height: 5px; border-radius: 50%; }
.tl-dot.tw { background: var(--blue); }
.tl-dot.rd { background: var(--reddit); }
.tl-cnt { font-size: 9px; color: var(--text3); }

.tl-live { font-size: 8px; font-weight: 600; color: var(--green); display: flex; align-items: center; gap: 3px; }
.fd { width: 3px; height: 3px; border-radius: 50%; background: var(--green); animation: pulse 1.5s ease infinite; }

.tl-feed {
  position: relative;
  padding: 8px 0;
  overflow-y: auto;
  flex: 1;
  min-height: 100px;
}

.tl-feed::-webkit-scrollbar { width: 2px; }
.tl-feed::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

.tl-axis {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
  transform: translateX(-50%);
  opacity: 0.6;
}

.tl-item {
  display: flex;
  align-items: flex-start;
  padding: 4px 10px;
  position: relative;
}

.tl-item.left {
  justify-content: flex-start;
  padding-right: calc(50% + 16px);
  padding-left: 10px;
}
.tl-item.right {
  justify-content: flex-start;
  padding-left: calc(50% + 16px);
  padding-right: 10px;
}

.tl-marker {
  position: absolute;
  left: 50%;
  top: 12px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  transform: translateX(-50%);
  border: 1.5px solid var(--white);
  z-index: 2;
}

.tl-marker.twitter { background: var(--blue); }
.tl-marker.reddit { background: var(--reddit); }

.tl-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  width: 100%;
  transition: border-color 0.12s;
}

.tl-item.left .tl-card {
  border-left: 2px solid var(--blue, #1d9bf0);
}

.tl-item.right .tl-card {
  border-left: 2px solid var(--reddit, #dc2626);
}

.tl-card:hover { border-color: var(--border2); }

.tl-card-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }

.tl-av {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7px;
  font-weight: 700;
  flex-shrink: 0;
}

.tl-meta { flex: 1; min-width: 0; }
.tl-name { font-size: 10px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-handle { font-size: 8px; color: var(--text3); }

.tl-badge {
  font-size: 7px;
  padding: 2px 5px;
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

.tl-body { font-size: 10px; line-height: 1.45; color: var(--text2); }
.tl-body-action .tl-desc { color: var(--text3); font-style: italic; font-size: 9px; }

.tl-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.tl-round { font-size: 8px; color: var(--text3); }
.tl-stats { display: flex; gap: 6px; font-size: 8px; color: var(--text3); }

.st { display: flex; align-items: center; gap: 2px; }
.st.heart::before { content: '\2665'; color: var(--red); }
.st.repost::before { content: '\21BB'; color: var(--green); }
.st.reply::before { content: '\2709'; }
.st.up::before { content: '\25B2'; color: var(--orange); }
.st.dn::before { content: '\25BC'; color: var(--blue); }

.tl-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text3);
  font-size: 9px;
  letter-spacing: 0.5px;
}

.pulse-ring {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  animation: pulseRing 1.5s infinite ease-out;
}

@keyframes pulseRing {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}

.tl-anim-enter-active { transition: all 0.3s ease; }
.tl-anim-enter-from { opacity: 0; transform: translateY(8px); }
.tl-anim-leave-active { transition: all 0.15s ease; }
.tl-anim-leave-to { opacity: 0; }
</style>
