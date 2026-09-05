import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

const currentUser = reactive({
  state: ref<'idle' | 'registering' | 'registered' | 'failed'>('failed'),
  retry: vi.fn(async () => {}),
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import RegistrationErrorView from '@/features/auth/views/RegistrationErrorView.vue'

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/welcome/error', name: 'registration-error', component: RegistrationErrorView },
      { path: '/path', name: 'path', component: { template: '<div />' } },
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
