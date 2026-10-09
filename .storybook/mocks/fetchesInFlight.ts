// Imported before any app code: the API clients keep the `fetch` they find
// when their module loads, so the tracking wrapper has to be in place first.

const inFlight = new Set<Promise<unknown>>()
const pageFetch = window.fetch.bind(window)

window.fetch = (...args: Parameters<typeof fetch>) => {
  const response = pageFetch(...args)
  inFlight.add(response)
  response.then(
    () => inFlight.delete(response),
    () => inFlight.delete(response),
  )
  return response
}

/**
 * Resolves once every fetch started so far has settled, or after `limitMs` —
 * a story's deliberately pending request never settles.
 */
export function fetchesSettled(limitMs: number): Promise<void> {
  const limit = new Promise<void>((resolve) => setTimeout(resolve, limitMs))
  return Promise.race([Promise.allSettled([...inFlight]).then(() => undefined), limit])
}
