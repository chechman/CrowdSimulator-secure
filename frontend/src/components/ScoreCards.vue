<template>
  <div class="scores">
    <div class="sc" v-for="(card, i) in cards" :key="card.label" :style="{ animationDelay: (i * 0.05) + 's' }">
      <div class="sc-lbl font-mono">{{ card.label }}</div>
      <div class="sc-main">
        <span class="sc-indicator" v-if="card.dot" :style="{ background: card.color }"></span>
        <span class="sc-val font-mono" :style="{ color: card.color }">{{ card.value }}</span>
        <span class="sc-unit font-mono" v-if="card.unit">{{ card.unit }}</span>
      </div>
      <div class="sc-sub">{{ card.sub }}</div>
      <div class="sc-explain">{{ card.explain }}</div>
    </div>
    <div class="sc sc-verdict" style="animation-delay:.15s">
      <div class="sc-lbl font-mono">VERDICT</div>
      <div class="sc-verdict-txt">{{ results.verdict }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ results: { type: Object, required: true } })

const cards = computed(() => {
  const r = props.results
  const agentCount = r.agents?.length || 0
  const actionCount = r.actions?.length || 0

  const sentPct = Math.round(r.sentiment_score * 100)
  const sentColor = sentPct >= 65 ? 'var(--green)' : sentPct >= 40 ? 'var(--amber)' : 'var(--red)'
  const sentSub = sentPct >= 75 ? 'strongly positive' : sentPct >= 65 ? 'positive' : sentPct >= 50 ? 'mixed — leans positive' : sentPct >= 40 ? 'mixed — leans negative' : 'negative'

  const riskColor = r.risk_score < 4 ? 'var(--green)' : r.risk_score <= 6 ? 'var(--amber)' : 'var(--red)'
  const riskSub = r.risk_score < 4 ? 'low risk — safe to post' : r.risk_score <= 6 ? 'medium — backlash likely' : 'high risk — proceed with caution'

  return [
    {
      label: 'SENTIMENT',
      value: sentPct + '%',
      color: sentColor,
      sub: sentSub,
      dot: true,
      explain: `Weighted average of how ${agentCount} simulated agents reacted. Positive actions (likes, supportive comments) push sentiment up, negative actions (dislikes, critical replies) push it down. Based on ${actionCount} total agent actions across all rounds.`
    },
    {
      label: 'RISK SCORE',
      value: r.risk_score,
      unit: '/10',
      color: riskColor,
      sub: riskSub,
      explain: `Measures likelihood of backlash, controversy, or reputational damage. Calculated from: faction polarization (how divided agents are), ratio of negative vs positive reactions, presence of aggressive agent behaviors (trolling, pile-ons), and topic sensitivity found during research.`
    },
  ]
})
</script>

<style scoped>
.scores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sc {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  animation: fadeUp 0.3s ease-out both;
  transition: border-color 0.12s;
}

.sc:hover { border-color: var(--border2); }

.sc-lbl {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--text3);
  margin-bottom: 6px;
}

.sc-main {
  display: flex;
  align-items: center;
  gap: 5px;
}

.sc-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sc-val {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  text-transform: capitalize;
}

.sc-unit {
  font-size: 12px;
  color: var(--text3);
  font-weight: 500;
  align-self: flex-end;
  margin-bottom: 1px;
}

.sc-sub {
  font-size: 10px;
  color: var(--text2);
  margin-top: 4px;
  font-weight: 600;
}

.sc-explain {
  font-size: 10px;
  color: var(--text3);
  line-height: 1.45;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}

.sc-verdict {
  display: flex;
  flex-direction: column;
}

.sc-verdict-txt {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: var(--text);
}

@media (max-width: 900px) { .scores { grid-template-columns: 1fr 1fr; } }
@media (max-width: 500px) { .scores { grid-template-columns: 1fr; } }
</style>
