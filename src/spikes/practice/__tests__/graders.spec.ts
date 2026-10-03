import { describe, expect, it } from 'vitest'

import golden from '@/spikes/practice/fixtures/graders.golden.json'
import { GRADERS, grade } from '@/spikes/practice/graders'
import type { GradeContext, GradeResult } from '@/spikes/practice/graders'
import type { ItemKind, PracticeItem, PracticeResponse } from '@/spikes/practice/model'

const ctx: GradeContext = {
  tuningOf: (id) => golden.context.tunings[id as keyof typeof golden.context.tunings] ?? null,
  exerciseKey: (id) =>
    golden.context.exercise_keys[id as keyof typeof golden.context.exercise_keys] ?? null,
}
const items = golden.items as Record<string, PracticeItem>

describe('grade — golden cases', () => {
  for (const c of golden.cases) {
    it(c.name, () => {
      const result = grade(items[c.item]!, c.response as PracticeResponse, ctx)
      expect(result).toEqual(c.expected as GradeResult)
    })
  }
})

describe('grader registry', () => {
  it('has a grader for every item kind', () => {
    const kinds: ItemKind[] = ['fretboard_cell', 'exercise', 'play_along', 'chord_change']
    for (const kind of kinds)
      expect(Object.values(GRADERS).some((g) => g.item_kinds.includes(kind))).toBe(true)
  })

  it('names each grader with its version, so stored evidence says which rules graded it', () => {
    for (const [id, g] of Object.entries(GRADERS))
      expect(id).toMatch(new RegExp(`^${g.name}\\.v\\d+$`))
  })
})
