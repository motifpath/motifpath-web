import { createRouter, createWebHistory, RouterView, type RouteRecordRaw } from 'vue-router'

import { authChecker } from '@/features/auth/authBridge'
import { ensureAuthLocaleLoaded } from '@/features/auth/locales'
import { ensureStudentLocaleLoaded } from '@/features/student/locales'
import { ensureAdminLocaleLoaded } from '@/features/admin/locales'
import { ensureTeacherLocaleLoaded } from '@/features/teacher/locales'
import { createAuthGuard, type Role } from '@/router/guards'
import { installOverlayHistory } from '@/shared/composables/useOverlayHistory'

declare module 'vue-router' {
  interface RouteMeta {
    /** Route requires an authenticated Clerk session. */
    requiresAuth?: boolean
    /** Route additionally requires the signed-in identity's role to be one of these. */
    requiresRole?: Role[]
    /** Route wants a wider content column than the app's usual reading width. */
    wideContent?: boolean
    /** Route takes a phone's full height: the bottom navigation bar steps aside (the rail and sidebar stay). */
    hidesBottomBar?: boolean
    /**
     * The route this one replaces while keeping the same form on screen (a new
     * item's first save), so arriving from it keeps the scroll position.
     */
    keepsScrollFrom?: string
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
          Promise.all([ensureAuthLocaleLoaded(), ensureStudentLocaleLoaded()]).then(
            () => undefined,
          ),
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
        // Wider than the app's usual column: the video would otherwise be
        // squeezed by a timed cue even when the viewport has room to spare.
        // A lesson is a page pushed onto My path, so on a phone it gets the height the bar would take.
        meta: { wideContent: true, hidesBottomBar: true },
        component: () => import('@/features/student/views/NodeView.vue'),
      },
      {
        path: 'nodes/:nodeId/practice',
        name: 'practice',
        // A practice run shows no navigation; its own bar holds Back and Next at the foot of a phone.
        meta: { hidesBottomBar: true },
        props: true,
        component: () => import('@/features/student/views/PracticeView.vue'),
      },
    ],
  },
  {
    path: '/courses',
    component: () => import('@/shared/components/AuthenticatedLayout.vue'),
    beforeEnter: () => ensureStudentLocaleLoaded(),
    children: [
      {
        path: '',
        name: 'course-catalog',
        // Open to every role: anyone can learn.
        meta: { requiresAuth: true },
        component: () => import('@/features/student/views/CourseCatalogView.vue'),
      },
      {
        path: 'mine',
        name: 'my-courses',
        meta: { requiresAuth: true },
        component: () => import('@/features/student/views/MyCoursesView.vue'),
      },
      {
        path: 'mine/:enrollmentId/completed',
        name: 'course-completed',
        meta: { requiresAuth: true },
        component: () => import('@/features/student/views/CourseCompletedView.vue'),
      },
      {
        path: ':courseId',
        name: 'course-detail',
        meta: { requiresAuth: true },
        component: () => import('@/features/student/views/CourseDetailView.vue'),
      },
    ],
  },
  {
    path: '/paths',
    component: () => import('@/shared/components/AuthenticatedLayout.vue'),
    beforeEnter: () => ensureStudentLocaleLoaded(),
    children: [
      {
        path: '',
        name: 'path-catalog',
        // Open to every role: anyone can learn.
        meta: { requiresAuth: true },
        component: () => import('@/features/student/views/PathCatalogView.vue'),
      },
      {
        path: ':learningPathId',
        name: 'path-detail',
        meta: { requiresAuth: true },
        component: () => import('@/features/student/views/PathDetailView.vue'),
      },
    ],
  },
  {
    // Practice opens the session setup directly; the dashboard is the home. Old links to
    // the former practice home keep their chosen instrument.
    path: '/practice',
    redirect: (to) => ({ name: 'practice-session', query: to.query }),
  },
  {
    // A practice run takes the whole screen, in the Practice Shell, with no app bar.
    path: '/practice/session',
    component: () => import('@/shared/components/PracticeLayout.vue'),
    beforeEnter: () => ensureStudentLocaleLoaded(),
    children: [
      {
        path: '',
        name: 'practice-session',
        // Open to every role: anyone can practise.
        meta: { requiresAuth: true },
        component: () => import('@/features/student/views/PracticeSessionView.vue'),
      },
    ],
  },
  {
    // Open to every role: anyone who can hear a diagram play. Signed in only,
    // since the voices it credits (GET /voices) are.
    path: '/credits',
    component: () => import('@/shared/components/AuthenticatedLayout.vue'),
    children: [
      {
        path: '',
        name: 'credits',
        meta: { requiresAuth: true },
        component: () => import('@/shared/components/CreditsView.vue'),
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
    path: '/teacher/courses',
    // Pass-through parent so the teacher locale loads on entry, as for the
    // other teacher sections.
    component: RouterView,
    beforeEnter: () => ensureTeacherLocaleLoaded(),
    children: [
      {
        path: '',
        name: 'teacher-courses',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/CourseListView.vue'),
      },
      {
        path: 'new',
        name: 'teacher-course-new',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/CourseBuilderView.vue'),
      },
      {
        path: ':id/edit',
        name: 'teacher-course-edit',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'], keepsScrollFrom: 'teacher-course-new' },
        component: () => import('@/features/teacher/views/CourseBuilderView.vue'),
      },
    ],
  },
  {
    path: '/teacher/diagrams',
    // Same pass-through hoisting as /teacher/content and /teacher/paths above.
    component: RouterView,
    beforeEnter: () => ensureTeacherLocaleLoaded(),
    children: [
      {
        path: '',
        name: 'teacher-diagrams',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/DiagramListView.vue'),
      },
      {
        path: 'new',
        name: 'teacher-diagram-new',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] },
        component: () => import('@/features/teacher/views/DiagramAuthoringView.vue'),
      },
      {
        path: ':id/edit',
        name: 'teacher-diagram-edit',
        meta: { requiresAuth: true, requiresRole: ['teacher', 'admin'], keepsScrollFrom: 'teacher-diagram-new' },
        component: () => import('@/features/teacher/views/DiagramAuthoringView.vue'),
      },
    ],
  },
  {
    path: '/admin/knowledge-map',
    name: 'admin-knowledge-map',
    meta: { requiresAuth: true, requiresRole: ['admin'] },
    beforeEnter: () => ensureAdminLocaleLoaded(),
    component: () => import('@/features/admin/views/KnowledgeMapEditorView.vue'),
  },
  {
    // A song chart a learner opens from a link takes the whole screen, with only a close control.
    // Open to every role: anyone signed in reads a published chart.
    path: '/songs/:songChartId',
    name: 'song-chart',
    meta: { requiresAuth: true },
    props: true,
    component: () => import('@/features/student/views/SongChartView.vue'),
  },
  {
    path: '/admin/song-charts',
    name: 'admin-song-charts',
    meta: { requiresAuth: true, requiresRole: ['admin'] },
    beforeEnter: () => ensureAdminLocaleLoaded(),
    component: () => import('@/features/admin/views/SongChartListView.vue'),
  },
  {
    path: '/admin/song-charts/new',
    name: 'admin-song-chart-new',
    meta: { requiresAuth: true, requiresRole: ['admin'] },
    beforeEnter: () => ensureAdminLocaleLoaded(),
    component: () => import('@/features/admin/views/SongChartEditorView.vue'),
  },
  {
    path: '/admin/song-charts/:songChartId',
    name: 'admin-song-chart',
    meta: { requiresAuth: true, requiresRole: ['admin'] },
    props: true,
    beforeEnter: () => ensureAdminLocaleLoaded(),
    component: () => import('@/features/admin/views/SongChartEditorView.vue'),
  },
  {
    path: '/admin/song-charts/:songChartId/preview',
    name: 'admin-song-chart-preview',
    meta: { requiresAuth: true, requiresRole: ['admin'] },
    props: true,
    beforeEnter: () => ensureAdminLocaleLoaded(),
    component: () => import('@/features/admin/views/SongChartPreviewView.vue'),
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
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.meta.keepsScrollFrom && to.meta.keepsScrollFrom === from.name) return false
    return { top: 0 }
  },
})

// First, so it sees every navigation from its start.
installOverlayHistory(router)
router.beforeEach(createAuthGuard(authChecker))
