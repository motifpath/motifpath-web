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

  it('emits add with the new pop-up fields', async () => {
    const wrapper = mount(ArticlePopupListEditor, { props: { items: [] } })

    await wrapper.get('[data-test="new-paragraph"]').setValue('4')
    await wrapper.get('[data-test="new-duration-ms"]').setValue('3000')
    await wrapper.get('[data-test="new-media-url"]').setValue('https://cdn.example.com/b.png')
    await wrapper.get('[data-test="new-caption"]').setValue('New caption')
    await wrapper.get('[data-test="add-popup-item"]').trigger('click')

    expect(wrapper.emitted('add')).toEqual([
      [
        {
          content_type: 'image',
          media_url: 'https://cdn.example.com/b.png',
          trigger_at_paragraph: 4,
          duration_ms: 3000,
          caption: 'New caption',
        },
      ],
    ])
  })

  it('does not emit add when paragraph, duration, or media_url is missing', async () => {
    const wrapper = mount(ArticlePopupListEditor, { props: { items: [] } })

    await wrapper.get('[data-test="add-popup-item"]').trigger('click')

    expect(wrapper.emitted('add')).toBeUndefined()
  })
})
