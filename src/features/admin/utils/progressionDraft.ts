/**
 * A progression as it is being written: what the numerals typed so far read as, how they sound in
 * the chart's key, and whether one with these numerals exists already.
 */
import { CATALOG_ROOTS, pitchClassOf, qualitySuffix } from '@/shared/utils/harmony'
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

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const ROMAN_DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// A relative key, as a step above the tonic: a major key's vi, a minor key's ♭III.
const RELATIVE_MINOR = { steps: 5, semitones: 9 }
const RELATIVE_MAJOR = { steps: 2, semitones: 3 }

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

/**
 * The note a number of letter steps and semitones above a tonic, spelled from that tonic, so E's
 * third is G# and G♭'s fourth is Cb. A spelling that would take a double accidental gets the chord
 * catalog's instead. The tonic is a note name, as pitchClassOf reads it.
 */
function noteAbove(tonic: string, steps: number, semitones: number): string {
  const pitch = (((pitchClassOf(tonic) ?? 0) + semitones) % 12 + 12) % 12
  const letter = LETTERS[(LETTERS.indexOf(tonic.charAt(0)) + steps) % LETTERS.length] ?? ''
  const shift = ((pitch - (pitchClassOf(letter) ?? 0) + 18) % 12) - 6
  if (Math.abs(shift) > 1) return CATALOG_ROOTS[pitch] ?? ''
  return letter + (shift > 0 ? '#' : shift < 0 ? 'b' : '')
}

/** The key a progression sounds in on this chart. */
export interface SpellingKey {
  /** Its tonic: as the chart writes it when the modes match, and spelled from it when they don't. */
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
  const tonic = chartIsMinor ? written.slice(0, -1) : written
  if (pitchClassOf(tonic) === null) return null
  const relative = chartIsMinor !== (mode === 'minor')
  if (!relative) return { name: tonic, chartKey: written, relative }
  const { steps, semitones } = chartIsMinor ? RELATIVE_MAJOR : RELATIVE_MINOR
  return { name: noteAbove(tonic, steps, semitones), chartKey: written, relative }
}

/** How many letter steps a numeral's root stands above the tonic: ♭VII is six, whatever its accidental. */
function stepsOf(numeral: string): number {
  const roman = /[ivIV]+/.exec(numeral)?.[0].toUpperCase() ?? ''
  return Math.max(ROMAN_DEGREES.indexOf(roman), 0)
}

/** The bars' chords on a tonic, each root spelled from it: G – F – C – G. */
export function spelledBars(tonic: string, bars: ParsedNumeral[]): string {
  return bars.map((bar) => noteAbove(tonic, stepsOf(bar.numeral), bar.rootSemitones) + qualitySuffix(bar.quality)).join(' – ')
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

/** Whether these numerals come in a row in the bars; each bar counts whole, so I isn't part of IV. */
export function barsContain(bars: string[], mode: ProgressionMode, numerals: string[]): boolean {
  return ` ${canonicalBars(bars, mode).join(' ')} `.includes(` ${numerals.join(' ')} `)
}

/** Why the drills can't use a progression yet; null when they may. An empty form has no bar count to refuse. */
export function drillsRefusal(mode: ProgressionMode, barCount: number): 'minor' | 'bars' | null {
  if (mode === 'minor') return 'minor'
  return barCount === 0 || DRILL_BAR_COUNTS.includes(barCount) ? null : 'bars'
}

/** Whether a search finds a progression: typed numerals match its bars or key, any word its name, whatever the case. */
export function progressionMatches(progression: { key: string; bars: string[]; mode: ProgressionMode }, name: string, search: string): boolean {
  const query = search.trim().toLowerCase()
  if (!query) return true
  if (progression.key.toLowerCase().includes(query) || name.toLowerCase().includes(query)) return true
  const numerals = numeralsOf(search)
  return numerals !== null && barsContain(progression.bars, progression.mode, numerals)
}
