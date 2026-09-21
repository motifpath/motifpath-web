import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import VideoTimelineEditor from '@/features/teacher/components/VideoTimelineEditor.vue'

const items = [
  {
    expanded_content_id: 'ec-1',
    content_node_id: 'cn-1',
    content_type: 'image' as const,
    media_url: 'https://cdn.example.com/a.png',
    trigger_at_seconds: 10,
    hide_at_seconds: 15,
    caption: 'A caption',
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('VideoTimelineEditor', () => {
  it('renders each item with its trigger/hide seconds and caption', () => {
    const wrapper = mount(VideoTimelineEditor, { props: { items } })

    const row = wrapper.get('[data-test="timeline-item"]')
    expect(row.text()).toContain('10')
    expect(row.text()).toContain('15')
    expect(row.text()).toContain('A caption')
  })

  it('emits adjustTrigger/adjustHide when the +/- steppers are clicked', async () => {
    const wrapper = mount(VideoTimelineEditor, { props: { items } })

    await wrapper.get('[data-test="trigger-increment"]').trigger('click')
    expect(wrapper.emitted('adjustTrigger')).toEqual([['ec-1', 1]])

    await wrapper.get('[data-test="trigger-decrement"]').trigger('click')
    expect(wrapper.emitted('adjustTrigger')).toEqual([['ec-1', 1], ['ec-1', -1]])

    await wrapper.get('[data-test="hide-increment"]').trigger('click')
    expect(wrapper.emitted('adjustHide')).toEqual([['ec-1', 1]])
  })

  it('emits remove when the remove button is clicked', async () => {
    const wrapper = mount(VideoTimelineEditor, { props: { items } })

    await wrapper.get('[data-test="timeline-item-remove"]').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([['ec-1']])
  })

  it('emits add when the add button is clicked', async () => {
    const wrapper = mount(VideoTimelineEditor, { props: { items: [] } })

    await wrapper.get('[data-test="add-timeline-item"]').trigger('click')

    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('emits edit with the item id when its edit button is clicked', async () => {
    const wrapper = mount(VideoTimelineEditor, { props: { items } })

    await wrapper.get('[data-test="timeline-item-edit"]').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([['ec-1']])
  })

  it('labels a rich-text pop-up as such instead of showing a url or caption', () => {
    const wrapper = mount(VideoTimelineEditor, {
      props: {
        items: [
          {
            expanded_content_id: 'ec-2',
            content_node_id: 'cn-1',
            content_type: 'rich_text' as const,
            rich_content: { type: 'doc' as const, content: [] },
            trigger_at_seconds: 5,
            hide_at_seconds: 9,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
    })

    expect(wrapper.get('[data-test="timeline-item"] [data-test="timeline-item-kind"]').text()).toBe('Rich text')
  })
})
