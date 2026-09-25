import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, ref } from 'vue'

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
      stubs: { RouterLink: RouterLinkStub, RouterView: true, AccountMenu: true },
    },
  })
}

function tabLabels(wrapper: ReturnType<typeof mountLayout>) {
  return wrapper
    .get('[data-test="app-bar-tabs"]')
    .findAllComponents(RouterLinkStub)
    .map((link: { text: () => string }) => link.text())
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

  it('shows a signed-out visitor the public header, not the app bar', () => {
    const wrapper = mountLayout()

    expect(wrapper.find('[data-test="app-shell-home"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'AppBar' }).exists()).toBe(false)
  })

  it('keeps the public header until registration has finished', () => {
    isSignedIn.value = true

    expect(mountLayout().findComponent({ name: 'AppBar' }).exists()).toBe(false)
  })

  it('gives a signed-in user the same app bar as every other page', () => {
    signInAs('student')
    const wrapper = mountLayout()

    expect(wrapper.findComponent({ name: 'AppBar' }).exists()).toBe(true)
    expect(wrapper.find('[data-test="app-shell-home"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="app-bar-home"]').exists()).toBe(true)
  })

  it('offers a student the learner sections', () => {
    signInAs('student')

    expect(tabLabels(mountLayout())).toEqual(['My path', 'My courses', 'Find a course'])
  })

  it('offers a teacher the learner sections as well as the authoring ones', () => {
    signInAs('teacher')

    expect(tabLabels(mountLayout())).toEqual([
      'My path',
      'My courses',
      'Find a course',
      'Content',
      'Paths',
      'Courses',
      'Exercises',
      'Diagrams',
    ])
  })

  it('offers the hamburger menu on a narrow screen', async () => {
    signInAs('admin')
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const wrapper = mountLayout()
    await nextTick()

    expect(wrapper.find('[data-test="app-bar-menu"]').exists()).toBe(true)
  })
})
