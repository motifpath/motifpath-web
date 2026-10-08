import { describe, expect, it } from 'vitest'

import { encodeTonesWav, SAMPLE_RATE } from '@/spikes/commit-point/wav'

const ascii = (bytes: Uint8Array, from: number, length: number) => String.fromCharCode(...bytes.slice(from, from + length))

describe('encoding a clip of tones as a WAV file', () => {
  const tones = [
    { hz: 440, ms: 500 },
    { hz: 660, ms: 500 },
  ]
  const bytes = encodeTonesWav(tones)
  const view = new DataView(bytes.buffer)

  it('writes a RIFF/WAVE header for 16-bit mono PCM', () => {
    expect(ascii(bytes, 0, 4)).toBe('RIFF')
    expect(ascii(bytes, 8, 4)).toBe('WAVE')
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(SAMPLE_RATE)
    expect(view.getUint16(34, true)).toBe(16)
  })

  it('holds as many samples as the tones last', () => {
    const samples = (SAMPLE_RATE * 1000) / 1000
    expect(ascii(bytes, 36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(samples * 2)
    expect(bytes.length).toBe(44 + samples * 2)
    expect(view.getUint32(4, true)).toBe(bytes.length - 8)
  })

  it('starts and ends each tone silent, so it never clicks', () => {
    expect(view.getInt16(44, true)).toBe(0)
    expect(view.getInt16(bytes.length - 2, true)).toBe(0)
  })
})
