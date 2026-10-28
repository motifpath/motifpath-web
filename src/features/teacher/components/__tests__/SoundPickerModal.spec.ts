import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({ useApi: () => ({ coreApi: { GET }, eventApi: {} }) }))

import SoundPickerModal from '@/features/teacher/components/SoundPickerModal.vue'
import { makeFrettedDiagram, makeFrettedInstrument, makePlayback } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

const strum = makePlayback({ playback_id: 'strum', names: { en: 'Strum down' } })
const aMinor = makeFrettedDiagram({ diagram_id: 'a-minor', names: { en: 'A minor triad' }, playbacks: [strum], default_playback_id: 'strum' })
const sound: DiagramRef = { diagram_id: 'a-minor', layers: { intervals: true }, playback: { playback_id: 'strum', direction: 'as_authored', loop: false } }

// The list and the settings have their own specs; here only what the modal hands them and does with their answers.
const stubs = {
  DiagramPickerList: { name: 'DiagramPickerList', props: { playable: Boolean, pickedDiagramId: String }, emits: ['select'], template: '<div data-test="diagram-list" />' },
  ChordVoicingPickerList: { name: 'ChordVoicingPickerList', props: ['pickedDiagramId'], emits: ['select'], template: '<div data-test="chord-list" />' },
  SoundSettings: { name: 'SoundSettings', props: ['diagram', 'instrument', 'initial'], emits: ['change'], template: '<div data-test="sound-settings" />' },
}

function mountModal(initial: DiagramRef | null = null) {
  return mount(SoundPickerModal, { props: { open: true, initial }, global: { stubs }, attachTo: document.body })
}

const footer = (test: string) => document.querySelector<HTMLButtonElement>(`[data-test="${test}"]`)

beforeEach(() => {
  document.body.innerHTML = ''
  GET.mockReset()
  GET.mockImplementation((path: string) => {
    if (path === '/instruments') return Promise.resolve({ data: [makeFrettedInstrument()], error: undefined, response: { status: 200 } })
    return Promise.resolve({ data: aMinor, error: undefined, response: { status: 200 } })
  })
})

describe('SoundPickerModal', () => {
  it('starts on the diagrams that can play, with the chord catalog a tab away', async () => {
    const wrapper = mountModal()
    await flushPromises()

    expect(document.querySelector('[data-test="sound-picker-title"]')?.textContent).toContain('Sound from a diagram')
    expect(wrapper.getComponent({ name: 'DiagramPickerList' }).props('playable')).toBe(true)
    expect(footer('sound-picker-use')).toBeNull()

    document.querySelector<HTMLButtonElement>('[data-test="sound-picker-source-chords"]')!.click()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ChordVoicingPickerList' }).exists()).toBe(true)
  })

  it('sets how a picked diagram plays, then uses the sound', async () => {
    const wrapper = mountModal()
    await flushPromises()

    wrapper.getComponent({ name: 'DiagramPickerList' }).vm.$emit('select', aMinor)
    await flushPromises()
    const settings = wrapper.getComponent({ name: 'SoundSettings' })
    expect(settings.props()).toMatchObject({ diagram: aMinor, initial: null })

    settings.vm.$emit('change', sound)
    await flushPromises()
    footer('sound-picker-use')!.click()

    expect(wrapper.emitted('apply')).toEqual([[sound]])
  })

  it('can’t use a sound the settings can’t play', async () => {
    const wrapper = mountModal()
    await flushPromises()
    wrapper.getComponent({ name: 'DiagramPickerList' }).vm.$emit('select', aMinor)
    await flushPromises()

    wrapper.getComponent({ name: 'SoundSettings' }).vm.$emit('change', null)
    await flushPromises()

    expect(footer('sound-picker-use')!.disabled).toBe(true)
  })

  it('goes back to the list from the settings, with the pick marked', async () => {
    const wrapper = mountModal()
    await flushPromises()
    wrapper.getComponent({ name: 'DiagramPickerList' }).vm.$emit('select', aMinor)
    await flushPromises()

    document.querySelector<HTMLButtonElement>('[data-test="sound-picker-change"]')!.click()
    await flushPromises()

    expect(wrapper.getComponent({ name: 'DiagramPickerList' }).props('pickedDiagramId')).toBe('a-minor')
  })

  it('opens a sound being edited on its settings', async () => {
    const wrapper = mountModal(sound)
    await flushPromises()

    expect(wrapper.getComponent({ name: 'SoundSettings' }).props()).toMatchObject({ diagram: aMinor, initial: sound })
  })

  it('closes on Cancel without a sound', async () => {
    const wrapper = mountModal()
    await flushPromises()
    footer('sound-picker-cancel')!.click()
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('apply')).toBeUndefined()
  })

  it('on a phone fills the screen with its × below the status bar and its foot above the home indicator', () => {
    mountModal()

    expect([...document.querySelector('[data-test="modal-panel"]')!.classList]).toEqual(
      expect.arrayContaining(['fixed', 'inset-0', 'pt-safe-top-4', 'pb-safe-4', 'sm:static']),
    )
  })
})
