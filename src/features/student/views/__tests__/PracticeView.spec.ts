import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

const textExercise: Exercise = {
  exercise_id: 'ex-1',
  title: 't1',
  prompt: plainTextPrompt('Name this technique'),
  exercise_type: 'text_response',
  options: [
    { option_id: 'o1', is_correct: true, label: 'Alternate picking' },
    { option_id: 'o2', is_correct: false, label: 'Legato' },
  ],
  challenge_ids: ['ch-1'],
  content_node_ids: [],
  created_at: '2026-09-01T00:00:00Z',
  languages: [],
  remediation_targets: [],
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

import PracticeView from '@/features/student/views/PracticeView.vue'

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
})
