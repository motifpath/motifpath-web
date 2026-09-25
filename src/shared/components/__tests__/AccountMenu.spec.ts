import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

const clerk = {
  isLoaded: ref(true),
  isSignedIn: ref(true),
  getToken: vi.fn(async () => 'jwt-abc'),
  signOut: vi.fn(async () => {}),
}
const clerkUser = ref<{ firstName: string | null; primaryEmailAddress: null } | null>({
  firstName: 'Gilson',
  primaryEmailAddress: null,
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

function mountMenu() {
  return mount(AccountMenu, {
    global: {
      plugins: [createPinia()],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

describe('AccountMenu', () => {
  beforeEach(() => {
    clerk.signOut.mockClear()
    clerkUser.value = { firstName: 'Gilson', primaryEmailAddress: null }
  })

  it("renders the signed-in user's display initial in the avatar", () => {
    clerkUser.value = { firstName: 'Ana', primaryEmailAddress: null }

    const wrapper = mountMenu()

    expect(wrapper.get('[data-test="account-menu-avatar"]').text()).toBe('A')
  })

  it('opens a menu with the locale switcher and sign out when the avatar is clicked', async () => {
    const wrapper = mountMenu()

    expect(wrapper.find('[data-test="account-menu"]').exists()).toBe(false)

    await wrapper.get('[data-test="account-menu-avatar"]').trigger('click')

    const menu = wrapper.get('[data-test="account-menu"]')
    expect(menu.find('[data-test="locale-switcher"]').exists()).toBe(true)
    expect(menu.findAll('[data-test="sign-out"]')).toHaveLength(1)
  })

  it("signs the user out when the menu's sign out item is used", async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-test="account-menu-avatar"]').trigger('click')

    await wrapper.get('[data-test="sign-out"]').trigger('click')

    expect(clerk.signOut).toHaveBeenCalledOnce()
  })

  it('closes the menu when its overlay is clicked', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-test="account-menu-avatar"]').trigger('click')

    await wrapper.get('[data-test="account-menu-overlay"]').trigger('click')

    expect(wrapper.find('[data-test="account-menu"]').exists()).toBe(false)
  })

  it('closes the menu when a locale option is selected', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-test="account-menu-avatar"]').trigger('click')

    await wrapper.get('[data-test="locale-option-pt-BR"]').trigger('click')

    expect(wrapper.find('[data-test="account-menu"]').exists()).toBe(false)
  })
})
