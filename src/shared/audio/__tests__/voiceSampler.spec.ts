import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { components } from '@/api/generated/core-domain'

type Voice = components['schemas']['Voice']

const smplr = vi.hoisted(() => {
  const stops: ReturnType<typeof vi.fn>[] = []
  const instance = {
    ready: Promise.resolve(),
    start: vi.fn(() => {
      const stop = vi.fn()
      stops.push(stop)
      return stop
    }),
    stop: vi.fn(),
  }
  return {
    instance,
    stops,
    Sampler: vi.fn(() => instance),
    Scheduler: vi.fn((_context: unknown, options: unknown) => ({ scheduler: options })),
  }
})
vi.mock('smplr', () => ({ Sampler: smplr.Sampler, Scheduler: smplr.Scheduler }))

import { loadVoiceSampler, noteName } from '../voiceSampler'

const VOICE: Voice = {
  voice_id: 'acoustic-guitar',
  names: { en: 'Acoustic guitar' },
  languages: ['en'],
  family: 'fretted',
  samples: [
    { pitch: 40, url: 'https://media.test/audio/voices/acoustic-guitar/40.mp3' },
    { pitch: 61, url: 'https://media.test/audio/voices/acoustic-guitar/61.mp3' },
  ],
  attribution: 'Test samples',
}

// A fresh context per test, since a voice is loaded once per context.
let context: AudioContext

beforeEach(() => {
  context = {} as AudioContext
  smplr.Sampler.mockClear()
  smplr.instance.start.mockClear()
  smplr.instance.stop.mockClear()
  smplr.stops.length = 0
})

describe('noteName', () => {
  it('names a MIDI pitch with a sharp and its octave', () => {
    expect(noteName(40)).toBe('E2')
    expect(noteName(61)).toBe('C#4')
    expect(noteName(21)).toBe('A0')
  })
})

describe('loadVoiceSampler', () => {
  // smplr 1.0.1 plays nothing, without an error, when its buffers are keyed by MIDI numbers or
  // when no detune is given.
  it('keys the recordings by note name and sets detune explicitly', async () => {
    await loadVoiceSampler(context, VOICE)
    expect(smplr.Sampler).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        buffers: { E2: VOICE.samples[0]!.url, 'C#4': VOICE.samples[1]!.url },
        detune: 0,
      }),
    )
  })

  // smplr otherwise queues notes more than 200 ms ahead on a timer, which a background tab throttles.
  it('hands every note to the audio clock at once', async () => {
    await loadVoiceSampler(context, VOICE)
    expect(smplr.Scheduler).toHaveBeenCalledWith(context, { lookaheadMs: Number.POSITIVE_INFINITY })
    const [, options] = smplr.Sampler.mock.calls[0] as unknown as [unknown, { scheduler: unknown }]
    expect(options.scheduler).toEqual({ scheduler: { lookaheadMs: Number.POSITIVE_INFINITY } })
  })

  // Without an explicit release, a note given a duration throws a non-finite release ramp.
  it('plays each note with an explicit release and a stop id of its own', async () => {
    const sink = await loadVoiceSampler(context, VOICE)
    sink.play({ midi: 64, time: 1.5, duration: 0.5 })
    sink.play({ midi: 64, time: 2, duration: 0.5 })

    const [first, second] = smplr.instance.start.mock.calls.map((call) => (call as unknown[])[0]) as {
      stopId: unknown
    }[]
    expect(first).toEqual(
      expect.objectContaining({ note: 64, time: 1.5, duration: 0.5, ampRelease: expect.any(Number) }),
    )
    // smplr's stop function stops every voice sharing the stop id, which defaults to the note.
    expect(first!.stopId).not.toEqual(second!.stopId)
  })

  it('cancels one note through its own stop function', async () => {
    const sink = await loadVoiceSampler(context, VOICE)
    sink.play({ midi: 64, time: 1, duration: 1 })
    const cancel = sink.play({ midi: 64, time: 2, duration: 1 })
    cancel()
    expect(smplr.stops[0]).not.toHaveBeenCalled()
    expect(smplr.stops[1]).toHaveBeenCalled()
  })

  it('stopAll silences the whole voice', async () => {
    const sink = await loadVoiceSampler(context, VOICE)
    sink.stopAll()
    expect(smplr.instance.stop).toHaveBeenCalledWith()
  })

  it('loads a voice once per audio context', async () => {
    const shared = {} as AudioContext
    const [a, b] = await Promise.all([loadVoiceSampler(shared, VOICE), loadVoiceSampler(shared, VOICE)])
    expect(a).toBe(b)
    expect(smplr.Sampler).toHaveBeenCalledTimes(1)
  })
})
