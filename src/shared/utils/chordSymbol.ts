import type { components } from '@/api/generated/core-domain'

type ChordQuality = components['schemas']['ChordQuality']
type ParsedChordSymbol = components['schemas']['ParsedChordSymbol']

/** How one chord symbol reads: the same shape the server's chord search returns for it. */
export type ChordSymbolReading = Pick<
  components['schemas']['ChordSearchResult'],
  'status' | 'parsed' | 'warning'
>

const PITCH_CLASS_BY_LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/**
 * Each quality with its canonical suffix first, then the other spellings authors write for it.
 * The shared golden cases name every quality, so a quality missing here fails them.
 */
const SUFFIXES_BY_QUALITY: ReadonlyArray<readonly [ChordQuality, readonly [string, ...string[]]]> =
  [
    ['major', ['', 'M', 'maj']],
    ['minor', ['m', 'min', '-']],
    ['power', ['5']],
    ['diminished', ['dim', '°']],
    ['augmented', ['aug', '+']],
    ['sus2', ['sus2']],
    ['sus4', ['sus4', 'sus']],
    ['major_6', ['6', 'M6', 'maj6']],
    ['minor_6', ['m6', 'min6', '-6']],
    ['dominant_7', ['7']],
    ['major_7', ['maj7', 'M7', 'Δ7', 'Δ', 'ma7']],
    ['minor_7', ['m7', 'min7', '-7']],
    ['minor_major_7', ['mMaj7', 'mM7', 'm(maj7)', 'minMaj7', 'mΔ7', '-Δ7']],
    ['half_diminished_7', ['m7b5', 'm7(b5)', '-7b5', 'ø', 'ø7']],
    ['diminished_7', ['dim7', '°7']],
    ['dominant_7_sus4', ['7sus4', '7sus']],
    ['add_9', ['add9', '(add9)']],
    ['minor_add_9', ['madd9', 'm(add9)']],
    ['dominant_9', ['9']],
    ['major_9', ['maj9', 'M9', 'Δ9']],
    ['minor_9', ['m9', 'min9', '-9']],
    ['dominant_11', ['11']],
    ['minor_11', ['m11', 'min11', '-11']],
    ['dominant_13', ['13']],
    ['dominant_7_flat_5', ['7b5', '7(b5)']],
    ['dominant_7_sharp_5', ['7#5', '7(#5)', '7+5', '+7', 'aug7']],
    ['dominant_7_flat_9', ['7b9', '7(b9)']],
    ['dominant_7_sharp_9', ['7#9', '7(#9)']],
  ]

const QUALITY_BY_SUFFIX = new Map<string, ChordQuality>(
  SUFFIXES_BY_QUALITY.flatMap(([quality, suffixes]) =>
    suffixes.map((suffix): [string, ChordQuality] => [suffix, quality]),
  ),
)

const CANONICAL_SUFFIX_BY_QUALITY = new Map<ChordQuality, string>(
  SUFFIXES_BY_QUALITY.map(([quality, [canonical]]) => [quality, canonical]),
)

interface LeadingNote {
  note: string
  pitchClass: number
  rest: string
}

/** Reads an uppercase letter A–G and at most one accidental from the start of `text`. */
function readLeadingNote(text: string): LeadingNote | null {
  const letter = text.charAt(0)
  const letterPitchClass = PITCH_CLASS_BY_LETTER[letter]
  if (letterPitchClass === undefined) return null
  const accidental = text.charAt(1)
  const shift = accidental === 'b' ? -1 : accidental === '#' ? 1 : 0
  const note = shift === 0 ? letter : letter + accidental
  return { note, pitchClass: (letterPitchClass + shift + 12) % 12, rest: text.slice(note.length) }
}

const unparsed = (warning: NonNullable<ChordSymbolReading['warning']>): ChordSymbolReading => ({
  status: 'unparsed',
  parsed: null,
  warning,
})

/**
 * Reads a chord symbol exactly as an author wrote it: its root, quality and slash bass, or why
 * it isn't a chord. Nothing is trimmed, and any whitespace leaves it unparsed. Whitespace is the
 * Unicode White_Space property, as Go's unicode.IsSpace reads it; `\s` would differ on U+0085 and
 * U+FEFF. ♭ and ♯ read as b and #, and a bass with the root's own pitch class is dropped.
 */
export function readChordSymbol(raw: string): ChordSymbolReading {
  if (raw === 'N.C.' || raw === 'NC') return { status: 'no_chord', parsed: null, warning: null }
  if (/\p{White_Space}/u.test(raw)) return unparsed('unparsed_symbol')
  const text = raw.replaceAll('♭', 'b').replaceAll('♯', '#')

  const root = readLeadingNote(text)
  if (!root) return unparsed('unparsed_symbol')

  let suffix = root.rest
  let bass: LeadingNote | null = null
  const slash = suffix.indexOf('/')
  if (slash !== -1) {
    const written = readLeadingNote(suffix.slice(slash + 1))
    if (!written || written.rest !== '') return unparsed('unparsed_symbol')
    suffix = suffix.slice(0, slash)
    if (written.pitchClass !== root.pitchClass) bass = written
  }

  const quality = QUALITY_BY_SUFFIX.get(suffix)
  if (!quality) return unparsed('unsupported_quality')

  const parsed: ParsedChordSymbol = {
    root: root.note,
    root_pitch_class: root.pitchClass,
    quality,
    bass: bass?.note ?? null,
    bass_pitch_class: bass?.pitchClass ?? null,
    canonical_symbol:
      root.note + (CANONICAL_SUFFIX_BY_QUALITY.get(quality) ?? '') + (bass ? `/${bass.note}` : ''),
  }
  return { status: 'parsed', parsed, warning: null }
}
