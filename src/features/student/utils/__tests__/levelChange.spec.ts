import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { levelChange } from '@/features/student/utils/levelChange'

type FocusNode = components['schemas']['PracticeFocusNode']
type Progress = components['schemas']['PracticeSubjectProgress']
type Rung = components['schemas']['PracticeRung']
type Level = components['schemas']['KnowledgeLevel']

const NODE = 'aaaaaaaa-0000-4000-8000-000000000001'

function before(rung: Rung, level: Level): FocusNode {
  return { node_id: NODE, names: { en: 'Diatonic chords' }, rung, rung_level: level }
}

function after(currentRung: Rung, rungs: [Rung, Level][]): Progress {
  return { node_id: NODE, current_rung: currentRung, rungs: rungs.map(([rung, level]) => ({ rung, level })) }
}

describe('levelChange', () => {
  const cases: { name: string; node: FocusNode; progress: Progress; want: ReturnType<typeof levelChange> }[] = [
    {
      name: 'reaching accurate names the subject’s current rung now as next',
      node: before('know', 'learning'),
      progress: after('hear', [['know', 'accurate'], ['hear', 'new']]),
      want: { rung: 'know', before: 'learning', after: 'accurate', next: 'hear' },
    },
    {
      name: 'reaching better than accurate from below names the next rung too',
      node: before('know', 'new'),
      progress: after('hear', [['know', 'fluent'], ['hear', 'new']]),
      want: { rung: 'know', before: 'new', after: 'fluent', next: 'hear' },
    },
    {
      name: 'reaching accurate on the top rung names no next rung',
      node: before('know', 'learning'),
      progress: after('know', [['know', 'accurate']]),
      want: { rung: 'know', before: 'learning', after: 'accurate', next: null },
    },
    {
      name: 'moving without reaching accurate names no next rung',
      node: before('hear', 'new'),
      progress: after('hear', [['know', 'accurate'], ['hear', 'learning']]),
      want: { rung: 'hear', before: 'new', after: 'learning', next: null },
    },
    {
      name: 'moving up from accurate names no next rung, it was reached before',
      node: before('know', 'accurate'),
      progress: after('hear', [['know', 'fluent'], ['hear', 'new']]),
      want: { rung: 'know', before: 'accurate', after: 'fluent', next: null },
    },
    {
      name: 'falling names no next rung',
      node: before('know', 'accurate'),
      progress: after('know', [['know', 'learning']]),
      want: { rung: 'know', before: 'accurate', after: 'learning', next: null },
    },
    {
      name: 'an unchanged level is the same before and after',
      node: before('know', 'accurate'),
      progress: after('know', [['know', 'accurate']]),
      want: { rung: 'know', before: 'accurate', after: 'accurate', next: null },
    },
    {
      name: 'the rung practised no longer read has no change to show',
      node: before('hear', 'new'),
      progress: after('know', [['know', 'learning']]),
      want: null,
    },
  ]
  it.each(cases)('$name', ({ node, progress, want }) => {
    expect(levelChange(node, progress)).toEqual(want)
  })

  it('a subject not read has no change to show', () => {
    expect(levelChange(before('know', 'new'), undefined)).toBeNull()
  })
})
