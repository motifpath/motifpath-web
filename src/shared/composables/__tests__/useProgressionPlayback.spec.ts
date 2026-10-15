import { effectScope, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

const audio = vi.hoisted(() => ({
  /** The audio clock, which the fake context reports and the audible time follows. */
  now: 0,
  played: [] as { voiceId: string; midi: number; time: number; duration: number; cancelled: boolean }[],
  failLoad: false,
}))

vi.mock('@/shared/audio/audioContext', () => ({
  unlockAudioContext: () => ({
    get currentTime() {
      return audio.now
    },
  }),
  audibleTime: () => audio.now,
}))

vi.mock('@/shared/audio/voiceSampler', () => ({
  loadVoiceSampler: async (_context: unknown, voice: { voice_id: string }) => {
    if (audio.failLoad) throw new Error('samples unavailable')
    return {
      play(note: { midi: number; time: number; duration: number }) {
        const entry = { voiceId: voice.voice_id, ...note, cancelled: false }
        audio.played.push(entry)
        return () => {
          entry.cancelled = true
        }
      },
      stopAll: () => {},
    }
  },
}))

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { clearPrefetchedSamples } from '@/shared/audio/samplePrefetch'
import { stopDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import { clearVoiceCache } from '@/shared/composables/useListVoices'
import { useProgressionPlayback } from '@/shared/composables/useProgressionPlayback'
import type { ProgressionSource } from '@/shared/composables/useProgressionPlayback'

const VOICES = ['acoustic-guitar', 'electric-bass'].map((voice_id) => ({
  voice_id,
  names: { en: voice_id },
  languages: ['en'],
  family: 'fretted',
  samples: [40].map((pitch) => ({ pitch, url: `https://media.test/${voice_id}/${pitch}.mp3` })),
  attribution: '',
}))

const { C, G, Am, F } = drillVoicings

let frames: FrameRequestCallback[] = []

/** Moves the audio clock to `at` and runs the animation frames waiting for it. */
function frameAt(at: number) {
  audio.now = at
  const due = frames
  frames = []
  due.forEach((frame) => frame(at * 1000))
}

/** 60 BPM in 4/4: every bar lasts 4 seconds. */
function setup(overrides: Partial<ProgressionSource> = {}) {
  const source = ref<ProgressionSource>({ chords: [C, F, G, C].map((chord) => chord.diagram), chordInstrument: drillGuitar, bass: null, tempoBpm: 60, ...overrides })
  const scope = effectScope()
  const player = scope.run(() => useProgressionPlayback(source))!
  return { source, scope, player }
}

async function startPlaying(player: ReturnType<typeof setup>['player']) {
  player.toggle()
  await vi.waitFor(() => expect(player.state.value).toBe('playing'))
}

const sounding = (voiceId: string) => audio.played.filter((note) => !note.cancelled && note.voiceId === voiceId)

beforeEach(() => {
  audio.now = 100
  audio.played = []
  audio.failLoad = false
  frames = []
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => frames.push(frame))
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = []
  })
  vi.stubGlobal('fetch', vi.fn(async () => new Response()))
  GET.mockReset()
  GET.mockResolvedValue({ data: VOICES, error: undefined, response: { status: 200 } })
  clearVoiceCache()
  clearPrefetchedSamples()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useProgressionPlayback', () => {
  it('strums each bar’s chord in the chord instrument’s voice, one bar after the other at the tempo', async () => {
    const { player } = setup()
    await startPlaying(player)

    const strums = sounding('acoustic-guitar')
    const start = strums[0]!.time
    // C F G C: 5, 6, 6 and 5 strings, each strum starting on its bar.
    expect(strums).toHaveLength(22)
    for (const barStart of [0, 4, 8, 12]) expect(strums.some((note) => Math.abs(note.time - start - barStart) < 1e-9)).toBe(true)
    expect(sounding('electric-bass')).toEqual([])
  })

  it('on bass, plays a line of the chords’ roots in the bass’s own voice, under the same bars', async () => {
    const { player } = setup({ chords: [C, Am].map((chord) => chord.diagram), bass: { instrument: drillBass, roots: ['C', 'A'] } })
    await startPlaying(player)

    const line = sounding('electric-bass')
    expect(line.map((note) => note.midi)).toEqual([36, 33])
    expect(line[1]!.time - line[0]!.time).toBeCloseTo(4)
    expect(line[0]!.time).toBeCloseTo(sounding('acoustic-guitar')[0]!.time)
  })

  it('plays at the tempo the student picks, starting from the progression’s own', async () => {
    const { player } = setup()
    expect(player.tempo.value).toBe(60)

    player.tempo.value = 120
    await startPlaying(player)
    const strums = sounding('acoustic-guitar')
    expect(strums.some((note) => Math.abs(note.time - strums[0]!.time - 2) < 1e-9)).toBe(true)
  })

  it('a tempo change while playing re-times the bars not yet started, chords and bass line alike', async () => {
    const { player } = setup({ bass: { instrument: drillBass, roots: ['C', 'F', 'G', 'C'] } })
    await startPlaying(player)
    const start = sounding('acoustic-guitar')[0]!.time

    frameAt(start + 1)
    player.tempo.value = 120
    await nextTick()
    // The first bar keeps its 4 s; the second then lasts 2 s, so the third starts 6 s in.
    expect(sounding('electric-bass').map((note) => note.time - start)).toEqual([0, 4, 6, 8])
    expect(sounding('acoustic-guitar').some((note) => Math.abs(note.time - start - 6) < 1e-9)).toBe(true)
  })

  it('takes a new progression at its own tempo', async () => {
    const { player, source } = setup()
    player.tempo.value = 120

    source.value = { ...source.value, tempoBpm: 80 }
    await vi.waitFor(() => expect(player.tempo.value).toBe(80))
  })

  it('says which bar is sounding, and none once the progression has played', async () => {
    const { player } = setup()
    await startPlaying(player)
    const start = sounding('acoustic-guitar')[0]!.time

    frameAt(start + 5)
    expect(player.currentBar.value).toBe(1)
    frameAt(start + 13)
    expect(player.currentBar.value).toBe(3)
    frameAt(start + 17)
    expect(player.currentBar.value).toBeNull()
    expect(player.state.value).toBe('idle')
  })

  it('plays again from the first bar, as often as asked', async () => {
    const { player } = setup()
    await startPlaying(player)
    player.toggle()
    expect(player.state.value).toBe('idle')
    expect(sounding('acoustic-guitar')).toEqual([])

    await startPlaying(player)
    frameAt(sounding('acoustic-guitar')[0]!.time + 1)
    expect(player.currentBar.value).toBe(0)
  })

  it('stops when something else starts playing', async () => {
    const { player } = setup()
    await startPlaying(player)

    stopDiagramPlayback()
    expect(player.state.value).toBe('idle')
    expect(sounding('acoustic-guitar')).toEqual([])
  })

  it('stops when its owner goes away', async () => {
    const { player, scope } = setup()
    await startPlaying(player)

    scope.stop()
    expect(sounding('acoustic-guitar')).toEqual([])
  })

  it('is ready once every voice it needs has its recordings', async () => {
    const { player } = setup({ bass: { instrument: drillBass, roots: ['C', 'F', 'G', 'C'] } })

    expect(player.status.value).toBe('loading')
    await vi.waitFor(() => expect(player.status.value).toBe('ready'))
  })

  it('is ready even when Play is pressed before its voices were checked', async () => {
    const { player } = setup()
    player.toggle()

    await vi.waitFor(() => expect(player.status.value).toBe('ready'))
  })

  it('is missing its sound when a voice’s recordings can’t be fetched, before anyone presses Play', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(null, { status: url.includes('electric-bass') ? 404 : 200 })))
    const { player } = setup({ bass: { instrument: drillBass, roots: ['C', 'F', 'G', 'C'] } })

    await vi.waitFor(() => expect(player.status.value).toBe('missing'))
  })

  it('is missing its sound when Play can’t load it', async () => {
    audio.failLoad = true
    const { player } = setup()
    player.toggle()

    await vi.waitFor(() => expect(player.state.value).toBe('error'))
    expect(player.status.value).toBe('missing')
  })
})
