import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/vue-3'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const upload = vi.fn()
vi.mock('@/features/teacher/composables/useMediaUpload', () => ({
  useMediaUpload: () => ({ upload }),
}))
// An inline diagram's preview loads through the API; these tests only need it to stay loading.
const GET = vi.fn<(path: string) => Promise<never>>(() => new Promise(() => {}))
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import DiagramEmbedPickerModal from '@/features/teacher/components/DiagramEmbedPickerModal.vue'
import SongChartPickerModal from '@/features/teacher/components/SongChartPickerModal.vue'
import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import { useToast } from '@/shared/composables/useToast'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import { mockViewport } from '@/shared/testUtils/viewport'
import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']

// Returning the cursor to the text scrolls it into view, which measures ranges — jsdom has no
// layout, and measures ranges not at all, so they borrow an element's empty geometry.
Range.prototype.getClientRects ??= () => document.createElement('div').getClientRects()
Range.prototype.getBoundingClientRect ??= () => document.createElement('div').getBoundingClientRect()

const PHONE_WIDTH = 390
// The picker and the card load charts themselves; their own specs cover that.
const stubs = {
  SongChartPickerModal: true,
  SongChartCard: { props: ['songChartId'], template: '<div data-test="song-chart-card" />' },
}

let wrapper: VueWrapper | null = null

async function mountEditor(modelValue: PromptDocument, { songCharts = false } = {}) {
  wrapper = mount(PromptEditor, { props: { modelValue, songCharts, label: 'Prompt' }, attachTo: document.body, global: { stubs } })
  await nextTick()
  await nextTick()
  return wrapper
}

function editorOf(w: VueWrapper): Editor {
  return w.findComponent(EditorContent).props('editor') as Editor
}

function lastEmittedDocument(w: VueWrapper): PromptDocument {
  const events = w.emitted<[PromptDocument]>('update:modelValue')
  if (!events || events.length === 0) throw new Error('update:modelValue was never emitted')
  return events[events.length - 1]![0]
}

function find(testId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-test="${testId}"]`)
}
function get(testId: string): HTMLElement {
  const element = find(testId)
  if (!element) throw new Error(`[data-test="${testId}"] is not on the page`)
  return element
}
async function tap(testId: string) {
  get(testId).click()
  await nextTick()
  await nextTick()
}

/** Puts the cursor in the editor, as a tap into the prompt does. */
async function focusEditor(w: VueWrapper) {
  await w.get('.ProseMirror').trigger('focus')
  await nextTick()
}

async function selectAll(w: VueWrapper) {
  editorOf(w).commands.selectAll()
  await focusEditor(w)
}

function tableDimensions(doc: PromptDocument) {
  const table = doc.content.find((node) => node.type === 'table')
  const rows = table?.content ?? []
  return { rows: rows.length, columns: rows[0]?.content?.length ?? 0, firstRow: rows[0]?.content?.map((c) => c.type) }
}

async function insertTable(w: VueWrapper) {
  await focusEditor(w)
  await tap('prompt-bar-insert')
  await tap('prompt-insert-table')
  await focusEditor(w)
}

describe('PromptEditor on a phone', () => {
  beforeEach(() => {
    mockViewport(PHONE_WIDTH)
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  describe('the docked bar', () => {
    it("replaces today's one-row toolbar", async () => {
      await mountEditor(plainTextPrompt('Hello'))

      expect(find('prompt-toolbar-h1')).toBeNull()
    })

    it('shows only while the prompt has focus', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      expect(find('prompt-docked-bar')).toBeNull()

      await focusEditor(w)

      expect(find('prompt-docked-bar')).not.toBeNull()
      for (const name of ['undo', 'redo', 'format', 'bold', 'italic', 'list', 'insert', 'hide-keyboard']) {
        expect(find(`prompt-bar-${name}`), name).not.toBeNull()
      }
    })

    it('is gone once Hide keyboard takes the focus away', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await focusEditor(w)

      await tap('prompt-bar-hide-keyboard')
      await w.get('.ProseMirror').trigger('blur')

      expect(find('prompt-docked-bar')).toBeNull()
    })

    it.each([
      ['bold', (doc: PromptDocument) => doc.content[0]?.content?.[0]?.marks?.some((m) => m.type === 'bold')],
      ['italic', (doc: PromptDocument) => doc.content[0]?.content?.[0]?.marks?.some((m) => m.type === 'italic')],
      ['list', (doc: PromptDocument) => doc.content[0]?.type === 'bulletList'],
    ])('%s acts on the selection at once and shows as active', async (name, applied) => {
      const w = await mountEditor(plainTextPrompt('string 5'))
      await selectAll(w)

      await tap(`prompt-bar-${name}`)

      expect(applied(lastEmittedDocument(w))).toBe(true)
      expect(get(`prompt-bar-${name}`).getAttribute('aria-pressed')).toBe('true')
    })

    it('disables Undo and Redo while there is nothing to undo or redo', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await focusEditor(w)

      expect(get('prompt-bar-undo').hasAttribute('disabled')).toBe(true)
      expect(get('prompt-bar-redo').hasAttribute('disabled')).toBe(true)
    })
  })

  describe('Format', () => {
    it('offers every style, mark, colour, alignment and list command', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await focusEditor(w)

      await tap('prompt-bar-format')

      const sheet = get('prompt-format-sheet')
      for (const name of [
        'paragraph', 'h1', 'h2', 'h3',
        'bold', 'italic', 'strike', 'highlight',
        'align-left', 'align-center', 'align-right', 'align-justify',
        'bullet-list', 'ordered-list',
      ]) {
        expect(sheet.querySelector(`[data-test="prompt-format-${name}"]`), name).not.toBeNull()
      }
      expect(sheet.querySelector('[data-test="prompt-format-text-colour"] [data-test="color-palette"]')).not.toBeNull()
      expect(sheet.querySelector('[data-test="prompt-format-background"] [data-test="color-palette"]')).not.toBeNull()
    })

    it('applies a choice at once and stays open', async () => {
      const w = await mountEditor(plainTextPrompt('Find the A'))
      await selectAll(w)
      await tap('prompt-bar-format')

      await tap('prompt-format-h1')

      expect(lastEmittedDocument(w).content[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } })
      expect(get('prompt-format-h1').getAttribute('aria-pressed')).toBe('true')
      expect(find('prompt-format-sheet')).not.toBeNull()
    })

    it('steps the bar aside while the sheet is open, and returns to typing when it closes', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await focusEditor(w)
      await tap('prompt-bar-format')
      // The bar sits above every layer — a pop-up's modal included — so it would cover the sheet.
      expect(find('prompt-docked-bar')).toBeNull()

      const focus = vi.spyOn(editorOf(w).view, 'focus')
      await tap('overlay-close')
      await new Promise((resolve) => requestAnimationFrame(resolve))

      expect(find('prompt-format-sheet')).toBeNull()
      expect(focus).toHaveBeenCalled()
    })
  })

  describe('Insert', () => {
    it('offers Link, Table, Image and Diagram in an exercise prompt, and no song chart', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await focusEditor(w)

      await tap('prompt-bar-insert')

      for (const name of ['link', 'table', 'image', 'diagram']) {
        expect(find(`prompt-insert-${name}`), name).not.toBeNull()
      }
      expect(find('prompt-insert-song-chart')).toBeNull()
    })

    it('also offers a song chart in an article', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'), { songCharts: true })
      await focusEditor(w)

      await tap('prompt-bar-insert')

      expect(find('prompt-insert-song-chart')).not.toBeNull()
    })

    it('inserts a 3 × 3 table with a header row', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await focusEditor(w)
      await tap('prompt-bar-insert')

      await tap('prompt-insert-table')

      expect(tableDimensions(lastEmittedDocument(w))).toEqual({
        rows: 3,
        columns: 3,
        firstRow: ['tableHeader', 'tableHeader', 'tableHeader'],
      })
      expect(find('prompt-insert-sheet')).toBeNull()
    })

    it('picks an image from the phone, uploads it and inserts it', async () => {
      upload.mockResolvedValueOnce('https://cdn.example.com/library/circle.png')
      const w = await mountEditor(plainTextPrompt(''))
      await focusEditor(w)
      await tap('prompt-bar-insert')
      const input = w.get<HTMLInputElement>('[data-test="prompt-toolbar-image-input"]')
      const click = vi.spyOn(input.element, 'click')

      await tap('prompt-insert-image')
      expect(click).toHaveBeenCalled()

      const file = new File(['x'], 'circle.png', { type: 'image/png' })
      Object.defineProperty(input.element, 'files', { value: [file] })
      await input.trigger('change')
      await nextTick()
      await nextTick()

      expect(upload).toHaveBeenCalledWith(file, 'image')
      expect(lastEmittedDocument(w).content.some((node) => node.type === 'image')).toBe(true)
    })

    it('inserts nothing and says so when the image fails to upload', async () => {
      useToast().clear()
      upload.mockRejectedValueOnce(new Error('The image could not be uploaded'))
      const w = await mountEditor(plainTextPrompt('Hello'))
      await focusEditor(w)
      await tap('prompt-bar-insert')
      await tap('prompt-insert-image')

      const input = w.get<HTMLInputElement>('[data-test="prompt-toolbar-image-input"]')
      Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })] })
      await input.trigger('change')
      await nextTick()
      await nextTick()

      expect(w.emitted('update:modelValue')).toBeUndefined()
      expect(useToast().toasts.value.map((toast) => toast.message)).toContain('The image could not be uploaded')
    })

    it('opens the diagram picker for a diagram', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await focusEditor(w)
      await tap('prompt-bar-insert')

      await tap('prompt-insert-diagram')

      expect(w.getComponent(DiagramEmbedPickerModal).props()).toMatchObject({ open: true, editing: false })
    })
  })

  describe('Link', () => {
    it('sets a link on the selection from the Link sheet', async () => {
      const w = await mountEditor(plainTextPrompt('the open string'))
      await selectAll(w)
      await tap('prompt-bar-insert')
      await tap('prompt-insert-link')

      const input = get('prompt-link-address') as HTMLInputElement
      input.value = 'https://example.com/open-strings'
      input.dispatchEvent(new Event('input'))
      await nextTick()
      await tap('prompt-link-apply')

      const text = lastEmittedDocument(w).content[0]?.content?.[0]
      expect(text?.marks).toContainEqual({ type: 'link', attrs: expect.objectContaining({ href: 'https://example.com/open-strings' }) })
      expect(find('prompt-link-address')).toBeNull()
    })

    it('removes the link the cursor is in', async () => {
      const linked: PromptDocument = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'open', marks: [{ type: 'link', attrs: { href: 'https://example.com/old' } }] }],
          },
        ],
      }
      const w = await mountEditor(linked)
      editorOf(w).commands.setTextSelection(2)
      await focusEditor(w)
      await tap('prompt-bar-insert')
      await tap('prompt-insert-link')

      expect((get('prompt-link-address') as HTMLInputElement).value).toBe('https://example.com/old')
      await tap('prompt-link-remove')

      expect(lastEmittedDocument(w).content[0]?.content?.[0]?.marks ?? []).toEqual([])
    })
  })

  describe('tables', () => {
    it('shows a Table chip in place of Italic and List inside a table', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await focusEditor(w)
      expect(find('prompt-bar-table')).toBeNull()

      await insertTable(w)

      expect(find('prompt-bar-table')).not.toBeNull()
      expect(find('prompt-bar-italic')).toBeNull()
      expect(find('prompt-bar-list')).toBeNull()
    })

    it("offers today's table commands as named icon buttons", async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await insertTable(w)

      await tap('prompt-bar-table')

      for (const name of [
        'add-column', 'delete-column', 'add-row', 'delete-row',
        'toggle-header-row', 'toggle-header-column', 'toggle-header-cell',
        'merge-cells', 'split-cell', 'toggle-border', 'delete',
      ]) {
        const button = find(`prompt-table-${name}`)
        expect(button, name).not.toBeNull()
        expect(button!.getAttribute('aria-label'), name).toBeTruthy()
      }
      expect(find('prompt-table-cell-background')?.querySelector('[data-test="color-palette"]')).not.toBeNull()
    })

    it('merges the cells a drag across them selects, and splits them again', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await insertTable(w)
      const editor = editorOf(w)
      // A touch drag across cells reaches the editor as a text selection from one cell's text
      // into another's — what a long press and a drag of the selection handles produce.
      const cellStarts: number[] = []
      editor.state.doc.descendants((node, at) => {
        if (node.type.name === 'tableCell') cellStarts.push(at)
      })
      editor.commands.setTextSelection({ from: cellStarts[0]! + 2, to: cellStarts[1]! + 2 })
      await nextTick()
      await tap('prompt-bar-table')

      expect(get('prompt-table-merge-cells').hasAttribute('disabled')).toBe(false)
      await tap('prompt-table-merge-cells')

      const secondRow = () => lastEmittedDocument(w).content.find((n) => n.type === 'table')?.content?.[1]?.content ?? []
      expect(secondRow()).toHaveLength(2)
      expect(secondRow()[0]?.attrs?.colspan).toBe(2)

      expect(get('prompt-table-split-cell').hasAttribute('disabled')).toBe(false)
      await tap('prompt-table-split-cell')
      expect(secondRow()).toHaveLength(3)
    })

    it('runs a table command on the table the cursor is in', async () => {
      const w = await mountEditor(plainTextPrompt('Hello'))
      await insertTable(w)
      await tap('prompt-bar-table')

      await tap('prompt-table-add-column')

      expect(tableDimensions(lastEmittedDocument(w)).columns).toBe(4)
    })
  })

  describe('embedded blocks', () => {
    async function selectNode(w: VueWrapper, type: string) {
      const editor = editorOf(w)
      let pos = -1
      editor.state.doc.descendants((node, at) => {
        if (node.type.name === type) pos = at
      })
      editor.commands.setNodeSelection(pos)
      await focusEditor(w)
    }

    it('offers Edit on a selected diagram, which opens the picker on its settings', async () => {
      const w = await mountEditor({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
          { type: 'diagram', attrs: { diagramRef: { diagram_id: 'd-a5', layers: { intervals: true, subset: null } } } },
        ],
      })
      await focusEditor(w)
      expect(find('prompt-bar-edit')).toBeNull()

      await selectNode(w, 'diagram')
      await tap('prompt-bar-edit')

      expect(w.getComponent(DiagramEmbedPickerModal).props()).toMatchObject({
        open: true,
        editing: true,
        initial: { diagram_id: 'd-a5' },
      })
    })

    it('offers Edit on a selected song chart, which opens the picker to replace it', async () => {
      const w = await mountEditor(
        {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Play along' }] },
            { type: 'songChart', attrs: { songChartId: 'chart-amazing-grace' } },
          ],
        },
        { songCharts: true },
      )

      await selectNode(w, 'songChart')
      await tap('prompt-bar-edit')

      expect(w.getComponent(SongChartPickerModal).props('open')).toBe(true)
    })
  })
})
