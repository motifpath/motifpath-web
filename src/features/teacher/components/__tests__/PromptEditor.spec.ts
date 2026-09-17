import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const upload = vi.fn()
vi.mock('@/features/teacher/composables/useMediaUpload', () => ({
  useMediaUpload: () => ({ upload }),
}))

import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']

function lastEmittedDocument(wrapper: ReturnType<typeof mount>): PromptDocument {
  const events = wrapper.emitted<[PromptDocument]>('update:modelValue')
  if (!events || events.length === 0) throw new Error('update:modelValue was never emitted')
  return events[events.length - 1]![0]
}

describe('PromptEditor', () => {
  it("renders the initial document's text", async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello world') } })
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Hello world')
  })

  it('shows every required toolbar button', async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('') } })
    await nextTick()

    const expected = [
      'h1',
      'h2',
      'h3',
      'paragraph',
      'bold',
      'italic',
      'strike',
      'highlight',
      'align-left',
      'align-center',
      'align-right',
      'align-justify',
      'bullet-list',
      'ordered-list',
      'link',
      'table',
      'image',
    ]
    for (const name of expected) {
      expect(wrapper.find(`[data-test="prompt-toolbar-${name}"]`).exists(), name).toBe(true)
    }
  })

  it('toggling a heading changes the current block and emits the updated document', async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') } })
    await nextTick()

    await wrapper.find('[data-test="prompt-toolbar-h2"]').trigger('click')
    await nextTick()

    const doc = lastEmittedDocument(wrapper)
    expect(doc.content[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } })
  })

  it('toggling bulleted list wraps the current block and emits the updated document', async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') } })
    await nextTick()

    await wrapper.find('[data-test="prompt-toolbar-bullet-list"]').trigger('click')
    await nextTick()

    const doc = lastEmittedDocument(wrapper)
    expect(doc.content[0]?.type).toBe('bulletList')
  })

  it('inserting a table adds a table node and emits the updated document', async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') } })
    await nextTick()

    await wrapper.find('[data-test="prompt-toolbar-table"]').trigger('click')
    await nextTick()

    const doc = lastEmittedDocument(wrapper)
    expect(doc.content.some((node) => node.type === 'table')).toBe(true)
  })

  it('uploads the picked file and inserts an image node on the image button', async () => {
    upload.mockResolvedValueOnce('https://cdn.example.com/library/circle-of-fifths.png')
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('') } })
    await nextTick()

    const file = new File(['x'], 'circle.png', { type: 'image/png' })
    const input = wrapper.find('[data-test="prompt-toolbar-image-input"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await nextTick()
    await nextTick()

    expect(upload).toHaveBeenCalledWith(file, 'image')
    const doc = lastEmittedDocument(wrapper)
    expect(doc.content.some((node) => node.type === 'image')).toBe(true)
  })
})
