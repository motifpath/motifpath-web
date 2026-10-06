import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import DiagramRefControls from '@/features/teacher/components/DiagramRefControls.vue'
import { useDiagramEmbedDraft } from '@/features/teacher/composables/useDiagramEmbedDraft'
import DiagramPlayer from '@/shared/components/diagram/DiagramPlayer.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { clearVoiceCache } from '@/shared/composables/useListVoices'
import { makeFrettedDiagram, makeFrettedInstrument, makePlayback, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Voice = components['schemas']['Voice']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })

const voice = (voice_id: string, en: string, family: Voice['family']): Voice => ({
  voice_id,
  names: { en },
  languages: ['en'],
  family,
  samples: [],
  attribution: '',
})
const VOICES = [
  voice('acoustic-guitar', 'Acoustic guitar', 'fretted'),
  voice('electric-guitar', 'Electric guitar', 'fretted'),
  voice('piano', 'Piano', 'keyboard'),
]

const guitar = makeFrettedInstrument()
const playable = makeSequencedFrettedDiagram()

function mountControls(diagram: Diagram, initial: DiagramRef | null = null) {
  const draft = useDiagramEmbedDraft(initial)
  draft.select(diagram)
  const wrapper = mount(DiagramRefControls, { props: { diagram, instrument: guitar, draft } })
  return { wrapper, draft }
}

beforeEach(() => {
  GET.mockReset()
  clearVoiceCache()
  GET.mockImplementation((path: string) => (path === '/voices' ? ok(VOICES) : ok([])))
})

describe('DiagramRefControls playback', () => {
  it('shows no playback settings for a diagram without playbacks', async () => {
    const { wrapper } = mountControls(makeFrettedDiagram())
    await flushPromises()

    expect(wrapper.find('[data-test="embed-picker-playback"]').exists()).toBe(false)
    expect(wrapper.findComponent(DiagramPlayer).exists()).toBe(false)
  })

  it('offers Play by default, and hides the settings once it is turned off', async () => {
    const { wrapper, draft } = mountControls(playable)
    await flushPromises()

    const offered = wrapper.get<HTMLInputElement>('[data-test="embed-picker-playback-offered"]')
    expect(offered.element.checked).toBe(true)
    expect(wrapper.find('[data-test="embed-picker-playback-tempo"]').exists()).toBe(true)

    await offered.setValue(false)

    expect(draft.toRef()?.playback).toBeNull()
    expect(wrapper.find('[data-test="embed-picker-playback-tempo"]').exists()).toBe(false)
  })

  it('shows the playback’s own tempo as the placeholder, and writes an override or clears it', async () => {
    const { wrapper, draft } = mountControls(playable)
    await flushPromises()

    const tempo = wrapper.get<HTMLInputElement>('[data-test="embed-picker-playback-tempo"]')
    expect(tempo.attributes('placeholder')).toBe('90')

    await tempo.setValue('120')
    expect(draft.toRef()?.playback?.tempo_bpm).toBe(120)

    await tempo.setValue('')
    expect(draft.toRef()?.playback?.tempo_bpm).toBeNull()
  })

  it('offers no playback choice for a diagram with only one', async () => {
    const { wrapper } = mountControls(playable)
    await flushPromises()

    expect(wrapper.find('[data-test="embed-picker-playback-choice"]').exists()).toBe(false)
  })

  it('chooses one of several playbacks, the default first, and shows its tempo as the placeholder', async () => {
    const diagram = makeFrettedDiagram({
      playbacks: [
        makePlayback({ playback_id: 'pb-strum', names: { en: 'Strum' }, tempo_bpm: 60 }),
        makePlayback({ playback_id: 'pb-arpeggio', names: { en: 'Arpeggio' }, tempo_bpm: 120 }),
      ],
      default_playback_id: 'pb-strum',
    })
    const { wrapper, draft } = mountControls(diagram)
    await flushPromises()

    const choice = wrapper.get<HTMLSelectElement>('[data-test="embed-picker-playback-choice"]')
    expect(choice.findAll('option').map((o) => o.text())).toEqual(['Default (Strum)', 'Strum', 'Arpeggio'])
    expect(wrapper.get('[data-test="embed-picker-playback-tempo"]').attributes('placeholder')).toBe('60')

    await choice.setValue('pb-arpeggio')

    expect(draft.toRef()?.playback?.playback_id).toBe('pb-arpeggio')
    expect(wrapper.get('[data-test="embed-picker-playback-tempo"]').attributes('placeholder')).toBe('120')

    await choice.setValue('')
    expect(draft.toRef()?.playback?.playback_id).toBeNull()
  })

  it('flags a tempo outside the allowed range', async () => {
    const { wrapper } = mountControls(playable)
    await flushPromises()

    await wrapper.get('[data-test="embed-picker-playback-tempo"]').setValue('500')

    expect(wrapper.find('[data-test="embed-picker-playback-tempo-error"]').exists()).toBe(true)
  })

  it('offers only voices of the instrument’s family, the default first', async () => {
    const { wrapper, draft } = mountControls(playable)
    await flushPromises()

    const select = wrapper.get<HTMLSelectElement>('[data-test="embed-picker-playback-voice"]')
    const options = select.findAll('option')
    expect(options.map((o) => o.element.value)).toEqual(['', 'acoustic-guitar', 'electric-guitar'])
    expect(options[0]!.text()).toContain('Acoustic guitar')

    await select.setValue('electric-guitar')
    expect(draft.toRef()?.playback?.voice_id).toBe('electric-guitar')

    await select.setValue('')
    expect(draft.toRef()?.playback?.voice_id).toBeNull()
  })

  it('says when the voices couldn’t load, and lists them after a retry', async () => {
    GET.mockImplementation(() => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } }))
    const { wrapper } = mountControls(playable)
    await flushPromises()

    const error = wrapper.get('[data-test="embed-picker-playback-voices-error"]')
    GET.mockImplementation((path: string) => (path === '/voices' ? ok(VOICES) : ok([])))
    await error.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="embed-picker-playback-voices-error"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="embed-picker-playback-voice"]').findAll('option')).toHaveLength(3)
  })

  it('writes the direction and loop', async () => {
    const { wrapper, draft } = mountControls(playable)
    await flushPromises()

    await wrapper.get('[data-test="embed-picker-playback-direction"]').setValue('reversed')
    await wrapper.get('[data-test="embed-picker-playback-loop"]').setValue(true)

    expect(draft.toRef()?.playback).toEqual(expect.objectContaining({ direction: 'reversed', loop: true }))
  })

  it('previews the sound with these settings, lighting up the markers it plays', async () => {
    const { wrapper } = mountControls(playable, {
      diagram_id: playable.diagram_id,
      layers: {},
      playback: { tempo_bpm: 60, voice_id: null, direction: 'reversed', loop: true },
    })
    await flushPromises()

    const player = wrapper.getComponent(DiagramPlayer)
    expect(player.props('playback')).toEqual({ playback_id: null, tempo_bpm: 60, voice_id: null, direction: 'reversed', loop: true })

    player.vm.$emit('active', ['p1'])
    await flushPromises()
    expect(wrapper.getComponent(FrettedDiagramView).props('activePositionIds')).toEqual(['p1'])
  })
})
