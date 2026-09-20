import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ContentNodePickerModal from '@/features/teacher/components/ContentNodePickerModal.vue'
import type { components } from '@/api/generated/core-domain'

type ContentNode = components['schemas']['ContentNode']

const contentNodes: ContentNode[] = [
  { content_node_id: 'cn-1', title: 'Open position triads', content_type: 'video' } as ContentNode,
  { content_node_id: 'cn-2', title: 'Reading the fretboard', content_type: 'article' } as ContentNode,
]

describe('ContentNodePickerModal', () => {
  it('lists content nodes not already added, and hides the added ones', () => {
    const wrapper = mount(ContentNodePickerModal, {
      props: { open: true, contentNodes, addedContentNodeIds: ['cn-2'] },
    })

    expect(wrapper.text()).toContain('Open position triads')
    expect(wrapper.text()).not.toContain('Reading the fretboard')
  })

  it('emits select with the content node id when a row is clicked', async () => {
    const wrapper = mount(ContentNodePickerModal, {
      props: { open: true, contentNodes, addedContentNodeIds: [] },
    })

    await wrapper.get('[data-test="content-node-picker-row"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['cn-1']])
  })

  it('shows an empty state when every content node is already added', () => {
    const wrapper = mount(ContentNodePickerModal, {
      props: { open: true, contentNodes, addedContentNodeIds: ['cn-1', 'cn-2'] },
    })

    expect(wrapper.find('[data-test="content-node-picker-empty"]').exists()).toBe(true)
  })

  it('filters by title as the teacher types', async () => {
    const wrapper = mount(ContentNodePickerModal, {
      props: { open: true, contentNodes, addedContentNodeIds: [] },
    })

    await wrapper.get('[data-test="content-node-picker-search"]').setValue('fretboard')

    expect(wrapper.text()).toContain('Reading the fretboard')
    expect(wrapper.text()).not.toContain('Open position triads')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mount(ContentNodePickerModal, {
      props: { open: true, contentNodes, addedContentNodeIds: [] },
    })

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
