import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'
import type { ProgressionCatalog } from '@/shared/utils/generatedChoice'

type Progression = components['schemas']['Progression']

// The catalog is reference data, the same for everyone, so it is asked for once per page load.
// A failed load is forgotten, so the next question needing it asks again.
let cached: Promise<Progression[] | null> | null = null

/** Forgets the loaded catalog. For tests. */
export function clearProgressionCatalog() {
  cached = null
}

/**
 * The progression catalog: `load` gives it the way the progression drills are graded against it,
 * by progression key with each progression's numerals, one a bar; `progressions` gives every
 * progression whole, names included. Both resolve to null when it can't be loaded.
 */
export function useProgressionCatalog() {
  const { coreApi } = useApi()

  function progressions(): Promise<Progression[] | null> {
    if (cached) return cached
    const pending = coreApi
      .GET('/progressions')
      .then(({ data }) => data ?? null)
      .catch(() => null)
      .then((list) => {
        if (!list) cached = null
        return list
      })
    cached = pending
    return pending
  }

  async function load(): Promise<ProgressionCatalog | null> {
    const list = await progressions()
    return list ? Object.fromEntries(list.map((p) => [p.key, { bars: p.bars }])) : null
  }

  return { load, progressions }
}
