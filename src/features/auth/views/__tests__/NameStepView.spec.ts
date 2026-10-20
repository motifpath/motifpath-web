import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

const isLoaded = ref(true)
const pendingSignUp = ref<{ firstName: string; lastName: string } | null>({ firstName: 'Dora', lastName: '' })
const completeSignUpName = vi.fn<(firstName: string, lastName: string) => Promise<void>>(async () => {})
vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({ isLoaded, pendingSignUp, completeSignUpName, signOut: vi.fn(), startGoogleSignIn: vi.fn() }),
}))

const currentUser = reactive({ locale: 'en' as const, setLocale: vi.fn() })
vi.mock('@/stores/currentUser', () => ({ useCurrentUserStore: () => currentUser }))

import NameStepView from '@/features/auth/views/NameStepView.vue'

const blank = { template: '<div />' }

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: blank },
      { path: '/sso-callback', name: 'sso-callback', component: blank },
      { path: '/welcome', name: 'registering', component: blank },
      { path: '/welcome/name', name: 'name-step', component: NameStepView },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}

describe('NameStepView', () => {
  beforeEach(() => {
    isLoaded.value = true
    pendingSignUp.value = { firstName: 'Dora', lastName: '' }
    completeSignUpName.mockClear()
  })

  it('asks a sign-up Google left without a last name for it', async () => {
    const { wrapper } = await mountAt('/welcome/name')

    expect(wrapper.get('h1').text()).toBe('What should we call you?')
    expect(wrapper.findAll('input')[0].element.value).toBe('Dora')
    wrapper.unmount()
  })

  it('completes the sign-up, then goes on to set the account up, keeping where the visitor was heading', async () => {
    const { wrapper, router } = await mountAt('/welcome/name?redirect=%2Fprogress')

    await wrapper.findAll('input')[1].setValue('Silva')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(completeSignUpName).toHaveBeenCalledWith('Dora', 'Silva')
    expect(router.currentRoute.value.name).toBe('registering')
    expect(router.currentRoute.value.query.redirect).toBe('/progress')
    wrapper.unmount()
  })

  it('sends a visitor with no sign-up waiting back to the landing', async () => {
    pendingSignUp.value = null

    const { wrapper, router } = await mountAt('/welcome/name')

    expect(router.currentRoute.value.name).toBe('home')
    wrapper.unmount()
  })
})
