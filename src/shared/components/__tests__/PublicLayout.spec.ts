import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

const isSignedIn = ref(false)
vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({ isSignedIn }),
}))

const currentUser = reactive({
  isRegistered: false,
  profile: null as { role: 'student' | 'teacher' | 'admin' } | null,
})
vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import PublicLayout from '@/shared/components/PublicLayout.vue'

function mountLayout() {
  return mount(PublicLayout, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub, RouterView: true, AccountMenu: true, LearnerShell: true },
    },
  })
}

function signInAs(role: 'student' | 'teacher' | 'admin') {
  isSignedIn.value = true
  currentUser.isRegistered = true
  currentUser.profile = { role }
}

describe('PublicLayout', () => {
  beforeEach(() => {
    isSignedIn.value = false
    currentUser.isRegistered = false
    currentUser.profile = null
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('shows a signed-out visitor no shell at all: the landing brings its own layout', () => {
    const wrapper = mountLayout()

    expect(wrapper.find('[data-test="app-shell-home"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'LearnerShell' }).exists()).toBe(false)
  })

  it('shows no shell until registration has finished, so the bridges keep the landing layout', () => {
    isSignedIn.value = true

    const wrapper = mountLayout()

    expect(wrapper.find('[data-test="app-shell-home"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'LearnerShell' }).exists()).toBe(false)
  })

  it.each(['student', 'teacher', 'admin'] as const)('gives a signed-in %s Home inside the App Shell', (role) => {
    signInAs(role)
    const wrapper = mountLayout()

    expect(wrapper.findComponent({ name: 'LearnerShell' }).exists()).toBe(true)
    expect(wrapper.find('[data-test="app-shell-home"]').exists()).toBe(false)
  })
})
