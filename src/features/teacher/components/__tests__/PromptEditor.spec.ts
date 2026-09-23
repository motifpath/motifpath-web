import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const upload = vi.fn()
vi.mock('@/features/teacher/composables/useMediaUpload', () => ({
  useMediaUpload: () => ({ upload }),
}))

import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import { useToast } from '@/shared/composables/useToast'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import { COLOR_PALETTE } from '@/shared/utils/colorPalette'
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
      'undo',
      'redo',
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
      'font-color',
      'background-color',
    ]
    const paletteMenus = new Set(['font-color', 'background-color'])
    for (const name of expected) {
      const selector = paletteMenus.has(name) ? `prompt-toolbar-${name}-trigger` : `prompt-toolbar-${name}`
      expect(wrapper.find(`[data-test="${selector}"]`).exists(), name).toBe(true)
    }
  })

  it('offers only the fixed palette for text and background color — no free color input', async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') } })
    await nextTick()

    expect(wrapper.find('input[type="color"]').exists()).toBe(false)

    await wrapper.get('[data-test="prompt-toolbar-font-color-trigger"]').trigger('click')
    expect(wrapper.findAll('[data-test^="color-swatch-"]')).toHaveLength(COLOR_PALETTE.length)
    await wrapper.get(`[data-test="color-swatch-${COLOR_PALETTE[0].key}"]`).trigger('click')
    expect(wrapper.find('[data-test="color-palette"]').exists()).toBe(false)

    await wrapper.get('[data-test="prompt-toolbar-background-color-trigger"]').trigger('click')
    expect(wrapper.find('[data-test="color-palette"]').exists()).toBe(true)
  })

  it('toggling a heading changes the current block and emits the updated document', async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') } })
    await nextTick()

    await wrapper.find('[data-test="prompt-toolbar-h2"]').trigger('click')
    await nextTick()

    const doc = lastEmittedDocument(wrapper)
    expect(doc.content[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } })
  })

  it('undo reverts the last change and redo re-applies it', async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') } })
    await nextTick()

    expect(wrapper.find('[data-test="prompt-toolbar-undo"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-test="prompt-toolbar-h2"]').trigger('click')
    await nextTick()
    expect(lastEmittedDocument(wrapper).content[0]?.type).toBe('heading')
    expect(wrapper.find('[data-test="prompt-toolbar-undo"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="prompt-toolbar-redo"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-test="prompt-toolbar-undo"]').trigger('click')
    await nextTick()
    expect(lastEmittedDocument(wrapper).content[0]?.type).toBe('paragraph')
    expect(wrapper.find('[data-test="prompt-toolbar-redo"]').attributes('disabled')).toBeUndefined()

    await wrapper.find('[data-test="prompt-toolbar-redo"]').trigger('click')
    await nextTick()
    expect(lastEmittedDocument(wrapper).content[0]?.type).toBe('heading')
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

  it('shows table row/column controls only while the cursor is inside a table, and can add/remove a column and a row', async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') } })
    await nextTick()
    expect(wrapper.find('[data-test="prompt-table-toolbar"]').exists()).toBe(false)

    await wrapper.find('[data-test="prompt-toolbar-table"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="prompt-table-toolbar"]').exists()).toBe(true)

    function tableDimensions() {
      const table = lastEmittedDocument(wrapper).content.find((node) => node.type === 'table')
      const rows = table?.content ?? []
      return { rows: rows.length, columns: rows[0]?.content?.length ?? 0 }
    }

    const initial = tableDimensions()

    await wrapper.find('[data-test="prompt-table-add-column"]').trigger('click')
    await nextTick()
    expect(tableDimensions().columns).toBe(initial.columns + 1)

    await wrapper.find('[data-test="prompt-table-add-row"]').trigger('click')
    await nextTick()
    expect(tableDimensions().rows).toBe(initial.rows + 1)

    await wrapper.find('[data-test="prompt-table-delete-row"]').trigger('click')
    await nextTick()
    expect(tableDimensions().rows).toBe(initial.rows)

    await wrapper.find('[data-test="prompt-table-delete-column"]').trigger('click')
    await nextTick()
    expect(tableDimensions().columns).toBe(initial.columns)

    await wrapper.find('[data-test="prompt-table-delete"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="prompt-table-toolbar"]').exists()).toBe(false)
    expect(lastEmittedDocument(wrapper).content.some((node) => node.type === 'table')).toBe(false)
  })

  it('toggles a cell between header and regular, and paints its background and border', async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') } })
    await nextTick()
    await wrapper.find('[data-test="prompt-toolbar-table"]').trigger('click')
    await nextTick()

    function firstCell() {
      const table = lastEmittedDocument(wrapper).content.find((node) => node.type === 'table')
      return table?.content?.[0]?.content?.[0]
    }

    // insertTable's withHeaderRow default means the cursor starts inside a
    // header cell — toggling header row switches it to a plain cell.
    expect(firstCell()?.type).toBe('tableHeader')
    await wrapper.find('[data-test="prompt-table-toggle-header-row"]').trigger('click')
    await nextTick()
    expect(firstCell()?.type).toBe('tableCell')

    await wrapper.find('[data-test="prompt-table-toggle-header-cell"]').trigger('click')
    await nextTick()
    expect(firstCell()?.type).toBe('tableHeader')

    // toggleHeaderColumn's effect depends on whether every cell in the
    // column is already a header (prosemirror-tables toggles the whole
    // column uniformly), so it isn't asserted precisely here — just that
    // the button exists and doesn't throw.
    await wrapper.find('[data-test="prompt-table-toggle-header-column"]').trigger('click')
    await nextTick()

    expect(firstCell()?.attrs?.borderColor).toBeFalsy()
    await wrapper.find('[data-test="prompt-table-toggle-border"]').trigger('click')
    await nextTick()
    expect(firstCell()?.attrs?.borderColor).toBe('transparent')
    await wrapper.find('[data-test="prompt-table-toggle-border"]').trigger('click')
    await nextTick()
    expect(firstCell()?.attrs?.borderColor).toBeFalsy()

    const swatch = COLOR_PALETTE[3]
    await wrapper.find('[data-test="prompt-table-cell-background-trigger"]').trigger('click')
    await wrapper.find(`[data-test="color-swatch-${swatch.key}"]`).trigger('click')
    await nextTick()
    expect(firstCell()?.attrs?.backgroundColor).toBe(swatch.hex)

    await wrapper.find('[data-test="prompt-table-cell-background-trigger"]').trigger('click')
    await wrapper.find('[data-test="color-palette-clear"]').trigger('click')
    await nextTick()
    expect(firstCell()?.attrs?.backgroundColor).toBeFalsy()
  })

  it('has merge and split cell buttons available inside a table', async () => {
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') } })
    await nextTick()
    await wrapper.find('[data-test="prompt-toolbar-table"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-test="prompt-table-merge-cells"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="prompt-table-split-cell"]').exists()).toBe(true)

    // A no-op in this environment (mergeCells/splitCell require a real
    // multi-cell CellSelection, not reliably constructable from a click in
    // jsdom), but must not throw.
    await wrapper.find('[data-test="prompt-table-merge-cells"]').trigger('click')
    await wrapper.find('[data-test="prompt-table-split-cell"]').trigger('click')
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

  it('shows a toast and does not insert an image when the upload fails', async () => {
    useToast().clear()
    upload.mockRejectedValueOnce(new Error('Upload failed with status 500'))
    const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('') } })
    await nextTick()

    const file = new File(['x'], 'circle.png', { type: 'image/png' })
    const input = wrapper.find('[data-test="prompt-toolbar-image-input"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await nextTick()
    await nextTick()

    expect(useToast().toasts.value).toContainEqual(
      expect.objectContaining({ kind: 'error', message: 'Upload failed with status 500' }),
    )
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })
})
