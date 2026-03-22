<template>
  <div class="ig">
    <div class="ig-head">
      <span class="ig-title font-mono">INTERACTION GRAPH</span>
      <div class="ig-controls">
        <button class="ig-btn font-mono" @click="resetSelection" v-if="selectedNode">CLEAR</button>
        <span class="ig-meta font-mono">{{ agents.length }} agents · {{ edgeCount }} links</span>
      </div>
    </div>
    <div class="ig-main">
      <div class="ig-viz" ref="containerRef">
        <svg ref="svgRef"></svg>
      </div>
      <!-- Selected agent detail panel -->
      <Transition name="panel">
        <div class="ig-panel" v-if="selected">
          <div class="igp-head">
            <div class="igp-av" :style="{ background: archColor(selected.archetype) }">{{ initials(selected.name) }}</div>
            <div class="igp-info">
              <div class="igp-name">{{ selected.name }}</div>
              <div class="igp-arch font-mono" :style="{ color: archColor(selected.archetype) }">{{ selected.archetype }}</div>
            </div>
            <button class="igp-close" @click="resetSelection">&times;</button>
          </div>
          <div class="igp-stats">
            <div class="igp-stat">
              <span class="igp-sl font-mono">SENTIMENT</span>
              <span class="igp-sv font-mono" :class="sentCls(selected.sentiment)">{{ sentFmt(selected.sentiment) }}</span>
            </div>
            <div class="igp-stat">
              <span class="igp-sl font-mono">INFLUENCE</span>
              <span class="igp-sv font-mono">{{ selected.influence?.toFixed(1) }}</span>
            </div>
            <div class="igp-stat">
              <span class="igp-sl font-mono">ACTIONS</span>
              <span class="igp-sv font-mono">{{ selected.actionCount }}</span>
            </div>
          </div>
          <div class="igp-bio" v-if="selected.bio">{{ selected.bio }}</div>
          <div class="igp-conn" v-if="selectedConnections.length">
            <span class="igp-conn-lbl font-mono">CONNECTED TO ({{ selectedConnections.length }})</span>
            <div v-for="c in selectedConnections" :key="c.id" class="igp-conn-item" @click="selectNodeById(c.id)">
              <span class="igp-conn-dot" :style="{ background: archColor(c.archetype) }"></span>
              <span class="igp-conn-name">{{ c.name }}</span>
              <span class="igp-conn-w font-mono">{{ c.weight }}x</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
    <div class="ig-legend" v-if="uniqueArch.length">
      <div v-for="arch in uniqueArch" :key="arch.name" class="ig-lg">
        <span class="ig-lg-dot" :style="{ background: archColor(arch.name) }"></span>
        <span class="ig-lg-name font-mono">{{ arch.name }} <span class="ig-lg-ct">{{ arch.count }}</span></span>
      </div>
      <div class="ig-lg ig-lg-sent">
        <span class="ig-lg-ring pos"></span><span class="ig-lg-name font-mono">positive</span>
        <span class="ig-lg-ring neg"></span><span class="ig-lg-name font-mono">negative</span>
        <span class="ig-lg-ring neut"></span><span class="ig-lg-name font-mono">neutral</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'

const props = defineProps({
  agents: { type: Array, default: () => [] },
  actions: { type: Array, default: () => [] }
})

const containerRef = ref(null)
const svgRef = ref(null)
const selectedNode = ref(null)
const selected = ref(null)
const selectedConnections = ref([])
let simulation = null
let resizeObserver = null
let currentNodes = []
let currentLinks = []
let nodeElements = null
let linkElements = null

const colors = {
  supporter: '#059669', skeptic: '#dc2626', neutral: '#3b82f6',
  journalist: '#7c3aed', troll: '#f97316', influencer: '#d97706',
  expert: '#0891b2', casual_observer: '#6b7280'
}
const archColor = (arch) => colors[arch?.toLowerCase()] || '#6b7280'
const sentCls = (v) => v > 0.2 ? 'pos' : v < -0.2 ? 'neg' : 'neut'
const sentFmt = (v) => v == null ? '--' : v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)
const sentRingColor = (v) => v > 0.2 ? '#4ade80' : v < -0.2 ? '#f87171' : '#94a3b8'
const initials = (name) => name ? name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

const uniqueArch = computed(() => {
  const counts = {}
  for (const a of props.agents) {
    const arch = a.archetype?.toLowerCase() || 'neutral'
    counts[arch] = (counts[arch] || 0) + 1
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
})

// Archetype cluster positions — spread archetypes around the center
const archPositions = computed(() => {
  const archs = uniqueArch.value
  const pos = {}
  const angleStep = (2 * Math.PI) / Math.max(archs.length, 1)
  archs.forEach((a, i) => {
    pos[a.name] = { angle: i * angleStep }
  })
  return pos
})

// Build edges from actions
const edges = computed(() => {
  const links = new Map()
  const byRound = {}
  for (const a of props.actions) {
    const r = a.round || 0
    if (!byRound[r]) byRound[r] = []
    byRound[r].push(a)
  }
  for (const roundActions of Object.values(byRound)) {
    const interacting = roundActions.filter(a =>
      ['CREATE_COMMENT', 'COMMENT', 'LIKE_COMMENT', 'LIKE_POST', 'REPOST', 'LIKE'].includes(a.action_type)
    )
    for (let i = 0; i < interacting.length; i++) {
      for (let j = i + 1; j < interacting.length; j++) {
        const a = interacting[i].agent_id
        const b = interacting[j].agent_id
        if (a !== undefined && b !== undefined && a !== b) {
          const key = [Math.min(a, b), Math.max(a, b)].join('-')
          links.set(key, (links.get(key) || 0) + 1)
        }
      }
    }
  }
  return [...links.entries()].map(([key, weight]) => {
    const [s, t] = key.split('-').map(Number)
    return { source: s, target: t, weight }
  })
})

const edgeCount = computed(() => edges.value.length)

const actionCounts = computed(() => {
  const counts = {}
  for (const a of props.actions) {
    if (a.agent_id !== undefined) counts[a.agent_id] = (counts[a.agent_id] || 0) + 1
  }
  return counts
})

function selectNodeById(id) {
  const node = currentNodes.find(n => n.id === id)
  if (node) handleNodeClick(node)
}

function handleNodeClick(d) {
  selectedNode.value = d.id
  selected.value = { ...d }

  // Find connections
  const conns = []
  for (const link of currentLinks) {
    const sid = typeof link.source === 'object' ? link.source.id : link.source
    const tid = typeof link.target === 'object' ? link.target.id : link.target
    if (sid === d.id) {
      const target = currentNodes.find(n => n.id === tid)
      if (target) conns.push({ id: tid, name: target.name, archetype: target.archetype, weight: link.weight })
    } else if (tid === d.id) {
      const source = currentNodes.find(n => n.id === sid)
      if (source) conns.push({ id: sid, name: source.name, archetype: source.archetype, weight: link.weight })
    }
  }
  selectedConnections.value = conns.sort((a, b) => b.weight - a.weight)

  // Highlight
  updateHighlight(d.id)
}

function resetSelection() {
  selectedNode.value = null
  selected.value = null
  selectedConnections.value = []
  updateHighlight(null)
}

function updateHighlight(activeId) {
  if (!nodeElements || !linkElements) return

  if (activeId === null) {
    nodeElements.attr('opacity', 1)
    linkElements.attr('opacity', d => 0.15 + (d.weight / Math.max(1, ...currentLinks.map(l => l.weight))) * 0.4)
    return
  }

  const connectedIds = new Set([activeId])
  for (const link of currentLinks) {
    const sid = typeof link.source === 'object' ? link.source.id : link.source
    const tid = typeof link.target === 'object' ? link.target.id : link.target
    if (sid === activeId) connectedIds.add(tid)
    if (tid === activeId) connectedIds.add(sid)
  }

  nodeElements.attr('opacity', d => connectedIds.has(d.id) ? 1 : 0.12)
  linkElements
    .attr('opacity', d => {
      const sid = typeof d.source === 'object' ? d.source.id : d.source
      const tid = typeof d.target === 'object' ? d.target.id : d.target
      return (sid === activeId || tid === activeId) ? 0.8 : 0.04
    })
    .attr('stroke', d => {
      const sid = typeof d.source === 'object' ? d.source.id : d.source
      const tid = typeof d.target === 'object' ? d.target.id : d.target
      return (sid === activeId || tid === activeId) ? archColor(currentNodes.find(n => n.id === activeId)?.archetype) : '#d0cec9'
    })
}

function renderGraph() {
  if (!svgRef.value || !containerRef.value || props.agents.length === 0) return
  if (simulation) simulation.stop()

  const container = containerRef.value
  const width = container.clientWidth
  const height = container.clientHeight
  if (!width || !height) return

  const svg = d3.select(svgRef.value).attr('width', width).attr('height', height)
  svg.selectAll('*').remove()

  const ac = actionCounts.value
  const maxActions = Math.max(1, ...Object.values(ac))

  currentNodes = props.agents.map(a => ({
    id: a.agent_id,
    name: a.name,
    archetype: a.archetype?.toLowerCase() || 'neutral',
    influence: a.influence_weight || 0.5,
    sentiment: a.sentiment_bias || 0,
    bio: a.bio || '',
    actionCount: ac[a.agent_id] || 0,
    radius: Math.max(14, 10 + Math.sqrt((ac[a.agent_id] || 0) / maxActions) * 16 + (a.influence_weight || 0.5) * 3)
  }))

  const nodeIds = new Set(currentNodes.map(n => n.id))
  currentLinks = edges.value.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target)).map(e => ({ ...e }))

  const maxWeight = Math.max(1, ...currentLinks.map(l => l.weight))
  const archPos = archPositions.value
  const clusterRadius = Math.min(width, height) * 0.25

  simulation = d3.forceSimulation(currentNodes)
    .force('link', d3.forceLink(currentLinks).id(d => d.id).distance(d => 70 - (d.weight / maxWeight) * 30).strength(d => 0.2 + (d.weight / maxWeight) * 0.6))
    .force('charge', d3.forceManyBody().strength(d => -100 - d.radius * 6))
    .force('collide', d3.forceCollide(d => d.radius + 6).strength(0.8))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('archX', d3.forceX(d => {
      const ap = archPos[d.archetype]
      return ap ? width / 2 + Math.cos(ap.angle) * clusterRadius : width / 2
    }).strength(0.08))
    .force('archY', d3.forceY(d => {
      const ap = archPos[d.archetype]
      return ap ? height / 2 + Math.sin(ap.angle) * clusterRadius : height / 2
    }).strength(0.08))

  // Defs for arrow markers
  const defs = svg.append('defs')
  defs.append('filter').attr('id', 'glow')
    .append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur')

  const g = svg.append('g')
  svg.call(d3.zoom().scaleExtent([0.3, 4]).on('zoom', (e) => g.attr('transform', e.transform)))

  // Edges
  linkElements = g.append('g').selectAll('line').data(currentLinks).enter().append('line')
    .attr('stroke', '#d0cec9')
    .attr('stroke-width', d => Math.max(1, (d.weight / maxWeight) * 5))
    .attr('stroke-opacity', d => 0.15 + (d.weight / maxWeight) * 0.4)
    .attr('stroke-linecap', 'round')

  // Node groups
  nodeElements = g.append('g').selectAll('g').data(currentNodes).enter().append('g')
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
      .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
    )
    .on('click', (event, d) => {
      event.stopPropagation()
      handleNodeClick(d)
    })

  // Sentiment ring (outer)
  nodeElements.append('circle')
    .attr('r', d => d.radius + 3)
    .attr('fill', 'none')
    .attr('stroke', d => sentRingColor(d.sentiment))
    .attr('stroke-width', 2.5)
    .attr('stroke-dasharray', d => {
      const circ = 2 * Math.PI * (d.radius + 3)
      const filled = circ * 0.7
      return `${filled} ${circ - filled}`
    })
    .attr('opacity', 0.6)

  // Main circle
  nodeElements.append('circle')
    .attr('r', d => d.radius)
    .attr('fill', d => archColor(d.archetype))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)

  // Initials
  nodeElements.append('text')
    .text(d => initials(d.name))
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('font-size', d => Math.max(8, d.radius * 0.65) + 'px')
    .attr('fill', '#fff')
    .attr('font-weight', '700')
    .attr('font-family', 'DM Sans, system-ui, sans-serif')
    .style('pointer-events', 'none')

  // Name label — always visible
  nodeElements.append('text')
    .text(d => d.name?.length > 14 ? d.name.slice(0, 12) + '..' : d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', d => d.radius + 13)
    .attr('font-size', '10px')
    .attr('fill', 'var(--text, #333)')
    .attr('font-family', 'DM Sans, system-ui, sans-serif')
    .attr('font-weight', '600')
    .style('pointer-events', 'none')

  // Archetype label — smaller, below name
  nodeElements.append('text')
    .text(d => d.archetype)
    .attr('text-anchor', 'middle')
    .attr('dy', d => d.radius + 23)
    .attr('font-size', '7px')
    .attr('fill', d => archColor(d.archetype))
    .attr('font-family', 'var(--mono, monospace)')
    .attr('font-weight', '600')
    .attr('text-transform', 'uppercase')
    .attr('letter-spacing', '0.5px')
    .style('pointer-events', 'none')

  // Click background to deselect
  svg.on('click', () => resetSelection())

  simulation.on('tick', () => {
    linkElements
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
    nodeElements.attr('transform', d => `translate(${d.x},${d.y})`)
  })
}

let renderTimer = null
watch(() => [props.agents.length, props.actions.length], () => {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(() => nextTick(renderGraph), 500)
}, { deep: true })

onMounted(() => {
  resizeObserver = new ResizeObserver(() => nextTick(renderGraph))
  if (containerRef.value) resizeObserver.observe(containerRef.value)
  nextTick(renderGraph)
})

onUnmounted(() => {
  if (simulation) simulation.stop()
  if (resizeObserver) resizeObserver.disconnect()
  if (renderTimer) clearTimeout(renderTimer)
})
</script>

<style scoped>
.ig {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ig-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.ig-title { font-size: 10px; font-weight: 600; color: var(--text3); letter-spacing: 0.5px; }

.ig-controls { display: flex; align-items: center; gap: 6px; }
.ig-meta { font-size: 9px; color: var(--text3); }

.ig-btn {
  font-size: 8px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text3);
  cursor: pointer;
  letter-spacing: 0.3px;
}

.ig-btn:hover { border-color: var(--border2); color: var(--text2); }

.ig-main {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}

.ig-viz {
  flex: 1;
  min-height: 120px;
  position: relative;
  background: var(--bg, #faf9f7);
  overflow: hidden;
}

.ig-viz svg { width: 100%; height: 100%; display: block; }

/* Selected agent detail panel */
.ig-panel {
  width: 200px;
  border-left: 1px solid var(--border);
  background: var(--white);
  overflow-y: auto;
  flex-shrink: 0;
  padding: 10px;
}

.igp-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.igp-av {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.igp-info { flex: 1; min-width: 0; }
.igp-name { font-size: 12px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.igp-arch { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }

.igp-close {
  font-size: 16px;
  color: var(--text3);
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
}

.igp-close:hover { color: var(--text); }

.igp-stats {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 6px;
}

.igp-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.igp-sl { font-size: 8px; color: var(--text3); font-weight: 600; letter-spacing: 0.3px; }
.igp-sv { font-size: 10px; font-weight: 700; }
.igp-sv.pos { color: #059669; }
.igp-sv.neg { color: #dc2626; }
.igp-sv.neut { color: #6b7280; }

.igp-bio {
  font-size: 10px;
  line-height: 1.4;
  color: var(--text2);
  margin-bottom: 8px;
}

.igp-conn { margin-top: 4px; }

.igp-conn-lbl {
  font-size: 8px;
  font-weight: 600;
  color: var(--text3);
  letter-spacing: 0.3px;
  display: block;
  margin-bottom: 4px;
}

.igp-conn-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 0;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.1s;
}

.igp-conn-item:hover { background: var(--surface); }
.igp-conn-item:last-child { border-bottom: none; }

.igp-conn-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.igp-conn-name { font-size: 10px; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.igp-conn-w { font-size: 8px; color: var(--text3); font-weight: 600; flex-shrink: 0; }

/* Legend */
.ig-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding: 5px 10px;
  border-top: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
  align-items: center;
}

.ig-lg { display: flex; align-items: center; gap: 3px; }
.ig-lg-dot { width: 6px; height: 6px; border-radius: 50%; }
.ig-lg-name { font-size: 9px; color: var(--text3); text-transform: capitalize; }
.ig-lg-ct { color: var(--text3); opacity: 0.6; }

.ig-lg-sent {
  margin-left: auto;
  gap: 4px;
}

.ig-lg-ring {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid;
  background: transparent;
}

.ig-lg-ring.pos { border-color: #4ade80; }
.ig-lg-ring.neg { border-color: #f87171; }
.ig-lg-ring.neut { border-color: #94a3b8; }

/* Transitions */
.panel-enter-active { transition: all 0.2s ease-out; }
.panel-enter-from { opacity: 0; transform: translateX(10px); }
.panel-leave-active { transition: all 0.15s ease-in; }
.panel-leave-to { opacity: 0; transform: translateX(10px); }
</style>
