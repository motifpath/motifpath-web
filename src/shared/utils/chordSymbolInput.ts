/**
 * What an author picks or types to find a chord, turned into the symbol the chord catalog reads.
 * Chord symbols are case-sensitive ("AM7" would be major), but an author searching types in any
 * case, so a typed symbol is read as a root letter, then a lower-case rest, with a bass note after
 * "/" read as a note again.
 */

/** The qualities a chord is found by, one at a time; "" is the plain major chord. */
export const CHORD_QUALITIES = ['', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', 'dim', 'aug'] as const

export type ChordQualityChoice = (typeof CHORD_QUALITIES)[number]

/** "am" → "Am", "AM7" → "Am7", "g/b" → "G/B"; nothing typed reads as "". */
export function readTypedChord(typed: string): string {
  const [chord = '', ...bass] = typed.trim().split('/')
  return [asNote(chord), ...bass.map(asNote)].join('/')
}

function asNote(part: string): string {
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
}

export function chordSymbolOf(root: string, quality: ChordQualityChoice): string {
  return `${root}${quality}`
}
