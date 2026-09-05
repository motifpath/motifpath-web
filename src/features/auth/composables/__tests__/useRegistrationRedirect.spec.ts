import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent, reactive, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import type { CurrentUserState } from '@/stores/currentUser'

const currentUser = reactive({
  state: ref<CurrentUserState>('registering'),
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import { useRegistrationRedirect } from '@/features/auth/composables/useRegistrationRedirect'

const HostComponent = defineComponent({
  setup() {
    useRegistrationRedirect()
    return () => null
  },
})

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/welcome', name: 'registering', component: HostComponent },
      { path: '/welcome/error', name: 'registration-error', component: HostComponent },
      { path: '/path', name: 'path', component: { template: '<div />' } },
      { path: '/sign-in', name: 'sign-in', component: { template: '<div />' } },
    ],
  })
}

async function mountAt(fullPath: string) {
  const router = testRouter()
  await router.push(fullPath)
  await router.isReady()
  mount(HostComponent, { global: { plugins: [router] } })
  return router
}

describe('useRegistrationRedirect', () => {
  it('navigates to the path route once registered, when there is no redirect target', async () => {
    currentUser.state = 'registering'
    const router = await mountAt('/welcome')

    currentUser.state = 'registered'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe('path')
  })

  it('honors a non-empty redirect target once registered', async () => {
    currentUser.state = 'registering'
    const router = await mountAt('/welcome?redirect=%2Fpath')

    currentUser.state = 'registered'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe('path')
  })

  it('navigates to registration-error on failure', async () => {
    currentUser.state = 'registering'
    const router = await mountAt('/welcome')

    currentUser.state = 'failed'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe('registration-error')
  })

  it('navigates to sign-in when state resets to idle (e.g. signed out mid-flight)', async () => {
    currentUser.state = 'registering'
    const router = await mountAt('/welcome')

    currentUser.state = 'idle'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe('sign-in')
  })

  it('preserves the redirect target through a failure, so a later retry can still honor it', async () => {
    currentUser.state = 'registering'
    const router = await mountAt('/welcome?redirect=%2Fpath')

    currentUser.state = 'failed'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe('registration-error')
    expect(router.currentRoute.value.query.redirect).toBe('/path')
  })

  it('preserves the redirect target through a sign-out mid-flight', async () => {
    currentUser.state = 'registering'
    const router = await mountAt('/welcome?redirect=%2Fpath')

    currentUser.state = 'idle'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe('sign-in')
    expect(router.currentRoute.value.query.redirect).toBe('/path')
  })

  it('does not redundantly re-push registration-error when already sitting there on normal entry', async () => {
    currentUser.state = 'failed'
    const router = testRouter()
    await router.push('/welcome/error')
    await router.isReady()
    const pushSpy = vi.spyOn(router, 'push')

    // The immediate watch fires at mount with state already 'failed' and the
    // route already registration-error — must not push to where it already is.
    mount(HostComponent, { global: { plugins: [router] } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(pushSpy).not.toHaveBeenCalled()
  })
})
