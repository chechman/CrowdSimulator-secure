<template>
  <div class="compose-page">
    <CrowdScene />
    <div class="compose-inner">
      <div class="compose-head animate-up">
        <div class="head-copy-block">
          <h1 class="head-title">
            Draft, simulate, decide.
          </h1>
          <p class="head-sub">Preview audience reaction before you post.</p>
        </div>
        <p class="head-copy">Start with the post. Tune the settings only if needed.</p>
      </div>

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
import { defineAsyncComponent } from 'vue'
import ScenarioEditor from '../components/ScenarioEditor.vue'
import api from '../api'

const CrowdScene = defineAsyncComponent(() => import('../components/CrowdScene.vue'))

const router = useRouter()
const submitting = ref(false)
const error = ref(null)

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
  z-index: 1;
  padding: 20px 24px 24px;
  overflow-y: auto;
  background: transparent;
}

.compose-inner {
  position: relative;
  z-index: 1;
  width: min(1280px, 100%);
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.compose-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  align-items: center;
  gap: 20px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--panel-glass);
}

.head-copy-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.head-title {
  max-width: 760px;
  font-size: clamp(26px, 3.4vw, 42px);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: -0.045em;
  color: var(--text);
}

.head-sub {
  font-size: 14px;
  line-height: 1.4;
  color: var(--text2);
}

.head-copy {
  font-size: 13px;
  line-height: 1.45;
  color: var(--text3);
  text-align: left;
}

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
  .compose-page { padding: 14px; }
  .compose-inner { gap: 14px; }
  .compose-head {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 10px;
    padding: 14px;
  }
  .head-title { font-size: 30px; }
  .head-sub { font-size: 14px; }
  .head-copy { max-width: none; font-size: 13px; text-align: left; }
}
</style>
