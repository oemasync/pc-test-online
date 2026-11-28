import { createRouter, createWebHistory } from 'vue-router'
import OverviewPage from './views/OverviewPage.vue'

const CHUNK_RELOAD_KEY = 'pc-test-online:chunk-reload'

export function isChunkLoadError(err: unknown): boolean {
  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(
    message,
  )
}

export function handleRouterError(err: unknown, to: { fullPath: string }): boolean {
  if (!isChunkLoadError(err)) return false
  let guardState: 'reloaded' | 'fresh' | 'unavailable'
  try {
    guardState = sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1' ? 'reloaded' : 'fresh'
  } catch {
    guardState = 'unavailable'
  }
  if (guardState !== 'fresh') return false
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  } catch {
    return false
  }
  window.location.assign(to.fullPath)
  return true
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewPage },
    { path: '/test/:id', name: 'test', component: () => import('./views/TestPage.vue') },
    { path: '/summary', name: 'summary', component: () => import('./views/SummaryPage.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundPage.vue') },
  ],
})

router.onError((err, to) => {
  handleRouterError(err, to)
})

router.afterEach(() => {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  } catch {
    // ignore
  }
})