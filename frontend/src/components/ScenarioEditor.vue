<template>
  <div class="editor">
    <div class="ed-split">
      <!-- Left pane: Crowd config -->
      <div class="ed-left">
        <div class="ed-section-head">
          <span class="ed-label font-mono">CROWD CONFIGURATION</span>
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
            >{{ p.label }}</button>
          </div>
        </div>

        <!-- Audience -->
        <div class="ed-field ed-field-grow">
          <label class="field-label font-mono">AUDIENCE</label>
          <textarea
            ref="audienceTextarea"
            v-model="audienceDesc"
            class="aud-input"
            placeholder="Describe your target audience in detail — who are they, what do they care about, what's their typical reaction style..."
            rows="5"
          ></textarea>
          <p class="aud-hint font-mono">
            e.g. "tech devs, startup founders, some VCs, a few journalists"
          </p>
          <AudienceChips @select="onChipSelect" />
        </div>

        <!-- Config row: agents + rounds -->
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

      <!-- Right pane: Post content -->
      <div class="ed-right">
        <div class="ed-section-head">
          <span class="ed-label font-mono">YOUR POST</span>
          <span class="post-count font-mono">{{ postText.length }}/2000</span>
        </div>
        <div class="ed-post-wrap">
          <textarea
            v-model="postText"
            class="post-input"
            placeholder="What are you thinking of posting? Write your draft here..."
            maxlength="2000"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Bottom: submit -->
    <div class="ed-bottom">
      <button class="btn-main ed-submit" :disabled="!canSubmit" @click="handleSubmit">
        simulate crowd reaction &rarr;
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AudienceChips from './AudienceChips.vue'

const emit = defineEmits(['submit'])

const postText = ref('')
const audienceDesc = ref('')
const platforms = ref(['twitter', 'reddit'])
const agentCount = ref(15)
const rounds = ref(5)
const audienceTextarea = ref(null)

const agentPresets = [15, 50, 200, 1000, 10000]

const platformOptions = [
  { value: 'twitter', label: 'twitter', cls: 'tw' },
  { value: 'reddit', label: 'reddit', cls: 'rd' }
]

const canSubmit = computed(() => postText.value.trim().length > 0 && platforms.value.length > 0)

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

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', {
    post_text: postText.value.trim(),
    audience_desc: audienceDesc.value.trim(),
    platforms: [...platforms.value],
    agent_count: agentCount.value,
    rounds: rounds.value
  })
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
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.ed-right {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Section headers */
.ed-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.ed-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
}

/* Field groups */
.ed-field {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.ed-field:last-child {
  border-bottom: none;
}

.ed-field-grow {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ed-field-grow .aud-input {
  flex: 1;
  min-height: 80px;
}

.field-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

/* Platforms */
.ed-plats { display: flex; gap: 4px; }

.plat-btn {
  padding: 5px 14px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  color: var(--text3);
  background: transparent;
  transition: all 0.12s;
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

/* Audience textarea */
.aud-input {
  width: 100%;
  padding: 10px 12px;
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

.aud-hint {
  font-size: 10px;
  color: var(--text3);
  margin-top: 4px;
  font-style: italic;
}

/* Config row */
.ed-config-row {
  display: flex;
  gap: 20px;
  padding: 12px 16px;
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
  padding: 5px 6px;
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

/* Hide number input spinners */
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
  padding: 4px 8px;
  border-radius: 3px;
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

/* Post textarea - fills right pane */
.ed-post-wrap {
  flex: 1;
  display: flex;
}

.post-input {
  width: 100%;
  padding: 14px 16px;
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

/* Bottom bar */
.ed-bottom {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.ed-submit {
  white-space: nowrap;
  flex-shrink: 0;
  padding: 10px 24px;
  font-size: 13px;
}

@media (max-width: 768px) {
  .ed-split {
    grid-template-columns: 1fr;
  }
  .ed-left {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .ed-post-wrap {
    min-height: 150px;
  }
  .cfg-presets { display: none; }
}
</style>
