import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SessionExercise from '@/features/student/components/SessionExercise.vue'
import { makeDiagramRef } from '@/shared/testUtils/diagram'
import ExerciseView from '@/shared/components/ExerciseView.vue'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import { mockViewport } from '@/shared/testUtils/viewport'
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

const sounds: Item = {
  ...item('ex-3', [
    { option_id: 's1', is_correct: false, label: 'Lick A', audio_url: 'https://media.test/a.mp3' },
    { option_id: 's2', is_correct: true, label: 'Lick B', audio_url: 'https://media.test/b.mp3' },
    { option_id: 's3', is_correct: false, label: 'Lick C', audio_url: 'https://media.test/c.mp3' },
  ]),
}
sounds.exercise = { ...sounds.exercise!, exercise_type: 'audio_selection' }

const listening: Item = { ...oneCorrect, item_key: 'exercise:ex-4' }
listening.exercise = { ...oneCorrect.exercise!, exercise_id: 'ex-4', exercise_type: 'audio_recognition', audio_url: 'https://media.test/third.mp3' }

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

  it('hands a diagram stack stimulus over, free to leave the text column', () => {
    const base = item('stacked', [{ option_id: 'cell', is_correct: true, fret_cell: { string: 1, fret: 5 } }])
    const stack = { stack: [makeDiagramRef(), makeDiagramRef({ diagram_id: 'diagram-2' })] }
    const stacked: Item = { ...base, exercise: { ...base.exercise!, exercise_type: 'image_recognition', diagram_stack_ref: stack } }

    const view = mountExercise({ item: stacked }).getComponent(ExerciseView)

    expect(view.props('diagramStackRef')).toEqual(stack)
    expect(view.props('breakout')).toBe(true)
  })

  it('is titled by the exercise’s title', () => {
    expect(mountExercise({ item: oneCorrect }).get('[data-test="item-title"]').text()).toBe('Name the interval')
  })

  it('shows why the exercise was picked, its prompt and its options', () => {
    const wrapper = mountExercise({ item: oneCorrect })

    expect(wrapper.get('[data-test="item-reason"]').text()).toBe('Due for review')
    expect(wrapper.text()).toContain('Which interval is this?')
    expect(wrapper.findAll('[data-test="exercise-option"] [data-test="option-label"]').map((candidate) => candidate.text())).toEqual(['Minor third', 'Major third'])
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

  describe('with several right options, saying how many', () => {
    it('ends the prompt with how many to choose', () => {
      expect(mountExercise({ item: twoCorrect }).get('[data-test="choose-count"]').text()).toBe('Choose 2')
    })

    it('says nothing about how many with one right option', () => {
      expect(mountExercise({ item: oneCorrect }).find('[data-test="choose-count"]').exists()).toBe(false)
    })
  })

  describe('with sound options', () => {
    beforeEach(() => {
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('waits for Check even with one right option', async () => {
      const wrapper = mountExercise({ item: sounds })

      await option(wrapper, 'Lick B').trigger('click')
      expect(option(wrapper, 'Lick B').attributes('data-selected')).toBe('true')
      expect(wrapper.emitted('answer')).toBeUndefined()

      await wrapper.get('[data-test="action-bar"] [data-test="check-answer"]').trigger('click')
      expect(wrapper.emitted('answer')).toEqual([[['s2']]])
    })

    it('chooses with a number key without committing', async () => {
      const wrapper = mountExercise({ item: sounds })

      press('3')
      await wrapper.vm.$nextTick()

      expect(option(wrapper, 'Lick C').attributes('data-selected')).toBe('true')
      expect(wrapper.emitted('answer')).toBeUndefined()
    })

    it('says when a clip starts and stops, so the answer can be timed from the last one heard', async () => {
      const wrapper = mountExercise({ item: sounds })

      await option(wrapper, 'Lick A').get('[data-test="option-play"]').trigger('click')
      await option(wrapper, 'Lick A').get('[data-test="option-play"]').trigger('click')

      expect(wrapper.emitted('playing')).toEqual([[true], [false]])
      expect(wrapper.emitted('answer')).toBeUndefined()
    })
  })

  describe('when its stimulus is missing', () => {
    const missing = async (wrapper: ReturnType<typeof mountExercise>, reason: 'failed_to_load' | 'unavailable') => {
      wrapper.getComponent(ExerciseView).vm.$emit('stimulusMissing', reason)
      await wrapper.vm.$nextTick()
    }
    const bar = (wrapper: ReturnType<typeof mountExercise>) => wrapper.get('[data-test="action-bar"]')

    it('offers no Skip while the stimulus is there', () => {
      expect(mountExercise({ item: listening }).find('[data-test="skip-item"]').exists()).toBe(false)
    })

    it('says the sound didn’t load in its place, and offers Try again first and Skip', async () => {
      const wrapper = mountExercise({ item: listening })
      await missing(wrapper, 'failed_to_load')

      const notice = wrapper.get('[data-test="inline-notice"]')
      expect(notice.attributes('data-tone')).toBe('error')
      expect(notice.text()).toBe('The sound didn’t load. You need to hear it to answer — try again, or skip it.')
      expect(bar(wrapper).get('[data-test="retry-stimulus"]').text()).toBe('Try again')
      expect(bar(wrapper).get('[data-test="retry-stimulus"]').attributes()).toHaveProperty('data-primary-action')
      expect(bar(wrapper).get('[data-test="skip-item"]').attributes()).not.toHaveProperty('data-primary-action')
    })

    it('takes no choice, by tap or key, while the sound is missing', async () => {
      const wrapper = mountExercise({ item: listening })
      await missing(wrapper, 'failed_to_load')

      await option(wrapper, 'Minor third').trigger('click')
      press('1')

      expect(wrapper.emitted('answer')).toBeUndefined()
    })

    it('loads the sound again on Try again', async () => {
      const wrapper = mountExercise({ item: listening })
      await missing(wrapper, 'failed_to_load')

      await bar(wrapper).get('[data-test="retry-stimulus"]').trigger('click')

      expect(wrapper.find('[data-test="inline-notice"]').exists()).toBe(false)
      expect(wrapper.getComponent(ExerciseView).props('stimulusMissing')).toBe(false)
    })

    it('skips as failed to load', async () => {
      const wrapper = mountExercise({ item: listening })
      await missing(wrapper, 'failed_to_load')

      await bar(wrapper).get('[data-test="skip-item"]').trigger('click')

      expect(wrapper.emitted('skip')).toEqual([['failed_to_load']])
    })

    it('says an exercise that can’t be shown here won’t count, with Skip as the only way on', async () => {
      const wrapper = mountExercise({ item: listening })
      await missing(wrapper, 'unavailable')

      const notice = wrapper.get('[data-test="inline-notice"]')
      expect(notice.attributes('data-tone')).toBe('unavailable')
      expect(notice.text()).toBe('This exercise can’t be shown right now. Skip it — it won’t count against you.')
      expect(bar(wrapper).find('[data-test="retry-stimulus"]').exists()).toBe(false)
      await bar(wrapper).get('[data-test="skip-item"][data-primary-action]').trigger('click')
      expect(wrapper.emitted('skip')).toEqual([['unavailable']])
    })

    it('keeps the feedback and Continue when the stimulus fails after the answer', async () => {
      const wrapper = mountExercise({ item: listening, answer: { optionIds: ['wrong'], correct: false } })
      await missing(wrapper, 'failed_to_load')

      expect(wrapper.find('[data-test="inline-notice"]').exists()).toBe(false)
      expect(bar(wrapper).find('[data-test="skip-item"]').exists()).toBe(false)
      expect(bar(wrapper).find('[data-test="next-item"]').exists()).toBe(true)
    })

    it('starts the next exercise with its stimulus expected', async () => {
      const wrapper = mountExercise({ item: listening })
      await missing(wrapper, 'failed_to_load')

      await wrapper.setProps({ item: oneCorrect })

      expect(wrapper.find('[data-test="inline-notice"]').exists()).toBe(false)
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

  it('puts an image to tap in its own pane on Expanded, its header beside it', () => {
    mockViewport(1280)
    const regions: Item = item('ex-9', [
      { option_id: 'bridge', is_correct: true, region: { x: 0.5, y: 0.5, width: 0.2, height: 0.2, shape: 'rectangle' } },
    ])
    regions.exercise = { ...regions.exercise!, exercise_type: 'image_recognition', image_url: 'https://media.test/guitar.png' }

    const wrapper = mount(SessionExercise, { props: { item: regions, answer: null } })

    expect(wrapper.get('[data-test="stimulus-pane"]').find('[data-test="exercise-stimulus-image"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="interaction-pane"]').find('[data-test="item-title"]').text()).toBe('Name the interval')
  })
})
