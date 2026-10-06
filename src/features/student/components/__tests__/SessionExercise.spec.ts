import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SessionExercise from '@/features/student/components/SessionExercise.vue'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']
type Exercise = NonNullable<Item['exercise']>

function item(exerciseId: string, options: Exercise['options'], reason: Item['reason'] = 'due'): Item {
  return {
    item_key: `exercise:${exerciseId}`,
    kind: 'exercise',
    reason,
    node_id: null,
    level: 'learning',
    estimated_seconds: 30,
    exercise: {
      exercise_id: exerciseId,
      title: 'Name the interval',
      prompt: plainTextPrompt('Which interval is this?'),
      exercise_type: 'text_response',
      options,
      challenge_ids: [],
      content_node_ids: [],
      skills: [],
      concepts: [],
      remediation_targets: [],
      languages: [{ code: 'en', name: 'English' }],
      instrument_ids: [],
      created_at: '2026-10-06T00:00:00Z',
    },
  }
}

const oneCorrect = item('ex-1', [
  { option_id: 'right', is_correct: true, label: 'Minor third' },
  { option_id: 'wrong', is_correct: false, label: 'Major third' },
])

const twoCorrect = item('ex-2', [
  { option_id: 'c', is_correct: true, label: 'C' },
  { option_id: 'd', is_correct: false, label: 'D' },
  { option_id: 'e', is_correct: true, label: 'E' },
])

function mountExercise(props: { item: Item; answer?: { optionIds: string[]; correct: boolean } | null }) {
  return mount(SessionExercise, { props: { answer: null, ...props } })
}

function option(wrapper: ReturnType<typeof mountExercise>, label: string) {
  const found = wrapper.findAll('[data-test="exercise-option"]').find((candidate) => candidate.text().includes(label))
  if (!found) throw new Error(`no option ${label}`)
  return found
}

describe('SessionExercise', () => {
  it('shows why the exercise was picked, its prompt and its options', () => {
    const wrapper = mountExercise({ item: oneCorrect })

    expect(wrapper.get('[data-test="item-reason"]').text()).toBe('Due for review')
    expect(wrapper.text()).toContain('Which interval is this?')
    expect(wrapper.findAll('[data-test="exercise-option"]').map((candidate) => candidate.text())).toEqual(['Minor third', 'Major third'])
  })

  it('checks the answer only once an option is chosen', async () => {
    const wrapper = mountExercise({ item: oneCorrect })
    expect(wrapper.get('[data-test="check-answer"]').attributes('disabled')).toBeDefined()

    await option(wrapper, 'Major third').trigger('click')
    await option(wrapper, 'Minor third').trigger('click')
    await wrapper.get('[data-test="check-answer"]').trigger('click')

    expect(wrapper.emitted('answer')).toEqual([[['right']]])
  })

  it('lets every correct option be chosen when there is more than one', async () => {
    const wrapper = mountExercise({ item: twoCorrect })

    await option(wrapper, 'C').trigger('click')
    await option(wrapper, 'E').trigger('click')
    await wrapper.get('[data-test="check-answer"]').trigger('click')

    expect(wrapper.emitted('answer')).toEqual([[['c', 'e']]])
  })

  it('says a right answer is right, and moves on when asked', async () => {
    const wrapper = mountExercise({ item: oneCorrect, answer: { optionIds: ['right'], correct: true } })

    expect(wrapper.get('[data-test="answer-feedback"]').text()).toBe('Right!')
    expect(wrapper.find('[data-test="check-answer"]').exists()).toBe(false)
    await wrapper.get('[data-test="next-item"]').trigger('click')

    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('says a wrong answer is wrong', () => {
    const wrapper = mountExercise({ item: oneCorrect, answer: { optionIds: ['wrong'], correct: false } })

    expect(wrapper.get('[data-test="answer-feedback"]').text()).toBe('Not quite.')
  })

  it('keeps the options answered with, and no longer takes a choice', () => {
    const wrapper = mountExercise({ item: oneCorrect, answer: { optionIds: ['wrong'], correct: false } })

    expect(wrapper.get('[data-test="exercise-options"]').attributes('inert')).toBeDefined()
    expect(option(wrapper, 'Major third').attributes('data-selected')).toBe('true')
    expect(option(wrapper, 'Minor third').attributes('data-selected')).toBe('false')
  })

  it('starts the next exercise with nothing chosen', async () => {
    const wrapper = mountExercise({ item: oneCorrect })
    await option(wrapper, 'Minor third').trigger('click')

    await wrapper.setProps({ item: twoCorrect })

    expect(wrapper.get('[data-test="check-answer"]').attributes('disabled')).toBeDefined()
  })
})
