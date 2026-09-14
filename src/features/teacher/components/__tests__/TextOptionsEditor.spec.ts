import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TextOptionsEditor from '@/features/teacher/components/TextOptionsEditor.vue'
import type { TextOption } from '@/features/teacher/composables/useExerciseForm'

const options: TextOption[] = [
  { id: 'o1', label: 'G major', correct: true },
  { id: 'o2', label: 'E minor', correct: false },
]

describe('TextOptionsEditor', () => {
  it('renders each option label and correct state', () => {
    const wrapper = mount(TextOptionsEditor, { props: { options } })

    const inputs = wrapper.findAll('input[type="text"]')
    expect(inputs.map((i) => (i.element as HTMLInputElement).value)).toEqual(['G major', 'E minor'])
    expect(wrapper.findAll('[data-test="option-correct"][aria-pressed="true"]')).toHaveLength(1)
  })

  it('emits edit, toggle, remove, and add', async () => {
    const wrapper = mount(TextOptionsEditor, { props: { options } })

    await wrapper.findAll('input[type="text"]')[1]!.setValue('C major')
    expect(wrapper.emitted('edit')).toEqual([['o2', 'C major']])

    await wrapper.findAll('[data-test="option-correct"]')[1]!.trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['o2']])

    await wrapper.findAll('[data-test="option-remove"]')[0]!.trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['o1']])

    await wrapper.get('[data-test="add-option"]').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })
})
