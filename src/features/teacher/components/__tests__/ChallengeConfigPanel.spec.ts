import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ChallengeConfigPanel from '@/features/teacher/components/ChallengeConfigPanel.vue'

const skillNodes = [{ id: 's-1', name: 'triad-shapes', parent_id: null }]
const conceptNodes = [{ id: 'c-1', name: 'chord-theory', parent_id: null }]

describe('ChallengeConfigPanel', () => {
  it('renders the current subject, pass threshold, and shuffle flags', () => {
    const wrapper = mount(ChallengeConfigPanel, {
      props: {
        subjectSkillId: 's-1',
        subjectConceptId: undefined,
        skillNodes,
        conceptNodes,
        passThreshold: 70,
        shuffleExercises: true,
        shuffleOptions: false,
      },
    })

    expect(wrapper.text()).toContain('triad-shapes')
    expect((wrapper.get('[data-test="pass-threshold"]').element as HTMLInputElement).value).toBe('70')
    expect((wrapper.get('[data-test="shuffle-exercises"]').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.get('[data-test="shuffle-options"]').element as HTMLInputElement).checked).toBe(false)
  })

  it('emits update:subjectSkillId and clears subjectConceptId when a skill is picked', async () => {
    const wrapper = mount(ChallengeConfigPanel, {
      props: {
        subjectSkillId: undefined,
        subjectConceptId: 'c-1',
        skillNodes,
        conceptNodes,
        passThreshold: 70,
        shuffleExercises: false,
        shuffleOptions: false,
      },
    })

    await wrapper.get('[data-test="tree-node-radio"][value="s-1"]').setValue(true)

    expect(wrapper.emitted('update:subjectSkillId')).toEqual([['s-1']])
    expect(wrapper.emitted('update:subjectConceptId')).toEqual([[undefined]])
  })

  it('emits update:subjectConceptId and clears subjectSkillId when a concept is picked', async () => {
    const wrapper = mount(ChallengeConfigPanel, {
      props: {
        subjectSkillId: 's-1',
        subjectConceptId: undefined,
        skillNodes,
        conceptNodes,
        passThreshold: 70,
        shuffleExercises: false,
        shuffleOptions: false,
      },
    })

    await wrapper.get('[data-test="tree-node-radio"][value="c-1"]').setValue(true)

    expect(wrapper.emitted('update:subjectConceptId')).toEqual([['c-1']])
    expect(wrapper.emitted('update:subjectSkillId')).toEqual([[undefined]])
  })

  it('emits update events for pass threshold and shuffle flags', async () => {
    const wrapper = mount(ChallengeConfigPanel, {
      props: {
        subjectSkillId: undefined,
        subjectConceptId: undefined,
        skillNodes,
        conceptNodes,
        passThreshold: 70,
        shuffleExercises: false,
        shuffleOptions: false,
      },
    })

    await wrapper.get('[data-test="pass-threshold"]').setValue('80')
    expect(wrapper.emitted('update:passThreshold')).toEqual([[80]])

    await wrapper.get('[data-test="shuffle-exercises"]').setValue(true)
    expect(wrapper.emitted('update:shuffleExercises')).toEqual([[true]])

    await wrapper.get('[data-test="shuffle-options"]').setValue(true)
    expect(wrapper.emitted('update:shuffleOptions')).toEqual([[true]])
  })

  it('restricts pickable subjects to the parent content node\'s own linked skills/concepts', () => {
    const wrapper = mount(ChallengeConfigPanel, {
      props: {
        subjectSkillId: undefined,
        subjectConceptId: undefined,
        skillNodes: [...skillNodes, { id: 's-2', name: 'unrelated', parent_id: null }],
        conceptNodes,
        allowedSkillIds: ['s-1'],
        passThreshold: 70,
        shuffleExercises: false,
        shuffleOptions: false,
      },
    })

    // The create-under-parent dropdown still offers every node in the tree
    // (creating a node is a global tree operation) -- only the browsable/
    // pickable rows are restricted to allowedSkillIds.
    const rows = wrapper.findAll('[data-test="tree-node-row"]')
    expect(rows.map((r) => r.text())).not.toContain(expect.stringContaining('unrelated'))
  })
})
