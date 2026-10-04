import type { components } from '@/api/generated/core-domain'
import { beatsPerBar, pulse } from '@/shared/utils/sequence'

type Diagram = components['schemas']['Diagram']

/**
 * A play-along take of a diagram: a bar of rests, one per beat, then the
 * diagram's sequence. The count-in is part of the sequence rather than a
 * separate click, so it starts inside the tap that starts the take (iOS keeps
 * audio started later silent) and the music follows on the same clock.
 */
export function withCountIn(diagram: Diagram): { diagram: Diagram; beats: number } {
  const beat = pulse(diagram.time_signature)
  const beats = beatsPerBar(diagram.time_signature)
  const rests = Array.from({ length: beats }, () => ({ position_ids: [], value: { ...beat }, strum: 'none' as const }))
  return { diagram: { ...diagram, sequence: [...rests, ...diagram.sequence] }, beats }
}
