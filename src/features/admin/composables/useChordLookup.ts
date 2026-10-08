import { reactive } from 'vue'

import { chordCheck, localChordCheck } from '@/features/admin/utils/chordCheck'
import type { ChordCheck } from '@/features/admin/utils/chordCheck'
import { useApi } from '@/shared/composables/useApi'

// A symbol's check doesn't change while the editor is open, so each symbol is asked about once
// per page load. A failed lookup is forgotten, so the next one tries again.
const checks = reactive(new Map<string, ChordCheck>())
const pending = new Set<string>()

/** Forgets every looked-up symbol. For tests. */
export function clearChordLookups() {
  checks.clear()
  pending.clear()
}

/**
 * Checks chord symbols as an author writes them: locally when the symbol doesn't parse, else
 * against the chord catalog. Ask with `lookUp`, outside rendering; `checkOf` reads the answer,
 * null until the catalog has given it.
 */
export function useChordLookup() {
  const { coreApi } = useApi()

  function lookUp(symbol: string) {
    if (checks.has(symbol) || pending.has(symbol)) return
    const local = localChordCheck(symbol)
    if (local) {
      checks.set(symbol, local)
      return
    }
    pending.add(symbol)
    void coreApi
      .GET('/chords', { params: { query: { symbol } } })
      .then(({ data }) => {
        if (data) checks.set(symbol, chordCheck(data))
      })
      .catch(() => {})
      .finally(() => pending.delete(symbol))
  }

  function checkOf(symbol: string): ChordCheck | null {
    return checks.get(symbol) ?? null
  }

  return { lookUp, checkOf }
}
