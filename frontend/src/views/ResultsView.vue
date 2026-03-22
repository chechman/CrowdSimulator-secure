<template>
  <div class="results-view">
    <div class="results-inner">
      <!-- Loading -->
      <template v-if="loading">
        <div class="skel-grid">
          <div v-for="n in 4" :key="n" class="skel skel-card"></div>
        </div>
        <div class="skel-row">
          <div class="skel skel-panel"></div>
          <div class="skel skel-panel"></div>
        </div>
      </template>

      <!-- Content -->
      <template v-else-if="results">
        <!-- Header -->
        <div class="res-head">
          <div class="res-head-left">
            <h1 class="res-title">Simulation Results</h1>
            <span class="res-badge font-mono">{{ results.scenario_id }}</span>
          </div>
          <div class="res-head-right">
            <button class="btn-outline" @click="router.push('/')">
              &larr; New Simulation
            </button>
          </div>
        </div>

        <!-- Original post preview -->
        <div class="res-original" v-if="originalPost">
          <span class="res-orig-lbl font-mono">ORIGINAL POST</span>
          <p class="res-orig-text">{{ originalPost }}</p>
        </div>

        <!-- Score cards -->
        <section class="res-section">
          <ScoreCards :results="results" />
        </section>

        <!-- Factions + Themes -->
        <section class="res-row two-col">
          <FactionBreakdown :factions="results.factions" />
          <ReactionThemes :themes="results.themes" />
        </section>

        <!-- Strategy + Rewrite -->
        <section class="res-row two-col-55">
          <StrategyPanel :strategy="results.strategy" />
          <RewriteSuggestion
            :original="originalPost"
            :rewrite="results.suggested_rewrite"
            @rerun="handleRerun"
          />
        </section>

        <!-- Footer actions -->
        <div class="res-footer">
          <button class="btn-main" @click="router.push('/')">
            Run Another Simulation &rarr;
          </button>
        </div>
      </template>

      <!-- Error -->
      <template v-else-if="error">
        <div class="res-error">
          <div class="res-error-icon">!</div>
          <h2>Something went wrong</h2>
          <p>{{ error }}</p>
          <button class="btn-main" @click="loadResults">Retry</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import ScoreCards from '../components/ScoreCards.vue'
import FactionBreakdown from '../components/FactionBreakdown.vue'
import ReactionThemes from '../components/ReactionThemes.vue'
import StrategyPanel from '../components/StrategyPanel.vue'
import RewriteSuggestion from '../components/RewriteSuggestion.vue'

const route = useRoute()
const router = useRouter()
const results = ref(null)
const loading = ref(true)
const error = ref(null)
const originalPost = ref('')

async function loadResults() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get(`/results/${route.params.id}`)
    results.value = data
    try {
      const scenario = await api.get(`/scenarios/${route.params.id}`)
      originalPost.value = scenario.data.post_text || ''
    } catch {
      originalPost.value = '(original post not available)'
    }
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Failed to load results'
  } finally {
    loading.value = false
  }
}

async function handleRerun(rewriteText) {
  try {
    const { data: scenario } = await api.get(`/scenarios/${route.params.id}`)
    const { data: newScenario } = await api.post('/scenarios', {
      post_text: rewriteText,
      audience_desc: scenario.audience_desc,
      platforms: scenario.platforms,
      agent_count: scenario.agent_count,
      rounds: scenario.rounds
    })
    router.push(`/research/${newScenario.id}`)
  } catch (e) {
    console.error('Failed to create rerun scenario:', e)
  }
}

onMounted(loadResults)
</script>

<style scoped>
.results-view {
  height: 100%;
  overflow-y: auto;
}

.results-inner {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px 24px 48px;
}

/* Header */
.res-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  animation: fadeUp 0.3s ease-out both;
}

.res-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.res-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.res-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text3);
}

.btn-outline {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text2);
  background: var(--white);
  transition: all 0.12s;
}

.btn-outline:hover {
  border-color: var(--border2);
  color: var(--text);
}

/* Original post */
.res-original {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
  animation: fadeUp 0.3s ease-out both;
  animation-delay: 0.03s;
}

.res-orig-lbl {
  font-size: 9px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 4px;
}

.res-orig-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
  font-style: italic;
}

/* Sections */
.res-section {
  margin-bottom: 10px;
}

.res-row {
  display: grid;
  gap: 10px;
  margin-bottom: 10px;
}

.two-col { grid-template-columns: 1fr 1fr; }
.two-col-55 { grid-template-columns: 55fr 45fr; }

.res-footer {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  animation: fadeUp 0.3s ease-out both;
  animation-delay: 0.2s;
}

/* Skeleton */
.skel {
  background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.skel-card { height: 90px; }

.skel-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.skel-panel { height: 200px; }

/* Error */
.res-error {
  text-align: center;
  padding: 60px 28px;
}

.res-error-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  color: var(--red);
  font-size: 18px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.res-error h2 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 6px;
}

.res-error p {
  color: var(--text2);
  font-size: 12px;
  margin-bottom: 14px;
}

@media (max-width: 900px) {
  .two-col, .two-col-55 { grid-template-columns: 1fr; }
  .skel-grid { grid-template-columns: 1fr 1fr; }
  .res-head { flex-direction: column; align-items: flex-start; gap: 8px; }
}
</style>
