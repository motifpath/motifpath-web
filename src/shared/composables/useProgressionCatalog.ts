import { useApi } from '@/shared/composables/useApi'
import type { ProgressionCatalog } from '@/shared/utils/generatedChoice'

// The catalog is reference data, the same for everyone, so it is asked for once per page load.
// A failed load is forgotten, so the next question needing it asks again.
let cached: Promise<ProgressionCatalog | null> | null = null

/** Forgets the loaded catalog. For tests. */
export function clearProgressionCatalog() {
  cached = null
}

/**
 * The progression catalog the progression drills are graded against, by progression key: each
 * progression's numerals, one a bar. `load` resolves to null when it can't be loaded.
 */
export function useProgressionCatalog() {
  const { coreApi } = useApi()

  function load(): Promise<ProgressionCatalog | null> {
    if (cached) return cached
    const pending = coreApi
      .GET('/progressions')
      .then(({ data }) => (data ? Object.fromEntries(data.map((p) => [p.key, { bars: p.bars }])) : null))
      .catch(() => null)
      .then((catalog) => {
        if (!catalog) cached = null
        return catalog
      })
    cached = pending
    return pending
  }

  return { load }
}
