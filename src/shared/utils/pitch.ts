/**
 * Pitches as MIDI note numbers (60 is middle C), read from scientific pitch
 * notation ("E2", "C#3", "Bb4") as instrument tunings and keyboard keys write
 * them.
 */

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const ACCIDENTAL: Record<string, number> = { '': 0, '#': 1, '##': 2, b: -1, bb: -2 }
const PITCH_PATTERN = /^([A-G])(##|#|bb|b)?(-1|\d)$/

/** The MIDI number of a pitch with its octave; null for anything else, a bare note name included. */
export function parsePitch(name: string): number | null {
  const match = PITCH_PATTERN.exec(name)
  if (!match) return null
  const [, letter = '', accidental = '', octave = ''] = match
  return (Number(octave) + 1) * 12 + (PITCH_CLASS[letter] ?? 0) + (ACCIDENTAL[accidental] ?? 0)
}

/**
 * The pitch sounded at `fret` on `string` (1 is the highest-pitched string) of
 * an instrument tuned to `tuning` (lowest string first); null when the tuning
 * has no such string or doesn't give it an octave.
 */
export function frettedPitch(tuning: string[], string: number, fret: number): number | null {
  const open = tuning[tuning.length - string]
  if (string < 1 || open === undefined) return null
  const pitch = parsePitch(open)
  return pitch === null ? null : pitch + fret
}
