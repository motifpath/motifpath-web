import { effectScope, nextTick, ref, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { makeFrettedDiagram, makeFrettedInstrument, makePlayback, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type Playback = NonNullable<components['schemas']['DiagramRef']['playback']>

const audio = vi.hoisted(() => ({
  /** The audio clock, which the fake context reports and the audible time follows. */
  now: 0,
  played: [] as { voiceId: string; midi: number; time: number; duration: number; cancelled: boolean }[],
  stopAll: vi.fn(),
  failLoad: false,
  clicks: [] as { time: number; accent: boolean }[],
}))

vi.mock('@/shared/audio/audioContext', () => ({
  unlockAudioContext: () => ({
    get currentTime() {
      return audio.now
    },
  }),
  audibleTime: () => audio.now,
}))

vi.mock('@/shared/audio/clickSink', () => ({
  createClickSink: () => ({
    click(at: { time: number; accent: boolean }) {
      audio.clicks.push(at)
      return () => {}
    },
    stopAll: vi.fn(),
  }),
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
      stopAll: audio.stopAll,
    }
  },
}))

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { clearVoiceCache } from '@/shared/composables/useListVoices'
import { clearPrefetchedSamples, isPlayable, useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'

const VOICES = ['acoustic-guitar', 'nylon-guitar'].map((voice_id) => ({
  voice_id,
  names: { en: voice_id },
  languages: ['en'],
  family: 'fretted',
  samples: [40, 43].map((pitch) => ({ pitch, url: `https://media.test/${voice_id}/${pitch}.mp3` })),
  attribution: '',
}))

const AS_AUTHORED: Playback = { direction: 'as_authored', loop: false }

let frames: FrameRequestCallback[] = []

/** Moves the audio clock to `at` and runs the animation frames waiting for it. */
function frameAt(at: number) {
  audio.now = at
  const due = frames
  frames = []
  due.forEach((frame) => frame(at * 1000))
}

function setup(
  options: { diagram?: Diagram; instrument?: Instrument; playback?: Playback | null; metronome?: boolean } = {},
) {
  const source = ref({
    diagram: options.diagram ?? makeSequencedFrettedDiagram(),
    instrument: options.instrument ?? makeFrettedInstrument(),
    playback: options.playback === undefined ? AS_AUTHORED : options.playback,
  })
  const scope = effectScope()
  const player = scope.run(() => useDiagramPlayback(source, { metronome: options.metronome ?? false }))!
  return { player, scope, source }
}

/** Presses Play and waits until the run is scheduled. */
async function play(player: ReturnType<typeof useDiagramPlayback>) {
  player.toggle()
  await vi.waitFor(() => expect(player.state.value).toBe('playing'))
}

const sounding = () => audio.played.filter((note) => !note.cancelled)

beforeEach(() => {
  audio.now = 100
  audio.played = []
  audio.stopAll.mockReset()
  audio.failLoad = false
  audio.clicks = []
  frames = []
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => frames.push(frame))
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = []
  })
  GET.mockReset()
  GET.mockResolvedValue({ data: VOICES, error: undefined, response: { status: 200 } })
  clearVoiceCache()
  clearPrefetchedSamples()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useDiagramPlayback — whether Play is offered', () => {
  it('offers Play for a fretted diagram with a step that sounds', () => {
    expect(setup().player.canPlay.value).toBe(true)
  })

  it.each([
    ['the diagram has no playbacks', { diagram: makeFrettedDiagram() }],
    [
      'every step is a rest',
      { diagram: makeSequencedFrettedDiagram({}, { steps: [{ position_ids: [], value: { num: 1, den: 4 }, strum: 'none' }] }) },
    ],
    ['the usage offers no playback', { playback: null }],
    ['no position has a pitch (a tuning without octaves)', { instrument: makeFrettedInstrument({ tuning: ['E', 'A', 'D', 'G', 'B', 'E'] }) }],
    [
      'the instrument is a keyboard',
      { instrument: makeFrettedInstrument({ family: 'keyboard', tuning: undefined, string_count: undefined }) },
    ],
  ])("doesn't offer Play when %s", (_, options: { diagram?: Diagram; instrument?: Instrument; playback?: Playback | null }) => {
    expect(setup(options).player.canPlay.value).toBe(false)
    // The same rule, for a holder deciding whether to make room for a player before it exists.
    expect(
      isPlayable({
        diagram: options.diagram ?? makeSequencedFrettedDiagram(),
        instrument: options.instrument ?? makeFrettedInstrument(),
        playback: options.playback === undefined ? AS_AUTHORED : options.playback,
      }),
    ).toBe(false)
  })

  it('says a diagram with a sounding step is playable, before any player exists', () => {
    expect(isPlayable({ diagram: makeSequencedFrettedDiagram(), instrument: makeFrettedInstrument(), playback: AS_AUTHORED })).toBe(true)
  })
})

describe('useDiagramPlayback — playing', () => {
  it("plays the default playback in the instrument's default voice, at that playback's tempo, pitched from the tuning", async () => {
    const { player } = setup()
    await play(player)

    const start = audio.played[0]!.time
    expect(start).toBeGreaterThanOrEqual(100)
    // 90 BPM in 4/4: an eighth lasts a third of a second; the chord is strummed down 18 ms apart.
    expect(audio.played.map((n) => [n.voiceId, n.midi, +(n.time - start).toFixed(3)])).toEqual([
      ['acoustic-guitar', 45, 0],
      ['acoustic-guitar', 48, 0.333],
      ['acoustic-guitar', 45, 1],
      ['acoustic-guitar', 50, 1.018],
      ['acoustic-guitar', 52, 1.036],
    ])
  })

  it("plays in the usage's voice and tempo when it sets them", async () => {
    const { player } = setup({ playback: { ...AS_AUTHORED, voice_id: 'nylon-guitar', tempo_bpm: 180 } })
    expect(player.tempo.value).toBe(180)
    await play(player)

    const start = audio.played[0]!.time
    expect(audio.played[0]!.voiceId).toBe('nylon-guitar')
    expect(audio.played[1]!.time - start).toBeCloseTo(1 / 6)
  })

  it('plays the steps last to first when the usage reverses them', async () => {
    const { player } = setup({ playback: { direction: 'reversed', loop: false } })
    await play(player)
    expect(audio.played.map((n) => n.midi)).toEqual([45, 50, 52, 48, 45])
  })

  it("clicks a metronome on every beat from the first note when asked, the bar's first beat accented", async () => {
    const { player } = setup({ metronome: true })
    player.tempo.value = 60
    await play(player)
    const start = audio.played[0]!.time

    expect(audio.clicks[0]).toEqual({ time: start, accent: true })
    expect(audio.clicks[1]).toEqual({ time: start + 1, accent: false })
  })

  it('plays without a metronome unless asked', async () => {
    const { player } = setup()
    await play(player)

    expect(audio.clicks).toEqual([])
  })

  it('lights up the positions of the step being heard, then goes idle when the run ends', async () => {
    const { player } = setup()
    await play(player)
    const start = audio.played[0]!.time

    frameAt(start + 0.1)
    expect(player.activePositionIds.value).toEqual(['p0'])
    frameAt(start + 0.4)
    expect(player.activePositionIds.value).toEqual(['p1'])
    frameAt(start + 0.8)
    expect(player.activePositionIds.value).toEqual([])
    frameAt(start + 1.2)
    expect(player.activePositionIds.value).toEqual(['p0', 'p2', 'p3'])

    frameAt(start + 1.7)
    expect(player.state.value).toBe('idle')
    expect(player.activePositionIds.value).toEqual([])
  })

  it('reports the lit positions only when they change, not on every animation frame', async () => {
    const { player } = setup()
    await play(player)
    const start = audio.played[0]!.time
    let updates = 0
    watch(player.activePositionIds, () => updates++, { flush: 'sync' })

    frameAt(start + 0.05)
    frameAt(start + 0.1)
    frameAt(start + 0.15)
    expect(updates).toBe(1)
    frameAt(start + 0.4)
    expect(updates).toBe(2)
  })

  it('keeps going when the usage loops', async () => {
    const { player } = setup({ playback: { direction: 'as_authored', loop: true } })
    await play(player)
    const start = audio.played[0]!.time

    frameAt(start)
    frameAt(start + 1.7)
    expect(player.state.value).toBe('playing')
    expect(player.activePositionIds.value).toEqual(['p0'])
  })

  it('a tempo change while playing re-times the steps not yet started', async () => {
    const { player } = setup()
    await play(player)
    const start = audio.played[0]!.time

    frameAt(start + 0.1)
    player.tempo.value = 45
    await nextTick()
    // The first eighth keeps its length; from the second on, an eighth lasts two thirds of a second.
    expect(sounding().map((n) => +(n.time - start).toFixed(3))).toEqual([0, 0.333, 1.667, 1.685, 1.703])
  })

  it('Stop silences the run and lights nothing', async () => {
    const { player } = setup()
    await play(player)
    frameAt(audio.played[0]!.time + 0.1)

    player.toggle()
    expect(player.state.value).toBe('idle')
    expect(player.activePositionIds.value).toEqual([])
    expect(audio.stopAll).toHaveBeenCalled()
    expect(sounding()).toEqual([])
  })

  it('stops when its component goes away', async () => {
    const { player, scope } = setup()
    await play(player)
    scope.stop()
    expect(sounding()).toEqual([])
  })

  it('plays one diagram at a time: starting another stops the first', async () => {
    const first = setup().player
    const second = setup().player
    await play(first)
    const firstNotes = audio.played.length

    await play(second)
    expect(first.state.value).toBe('idle')
    expect(audio.played.slice(0, firstNotes).every((n) => n.cancelled)).toBe(true)
  })

  it("reports an error when the voice can't be loaded, and can try again", async () => {
    audio.failLoad = true
    const { player } = setup()
    player.toggle()
    await vi.waitFor(() => expect(player.state.value).toBe('error'))

    audio.failLoad = false
    await play(player)
  })

  it('resets the tempo to the new effective tempo when the diagram changes', async () => {
    const { player, source } = setup()
    player.tempo.value = 60
    source.value = { ...source.value, diagram: makeSequencedFrettedDiagram({ diagram_id: 'other' }, { tempo_bpm: 120 }) }
    await nextTick()
    expect(player.tempo.value).toBe(120)
  })
})

describe('useDiagramPlayback — which playback a use plays', () => {
  const strum = makePlayback({
    playback_id: 'pb-strum',
    names: { en: 'Strum' },
    tempo_bpm: 60,
    steps: [{ position_ids: ['p0', 'p2'], value: { num: 1, den: 4 }, strum: 'none' }],
  })
  const arpeggio = makePlayback({
    playback_id: 'pb-arpeggio',
    names: { en: 'Arpeggio' },
    tempo_bpm: 120,
    time_signature: { beats: 3, beat_value: 4 },
    steps: [
      { position_ids: ['p0'], value: { num: 1, den: 4 }, strum: 'none' },
      { position_ids: ['p2'], value: { num: 1, den: 4 }, strum: 'none' },
    ],
  })
  const diagram = makeFrettedDiagram({ playbacks: [strum, arpeggio], default_playback_id: 'pb-strum' })

  async function heard(playbackId: string | null) {
    const { player } = setup({ diagram, playback: { ...AS_AUTHORED, playback_id: playbackId }, metronome: true })
    await play(player)
    const start = audio.played[0]!.time
    return {
      tempo: player.tempo.value,
      notes: audio.played.map((n) => [n.midi, +(n.time - start).toFixed(3)]),
      accents: audio.clicks.filter((c) => c.accent).length,
    }
  }

  it("plays the diagram's default playback, at its own tempo, when the use chose none", async () => {
    expect(await heard(null)).toMatchObject({ tempo: 60, notes: [[45, 0], [50, 0]] })
  })

  it('plays the playback the use chose, at its own tempo and time signature', async () => {
    const { tempo, notes } = await heard('pb-arpeggio')
    expect(tempo).toBe(120)
    expect(notes).toEqual([[45, 0], [50, 0.5]])
  })

  it('plays the default when the chosen playback is no longer on the diagram', async () => {
    expect(await heard('pb-removed')).toMatchObject({ tempo: 60, notes: [[45, 0], [50, 0]] })
  })

  it("counts the metronome's bars in the played playback's time signature", async () => {
    const waltz = makePlayback({
      playback_id: 'pb-waltz',
      tempo_bpm: 120,
      time_signature: { beats: 3, beat_value: 4 },
      steps: ['p0', 'p2', 'p3', 'p0'].map((id) => ({ position_ids: [id], value: { num: 1, den: 4 }, strum: 'none' as const })),
    })
    const { player } = setup({
      diagram: makeFrettedDiagram({ playbacks: [strum, waltz], default_playback_id: 'pb-strum' }),
      playback: { ...AS_AUTHORED, playback_id: 'pb-waltz' },
      metronome: true,
    })
    await play(player)
    const start = audio.played[0]!.time
    // 3/4 at 120 BPM: a bar lasts a second and a half, so the second accent falls there.
    expect(audio.clicks.filter((c) => c.accent).map((c) => +(c.time - start).toFixed(3)).slice(0, 2)).toEqual([0, 1.5])
  })

  it('offers no Play when the default it falls back to sounds nothing', () => {
    const silent = makeFrettedDiagram({
      playbacks: [makePlayback({ playback_id: 'pb-rest', steps: [{ position_ids: [], value: { num: 1, den: 4 }, strum: 'none' }] })],
      default_playback_id: 'pb-rest',
    })
    expect(setup({ diagram: silent, playback: { ...AS_AUTHORED, playback_id: 'pb-removed' } }).player.canPlay.value).toBe(false)
  })
})

describe('useDiagramPlayback — prefetching', () => {
  it("fetches the voice's recordings ahead of Play, once per page, so Play starts from the HTTP cache", async () => {
    const fetch = vi.fn<(url: string) => Promise<Response>>(async () => new Response())
    vi.stubGlobal('fetch', fetch)
    const { player } = setup({ playback: { ...AS_AUTHORED, voice_id: 'nylon-guitar' } })

    await player.prefetch()
    await setup({ playback: { ...AS_AUTHORED, voice_id: 'nylon-guitar' } }).player.prefetch()

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://media.test/nylon-guitar/40.mp3',
      'https://media.test/nylon-guitar/43.mp3',
    ])
  })

  it("doesn't fetch anything for a diagram that can't play", async () => {
    const fetch = vi.fn<(url: string) => Promise<Response>>(async () => new Response())
    vi.stubGlobal('fetch', fetch)
    await setup({ playback: null }).player.prefetch()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('ignores a failed fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    await expect(setup().player.prefetch()).resolves.toBeUndefined()
  })
})
