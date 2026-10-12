import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref } from 'vue'

import type { ReviewEntry } from '@/features/student/composables/usePracticeSession'
import { makeDiagramRef } from '@/shared/testUtils/diagram'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'
import type * as VueRouter from 'vue-router'

type Exercise = components['schemas']['Exercise']

function exercise(id: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    exercise_id: id,
    title: `Exercise ${id}`,
    prompt: plainTextPrompt('Which inversion is shown?'),
    exercise_type: 'text_response',
    skills: [],
    concepts: [],
    options: [
      { option_id: 'o1', is_correct: false, label: 'Root position' },
      { option_id: 'o2', is_correct: true, label: 'First inversion' },
      { option_id: 'o3', is_correct: false, label: 'Second inversion' },
    ],
    challenge_ids: ['ch-1'],
    content_node_ids: [],
    remediation_targets: [],
    languages: [],
    instrument_ids: [],
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

const nine = Array.from({ length: 9 }, (_, i) => exercise(`ex-${i + 1}`))

const exercises = ref<Exercise[]>([])
const currentIndex = ref(0)
const currentAnswer = ref<{ optionIds: string[]; isCorrect: boolean } | null>(null)

const state = {
  status: ref<'loading' | 'error' | 'empty' | 'in-progress' | 'result'>('loading'),
  exercises,
  currentIndex,
  currentExercise: computed<Exercise | null>(() => exercises.value[currentIndex.value] ?? null),
  currentAnswer,
  isLastExercise: computed(() => currentIndex.value === exercises.value.length - 1),
  canAdvance: computed(() => currentAnswer.value !== null),
  score: ref({ correct: 0, total: 0 }),
  scorePercent: ref(0),
  scoreTier: ref<'success' | 'warning' | 'danger'>('success'),
  review: ref<ReviewEntry[]>([]),
  select: vi.fn(),
  next: vi.fn(),
  back: vi.fn(),
  retry: vi.fn(),
}

vi.mock('@/features/student/composables/usePracticeSession', () => ({
  usePracticeSession: () => state,
}))

const titles = { pathTitle: ref<string | null>('Blues Basics'), lessonTitle: ref<string | null>('Inversions of C major') }
vi.mock('@/features/student/composables/useLessonTitles', () => ({ useLessonTitles: () => titles }))

const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  resolve: vi.fn(() => ({ fullPath: '/nodes/node-1' })),
}
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRouter: () => router }
})

// The link has its own tests; here only where it appears and what it is given.
vi.mock('@/features/student/components/SendToTeacherLink.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'SendToTeacherLink',
      props: { reference: String, pathTitle: String, lessonTitle: String },
      setup: () => () => h('div', { 'data-test': 'send-to-teacher-link-stub' }),
    }),
  }
})

import ChallengeReview from '@/features/student/components/ChallengeReview.vue'
import HowToAnswer from '@/features/student/components/HowToAnswer.vue'
import PracticeView from '@/features/student/views/PracticeView.vue'
import ExerciseView from '@/shared/components/ExerciseView.vue'

enableAutoUnmount(afterEach)

function mountView() {
  return mount(PracticeView, { props: { nodeId: 'node-1' }, attachTo: document.body })
}

function inProgress(index = 0, answer: string[] | null = null, list: Exercise[] = nine) {
  state.status.value = 'in-progress'
  exercises.value = list
  currentIndex.value = index
  currentAnswer.value = answer ? { optionIds: answer, isCorrect: false } : null
}

function press(key: string) {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('PracticeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.status.value = 'loading'
    exercises.value = []
    currentIndex.value = 0
    currentAnswer.value = null
    state.review.value = []
    titles.lessonTitle.value = 'Inversions of C major'
    window.history.replaceState({}, '')
  })

  it('runs in the Practice Shell, its × going back to the lesson', () => {
    inProgress()
    const wrapper = mountView()

    expect(wrapper.find('[data-test="practice-shell"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="shell-exit"]').attributes('aria-label')).toBe('Back to lesson')
  })

  it('opens nothing as a dialog', async () => {
    inProgress()
    const wrapper = mountView()

    await wrapper.get('[data-test="how-to-answer-toggle"]').trigger('click')

    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  describe('states, in place', () => {
    it('shows a skeleton in the shell while the challenge loads, with × to leave', () => {
      const wrapper = mountView()

      expect(wrapper.find('[data-test="challenge-loading"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="shell-exit"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="shell-position"]').exists()).toBe(false)
    })

    it('says the challenge could not load, with Try again as the primary action', async () => {
      state.status.value = 'error'
      const wrapper = mountView()

      expect(wrapper.get('[data-test="inline-notice"]').text()).toContain("We couldn't load this challenge.")
      const retry = wrapper.get('[data-test="action-bar"] [data-primary-action]')
      expect(retry.text()).toBe('Try again')
      await retry.trigger('click')
      expect(state.retry).toHaveBeenCalled()
    })

    it('says a lesson has no challenge yet, with Back to lesson as the primary action', async () => {
      state.status.value = 'empty'
      const wrapper = mountView()

      expect(wrapper.text()).toContain("There's no challenge for this lesson yet.")
      const back = wrapper.get('[data-test="action-bar"] [data-primary-action]')
      expect(back.text()).toBe('Back to lesson')
      await back.trigger('click')
      expect(router.replace).toHaveBeenCalledWith({ name: 'node', params: { nodeId: 'node-1' } })
    })
  })

  describe('the run', () => {
    it('shows where the student is: "3 / 9" and 9 segments, those done filled', () => {
      inProgress(2)
      const wrapper = mountView()

      expect(wrapper.get('[data-test="shell-position"]').text()).toBe('3 / 9')
      const segments = wrapper.findAll('[data-test="session-segment"]').map((segment) => segment.attributes('data-filled'))
      expect(segments).toEqual(['100', '100', '0', '0', '0', '0', '0', '0', '0'])
    })

    it('names the lesson in the item header, tagged as a challenge', () => {
      inProgress()
      const wrapper = mountView()

      expect(wrapper.get('[data-test="item-title"]').text()).toBe('Inversions of C major')
      expect(wrapper.get('[data-test="item-reason"]').text()).toBe('Challenge')
    })

    it('names the exercise until the lesson title has loaded', () => {
      titles.lessonTitle.value = null
      inProgress()
      const wrapper = mountView()

      expect(wrapper.get('[data-test="item-title"]').text()).toBe('Exercise ex-1')
    })

    it('shows the exercise, letting a diagram break out and an image to tap take its own pane', () => {
      const diagramRef = makeDiagramRef({ diagram_id: 'd1' })
      inProgress(0, null, [exercise('ex-1', { exercise_type: 'image_recognition', diagram_ref: diagramRef })])
      const view = mountView().getComponent(ExerciseView)

      expect(view.props('exerciseType')).toBe('image_recognition')
      expect(view.props('diagramRef')).toEqual(diagramRef)
      expect(view.props('breakout')).toBe(true)
      expect(view.props('panes')).toBe(true)
    })

    it('plays a diagram sound with no board and nothing revealed, even once chosen, until the review', async () => {
      const aMinor = makeDiagramRef({ diagram_id: 'a-minor', playback: { playback_id: 'strum', direction: 'as_authored', loop: false } })
      inProgress(1, ['o1'], [exercise('ex-1'), exercise('ex-2', { exercise_type: 'audio_recognition', diagram_ref: aMinor })])
      const wrapper = mount(PracticeView, {
        props: { nodeId: 'node-1' },
        attachTo: document.body,
        global: {
          stubs: {
            ListenControl: { name: 'ListenControl', props: ['sound'], template: '<div data-test="listen-control" />' },
            WhatYouHeard: { template: '<div data-test="what-you-heard" />' },
          },
        },
      })

      expect(wrapper.getComponent({ name: 'ListenControl' }).props('sound')).toEqual(aMinor)
      expect(wrapper.find('[data-test="what-you-heard"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="embedded-diagram"]').exists()).toBe(false)
    })

    it('forwards a choice to the session, without revealing anything', async () => {
      inProgress(2)
      const wrapper = mountView()
      const view = wrapper.getComponent(ExerciseView)

      view.vm.$emit('update:selectedOptionIds', ['o2'])

      expect(state.select).toHaveBeenCalledWith(['o2'])
      expect(view.props('reveal')).toBeUndefined()
      expect(wrapper.text()).toContain('No answers are shown until the end.')
    })

    it('shows the choice already made when the student comes back to an exercise', () => {
      inProgress(2, ['o2'])

      expect(mountView().getComponent(ExerciseView).props('selectedOptionIds')).toEqual(['o2'])
    })

    it('says how many to choose when an exercise has several right options', () => {
      const several = exercise('ex-1', {
        options: [
          { option_id: 'a', is_correct: true, label: 'C' },
          { option_id: 'b', is_correct: true, label: 'E' },
          { option_id: 'c', is_correct: false, label: 'F' },
        ],
      })
      inProgress(0, null, [several])
      const view = mountView().getComponent(ExerciseView)

      expect(view.props('allowMultiple')).toBe(true)
      expect(view.props('chooseCount')).toBe(2)
    })

    it('offers How to answer for the exercise shown', () => {
      inProgress(0, null, [exercise('ex-1', { exercise_type: 'image_recognition', diagram_ref: makeDiagramRef({ diagram_id: 'd1' }) })])
      const help = mountView().getComponent(HowToAnswer)

      expect(help.props()).toMatchObject({ exerciseType: 'image_recognition', allowMultiple: false, diagramStimulus: true })
    })

    it('offers Send to your teacher under the options, never in the action bar', () => {
      inProgress(2)
      const wrapper = mountView()

      const link = wrapper.getComponent({ name: 'SendToTeacherLink' })
      expect(link.props()).toEqual({ reference: 'X-node-1/ex-3', pathTitle: 'Blues Basics', lessonTitle: 'Inversions of C major' })
      expect(wrapper.get('[data-test="action-bar"]').find('[data-test="send-to-teacher-link-stub"]').exists()).toBe(false)
    })
  })

  describe('moving through it', () => {
    it('waits for a choice before Next', () => {
      inProgress(2)
      const wrapper = mountView()

      expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeDefined()
    })

    it('moves on with Next once something is chosen', async () => {
      inProgress(2, ['o2'])
      const wrapper = mountView()

      const next = wrapper.get('[data-test="next"]')
      expect(next.text()).toBe('Next')
      await next.trigger('click')
      expect(state.next).toHaveBeenCalled()
    })

    it('reads "See result" on the last exercise', () => {
      inProgress(8, ['o2'])

      expect(mountView().get('[data-test="next"]').text()).toBe('See result')
    })

    it('offers Back from the second exercise on', async () => {
      inProgress(0)
      expect(mountView().find('[data-test="back"]').exists()).toBe(false)

      inProgress(2)
      const wrapper = mountView()
      await wrapper.get('[data-test="back"]').trigger('click')
      expect(state.back).toHaveBeenCalled()
    })

    it('chooses with number keys and moves on with Enter', async () => {
      inProgress(2)
      mountView()

      press('2')
      expect(state.select).toHaveBeenCalledWith(['o2'])

      currentAnswer.value = { optionIds: ['o2'], isCorrect: true }
      await nextTick()
      press('Enter')
      expect(state.next).toHaveBeenCalled()
    })
  })

  describe('the result', () => {
    beforeEach(() => {
      state.status.value = 'result'
      exercises.value = nine
      currentIndex.value = 8
      state.score.value = { correct: 7, total: 9 }
      state.scorePercent.value = 78
      state.scoreTier.value = 'success'
    })

    it('says the challenge is done, with the score and the lesson', () => {
      const wrapper = mountView()

      expect(wrapper.get('h1').text()).toBe('Challenge done')
      expect(wrapper.get('[data-test="result-summary"]').text()).toBe('7 of 9 correct')
      expect(wrapper.get('[data-test="result-percent"]').text()).toBe('78%')
      expect(wrapper.get('[data-test="result-percent"]').classes()).toContain('bg-success-muted')
      expect(wrapper.text()).toContain('Inversions of C major')
    })

    it('reviews every answer', () => {
      const entry: ReviewEntry = { exercise: nine[0]!, number: 1, chosen: [], missed: [] }
      state.review.value = [entry]

      expect(mountView().getComponent(ChallengeReview).props('entries')).toEqual([entry])
    })

    it('fills every progress segment', () => {
      const segments = mountView().findAll('[data-test="session-segment"]')

      expect(segments.every((segment) => segment.attributes('data-filled') === '100')).toBe(true)
    })

    it('finishes on My path', async () => {
      const wrapper = mountView()

      const finish = wrapper.get('[data-test="finish"]')
      expect(finish.attributes('data-primary-action')).toBeDefined()
      await finish.trigger('click')
      expect(router.push).toHaveBeenCalledWith({ name: 'path' })
    })

    it('goes back to the last exercise with Back', async () => {
      const wrapper = mountView()

      await wrapper.get('[data-test="back"]').trigger('click')

      expect(state.back).toHaveBeenCalled()
    })
  })

  describe('leaving', () => {
    it('goes back to the lesson it came from with ×, without asking', async () => {
      window.history.replaceState({ back: '/nodes/node-1' }, '')
      inProgress(2)
      const wrapper = mountView()

      await wrapper.get('[data-test="shell-exit"]').trigger('click')

      expect(router.back).toHaveBeenCalled()
      expect(router.replace).not.toHaveBeenCalled()
    })

    it('opens the lesson in its place when the run was opened from elsewhere', async () => {
      window.history.replaceState({ back: '/path' }, '')
      inProgress(2)
      const wrapper = mountView()

      await wrapper.get('[data-test="shell-exit"]').trigger('click')

      expect(router.replace).toHaveBeenCalledWith({ name: 'node', params: { nodeId: 'node-1' } })
      expect(router.back).not.toHaveBeenCalled()
    })

    it('leaves with Esc too', () => {
      inProgress(2)
      mountView()

      press('Escape')

      expect(router.replace).toHaveBeenCalledWith({ name: 'node', params: { nodeId: 'node-1' } })
    })
  })
})
