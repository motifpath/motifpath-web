import type { components } from '@/api/generated/core-domain'
import { resolvePlayback } from '@/shared/utils/diagramPlayback'
import { beatsPerBar, pulse } from '@/shared/utils/sequence'

type Diagram = components['schemas']['Diagram']

/**
 * A play-along take of a diagram: a bar of rests, one per beat, then the
 * diagram's default playback, which is what a take plays. The count-in is part
 * of that playback rather than a separate click, so it starts inside the tap
 * that starts the take (iOS keeps audio started later silent) and the music
 * follows on the same clock. A diagram with no playbacks gets no count-in.
 */
export function withCountIn(diagram: Diagram): { diagram: Diagram; beats: number } {
  const played = resolvePlayback(diagram, null)
  if (!played) return { diagram, beats: 0 }

  const beat = pulse(played.time_signature)
  const beats = beatsPerBar(played.time_signature)
  const rests = Array.from({ length: beats }, () => ({ position_ids: [], value: { ...beat }, strum: 'none' as const }))
  const counted = { ...played, steps: [...rests, ...played.steps] }
  return {
    diagram: { ...diagram, playbacks: diagram.playbacks.map((p) => (p === played ? counted : p)) },
    beats,
  }
}
