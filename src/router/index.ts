import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { authChecker } from '@/features/auth/authBridge'
import { createAuthGuard } from '@/router/guards'

declare module 'vue-router' {
  interface RouteMeta {
    /** Route requires an authenticated Clerk session. */
    requiresAuth?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/shared/components/PublicLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/features/student/views/HomeView.vue'),
      },
      {
        path: 'sign-in',
        name: 'sign-in',
        component: () => import('@/features/auth/views/SignInView.vue'),
      },
      {
        path: 'welcome',
        name: 'registering',
        meta: { requiresAuth: true },
        component: () => import('@/features/auth/views/RegisteringView.vue'),
      },
      {
        path: 'welcome/error',
        name: 'registration-error',
        meta: { requiresAuth: true },
        component: () => import('@/features/auth/views/RegistrationErrorView.vue'),
      },
    ],
  },
  {
    path: '/path',
    component: () => import('@/shared/components/AuthenticatedLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'path',
        component: () => import('@/features/student/views/PathView.vue'),
      },
      {
        // Node-keyed and path-agnostic — not nested under a path/assignment
        // id, so it needs no change when a student has more than one path
        // (ADR-017 multi-path readiness). PB-8e replaces the placeholder body.
        path: 'nodes/:nodeId',
        name: 'node',
        component: () => import('@/features/student/views/NodeView.vue'),
      },
    ],
  },
  {
    // PB-34 spike — throwaway, never merged (see src/spike/).
    path: '/spike',
    name: 'spike',
    component: () => import('@/spike/SpikeView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/shared/components/NotFoundView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(createAuthGuard(authChecker))
