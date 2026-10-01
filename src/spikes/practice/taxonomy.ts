/** Rollups of item knowledge over the Skill/Concept tree. */
import type { KnowledgeState, Level, PracticeItem, TaxonomyNode } from '@/spikes/practice/model'

export function descendantIds(tree: TaxonomyNode[], id: string): string[] {
  const out = [id]
  for (let i = 0; i < out.length; i++) {
    for (const node of tree) if (node.parent_id === out[i]) out.push(node.id)
  }
  return out
}

export interface Rollup {
  total: number
  by_level: Record<Level, number>
  fading: number
  /** Mean fluency over seen items; 0 when none seen. */
  mean_fluency: number
}

export function itemsUnder(tree: TaxonomyNode[], items: PracticeItem[], id: string): PracticeItem[] {
  const ids = new Set(descendantIds(tree, id))
  return items.filter((i) => i.skill_ids.some((s) => ids.has(s)) || i.concept_ids.some((c) => ids.has(c)))
}

export function rollup(
  tree: TaxonomyNode[],
  items: PracticeItem[],
  states: Map<string, KnowledgeState>,
  id: string,
): Rollup {
  const under = itemsUnder(tree, items, id)
  const by_level: Record<Level, number> = { new: 0, learning: 0, accurate: 0, fluent: 0, retained: 0 }
  let fading = 0
  let fluencySum = 0
  let seen = 0
  for (const item of under) {
    const state = states.get(item.item_key)
    if (!state || state.attempts === 0) {
      by_level.new++
      continue
    }
    by_level[state.effective_level]++
    if (state.fading) fading++
    fluencySum += state.fluency
    seen++
  }
  return { total: under.length, by_level, fading, mean_fluency: seen ? fluencySum / seen : 0 }
}
