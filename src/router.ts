import { createRouter, createWebHistory } from 'vue-router'
import OverviewPage from './views/OverviewPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewPage },
    { path: '/test/:id', name: 'test', component: () => import('./views/TestPage.vue') },
    { path: '/summary', name: 'summary', component: () => import('./views/SummaryPage.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundPage.vue') },
  ],
})