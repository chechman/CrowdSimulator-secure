import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 300000,
  headers: { 'Content-Type': 'application/json' }
})

export default api

export function connectWS(scenarioId) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const base = import.meta.env.VITE_WS_BASE_URL || `${proto}://${location.host}`
  return new WebSocket(`${base}/api/simulations/ws/${scenarioId}`)
}
