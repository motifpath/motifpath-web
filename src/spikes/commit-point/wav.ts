/**
 * Encodes a clip of tones played one after another as a 16-bit mono WAV file, so the
 * listening items play a real file through the real player with no media server.
 */
export const SAMPLE_RATE = 22050

export interface Tone {
  hz: number
  ms: number
}

/** Each tone fades in and out over this long, so it starts and ends silent. */
const FADE_MS = 20
const AMPLITUDE = 0.4

export function encodeTonesWav(tones: Tone[]): Uint8Array {
  const counts = tones.map((tone) => Math.round((SAMPLE_RATE * tone.ms) / 1000))
  const sampleCount = counts.reduce((sum, count) => sum + count, 0)
  const bytes = new Uint8Array(44 + sampleCount * 2)
  const view = new DataView(bytes.buffer)
  const writeAscii = (offset: number, text: string) => [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)))

  writeAscii(0, 'RIFF')
  view.setUint32(4, bytes.length - 8, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, sampleCount * 2, true)

  const fade = Math.round((SAMPLE_RATE * FADE_MS) / 1000)
  let offset = 44
  tones.forEach((tone, toneIndex) => {
    const count = counts[toneIndex] ?? 0
    for (let index = 0; index < count; index++) {
      const envelope = Math.min(1, index / fade, (count - 1 - index) / fade)
      const value = Math.sin((2 * Math.PI * tone.hz * index) / SAMPLE_RATE) * envelope * AMPLITUDE
      view.setInt16(offset, Math.round(value * 32767), true)
      offset += 2
    }
  })
  return bytes
}
