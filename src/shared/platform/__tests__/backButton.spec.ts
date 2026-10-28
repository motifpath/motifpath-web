import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import { backAction, installBackButton, type NativeBackButton } from '@/shared/platform/backButton'

describe('backAction', () => {
  it('closes an open layer first, wherever the student is', () => {
    expect(backAction({ layerOpen: true, onHome: true, canGoBack: true })).toBe('back')
    expect(backAction({ layerOpen: true, onHome: false, canGoBack: false })).toBe('back')
  })

  it('goes back one page when there is one', () => {
    expect(backAction({ layerOpen: false, onHome: false, canGoBack: true })).toBe('back')
  })

  it('leaves the app from Home, without asking', () => {
    expect(backAction({ layerOpen: false, onHome: true, canGoBack: true })).toBe('exit')
    expect(backAction({ layerOpen: false, onHome: true, canGoBack: false })).toBe('exit')
  })

  it('lands on Home from a page opened with nothing behind it, rather than closing the app', () => {
    expect(backAction({ layerOpen: false, onHome: false, canGoBack: false })).toBe('home')
  })
})

describe('installBackButton', () => {
  type Listener = (event: { canGoBack: boolean }) => void

  function fakeDevice() {
    let listener: Listener | null = null
    const device: NativeBackButton & { press(canGoBack: boolean): void } = {
      addListener: vi.fn(async (_event: 'backButton', fn: Listener) => {
        listener = fn
        return { remove: async () => undefined }
      }),
      exitApp: vi.fn(async () => undefined),
      press(canGoBack) {
        listener?.({ canGoBack })
      },
    }
    return device
  }

  async function routerOn(path: string): Promise<Router> {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div />' } },
        { path: '/learning', name: 'my-courses', component: { template: '<div />' } },
      ],
    })
    await router.push(path)
    return router
  }

  afterEach(() => {
    window.history.replaceState(null, '')
    vi.restoreAllMocks()
  })

  it('steps back through history when Back takes the student somewhere in the app', async () => {
    const device = fakeDevice()
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    await installBackButton(await routerOn('/learning'), device)

    device.press(true)

    expect(back).toHaveBeenCalledOnce()
    expect(device.exitApp).not.toHaveBeenCalled()
  })

  it('closes an open layer on Home instead of leaving the app', async () => {
    const device = fakeDevice()
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined)
    await installBackButton(await routerOn('/'), device)
    window.history.replaceState({ overlay: 'overlay-1' }, '')

    device.press(true)

    expect(back).toHaveBeenCalledOnce()
    expect(device.exitApp).not.toHaveBeenCalled()
  })

  it('leaves the app from Home with nothing open', async () => {
    const device = fakeDevice()
    await installBackButton(await routerOn('/'), device)

    device.press(true)

    expect(device.exitApp).toHaveBeenCalledOnce()
  })

  it('opens Home when the page has nothing behind it', async () => {
    const device = fakeDevice()
    const router = await routerOn('/learning')
    await installBackButton(router, device)

    device.press(false)
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('home'))
    expect(device.exitApp).not.toHaveBeenCalled()
  })
})
