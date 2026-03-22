<template>
  <div class="aud-chips">
    <div class="chips-row">
      <button
        v-for="chip in chips"
        :key="chip.label"
        class="chip font-mono"
        :class="{ active: activeLabel === chip.label }"
        @click="select(chip)"
      >{{ chip.label }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['select'])
const activeLabel = ref(null)

const chips = [
  { label: 'Tech Twitter', description: 'Software engineers, startup founders, VCs, and tech journalists. Mix of supportive builders and skeptical senior engineers who have seen hype cycles before. Some AI researchers who demand rigor.' },
  { label: 'Gen Z TikTok', description: 'Gen Z creators and consumers aged 16-25. Heavy meme culture, low tolerance for corporate speak, quick to ratio. Value authenticity and humor over polish. Will screenshot cringe for engagement.' },
  { label: 'PR crisis room', description: 'Journalists, PR professionals, corporate comms teams, and crisis management experts. Looking for angles, inconsistencies, and newsworthy quotes. Some sympathetic industry peers, many adversarial reporters.' },
  { label: 'Crypto community', description: 'Crypto traders, DeFi builders, web3 advocates, and blockchain skeptics. Highly polarized between true believers and vocal critics. Meme-heavy, fast-moving, very online.' },
  { label: 'News media pool', description: 'Beat reporters from major outlets, independent journalists, fact-checkers, and media critics. Professional, will dig into claims, look for sources, and amplify controversy if found.' },
  { label: 'Brand fans', description: 'Existing customers and brand advocates who genuinely love the product. Early adopters, community moderators, and superfans. Will defend against criticism but also hold the brand to high standards.' }
]

function select(chip) {
  activeLabel.value = chip.label
  emit('select', chip.description)
}
</script>

<style scoped>
.aud-chips { margin-top: 8px; }

.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  padding: 4px 10px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border);
  color: var(--text3);
  background: transparent;
  cursor: pointer;
  transition: all 0.1s;
  letter-spacing: 0.2px;
}

.chip:hover {
  border-color: var(--border2);
  color: var(--text2);
}

.chip.active {
  border-color: var(--green-border);
  color: var(--green);
  background: var(--green-bg);
}
</style>
