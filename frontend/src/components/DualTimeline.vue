<template>
  <div class="tl-wrap">
    <div class="tl-head">
      <div class="tl-pills">
        <div class="tl-pill"><span class="tl-dot tw"></span> Twitter <span class="tl-cnt font-mono">{{ twitterCount }}</span></div>
        <div class="tl-pill"><span class="tl-dot rd"></span> Reddit <span class="tl-cnt font-mono">{{ redditCount }}</span></div>
      </div>
      <span class="tl-live font-mono"><span class="fd"></span> LIVE</span>
    </div>
    <div class="tl-columns">
      <!-- Twitter column -->
      <div class="tl-col" ref="twRef">
        <div class="tl-col-label font-mono"><span class="tl-dot tw"></span> TWITTER</div>
        <TransitionGroup name="tl-anim" tag="div" class="tl-col-feed">
          <div
            v-for="(action, i) in twitterActions"
            :key="action._key || 'tw-' + i"
            class="tl-card twitter"
          >
            <div class="tl-card-top">
              <div class="tl-av tw-av">{{ initials(action.agent_name) }}</div>
              <div class="tl-meta">
                <div class="tl-name">{{ action.agent_name }}</div>
                <div class="tl-handle font-mono">@{{ action.agent_name?.toLowerCase().replace(/\s+/g, '_') }}</div>
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
              </div>
            </div>
          </div>
        </TransitionGroup>
        <div v-if="twitterActions.length === 0" class="tl-empty">
          <div class="pulse-ring"></div>
          <span class="font-mono">WAITING</span>
        </div>
      </div>

      <!-- Divider -->
      <div class="tl-divider"></div>

      <!-- Reddit column -->
      <div class="tl-col" ref="rdRef">
        <div class="tl-col-label font-mono"><span class="tl-dot rd"></span> REDDIT</div>
        <TransitionGroup name="tl-anim" tag="div" class="tl-col-feed">
          <div
            v-for="(action, i) in redditActions"
            :key="action._key || 'rd-' + i"
            class="tl-card reddit"
          >
            <div class="tl-card-top">
              <div class="tl-av rd-av">{{ initials(action.agent_name) }}</div>
              <div class="tl-meta">
                <div class="tl-name">{{ action.agent_name }}</div>
                <div class="tl-handle font-mono">u/{{ action.agent_name?.toLowerCase().replace(/\s+/g, '_') }}</div>
              </div>
              <span class="tl-badge font-mono" :class="badgeClass(action.action_type)">{{ badgeLabel(action.action_type) }}</span>
            </div>
            <div class="tl-body" v-if="action.content">{{ action.content }}</div>
            <div class="tl-body tl-body-action" v-else><span class="tl-desc">{{ actionDesc(action) }}</span></div>
            <div class="tl-foot">
              <span class="tl-round font-mono">R{{ action.round }}</span>
              <div class="tl-stats font-mono" v-if="action.stats">
                <span v-if="action.stats.upvotes" class="st up">{{ action.stats.upvotes }}</span>
                <span v-if="action.stats.downvotes" class="st dn">{{ action.stats.downvotes }}</span>
                <span v-if="action.stats.replies" class="st reply">{{ action.stats.replies }}</span>
              </div>
            </div>
          </div>
        </TransitionGroup>
        <div v-if="redditActions.length === 0" class="tl-empty">
          <div class="pulse-ring"></div>
          <span class="font-mono">WAITING</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({ actions: { type: Array, default: () => [] } })
const twRef = ref(null)
const rdRef = ref(null)

const twitterActions = computed(() => props.actions.filter(a => a.platform === 'twitter'))
const redditActions = computed(() => props.actions.filter(a => a.platform === 'reddit'))
const twitterCount = computed(() => twitterActions.value.length)
const redditCount = computed(() => redditActions.value.length)

const initials = (name) => { if (!name) return '?'; return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) }

const badgeClass = (type) => ({ CREATE_POST: 'b-post', LIKE: 'b-like', LIKE_POST: 'b-like', LIKE_COMMENT: 'b-like', REPOST: 'b-repost', COMMENT: 'b-comment', CREATE_COMMENT: 'b-comment', FOLLOW: 'b-follow', DO_NOTHING: 'b-idle', DISLIKE: 'b-dislike', DOWNVOTE_POST: 'b-dislike' }[type] || 'b-default')
const badgeLabel = (type) => ({ CREATE_POST: 'post', LIKE: 'like', LIKE_POST: 'like', LIKE_COMMENT: 'like', REPOST: 'repost', COMMENT: 'reply', CREATE_COMMENT: 'reply', FOLLOW: 'follow', DO_NOTHING: 'idle', DISLIKE: 'dislike', DOWNVOTE_POST: 'downvote' }[type] || type?.toLowerCase()?.replace(/_/g, ' ') || 'action')
const actionDesc = (action) => {
  const t = action.action_type
  if (t === 'LIKE' || t === 'LIKE_POST') return 'liked a post'
  if (t === 'LIKE_COMMENT') return 'liked a comment'
  if (t === 'REPOST') return 'reposted'
  if (t === 'FOLLOW') return 'followed a user'
  if (t === 'DO_NOTHING') return 'observing...'
  if (t === 'DISLIKE' || t === 'DOWNVOTE_POST') return 'downvoted'
  return t?.toLowerCase().replace(/_/g, ' ') || ''
}

// Auto-scroll each column independently
watch(() => twitterActions.value.length, () => {
  nextTick(() => { if (twRef.value) twRef.value.scrollTop = twRef.value.scrollHeight })
})
watch(() => redditActions.value.length, () => {
  nextTick(() => { if (rdRef.value) rdRef.value.scrollTop = rdRef.value.scrollHeight })
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
  flex-shrink: 0;
}

.tl-pills { display: flex; gap: 12px; }
.tl-pill { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: var(--text2); }
.tl-dot { width: 5px; height: 5px; border-radius: 50%; }
.tl-dot.tw { background: var(--blue); }
.tl-dot.rd { background: var(--red); }
.tl-cnt { font-size: 9px; color: var(--text3); }

.tl-live { font-size: 8px; font-weight: 600; color: var(--green); display: flex; align-items: center; gap: 3px; }
.fd { width: 3px; height: 3px; border-radius: 50%; background: var(--green); animation: pulse 1.5s ease infinite; }

/* Two-column layout */
.tl-columns {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tl-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
  position: relative;
}

.tl-col::-webkit-scrollbar { width: 2px; }
.tl-col::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

.tl-col-label {
  position: sticky;
  top: 0;
  z-index: 2;
  font-size: 8px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
  padding: 5px 10px;
  background: var(--white);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 5px;
}

.tl-col-feed {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tl-divider {
  width: 1px;
  background: var(--border);
  flex-shrink: 0;
}

/* Cards */
.tl-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  transition: border-color 0.12s;
}

.tl-card.twitter { border-left: 2px solid var(--blue); }
.tl-card.reddit { border-left: 2px solid var(--red); }
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

.tw-av { background: var(--blue-bg); color: var(--blue); }
.rd-av { background: var(--red-bg); color: var(--red); }

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
.b-dislike { background: var(--amber-bg, #fffbeb); color: var(--amber); border: 1px solid var(--amber-border, #fde68a); }
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

@media (max-width: 600px) {
  .tl-columns { flex-direction: column; }
  .tl-divider { width: 100%; height: 1px; }
}
</style>
