import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref } from 'vue'

import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

const textExercise: Exercise = {
  exercise_id: 'ex-1',
  title: 't1',
  prompt: plainTextPrompt('Name this technique'),
  exercise_type: 'text_response',
  skills: [],
  concepts: [],
  options: [
    { option_id: 'o1', is_correct: true, label: 'Alternate picking' },
    { option_id: 'o2', is_correct: false, label: 'Legato' },
  ],
  challenge_ids: ['ch-1'],
  content_node_ids: [],
  remediation_targets: [],
  languages: [],
  created_at: '2026-09-01T00:00:00Z',
}

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
  select: vi.fn(),
  next: vi.fn(),
  back: vi.fn(),
  retry: vi.fn(),
}

vi.mock('@/features/student/composables/usePracticeSession', () => ({
  usePracticeSession: () => state,
}))

const titles = { pathTitle: ref<string | null>('Blues Basics'), lessonTitle: ref<string | null>('Shuffle in E') }
vi.mock('@/features/student/composables/useLessonTitles', () => ({ useLessonTitles: () => titles }))

// The button has its own tests; here only where it appears and what it is given.
vi.mock('@/features/student/components/SendToTeacher.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'SendToTeacher',
      props: { reference: String, pathTitle: String, lessonTitle: String },
      setup: () => () => h('div', { 'data-test': 'send-to-teacher-stub' }),
    }),
  }
})

import PracticeView from '@/features/student/views/PracticeView.vue'
import ExerciseView from '@/shared/components/ExerciseView.vue'
import PracticeHelpModal from '@/features/student/components/PracticeHelpModal.vue'

function mountView() {
  return mount(PracticeView, {
    props: { nodeId: 'node-1' },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

function set(next: Partial<typeof state>) {
  state.status.value = next.status?.value ?? 'loading'
  state.exercises.value = next.exercises?.value ?? []
  state.currentIndex.value = next.currentIndex?.value ?? 0
  state.currentAnswer.value = next.currentAnswer?.value ?? null
  state.score.value = next.score?.value ?? { correct: 0, total: 0 }
  state.scorePercent.value = next.scorePercent?.value ?? 0
  state.scoreTier.value = next.scoreTier?.value ?? 'success'
}

describe('PracticeView', () => {
  it('shows a loading state while the challenge/exercises request is in flight', () => {
    set({ status: ref('loading') })

    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)
  })

  it('shows an error state with a retry control on failure', async () => {
    set({ status: ref('error') })

    const wrapper = mountView()
    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(state.retry).toHaveBeenCalled()
  })

  it('shows an empty state when the node has no challenge', () => {
    set({ status: ref('empty') })

    expect(mountView().find('[data-test="practice-empty"]').exists()).toBe(true)
  })

  it('renders the current exercise via ExerciseView and forwards a selection to the session', async () => {
    set({ status: ref('in-progress'), exercises: ref([textExercise]) })

    const wrapper = mountView()
    expect(wrapper.text()).toContain('Name this technique')

    const rows = wrapper.findAll('[data-test="exercise-option"]')
    await rows[1]?.trigger('click')

    expect(state.select).toHaveBeenCalledWith(['o2'])
  })

  it("forwards the current exercise's stimulus image/audio URLs to ExerciseView", () => {
    const audioExercise: Exercise = {
      ...textExercise,
      exercise_id: 'ex-audio',
      exercise_type: 'audio_recognition',
      audio_url: 'https://x/clip.mp3',
    }
    set({ status: ref('in-progress'), exercises: ref([audioExercise]) })

    const wrapper = mountView()

    expect(wrapper.get('[data-test="exercise-audio-play"]').attributes('src')).toBe('https://x/clip.mp3')
  })

  it("forwards the current exercise's diagram stimulus to ExerciseView", () => {
    const diagramRef = { diagram_id: 'd1', layers: { intervals: false }, correct_intervals: ['R'] }
    const diagramExercise: Exercise = {
      ...textExercise,
      exercise_id: 'ex-diagram',
      exercise_type: 'image_recognition',
      diagram_ref: diagramRef,
      options: [{ option_id: 'o-p0', is_correct: true, diagram_id: 'd1', diagram_position_id: 'p0' }],
    }
    set({ status: ref('in-progress'), exercises: ref([diagramExercise]) })

    const wrapper = mountView()

    expect(wrapper.getComponent(ExerciseView).props('diagramRef')).toEqual(diagramRef)
  })

  it('tells the help modal whether the stimulus is a diagram', () => {
    const diagramExercise: Exercise = {
      ...textExercise,
      exercise_id: 'ex-diagram',
      exercise_type: 'image_recognition',
      diagram_ref: { diagram_id: 'd1', layers: { intervals: false }, correct_intervals: ['R'] },
      options: [{ option_id: 'o-p0', is_correct: true, diagram_id: 'd1', diagram_position_id: 'p0' }],
    }
    set({ status: ref('in-progress'), exercises: ref([diagramExercise]) })
    expect(mountView().getComponent(PracticeHelpModal).props('diagramStimulus')).toBe(true)

    set({ status: ref('in-progress'), exercises: ref([textExercise]) })
    expect(mountView().getComponent(PracticeHelpModal).props('diagramStimulus')).toBe(false)
  })

  it('tells ExerciseView to allow multiple selections only when the exercise has more than one correct option', () => {
    const multiCorrectExercise: Exercise = {
      ...textExercise,
      options: [
        { option_id: 'o1', is_correct: true, label: 'A' },
        { option_id: 'o2', is_correct: true, label: 'B' },
      ],
    }
    set({ status: ref('in-progress'), exercises: ref([multiCorrectExercise]) })

    const wrapper = mountView()

    expect(wrapper.get('[data-test="exercise-option-indicator"]').classes()).not.toContain('rounded-full')
  })

  it('reads "Next ›" on a non-final exercise and "See result" on the last one', () => {
    set({ status: ref('in-progress'), exercises: ref([textExercise, textExercise]), currentIndex: ref(0) })
    expect(mountView().get('[data-test="next"]').text()).toBe('Next ›')

    set({ status: ref('in-progress'), exercises: ref([textExercise, textExercise]), currentIndex: ref(1) })
    expect(mountView().get('[data-test="next"]').text()).toBe('See result')
  })

  it('calls next/back on the session when Next/Back are clicked', async () => {
    set({
      status: ref('in-progress'),
      exercises: ref([textExercise, textExercise]),
      currentIndex: ref(1),
      currentAnswer: ref({ optionIds: ['o1'], isCorrect: true }),
    })
    const wrapper = mountView()

    await wrapper.get('[data-test="next"]').trigger('click')
    expect(state.next).toHaveBeenCalled()

    await wrapper.get('[data-test="back"]').trigger('click')
    expect(state.back).toHaveBeenCalled()
  })

  it('disables Next until the current exercise has an answer', async () => {
    set({ status: ref('in-progress'), exercises: ref([textExercise]) })
    const wrapper = mountView()

    expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="exercise-option"]').trigger('click')
    state.currentAnswer.value = { optionIds: ['o1'], isCorrect: true }
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeUndefined()
  })

  it('shows the result screen with the score and a way back to the last exercise', async () => {
    set({ status: ref('result'), score: ref({ correct: 3, total: 4 }) })

    const wrapper = mountView()

    expect(wrapper.get('[data-test="result"]').text()).toContain('3 of 4 correct')
    expect(wrapper.find('[data-test="finish"]').exists()).toBe(true)

    await wrapper.get('[data-test="result-back"]').trigger('click')
    expect(state.back).toHaveBeenCalled()
  })

  it('finishes back on My path, where a finished path or course is celebrated', () => {
    set({ status: ref('result'), score: ref({ correct: 3, total: 4 }) })

    const wrapper = mountView()

    expect(wrapper.get('[data-test="finish"]').getComponent(RouterLinkStub).props('to')).toEqual({ name: 'path' })
  })

  it('opens and closes the help modal via the "?" toggle and the modal itself', async () => {
    set({ status: ref('in-progress'), exercises: ref([textExercise]) })
    const wrapper = mountView()

    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(false)

    await wrapper.get('[data-test="help-toggle"]').trigger('click')
    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(true)

    await wrapper.get('[data-test="close-modal"]').trigger('click')
    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(false)
  })

  it('shows the score percent tinted by tier', () => {
    set({ status: ref('result'), scorePercent: ref(35), scoreTier: ref('danger') })

    const wrapper = mountView()

    const percent = wrapper.get('[data-test="result-percent"]')
    expect(percent.text()).toBe('35%')
    expect(percent.classes()).toContain('text-danger')
  })

  describe('send to your teacher', () => {
    const secondExercise: Exercise = { ...textExercise, exercise_id: 'ex-2' }

    it('is offered on the exercise shown, with its reference and the lesson titles', () => {
      set({ status: ref('in-progress'), exercises: ref([textExercise, secondExercise]) })

      const wrapper = mountView()

      const button = wrapper.findComponent({ name: 'SendToTeacher' })
      expect(button.exists()).toBe(true)
      expect(button.props()).toEqual({
        reference: 'X-node-1/ex-1',
        pathTitle: 'Blues Basics',
        lessonTitle: 'Shuffle in E',
      })
    })

    it('follows the exercise the student moves on to', async () => {
      set({ status: ref('in-progress'), exercises: ref([textExercise, secondExercise]) })
      const wrapper = mountView()

      state.currentIndex.value = 1
      await nextTick()

      expect(wrapper.findComponent({ name: 'SendToTeacher' }).props('reference')).toBe('X-node-1/ex-2')
    })

    it.each(['loading', 'error', 'empty', 'result'] as const)('is not offered while the practice is %s', (status) => {
      set({ status: ref(status), exercises: ref([textExercise]) })

      const wrapper = mountView()

      expect(wrapper.findComponent({ name: 'SendToTeacher' }).exists()).toBe(false)
    })
  })
})
