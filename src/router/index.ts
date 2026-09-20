import { createRouter, createWebHistory, RouterView, type RouteRecordRaw } from 'vue-router'

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
    // same beforeEnter on each leaf route. A shared parent's beforeEnter only
    // fires when the parent record is newly entering `to.matched`, not on a
    // sibling-to-sibling navigation (e.g. sign-in -> home) where it's already
    // matched — so `home`'s own extra locale need is kept on its own leaf
    // beforeEnter below instead of living here, guaranteeing it fires every
    // time `home` itself is entered, however the visitor arrives.
    beforeEnter: () => ensureAuthLocaleLoaded(),
    children: [
      {
        path: '',
        name: 'home',
        // Also re-requests the auth locale (already-resolved once loaded,
        // so effectively free) so the two loads run in parallel on a cold
        // entry into this whole `/` subtree, instead of waiting on the
        // parent's beforeEnter above to settle first.
        beforeEnter: () =>
          Promise.all([ensureAuthLocaleLoaded(), ensureStudentLocaleLoaded()]).then(() => undefined),
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
    // A pass-through parent (no layout of its own — just RouterView) so all
    // three exercise routes below share one beforeEnter instead of each
    // repeating it, the same hoisting this file already does for auth above.
    component: RouterView,
    beforeEnter: () => ensureTeacherLocaleLoaded(),
    children: [
      {
        path: '',
        name: 'teacher-exercises',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/ExerciseListView.vue'),
      },
      {
        path: 'new',
        name: 'teacher-exercise-new',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/ExerciseAuthoringView.vue'),
      },
      {
        path: ':id/edit',
        name: 'teacher-exercise-edit',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/ExerciseAuthoringView.vue'),
      },
    ],
  },
  {
    path: '/teacher/content',
    // Pass-through parent so all three content routes share one beforeEnter
    // instead of each repeating it, the same hoisting used for /teacher/exercises
    // above -- a route added under this prefix gets locale loading for free.
    component: RouterView,
    beforeEnter: () => ensureTeacherLocaleLoaded(),
    children: [
      {
        path: '',
        name: 'teacher-content',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/ContentListView.vue'),
      },
      {
        path: 'new',
        name: 'teacher-content-new',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/ContentAuthoringView.vue'),
      },
      {
        path: ':id/edit',
        name: 'teacher-content-edit',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/ContentAuthoringView.vue'),
      },
    ],
  },
  {
    path: '/teacher/paths',
    // Same pass-through hoisting as /teacher/content above.
    component: RouterView,
    beforeEnter: () => ensureTeacherLocaleLoaded(),
    children: [
      {
        path: '',
        name: 'teacher-paths',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/PathListView.vue'),
      },
      {
        path: 'new',
        name: 'teacher-path-new',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/PathBuilderView.vue'),
      },
      {
        path: ':id/edit',
        name: 'teacher-path-edit',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/PathBuilderView.vue'),
      },
    ],
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
