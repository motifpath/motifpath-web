import type { components } from '@/api/generated/core-domain'
import { readChordSymbol } from '@/shared/utils/chordSymbol'

type ChordDefinition = components['schemas']['ChordDefinition']
type ChordSearchResult = components['schemas']['ChordSearchResult']

/**
 * How a chord written in a chart reads: fine, a no-chord marking, not a chord, a kind of chord
 * the catalog doesn't have, not in the catalog, or a slash chord shown without its bass. These
 * match the warnings the server gives when the chart is saved.
 */
export type ChordCheckKind = 'ok' | 'no_chord' | 'not_a_chord' | 'unsupported' | 'not_in_catalog' | 'without_bass'

export interface ChordCheck {
  kind: ChordCheckKind
  /** Whether it stops the chart from being published. */
  blocks: boolean
  /** The catalog chord learners see voicings of; null when there is none. */
  chord: ChordDefinition | null
}

/** The longest symbol a chart holds. */
const MAX_SYMBOL_LENGTH = 32

/** What a symbol is without asking the catalog; null when only the catalog can tell. */
export function localChordCheck(symbol: string): ChordCheck | null {
  if (symbol.length === 0 || [...symbol].length > MAX_SYMBOL_LENGTH) return { kind: 'not_a_chord', blocks: true, chord: null }
  const reading = readChordSymbol(symbol)
  if (reading.status === 'no_chord') return { kind: 'no_chord', blocks: false, chord: null }
  if (reading.status === 'unparsed') {
    return { kind: reading.warning === 'unsupported_quality' ? 'unsupported' : 'not_a_chord', blocks: true, chord: null }
  }
  return null
}

/** What a parsed symbol is, from the catalog's search result for it. */
export function chordCheck(result: ChordSearchResult): ChordCheck {
  if (result.chord && result.chord.voicings.length > 0) return { kind: 'ok', blocks: false, chord: result.chord }
  if (!result.chord && result.chord_without_bass && result.chord_without_bass.voicings.length > 0) {
    return { kind: 'without_bass', blocks: false, chord: result.chord_without_bass }
  }
  return { kind: 'not_in_catalog', blocks: true, chord: null }
}
