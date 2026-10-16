import type { components } from '@/api/generated/core-domain'
import { resolvePlayback } from '@/shared/utils/diagramPlayback'
import { beatsPerBar, pulse, scaleNoteValue } from '@/shared/utils/sequence'
import { speedFactor } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

type Diagram = components['schemas']['Diagram']

/**
 * A play-along take of a diagram: a bar of rests, one per beat, then the
 * diagram's default playback, which is what a take plays. The count-in is part
 * of that playback rather than a separate click, so it starts inside the tap
 * that starts the take (iOS keeps audio started later silent) and the music
 * follows on the same clock. A diagram with no playbacks gets no count-in.
 *
 * At a note value the music plays that many times faster over the same click, so each rest is
 * that many times longer as written: the count-in stays a bar of beats at the tempo.
 */
export function withCountIn(diagram: Diagram, noteValue: TempoNoteValue = 'quarters'): { diagram: Diagram; beats: number } {
  const played = resolvePlayback(diagram, null)
  if (!played) return { diagram, beats: 0 }

  const beat = scaleNoteValue(pulse(played.time_signature), speedFactor(noteValue))
  const beats = beatsPerBar(played.time_signature)
  const rests = Array.from({ length: beats }, () => ({ position_ids: [], value: { ...beat }, strum: 'none' as const }))
  const counted = { ...played, steps: [...rests, ...played.steps] }
  return {
    diagram: { ...diagram, playbacks: diagram.playbacks.map((p) => (p === played ? counted : p)) },
    beats,
  }
}
