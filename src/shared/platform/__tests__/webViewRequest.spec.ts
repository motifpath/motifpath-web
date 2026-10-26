import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchInWebView, openInWebView } from '@/shared/platform/webViewRequest'

// Inside the app shell, the native layer replaces fetch and XHR with versions that carry each
// request over the native network stack, and keeps the WebView's own versions under these names.
function installNativeHttp(originals: { fetch?: unknown; open?: unknown }) {
  Reflect.set(window, 'CapacitorWebFetch', originals.fetch)
  Reflect.set(window, 'CapacitorWebXMLHttpRequest', { open: originals.open })
}

afterEach(() => {
  Reflect.deleteProperty(window, 'CapacitorWebFetch')
  Reflect.deleteProperty(window, 'CapacitorWebXMLHttpRequest')
  vi.unstubAllGlobals()
})

describe('openInWebView', () => {
  it('opens the request with the WebView’s own XHR when native HTTP has replaced it', () => {
    const webViewOpen = vi.fn()
    installNativeHttp({ open: webViewOpen })
    const request = new XMLHttpRequest()
    const nativeOpen = vi.spyOn(request, 'open')

    openInWebView(request, 'PUT', 'https://media.example/upload')

    expect(webViewOpen).toHaveBeenCalledWith('PUT', 'https://media.example/upload')
    expect(webViewOpen.mock.contexts[0]).toBe(request)
    expect(nativeOpen).not.toHaveBeenCalled()
  })

  it('opens the request as usual in a browser', () => {
    const request = new XMLHttpRequest()
    const open = vi.spyOn(request, 'open').mockImplementation(() => undefined)

    openInWebView(request, 'PUT', 'https://media.example/upload')

    expect(open).toHaveBeenCalledWith('PUT', 'https://media.example/upload')
  })
})

describe('fetchInWebView', () => {
  it('sends the request with the WebView’s own fetch when native HTTP has replaced it', async () => {
    const response = new Response(null, { status: 200 })
    const webViewFetch = vi.fn().mockResolvedValue(response)
    const nativeFetch = vi.fn()
    vi.stubGlobal('fetch', nativeFetch)
    installNativeHttp({ fetch: webViewFetch })
    const init = { method: 'PUT', body: 'bytes' }

    await expect(fetchInWebView('https://media.example/upload', init)).resolves.toBe(response)

    expect(webViewFetch).toHaveBeenCalledWith('https://media.example/upload', init)
    // The browser's fetch throws "Illegal invocation" unless it is called on the window.
    expect(webViewFetch.mock.contexts[0]).toBe(window)
    expect(nativeFetch).not.toHaveBeenCalled()
  })

  it('sends the request with the usual fetch in a browser', async () => {
    const response = new Response(null, { status: 200 })
    const browserFetch = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', browserFetch)

    await expect(fetchInWebView('https://media.example/upload', { method: 'PUT' })).resolves.toBe(response)

    expect(browserFetch).toHaveBeenCalledWith('https://media.example/upload', { method: 'PUT' })
  })
})
