import type { components } from '@/api/generated/core-domain'
import { readChordSymbol } from '@/shared/utils/chordSymbol'

type LyricLine = components['schemas']['SongChartLyricLine']
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']
type ChordDefinition = components['schemas']['ChordDefinition']
type ChordVoicing = components['schemas']['ChordVoicing']

/** A piece of a lyric line drawn as one unit: some text, and the chord over it, if any. */
export interface LineSegment {
  text: string
  anchor: Anchor | null
}

/**
 * Splits a lyric line into words, each with its trailing spaces. A chord sits on the first word
 * of its run, so a line that wraps breaks between words and every chord stays over its word.
 */
export function lineSegments(line: LyricLine): LineSegment[] {
  const segments: LineSegment[] = []
  for (const run of line.content) {
    const anchor = run.marks?.[0]?.attrs ?? null
    const words = run.text.match(/\S+\s*|\s+/g) ?? [run.text]
    words.forEach((text, i) => segments.push({ text, anchor: i === 0 ? anchor : null }))
  }
  return segments
}

/**
 * The voicing a chord's sheet opens on: the one the author picked for this anchor, else the
 * chord's best. A pick the chord no longer offers falls back to the best too.
 */
export function openingVoicing(chord: ChordDefinition, anchor: Anchor): ChordVoicing | null {
  const picked = chord.voicings.find((v) => v.chord_voicing_id === anchor.chordVoicingId)
  return picked ?? chord.voicings[0] ?? null
}

/**
 * The bass an anchor's slash chord asks for when the catalog chord it resolved to has none, so
 * the sheet can say that bass isn't shown; null otherwise.
 */
export function missingBass(anchor: Anchor, chord: ChordDefinition): string | null {
  if (chord.bass !== null) return null
  return readChordSymbol(anchor.writtenSymbol).parsed?.bass ?? null
}
