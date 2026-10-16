import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import SessionGeneratedChoice from '@/features/student/components/SessionGeneratedChoice.vue'
import type { GradedGeneratedAnswer } from '@/features/student/composables/usePracticeSessionRun'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { clearProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { drillVoicings } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

const opts = (...values: string[]) => values.map((value) => ({ value, name: null, chart: [] }))

const BLANK = { numeral: null, chord: null, function: null, progression: null, chart: [], voicings: [] }

const bassNumeral: Item = {
  item_key: 'diatonic_chord:G:vi',
  kind: 'diatonic_chord',
  rung: 'know',
  reason: 'new',
  node_id: null,
  level: 'new',
  estimated_seconds: 8,
  generated_choice: { ...BLANK, way: 'numeral_to_chord', music_key: 'G', numeral: 'vi', drawn_as: 'chord_symbols', options: opts('Em', 'D', 'F#dim', 'C') },
}

const guitarNumeral: Item = {
  ...bassNumeral,
  generated_choice: {
    ...bassNumeral.generated_choice!,
    drawn_as: 'chord_boxes',
    options: opts('Em', 'D', 'Am', 'C'),
    voicings: (['Em', 'D', 'Am', 'C'] as const).map((chord) => ({ chord, diagram_id: drillVoicings[chord].diagram.diagram_id })),
  },
}

let wrapper: ReturnType<typeof mountQuestion> | null = null

function mountQuestion(item: Item, answer: GradedGeneratedAnswer | null = null) {
  const mounted = mount(SessionGeneratedChoice, { props: { item, answer }, attachTo: document.body })
  wrapper = mounted
  return mounted
}

const options = (question: ReturnType<typeof mountQuestion>) => question.findAll('[data-test="drill-options"] button')

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  GET.mockReset()
  clearEmbeddedDiagramCache()
  clearProgressionCatalog()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('SessionGeneratedChoice', () => {
  it('asks the question with why it was picked, its options unmarked', () => {
    const question = mountQuestion(bassNumeral)

    expect(question.get('[data-test="item-reason"]').text()).toBe('New')
    expect(question.get('[data-test="question-prompt"]').text()).toBe('In G, which chord is vi?')
    expect(question.text()).toContain('All four are chords of G major.')
    expect(options(question).map((option) => option.attributes('data-state'))).toEqual(['default', 'default', 'default', 'default'])
  })

  it('answers with the way it asked, the options as shown and the pick, and how to grade it', async () => {
    const question = mountQuestion(bassNumeral)

    await options(question)[1]!.trigger('click')

    expect(question.emitted('answer')).toEqual([
      [{ way: 'numeral_to_chord', options: ['Em', 'D', 'F#dim', 'C'], choice: 'D' }, { question: { way: 'numeral_to_chord', key: 'G', numeral: 'vi' }, catalog: {} }],
    ])
  })

  it('once answered wrong, marks the right option beside the pick, and moves on when asked', async () => {
    const question = mountQuestion(bassNumeral, { choice: 'D', right: 'Em', correct: false })

    expect(options(question).map((option) => option.attributes('data-state'))).toEqual(['right', 'wrong', 'locked', 'locked'])
    expect(question.get('[data-test="answer-feedback"]').text()).toContain('Not quite')
    await question.get('[data-test="next-item"]').trigger('click')
    expect(question.emitted('next')).toHaveLength(1)
  })

  it('waits while a guitar question loads its boxes', () => {
    GET.mockImplementation(() => new Promise(() => {}))
    const question = mountQuestion(guitarNumeral)

    expect(question.find('[data-test="question-loading"]').exists()).toBe(true)
    expect(options(question)).toHaveLength(0)
  })

  it('lets the student skip a question it can not show, never counting it against them', async () => {
    GET.mockImplementation(() => fail())
    const question = mountQuestion(guitarNumeral)
    await flushPromises()

    expect(question.text()).toContain('can’t be shown right now')
    await question.get('[data-test="skip-question"]').trigger('click')
    expect(question.emitted('skip')).toEqual([['unavailable']])
  })
})
