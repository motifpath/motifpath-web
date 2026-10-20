// @vitest-environment node
/**
 * Renders notes through the real, pinned smplr in an offline audio context
 * (jsdom has no Web Audio), so a smplr bump that silently stops playing — or
 * starts clipping — fails here rather than in a student's headphones.
 */
import { AudioBuffer, AudioBufferSourceNode, GainNode, OfflineAudioContext } from 'node-web-audio-api'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { components } from '@/api/generated/core-domain'

import { loadVoiceSampler } from '../voiceSampler'

type Voice = components['schemas']['Voice']

const RATE = 44100

/** The peak level of the voice recordings MotifPath serves. */
const SAMPLE_PEAK = 0.67

/** A 16-bit mono WAV of a decaying sine at `hz`, standing in for a recorded note. */
function sineWav(hz: number, seconds: number): ArrayBuffer {
  const frames = Math.floor(seconds * RATE)
  const view = new DataView(new ArrayBuffer(44 + frames * 2))
  const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + frames * 2, true)
  text(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, frames * 2, true)
  for (let i = 0; i < frames; i++) {
    const t = i / RATE
    view.setInt16(44 + i * 2, Math.sin(2 * Math.PI * hz * t) * Math.exp(-2 * t) * SAMPLE_PEAK * 32767, true)
  }
  return view.buffer
}

const VOICE: Voice = {
  voice_id: 'test-voice',
  names: { en: 'Test voice' },
  languages: ['en'],
  family: 'fretted',
  samples: [40, 43, 46, 49, 52, 55, 58, 61, 64].map((pitch) => ({
    pitch,
    url: `https://media.test/audio/voices/test-voice/${pitch}.wav`,
  })),
  attribution: 'Generated sine tones',
}

function peak(samples: Float32Array, from: number, to: number): number {
  let max = 0
  for (let i = Math.floor(from * RATE); i < Math.floor(to * RATE); i++) max = Math.max(max, Math.abs(samples[i]!))
  return max
}

async function render(play: (sink: Awaited<ReturnType<typeof loadVoiceSampler>>) => void): Promise<Float32Array> {
  const context = new OfflineAudioContext(1, 2 * RATE, RATE)
  play(await loadVoiceSampler(context, VOICE))
  return (await context.startRendering()).getChannelData(0)
}

beforeAll(() => {
  vi.stubGlobal('AudioBuffer', AudioBuffer)
  vi.stubGlobal('AudioBufferSourceNode', AudioBufferSourceNode)
  vi.stubGlobal('GainNode', GainNode)
  vi.stubGlobal('OfflineAudioContext', OfflineAudioContext)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const pitch = Number(/(\d+)\.wav$/.exec(String(url))?.[1])
      return new Response(sineWav(440 * 2 ** ((pitch - 69) / 12), 1.5))
    }),
  )
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('voice sampler, rendered through the real smplr', () => {
  it('sounds a scheduled note in its window and is silent before it', async () => {
    const samples = await render((sink) => sink.play({ midi: 50, time: 0.5, duration: 0.5 }))
    expect(peak(samples, 0, 0.45)).toBeLessThan(1e-4)
    expect(peak(samples, 0.55, 0.95)).toBeGreaterThan(0.05)
  })

  it('a cancelled note never sounds', async () => {
    const samples = await render((sink) => sink.play({ midi: 50, time: 0.5, duration: 0.5 })())
    expect(peak(samples, 0, 2)).toBeLessThan(1e-4)
  })

  it('cancelling a later note leaves an earlier one of the same pitch sounding', async () => {
    const samples = await render((sink) => {
      sink.play({ midi: 50, time: 0, duration: 1.5 })
      sink.play({ midi: 50, time: 1, duration: 0.5 })()
    })
    expect(peak(samples, 0.5, 0.9)).toBeGreaterThan(0.05)
  })

  it.each([
    ['strummed', 0.018],
    ['struck together', 0],
  ])('a six-string chord %s stays below clipping', async (_, strumSeconds) => {
    const samples = await render((sink) => {
      ;[40, 45, 50, 55, 59, 64].forEach((midi, i) => sink.play({ midi, time: 0.1 + i * strumSeconds, duration: 1 }))
    })
    expect(peak(samples, 0, 2)).toBeLessThan(1)
  })
})
