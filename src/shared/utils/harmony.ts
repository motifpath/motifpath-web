/**
 * The harmony the drill v2 graders share: a major key's numerals, their chords and functions,
 * and chord symbols. Mirrors the server's rules, so a chord is the same chord in any spelling of
 * its root, and an answer names a root as the chord catalog spells it.
 */

/** Each pitch class's root, as the chord catalog spells it, C first. */
export const CATALOG_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

/** Each pitch class spelled with sharps, C first. */
export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export type ChordQuality = 'major' | 'minor' | 'diminished' | 'dominant_7'

/** A chord by its root's pitch class (0 = C) and its quality. */
export interface Chord {
  root: number
  quality: ChordQuality
}

const SUFFIX: Record<ChordQuality, string> = { major: '', minor: 'm', diminished: 'dim', dominant_7: '7' }
const QUALITY_OF_SUFFIX: Record<string, ChordQuality> = { '': 'major', m: 'minor', dim: 'diminished', '7': 'dominant_7' }

/** Where each numeral of a major key stands: semitones above the key and its chord's quality. */
const NUMERALS: Record<string, { semitones: number; quality: ChordQuality }> = {
  I: { semitones: 0, quality: 'major' },
  ii: { semitones: 2, quality: 'minor' },
  iii: { semitones: 4, quality: 'minor' },
  IV: { semitones: 5, quality: 'major' },
  V: { semitones: 7, quality: 'major' },
  vi: { semitones: 9, quality: 'minor' },
  viio: { semitones: 11, quality: 'diminished' },
  I7: { semitones: 0, quality: 'dominant_7' },
  IV7: { semitones: 5, quality: 'dominant_7' },
  V7: { semitones: 7, quality: 'dominant_7' },
}

/** The seven numerals of a major key, its triads in order; viio is vii°. */
export const KEY_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'viio']

export type HarmonicFunction = 'tonic' | 'subdominant' | 'dominant'

/** The function of each triad of a major key. */
export const NUMERAL_FUNCTION: Record<string, HarmonicFunction> = {
  I: 'tonic', iii: 'tonic', vi: 'tonic', ii: 'subdominant', IV: 'subdominant', V: 'dominant', viio: 'dominant',
}

const LETTER_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** The pitch class of a note or root name such as "F#" or "Db"; null for anything else. */
export function pitchClassOf(name: string): number | null {
  const match = /^([A-G])([#b]?)$/.exec(name)
  if (!match) return null
  const [, letter = '', accidental = ''] = match
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0
  return ((((LETTER_CLASS[letter] ?? 0) + shift) % 12) + 12) % 12
}

/** The chord on a numeral in the major key on the given pitch class; null for no numeral. */
export function chordOf(key: number, numeral: string): Chord | null {
  const degree = NUMERALS[numeral]
  return degree ? { root: (key + degree.semitones) % 12, quality: degree.quality } : null
}

/** A chord's symbol, its root spelled as the chord catalog spells it. */
export function chordSymbol(chord: Chord): string {
  return (CATALOG_ROOTS[chord.root] ?? '') + SUFFIX[chord.quality]
}

/** Reads a chord symbol; a seventh only when sevenths are allowed. Null for anything else. */
export function parseChord(symbol: string, allowSevenths: boolean): Chord | null {
  const match = /^([A-G][#b]?)(m|dim|7)?$/.exec(symbol)
  if (!match) return null
  const root = pitchClassOf(match[1] ?? '')
  const quality = QUALITY_OF_SUFFIX[match[2] ?? '']
  if (root === null || !quality || (quality === 'dominant_7' && !allowSevenths)) return null
  return { root, quality }
}

/** The pitch class of a chord's third: minor on minor and diminished chords. */
export function thirdOf(chord: Chord): number {
  return (chord.root + (chord.quality === 'minor' || chord.quality === 'diminished' ? 3 : 4)) % 12
}

/** The pitch class of a numeral's seventh in the key: major on I and IV, minor otherwise. */
export function seventhOf(key: number, numeral: string): number {
  const chord = chordOf(key, numeral)
  if (!chord) return 0
  return (chord.root + (numeral === 'I' || numeral === 'IV' ? 11 : 10)) % 12
}

/** A progression's chords in the key, one per bar; null when a bar isn't a numeral. */
export function chartOf(key: number, bars: string[]): Chord[] | null {
  const chart: Chord[] = []
  for (const numeral of bars) {
    const chord = chordOf(key, numeral)
    if (!chord) return null
    chart.push(chord)
  }
  return chart
}

/** A chart as one chord symbol per bar, separated by single spaces. */
export function chartSymbol(chart: Chord[]): string {
  return chart.map(chordSymbol).join(' ')
}
