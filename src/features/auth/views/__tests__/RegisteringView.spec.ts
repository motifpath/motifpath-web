import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { CurrentUserState } from '@/stores/currentUser'

const currentUser = reactive({
  state: ref<CurrentUserState>('registering'),
  ensure: vi.fn(async () => {}),
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import RegisteringView from '@/features/auth/views/RegisteringView.vue'

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/welcome', name: 'registering', component: RegisteringView },
      { path: '/welcome/error', name: 'registration-error', component: { template: '<div />' } },
      { path: '/path', name: 'path', component: { template: '<div />' } },
      { path: '/', name: 'home', component: { template: '<div />' } },
    ],
  })
}

describe('RegisteringView', () => {
  let router: ReturnType<typeof testRouter>

  beforeEach(async () => {
    currentUser.state = 'registering'
    currentUser.ensure.mockClear()
    router = testRouter()
    await router.push('/welcome')
    await router.isReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the setting-up-your-account loading state', () => {
    const wrapper = mount(RegisteringView, { global: { plugins: [router] } })

    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
  })

  it('calls ensure on mount, defensively, in case App.vue has not triggered it yet', () => {
    mount(RegisteringView, { global: { plugins: [router] } })

    expect(currentUser.ensure).toHaveBeenCalledOnce()
  })

  // Full state-transition coverage (redirect target, empty-redirect fallback,
  // failure, idle/sign-out) lives in useRegistrationRedirect.spec.ts — this is
  // just a wiring smoke test confirming the view actually uses that composable.
  it('wires up useRegistrationRedirect: navigates to path once registered', async () => {
    mount(RegisteringView, { global: { plugins: [router] } })

    currentUser.state = 'registered'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe('path')
  })
})
