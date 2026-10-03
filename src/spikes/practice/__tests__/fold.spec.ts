import { describe, expect, it } from 'vitest'

import { items } from '@/spikes/practice/fixtures/catalog'
import { emptyStore, processEvidence, stateOf } from '@/spikes/practice/fold'
import { deriveStates } from '@/spikes/practice/mastery'
import type { Evidence } from '@/spikes/practice/model'
import { simulate } from '@/spikes/practice/simulator'

const START = new Date('2026-10-01T09:00:00Z')
const DAY_MS = 86_400_000
const ARCHETYPES = ['improving', 'plateau', 'decaying', 'overconfident'] as const

const byTime = (a: Evidence, b: Evidence) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at)

function history(archetype: (typeof ARCHETYPES)[number]): Evidence[] {
  return [...simulate(archetype, { items, start: START, days: 21, seed: 1 }).evidence].sort(byTime)
}

function foldAll(evidence: Evidence[]) {
  let store = emptyStore()
  for (const e of evidence) store = processEvidence(store, e, items).store
  return store
}

describe('incremental fold', () => {
  for (const archetype of ARCHETYPES) {
    it(`${archetype}: folding one piece at a time gives the batch-derived state of every item`, () => {
      const evidence = history(archetype)
      const store = foldAll(evidence)
      for (const day of [21, 30]) {
        const now = new Date(START.getTime() + day * DAY_MS)
        const batch = deriveStates(items, evidence, now)
        for (const item of items)
          expect(stateOf(store, item, now)).toEqual(batch.get(item.item_key))
      }
    })
  }

  it('ignores a piece of evidence it has already folded', () => {
    const evidence = history('improving')
    const store = foldAll(evidence)
    const again = processEvidence(store, evidence[100]!, items)
    expect(again.action).toBe('duplicate')
    expect(again.store).toBe(store)
  })

  it('rebuilds an item from its evidence when a piece arrives late, with the same result as in order', () => {
    const evidence = history('overconfident')
    const late = evidence.find((e) => e.source === 'self_assessed')!
    const rest = evidence.filter((e) => e !== late)
    const result = processEvidence(foldAll(rest), late, items)
    expect(result.action).toBe('rebuilt')
    const now = new Date(START.getTime() + 21 * DAY_MS)
    const item = items.find((i) => i.item_key === late.item_key)!
    expect(stateOf(result.store, item, now)).toEqual(
      deriveStates(items, evidence, now).get(item.item_key),
    )
  })

  it('folds evidence in order without rebuilding', () => {
    const evidence = history('plateau')
    const store = foldAll(evidence.slice(0, -1))
    expect(processEvidence(store, evidence.at(-1)!, items).action).toBe('folded')
  })

  it('serves an item never practised as new', () => {
    const now = new Date(START.getTime() + 21 * DAY_MS)
    const item = items.find((i) => i.kind === 'fretboard_cell' && i.string === 1)!
    expect(stateOf(emptyStore(), item, now)).toEqual(
      deriveStates(items, [], now).get(item.item_key),
    )
  })
})
