import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

const currentUser = reactive({ locale: 'en' as const, setLocale: vi.fn() })
vi.mock('@/stores/currentUser', () => ({ useCurrentUserStore: () => currentUser }))

import UnsubscribeView from '@/features/auth/views/UnsubscribeView.vue'

const blank = { template: '<div />' }

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: blank },
      { path: '/settings/emails', name: 'email-settings', component: blank },
      { path: '/unsubscribe', name: 'unsubscribe', component: UnsubscribeView },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}

function unsubscribed(kind: 'progress_report' | 'reminders') {
  return { data: { kind }, error: undefined, response: { status: 200 } }
}

describe('UnsubscribeView', () => {
  beforeEach(() => {
    POST.mockReset()
  })

  it('turns the emails off as the page opens, without signing in', async () => {
    POST.mockResolvedValueOnce(unsubscribed('progress_report'))

    const { wrapper } = await mountAt('/unsubscribe?token=tok.progress_report.sig')

    expect(POST).toHaveBeenCalledWith('/email-unsubscribes', {
      params: { query: { token: 'tok.progress_report.sig' } },
      body: {},
    })
    wrapper.unmount()
  })

  it.each([
    ['progress_report', 'Progress reports are off', 'weekly progress report'],
    ['reminders', 'Reminders are off', 'reminders anymore'],
  ] as const)('says which emails stopped: %s', async (kind, title, body) => {
    POST.mockResolvedValueOnce(unsubscribed(kind))

    const { wrapper } = await mountAt('/unsubscribe?token=abc')

    expect(wrapper.get('h1').text()).toBe(title)
    expect(wrapper.text()).toContain(body)
    wrapper.unmount()
  })

  it('links to the email settings once the emails are off', async () => {
    POST.mockResolvedValueOnce(unsubscribed('reminders'))
    const { wrapper, router } = await mountAt('/unsubscribe?token=abc')

    await wrapper.get('[data-test="unsubscribe-email-settings"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('email-settings')
    wrapper.unmount()
  })

  it('says a link that was refused did not work and changed nothing, and still links to the settings', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'invalid token' }, response: { status: 400 } })

    const { wrapper } = await mountAt('/unsubscribe?token=altered')

    expect(wrapper.get('h1').text()).toBe("This link didn't work")
    expect(wrapper.get('[data-test="inline-notice"]').text()).toBe('Nothing was changed: you still get the same emails as before.')
    expect(wrapper.find('[data-test="unsubscribe-email-settings"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('treats a link with no token as broken, without asking the server', async () => {
    const { wrapper } = await mountAt('/unsubscribe')

    expect(POST).not.toHaveBeenCalled()
    expect(wrapper.get('h1').text()).toBe("This link didn't work")
    wrapper.unmount()
  })

  it('offers to try again when the server could not be reached, and nothing changed', async () => {
    POST.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    POST.mockResolvedValueOnce(unsubscribed('progress_report'))

    const { wrapper } = await mountAt('/unsubscribe?token=abc')

    expect(wrapper.get('h1').text()).toBe("Couldn't turn the emails off")
    expect(wrapper.get('[data-test="inline-notice"]').text()).toBe('Nothing was changed: you still get the same emails as before.')

    await wrapper.get('[data-test="unsubscribe-retry"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Progress reports are off')
    wrapper.unmount()
  })

  it('treats a server error the same way: try again, nothing changed', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { wrapper } = await mountAt('/unsubscribe?token=abc')

    expect(wrapper.get('h1').text()).toBe("Couldn't turn the emails off")
    expect(wrapper.find('[data-test="unsubscribe-retry"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
