import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ExpandedContentModal from '@/features/teacher/components/ExpandedContentModal.vue'
import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']
type ExpandedContent = components['schemas']['ExpandedContent']

// Already in the shape PromptEditor's Tiptap round trip emits, so it compares
// equal after passing through the editor.
const BODY: PromptDocument = {
  type: 'doc',
  content: [{ type: 'paragraph', attrs: { textAlign: null }, content: [{ type: 'text', text: 'Mute the low strings' }] }],
}

const baseProps = { open: true, timing: 'seconds' as const, item: null, saving: false }

function makeItem(overrides: Partial<ExpandedContent>): ExpandedContent {
  return {
    expanded_content_id: 'ec-1',
    content_node_id: 'cn-1',
    content_type: 'image',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('ExpandedContentModal', () => {
  it('renders nothing while closed', () => {
    const wrapper = mount(ExpandedContentModal, { props: { ...baseProps, open: false } })

    expect(wrapper.find('[data-test="popup-modal"]').exists()).toBe(false)
  })

  it('asks for seconds when timing a video pop-up', () => {
    const wrapper = mount(ExpandedContentModal, { props: baseProps })

    expect(wrapper.find('[data-test="popup-trigger-seconds"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="popup-hide-seconds"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="popup-paragraph"]').exists()).toBe(false)
  })

  it('asks for a paragraph and duration when timing an article pop-up', () => {
    const wrapper = mount(ExpandedContentModal, { props: { ...baseProps, timing: 'paragraph' } })

    expect(wrapper.find('[data-test="popup-paragraph"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="popup-duration-ms"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="popup-trigger-seconds"]').exists()).toBe(false)
  })

  it('emits an image pop-up with its timing, url and caption', async () => {
    const wrapper = mount(ExpandedContentModal, { props: baseProps })

    await wrapper.get('[data-test="popup-trigger-seconds"]').setValue('10')
    await wrapper.get('[data-test="popup-hide-seconds"]').setValue('15')
    await wrapper.get('[data-test="popup-media-url"]').setValue('https://cdn.example.com/a.png')
    await wrapper.get('[data-test="popup-caption"]').setValue('Hand position')
    await wrapper.get('[data-test="popup-save"]').trigger('click')

    expect(wrapper.emitted('save')).toEqual([
      [
        {
          content_type: 'image',
          media_url: 'https://cdn.example.com/a.png',
          trigger_at_seconds: 10,
          hide_at_seconds: 15,
          caption: 'Hand position',
        },
      ],
    ])
  })

  it('emits a rich-text pop-up carrying the document and no media url', async () => {
    const wrapper = mount(ExpandedContentModal, { props: baseProps })

    await wrapper.get('[data-test="popup-kind"]').setValue('rich_text')
    expect(wrapper.find('[data-test="popup-media-url"]').exists()).toBe(false)
    await wrapper.get('[data-test="popup-trigger-seconds"]').setValue('5')
    await wrapper.get('[data-test="popup-hide-seconds"]').setValue('9')
    await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', BODY)
    await wrapper.get('[data-test="popup-save"]').trigger('click')

    expect(wrapper.emitted('save')).toEqual([
      [{ content_type: 'rich_text', rich_content: BODY, trigger_at_seconds: 5, hide_at_seconds: 9 }],
    ])
  })

  it('emits an article pop-up with paragraph and duration', async () => {
    const wrapper = mount(ExpandedContentModal, { props: { ...baseProps, timing: 'paragraph' } })

    await wrapper.get('[data-test="popup-kind"]').setValue('rich_text')
    await wrapper.get('[data-test="popup-paragraph"]').setValue('3')
    await wrapper.get('[data-test="popup-duration-ms"]').setValue('4000')
    await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', BODY)
    await wrapper.get('[data-test="popup-save"]').trigger('click')

    expect(wrapper.emitted('save')).toEqual([
      [{ content_type: 'rich_text', rich_content: BODY, trigger_at_paragraph: 3, duration_ms: 4000 }],
    ])
  })

  it('keeps Save disabled until a rich-text pop-up has content', async () => {
    const wrapper = mount(ExpandedContentModal, { props: baseProps })
    await wrapper.get('[data-test="popup-kind"]').setValue('rich_text')
    await wrapper.get('[data-test="popup-trigger-seconds"]').setValue('5')
    await wrapper.get('[data-test="popup-hide-seconds"]').setValue('9')

    expect(wrapper.get('[data-test="popup-save"]').attributes('disabled')).toBeDefined()

    await wrapper.findComponent(PromptEditor).vm.$emit('update:modelValue', BODY)

    expect(wrapper.get('[data-test="popup-save"]').attributes('disabled')).toBeUndefined()
  })

  it('flags a hide time that is not after the trigger time and disables Save', async () => {
    const wrapper = mount(ExpandedContentModal, { props: baseProps })
    await wrapper.get('[data-test="popup-media-url"]').setValue('https://cdn.example.com/a.png')
    await wrapper.get('[data-test="popup-trigger-seconds"]').setValue('10')
    await wrapper.get('[data-test="popup-hide-seconds"]').setValue('10')

    expect(wrapper.find('[data-test="popup-timing-error"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="popup-save"]').attributes('disabled')).toBeDefined()
  })

  it('flags an image url that is not http(s) and disables Save', async () => {
    const wrapper = mount(ExpandedContentModal, { props: baseProps })
    await wrapper.get('[data-test="popup-trigger-seconds"]').setValue('1')
    await wrapper.get('[data-test="popup-hide-seconds"]').setValue('2')
    await wrapper.get('[data-test="popup-media-url"]').setValue('javascript:alert(1)')

    expect(wrapper.find('[data-test="popup-media-url-error"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="popup-save"]').attributes('disabled')).toBeDefined()
  })

  it('pre-fills from an existing rich-text pop-up when editing it', async () => {
    const item = makeItem({
      content_type: 'rich_text',
      rich_content: BODY,
      trigger_at_seconds: 5,
      hide_at_seconds: 9,
    })
    const wrapper = mount(ExpandedContentModal, { props: { ...baseProps, item } })

    expect((wrapper.get('[data-test="popup-kind"]').element as HTMLSelectElement).value).toBe('rich_text')
    expect((wrapper.get('[data-test="popup-trigger-seconds"]').element as HTMLInputElement).value).toBe('5')
    expect(wrapper.findComponent(PromptEditor).props('modelValue')).toEqual(BODY)

    await wrapper.get('[data-test="popup-hide-seconds"]').setValue('12')
    await wrapper.get('[data-test="popup-save"]').trigger('click')

    expect(wrapper.emitted('save')).toEqual([
      [{ content_type: 'rich_text', rich_content: BODY, trigger_at_seconds: 5, hide_at_seconds: 12 }],
    ])
  })

  it('discards unsaved edits when it is closed and reopened', async () => {
    const wrapper = mount(ExpandedContentModal, { props: baseProps })
    await wrapper.get('[data-test="popup-trigger-seconds"]').setValue('42')

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect((wrapper.get('[data-test="popup-trigger-seconds"]').element as HTMLInputElement).value).toBe('')
  })

  it('disables Save while a save is in flight', async () => {
    const wrapper = mount(ExpandedContentModal, { props: { ...baseProps, saving: true } })
    await wrapper.get('[data-test="popup-media-url"]').setValue('https://cdn.example.com/a.png')
    await wrapper.get('[data-test="popup-trigger-seconds"]').setValue('1')
    await wrapper.get('[data-test="popup-hide-seconds"]').setValue('2')

    expect(wrapper.get('[data-test="popup-save"]').attributes('disabled')).toBeDefined()
  })

  it('emits close from the cancel button', async () => {
    const wrapper = mount(ExpandedContentModal, { props: baseProps })

    await wrapper.get('[data-test="popup-cancel"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
