import { describe, expect, it } from 'vitest'

import { resolvePlayback } from '@/shared/utils/diagramPlayback'
import type { components } from '@/api/generated/core-domain'

type DiagramPlayback = components['schemas']['DiagramPlayback']

function playback(id: string, name: string): DiagramPlayback {
  return {
    playback_id: id,
    names: { en: name },
    tempo_bpm: 90,
    time_signature: { beats: 4, beat_value: 4 },
    steps: [{ position_ids: ['p0'], value: { num: 1, den: 4 }, strum: 'none' }],
  }
}

const strum = playback('pb-strum', 'Strum')
const arpeggio = playback('pb-arpeggio', 'Arpeggio')
const diagram = { playbacks: [strum, arpeggio], default_playback_id: 'pb-strum' }

describe('resolvePlayback', () => {
  it('plays the default playback when the use chose none', () => {
    expect(resolvePlayback(diagram, null)).toBe(strum)
    expect(resolvePlayback(diagram, undefined)).toBe(strum)
  })

  it('plays the playback the use chose', () => {
    expect(resolvePlayback(diagram, 'pb-arpeggio')).toBe(arpeggio)
  })

  it('plays the default when the chosen playback is no longer on the diagram', () => {
    expect(resolvePlayback(diagram, 'pb-removed')).toBe(strum)
  })

  it('has nothing to play when the diagram has no playbacks', () => {
    expect(resolvePlayback({ playbacks: [], default_playback_id: null }, 'pb-strum')).toBeNull()
  })
})
