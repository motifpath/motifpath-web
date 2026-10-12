import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

const sound = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }))

vi.mock('@/shared/composables/useDiagramSound', () => ({
  useDiagramSound: () => sound.current,
}))

import ListenControl from '@/shared/components/ListenControl.vue'
import { makeDiagramRef, makeFrettedDiagram, makePlayback } from '@/shared/testUtils/diagram'

type MissingReason = 'failed_to_load' | 'unavailable'
type DiagramRef = components['schemas']['DiagramRef']

const strum = makePlayback({ playback_id: 'strum', names: { en: 'Strum', pt_BR: 'Batida' }, tempo_bpm: 72 })
const aMinor = makeFrettedDiagram({ diagram_id: 'a-minor', names: { en: 'A minor' }, playbacks: [strum] })

function fakeSound() {
  const state = ref<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const missing = ref<MissingReason | null>(null)
  return {
    state,
    missing,
    status: computed(() => (missing.value ? 'missing' : 'ready')),
    tempo: ref(72),
    soundTempo: computed(() => 72),
    played: computed(() => strum),
    diagram: ref(aMinor),
    canPlay: computed(() => true),
    toggle: vi.fn(),
    stop: vi.fn(),
  }
}

const SOUND: DiagramRef = makeDiagramRef({
  diagram_id: 'a-minor',
  playback: { playback_id: 'strum', direction: 'as_authored', loop: false },
})

let fake: ReturnType<typeof fakeSound>

beforeEach(() => {
  fake = fakeSound()
  sound.current = fake
})

const mountListen = () => mount(ListenControl, { props: { sound: SOUND }, attachTo: document.body })

describe('ListenControl', () => {
  it('shows Listen with the playback’s name and tempo, and never the diagram', () => {
    const wrapper = mountListen()

    expect(wrapper.text()).toContain('Listen')
    expect(wrapper.find('[data-test="listen-sound"]').text()).toBe('Strum · 72 BPM')
    expect(wrapper.text()).not.toContain('A minor')
    expect(wrapper.find('[data-test="embedded-diagram"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('plays the sound when Listen is tapped, and stops it when tapped again', async () => {
    const wrapper = mountListen()
    await wrapper.find('[data-test="listen-play"]').trigger('click')
    expect(fake.toggle).toHaveBeenCalledTimes(1)

    fake.state.value = 'playing'
    await flushPromises()
    expect(wrapper.find('[data-test="listen-play"]').attributes('aria-label')).toBe('Stop')
    wrapper.unmount()
  })

  it('lets the student slow the sound down from the tempo chip', async () => {
    const wrapper = mountListen()
    expect(wrapper.find('[data-test="diagram-tempo-toggle"]').text()).toBe('72')

    await wrapper.find('[data-test="diagram-tempo-toggle"]').trigger('click')
    const slider = document.querySelector<HTMLInputElement>('[data-test="diagram-tempo"]')!
    slider.value = '50'
    slider.dispatchEvent(new Event('input'))

    expect(fake.tempo.value).toBe(50)
    wrapper.unmount()
  })

  it('says when the sound starts and stops, so an answer is timed from the last sound heard', async () => {
    const wrapper = mountListen()
    fake.state.value = 'loading'
    await flushPromises()
    fake.state.value = 'playing'
    await flushPromises()
    fake.state.value = 'idle'
    await flushPromises()

    expect(wrapper.emitted('playing')).toEqual([[true], [false]])
    wrapper.unmount()
  })

  it.each<MissingReason>(['failed_to_load', 'unavailable'])('says the sound is missing (%s)', async (reason) => {
    const wrapper = mountListen()
    fake.missing.value = reason
    await flushPromises()

    expect(wrapper.emitted('missing')).toEqual([[reason]])
    wrapper.unmount()
  })
})
