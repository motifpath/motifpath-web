/**
 * A progression as it is being written: what the numerals typed so far read as, how they sound in
 * the chart's key, and whether one with these numerals exists already.
 */
import { CATALOG_ROOTS, chordSymbol, pitchClassOf } from '@/shared/utils/harmony'
import { parseProgressionNumeral } from '@/shared/utils/progressionNumeral'
import type { ParsedNumeral, ProgressionMode } from '@/shared/utils/progressionNumeral'

/** One bar as typed, and what it reads as; parsed is null when it isn't a chord. */
export interface BarReading {
  written: string
  parsed: ParsedNumeral | null
}

/** Bars are separated by spaces or by the dashes a progression's name is written with. */
const BAR_SEPARATOR = /[\s\-–—]+/

/** The most bars a progression can have. */
export const MAX_BARS = 16

/** Bar counts the drills ask. */
const DRILL_BAR_COUNTS = [4, 12]

/** Semitones from a major key down to its relative minor, or from a minor key up to its relative major. */
const RELATIVE_MINOR_BELOW = 3

export function readBars(text: string, mode: ProgressionMode): BarReading[] {
  return text
    .split(BAR_SEPARATOR)
    .filter((written) => written !== '')
    .map((written) => ({ written, parsed: parseProgressionNumeral(written, mode) }))
}

/** A search's numerals in their stored form; null unless every word of it is one. */
export function numeralsOf(search: string): string[] | null {
  const numerals: string[] = []
  for (const { parsed } of readBars(search, 'major')) {
    if (!parsed) return null
    numerals.push(parsed.numeral)
  }
  return numerals.length ? numerals : null
}

/** Numerals as a progression is named: I–♭VII–IV. */
export function barsLabel(numerals: string[]): string {
  return numerals.join('–')
}

/** The key a progression sounds in on this chart. */
export interface SpellingKey {
  /** Its tonic's pitch class. */
  root: number
  /** Its tonic, as the chord catalog spells it. */
  name: string
  /** The chart's key, as written. */
  chartKey: string
  /** It is the relative key, because the chart's key is in the other mode. */
  relative: boolean
}

/** The chart's key when the modes match, and its relative key when they don't; null with no key to read. */
export function spellingKey(chartKey: string | null, mode: ProgressionMode): SpellingKey | null {
  const written = chartKey?.trim() ?? ''
  const chartIsMinor = written.endsWith('m')
  const tonic = pitchClassOf(chartIsMinor ? written.slice(0, -1) : written)
  if (tonic === null) return null
  const relative = chartIsMinor !== (mode === 'minor')
  const shift = !relative ? 0 : chartIsMinor ? RELATIVE_MINOR_BELOW : 12 - RELATIVE_MINOR_BELOW
  const root = (tonic + shift) % 12
  return { root, name: CATALOG_ROOTS[root] ?? '', chartKey: written, relative }
}

/** The bars' chords on a tonic: G – F – C – G. */
export function spelledBars(root: number, bars: ParsedNumeral[]): string {
  return bars.map((bar) => chordSymbol({ root: (root + bar.rootSemitones) % 12, quality: bar.quality })).join(' – ')
}

/** The numeral as it reads in the mode, so a catalog's viio and a typed vii° are the same bar. */
function canonicalBars(bars: string[], mode: ProgressionMode): string[] {
  return bars.map((bar) => parseProgressionNumeral(bar, mode)?.numeral ?? bar)
}

/** The progression with exactly these numerals in this mode. Spelled twins are different progressions. */
export function sameNumerals<P extends { mode: ProgressionMode; bars: string[] }>(
  progressions: P[],
  mode: ProgressionMode,
  numerals: string[],
): P | undefined {
  const wanted = numerals.join(' ')
  return progressions.find((p) => p.mode === mode && canonicalBars(p.bars, mode).join(' ') === wanted)
}

/** Why the drills can't use a progression yet; null when they may. An empty form has no bar count to refuse. */
export function drillsRefusal(mode: ProgressionMode, barCount: number): 'minor' | 'bars' | null {
  if (mode === 'minor') return 'minor'
  return barCount === 0 || DRILL_BAR_COUNTS.includes(barCount) ? null : 'bars'
}
