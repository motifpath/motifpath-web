import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SectionedPathList from '@/features/teacher/components/SectionedPathList.vue'
import type { PathBuilderItem } from '@/features/teacher/components/SectionedPathList.vue'

const items: PathBuilderItem[] = [
  { content_node_id: 'cn-1', title: 'Open position triads', content_type: 'video', section_label: 'Chords' },
  { content_node_id: 'cn-2', title: 'Moveable triads', content_type: 'video', section_label: 'Chords' },
  { content_node_id: 'cn-3', title: 'Reading the fretboard', content_type: 'article' },
  { content_node_id: 'cn-4', title: 'Interval recognition', content_type: 'article' },
]

describe('SectionedPathList', () => {
  it('groups consecutive items sharing a section label under one heading', () => {
    const wrapper = mount(SectionedPathList, { props: { items } })

    const sections = wrapper.findAll('[data-test="path-section"]')
    expect(sections).toHaveLength(2)
    expect(sections[0].text()).toContain('Chords')
  })

  it('renders each item with its title and content type', () => {
    const wrapper = mount(SectionedPathList, { props: { items } })

    expect(wrapper.text()).toContain('Open position triads')
    expect(wrapper.text()).toContain('Reading the fretboard')
    const rows = wrapper.findAll('[data-test="path-item"]')
    expect(rows[0].text()).toContain('Video')
    expect(rows[2].text()).toContain('Article')
  })

  it('disables moving the first item up and the last item down', () => {
    const wrapper = mount(SectionedPathList, { props: { items } })

    const upButtons = wrapper.findAll('[data-test="move-up"]')
    const downButtons = wrapper.findAll('[data-test="move-down"]')

    expect(upButtons[0].attributes('disabled')).toBeDefined()
    expect(downButtons[downButtons.length - 1].attributes('disabled')).toBeDefined()
    expect(upButtons[1].attributes('disabled')).toBeUndefined()
    expect(downButtons[0].attributes('disabled')).toBeUndefined()
  })

  it('emits reorder with the current and target index when moved down', async () => {
    const wrapper = mount(SectionedPathList, { props: { items } })

    await wrapper.findAll('[data-test="move-down"]')[0].trigger('click')

    expect(wrapper.emitted('reorder')).toEqual([[0, 1]])
  })

  it('emits reorder with the current and target index when moved up', async () => {
    const wrapper = mount(SectionedPathList, { props: { items } })

    await wrapper.findAll('[data-test="move-up"]')[1].trigger('click')

    expect(wrapper.emitted('reorder')).toEqual([[1, 0]])
  })

  it('emits relabel with the item index and new section label when edited', async () => {
    const wrapper = mount(SectionedPathList, { props: { items } })

    const labelInputs = wrapper.findAll('[data-test="section-label-input"]')
    await labelInputs[2].setValue('Ear training')

    expect(wrapper.emitted('relabel')).toEqual([[2, 'Ear training']])
  })

  it('emits remove with the item index when a row is removed', async () => {
    const wrapper = mount(SectionedPathList, { props: { items } })

    await wrapper.findAll('[data-test="remove-item"]')[2].trigger('click')

    expect(wrapper.emitted('remove')).toEqual([[2]])
  })

  it('shows an empty state when there are no items', () => {
    const wrapper = mount(SectionedPathList, { props: { items: [] } })

    expect(wrapper.find('[data-test="path-empty"]').exists()).toBe(true)
  })
})
