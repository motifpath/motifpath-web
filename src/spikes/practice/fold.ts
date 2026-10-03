/**
 * The single writer for one student's knowledge: each new piece of evidence is
 * folded into its item's running state, so a read never replays history. The
 * evidence log stays the source of truth: a duplicate is ignored by its id, and
 * a piece that arrives out of time order rebuilds its item from the log.
 */
import { EMPTY_FOLD, foldStep, viewState } from '@/spikes/practice/mastery'
import type { FoldState } from '@/spikes/practice/mastery'
import type { Evidence, KnowledgeState, PracticeItem } from '@/spikes/practice/model'

export interface KnowledgeStore {
  /** The evidence log, by id. */
  evidence: Map<string, Evidence>
  /** Running state per item key. */
  folds: Map<string, FoldState>
}

export type FoldAction = 'folded' | 'duplicate' | 'rebuilt' | 'unknown_item'

export function emptyStore(): KnowledgeStore {
  return { evidence: new Map(), folds: new Map() }
}

const byTime = (a: Evidence, b: Evidence) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at)

export function processEvidence(
  store: KnowledgeStore,
  e: Evidence,
  items: PracticeItem[],
): { store: KnowledgeStore; action: FoldAction } {
  if (store.evidence.has(e.evidence_id)) return { store, action: 'duplicate' }
  const item = items.find((i) => i.item_key === e.item_key)
  if (!item) return { store, action: 'unknown_item' }

  const evidence = new Map(store.evidence).set(e.evidence_id, e)
  const folds = new Map(store.folds)
  const prev = folds.get(e.item_key) ?? EMPTY_FOLD
  const late = prev.last_at !== null && Date.parse(e.occurred_at) < prev.last_at
  if (late) {
    const history = [...evidence.values()].filter((x) => x.item_key === e.item_key).sort(byTime)
    folds.set(e.item_key, history.reduce((f, x) => foldStep(item, f, x), EMPTY_FOLD))
  } else {
    folds.set(e.item_key, foldStep(item, prev, e))
  }
  return { store: { evidence, folds }, action: late ? 'rebuilt' : 'folded' }
}

export function stateOf(store: KnowledgeStore, item: PracticeItem, now: Date): KnowledgeState {
  return viewState(item, store.folds.get(item.item_key) ?? EMPTY_FOLD, now)
}
