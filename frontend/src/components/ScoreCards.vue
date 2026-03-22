<template>
  <div class="scores-wrap">
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
    </div>
    <div class="sc-verdict" style="animation-delay:.1s" v-if="results.verdict">
      <div class="sc-verdict-bar" :class="verdictLevel"></div>
      <div class="sc-verdict-content">
        <div class="sc-verdict-head">
          <span class="sc-lbl font-mono">VERDICT</span>
          <span class="sc-verdict-level font-mono" :class="verdictLevel">{{ verdictLabel }}</span>
        </div>
        <div class="sc-verdict-txt">{{ results.verdict }}</div>
      </div>
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

const verdictLevel = computed(() => {
  const r = props.results
  const risk = r.risk_score || 0
  if (risk < 4) return 'safe'
  if (risk <= 6) return 'caution'
  return 'danger'
})

const verdictLabel = computed(() => {
  const level = verdictLevel.value
  if (level === 'safe') return 'SAFE TO POST'
  if (level === 'caution') return 'PROCEED WITH CAUTION'
  return 'HIGH RISK'
})
</script>

<style scoped>
.scores-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scores {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

/* Verdict — full-width card with colored left bar */
.sc-verdict {
  display: flex;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  animation: fadeUp 0.3s ease-out both;
  transition: border-color 0.12s;
}

.sc-verdict:hover { border-color: var(--border2); }

.sc-verdict-bar {
  width: 4px;
  flex-shrink: 0;
}

.sc-verdict-bar.safe { background: var(--green); }
.sc-verdict-bar.caution { background: var(--amber); }
.sc-verdict-bar.danger { background: var(--red); }

.sc-verdict-content {
  padding: 12px 14px;
  flex: 1;
}

.sc-verdict-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.sc-verdict-level {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}

.sc-verdict-level.safe {
  background: var(--green-bg);
  color: var(--green);
  border: 1px solid var(--green-border);
}

.sc-verdict-level.caution {
  background: var(--amber-bg, #fffbeb);
  color: var(--amber);
  border: 1px solid var(--amber-border, #fde68a);
}

.sc-verdict-level.danger {
  background: var(--red-bg);
  color: var(--red);
  border: 1px solid var(--red-border);
}

.sc-verdict-txt {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text);
}

@media (max-width: 500px) { .scores { grid-template-columns: 1fr; } }
</style>
