import { mount, RouterLinkStub, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, reactive, ref } from 'vue'
import { routeLocationKey } from 'vue-router'

import { mockViewport } from '@/shared/testUtils/viewport'

const clerk = {
  isLoaded: ref(true),
  isSignedIn: ref(true),
  getToken: vi.fn(async () => 'jwt-abc'),
  signOut: vi.fn(async () => {}),
}
const clerkUser = ref<{ firstName: string | null; primaryEmailAddress: { emailAddress: string } | null } | null>({
  firstName: 'Gilson',
  primaryEmailAddress: { emailAddress: 'gilson@example.com' },
})

vi.mock('@clerk/vue', () => ({
  useAuth: () => ({
    isLoaded: computed(() => clerk.isLoaded.value),
    isSignedIn: computed(() => clerk.isSignedIn.value),
    getToken: computed(() => clerk.getToken),
    signOut: computed(() => clerk.signOut),
  }),
  useUser: () => ({ user: computed(() => clerkUser.value) }),
  useClerk: () => computed(() => null),
}))

const { default: AccountMenu } = await import('@/shared/components/AccountMenu.vue')
const { useCurrentUserStore } = await import('@/stores/currentUser')
const { useThemeStore } = await import('@/stores/theme')

type Role = 'student' | 'teacher' | 'admin'

let wrappers: VueWrapper[] = []

function mountMenu({
  width = 390,
  role = 'student' as Role,
  routeMeta = {} as Record<string, unknown>,
  props = {} as Record<string, unknown>,
} = {}) {
  mockViewport(width)
  const pinia = createPinia()
  setActivePinia(pinia)
  const currentUser = useCurrentUserStore()
  currentUser.profile = {
    user_id: '00000000-0000-4000-8000-000000000001',
    role,
    display_name: 'Gilson Yamada',
    locale: { code: 'en', name: 'English' },
    registered_at: '2026-01-01T00:00:00Z',
  }
  const wrapper = mount(AccountMenu, {
    props,
    attachTo: document.body,
    global: {
      plugins: [pinia],
      stubs: { RouterLink: RouterLinkStub },
      provide: { [routeLocationKey as symbol]: reactive({ name: 'here', meta: routeMeta }) },
    },
  })
  wrappers.push(wrapper)
  return { wrapper, currentUser }
}

async function open(wrapper: VueWrapper) {
  await wrapper.get('[data-test="account-menu-avatar"]').trigger('click')
  await nextTick()
}

describe('AccountMenu', () => {
  beforeEach(() => {
    clerk.signOut.mockClear()
    window.localStorage.clear()
    clerkUser.value = { firstName: 'Gilson', primaryEmailAddress: { emailAddress: 'gilson@example.com' } }
  })
  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount())
    wrappers = []
  })

  it("shows the signed-in user's initial on the avatar, which says it opens a menu", () => {
    clerkUser.value = { firstName: 'Ana', primaryEmailAddress: null }
    const { wrapper } = mountMenu()

    const avatar = wrapper.get('[data-test="account-menu-avatar"]')
    expect(avatar.text()).toBe('A')
    expect(avatar.attributes('aria-haspopup')).toBe('dialog')
    expect(avatar.attributes('aria-expanded')).toBe('false')
  })

  it('can open from an "Account" row, for the foot of the sidebar', async () => {
    const { wrapper } = mountMenu({ width: 1280, props: { entry: 'row' } })

    const row = wrapper.get('[data-test="account-menu-avatar"]')
    expect(row.text()).toBe('Account')
    expect(row.attributes('aria-haspopup')).toBe('dialog')
    await open(wrapper)
    expect(wrapper.get('[data-test="account-menu"]').attributes('data-presentation')).toBe('menu')
  })

  it('on a phone, opens as a bottom sheet', async () => {
    const { wrapper } = mountMenu({ width: 390 })
    await open(wrapper)

    expect(wrapper.get('[data-test="account-menu"]').attributes('data-presentation')).toBe('sheet')
    expect(wrapper.get('[data-test="account-menu-avatar"]').attributes('aria-expanded')).toBe('true')
  })

  it.each([720, 1280])('at %i px, opens as a menu anchored to the avatar, not a dialog', async (width) => {
    const { wrapper } = mountMenu({ width })
    await open(wrapper)

    expect(wrapper.get('[data-test="account-menu"]').attributes('data-presentation')).toBe('menu')
  })

  it('says who is signed in: name and email', async () => {
    const { wrapper } = mountMenu()
    await open(wrapper)

    const identity = wrapper.get('[data-test="account-identity"]')
    expect(identity.text()).toContain('Gilson Yamada')
    expect(identity.text()).toContain('gilson@example.com')
    expect(identity.text()).not.toContain('Student')
  })

  it.each([
    ['teacher', 'Teacher'],
    ['admin', 'Admin'],
  ] as const)('names the role of a %s under the name', async (role, label) => {
    const { wrapper } = mountMenu({ role })
    await open(wrapper)

    expect(wrapper.get('[data-test="account-identity"]').text()).toContain(label)
  })

  describe('Appearance', () => {
    it('offers Auto, Light and Dark, with Auto chosen by default', async () => {
      const { wrapper } = mountMenu()
      await open(wrapper)

      const options = wrapper.findAll('[data-test^="appearance-"]')
      expect(options.map((o) => o.text())).toEqual(['Auto', 'Light', 'Dark'])
      expect(wrapper.get('[data-test="appearance-system"]').attributes('aria-checked')).toBe('true')
    })

    it('applies a choice at once, without closing the menu', async () => {
      const { wrapper } = mountMenu()
      await open(wrapper)

      await wrapper.get('[data-test="appearance-dark"]').trigger('click')

      expect(useThemeStore().preference).toBe('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(wrapper.find('[data-test="account-menu"]').exists()).toBe(true)
    })
  })

  describe('Language', () => {
    it('shows the current language on its row', async () => {
      const { wrapper } = mountMenu()
      await open(wrapper)

      expect(wrapper.get('[data-test="account-language"]').text()).toContain('English')
    })

    it('opens a sub-view in place of the menu, with a back arrow', async () => {
      const { wrapper } = mountMenu()
      await open(wrapper)

      await wrapper.get('[data-test="account-language"]').trigger('click')

      expect(wrapper.find('[data-test="account-identity"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="language-option-pt-BR"]').exists()).toBe(true)

      await wrapper.get('[data-test="overlay-back"]').trigger('click')
      expect(wrapper.find('[data-test="account-identity"]').exists()).toBe(true)
    })

    it('switches the language at once and goes back to the menu', async () => {
      const { wrapper, currentUser } = mountMenu()
      const setLocale = vi.spyOn(currentUser, 'setLocale').mockResolvedValue()
      await open(wrapper)
      await wrapper.get('[data-test="account-language"]').trigger('click')

      await wrapper.get('[data-test="language-option-pt-BR"]').trigger('click')

      expect(setLocale).toHaveBeenCalledWith('pt-BR')
      expect(wrapper.find('[data-test="account-identity"]').exists()).toBe(true)
    })

    it('marks the current language as chosen', async () => {
      const { wrapper } = mountMenu()
      await open(wrapper)
      await wrapper.get('[data-test="account-language"]').trigger('click')

      expect(wrapper.get('[data-test="language-option-en"]').attributes('aria-checked')).toBe('true')
      expect(wrapper.get('[data-test="language-option-pt-BR"]').attributes('aria-checked')).toBe('false')
    })
  })

  describe('Teach', () => {
    it('is not offered to a student: learning is open to every role, only authoring is gated', async () => {
      const { wrapper } = mountMenu({ role: 'student' })
      await open(wrapper)

      expect(wrapper.find('[data-test="account-teach"]').exists()).toBe(false)
    })

    it.each(['teacher', 'admin'] as const)('inside Teach, offers "Back to learning" in its place for a %s, landing on Home', async (role) => {
      const { wrapper } = mountMenu({ role, routeMeta: { requiresAuth: true, requiresRole: ['teacher', 'admin'] } })
      await open(wrapper)

      expect(wrapper.find('[data-test="account-teach"]').exists()).toBe(false)
      const back = wrapper.getComponent<typeof RouterLinkStub>('[data-test="account-back-to-learning"]')
      expect(back.text()).toContain('Back to learning')
      expect(back.props('to')).toEqual({ name: 'home' })
    })

    it('offers no "Back to learning" outside Teach', async () => {
      const { wrapper } = mountMenu({ role: 'admin', routeMeta: { requiresAuth: true } })
      await open(wrapper)

      expect(wrapper.find('[data-test="account-back-to-learning"]').exists()).toBe(false)
    })

    it.each(['teacher', 'admin'] as const)('is left to the sidebar on a desktop, for a %s', async (role) => {
      const { wrapper } = mountMenu({ role, width: 1280 })
      await open(wrapper)

      expect(wrapper.find('[data-test="account-teach"]').exists()).toBe(false)
    })

    it('stays in the menu on a tablet, whose rail has no Teach', async () => {
      const { wrapper } = mountMenu({ role: 'teacher', width: 720 })
      await open(wrapper)

      expect(wrapper.find('[data-test="account-teach"]').exists()).toBe(true)
    })

    it.each(['teacher', 'admin'] as const)('takes a %s to authoring', async (role) => {
      const { wrapper } = mountMenu({ role })
      await open(wrapper)

      const teach = wrapper.getComponent<typeof RouterLinkStub>('[data-test="account-teach"]')
      expect(teach.props('to')).toEqual({ name: 'teacher-content' })
    })
  })

  it('signs out at once, with no confirm', async () => {
    const { wrapper } = mountMenu()
    await open(wrapper)

    await wrapper.get('[data-test="sign-out"]').trigger('click')

    expect(clerk.signOut).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('closes on Esc and gives focus back to the avatar', async () => {
    const { wrapper } = mountMenu({ width: 1280 })
    const avatar = wrapper.get<HTMLButtonElement>('[data-test="account-menu-avatar"]')
    avatar.element.focus()
    await open(wrapper)

    await wrapper.get('[data-test="account-menu"]').trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(wrapper.find('[data-test="account-menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(avatar.element)
  })

  it('closes on a tap outside it', async () => {
    const { wrapper } = mountMenu({ width: 1280 })
    await open(wrapper)

    await wrapper.get('[data-test="overlay-scrim"]').trigger('click')

    expect(wrapper.find('[data-test="account-menu"]').exists()).toBe(false)
  })
})
