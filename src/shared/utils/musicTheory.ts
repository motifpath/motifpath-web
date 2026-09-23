/**
 * Sharps-spelling chromatic helpers for auto-filling a fretted position's
 * `note_name`/`interval` from an `Instrument.tuning` open-string note and a
 * teacher-chosen root — an authoring aid only, never persisted itself
 * (`DiagramPosition.note_name` is always relative to the Diagram's own
 * unstated root; the root note here is what computes that value).
 */

export const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const INTERVAL_LABELS = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']

// Enharmonic equivalents for the flat spellings a tuning is realistically authored with (e.g.
// "Eb standard" guitar tuning) — CHROMATIC_SCALE itself only carries sharps.
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
}

function chromaticIndex(note: string): number {
  return CHROMATIC_SCALE.indexOf(FLAT_TO_SHARP[note] ?? note)
}

/** The note sounded at `fret` on a string whose open note is `openStringNote`. */
export function noteAtFret(openStringNote: string, fret: number): string {
  const openIndex = chromaticIndex(openStringNote)
  return CHROMATIC_SCALE[(openIndex + fret) % CHROMATIC_SCALE.length]
}

/** `note`'s interval label relative to `root`, by semitone distance. */
export function intervalFromRoot(note: string, root: string): string {
  const distance = (chromaticIndex(note) - chromaticIndex(root) + CHROMATIC_SCALE.length) % CHROMATIC_SCALE.length
  return INTERVAL_LABELS[distance]
}
