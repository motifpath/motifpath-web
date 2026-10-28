import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { i18n, type SupportedLocale } from '@/i18n'

const startGoogleSignIn = vi.fn<(urls: { callbackUrl: string; completeUrl: string }) => Promise<void>>(async () => {})
vi.mock('@/features/auth/composables/useAuth', () => ({
  useAuth: () => ({ startGoogleSignIn }),
}))

const currentUser = reactive({
  locale: 'en' as SupportedLocale,
  setLocale: vi.fn(async (locale: SupportedLocale) => {
    currentUser.locale = locale
  }),
})
vi.mock('@/stores/currentUser', () => ({ useCurrentUserStore: () => currentUser }))

import LandingScreen from '@/features/auth/components/LandingScreen.vue'

const blank = { template: '<div />' }

async function mountAt(path: string, props: { busy?: boolean } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: blank },
      { path: '/sso-callback', name: 'sso-callback', component: blank },
      { path: '/welcome', name: 'registering', component: blank },
    ],
  })
  await router.push(path)
  await router.isReady()
  return mount(LandingScreen, { props, global: { plugins: [router] } })
}

describe('LandingScreen', () => {
  beforeEach(() => {
    startGoogleSignIn.mockReset()
    currentUser.locale = 'en'
    currentUser.setLocale.mockClear()
    i18n.global.locale.value = 'en'
  })

  it('leads with practice and has one action, Continue with Google', async () => {
    const wrapper = await mountAt('/')

    expect(wrapper.get('h1').text()).toBe('Practise a little every day. See your skills grow.')
    expect(wrapper.findAll('[data-test="google-button"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Free during the alpha. We use your Google name and email, nothing else.')
  })

  it('leaves for Google through the callback, and comes back to set the account up', async () => {
    const wrapper = await mountAt('/')

    await wrapper.get('[data-test="google-button"]').trigger('click')

    expect(startGoogleSignIn).toHaveBeenCalledWith({ callbackUrl: '/sso-callback', completeUrl: '/welcome' })
  })

  it('keeps where the visitor was heading through Google and back', async () => {
    const wrapper = await mountAt('/?redirect=/progress')

    await wrapper.get('[data-test="google-button"]').trigger('click')

    expect(startGoogleSignIn).toHaveBeenCalledWith({
      callbackUrl: '/sso-callback?redirect=/progress',
      completeUrl: '/welcome?redirect=/progress',
    })
  })

  it('says Google sign-in did not finish when the visitor came back without signing in', async () => {
    const wrapper = await mountAt('/?google=unfinished')

    expect(wrapper.get('[role="alert"]').text()).toContain(
      "Google sign-in didn't finish. Nothing was saved — try again when you're ready.",
    )
    expect(wrapper.find('[data-test="google-button"]').exists()).toBe(true)
  })

  it('says so when Google sign-in could not even start', async () => {
    startGoogleSignIn.mockRejectedValueOnce(new Error('Clerk has not loaded yet'))
    const wrapper = await mountAt('/')

    await wrapper.get('[data-test="google-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('shows no notice on a plain visit', async () => {
    const wrapper = await mountAt('/')

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('offers the other language before sign-in, and switches to it', async () => {
    const wrapper = await mountAt('/')
    const link = wrapper.get('[data-test="landing-language"]')

    expect(link.text()).toBe('Português (Brasil)')
    await link.trigger('click')

    expect(currentUser.setLocale).toHaveBeenCalledWith('pt-BR')
  })

  it('offers English to a visitor reading in Portuguese', async () => {
    currentUser.locale = 'pt-BR'
    const wrapper = await mountAt('/')

    expect(wrapper.get('[data-test="landing-language"]').text()).toBe('English')
  })

  it('shows the Google button busy while the account is set up', async () => {
    const wrapper = await mountAt('/', { busy: true })

    expect(wrapper.get('[data-test="google-button"]').attributes('aria-busy')).toBe('true')
  })

  it('keeps the brand, the action and the language switch clear of every device edge', async () => {
    const wrapper = await mountAt('/')

    expect(wrapper.get('[data-test="landing-layout"]').classes()).toEqual(
      expect.arrayContaining(['pt-inset-top', 'pb-inset-bottom', 'pl-inset-left', 'pr-inset-right']),
    )
  })
})
