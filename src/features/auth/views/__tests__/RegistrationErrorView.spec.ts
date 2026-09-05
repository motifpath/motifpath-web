import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { CurrentUserState } from '@/stores/currentUser'

const currentUser = reactive({
  state: ref<CurrentUserState>('failed'),
  ensure: vi.fn(async () => {}),
  retry: vi.fn(async () => {}),
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({ signOut: vi.fn(async () => {}) }),
}))

import RegistrationErrorView from '@/features/auth/views/RegistrationErrorView.vue'

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/welcome/error', name: 'registration-error', component: RegistrationErrorView },
      { path: '/path', name: 'path', component: { template: '<div />' } },
      { path: '/sign-in', name: 'sign-in', component: { template: '<div />' } },
    ],
  })
}

describe('RegistrationErrorView', () => {
  it('explains that registration did not complete', async () => {
    currentUser.state = 'failed'
    const router = testRouter()
    await router.push('/welcome/error')
    await router.isReady()

    const wrapper = mount(RegistrationErrorView, { global: { plugins: [router] } })

    expect(wrapper.find('[data-test="registration-failed"]').exists()).toBe(true)
  })

  it('retries registration when the try-again control is used', async () => {
    currentUser.state = 'failed'
    const router = testRouter()
    await router.push('/welcome/error')
    await router.isReady()

    const wrapper = mount(RegistrationErrorView, { global: { plugins: [router] } })
    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(currentUser.retry).toHaveBeenCalledOnce()
  })

  it('calls ensure defensively if somehow reached while still idle (App.vue watcher ordering fragility)', async () => {
    currentUser.state = 'idle'
    currentUser.ensure.mockClear()
    const router = testRouter()
    await router.push('/welcome/error')
    await router.isReady()

    mount(RegistrationErrorView, { global: { plugins: [router] } })

    expect(currentUser.ensure).toHaveBeenCalledOnce()
  })

  it('does not call ensure when state is genuinely failed — "Try again" is what retries, not a silent auto-retry on mount', async () => {
    currentUser.state = 'failed'
    currentUser.ensure.mockClear()
    const router = testRouter()
    await router.push('/welcome/error')
    await router.isReady()

    mount(RegistrationErrorView, { global: { plugins: [router] } })

    expect(currentUser.ensure).not.toHaveBeenCalled()
  })

  // Full state-transition coverage lives in useRegistrationRedirect.spec.ts —
  // this is just a wiring smoke test confirming the view uses that composable.
  it('navigates to the path route once a retry succeeds', async () => {
    currentUser.state = 'failed'
    const router = testRouter()
    await router.push('/welcome/error')
    await router.isReady()

    mount(RegistrationErrorView, { global: { plugins: [router] } })

    currentUser.state = 'registered'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe('path')
  })
})
