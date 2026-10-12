import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as DiagramPlayback from '@/shared/composables/useDiagramPlayback'

const player = vi.hoisted(() => ({ source: null as null | (() => unknown), toggle: vi.fn() }))

vi.mock('@/shared/composables/useDiagramPlayback', async (importOriginal) => {
  const { ref: vueRef } = await import('vue')
  return {
    ...(await importOriginal<typeof DiagramPlayback>()),
    useDiagramPlayback: (source: () => unknown) => {
      player.source = source
      return { state: vueRef('idle'), activePositionIds: vueRef([]), tempo: vueRef(72), canPlay: vueRef(true), toggle: player.toggle, stop: vi.fn() }
    },
  }
})

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({ useApi: () => ({ coreApi: { GET }, eventApi: {} }) }))

import SoundSettings from '@/features/teacher/components/SoundSettings.vue'
import { clearVoiceCache } from '@/shared/composables/useListVoices'
import { makeFrettedDiagram, makeFrettedInstrument, makePlayback } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

// Strum: one whole note at 72 BPM in 4/4, 3.33 s; at 80 BPM, 3 s.
const strum = makePlayback({
  playback_id: 'strum',
  names: { en: 'Strum down' },
  tempo_bpm: 72,
  steps: [{ position_ids: ['p0'], value: { num: 1, den: 1 }, strum: 'down' }],
})
const arpeggio = makePlayback({ playback_id: 'arpeggio', names: { en: 'Arpeggio' }, tempo_bpm: 60 })
const aMinor = makeFrettedDiagram({ diagram_id: 'a-minor', names: { en: 'A minor triad' }, playbacks: [arpeggio, strum], default_playback_id: 'strum' })
const guitar = makeFrettedInstrument()

const stubs = { EmbeddedDiagram: { name: 'EmbeddedDiagram', props: ['embed', 'activePositionIds'], template: '<div data-test="embedded-diagram" />' } }

function mountSettings(initial: DiagramRef | null = null) {
  return mount(SoundSettings, { props: { diagram: aMinor, instrument: guitar, initial }, global: { stubs } })
}

const lastSound = (wrapper: ReturnType<typeof mountSettings>) => wrapper.emitted('change')?.at(-1)?.[0] as DiagramRef | null

beforeEach(() => {
  player.toggle.mockReset()
  clearVoiceCache()
  GET.mockResolvedValue({
    data: [
      { voice_id: 'acoustic-guitar', names: { en: 'Acoustic guitar' }, languages: ['en'], family: 'fretted', samples: [], attribution: '' },
      { voice_id: 'nylon-guitar', names: { en: 'Nylon guitar' }, languages: ['en'], family: 'fretted', samples: [], attribution: '' },
      { voice_id: 'piano', names: { en: 'Piano' }, languages: ['en'], family: 'keyboard', samples: [], attribution: '' },
    ],
    error: undefined,
    response: { status: 200 },
  })
})

describe('SoundSettings', () => {
  it('offers a playback, a tempo, a sound and a direction, and no loop', async () => {
    const wrapper = mountSettings()
    await flushPromises()

    for (const field of ['sound-playback', 'sound-tempo', 'sound-voice', 'sound-direction-as_authored', 'sound-direction-reversed']) {
      expect(wrapper.find(`[data-test="${field}"]`).exists(), field).toBe(true)
    }
    expect(wrapper.text()).not.toMatch(/loop/i)
    expect(wrapper.findAll('[data-test="sound-voice"] option').map((o) => o.text())).toEqual([
      'Instrument default',
      'Acoustic guitar',
      'Nylon guitar',
    ])
  })

  it('chooses the diagram’s default playback, and keeps the choice by its id', async () => {
    const wrapper = mountSettings()
    await flushPromises()

    expect((wrapper.get('[data-test="sound-playback"]').element as HTMLSelectElement).value).toBe('strum')
    expect(lastSound(wrapper)).toEqual({
      diagram_id: 'a-minor',
      layers: { intervals: true },
      playback: { playback_id: 'strum', direction: 'as_authored', loop: false },
    })
  })

  it('draws the board for the author, and says students won’t see it until they answer', async () => {
    const wrapper = mountSettings()
    await flushPromises()

    expect(wrapper.find('[data-test="embedded-diagram"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="sound-hidden-note"]').text()).toContain('without seeing the board')
  })

  it('shows the sound’s length at its tempo, and at a tempo set here', async () => {
    const wrapper = mountSettings()
    await flushPromises()
    expect(wrapper.get('[data-test="sound-length"]').text()).toBe('0:03')

    await wrapper.get('[data-test="sound-tempo"]').setValue('40')
    expect(wrapper.get('[data-test="sound-length"]').text()).toBe('0:06')
    expect(lastSound(wrapper)?.playback).toMatchObject({ playback_id: 'strum', tempo_bpm: 40 })
  })

  it('keeps another playback, sound and direction', async () => {
    const wrapper = mountSettings()
    await flushPromises()

    await wrapper.get('[data-test="sound-playback"]').setValue('arpeggio')
    await wrapper.get('[data-test="sound-voice"]').setValue('nylon-guitar')
    await wrapper.get('[data-test="sound-direction-reversed"]').trigger('click')

    expect(lastSound(wrapper)?.playback).toEqual({ playback_id: 'arpeggio', voice_id: 'nylon-guitar', direction: 'reversed', loop: false })
  })

  it('reports no sound while the tempo is outside 20–300 BPM, and says so', async () => {
    const wrapper = mountSettings()
    await flushPromises()

    await wrapper.get('[data-test="sound-tempo"]').setValue('500')

    expect(lastSound(wrapper)).toBeNull()
    expect(wrapper.find('[data-test="sound-tempo-invalid"]').exists()).toBe(true)
  })

  it('plays exactly what students hear when Hear it is tapped', async () => {
    const wrapper = mountSettings()
    await flushPromises()
    await wrapper.get('[data-test="sound-tempo"]').setValue('80')

    await wrapper.get('[data-test="sound-hear-it"]').trigger('click')

    expect(player.toggle).toHaveBeenCalledTimes(1)
    expect(player.source?.()).toMatchObject({ diagram: aMinor, playback: { playback_id: 'strum', tempo_bpm: 80, loop: false } })
  })

  it('opens a sound being edited as it was set', async () => {
    const wrapper = mountSettings({
      diagram_id: 'a-minor',
      layers: { intervals: true },
      playback: { playback_id: 'arpeggio', tempo_bpm: 90, voice_id: 'nylon-guitar', direction: 'reversed', loop: false },
    })
    await flushPromises()

    expect((wrapper.get('[data-test="sound-playback"]').element as HTMLSelectElement).value).toBe('arpeggio')
    expect((wrapper.get('[data-test="sound-tempo"]').element as HTMLInputElement).value).toBe('90')
    expect((wrapper.get('[data-test="sound-voice"]').element as HTMLSelectElement).value).toBe('nylon-guitar')
    expect(wrapper.get('[data-test="sound-direction-reversed"]').attributes('aria-pressed')).toBe('true')
  })
})
