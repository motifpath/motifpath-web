/**
 * The listening items' clips, kept free of app imports so the spike's dev server can encode
 * them too: two notes, the second the interval above the first.
 */
import type { Tone } from './wav'

const A3 = 220

export const CLIP_SEMITONES: Record<string, number> = { m3: 3, p5: 7, M6: 9, p4: 5, m7: 10, M3: 4 }

export function clipTones(key: string): Tone[] | null {
  const semitones = CLIP_SEMITONES[key]
  if (semitones === undefined) return null
  return [
    { hz: A3, ms: 700 },
    { hz: A3 * 2 ** (semitones / 12), ms: 900 },
  ]
}
