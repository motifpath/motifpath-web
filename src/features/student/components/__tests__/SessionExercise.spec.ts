import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SessionExercise from '@/features/student/components/SessionExercise.vue'
import ExerciseView from '@/shared/components/ExerciseView.vue'
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

let reducedMotion = false
function stubMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') && reducedMotion,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

type Answer = { optionIds: string[]; correct: boolean } | null

function mountExercise(props: { item: Item; answer?: Answer }) {
  return mount(SessionExercise, { props: { answer: null, ...props }, attachTo: document.body })
}

function option(wrapper: ReturnType<typeof mountExercise>, label: string) {
  const found = wrapper.findAll('[data-test="exercise-option"]').find((candidate) => candidate.text().includes(label))
  if (!found) throw new Error(`no option ${label}`)
  return found
}

function press(key: string) {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

enableAutoUnmount(afterEach)

describe('SessionExercise', () => {
  beforeEach(() => {
    reducedMotion = false
    stubMatchMedia()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is titled by the exercise’s title', () => {
    expect(mountExercise({ item: oneCorrect }).get('[data-test="item-title"]').text()).toBe('Name the interval')
  })

  it('shows why the exercise was picked, its prompt and its options', () => {
    const wrapper = mountExercise({ item: oneCorrect })

    expect(wrapper.get('[data-test="item-reason"]').text()).toBe('Due for review')
    expect(wrapper.text()).toContain('Which interval is this?')
    expect(wrapper.findAll('[data-test="exercise-option"]').map((candidate) => candidate.text())).toEqual(['Minor third', 'Major third'])
  })

  describe('with one right option', () => {
    it('answers with the tap: no Check step', async () => {
      const wrapper = mountExercise({ item: oneCorrect })
      expect(wrapper.find('[data-test="check-answer"]').exists()).toBe(false)

      await option(wrapper, 'Major third').trigger('click')

      expect(wrapper.emitted('answer')).toEqual([[['wrong']]])
    })

    it('answers with a number key, so a keyboard can answer too', () => {
      const wrapper = mountExercise({ item: oneCorrect })

      press('2')

      expect(wrapper.emitted('answer')).toEqual([[['wrong']]])
    })
  })

  describe('with several right options', () => {
    it('checks the answer only once an option is chosen, from the action bar', async () => {
      const wrapper = mountExercise({ item: twoCorrect })
      const check = () => wrapper.get('[data-test="action-bar"] [data-test="check-answer"]')
      expect(check().attributes('disabled')).toBeDefined()
      expect(check().attributes()).toHaveProperty('data-primary-action')

      await option(wrapper, 'C').trigger('click')
      press('3')
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('answer')).toBeUndefined()
      await check().trigger('click')

      expect(wrapper.emitted('answer')).toEqual([[['c', 'e']]])
    })
  })

  describe('a right answer', () => {
    const answered = { optionIds: ['right'], correct: true }

    it('says so with an icon and words, not colour alone', () => {
      const wrapper = mountExercise({ item: oneCorrect, answer: answered })

      const feedback = wrapper.get('[data-test="answer-feedback"]')
      expect(feedback.text()).toBe('Right!')
      expect(feedback.find('svg').exists()).toBe(true)
    })

    it('moves on by itself after a moment', () => {
      const wrapper = mountExercise({ item: oneCorrect, answer: answered })

      vi.advanceTimersByTime(899)
      expect(wrapper.emitted('next')).toBeUndefined()
      vi.advanceTimersByTime(1)
      expect(wrapper.emitted('next')).toHaveLength(1)
    })

    it('waits for Continue when the student asks for reduced motion', async () => {
      reducedMotion = true
      stubMatchMedia()
      const wrapper = mountExercise({ item: oneCorrect, answer: answered })

      vi.advanceTimersByTime(5000)
      expect(wrapper.emitted('next')).toBeUndefined()
      await wrapper.get('[data-test="next-item"]').trigger('click')
      expect(wrapper.emitted('next')).toHaveLength(1)
    })

    it('moves on once even when Continue is pressed before the moment passes', async () => {
      const wrapper = mountExercise({ item: oneCorrect, answer: answered })

      await wrapper.get('[data-test="next-item"]').trigger('click')
      vi.advanceTimersByTime(2000)

      expect(wrapper.emitted('next')).toHaveLength(1)
    })

    it('doesn’t move on after the exercise is gone', () => {
      const wrapper = mountExercise({ item: oneCorrect, answer: answered })
      const emitted = wrapper.emitted()

      wrapper.unmount()
      vi.advanceTimersByTime(2000)

      expect(emitted.next).toBeUndefined()
    })
  })

  describe('a wrong answer', () => {
    const answered = { optionIds: ['wrong'], correct: false }

    it('says so, and reveals the right option', () => {
      const wrapper = mountExercise({ item: oneCorrect, answer: answered })

      expect(wrapper.get('[data-test="answer-feedback"]').text()).toBe('Not quite.')
      expect(wrapper.getComponent(ExerciseView).props('reveal')).toEqual({ correctOptionIds: ['right'] })
      expect(option(wrapper, 'Minor third').attributes('data-mark')).toBe('right')
      expect(option(wrapper, 'Major third').attributes('data-mark')).toBe('wrong')
    })

    it('waits for Continue, so the student can see where the mistake was', async () => {
      const wrapper = mountExercise({ item: oneCorrect, answer: answered })

      vi.advanceTimersByTime(5000)
      expect(wrapper.emitted('next')).toBeUndefined()

      const next = wrapper.get('[data-test="action-bar"] [data-test="next-item"]')
      expect(next.attributes()).toHaveProperty('data-primary-action')
      await next.trigger('click')
      expect(wrapper.emitted('next')).toHaveLength(1)
    })
  })

  it('reveals nothing before the answer', () => {
    const wrapper = mountExercise({ item: oneCorrect })

    expect(wrapper.getComponent(ExerciseView).props('reveal')).toBeUndefined()
  })

  it('keeps the options answered with, and takes no more choices or keys', () => {
    const wrapper = mountExercise({ item: oneCorrect, answer: { optionIds: ['wrong'], correct: false } })

    press('1')

    expect(option(wrapper, 'Major third').attributes('data-selected')).toBe('true')
    expect(option(wrapper, 'Minor third').attributes('data-selected')).toBe('false')
    expect(wrapper.emitted('answer')).toBeUndefined()
  })

  it('starts the next exercise with nothing chosen', async () => {
    const wrapper = mountExercise({ item: twoCorrect })
    await option(wrapper, 'C').trigger('click')

    await wrapper.setProps({ item: oneCorrect })
    await wrapper.setProps({ item: twoCorrect })

    expect(wrapper.get('[data-test="check-answer"]').attributes('disabled')).toBeDefined()
  })

  it('stops listening for keys once it is gone', () => {
    const wrapper = mountExercise({ item: oneCorrect })
    const emitted = wrapper.emitted()
    wrapper.unmount()

    press('1')

    expect(emitted.answer).toBeUndefined()
  })
})
