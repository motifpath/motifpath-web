import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { authChecker } from '@/features/auth/authBridge'
import { ensureAuthLocaleLoaded } from '@/features/auth/locales'
import { ensureStudentLocaleLoaded } from '@/features/student/locales'
import { ensureTeacherLocaleLoaded } from '@/features/teacher/locales'
import { createAuthGuard, type Role } from '@/router/guards'

declare module 'vue-router' {
  interface RouteMeta {
    /** Route requires an authenticated Clerk session. */
    requiresAuth?: boolean
    /** Route additionally requires the signed-in identity's role to be one of these. */
    requiresRole?: Role[]
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/shared/components/PublicLayout.vue'),
    // Three of this path's four children are auth views (sign-in, the
    // registering bridge, and the registration-error screen) — loading the
    // auth locale here once covers all of them instead of repeating the
    // same beforeEnter on each leaf route.
    beforeEnter: () => ensureAuthLocaleLoaded(),
    children: [
      {
        path: '',
        name: 'home',
        beforeEnter: () => ensureStudentLocaleLoaded(),
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
    beforeEnter: () => ensureStudentLocaleLoaded(),
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
      {
        path: 'nodes/:nodeId/practice',
        name: 'practice',
        props: true,
        component: () => import('@/features/student/views/PracticeView.vue'),
      },
    ],
  },
  {
    path: '/teacher/exercises',
    name: 'teacher-exercises',
    meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
    beforeEnter: () => ensureTeacherLocaleLoaded(),
    component: () => import('@/features/teacher/views/ExerciseListView.vue'),
  },
  {
    path: '/teacher/exercises/new',
    name: 'teacher-exercise-new',
    meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
    beforeEnter: () => ensureTeacherLocaleLoaded(),
    component: () => import('@/features/teacher/views/ExerciseAuthoringView.vue'),
  },
  {
    path: '/teacher/exercises/:id/edit',
    name: 'teacher-exercise-edit',
    meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
    beforeEnter: () => ensureTeacherLocaleLoaded(),
    component: () => import('@/features/teacher/views/ExerciseAuthoringView.vue'),
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
