import { shallowRef } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'
import type { ProgressionCatalog } from '@/shared/utils/generatedChoice'

type Progression = components['schemas']['Progression']

// The catalog is reference data, the same for everyone, so it is asked for once per page load.
// A failed load is forgotten, so the next question needing it asks again.
let cached: Promise<Progression[] | null> | null = null
// The latest list, for whoever shows it: a refresh reaches them without asking again.
const current = shallowRef<Progression[]>([])

/** Forgets the loaded catalog. For tests. */
export function clearProgressionCatalog() {
  cached = null
  current.value = []
}

/**
 * The progression catalog: `load` gives it the way the progression drills are graded against it,
 * by progression key with each progression's numerals, one a bar, and only those in the drills;
 * `progressions` gives every progression whole, names included. Both resolve to null when it can't be loaded.
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
        if (list) current.value = list
        else cached = null
        return list
      })
    cached = pending
    return pending
  }

  /** Asks again, after a progression was created or removed. A failure keeps the list there is. */
  function refresh(): Promise<Progression[] | null> {
    cached = null
    return progressions()
  }

  async function load(): Promise<ProgressionCatalog | null> {
    const list = await progressions()
    return list ? Object.fromEntries(list.filter((p) => p.in_drills).map((p) => [p.key, { bars: p.bars, mode: p.mode }])) : null
  }

  return { load, progressions, refresh, current }
}
