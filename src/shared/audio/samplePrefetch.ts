/**
 * A voice's recordings fetched ahead of Play, so a sound that can't be heard is known before it
 * is needed. Recordings never change at their URL, so one fetch a page puts each in the HTTP cache.
 * A failed fetch is forgotten, so the next check fetches it again.
 */
import type { components } from '@/api/generated/core-domain'

type Voice = components['schemas']['Voice']

const prefetched = new Map<string, Promise<boolean>>()

/** Forgets which recordings were prefetched. For tests. */
export function clearPrefetchedSamples() {
  prefetched.clear()
}

function fetchSample(url: string): Promise<boolean> {
  const known = prefetched.get(url)
  if (known) return known
  const pending = fetch(url)
    .then((response) => response.ok)
    .catch(() => false)
    .then((ok) => {
      if (!ok) prefetched.delete(url)
      return ok
    })
  prefetched.set(url, pending)
  return pending
}

/** Fetches every recording of a voice and says whether all of them came. */
export async function fetchVoiceSamples(voice: Voice): Promise<boolean> {
  const fetched = await Promise.all(voice.samples.map((sample) => fetchSample(sample.url)))
  return fetched.every(Boolean)
}
