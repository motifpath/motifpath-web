import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ChallengeReview from '@/features/student/components/ChallengeReview.vue'
import type { ReviewEntry } from '@/features/student/composables/usePracticeSession'
import ExerciseView from '@/shared/components/ExerciseView.vue'
import { makeDiagramRef } from '@/shared/testUtils/diagram'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

function exercise(overrides: Partial<Exercise>): Exercise {
  return {
    exercise_id: 'ex-3',
    title: 'Inversions',
    prompt: plainTextPrompt('Which inversion is shown?'),
    exercise_type: 'text_response',
    skills: [],
    concepts: [],
    options: [],
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

const root = { option_id: 'o1', is_correct: false, label: 'Root position' }
const first = { option_id: 'o2', is_correct: true, label: 'First inversion' }
const second = { option_id: 'o3', is_correct: false, label: 'Second inversion' }
const inversions = exercise({ options: [root, first, second] })

const wrong: ReviewEntry = {
  exercise: inversions,
  number: 3,
  chosen: [{ option: second, key: 3, right: false }],
  missed: [{ option: first, key: 2 }],
}
const right: ReviewEntry = {
  exercise: exercise({ exercise_id: 'ex-1', prompt: plainTextPrompt('Which is the root?'), options: [root, first] }),
  number: 1,
  chosen: [{ option: first, key: 2, right: true }],
  missed: [],
}

describe('ChallengeReview', () => {
  it('lists each exercise by number with its prompt', () => {
    const wrapper = mount(ChallengeReview, { props: { entries: [right, wrong] } })

    const entries = wrapper.findAll('[data-test="review-entry"]')
    expect(entries).toHaveLength(2)
    expect(entries[1]!.text()).toContain('Exercise 3')
    expect(entries[1]!.text()).toContain('Which inversion is shown?')
  })

  it('marks a wrong answer wrong, with the right one under it', () => {
    const wrapper = mount(ChallengeReview, { props: { entries: [wrong] } })

    const answer = wrapper.get('[data-test="review-answer"]')
    expect(answer.text()).toContain('Your answer: Second inversion')
    expect(answer.attributes('data-mark')).toBe('wrong')
    expect(answer.text()).toContain('3')
    const rightAnswer = wrapper.get('[data-test="review-right-answer"]')
    expect(rightAnswer.text()).toContain('Right answer: First inversion')
    expect(rightAnswer.attributes('data-mark')).toBe('right')
  })

  it('lists a right answer once, marked right, with no separate right answer', () => {
    const wrapper = mount(ChallengeReview, { props: { entries: [right] } })

    const answer = wrapper.get('[data-test="review-answer"]')
    expect(answer.text()).toContain('Your answer: First inversion')
    expect(answer.attributes('data-mark')).toBe('right')
    expect(wrapper.find('[data-test="review-right-answer"]').exists()).toBe(false)
  })

  it('says right or wrong in words, not by colour alone', () => {
    const wrapper = mount(ChallengeReview, { props: { entries: [wrong] } })

    expect(wrapper.get('[data-test="review-answer"]').text()).toContain('Wrong')
    expect(wrapper.get('[data-test="review-right-answer"]').text()).toContain('Right')
  })

  it('shows an exercise answered on its stimulus with the answer marked there, since its options have no names', () => {
    const bridge = { option_id: 'r1', is_correct: true, region: { x: 0.5, y: 0.5, width: 0.2, height: 0.2, shape: 'circle' as const } }
    const neck = { option_id: 'r2', is_correct: false, region: { x: 0.2, y: 0.2, width: 0.2, height: 0.2, shape: 'circle' as const } }
    const regions: ReviewEntry = {
      exercise: exercise({ exercise_type: 'image_recognition', image_url: 'https://media.test/guitar.png', options: [bridge, neck] }),
      number: 2,
      chosen: [{ option: neck, key: 2, right: false }],
      missed: [{ option: bridge, key: 1 }],
    }

    const wrapper = mount(ChallengeReview, { props: { entries: [regions] } })

    expect(wrapper.find('[data-test="review-answer"]').exists()).toBe(false)
    const view = wrapper.getComponent(ExerciseView)
    expect(view.props('selectedOptionIds')).toEqual(['r2'])
    expect(view.props('reveal')).toEqual({ correctOptionIds: ['r1'] })
  })

  describe('a sound played from a diagram', () => {
    const aMinor = makeDiagramRef({ diagram_id: 'a-minor', playback: { playback_id: 'strum', direction: 'as_authored', loop: false } })
    const major = { option_id: 'major', is_correct: false, label: 'Major' }
    const minor = { option_id: 'minor', is_correct: true, label: 'Minor' }
    const stubs = { WhatYouHeard: { name: 'WhatYouHeard', props: ['sound'], template: '<div data-test="what-you-heard" />' } }

    it('reveals what each diagram sound was, under the answer', () => {
      const heard: ReviewEntry = {
        exercise: exercise({ exercise_id: 'ex-2', exercise_type: 'audio_recognition', diagram_ref: aMinor, options: [major, minor] }),
        number: 2,
        chosen: [{ option: minor, key: 2, right: true }],
        missed: [],
      }

      const wrapper = mount(ChallengeReview, { props: { entries: [heard] }, global: { stubs } })

      expect(wrapper.get('[data-test="review-answer"]').text()).toContain('Minor')
      expect(wrapper.getComponent({ name: 'WhatYouHeard' }).props('sound')).toEqual(aMinor)
    })

    it('has nothing to reveal for an uploaded clip', () => {
      const clip: ReviewEntry = {
        exercise: exercise({ exercise_type: 'audio_recognition', audio_url: 'https://media.test/fifth.mp3', options: [major, minor] }),
        number: 1,
        chosen: [{ option: minor, key: 2, right: true }],
        missed: [],
      }

      const wrapper = mount(ChallengeReview, { props: { entries: [clip] }, global: { stubs } })

      expect(wrapper.find('[data-test="what-you-heard"]').exists()).toBe(false)
    })
  })
})
