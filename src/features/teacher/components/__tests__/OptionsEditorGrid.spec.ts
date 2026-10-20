import { mount } from '@vue/test-utils'
import { Music } from 'lucide-vue-next'
import { describe, expect, it } from 'vitest'

import OptionsEditorGrid from '@/features/teacher/components/OptionsEditorGrid.vue'

interface Option {
  id: string
  correct: boolean
}

const options: Option[] = [
  { id: 'o1', correct: true },
  { id: 'o2', correct: false },
]

describe('OptionsEditorGrid', () => {
  it('renders the correct state per option', () => {
    const wrapper = mount(OptionsEditorGrid, { props: { options, addIcon: Music, addLabel: 'Add option' } })

    expect(wrapper.findAll('[data-test="option-correct"][aria-pressed="true"]')).toHaveLength(1)
  })

  it('renders the media slot content per option', () => {
    const wrapper = mount(OptionsEditorGrid, {
      props: { options, addIcon: Music, addLabel: 'Add option' },
      slots: { media: '<span data-test="media-marker">media</span>' },
    })

    expect(wrapper.findAll('[data-test="media-marker"]')).toHaveLength(2)
  })

  it('renders the extra slot content per option, when provided', () => {
    const wrapper = mount(OptionsEditorGrid, {
      props: { options, addIcon: Music, addLabel: 'Add option' },
      slots: { extra: '<span data-test="extra-marker">extra</span>' },
    })

    expect(wrapper.findAll('[data-test="extra-marker"]')).toHaveLength(2)
  })

  it('emits toggle, remove, and add', async () => {
    const wrapper = mount(OptionsEditorGrid, { props: { options, addIcon: Music, addLabel: 'Add option' } })

    await wrapper.findAll('[data-test="option-correct"]')[1]!.trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['o2']])

    await wrapper.findAll('[data-test="option-remove"]')[0]!.trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['o1']])

    await wrapper.get('[data-test="add-option"]').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('renders the add-option tile with the given icon and label', () => {
    const wrapper = mount(OptionsEditorGrid, { props: { options, addIcon: Music, addLabel: 'Add audio option' } })

    const tile = wrapper.get('[data-test="add-option"]')
    expect(tile.text()).toContain('Add audio option')
    expect(tile.find('svg').exists()).toBe(true)
  })

  it('uses a 3-column grid by default and 2 columns when compact', () => {
    const wide = mount(OptionsEditorGrid, { props: { options, addIcon: Music, addLabel: 'Add option' } })
    expect(wide.classes()).toContain('grid-cols-3')

    const narrow = mount(OptionsEditorGrid, {
      props: { options, addIcon: Music, addLabel: 'Add option', compact: true },
    })
    expect(narrow.classes()).toContain('grid-cols-2')
  })
})
