import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/vue', () => ({
  SignIn: { name: 'SignIn', template: '<div />' },
  useAuth: () => ({
    isLoaded: { value: true },
    isSignedIn: { value: false },
    getToken: { value: async () => null },
    signOut: { value: async () => {} },
  }),
}))

const ensureAuthLocaleLoaded = vi.fn(async () => {})
vi.mock('@/features/auth/locales', () => ({
  ensureAuthLocaleLoaded: () => ensureAuthLocaleLoaded(),
}))

const ensureStudentLocaleLoaded = vi.fn(async () => {})
vi.mock('@/features/student/locales', () => ({
  ensureStudentLocaleLoaded: () => ensureStudentLocaleLoaded(),
}))

const ensureTeacherLocaleLoaded = vi.fn(async () => {})
vi.mock('@/features/teacher/locales', () => ({
  ensureTeacherLocaleLoaded: () => ensureTeacherLocaleLoaded(),
}))

import { router } from '@/router'
import { updateAuthBridge } from '@/features/auth/authBridge'

describe('router locale loading', () => {
  beforeEach(async () => {
    updateAuthBridge({ isLoaded: true, isSignedIn: false, getToken: async () => null })
    await router.replace('/sign-in')
    await router.isReady()
    ensureAuthLocaleLoaded.mockClear()
    ensureStudentLocaleLoaded.mockClear()
    ensureTeacherLocaleLoaded.mockClear()
  })

  it('loads the student locale on a fresh entry straight into home', async () => {
    await router.replace('/some-other-place-first')
    await router.isReady()
    ensureStudentLocaleLoaded.mockClear()

    await router.replace('/')

    expect(ensureStudentLocaleLoaded).toHaveBeenCalled()
  })

  it('loads the student locale when navigating to home from a sibling route under the same parent', async () => {
    // Arrives at /sign-in via beforeEach — the '/' parent record is already
    // matched, so it will not be re-classified as "entering" on this push.
    await router.push('/')

    expect(ensureStudentLocaleLoaded).toHaveBeenCalled()
  })

  it('does not load the student locale when navigating to sign-in', async () => {
    await router.push('/')
    ensureStudentLocaleLoaded.mockClear()

    await router.push('/sign-in')

    expect(ensureStudentLocaleLoaded).not.toHaveBeenCalled()
  })
})
