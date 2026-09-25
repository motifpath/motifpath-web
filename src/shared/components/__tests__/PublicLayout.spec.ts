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

function navLabels() {
  const wrapper = mount(PublicLayout, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub, RouterView: true, AccountMenu: true },
    },
  })
  return wrapper.find('nav').exists()
    ? wrapper
        .get('nav')
        .findAllComponents(RouterLinkStub)
        .map((link: { text: () => string }) => link.text())
    : []
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

  it('offers no app navigation to a signed-out visitor', () => {
    expect(navLabels()).toEqual([])
  })

  it('offers no app navigation until registration has finished', () => {
    isSignedIn.value = true

    expect(navLabels()).toEqual([])
  })

  it('offers a student the learner sections', () => {
    signInAs('student')

    expect(navLabels()).toEqual(['My path', 'My courses', 'Find a course'])
  })

  it('offers a teacher the authoring sections', () => {
    signInAs('teacher')

    expect(navLabels()).toEqual(['Content', 'Paths', 'Exercises', 'Diagrams'])
  })

  it('offers an admin both the learner and the authoring sections', () => {
    signInAs('admin')

    expect(navLabels()).toEqual([
      'My path',
      'My courses',
      'Find a course',
      'Content',
      'Paths',
      'Exercises',
      'Diagrams',
    ])
  })
})
