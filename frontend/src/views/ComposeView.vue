<template>
  <div class="compose-page">
    <div class="compose-inner">
      <!-- Header row -->
      <div class="compose-head animate-up">
        <div class="head-left">
          <div class="head-tag font-mono">SIMULATION ENGINE</div>
          <h1 class="head-title">
            Know how the crowd reacts
            <span class="head-accent font-serif">before you post.</span>
          </h1>
        </div>
        <div class="head-right">
          <div class="feat-pill" v-for="feat in features" :key="feat.num">
            <span class="feat-num font-mono">{{ feat.num }}</span>
            <span class="feat-label">{{ feat.label }}</span>
          </div>
        </div>
      </div>

      <!-- Compose form — fills remaining space -->
      <div class="compose-form animate-up" style="animation-delay:.08s">
        <ScenarioEditor @submit="onSubmit" />
      </div>

    </div>

    <!-- Loading overlay -->
    <div v-if="submitting" class="loading-overlay">
      <div class="loading-inner">
        <div class="loading-spinner"></div>
        <span class="loading-text font-mono">INITIALIZING SIMULATION</span>
      </div>
    </div>

    <!-- Error toast -->
    <div v-if="error" class="error-toast" @click="error = null">
      <span>{{ error }}</span>
      <button class="error-close">&times;</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ScenarioEditor from '../components/ScenarioEditor.vue'
import api from '../api'

const router = useRouter()
const submitting = ref(false)
const error = ref(null)

const features = [
  { num: '01', label: 'Any text content' },
  { num: '02', label: 'Up to 1M agents' },
  { num: '03', label: 'Twitter + Reddit' }
]

async function onSubmit(formData) {
  submitting.value = true
  error.value = null
  try {
    const { data } = await api.post('/scenarios', formData)
    router.push(`/research/${data.id}`)
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Something went wrong'
    error.value = msg
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.compose-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 16px 20px;
  overflow: hidden;
}

.compose-inner {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Header */
.compose-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 20px;
  flex-shrink: 0;
}

.compose-form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.compose-form > * {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.head-left {
  flex: 1;
}

.head-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 2px;
  margin-bottom: 6px;
}

.head-title {
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.head-accent {
  color: var(--green);
  font-style: italic;
  font-weight: 400;
}

.head-right {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* Feature pills */
.feat-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text2);
}

.feat-num {
  font-size: 9px;
  font-weight: 700;
  color: var(--text3);
  letter-spacing: 0.5px;
}

.feat-label {
  font-weight: 500;
}

/* Loading */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(250, 249, 247, 0.9);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

[data-theme="dark"] .loading-overlay {
  background: rgba(12, 12, 14, 0.9);
}

.loading-inner {
  text-align: center;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--green);
  border-radius: 50%;
  margin: 0 auto 10px;
  animation: spin 0.6s linear infinite;
}

.loading-text {
  font-size: 10px;
  color: var(--text3);
  letter-spacing: 1px;
}

/* Error */
.error-toast {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--red-bg);
  color: var(--red);
  border: 1px solid var(--red-border);
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  z-index: 200;
  animation: fadeUp 0.2s ease-out;
}

.error-close {
  font-size: 14px;
  color: var(--red);
  line-height: 1;
}

@media (max-width: 768px) {
  .compose-page { padding: 16px; }
  .compose-inner { margin-top: 16px; }
  .compose-head { flex-direction: column; align-items: flex-start; }
  .head-right { flex-wrap: wrap; }
}
</style>
