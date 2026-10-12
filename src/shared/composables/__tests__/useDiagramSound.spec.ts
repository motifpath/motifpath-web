import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const audio = vi.hoisted(() => ({ failLoad: false }))

vi.mock('@/shared/audio/audioContext', () => ({
  unlockAudioContext: () => ({ currentTime: 0 }),
  audibleTime: () => 0,
}))

vi.mock('@/shared/audio/voiceSampler', () => ({
  loadVoiceSampler: async () => {
    if (audio.failLoad) throw new Error('samples unavailable')
    return { play: () => () => {}, stopAll: () => {} }
  },
}))

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { clearPrefetchedSamples } from '@/shared/composables/useDiagramPlayback'
import { useDiagramSound } from '@/shared/composables/useDiagramSound'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { clearVoiceCache } from '@/shared/composables/useListVoices'
import { makeDiagramRef, makeFrettedDiagram, makeFrettedInstrument, makePlayback } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = (status = 500) => Promise.resolve({ data: undefined, error: { title: 'boom' }, response: { status } })

const VOICE = {
  voice_id: 'acoustic-guitar',
  names: { en: 'Acoustic guitar' },
  languages: ['en'],
  family: 'fretted',
  samples: [{ pitch: 40, url: 'https://media.test/acoustic-guitar/40.mp3' }],
  attribution: '',
}

const strum = makePlayback({ playback_id: 'strum', names: { en: 'Strum' }, tempo_bpm: 72 })
const arpeggio = makePlayback({ playback_id: 'arpeggio', names: { en: 'Arpeggio' }, tempo_bpm: 60 })
const aMinor = makeFrettedDiagram({
  diagram_id: 'a-minor',
  names: { en: 'A minor' },
  playbacks: [strum, arpeggio],
  default_playback_id: 'strum',
})

function sound(playbackId: string, overrides: Partial<DiagramRef> = {}): DiagramRef {
  return makeDiagramRef({
    diagram_id: 'a-minor',
    playback: { playback_id: playbackId, direction: 'as_authored', loop: false },
    ...overrides,
  })
}

function serve(options: { diagrams?: Diagram[]; voices?: boolean; instrumentFamily?: 'fretted' | 'keyboard' } = {}) {
  const diagrams = options.diagrams ?? [aMinor]
  GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
    if (path === '/instruments') return ok([makeFrettedInstrument({ family: options.instrumentFamily ?? 'fretted' })])
    if (path === '/voices') return options.voices === false ? fail(503) : ok([VOICE])
    const diagram = diagrams.find((d) => d.diagram_id === init?.params?.path?.diagram_id)
    return diagram ? ok(diagram) : fail(404)
  })
}

function setup(ref: DiagramRef) {
  const scope = effectScope()
  const result = scope.run(() => useDiagramSound(ref))!
  return { ...result, scope }
}

beforeEach(() => {
  audio.failLoad = false
  GET.mockReset()
  clearEmbeddedDiagramCache()
  clearVoiceCache()
  clearPrefetchedSamples()
  vi.stubGlobal('fetch', vi.fn(async () => new Response()))
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => vi.unstubAllGlobals())

describe('useDiagramSound', () => {
  it('is loading, then ready to play once the diagram and its voice are there', async () => {
    serve()
    const view = setup(sound('strum'))
    expect(view.status.value).toBe('loading')

    await vi.waitFor(() => expect(view.status.value).toBe('ready'))
    expect(view.missing.value).toBeNull()
    expect(view.canPlay.value).toBe(true)
  })

  it('names the diagram and the playback the exercise plays, at its tempo', async () => {
    serve()
    const view = setup(sound('arpeggio'))
    await vi.waitFor(() => expect(view.status.value).toBe('ready'))

    expect(view.diagram.value?.names.en).toBe('A minor')
    expect(view.played.value?.playback_id).toBe('arpeggio')
    expect(view.soundTempo.value).toBe(60)
    expect(view.tempo.value).toBe(60)
  })

  it('takes the tempo the exercise sets over the playback’s', async () => {
    serve()
    const view = setup(sound('strum', { playback: { playback_id: 'strum', direction: 'as_authored', loop: false, tempo_bpm: 100 } }))
    await vi.waitFor(() => expect(view.status.value).toBe('ready'))
    expect(view.soundTempo.value).toBe(100)
  })

  it('is missing, failed to load, when the diagram can’t be loaded', async () => {
    serve({ diagrams: [] })
    const view = setup(sound('strum'))
    await vi.waitFor(() => expect(view.status.value).toBe('missing'))
    expect(view.missing.value).toBe('failed_to_load')
  })

  it('is missing, failed to load, when its voice can’t be loaded', async () => {
    serve({ voices: false })
    const view = setup(sound('strum'))
    await vi.waitFor(() => expect(view.status.value).toBe('missing'))
    expect(view.missing.value).toBe('failed_to_load')
  })

  it('is missing, failed to load, when a recording of its voice can’t be fetched', async () => {
    serve()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))))
    const view = setup(sound('strum'))
    await vi.waitFor(() => expect(view.status.value).toBe('missing'))
    expect(view.missing.value).toBe('failed_to_load')
  })

  it('is missing, unavailable, when the diagram can’t be played here', async () => {
    serve({ instrumentFamily: 'keyboard' })
    const view = setup(sound('strum'))
    await vi.waitFor(() => expect(view.status.value).toBe('missing'))
    expect(view.missing.value).toBe('unavailable')
  })

  it('is missing, failed to load, when Play can’t load the sound', async () => {
    serve()
    const view = setup(sound('strum'))
    await vi.waitFor(() => expect(view.status.value).toBe('ready'))
    audio.failLoad = true

    view.toggle()

    await vi.waitFor(() => expect(view.missing.value).toBe('failed_to_load'))
  })
})
