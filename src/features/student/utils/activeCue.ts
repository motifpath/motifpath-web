import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']

/**
 * Picks the cue to show at a playback position, derived purely from the
 * position so seeking back into a cue's window shows it again and seeking
 * past it hides it — no cue state is stored.
 *
 * A cue is visible from its start second up to, but not including, its end
 * second. Cues without video timing (paragraph-triggered ones) never show
 * here. When several visible cues overlap, the one that starts earliest wins;
 * a tie goes to the one listed first. The list is not reordered or mutated.
 */
export function activeCue(cues: ExpandedContent[], seconds: number): ExpandedContent | undefined {
  let winner: ExpandedContent | undefined
  let winnerStart = Infinity

  for (const cue of cues) {
    const start = cue.trigger_at_seconds
    const end = cue.hide_at_seconds
    if (start === undefined || end === undefined) continue
    if (seconds < start || seconds >= end) continue

    if (start < winnerStart) {
      winner = cue
      winnerStart = start
    }
  }

  return winner
}
