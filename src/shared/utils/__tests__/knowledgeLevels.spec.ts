import { describe, expect, it } from 'vitest'

import { KNOWLEDGE_LEVELS, LEVEL_FILLS } from '@/shared/utils/knowledgeLevels'

describe('knowledge level fills', () => {
  it('leave a new item unfilled', () => {
    expect(LEVEL_FILLS.new).toBe('fill-transparent')
  })

  it('give every other level a colour of its own, so a map tells them apart at a glance', () => {
    const learnt = KNOWLEDGE_LEVELS.filter((level) => level !== 'new')

    expect(learnt.map((level) => LEVEL_FILLS[level])).toEqual(learnt.map((level) => `fill-level-${level}`))
  })
})
