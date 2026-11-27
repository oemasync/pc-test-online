import { createRouter, createWebHistory } from 'vue-router'
import OverviewPage from './views/OverviewPage.vue'
import TestPage from './views/TestPage.vue'
import SummaryPage from './views/SummaryPage.vue'
import NotFoundPage from './views/NotFoundPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewPage },
    { path: '/test/:id', name: 'test', component: TestPage },
    { path: '/summary', name: 'summary', component: SummaryPage },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage },
  ],
})
