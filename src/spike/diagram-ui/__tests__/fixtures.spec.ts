import { describe, expect, it } from 'vitest'
import { frettedPitch } from '@/shared/utils/pitch'
import { createStudyFixture } from '../fixtures'

describe('audible study fixtures', () => {
  it.each(['pentatonic', 'open', 'octave', 'wide', 'captions', 'hidden', 'bass'])('keeps %s labels consistent with sounding pitch', (fixture) => {
    const { diagram, instrument } = createStudyFixture(fixture, 'mixed', 'scale')
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    for (const p of diagram.positions) {
      const pitch = frettedPitch(instrument.tuning!, p.string!, p.fret!)!
      expect(p.note_name).toBe(names[pitch % 12])
    }
    expect(diagram.sequence).toHaveLength(diagram.positions.length)
    expect(diagram.sequence.flatMap(s => s.position_ids).every(id => diagram.positions.some(p => p.position_id === id))).toBe(true)
  })
  it('offers chords, rests and a strum for playback review, and a silent case', () => {
    const { diagram } = createStudyFixture('hidden', 'mixed', 'phrase')
    expect(diagram.sequence.some(s => s.position_ids.length > 1)).toBe(true)
    expect(diagram.sequence.some(s => s.position_ids.length === 0)).toBe(true)
    expect(diagram.sequence.some(s => s.strum === 'down')).toBe(true)
    expect(diagram.sequence.flatMap(s => s.position_ids)).toContain('s1-0')
    expect(createStudyFixture('pentatonic', 'dot', 'none').diagram.sequence).toEqual([])
  })
})
