import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { CurrentUserState } from '@/stores/currentUser'

const currentUser = reactive({
  state: ref<CurrentUserState>('failed'),
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

const { AccountBridge } = vi.hoisted(() => ({ AccountBridge: { name: 'AccountBridge', template: '<div />' } }))
vi.mock('@/features/auth/components/AccountBridge.vue', () => ({ default: AccountBridge }))

import RegistrationErrorView from '@/features/auth/views/RegistrationErrorView.vue'

async function mountAtError() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/welcome/error', name: 'registration-error', component: RegistrationErrorView },
      { path: '/', name: 'home', component: { template: '<div />' } },
    ],
  })
  await router.push('/welcome/error')
  await router.isReady()
  const wrapper = mount(RegistrationErrorView, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('RegistrationErrorView', () => {
  it('shows the account bridge, which says what went wrong and how to go on', async () => {
    currentUser.state = 'failed'

    const { wrapper } = await mountAtError()

    expect(wrapper.findComponent(AccountBridge).exists()).toBe(true)
  })

  // Full state-transition coverage lives in useRegistrationRedirect.spec.ts —
  // this is just a wiring smoke test confirming the view uses that composable.
  it('navigates Home once a retry succeeds', async () => {
    currentUser.state = 'failed'
    const { router } = await mountAtError()

    currentUser.state = 'registered'
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(router.currentRoute.value.name).toBe('home')
  })
})
