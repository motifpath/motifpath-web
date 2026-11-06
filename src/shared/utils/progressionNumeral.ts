/**
 * How a progression numeral, as an admin writes it, is read in a mode. Mirrors the server's parser,
 * so the form never accepts what the server refuses: a root I to VII in either case, an optional ♭
 * or ♯ before it, and the suffixes its case allows. A chord outside the mode is borrowed, not wrong.
 */
import type { components } from '@/api/generated/core-domain'
import { NUMERAL_ROOTS } from '@/shared/utils/harmony'
import type { ChordQuality } from '@/shared/utils/harmony'

export type ProgressionMode = components['schemas']['Progression']['mode']

/** One bar of a progression, read in its mode. */
export interface ParsedNumeral {
  /** The stored form, with ♭, ♯, ° and ø in place of b, #, o and h. */
  numeral: string
  /** How far the root stands above the tonic, in either mode. */
  rootSemitones: number
  quality: ChordQuality
  /** Whether the chord's root and triad are outside the mode. A seventh doesn't change the triad. */
  borrowed: boolean
}

type Triad = 'major' | 'minor' | 'diminished'

interface Suffix {
  stored: string
  quality: ChordQuality
}

const UPPER_SUFFIXES: Record<string, Suffix> = {
  '': { stored: '', quality: 'major' },
  '7': { stored: '7', quality: 'dominant_7' },
  maj7: { stored: 'maj7', quality: 'major_7' },
}

const LOWER_SUFFIXES: Record<string, Suffix> = {
  '': { stored: '', quality: 'minor' },
  '7': { stored: '7', quality: 'minor_7' },
  '°': { stored: '°', quality: 'diminished' },
  o: { stored: '°', quality: 'diminished' },
  'ø7': { stored: 'ø7', quality: 'half_diminished_7' },
  h7: { stored: 'ø7', quality: 'half_diminished_7' },
  '°7': { stored: '°7', quality: 'diminished_7' },
  o7: { stored: '°7', quality: 'diminished_7' },
}

const TRIAD_OF: Record<ChordQuality, Triad> = {
  major: 'major',
  dominant_7: 'major',
  major_7: 'major',
  minor: 'minor',
  minor_7: 'minor',
  diminished: 'diminished',
  half_diminished_7: 'diminished',
  diminished_7: 'diminished',
}

/** Each mode's chords as `semitones triad`. Minor has harmonic minor's V and vii° alongside natural minor's v. */
const DIATONIC: Record<ProgressionMode, string[]> = {
  major: ['0 major', '2 minor', '4 minor', '5 major', '7 major', '9 minor', '11 diminished'],
  minor: ['0 minor', '2 diminished', '3 major', '5 minor', '7 minor', '8 major', '10 major', '7 major', '11 diminished'],
}

function cutAccidental(input: string): { rest: string; accidental: string; shift: number } {
  const first = input.charAt(0)
  if (first === '♭' || first === 'b') return { rest: input.slice(1), accidental: '♭', shift: -1 }
  if (first === '♯' || first === '#') return { rest: input.slice(1), accidental: '♯', shift: 1 }
  return { rest: input, accidental: '', shift: 0 }
}

/** Reads input in mode exactly as written: nothing is trimmed. Null when it isn't a numeral. */
export function parseProgressionNumeral(input: string, mode: ProgressionMode): ParsedNumeral | null {
  const { rest, accidental, shift } = cutAccidental(input)
  for (const root of NUMERAL_ROOTS) {
    const upper = rest.startsWith(root.upper)
    if (!upper && !rest.startsWith(root.lower)) continue
    const suffix = (upper ? UPPER_SUFFIXES : LOWER_SUFFIXES)[rest.slice(root.upper.length)]
    if (!suffix) return null
    const rootSemitones = (root.semitones + shift + 12) % 12
    return {
      numeral: accidental + (upper ? root.upper : root.lower) + suffix.stored,
      rootSemitones,
      quality: suffix.quality,
      borrowed: !DIATONIC[mode].includes(`${rootSemitones} ${TRIAD_OF[suffix.quality]}`),
    }
  }
  return null
}
