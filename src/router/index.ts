import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { authChecker } from '@/features/auth/authBridge'
import { createAuthGuard } from '@/router/guards'

declare module 'vue-router' {
  interface RouteMeta {
    /** Route requires an authenticated Clerk session. */
    requiresAuth?: boolean
  }
}

/**
 * Route table for the PB-8b foundation. The authenticated app shell and its
 * routes (`/path`, 404, layouts) are added in Phase 5.
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/features/student/views/HomeView.vue'),
  },
  {
    path: '/sign-in',
    name: 'sign-in',
    component: () => import('@/features/auth/views/SignInView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(createAuthGuard(authChecker))
