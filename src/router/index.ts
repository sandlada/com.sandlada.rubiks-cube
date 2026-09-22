import { createRouter, createWebHistory } from 'vue-router'
import { setupSeoGuard } from './meta'
import { routes } from './routes'

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

setupSeoGuard(router)

export default router
