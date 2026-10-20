import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ArticlePopupListEditor from '@/features/teacher/components/ArticlePopupListEditor.vue'

const items = [
  {
    expanded_content_id: 'ec-1',
    content_node_id: 'cn-1',
    content_type: 'image' as const,
    media_url: 'https://cdn.example.com/a.png',
    trigger_at_paragraph: 3,
    duration_ms: 5000,
    caption: 'A caption',
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('ArticlePopupListEditor', () => {
  it('renders each item with its paragraph trigger, duration, and caption', () => {
    const wrapper = mount(ArticlePopupListEditor, { props: { items } })

    const row = wrapper.get('[data-test="popup-item"]')
    expect(row.text()).toContain('3')
    expect(row.text()).toContain('5000')
    expect(row.text()).toContain('A caption')
  })

  it('emits adjustParagraph when the +/- steppers are clicked', async () => {
    const wrapper = mount(ArticlePopupListEditor, { props: { items } })

    await wrapper.get('[data-test="paragraph-increment"]').trigger('click')
    expect(wrapper.emitted('adjustParagraph')).toEqual([['ec-1', 1]])

    await wrapper.get('[data-test="paragraph-decrement"]').trigger('click')
    expect(wrapper.emitted('adjustParagraph')).toEqual([['ec-1', 1], ['ec-1', -1]])
  })

  it('emits remove when the remove button is clicked', async () => {
    const wrapper = mount(ArticlePopupListEditor, { props: { items } })

    await wrapper.get('[data-test="popup-item-remove"]').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([['ec-1']])
  })

  it('emits add when the add button is clicked', async () => {
    const wrapper = mount(ArticlePopupListEditor, { props: { items: [] } })

    await wrapper.get('[data-test="add-popup-item"]').trigger('click')

    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('emits edit with the item id when its edit button is clicked', async () => {
    const wrapper = mount(ArticlePopupListEditor, { props: { items } })

    await wrapper.get('[data-test="popup-item-edit"]').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([['ec-1']])
  })

  it('labels a rich-text pop-up as such instead of showing a url or caption', () => {
    const wrapper = mount(ArticlePopupListEditor, {
      props: {
        items: [
          {
            expanded_content_id: 'ec-2',
            content_node_id: 'cn-1',
            content_type: 'rich_text' as const,
            rich_content: { type: 'doc' as const, content: [] },
            trigger_at_paragraph: 2,
            duration_ms: 3000,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
    })

    expect(wrapper.get('[data-test="popup-item"] [data-test="popup-item-kind"]').text()).toBe('Rich text')
  })
})
