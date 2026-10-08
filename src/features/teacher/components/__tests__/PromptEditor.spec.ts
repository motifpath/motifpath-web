import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const upload = vi.fn()
vi.mock('@/features/teacher/composables/useMediaUpload', () => ({
  useMediaUpload: () => ({ upload }),
}))
// An inline diagram's preview loads through the API; these tests only need it to stay loading.
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: () => new Promise(() => {}) }, eventApi: {} }),
}))

import DiagramEmbedPickerModal from '@/features/teacher/components/DiagramEmbedPickerModal.vue'
import SongChartPickerModal from '@/features/teacher/components/SongChartPickerModal.vue'
import PromptEditor from '@/features/teacher/components/PromptEditor.vue'
import { useToast } from '@/shared/composables/useToast'
import { coloredTextPrompt, plainTextPrompt } from '@/shared/testUtils/promptDocument'
import { COLOR_PALETTE } from '@/shared/utils/colorPalette'
import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']
type DiagramRef = components['schemas']['DiagramRef']

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
      'diagram',
      'font-color',
      'background-color',
    ]
    const paletteMenus = new Set(['font-color', 'background-color'])
    for (const name of expected) {
      const selector = paletteMenus.has(name) ? `prompt-toolbar-${name}-trigger` : `prompt-toolbar-${name}`
      expect(wrapper.find(`[data-test="${selector}"]`).exists(), name).toBe(true)
    }
  })

  it('shows the font and background color at the cursor on the toolbar indicators', async () => {
    const doc = coloredTextPrompt('Hello', { color: '#EF4444', backgroundColor: '#3B82F6' })
    const wrapper = mount(PromptEditor, { props: { modelValue: doc } })
    await nextTick()
    await nextTick()

    expect(wrapper.get('[data-test="prompt-toolbar-font-color-indicator"]').attributes('data-color')).toBe('#EF4444')
    expect(wrapper.get('[data-test="prompt-toolbar-background-color-indicator"]').attributes('data-color')).toBe('#3B82F6')
  })

  describe('with the text selected', () => {
    async function selectAll(wrapper: ReturnType<typeof mount>) {
      await wrapper.get('.ProseMirror').trigger('keydown', { key: 'a', ctrlKey: true })
      await nextTick()
    }

    function styleOfFirstText(wrapper: ReturnType<typeof mount>): Record<string, unknown> {
      const text = lastEmittedDocument(wrapper).content[0]?.content?.[0]
      return (text?.marks?.find((m) => m.type === 'textStyle')?.attrs ?? {}) as Record<string, unknown>
    }

    it('applies a chosen font color and background color to the selection', async () => {
      const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') } })
      await nextTick()
      await nextTick()
      await selectAll(wrapper)

      await wrapper.get('[data-test="prompt-toolbar-font-color-trigger"]').trigger('click')
      await wrapper.get(`[data-test="color-swatch-${COLOR_PALETTE[0].key}"]`).trigger('click')
      await wrapper.get('[data-test="prompt-toolbar-background-color-trigger"]').trigger('click')
      await wrapper.get(`[data-test="color-swatch-${COLOR_PALETTE[5].key}"]`).trigger('click')
      await nextTick()

      expect(styleOfFirstText(wrapper)).toMatchObject({ color: COLOR_PALETTE[0].hex, backgroundColor: COLOR_PALETTE[5].hex })
    })

    it('removes the font color and the background color when the default swatch is chosen', async () => {
      const doc = coloredTextPrompt('Hello', { color: '#EF4444', backgroundColor: '#3B82F6' })
      const wrapper = mount(PromptEditor, { props: { modelValue: doc } })
      await nextTick()
      await nextTick()
      await selectAll(wrapper)

      await wrapper.get('[data-test="prompt-toolbar-font-color-trigger"]').trigger('click')
      await wrapper.get('[data-test="color-palette-clear"]').trigger('click')
      await wrapper.get('[data-test="prompt-toolbar-background-color-trigger"]').trigger('click')
      await wrapper.get('[data-test="color-palette-clear"]').trigger('click')
      await nextTick()

      const style = styleOfFirstText(wrapper)
      expect(style.color ?? null).toBeNull()
      expect(style.backgroundColor ?? null).toBeNull()
    })
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
    expect(wrapper.get(`[data-test="color-swatch-${swatch.key}"]`).attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-test="prompt-table-cell-background-indicator"]').attributes('data-color')).toBe(swatch.hex)
    await wrapper.find('[data-test="prompt-table-cell-background-trigger"]').trigger('click')

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

  describe('inline diagrams', () => {
    const penta: DiagramRef = { diagram_id: 'd-penta', layers: { intervals: true, subset: null } }
    const rootsOnly: DiagramRef = { diagram_id: 'd-penta', layers: { intervals: false, subset: ['R'] } }
    const other: DiagramRef = { diagram_id: 'd-other', layers: { intervals: true, subset: null } }

    function withDiagram(attrs: Record<string, unknown>): PromptDocument {
      return {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
          { type: 'diagram', attrs },
          { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
        ],
      }
    }

    async function mountEditor(modelValue: PromptDocument) {
      const wrapper = mount(PromptEditor, { props: { modelValue }, global: { stubs: { teleport: true } } })
      await nextTick()
      await nextTick()
      return wrapper
    }

    function diagramNodes(doc: PromptDocument) {
      return doc.content.filter((node) => node.type === 'diagram')
    }

    it('opens the diagram picker to insert a new diagram', async () => {
      const wrapper = await mountEditor(plainTextPrompt('Hi'))

      await wrapper.get('[data-test="prompt-toolbar-diagram"]').trigger('click')

      const modal = wrapper.getComponent(DiagramEmbedPickerModal)
      expect(modal.props('open')).toBe(true)
      expect(modal.props('initial')).toBeNull()
      expect(modal.props('editing')).toBe(false)
    })

    it('inserts the picked diagram as a diagram node carrying its ref', async () => {
      const wrapper = await mountEditor(plainTextPrompt('Hi'))
      await wrapper.get('[data-test="prompt-toolbar-diagram"]').trigger('click')

      wrapper.getComponent(DiagramEmbedPickerModal).vm.$emit('apply', penta)
      await nextTick()

      const nodes = diagramNodes(lastEmittedDocument(wrapper))
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.attrs?.diagramRef).toEqual(penta)
      expect(wrapper.getComponent(DiagramEmbedPickerModal).props('open')).toBe(false)
    })

    it('keeps an existing diagram node, with its attrs, through an edit elsewhere', async () => {
      const wrapper = await mountEditor(withDiagram({ diagramRef: penta }))

      expect(wrapper.find('[data-test="prompt-diagram-node"]').exists()).toBe(true)
      await wrapper.get('[data-test="prompt-toolbar-bold"]').trigger('click')
      await wrapper.get('.ProseMirror').trigger('keydown', { key: 'a', ctrlKey: true })
      await wrapper.get('[data-test="prompt-toolbar-h1"]').trigger('click')
      await nextTick()

      const nodes = diagramNodes(lastEmittedDocument(wrapper))
      expect(nodes).toHaveLength(1)
      expect(nodes[0]!.attrs?.diagramRef).toEqual(penta)
    })

    it('reopens the picker on a diagram node’s edit button and updates it in place', async () => {
      const wrapper = await mountEditor(withDiagram({ diagramRef: penta }))

      await wrapper.get('[data-test="prompt-diagram-edit"]').trigger('click')
      const modal = wrapper.getComponent(DiagramEmbedPickerModal)
      expect(modal.props('initial')).toEqual(penta)

      modal.vm.$emit('apply', rootsOnly)
      await nextTick()

      const doc = lastEmittedDocument(wrapper)
      expect(diagramNodes(doc)).toHaveLength(1)
      expect(diagramNodes(doc)[0]!.attrs?.diagramRef).toEqual(rootsOnly)
      expect(doc.content.map((n) => n.type)).toEqual(['paragraph', 'diagram', 'paragraph'])
    })

    it('replaces a stacked diagram with the single one picked, since only one can be picked', async () => {
      const wrapper = await mountEditor(withDiagram({ diagramStackRef: { stack: [penta, other] } }))

      await wrapper.get('[data-test="prompt-diagram-edit"]').trigger('click')
      const modal = wrapper.getComponent(DiagramEmbedPickerModal)
      expect(modal.props('initial')).toBeNull()
      expect(modal.props('editing')).toBe(true)

      modal.vm.$emit('apply', other)
      await nextTick()

      const node = diagramNodes(lastEmittedDocument(wrapper))[0]!
      expect(node.attrs?.diagramRef).toEqual(other)
      expect(node.attrs?.diagramStackRef ?? null).toBeNull()
    })

    it('keeps a diagram node it can’t read findable, with a placeholder', async () => {
      const wrapper = await mountEditor(withDiagram({}))

      expect(wrapper.find('[data-test="prompt-diagram-unavailable"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="prompt-diagram-edit"]').exists()).toBe(true)
    })

    it('removes a diagram node on its remove button', async () => {
      const wrapper = await mountEditor(withDiagram({ diagramRef: penta }))

      await wrapper.get('[data-test="prompt-diagram-remove"]').trigger('click')
      await nextTick()

      expect(diagramNodes(lastEmittedDocument(wrapper))).toHaveLength(0)
    })
  })

  describe('song charts', () => {
    // The picker and the card load charts themselves; their own specs cover that.
    const stubs = { teleport: true, SongChartPickerModal: true, SongChartCard: { props: ['songChartId'], template: '<div data-test="song-chart-card" :data-song-chart-id="songChartId" />' } }

    it('offers no song chart where song charts have no place, such as an exercise prompt', async () => {
      const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Hello') }, global: { stubs } })
      await nextTick()

      expect(wrapper.find('[data-test="prompt-toolbar-song-chart"]').exists()).toBe(false)
    })

    it('inserts the picked song chart', async () => {
      const wrapper = mount(PromptEditor, { props: { modelValue: plainTextPrompt('Play along'), songCharts: true }, global: { stubs } })
      await nextTick()

      await wrapper.get('[data-test="prompt-toolbar-song-chart"]').trigger('click')
      expect(wrapper.getComponent(SongChartPickerModal).props('open')).toBe(true)
      wrapper.getComponent(SongChartPickerModal).vm.$emit('pick', 'chart-asa-branca')
      await nextTick()

      const nodes = lastEmittedDocument(wrapper).content
      expect(nodes.find((n) => n.type === 'songChart')?.attrs).toEqual({ songChartId: 'chart-asa-branca' })
      expect(wrapper.getComponent(SongChartPickerModal).props('open')).toBe(false)
    })

    it('shows an embedded song chart as its card', async () => {
      const modelValue: PromptDocument = { type: 'doc', content: [{ type: 'songChart', attrs: { songChartId: 'chart-asa-branca' } }] }
      const wrapper = mount(PromptEditor, { props: { modelValue, songCharts: true }, global: { stubs } })
      await nextTick()
      await nextTick()

      expect(wrapper.get('[data-test="song-chart-card"]').attributes('data-song-chart-id')).toBe('chart-asa-branca')
    })
  })
})
