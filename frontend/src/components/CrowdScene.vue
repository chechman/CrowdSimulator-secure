<template>
  <div ref="container" class="crowd-scene" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'

const container = ref(null)
let renderer, scene, camera, raf
let nodes = []
let edges = []
let nodeMesh, edgeLines
let mouse = { x: 0, y: 0 }
let clock = new THREE.Clock()

const NODE_COUNT = 80
const CONNECT_DIST = 2.8
const REPEL_DIST = 1.0
const DRIFT_SPEED = 0.15
const BOUNDS = 8

// archetype colors — matches CrowdSimulator persona types
const ARCHETYPE_COLORS = [
  new THREE.Color(0x3b82f6), // blue — supporter
  new THREE.Color(0xef4444), // red — skeptic
  new THREE.Color(0x8b5cf6), // purple — influencer
  new THREE.Color(0x10b981), // green — expert
  new THREE.Color(0xf59e0b), // amber — troll
  new THREE.Color(0x6366f1), // indigo — journalist
  new THREE.Color(0x64748b), // slate — casual observer
  new THREE.Color(0xec4899), // pink — contrarian
]

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

function initScene() {
  const el = container.value
  if (!el) return

  const w = el.clientWidth
  const h = el.clientHeight

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.setClearColor(0x000000, 0)
  el.appendChild(renderer.domElement)

  // scene
  scene = new THREE.Scene()

  // camera
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
  camera.position.set(0, 0, 14)

  // -- nodes as instanced mesh --
  const sphereGeo = new THREE.SphereGeometry(0.08, 12, 12)
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  nodeMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, NODE_COUNT)
  scene.add(nodeMesh)

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  for (let i = 0; i < NODE_COUNT; i++) {
    const archetype = ARCHETYPE_COLORS[i % ARCHETYPE_COLORS.length]
    const x = (Math.random() - 0.5) * BOUNDS * 2
    const y = (Math.random() - 0.5) * BOUNDS * 2
    const z = (Math.random() - 0.5) * 4

    // give each node a random drift direction
    const angle = Math.random() * Math.PI * 2
    const speed = DRIFT_SPEED * (0.5 + Math.random() * 0.5)

    nodes.push({
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, (Math.random() - 0.5) * 0.04),
      color: archetype,
      size: 0.06 + Math.random() * 0.06,
      pulse: Math.random() * Math.PI * 2,
      influenceRadius: 0.8 + Math.random() * 1.2,
    })

    dummy.position.set(x, y, z)
    const s = nodes[i].size / 0.08
    dummy.scale.set(s, s, s)
    dummy.updateMatrix()
    nodeMesh.setMatrixAt(i, dummy.matrix)
    nodeMesh.setColorAt(i, color.copy(archetype))
  }

  nodeMesh.instanceMatrix.needsUpdate = true
  nodeMesh.instanceColor.needsUpdate = true

  // -- edges as line segments --
  const edgeGeo = new THREE.BufferGeometry()
  const maxEdges = NODE_COUNT * 6
  const edgePositions = new Float32Array(maxEdges * 6)
  const edgeColors = new Float32Array(maxEdges * 6)
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3))
  edgeGeo.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3))

  const edgeMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  })
  edgeLines = new THREE.LineSegments(edgeGeo, edgeMat)
  scene.add(edgeLines)

  // subtle ambient particles (dust)
  const dustGeo = new THREE.BufferGeometry()
  const dustCount = 200
  const dustPositions = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 24
    dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 24
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 10
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dustMat = new THREE.PointsMaterial({
    size: 0.02,
    color: isDark() ? 0x3a3a44 : 0xc0c0c0,
    transparent: true,
    opacity: 0.4,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  scene.add(dust)

  // track mouse for subtle parallax
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('resize', onResize)
}

function onMouseMove(e) {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
  mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2
}

function onResize() {
  const el = container.value
  if (!el || !renderer) return
  const w = el.clientWidth
  const h = el.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function animate() {
  raf = requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)
  const t = clock.getElapsedTime()

  const dummy = new THREE.Object3D()
  const tempColor = new THREE.Color()

  // update nodes
  for (let i = 0; i < NODE_COUNT; i++) {
    const n = nodes[i]

    // drift
    n.pos.addScaledVector(n.vel, dt)

    // soft bounds — wrap around
    if (n.pos.x > BOUNDS) n.pos.x = -BOUNDS
    if (n.pos.x < -BOUNDS) n.pos.x = BOUNDS
    if (n.pos.y > BOUNDS) n.pos.y = -BOUNDS
    if (n.pos.y < -BOUNDS) n.pos.y = BOUNDS
    if (n.pos.z > 2) n.vel.z *= -1
    if (n.pos.z < -2) n.vel.z *= -1

    // gentle repulsion from nearby nodes
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const other = nodes[j]
      const dx = n.pos.x - other.pos.x
      const dy = n.pos.y - other.pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < REPEL_DIST && dist > 0.01) {
        const force = (REPEL_DIST - dist) * 0.02
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        n.vel.x += fx
        n.vel.y += fy
        other.vel.x -= fx
        other.vel.y -= fy
      }
    }

    // dampen velocity
    n.vel.x *= 0.998
    n.vel.y *= 0.998

    // pulsing glow — modulate size
    n.pulse += dt * 1.5
    const pulseScale = 1 + Math.sin(n.pulse) * 0.15
    const s = (n.size / 0.08) * pulseScale

    dummy.position.copy(n.pos)
    dummy.scale.set(s, s, s)
    dummy.updateMatrix()
    nodeMesh.setMatrixAt(i, dummy.matrix)

    // brighten on pulse peak
    const brightness = 0.7 + Math.sin(n.pulse) * 0.3
    tempColor.copy(n.color).multiplyScalar(brightness)
    nodeMesh.setColorAt(i, tempColor)
  }

  nodeMesh.instanceMatrix.needsUpdate = true
  nodeMesh.instanceColor.needsUpdate = true

  // update edges
  const posAttr = edgeLines.geometry.getAttribute('position')
  const colAttr = edgeLines.geometry.getAttribute('color')
  let edgeIdx = 0

  for (let i = 0; i < NODE_COUNT && edgeIdx < NODE_COUNT * 6; i++) {
    for (let j = i + 1; j < NODE_COUNT && edgeIdx < NODE_COUNT * 6; j++) {
      const a = nodes[i]
      const b = nodes[j]
      const dx = a.pos.x - b.pos.x
      const dy = a.pos.y - b.pos.y
      const dz = a.pos.z - b.pos.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist < CONNECT_DIST) {
        const alpha = 1 - dist / CONNECT_DIST
        const base = edgeIdx * 6

        posAttr.array[base] = a.pos.x
        posAttr.array[base + 1] = a.pos.y
        posAttr.array[base + 2] = a.pos.z
        posAttr.array[base + 3] = b.pos.x
        posAttr.array[base + 4] = b.pos.y
        posAttr.array[base + 5] = b.pos.z

        // blend the two node colors for the edge
        tempColor.copy(a.color).lerp(b.color, 0.5).multiplyScalar(alpha * 0.6)
        colAttr.array[base] = tempColor.r
        colAttr.array[base + 1] = tempColor.g
        colAttr.array[base + 2] = tempColor.b
        colAttr.array[base + 3] = tempColor.r
        colAttr.array[base + 4] = tempColor.g
        colAttr.array[base + 5] = tempColor.b

        edgeIdx++
      }
    }
  }

  // clear remaining edge slots
  for (let i = edgeIdx; i < NODE_COUNT * 6; i++) {
    const base = i * 6
    posAttr.array[base] = 0
    posAttr.array[base + 1] = 0
    posAttr.array[base + 2] = 0
    posAttr.array[base + 3] = 0
    posAttr.array[base + 4] = 0
    posAttr.array[base + 5] = 0
  }

  posAttr.needsUpdate = true
  colAttr.needsUpdate = true
  edgeLines.geometry.setDrawRange(0, edgeIdx * 2)

  // subtle mouse parallax on camera
  camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.02
  camera.position.y += (mouse.y * 0.4 - camera.position.y) * 0.02
  camera.lookAt(0, 0, 0)

  // slow orbit
  scene.rotation.z = Math.sin(t * 0.05) * 0.03

  renderer.render(scene, camera)
}

onMounted(() => {
  initScene()
  animate()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', onResize)
  if (renderer) {
    renderer.dispose()
    container.value?.removeChild(renderer.domElement)
  }
})
</script>

<style scoped>
.crowd-scene {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  animation: sceneReveal 1.5s ease-out 0.3s forwards;
}

@keyframes sceneReveal {
  to { opacity: 1; }
}
</style>
