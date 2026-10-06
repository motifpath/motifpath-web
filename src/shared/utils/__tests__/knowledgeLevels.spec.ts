import { describe, expect, it } from 'vitest'

import { KNOWLEDGE_LEVELS, LEVEL_FILLS } from '@/shared/utils/knowledgeLevels'

/** The opacity a fill class paints at: 1 when it has none, 0 when it paints nothing. */
function opacityOf(fill: string): number {
  if (fill === 'fill-transparent') return 0
  const match = /\/\[?(\.?\d+)\]?$/.exec(fill)
  if (!match) return 1
  const value = Number(match[1])
  return value > 1 ? value / 100 : value
}

describe('knowledge level fills', () => {
  it('leave a new item unfilled', () => {
    expect(LEVEL_FILLS.new).toBe('fill-transparent')
  })

  it('paint every other level in one hue, stronger as the level rises', () => {
    const learnt = KNOWLEDGE_LEVELS.filter((level) => level !== 'new')

    expect(learnt.every((level) => LEVEL_FILLS[level].startsWith('fill-success'))).toBe(true)
    const opacities = learnt.map((level) => opacityOf(LEVEL_FILLS[level]))
    expect(opacities).toEqual([...opacities].sort((a, b) => a - b))
    expect(new Set(opacities).size).toBe(learnt.length)
    expect(opacities.at(-1)).toBe(1)
  })
})
