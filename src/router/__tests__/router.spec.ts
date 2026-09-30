import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/vue', () => ({
  SignIn: { name: 'SignIn', template: '<div />' },
  useAuth: () => ({
    isLoaded: { value: true },
    isSignedIn: { value: false },
    getToken: { value: async () => null },
    signOut: { value: async () => {} },
  }),
}))

import { router } from '@/router'
import { updateAuthBridge, updateRegistrationBridge, updateRoleBridge } from '@/features/auth/authBridge'

describe('router', () => {
  beforeEach(async () => {
    window.scrollTo = vi.fn()
    updateRoleBridge(null)
    await router.replace('/')
    await router.isReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends an unauthenticated visitor from a protected route to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/path')

    expect(router.currentRoute.value.name).toBe('sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/path')
  })

  it('lets a registered visitor reach a protected route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')

    await router.push('/path')

    expect(router.currentRoute.value.name).toBe('path')
  })

  it('lets a registered visitor of any role reach the credits page', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')

    await router.push('/credits')

    expect(router.currentRoute.value.name).toBe('credits')
  })

  it('sends a signed-in visitor whose registration has not settled to the registering route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registering')

    await router.push('/path')

    expect(router.currentRoute.value.name).toBe('registering')
    expect(router.currentRoute.value.query.redirect).toBe('/path')
  })

  it('sends a signed-in visitor whose registration failed to the registration-error route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('failed')

    await router.push('/path')

    expect(router.currentRoute.value.name).toBe('registration-error')
    expect(router.currentRoute.value.query.redirect).toBe('/path')
  })

  it('sends an unauthenticated visitor away from the registering route to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/welcome')

    // The guard preserves ?redirect= the same as for any other protected
    // route — the self-referential-loop defense lives downstream, in
    // readRedirectQuery rejecting a bridge route's own path as a value
    // (see redirectQuery.spec.ts), not in the guard omitting it here.
    expect(router.currentRoute.value.name).toBe('sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/welcome')
  })

  it('sends an unauthenticated visitor away from the registration-error route to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/welcome/error')

    expect(router.currentRoute.value.name).toBe('sign-in')
  })

  it('lets a signed-in visitor stay on the registering route while idle/in-flight', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registering')

    await router.push('/welcome')

    expect(router.currentRoute.value.name).toBe('registering')
  })

  it('redirects a signed-in visitor away from the registering route once registration has actually failed', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('failed')

    await router.push('/welcome')

    expect(router.currentRoute.value.name).toBe('registration-error')
  })

  it('redirects a signed-in visitor away from registration-error back to registering if reached without an actual failure', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('idle')

    await router.push('/welcome/error')

    expect(router.currentRoute.value.name).toBe('registering')
  })

  it('lets a registered visitor reach a node route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')

    await router.push('/path/nodes/node-abc')

    expect(router.currentRoute.value.name).toBe('node')
    expect(router.currentRoute.value.params.nodeId).toBe('node-abc')
  })

  it('sends an unauthenticated visitor from a node route to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/path/nodes/node-abc')

    expect(router.currentRoute.value.name).toBe('sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/path/nodes/node-abc')
  })

  it('lets a registered visitor reach a node practice route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')

    await router.push('/path/nodes/node-abc/practice')

    expect(router.currentRoute.value.name).toBe('practice')
    expect(router.currentRoute.value.params.nodeId).toBe('node-abc')
  })

  it('sends an unauthenticated visitor from a node practice route to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/path/nodes/node-abc/practice')

    expect(router.currentRoute.value.name).toBe('sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/path/nodes/node-abc/practice')
  })

  it('lets a registered teacher reach the teacher exercise-authoring route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('teacher')

    await router.push('/teacher/exercises/new')

    expect(router.currentRoute.value.name).toBe('teacher-exercise-new')
  })

  it('lets a registered admin reach the teacher exercise-authoring route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('admin')

    await router.push('/teacher/exercises/new')

    expect(router.currentRoute.value.name).toBe('teacher-exercise-new')
  })

  it('sends a registered student away from the teacher exercise-authoring route to home', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('student')

    await router.push('/teacher/exercises/new')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('sends an unauthenticated visitor from the teacher exercise-authoring route to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/teacher/exercises/new')

    expect(router.currentRoute.value.name).toBe('sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/teacher/exercises/new')
  })

  it('lets a registered teacher reach the teacher content route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('teacher')

    await router.push('/teacher/content')

    expect(router.currentRoute.value.name).toBe('teacher-content')
  })

  it('sends a registered student away from the teacher content route to home', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('student')

    await router.push('/teacher/content')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('lets a registered teacher reach the teacher content-authoring route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('teacher')

    await router.push('/teacher/content/new')

    expect(router.currentRoute.value.name).toBe('teacher-content-new')
  })

  it('sends a registered student away from the teacher content-authoring route to home', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('student')

    await router.push('/teacher/content/new')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('lets a registered teacher reach the teacher paths route', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('teacher')

    await router.push('/teacher/paths')

    expect(router.currentRoute.value.name).toBe('teacher-paths')
  })

  it('sends a registered student away from the teacher paths route to home', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('student')

    await router.push('/teacher/paths')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('lets a registered student reach the course catalog', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('student')

    await router.push('/courses')

    expect(router.currentRoute.value.name).toBe('course-catalog')
  })

  it('lets a registered student reach the path catalog and a published path detail page', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('student')

    await router.push('/paths')
    expect(router.currentRoute.value.name).toBe('path-catalog')

    await router.push('/paths/lp-1')
    expect(router.currentRoute.value.name).toBe('path-detail')
    expect(router.currentRoute.value.params.learningPathId).toBe('lp-1')
  })

  it('lets a registered student reach a published course detail page', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('student')

    await router.push('/courses/c-1')

    expect(router.currentRoute.value.name).toBe('course-detail')
    expect(router.currentRoute.value.params.courseId).toBe('c-1')
  })

  it("lets a registered student reach their courses and paths", async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('student')

    await router.push('/courses/mine')

    expect(router.currentRoute.value.name).toBe('my-courses')
  })

  it.each([
    ['teacher', '/courses'],
    ['teacher', '/courses/mine'],
    ['admin', '/courses'],
    ['admin', '/courses/mine'],
  ] as const)('lets a registered %s reach the learner page %s', async (role, path) => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge(role)

    await router.push(path)

    expect(router.currentRoute.value.path).toBe(path)
  })

  it.each(['teacher', 'admin'] as const)("lets a registered %s reach the teacher course list", async (role) => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge(role)

    await router.push('/teacher/courses')

    expect(router.currentRoute.value.name).toBe('teacher-courses')
  })

  it('sends a registered student away from the teacher course list to home', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: true, getToken: async () => 'jwt' })
    updateRegistrationBridge('registered')
    updateRoleBridge('student')

    await router.push('/teacher/courses')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('sends an unauthenticated visitor from the course catalog to sign-in', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/courses')

    expect(router.currentRoute.value.name).toBe('sign-in')
  })

  // A resolved location as the scroll behavior receives it: always named here.
  function namedLocation(...args: Parameters<typeof router.resolve>) {
    const { name, ...location } = router.resolve(...args)
    if (!name) throw new Error('expected a named route')
    return { ...location, name }
  }

  it('opens a newly visited page at the top, and a revisited one where the visitor left it', async () => {
    const scroll = router.options.scrollBehavior!
    const catalog = namedLocation({ name: 'course-catalog' })
    const detail = namedLocation({ name: 'course-detail', params: { courseId: 'c-1' } })

    expect(await scroll(detail, catalog, null)).toEqual({ top: 0 })
    expect(await scroll(catalog, detail, { left: 0, top: 640 })).toEqual({ left: 0, top: 640 })
  })

  it.each([
    ['teacher-course-new', 'teacher-course-edit'],
    ['teacher-diagram-new', 'teacher-diagram-edit'],
  ])('keeps an author where they are when %s moves to %s after the first save', async (newRoute, editRoute) => {
    const scroll = router.options.scrollBehavior!

    expect(
      await scroll(namedLocation({ name: editRoute, params: { id: 'x-1' } }), namedLocation({ name: newRoute }), null),
    ).toBe(false)
  })

  it('resolves an unknown path to the not-found route', async () => {
    await router.push('/no/such/page')

    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('keeps the home route public', async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('home')
  })
})
