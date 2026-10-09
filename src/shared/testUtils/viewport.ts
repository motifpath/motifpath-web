import { vi } from 'vitest'

type Listener = (event: { matches: boolean }) => void

/**
 * Replaces `window.matchMedia` with one that answers `min-width` / `max-width` queries (in px)
 * against a viewport `width` the test sets, and `prefers-color-scheme: dark` against `prefersDark`.
 * `resize` and `setPrefersDark` notify every listener whose answer changed, as a browser would.
 */
export function mockViewport(width: number, { prefersDark = false } = {}) {
  let currentWidth = width
  let dark = prefersDark
  const entries: { query: string; listeners: Listener[]; last: boolean }[] = []

  function evaluate(query: string): boolean {
    if (query.includes('prefers-color-scheme: dark')) return dark
    const min = /min-width:\s*(\d+)px/.exec(query)
    const max = /max-width:\s*(\d+)px/.exec(query)
    return (!min || currentWidth >= Number(min[1])) && (!max || currentWidth <= Number(max[1]))
  }

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const entry = { query, listeners: [] as Listener[], last: evaluate(query) }
    entries.push(entry)
    return {
      get matches() {
        return evaluate(query)
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: Listener) => entry.listeners.push(listener),
      removeEventListener: (_: string, listener: Listener) => {
        entry.listeners = entry.listeners.filter((l) => l !== listener)
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    }
  })

  function notify() {
    for (const entry of entries) {
      const now = evaluate(entry.query)
      if (now !== entry.last) {
        entry.last = now
        entry.listeners.forEach((listener) => listener({ matches: now }))
      }
    }
  }

  return {
    resize(next: number) {
      currentWidth = next
      notify()
    },
    setPrefersDark(next: boolean) {
      dark = next
      notify()
    },
  }
}
