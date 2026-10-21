/**
 * Guide tones: a chord tone of each chord of a progression tapped on the fretboard in time with its
 * playback, four beats to a bar, one chord per bar, a faster note value shortening each bar by its speed
 * factor. Grades exactly as the server does, so instant
 * feedback never contradicts the record: a bar is hit when a tap within it sounds the asked tone and
 * no tap within it sounds another note; the take is right only when every bar is hit; taps after the
 * last bar aren't graded.
 */
import type { components } from '@/api/generated/event-ingestion'
import { SHARP_NAMES, chordOf, chordSymbol, pitchClassOf, seventhOf, thirdOf } from '@/shared/utils/harmony'
import { frettedPitch } from '@/shared/utils/pitch'
import { speedFactor } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

/** What a take was asked: the layout's tuning, the progression's numerals, the key, tone, tempo and note value. */
export interface GuideToneTake {
  tuning: string[]
  bars: string[]
  key: string
  tone: components['schemas']['TimedTapsResponse']['tone']
  tempoBpm: number
  /** The note value it played at; quarters when it says none. */
  noteValue?: TempoNoteValue
}

/** One tap of the take, milliseconds after the first bar's downbeat. */
export type TimedTap = components['schemas']['TimedTap']

/** One bar as graded: its chord, the asked tone's note (spelled with sharps), and whether it was hit. */
export interface GradedBar {
  chord: string
  note_name: string
  hit: boolean
}

/** A graded take: right or wrong, how late its latest hit came, and every bar. */
export interface GradedTake {
  correct: boolean
  latencyMs: number
  bars: GradedBar[]
}

/** Four beats of a minute: a bar lasts this divided by the tempo. */
const BEATS_PER_BAR_MS = 4 * 60_000

/** The take graded; null when a tap is off the instrument, or the key or a bar is unknown. */
export function gradeTimedTaps(take: GuideToneTake, taps: TimedTap[]): GradedTake | null {
  const key = pitchClassOf(take.key)
  if (key === null || take.tempoBpm < 1) return null
  const tapped: number[] = []
  for (const tap of taps) {
    const pitch = tap.fret < 0 ? null : frettedPitch(take.tuning, tap.string, tap.fret)
    if (pitch === null || tap.string > take.tuning.length) return null
    tapped.push(pitch % 12)
  }
  const speed = take.tempoBpm * speedFactor(take.noteValue ?? 'quarters')
  const barStart = (i: number) => Math.floor((i * BEATS_PER_BAR_MS) / speed)
  const bars: GradedBar[] = []
  let latencyMs = 0
  for (const [i, numeral] of take.bars.entries()) {
    const chord = chordOf(key, numeral)
    if (!chord) return null
    const tone = take.tone === '7' ? seventhOf(key, numeral) : thirdOf(chord)
    const start = barStart(i)
    const end = barStart(i + 1)
    const inBar = taps.flatMap((tap, j) => (tap.at_ms >= start && tap.at_ms < end ? [{ at: tap.at_ms, pitch: tapped[j] }] : []))
    const hits = inBar.filter((t) => t.pitch === tone).map((t) => t.at)
    const hit = hits.length > 0 && hits.length === inBar.length
    latencyMs = Math.max(latencyMs, hit ? Math.min(...hits) - start : end - start)
    bars.push({ chord: chordSymbol(chord), note_name: SHARP_NAMES[tone] ?? '', hit })
  }
  return { correct: bars.every((b) => b.hit), latencyMs, bars }
}
