import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ChallengeModal from '@/features/teacher/components/ChallengeModal.vue'
import type { components } from '@/api/generated/core-domain'

type Exercise = components['schemas']['Exercise']

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    exercise_id: 'e-1',
    title: 'Untitled',
    prompt: { type: 'doc', content: [] },
    exercise_type: 'text_response',
    skills: [],
    concepts: [],
    options: [],
    challenge_ids: [],
    content_node_ids: [],
    remediation_targets: [],
    languages: [],
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const pool = [
  makeExercise({ exercise_id: 'e-1', title: 'Name the chord' }),
  makeExercise({ exercise_id: 'e-2', title: 'Pick the diagram', exercise_type: 'image_choice' }),
]

const baseProps = {
  open: true,
  skillNodes: [{ id: 's-1', name: 'triad-shapes', parent_id: null }],
  conceptNodes: [{ id: 'c-1', name: 'chord-theory', parent_id: null }],
  allowedSkillIds: ['s-1'],
  allowedConceptIds: ['c-1'],
  exercisePool: pool,
  initial: null,
  saving: false,
}

async function pickExercise(wrapper: ReturnType<typeof mount>, title: string) {
  await wrapper.get('[data-test="attach-exercise"]').trigger('click')
  const row = wrapper.findAll('[data-test="exercise-picker-row"]').find((r) => r.text().includes(title))
  if (!row) throw new Error(`no picker row for ${title}`)
  await row.trigger('click')
}

async function pickSubjectSkill(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('[data-test="tree-open-picker"]').trigger('click')
  await wrapper.get('[data-test="tree-node-radio"][value="s-1"]').setValue(true)
}

describe('ChallengeModal', () => {
  it('renders nothing while closed', () => {
    const wrapper = mount(ChallengeModal, { props: { ...baseProps, open: false } })

    expect(wrapper.find('[data-test="challenge-modal"]').exists()).toBe(false)
  })

  it('explains that a challenge needs exercises and disables Save until one is added', async () => {
    const wrapper = mount(ChallengeModal, { props: baseProps })

    expect(wrapper.find('[data-test="challenge-needs-exercises"]').exists()).toBe(true)
    await pickSubjectSkill(wrapper)
    expect(wrapper.get('[data-test="save-challenge"]').attributes('disabled')).toBeDefined()

    await pickExercise(wrapper, 'Name the chord')

    expect(wrapper.find('[data-test="challenge-needs-exercises"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="save-challenge"]').attributes('disabled')).toBeUndefined()
  })

  it('keeps Save disabled until a subject is chosen, even with exercises', async () => {
    const wrapper = mount(ChallengeModal, { props: baseProps })

    await pickExercise(wrapper, 'Name the chord')

    expect(wrapper.get('[data-test="save-challenge"]').attributes('disabled')).toBeDefined()
  })

  it('lists chosen exercises and lets the teacher remove one', async () => {
    const wrapper = mount(ChallengeModal, { props: baseProps })
    await pickExercise(wrapper, 'Name the chord')
    await pickExercise(wrapper, 'Pick the diagram')

    const rows = wrapper.findAll('[data-test="challenge-exercise"]')
    expect(rows.map((r) => r.text())).toEqual([
      expect.stringContaining('Name the chord'),
      expect.stringContaining('Pick the diagram'),
    ])

    await rows[0]!.get('[data-test="unlink-exercise"]').trigger('click')

    expect(wrapper.findAll('[data-test="challenge-exercise"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Pick the diagram')
  })

  it('emits save with the challenge fields and the chosen exercise ids in order', async () => {
    const wrapper = mount(ChallengeModal, { props: baseProps })
    await pickSubjectSkill(wrapper)
    await pickExercise(wrapper, 'Pick the diagram')
    await pickExercise(wrapper, 'Name the chord')

    await wrapper.get('[data-test="save-challenge"]').trigger('click')

    expect(wrapper.emitted('save')).toEqual([
      [
        {
          fields: {
            subject_skill_id: 's-1',
            subject_concept_id: undefined,
            pass_threshold: 70,
            shuffle_exercises: false,
            shuffle_options: false,
          },
          exerciseIds: ['e-2', 'e-1'],
        },
      ],
    ])
  })

  it('pre-fills from an existing challenge and its linked exercises', () => {
    const wrapper = mount(ChallengeModal, {
      props: {
        ...baseProps,
        initial: {
          subjectSkillId: 's-1',
          subjectConceptId: undefined,
          passThreshold: 85,
          shuffleExercises: true,
          shuffleOptions: false,
          exercises: [pool[0]!],
        },
      },
    })

    expect((wrapper.get('[data-test="pass-threshold"]').element as HTMLInputElement).value).toBe('85')
    expect((wrapper.get('[data-test="shuffle-exercises"]').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.get('[data-test="challenge-exercise"]').text()).toContain('Name the chord')
    expect(wrapper.get('[data-test="save-challenge"]').attributes('disabled')).toBeUndefined()
  })

  it('discards unsaved edits when it is closed and reopened', async () => {
    const wrapper = mount(ChallengeModal, { props: baseProps })
    await pickExercise(wrapper, 'Name the chord')
    expect(wrapper.findAll('[data-test="challenge-exercise"]')).toHaveLength(1)

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect(wrapper.findAll('[data-test="challenge-exercise"]')).toHaveLength(0)
  })

  it('disables Save while a save is in flight', () => {
    const wrapper = mount(ChallengeModal, {
      props: {
        ...baseProps,
        saving: true,
        initial: {
          subjectSkillId: 's-1',
          subjectConceptId: undefined,
          passThreshold: 70,
          shuffleExercises: false,
          shuffleOptions: false,
          exercises: [pool[0]!],
        },
      },
    })

    expect(wrapper.get('[data-test="save-challenge"]').attributes('disabled')).toBeDefined()
  })

  it('emits close from the cancel button', async () => {
    const wrapper = mount(ChallengeModal, { props: baseProps })

    await wrapper.get('[data-test="cancel-challenge"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
