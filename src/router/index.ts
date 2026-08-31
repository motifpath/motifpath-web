import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/**
 * Minimal route table for the PB-8b foundation. The full route map
 * (authenticated/public layouts, `/path`, sign-in, 404) is added in PB-8b Phase 5.
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/features/student/views/HomeView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
