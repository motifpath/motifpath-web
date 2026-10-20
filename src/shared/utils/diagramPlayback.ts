import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramPlayback = components['schemas']['DiagramPlayback']

/**
 * The playback a use of a diagram plays: the one it chose, else the diagram's default. A chosen
 * playback the diagram no longer has falls back to the default, so a use never breaks when an
 * author removes one. Null when the diagram has no playbacks.
 */
export function resolvePlayback(
  diagram: Pick<Diagram, 'playbacks' | 'default_playback_id'>,
  playbackId: string | null | undefined,
): DiagramPlayback | null {
  const byId = (id: string | null | undefined) => diagram.playbacks.find((p) => p.playback_id === id)
  return byId(playbackId) ?? byId(diagram.default_playback_id) ?? diagram.playbacks[0] ?? null
}
