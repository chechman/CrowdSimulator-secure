import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'compose',
    component: () => import('../views/ComposeView.vue')
  },
  {
    path: '/research/:id',
    name: 'research',
    component: () => import('../views/ResearchView.vue')
  },
  {
    path: '/simulate/:id',
    name: 'simulate',
    component: () => import('../views/SimulateView.vue')
  },
  {
    path: '/results/:id',
    name: 'results',
    component: () => import('../views/ResultsView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
