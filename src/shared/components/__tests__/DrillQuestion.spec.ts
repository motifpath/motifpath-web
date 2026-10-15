import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

const sound = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }))

vi.mock('@/shared/composables/useProgressionPlayback', () => ({
  useProgressionPlayback: () => sound.current,
}))

import DrillQuestion from '@/shared/components/DrillQuestion.vue'
import type { DrillChord, DrillQuestionView } from '@/shared/components/DrillQuestion.vue'
import { drillBass, drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { DrillChordSymbol } from '@/shared/testUtils/drill'

const chord = (symbol: DrillChordSymbol): DrillChord => ({ symbol, ...drillVoicings[symbol] })
const text = (...values: string[]) => values.map((value) => ({ value, label: value }))

function fakePlayback() {
  const state = ref<'idle' | 'loading' | 'playing' | 'error'>('idle')
  return { state, status: computed(() => 'ready'), currentBar: ref<number | null>(null), tempo: ref(72), toggle: vi.fn(), stop: vi.fn() }
}

let fake: ReturnType<typeof fakePlayback>
let wrapper: ReturnType<typeof mountQuestion> | null = null

beforeEach(() => {
  fake = fakePlayback()
  sound.current = fake
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountQuestion(view: DrillQuestionView, instrument = view.instrument === 'bass' ? drillBass : drillGuitar) {
  const mounted = mount(DrillQuestion, {
    props: { view, instrument, reveal: null, choice: null, 'onUpdate:choice': (value: string | null) => mounted.setProps({ choice: value }) },
    attachTo: document.body,
  })
  wrapper = mounted
  return mounted
}

const words = (question: ReturnType<typeof mountQuestion>) => question.text().split(/\s+/)
const labelsOf = (question: ReturnType<typeof mountQuestion>) => question.findAll('[aria-label]').map((node) => node.attributes('aria-label'))

describe('DrillQuestion', () => {
  it('asks for a chord among unnamed boxes on guitar, with the context it was given', () => {
    const question = mountQuestion({
      way: 'numeral_to_chord',
      instrument: 'guitar',
      context: 'All four are chords of G major.',
      options: (['C', 'Em', 'Am', 'D'] as const).map((symbol) => ({ value: symbol, label: symbol, chord: chord(symbol) })),
    })

    expect(question.text()).toContain('All four are chords of G major.')
    expect(question.findAll('svg')).toHaveLength(4)
    for (const symbol of ['C', 'Em', 'Am', 'D']) expect(words(question)).not.toContain(symbol)
  })

  it('answers with the way it asked, the options as shown and the one picked', async () => {
    const question = mountQuestion({ way: 'chord_to_numeral', instrument: 'guitar', chord: chord('Em'), options: text('ii', 'iii', 'IV', 'vi') })

    await question.findAll('button')[1]!.trigger('click')
    expect(question.emitted('answer')).toEqual([[{ way: 'chord_to_numeral', options: ['ii', 'iii', 'IV', 'vi'], choice: 'iii' }]])
  })

  it('shows the chord asked about as a box on guitar, never by name', () => {
    const question = mountQuestion({ way: 'chord_to_numeral', instrument: 'guitar', chord: chord('Bm'), options: text('ii', 'iii', 'V', 'vi') })

    expect(question.get('[data-test="drill-stimulus"] svg').attributes('aria-label')).toBe('The chord')
    expect(words(question)).not.toContain('Bm')
    expect(labelsOf(question).join(' ')).not.toMatch(/\bBm\b/)
  })

  it('writes the chord asked about as a symbol on bass', () => {
    const question = mountQuestion({ way: 'chord_to_numeral', instrument: 'bass', chord: chord('Bm'), options: text('ii', 'iii', 'V', 'vi') })

    expect(question.get('[data-test="drill-stimulus"]').text()).toBe('Bm')
    expect(question.find('svg').exists()).toBe(false)
  })

  it('offers chords as symbols on bass', () => {
    const question = mountQuestion({
      way: 'function_to_chord',
      instrument: 'bass',
      options: (['G', 'C', 'A7', 'Em'] as const).map((symbol) => ({ value: symbol, label: symbol, chord: chord(symbol) })),
    })

    expect(question.findAll('[data-test="option-label"]').map((label) => label.text())).toEqual(['G', 'C', 'A7', 'Em'])
  })

  it('reads a chart as boxes on guitar and as cifra on bass', () => {
    const view: DrillQuestionView = { way: 'chart_to_numbers', instrument: 'guitar', chart: (['C', 'G', 'Am', 'F'] as const).map(chord), options: text('I-V-vi-IV', 'I-vi-IV-V') }

    expect(mountQuestion(view).findAll('[data-test="drill-stimulus"] svg')).toHaveLength(4)
    wrapper?.unmount()
    expect(mountQuestion({ ...view, instrument: 'bass' }).findAll('[data-test="drill-stimulus"] li').map((bar) => bar.text())).toEqual(['C', 'G', 'Am', 'F'])
  })

  it('plays what a hear drill asks before its options, and says when it sounds', async () => {
    const question = mountQuestion({
      way: 'cadence_then_chord',
      instrument: 'guitar',
      progression: {
        source: { chords: (['C', 'F', 'G', 'C', 'Am'] as const).map((symbol) => drillVoicings[symbol].diagram), chordInstrument: drillGuitar, bass: null, tempoBpm: 72 },
        bars: ['I', 'IV', 'V', 'I', null],
        subtitle: 'A cadence sets the key, then the chord',
      },
      options: text('ii', 'IV', 'V', 'vi'),
    })

    expect(question.findAll('[data-test="bar-cell"]').map((bar) => bar.text())).toEqual(['I', 'IV', 'V', 'I', '?'])
    fake.state.value = 'playing'
    await question.vm.$nextTick()
    expect(question.emitted('playing')).toEqual([[true]])
  })

  it('takes answers again on the next question after a sound that couldn’t be heard', async () => {
    const hear: DrillQuestionView = {
      way: 'progression_by_number',
      instrument: 'guitar',
      progression: {
        source: { chords: (['G', 'D', 'Em', 'C'] as const).map((symbol) => drillVoicings[symbol].diagram), chordInstrument: drillGuitar, bass: null, tempoBpm: 72 },
        bars: [null, null, null, null],
        subtitle: 'Four chords',
      },
      options: text('I-V-vi-IV', 'I-vi-IV-V'),
    }
    const question = mountQuestion(hear)
    question.findComponent({ name: 'ProgressionPlayer' }).vm.$emit('missing', 'failed_to_load')
    await question.vm.$nextTick()
    expect(question.findAll('button[data-state="locked"]')).toHaveLength(2)

    await question.setProps({ view: { ...hear, options: text('vi-IV-I-V', 'I-IV-vi-V') } })
    expect(question.findAll('button[data-state="default"]')).toHaveLength(2)
  })

  it('takes answers again once a retry of a sound that couldn’t be heard plays', async () => {
    const question = mountQuestion({
      way: 'progression_by_number',
      instrument: 'guitar',
      progression: {
        source: { chords: (['G', 'D', 'Em', 'C'] as const).map((symbol) => drillVoicings[symbol].diagram), chordInstrument: drillGuitar, bass: null, tempoBpm: 72 },
        bars: [null, null, null, null],
        subtitle: 'Four chords',
      },
      options: text('I-V-vi-IV', 'I-vi-IV-V'),
    })
    const player = question.findComponent({ name: 'ProgressionPlayer' })
    player.vm.$emit('missing', 'failed_to_load')
    await question.vm.$nextTick()
    expect(question.findAll('button[data-state="locked"]')).toHaveLength(2)

    player.vm.$emit('playing', true)
    await question.vm.$nextTick()
    expect(question.findAll('button[data-state="default"]')).toHaveLength(2)
  })

  it('holds its options and says the question can’t be shown when a box it must draw has no voicing', () => {
    const question = mountQuestion({ way: 'chord_to_numeral', instrument: 'guitar', chord: { symbol: 'Bm' }, options: text('ii', 'iii', 'V', 'vi') })

    expect(question.emitted('missing')).toEqual([['unavailable']])
    expect(words(question)).not.toContain('Bm')
    expect(question.findAll('button').every((option) => option.attributes('data-state') === 'locked')).toBe(true)
  })
})
