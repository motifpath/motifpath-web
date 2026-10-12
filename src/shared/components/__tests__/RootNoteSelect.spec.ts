import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import RootNoteSelect from '@/shared/components/RootNoteSelect.vue'

describe('RootNoteSelect', () => {
  it('offers Any, then the twelve notes', () => {
    const wrapper = mount(RootNoteSelect, { props: { modelValue: undefined } })

    expect(wrapper.findAll('option').map((option) => option.text())).toEqual([
      'Any', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
    ])
    expect(wrapper.get('select').element.value).toBe('')
  })

  it('shows the chosen note', () => {
    const wrapper = mount(RootNoteSelect, { props: { modelValue: 'A' } })
    expect(wrapper.get('select').element.value).toBe('A')
  })

  it('takes one note at a time', async () => {
    const wrapper = mount(RootNoteSelect, { props: { modelValue: 'A' } })

    await wrapper.get('select').setValue('E')

    expect(wrapper.emitted('update:modelValue')).toEqual([['E']])
  })

  it('clears the note with Any', async () => {
    const wrapper = mount(RootNoteSelect, { props: { modelValue: 'A' } })

    await wrapper.get('select').setValue('')

    expect(wrapper.emitted('update:modelValue')).toEqual([[undefined]])
  })

  it('is labelled', () => {
    const wrapper = mount(RootNoteSelect, { props: { modelValue: undefined } })
    expect(wrapper.get('label').text()).toBe('Root note')
  })
})
