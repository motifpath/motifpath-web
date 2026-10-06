import { describe, expect, it } from 'vitest'

import { withCountIn } from '@/features/student/utils/countIn'
import { makeFrettedDiagram, makePlayback } from '@/shared/testUtils/diagram'

const step = { position_ids: ['p1'], value: { num: 1, den: 4 }, strum: 'none' as const }

function diagram(beats: number, beatValue: 1 | 2 | 4 | 8 | 16 | 32) {
  const strum = makePlayback({ playback_id: 'pb-default', time_signature: { beats, beat_value: beatValue }, steps: [step, step] })
  const other = makePlayback({ playback_id: 'pb-other', time_signature: { beats: 5, beat_value: 4 }, steps: [step] })
  return makeFrettedDiagram({ playbacks: [other, strum], default_playback_id: 'pb-default' })
}

const rest = (num: number, den: number) => ({ position_ids: [], value: { num, den }, strum: 'none' })

const defaultSteps = (d: ReturnType<typeof diagram>) => d.playbacks.find((p) => p.playback_id === d.default_playback_id)!.steps

describe('withCountIn', () => {
  it('puts a bar of rests, one per beat, before the default playback', () => {
    const { diagram: take, beats } = withCountIn(diagram(4, 4))

    expect(beats).toBe(4)
    expect(defaultSteps(take)).toEqual([rest(1, 4), rest(1, 4), rest(1, 4), rest(1, 4), step, step])
  })

  it('counts a compound meter in dotted beats', () => {
    const { diagram: take, beats } = withCountIn(diagram(6, 8))

    expect(beats).toBe(2)
    expect(defaultSteps(take).slice(0, 2)).toEqual([rest(3, 8), rest(3, 8)])
  })

  it('counts an odd meter in its written beats', () => {
    expect(withCountIn(diagram(7, 8)).beats).toBe(7)
  })

  it('leaves the other playbacks and the diagram it was given as they were', () => {
    const original = diagram(3, 4)
    const { diagram: take } = withCountIn(original)

    expect(defaultSteps(original)).toHaveLength(2)
    expect(take.playbacks.find((p) => p.playback_id === 'pb-other')!.steps).toEqual([step])
  })

  it('counts nothing in for a diagram with no playbacks', () => {
    const empty = makeFrettedDiagram()
    expect(withCountIn(empty)).toEqual({ diagram: empty, beats: 0 })
  })
})
