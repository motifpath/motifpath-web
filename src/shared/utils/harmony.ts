/**
 * The harmony the drill v2 graders share: numerals in a major key, their chords and functions,
 * and chord symbols. Mirrors the server's rules, so a chord is the same chord in any spelling of
 * its root, and an answer names a root as the chord catalog spells it.
 */

/** Each pitch class's root, as the chord catalog spells it, C first. */
export const CATALOG_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

/** Each pitch class spelled with sharps, C first. */
export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'dominant_7'
  | 'major_7'
  | 'minor_7'
  | 'half_diminished_7'
  | 'diminished_7'

/** A chord by its root's pitch class (0 = C) and its quality. */
export interface Chord {
  root: number
  quality: ChordQuality
}

const SUFFIX: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  diminished: 'dim',
  dominant_7: '7',
  major_7: 'maj7',
  minor_7: 'm7',
  half_diminished_7: 'm7b5',
  diminished_7: 'dim7',
}
const QUALITY_OF_SUFFIX: Record<string, ChordQuality> = {
  '': 'major',
  m: 'minor',
  dim: 'diminished',
  '7': 'dominant_7',
  maj7: 'major_7',
  m7: 'minor_7',
  m7b5: 'half_diminished_7',
  dim7: 'diminished_7',
}

/** Each root of a numeral with its degree in the major scale, longer spellings before the ones they start with. */
export const NUMERAL_ROOTS = [
  { upper: 'VII', lower: 'vii', semitones: 11 },
  { upper: 'III', lower: 'iii', semitones: 4 },
  { upper: 'VI', lower: 'vi', semitones: 9 },
  { upper: 'IV', lower: 'iv', semitones: 5 },
  { upper: 'II', lower: 'ii', semitones: 2 },
  { upper: 'V', lower: 'v', semitones: 7 },
  { upper: 'I', lower: 'i', semitones: 0 },
]

// Upper case is a major chord, lower case a minor or diminished one; viio is the catalog's spelling of vii°.
const UPPER_NUMERAL_SUFFIXES: Record<string, ChordQuality> = { '': 'major', '7': 'dominant_7', maj7: 'major_7' }
const LOWER_NUMERAL_SUFFIXES: Record<string, ChordQuality> = {
  '': 'minor',
  '7': 'minor_7',
  '°': 'diminished',
  o: 'diminished',
  'ø7': 'half_diminished_7',
  '°7': 'diminished_7',
}

/** A stored numeral's root above the tonic and its chord's quality; null when it isn't one. */
function readNumeral(numeral: string): { semitones: number; quality: ChordQuality } | null {
  const shift = numeral.startsWith('♭') ? -1 : numeral.startsWith('♯') ? 1 : 0
  const rest = shift === 0 ? numeral : numeral.slice(1)
  for (const root of NUMERAL_ROOTS) {
    const upper = rest.startsWith(root.upper)
    if (!upper && !rest.startsWith(root.lower)) continue
    const suffixes = upper ? UPPER_NUMERAL_SUFFIXES : LOWER_NUMERAL_SUFFIXES
    const quality = suffixes[rest.slice(root.upper.length)]
    return quality ? { semitones: (root.semitones + shift + 12) % 12, quality } : null
  }
  return null
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
  const degree = readNumeral(numeral)
  return degree ? { root: (key + degree.semitones) % 12, quality: degree.quality } : null
}

/** A chord's symbol, its root spelled as the chord catalog spells it. */
export function chordSymbol(chord: Chord): string {
  return (CATALOG_ROOTS[chord.root] ?? '') + SUFFIX[chord.quality]
}

/** What follows the root in a chord's symbol. */
export function qualitySuffix(quality: ChordQuality): string {
  return SUFFIX[quality]
}

/** Reads a chord symbol; a seventh only when sevenths are allowed. Null for anything else. */
export function parseChord(symbol: string, allowSevenths: boolean): Chord | null {
  const match = /^([A-G][#b]?)(maj7|m7b5|m7|dim7|m|dim|7)?$/.exec(symbol)
  if (!match) return null
  const root = pitchClassOf(match[1] ?? '')
  const suffix = match[2] ?? ''
  const quality = QUALITY_OF_SUFFIX[suffix]
  if (root === null || !quality || (suffix.includes('7') && !allowSevenths)) return null
  return { root, quality }
}

const OVER_A_MINOR_THIRD: ChordQuality[] = ['minor', 'diminished', 'minor_7', 'half_diminished_7', 'diminished_7']

/** The pitch class of a chord's third: minor on every chord over a minor or diminished triad. */
export function thirdOf(chord: Chord): number {
  return (chord.root + (OVER_A_MINOR_THIRD.includes(chord.quality) ? 3 : 4)) % 12
}

/**
 * The pitch class of a numeral's seventh in the key. A written suffix decides: maj7 major, 7 and ø7
 * minor, °7 diminished. A chord with no written seventh takes the major seventh on I and IV and the
 * minor seventh on any other numeral, in or out of the key.
 */
export function seventhOf(key: number, numeral: string): number {
  const chord = chordOf(key, numeral)
  if (!chord) return 0
  if (chord.quality === 'major_7' || numeral === 'I' || numeral === 'IV') return (chord.root + 11) % 12
  return (chord.root + (chord.quality === 'diminished_7' ? 9 : 10)) % 12
}

/** The mode a progression's numerals are read in. */
export type ProgressionMode = 'major' | 'minor'

/**
 * A key a drill names: a major key, its tonic ("G"), or a minor key, its tonic chord ("Gm"),
 * read as the tonic's pitch class and the key's mode; null for anything else.
 */
export function musicKeyOf(name: string): { tonic: number; mode: ProgressionMode } | null {
  const minor = name.endsWith('m')
  const tonic = pitchClassOf(minor ? name.slice(0, -1) : name)
  return tonic === null ? null : { tonic, mode: minor ? 'minor' : 'major' }
}

/** A minor key's chord with no written seventh: natural minor's seventh, harmonic minor's on V and vii°. */
const MINOR_BARE_SEVENTHS: Record<string, number> = {
  i: 10, 'ii°': 10, iio: 10, '♭III': 11, iv: 10, v: 10, '♭VI': 11, '♭VII': 10, V: 10, 'vii°': 9, viio: 9,
}

const TRIADS: ChordQuality[] = ['major', 'minor', 'diminished']

/**
 * The pitch class of a numeral's seventh in a minor key. A written suffix decides as in a major key;
 * a chord with no written seventh takes natural minor's, harmonic minor's on V and vii°, and on any
 * other numeral the seventh of its quality: major on a major chord, minor on a minor or diminished one.
 */
export function minorSeventhOf(key: number, numeral: string): number {
  const chord = chordOf(key, numeral)
  if (!chord) return 0
  if (!TRIADS.includes(chord.quality)) return seventhOf(key, numeral)
  const above = MINOR_BARE_SEVENTHS[numeral] ?? (chord.quality === 'major' ? 11 : 10)
  return (chord.root + above) % 12
}

/** A created progression's key turned back into its numerals: mode, then ASCII numerals (b ♭, # ♯, o °, h ø). */
export function numeralsOfCreatedKey(key: string): { mode: string; bars: string[] } | null {
  const slash = key.indexOf('/')
  if (slash < 0) return null
  const symbols: Record<string, string> = { b: '♭', '#': '♯', o: '°', h: 'ø' }
  const bars = key.slice(slash + 1).split('-').map((bar) => bar.replace(/[b#oh]/g, (c) => symbols[c] ?? c))
  return { mode: key.slice(0, slash), bars }
}

/** Whether a bar is a numeral a chord can be spelled from. */
export function isNumeral(numeral: string): boolean {
  return readNumeral(numeral) !== null
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
