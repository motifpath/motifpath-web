import { describe, expect, it } from 'vitest'

import { barOfPositionIds, bassLineSteps, chordSteps } from '@/shared/audio/progressionSteps'
import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

const GUITAR = drillGuitar.tuning!
const BASS = drillBass.tuning!
const STRUM = 0.02

describe('chordSteps', () => {
  it('strums each bar’s voicing once, low to high, held for the whole bar', () => {
    const [bar] = chordSteps([drillVoicings.C.diagram], GUITAR, STRUM)

    expect(bar!.value).toBe(1)
    // C3 E3 G3 C4 E4: the open C, its low string muted.
    expect(bar!.notes.map((note) => note.midi)).toEqual([48, 52, 55, 60, 64])
    expect(bar!.notes.map((note) => note.offset)).toEqual([0, STRUM, 2 * STRUM, 3 * STRUM, 4 * STRUM])
  })

  it('plays the bars in order, each one lit as its own bar', () => {
    const steps = chordSteps([drillVoicings.G.diagram, drillVoicings.D.diagram], GUITAR, STRUM)

    expect(steps.map((step) => step.positionIds)).toEqual([['bar-0'], ['bar-1']])
    expect(steps[1]!.notes[0]!.midi).toBe(50) // D3, the open D string
  })
})

describe('bassLineSteps', () => {
  it('plays each chord’s root on every beat of its bar, as low as the bass goes', () => {
    const steps = bassLineSteps(['C', 'G', 'E', 'F#'], BASS)

    expect(steps.map((step) => step.notes.map((note) => note.midi))).toEqual(
      [[36], [31], [28], [30]].flatMap((root) => [root, root, root, root]),
    )
    expect(steps.every((step) => step.value === 1 / 4)).toBe(true)
    expect(steps.map((step) => step.positionIds)).toEqual(
      ['bar-0', 'bar-1', 'bar-2', 'bar-3'].flatMap((bar) => [[bar], [bar], [bar], [bar]]),
    )
  })

  it('reads a root in either spelling', () => {
    expect(bassLineSteps(['Bb', 'A#'], BASS).map((step) => step.notes[0]!.midi)).toEqual([34, 34, 34, 34, 34, 34, 34, 34])
  })

  it('rests through a bar whose root it can’t read, keeping the bars in time', () => {
    const beats = bassLineSteps(['?'], BASS)

    expect(beats).toHaveLength(4)
    expect(beats.every((beat) => beat.notes.length === 0 && beat.positionIds[0] === 'bar-0')).toBe(true)
  })
})

describe('barOfPositionIds', () => {
  it('names the bar a run is sounding, or none between bars', () => {
    expect(barOfPositionIds(['bar-2'])).toBe(2)
    expect(barOfPositionIds([])).toBeNull()
  })
})
