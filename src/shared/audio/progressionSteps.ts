/**
 * What a cadence or progression played in a drill sounds like: one chord a bar, each strummed
 * once and held for the bar, and on bass a line of the chords' roots under them, one on each beat. Each instrument
 * plays in its own voice, so the chords and the bass line are two lists of steps run side by side
 * on the same clock. Every step stands for its whole bar and is lit as that bar, so a run can say
 * which bar is sounding.
 */
import type { components } from '@/api/generated/core-domain'
import type { PlaybackStep } from '@/shared/audio/timeline'
import { pitchClassOf } from '@/shared/utils/harmony'
import { frettedPitch, parsePitch } from '@/shared/utils/pitch'

type Diagram = components['schemas']['Diagram']

/** A whole note: one chord fills a bar of 4/4. */
const BAR = 1
/** A quarter: the bass plays its root on each of the bar's four beats. */
const BEATS_PER_BAR = 4
const BEAT = BAR / BEATS_PER_BAR

function barId(bar: number): string {
  return `bar-${bar}`
}

/** The bar a run is sounding, from the steps it lights; null between bars. */
export function barOfPositionIds(positionIds: string[]): number | null {
  const match = /^bar-(\d+)$/.exec(positionIds[0] ?? '')
  return match ? Number(match[1]) : null
}

/** Each bar's voicing strummed down once, lowest string first, and held for the bar. */
export function chordSteps(voicings: Diagram[], tuning: string[], strumSeconds: number): PlaybackStep[] {
  return voicings.map((diagram, bar) => {
    const pitches = diagram.positions
      .map((p) => frettedPitch(tuning, p.string ?? 0, p.fret ?? 0))
      .filter((midi): midi is number => midi !== null)
      .sort((a, b) => a - b)
    return {
      value: BAR,
      positionIds: [barId(bar)],
      notes: pitches.map((midi, i) => ({ positionId: barId(bar), midi, offset: i * strumSeconds })),
    }
  })
}

/**
 * Each bar's root on every beat of the bar, at its lowest place on the bass: the open lowest
 * string or the first one above it. A root that can't be read rests, so the bars stay in time.
 */
export function bassLineSteps(roots: string[], bassTuning: string[]): PlaybackStep[] {
  const lowest = parsePitch(bassTuning[0] ?? '')
  return roots.flatMap((root, bar) => {
    const pitchClass = pitchClassOf(root)
    const midi = lowest === null || pitchClass === null ? null : lowest + ((pitchClass - lowest + 120) % 12)
    const beat: PlaybackStep = {
      value: BEAT,
      positionIds: [barId(bar)],
      notes: midi === null ? [] : [{ positionId: barId(bar), midi, offset: 0 }],
    }
    return Array.from({ length: BEATS_PER_BAR }, () => beat)
  })
}
