import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

const sound = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }))

vi.mock('@/shared/composables/useProgressionPlayback', () => ({
  useProgressionPlayback: () => sound.current,
}))

import BarCell from '@/shared/components/BarCell.vue'
import ProgressionPlayer from '@/shared/components/ProgressionPlayer.vue'
import type { ProgressionSource } from '@/shared/composables/useProgressionPlayback'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'
import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'

const { C, F, G, Am } = drillVoicings

function fakePlayback() {
  const state = ref<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const voices = ref<'loading' | 'ready' | 'missing'>('ready')
  return {
    state,
    voices,
    status: computed(() => (state.value === 'error' ? 'missing' : voices.value)),
    currentBar: ref<number | null>(null),
    tempo: ref(72),
    noteValue: ref<TempoNoteValue>('quarters'),
    metronome: ref(false),
    toggle: vi.fn(),
    stop: vi.fn(),
  }
}

const CADENCE: ProgressionSource = { chords: [C, F, G, C, Am].map((chord) => chord.diagram), chordInstrument: drillGuitar, bass: null, tempoBpm: 72 }

let fake: ReturnType<typeof fakePlayback>

beforeEach(() => {
  fake = fakePlayback()
  sound.current = fake
})

function mountPlayer() {
  return mount(ProgressionPlayer, {
    props: { source: CADENCE, bars: ['I', 'IV', 'V', 'I', null], subtitle: 'A cadence sets the key, then the chord' },
    attachTo: document.body,
  })
}

const barTexts = (wrapper: ReturnType<typeof mountPlayer>) => wrapper.findAll('[data-test="bar-cell"]').map((bar) => bar.text())
const barPhases = (wrapper: ReturnType<typeof mountPlayer>) => wrapper.findAll('[data-test="bar-cell"]').map((bar) => bar.attributes('data-phase'))

describe('ProgressionPlayer', () => {
  it('shows Listen, what it plays, and a bar for each chord: the given ones by numeral, the asked one as “?”', () => {
    const wrapper = mountPlayer()

    expect(wrapper.text()).toContain('Listen')
    expect(wrapper.text()).toContain('A cadence sets the key, then the chord')
    expect(barTexts(wrapper)).toEqual(['I', 'IV', 'V', 'I', '?'])
  })

  it('never names the asked chord, even to a screen reader', () => {
    const wrapper = mountPlayer()

    const asked = wrapper.findAll('[data-test="bar-cell"]')[4]!
    expect(asked.attributes('aria-label')).toBe('Bar 5, the chord asked')
    expect(wrapper.html()).not.toMatch(/\bvi\b|Am\b/)
  })

  it('plays and stops with its button, as often as asked', async () => {
    const wrapper = mountPlayer()

    await wrapper.get('[data-test="progression-play"]').trigger('click')
    await wrapper.get('[data-test="progression-play"]').trigger('click')
    expect(fake.toggle).toHaveBeenCalledTimes(2)
  })

  it('follows the playing: bars before the one sounding are played, the rest to come', async () => {
    const wrapper = mountPlayer()
    expect(barPhases(wrapper)).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'])

    fake.state.value = 'playing'
    fake.currentBar.value = 2
    await wrapper.vm.$nextTick()
    expect(barPhases(wrapper)).toEqual(['played', 'played', 'current', 'upcoming', 'upcoming'])
    expect(wrapper.findAll('[data-test="bar-cell"]')[2]!.attributes('aria-current')).toBe('step')

    fake.currentBar.value = 4
    await wrapper.vm.$nextTick()
    expect(barTexts(wrapper)[4]).toBe('?')
  })

  it('says when its sound plays and stops, so an answer can be timed', async () => {
    const wrapper = mountPlayer()

    fake.state.value = 'playing'
    await wrapper.vm.$nextTick()
    fake.state.value = 'idle'
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('playing')).toEqual([[true], [false]])
  })

  it('says when its sound can’t be heard, so the options can wait for another try', async () => {
    const wrapper = mountPlayer()

    fake.voices.value = 'missing'
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('missing')).toEqual([['failed_to_load']])
  })

  it('shows the tempo it plays at, which the student can change', () => {
    expect(mountPlayer().text()).toContain('72')
  })

  it('plays at the tempo, note value and click its Tempo sheet sets', async () => {
    const wrapper = mountPlayer()

    const tempo = wrapper.findComponent({ name: 'ProgressionTempo' })
    tempo.vm.$emit('update:tempo', 90)
    tempo.vm.$emit('update:noteValue', 'eighths')
    tempo.vm.$emit('update:metronome', true)
    await wrapper.vm.$nextTick()

    expect([fake.tempo.value, fake.noteValue.value, fake.metronome.value]).toEqual([90, 'eighths', true])
  })
})

describe('BarCell', () => {
  it('shows a given chord by its label, and an asked one only as “?”', () => {
    expect(mount(BarCell, { props: { label: 'IV', position: 2, phase: 'played' } }).text()).toBe('IV')
    expect(mount(BarCell, { props: { label: null, position: 5, phase: 'current' } }).text()).toBe('?')
  })
})
