import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ChallengeConfigPanel from '@/features/teacher/components/ChallengeConfigPanel.vue'

describe('ChallengeConfigPanel', () => {
  it('renders the current subject tag, pass threshold, and shuffle flags', () => {
    const wrapper = mount(ChallengeConfigPanel, {
      props: { subjectTag: 'triad-shapes', passThreshold: 70, shuffleExercises: true, shuffleOptions: false },
    })

    expect((wrapper.get('[data-test="subject-tag"]').element as HTMLInputElement).value).toBe('triad-shapes')
    expect((wrapper.get('[data-test="pass-threshold"]').element as HTMLInputElement).value).toBe('70')
    expect((wrapper.get('[data-test="shuffle-exercises"]').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.get('[data-test="shuffle-options"]').element as HTMLInputElement).checked).toBe(false)
  })

  it('emits update events for each field', async () => {
    const wrapper = mount(ChallengeConfigPanel, {
      props: { subjectTag: '', passThreshold: 70, shuffleExercises: false, shuffleOptions: false },
    })

    await wrapper.get('[data-test="subject-tag"]').setValue('sweep-picking')
    expect(wrapper.emitted('update:subjectTag')).toEqual([['sweep-picking']])

    await wrapper.get('[data-test="pass-threshold"]').setValue('80')
    expect(wrapper.emitted('update:passThreshold')).toEqual([[80]])

    await wrapper.get('[data-test="shuffle-exercises"]').setValue(true)
    expect(wrapper.emitted('update:shuffleExercises')).toEqual([[true]])

    await wrapper.get('[data-test="shuffle-options"]').setValue(true)
    expect(wrapper.emitted('update:shuffleOptions')).toEqual([[true]])
  })
})
