import { describe, expect, it } from 'vitest'

import { withCountIn } from '@/features/student/utils/countIn'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

const step = { position_ids: ['p1'], value: { num: 1, den: 4 }, strum: 'none' as const }

function diagram(beats: number, beatValue: 1 | 2 | 4 | 8 | 16 | 32): Diagram {
  return { time_signature: { beats, beat_value: beatValue }, sequence: [step, step] } as unknown as Diagram
}

const rest = (num: number, den: number) => ({ position_ids: [], value: { num, den }, strum: 'none' })

describe('withCountIn', () => {
  it('puts a bar of rests, one per beat, before the sequence', () => {
    const { diagram: take, beats } = withCountIn(diagram(4, 4))

    expect(beats).toBe(4)
    expect(take.sequence).toEqual([rest(1, 4), rest(1, 4), rest(1, 4), rest(1, 4), step, step])
  })

  it('counts a compound meter in dotted beats', () => {
    const { diagram: take, beats } = withCountIn(diagram(6, 8))

    expect(beats).toBe(2)
    expect(take.sequence.slice(0, 2)).toEqual([rest(3, 8), rest(3, 8)])
  })

  it('counts an odd meter in its written beats', () => {
    expect(withCountIn(diagram(7, 8)).beats).toBe(7)
  })

  it('leaves the diagram it was given as it was', () => {
    const original = diagram(3, 4)
    withCountIn(original)

    expect(original.sequence).toHaveLength(2)
  })
})
