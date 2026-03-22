<template>
  <div class="editor">
    <div class="ed-split">
      <!-- Left pane: Post content -->
      <div class="ed-left">
        <div class="ed-section-head">
          <span class="ed-label font-mono">{{ abMode ? 'A/B VARIANTS' : 'YOUR POST' }}</span>
          <div class="ed-head-actions">
            <button class="ed-mode-btn font-mono" :class="{ active: abMode }" @click="toggleAB">
              <span class="ed-mode-icon">{{ abMode ? '&#9635;' : '&#9634;' }}</span>
              A/B Test
            </button>
            <span class="post-count font-mono" v-if="!abMode">{{ postText.length }}/2000</span>
          </div>
        </div>

        <!-- Single post mode -->
        <div class="ed-post-wrap" v-if="!abMode">
          <textarea
            v-model="postText"
            class="post-input"
            placeholder="What are you thinking of posting? Write your draft here..."
            maxlength="2000"
          ></textarea>
        </div>

        <!-- A/B variant mode -->
        <div class="ed-variants" v-else>
          <div
            v-for="(v, i) in variants"
            :key="v.id"
            class="ed-variant"
            :class="'variant-' + v.id.toLowerCase()"
          >
            <div class="ev-head">
              <span class="ev-marker font-mono">{{ v.id }}</span>
              <span class="ev-count font-mono">{{ v.text.length }}/2000</span>
              <button
                v-if="variants.length > 2"
                class="ev-remove"
                @click="removeVariant(i)"
                title="Remove variant"
              >&times;</button>
            </div>
            <textarea
              v-model="v.text"
              class="ev-input"
              :placeholder="i === 0 ? 'Write your first variant...' : 'Write an alternative version...'"
              maxlength="2000"
            ></textarea>
          </div>
          <button
            v-if="variants.length < 4"
            class="ev-add font-mono"
            @click="addVariant"
          >+ Add Variant {{ String.fromCharCode(65 + variants.length) }}</button>
        </div>
      </div>

      <!-- Right pane: Configuration -->
      <div class="ed-right">
        <div class="ed-section-head">
          <span class="ed-label font-mono">CONFIGURATION</span>
        </div>

        <div class="ed-right-scroll">
          <!-- Audience -->
          <div class="ed-field">
            <label class="field-label font-mono">TARGET AUDIENCE</label>
            <textarea
              ref="audienceTextarea"
              v-model="audienceDesc"
              class="aud-input"
              placeholder="Describe your target audience — who they are, what they care about, their typical reaction style..."
              rows="3"
            ></textarea>
            <AudienceChips @select="onChipSelect" />
          </div>

          <!-- Research Focus -->
          <div class="ed-field">
            <label class="field-label font-mono">RESEARCH FOCUS</label>
            <p class="rf-desc">The agent will research these angles. Toggle off to skip, or add your own.</p>

            <!-- Default research angles -->
            <div class="rf-defaults">
              <button
                v-for="angle in defaultAngles"
                :key="angle.id"
                class="rf-chip font-mono"
                :class="{ active: activeAngles.includes(angle.id) }"
                @click="toggleAngle(angle.id)"
              >
                <span class="rf-chip-check">{{ activeAngles.includes(angle.id) ? '&#10003;' : '' }}</span>
                {{ angle.label }}
              </button>
            </div>

            <!-- Custom topics -->
            <div class="rf-custom" v-if="customTopics.length > 0">
              <div class="rf-custom-list">
                <span
                  v-for="(topic, i) in customTopics"
                  :key="i"
                  class="rf-tag font-mono"
                >
                  {{ topic }}
                  <button class="rf-tag-x" @click="customTopics.splice(i, 1)">&times;</button>
                </span>
              </div>
            </div>

            <!-- Add custom topic -->
            <div class="rf-add-row">
              <input
                v-model="newTopic"
                class="rf-add-input font-mono"
                placeholder="Add custom topic, e.g. &quot;competitor pricing strategies&quot;"
                @keydown.enter.prevent="addTopic"
              />
              <button class="rf-add-btn font-mono" @click="addTopic" :disabled="!newTopic.trim()">Add</button>
            </div>
          </div>

          <!-- Platforms -->
          <div class="ed-field">
            <label class="field-label font-mono">PLATFORMS</label>
            <div class="ed-plats">
              <button
                v-for="p in platformOptions"
                :key="p.value"
                class="plat-btn font-mono"
                :class="[p.cls, { active: platforms.includes(p.value) }]"
                @click="togglePlatform(p.value)"
              >
                <span class="plat-icon">{{ p.icon }}</span>
                {{ p.label }}
              </button>
            </div>
          </div>

          <!-- Agents + Rounds -->
          <div class="ed-field">
            <div class="ed-config-row">
              <div class="cfg-group">
                <label class="field-label font-mono">AGENTS</label>
                <div class="cfg-input-row">
                  <input
                    v-model.number="agentCount"
                    type="number"
                    min="5"
                    max="1000000"
                    class="cfg-num-input font-mono"
                  />
                  <div class="cfg-presets">
                    <button
                      v-for="n in agentPresets"
                      :key="n"
                      class="cfg-preset font-mono"
                      :class="{ active: agentCount === n }"
                      @click="agentCount = n"
                    >{{ formatNum(n) }}</button>
                  </div>
                </div>
              </div>
              <div class="cfg-group">
                <label class="field-label font-mono">ROUNDS</label>
                <div class="cfg-input-row">
                  <input
                    v-model.number="rounds"
                    type="number"
                    min="1"
                    max="100"
                    class="cfg-num-input font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom: submit -->
    <div class="ed-bottom">
      <div class="ed-bottom-info font-mono" v-if="canSubmit">
        {{ agentCount }} agents &middot; {{ rounds }} rounds &middot; {{ platforms.join(' + ') }}{{ abMode ? ` &middot; ${variants.length} variants` : '' }}
      </div>
      <button class="ed-submit" :disabled="!canSubmit" @click="handleSubmit">
        <span class="ed-submit-text">Simulate Crowd Reaction</span>
        <span class="ed-submit-arrow">&rarr;</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, Transition } from 'vue'
import AudienceChips from './AudienceChips.vue'

const emit = defineEmits(['submit'])

const postText = ref('')
const audienceDesc = ref('')
const platforms = ref(['twitter', 'reddit'])
const agentCount = ref(15)
const rounds = ref(5)
const audienceTextarea = ref(null)
const abMode = ref(false)
const variants = ref([
  { id: 'A', text: '' },
  { id: 'B', text: '' },
])

// Research focus
const newTopic = ref('')
const customTopics = ref([])

const defaultAngles = [
  { id: 'sentiment', label: 'Sentiment & discourse', icon: '~' },
  { id: 'news', label: 'News & events', icon: '!' },
  { id: 'demographics', label: 'Audience demographics', icon: '#' },
  { id: 'controversy', label: 'Controversy & risks', icon: '*' },
  { id: 'competitors', label: 'Similar posts', icon: '=' },
  { id: 'culture', label: 'Cultural context', icon: '@' },
  { id: 'platform', label: 'Platform patterns', icon: '>' },
]

const activeAngles = ref(defaultAngles.map(a => a.id))

const agentPresets = [15, 50, 200, 1000, 10000]

const platformOptions = [
  { value: 'twitter', label: 'Twitter', cls: 'tw', icon: '𝕏' },
  { value: 'reddit', label: 'Reddit', cls: 'rd', icon: 'r/' }
]

const canSubmit = computed(() => {
  if (platforms.value.length === 0) return false
  if (abMode.value) {
    return variants.value.every(v => v.text.trim().length > 0)
  }
  return postText.value.trim().length > 0
})

const formatNum = (n) => {
  if (n >= 1000) return (n / 1000) + 'K'
  return String(n)
}

function togglePlatform(value) {
  const idx = platforms.value.indexOf(value)
  if (idx >= 0) {
    if (platforms.value.length > 1) platforms.value.splice(idx, 1)
  } else {
    platforms.value.push(value)
  }
}

function onChipSelect(description) {
  audienceDesc.value = description
  if (audienceTextarea.value) audienceTextarea.value.focus()
}

function toggleAB() {
  abMode.value = !abMode.value
  if (abMode.value && postText.value.trim()) {
    variants.value[0].text = postText.value
  }
}

function addVariant() {
  const nextId = String.fromCharCode(65 + variants.value.length)
  variants.value.push({ id: nextId, text: '' })
}

function removeVariant(index) {
  variants.value.splice(index, 1)
  variants.value.forEach((v, i) => { v.id = String.fromCharCode(65 + i) })
}

function toggleAngle(id) {
  const idx = activeAngles.value.indexOf(id)
  if (idx >= 0) {
    activeAngles.value.splice(idx, 1)
  } else {
    activeAngles.value.push(id)
  }
}

function addTopic() {
  const t = newTopic.value.trim()
  if (t && !customTopics.value.includes(t)) {
    customTopics.value.push(t)
    newTopic.value = ''
  }
}

function buildResearchTopics() {
  const topics = []

  // Map active default angles to descriptive strings
  const angleDescriptions = {
    sentiment: 'Topic sentiment and current public discourse',
    news: 'Breaking news and recent events',
    demographics: 'Audience demographics and communities',
    controversy: 'Controversy, backlash history, and risks',
    competitors: 'Similar posts that went viral or failed',
    culture: 'Cultural context, memes, community norms',
    platform: 'Platform-specific patterns (Twitter vs Reddit)',
  }

  for (const id of activeAngles.value) {
    if (angleDescriptions[id]) topics.push(angleDescriptions[id])
  }

  // Add custom topics
  for (const t of customTopics.value) {
    topics.push(t)
  }

  return topics
}

function handleSubmit() {
  if (!canSubmit.value) return
  const payload = {
    audience_desc: audienceDesc.value.trim(),
    platforms: [...platforms.value],
    agent_count: agentCount.value,
    rounds: rounds.value,
    research_topics: buildResearchTopics(),
  }
  if (abMode.value) {
    payload.variants = variants.value.map(v => ({ id: v.id, text: v.text.trim() }))
    payload.post_text = variants.value[0].text.trim()
  } else {
    payload.post_text = postText.value.trim()
  }
  emit('submit', payload)
}
</script>

<style scoped>
.editor {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Split layout */
.ed-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ed-left {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border);
}

.ed-right {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ed-right-scroll {
  flex: 1;
  overflow-y: auto;
}

.ed-right-scroll::-webkit-scrollbar { width: 3px; }
.ed-right-scroll::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

/* Section headers */
.ed-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.ed-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
}

.ed-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* A/B toggle */
.ed-mode-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--border);
  color: var(--text3);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.ed-mode-btn:hover {
  border-color: var(--border2);
  color: var(--text2);
}

.ed-mode-btn.active {
  background: var(--purple-bg);
  color: var(--purple);
  border-color: var(--purple-border);
  font-weight: 600;
}

.ed-mode-icon {
  font-size: 12px;
  line-height: 1;
}

/* Field groups */
.ed-field {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.ed-field:last-child {
  border-bottom: none;
}

.field-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.field-label-row .field-label {
  margin-bottom: 0;
}

/* Post textarea */
.ed-post-wrap {
  flex: 1;
  display: flex;
}

.post-input {
  width: 100%;
  padding: 16px 18px;
  border: none;
  background: transparent;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text);
  resize: none;
  outline: none;
  font-family: var(--sans);
}

.post-input::placeholder { color: var(--text3); }

.post-count {
  font-size: 10px;
  color: var(--text3);
}

/* Audience */
.aud-input {
  width: 100%;
  padding: 8px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text2);
  resize: none;
  outline: none;
  font-family: var(--sans);
  line-height: 1.4;
  transition: border-color 0.12s;
}

.aud-input:focus { border-color: var(--border2); }
.aud-input::placeholder { color: var(--text3); }

/* Research Focus */
.rf-desc {
  font-size: 10px;
  color: var(--text3);
  margin-bottom: 8px;
  line-height: 1.3;
}

.rf-defaults {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rf-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  border: 1px solid var(--border);
  color: var(--text3);
  background: transparent;
  cursor: pointer;
  transition: all 0.12s;
}

.rf-chip:hover { border-color: var(--border2); color: var(--text2); }

.rf-chip.active {
  background: var(--green-bg);
  color: var(--green);
  border-color: var(--green-border);
}

.rf-chip-check {
  font-size: 8px;
  width: 10px;
  text-align: center;
}

.rf-custom-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rf-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 10px;
  background: var(--blue-bg);
  color: var(--blue);
  border: 1px solid var(--blue-border);
}

.rf-tag-x {
  font-size: 11px;
  line-height: 1;
  color: var(--blue);
  opacity: 0.5;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.rf-tag-x:hover { opacity: 1; }

.rf-add-row {
  display: flex;
  gap: 4px;
}

.rf-add-input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text);
  background: var(--white);
  outline: none;
  transition: border-color 0.12s;
}

.rf-add-input:focus { border-color: var(--border2); }
.rf-add-input::placeholder { color: var(--text3); }

.rf-add-btn {
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text3);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}

.rf-add-btn:hover:not(:disabled) { border-color: var(--border2); color: var(--text); }
.rf-add-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* Platforms */
.ed-plats { display: flex; gap: 6px; }

.plat-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  color: var(--text3);
  background: transparent;
  transition: all 0.12s;
}

.plat-icon {
  font-size: 11px;
  font-weight: 700;
}

.plat-btn.tw.active {
  border-color: var(--blue);
  color: var(--blue);
  background: var(--blue-bg);
}

.plat-btn.rd.active {
  border-color: var(--reddit);
  color: var(--reddit);
  background: var(--red-bg);
}

.plat-btn:not(.active):hover {
  border-color: var(--border2);
  color: var(--text2);
}

/* Config row */
.ed-config-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.cfg-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cfg-input-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cfg-num-input {
  width: 64px;
  padding: 6px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  background: var(--white);
  text-align: center;
  transition: border-color 0.12s;
}

.cfg-num-input:focus { border-color: var(--border2); }

.cfg-num-input::-webkit-outer-spin-button,
.cfg-num-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.cfg-num-input[type=number] { -moz-appearance: textfield; }

.cfg-presets {
  display: flex;
  gap: 2px;
}

.cfg-preset {
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  border: 1px solid var(--border);
  color: var(--text3);
  background: transparent;
  cursor: pointer;
  transition: all 0.12s;
  letter-spacing: 0.3px;
}

.cfg-preset:hover {
  border-color: var(--border2);
  color: var(--text2);
}

.cfg-preset.active {
  border-color: var(--green);
  color: var(--green);
  background: var(--green-bg);
}

/* Variants */
.ed-variants {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.ed-variant {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 80px;
  border-bottom: 1px solid var(--border);
}

.ed-variant:last-of-type {
  border-bottom: none;
}

.ev-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.ev-marker {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}

.variant-a .ev-marker { background: var(--blue-bg); color: var(--blue); }
.variant-b .ev-marker { background: var(--purple-bg); color: var(--purple); }
.variant-c .ev-marker { background: var(--green-bg); color: var(--green); }
.variant-d .ev-marker { background: var(--amber-bg, #fffbeb); color: var(--amber); }

.variant-a { border-left: 2px solid var(--blue); }
.variant-b { border-left: 2px solid var(--purple); }
.variant-c { border-left: 2px solid var(--green); }
.variant-d { border-left: 2px solid var(--orange); }

.ev-count {
  font-size: 9px;
  color: var(--text3);
  margin-left: auto;
}

.ev-remove {
  font-size: 14px;
  line-height: 1;
  color: var(--text3);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0.5;
  transition: opacity 0.12s;
}

.ev-remove:hover { opacity: 1; color: var(--red); }

.ev-input {
  flex: 1;
  width: 100%;
  padding: 12px 14px;
  border: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
  resize: none;
  outline: none;
  font-family: var(--sans);
  min-height: 60px;
}

.ev-input::placeholder { color: var(--text3); }

.ev-add {
  font-size: 10px;
  font-weight: 500;
  padding: 10px 14px;
  color: var(--text3);
  background: var(--surface);
  border: none;
  border-top: 1px solid var(--border);
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
}

.ev-add:hover {
  color: var(--text2);
  background: var(--border);
}

/* Bottom bar */
.ed-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  background: var(--surface);
  gap: 12px;
}

.ed-bottom-info {
  font-size: 10px;
  color: var(--text3);
  letter-spacing: 0.3px;
}

.ed-submit {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 28px;
  background: var(--text);
  color: var(--bg);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: var(--sans);
  white-space: nowrap;
  flex-shrink: 0;
}

.ed-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.ed-submit:active:not(:disabled) {
  transform: translateY(0);
}

.ed-submit:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none;
}

.ed-submit-arrow {
  font-size: 15px;
  transition: transform 0.15s;
}

.ed-submit:hover:not(:disabled) .ed-submit-arrow {
  transform: translateX(2px);
}

@media (max-width: 768px) {
  .ed-split {
    grid-template-columns: 1fr;
  }
  .ed-left {
    border-right: none;
    border-bottom: 1px solid var(--border);
    min-height: 200px;
  }
  .ed-post-wrap {
    min-height: 150px;
  }
  .cfg-presets { display: none; }
  .ed-bottom-info { display: none; }
}
</style>
