import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { authChecker } from '@/features/auth/authBridge'
import { ensureStudentLocaleLoaded } from '@/features/student/locales'
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
    component: () => import('@/features/teacher/views/ExerciseListView.vue'),
  },
  {
    path: '/teacher/exercises/new',
    name: 'teacher-exercise-new',
    meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
    component: () => import('@/features/teacher/views/ExerciseAuthoringView.vue'),
  },
  {
    path: '/teacher/exercises/:id/edit',
    name: 'teacher-exercise-edit',
    meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
    component: () => import('@/features/teacher/views/ExerciseAuthoringView.vue'),
  },
  {
    path: '/teacher/content',
    name: 'teacher-content',
    meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
    component: () => import('@/features/teacher/views/ContentListView.vue'),
  },
  {
    path: '/teacher/content/new',
    name: 'teacher-content-new',
    meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
    component: () => import('@/features/teacher/views/ContentAuthoringView.vue'),
  },
  {
    path: '/teacher/content/:id/edit',
    name: 'teacher-content-edit',
    meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
    component: () => import('@/features/teacher/views/ContentAuthoringView.vue'),
  },
  {
    path: '/teacher/paths',
    name: 'teacher-paths',
    meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
    component: () => import('@/features/teacher/views/PathListView.vue'),
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
