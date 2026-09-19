<script setup lang="ts">
import Bold from '@tiptap/extension-bold'
import BulletList from '@tiptap/extension-bullet-list'
import Document from '@tiptap/extension-document'
import Heading from '@tiptap/extension-heading'
import Highlight from '@tiptap/extension-highlight'
import History from '@tiptap/extension-history'
import TiptapImage from '@tiptap/extension-image'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Paragraph from '@tiptap/extension-paragraph'
import Strike from '@tiptap/extension-strike'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'

// TableCell/TableHeader ship no styling attrs of their own — extended here
// with backgroundColor and borderColor (rendered as inline style, merged
// into the cell's own HTML attrs by Tiptap's attribute pipeline) so the
// paint-cell-background and toggle-border toolbar controls have somewhere
// to persist their value.
const cellStyleAttributes = {
  backgroundColor: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
    renderHTML: (attributes: { backgroundColor?: string | null }) => {
      if (!attributes.backgroundColor) return {}
      return { style: `background-color: ${attributes.backgroundColor}` }
    },
  },
  borderColor: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.borderColor || null,
    renderHTML: (attributes: { borderColor?: string | null }) => {
      if (!attributes.borderColor) return {}
      return { style: `border-color: ${attributes.borderColor}` }
    },
  },
}
const StyledTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellStyleAttributes }
  },
})
const StyledTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellStyleAttributes }
  },
})
import TextAlign from '@tiptap/extension-text-align'
import TiptapText from '@tiptap/extension-text'
import { BackgroundColor, Color, TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import {
  Baseline,
  Bold as BoldIcon,
  Columns3,
  Redo2,
  Undo2,
  Frame,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic as ItalicIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Merge,
  Minus,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  PaintBucket,
  PanelLeft,
  PanelTop,
  Pilcrow,
  Plus,
  Rows3,
  Split,
  SquareDashed,
  Strikethrough,
  Table2,
  Trash2,
} from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import { useMediaUpload } from '@/features/teacher/composables/useMediaUpload'
import { useToast } from '@/shared/composables/useToast'
import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']

const props = defineProps<{ modelValue: PromptDocument }>()
const emit = defineEmits<{ 'update:modelValue': [document: PromptDocument] }>()

const { upload } = useMediaUpload()
const toast = useToast()
const { t } = useTypedT()
const imageInput = ref<HTMLInputElement | null>(null)

// Tiptap's JSONContent and our wire PromptDocument describe the same shape
// (ProseMirror JSON: doc -> nodes -> marks), but Tiptap's own type leaves
// attrs/content/marks loosely typed. A JSON round trip bridges the two
// without either side reading through an untyped structure directly.
function toWireDocument(json: unknown): PromptDocument {
  return JSON.parse(JSON.stringify(json))
}

const activeStateTick = ref(0)

const editor = useEditor({
  content: toWireDocument(props.modelValue),
  extensions: [
    History,
    Document,
    Paragraph,
    TiptapText,
    Heading.configure({ levels: [1, 2, 3] }),
    Bold,
    Italic,
    Strike,
    Highlight,
    TextStyle,
    Color,
    BackgroundColor,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    BulletList,
    OrderedList,
    ListItem,
    Link.configure({ openOnClick: false }),
    Table,
    TableRow,
    StyledTableHeader,
    StyledTableCell,
    TiptapImage,
  ],
  onUpdate: ({ editor: current }) => {
    emit('update:modelValue', toWireDocument(current.getJSON()))
  },
  // @tiptap/vue-3's editor ref is a plain shallowRef set once on mount —
  // it never re-fires Vue's reactivity on its own, so isActive() calls in
  // the template (button highlighting, the table-controls v-if) would
  // otherwise never re-evaluate as the selection moves or marks toggle.
  // Bumping this counter on every transaction, and reading it inside the
  // isActive() helper below, gives the template a dependency to re-render
  // the whole toolbar on.
  onTransaction: () => {
    activeStateTick.value++
  },
})

function isActive(
  nameOrAttrs: string | Record<string, unknown>,
  attrs?: Record<string, unknown>,
): boolean {
  void activeStateTick.value
  if (!editor.value) return false
  return typeof nameOrAttrs === 'string'
    ? editor.value.isActive(nameOrAttrs, attrs)
    : editor.value.isActive(nameOrAttrs)
}

function canUndo(): boolean {
  void activeStateTick.value
  return editor.value?.can().undo() ?? false
}
function canRedo(): boolean {
  void activeStateTick.value
  return editor.value?.can().redo() ?? false
}
function undo() {
  editor.value?.chain().focus().undo().run()
}
function redo() {
  editor.value?.chain().focus().redo().run()
}

// The prompt field can be reloaded out from under the editor when a teacher
// navigates directly between two exercises' edit routes without this
// component remounting — keep the editor's content in sync with the prop
// whenever it changes to something the editor didn't itself just emit.
watch(
  () => props.modelValue,
  (next) => {
    if (!editor.value) return
    if (JSON.stringify(editor.value.getJSON()) === JSON.stringify(next)) return
    editor.value.commands.setContent(toWireDocument(next))
  },
)

function setHeading(level: 1 | 2 | 3) {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}
function setParagraph() {
  editor.value?.chain().focus().setParagraph().run()
}
function setAlign(align: 'left' | 'center' | 'right' | 'justify') {
  editor.value?.chain().focus().setTextAlign(align).run()
}
function insertTable() {
  editor.value?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()
}
function addColumn() {
  editor.value?.chain().focus().addColumnAfter().run()
}
function deleteColumn() {
  editor.value?.chain().focus().deleteColumn().run()
}
function addRow() {
  editor.value?.chain().focus().addRowAfter().run()
}
function deleteRow() {
  editor.value?.chain().focus().deleteRow().run()
}
function deleteTable() {
  editor.value?.chain().focus().deleteTable().run()
}
function toggleHeaderRow() {
  editor.value?.chain().focus().toggleHeaderRow().run()
}
function toggleHeaderColumn() {
  editor.value?.chain().focus().toggleHeaderColumn().run()
}
function toggleHeaderCell() {
  editor.value?.chain().focus().toggleHeaderCell().run()
}
function mergeCells() {
  editor.value?.chain().focus().mergeCells().run()
}
function splitCell() {
  editor.value?.chain().focus().splitCell().run()
}
function currentCellAttrs(): Record<string, unknown> {
  if (!editor.value) return {}
  return editor.value.isActive('tableHeader') ? editor.value.getAttributes('tableHeader') : editor.value.getAttributes('tableCell')
}
function toggleCellBorder() {
  const hasNoBorder = currentCellAttrs().borderColor === 'transparent'
  editor.value?.chain().focus().setCellAttribute('borderColor', hasNoBorder ? null : 'transparent').run()
}
function setCellBackground(event: Event) {
  const color = (event.target as HTMLInputElement).value
  editor.value?.chain().focus().setCellAttribute('backgroundColor', color).run()
}
function setLink() {
  const url = window.prompt(t('promptEditor.linkUrlPrompt'))
  if (!url) return
  editor.value?.chain().focus().setLink({ href: url }).run()
}
function setFontColor(event: Event) {
  const color = (event.target as HTMLInputElement).value
  editor.value?.chain().focus().setColor(color).run()
}
function setBackgroundColor(event: Event) {
  const color = (event.target as HTMLInputElement).value
  editor.value?.chain().focus().setBackgroundColor(color).run()
}
function pickImage() {
  imageInput.value?.click()
}
async function onImagePicked(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return

  try {
    const src = await upload(file, 'image')
    editor.value?.chain().focus().setImage({ src }).run()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('promptEditor.imageUploadFailed'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="sticky top-16 z-10 flex flex-col gap-1.5 bg-surface pb-1.5">
      <div
        class="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface-sunken p-1.5"
      >
        <button
          type="button"
          data-test="prompt-toolbar-undo"
          class="rounded p-1.5 text-ink-muted disabled:opacity-40"
          :title="t('promptEditor.undo')"
          :disabled="!canUndo()"
          @click="undo()"
        >
          <Undo2 :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-redo"
          class="rounded p-1.5 text-ink-muted disabled:opacity-40"
          :title="t('promptEditor.redo')"
          :disabled="!canRedo()"
          @click="redo()"
        >
          <Redo2 :size="16" aria-hidden="true" />
        </button>

        <div class="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          data-test="prompt-toolbar-h1"
          class="rounded p-1.5"
          :class="isActive('heading', { level: 1 }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="setHeading(1)"
        >
          <Heading1 :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-h2"
          class="rounded p-1.5"
          :class="isActive('heading', { level: 2 }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="setHeading(2)"
        >
          <Heading2 :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-h3"
          class="rounded p-1.5"
          :class="isActive('heading', { level: 3 }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="setHeading(3)"
        >
          <Heading3 :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-paragraph"
          class="rounded p-1.5"
          :class="isActive('paragraph') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="setParagraph()"
        >
          <Pilcrow :size="16" aria-hidden="true" />
        </button>

        <div class="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          data-test="prompt-toolbar-bold"
          class="rounded p-1.5"
          :class="isActive('bold') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="editor?.chain().focus().toggleBold().run()"
        >
          <BoldIcon :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-italic"
          class="rounded p-1.5"
          :class="isActive('italic') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="editor?.chain().focus().toggleItalic().run()"
        >
          <ItalicIcon :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-strike"
          class="rounded p-1.5"
          :class="isActive('strike') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="editor?.chain().focus().toggleStrike().run()"
        >
          <Strikethrough :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-highlight"
          class="rounded p-1.5"
          :class="isActive('highlight') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="editor?.chain().focus().toggleHighlight().run()"
        >
          <Highlighter :size="16" aria-hidden="true" />
        </button>
        <label
          class="relative flex cursor-pointer items-center rounded p-1.5 text-ink-muted"
          :title="t('promptEditor.fontColor')"
        >
          <Baseline :size="16" aria-hidden="true" />
          <input
            type="color"
            data-test="prompt-toolbar-font-color"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            @input="setFontColor"
          />
        </label>
        <label
          class="relative flex cursor-pointer items-center rounded p-1.5 text-ink-muted"
          :title="t('promptEditor.backgroundColor')"
        >
          <PaintBucket :size="16" aria-hidden="true" />
          <input
            type="color"
            data-test="prompt-toolbar-background-color"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            @input="setBackgroundColor"
          />
        </label>

        <div class="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          data-test="prompt-toolbar-align-left"
          class="rounded p-1.5"
          :class="isActive({ textAlign: 'left' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="setAlign('left')"
        >
          <AlignLeft :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-align-center"
          class="rounded p-1.5"
          :class="isActive({ textAlign: 'center' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="setAlign('center')"
        >
          <AlignCenter :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-align-right"
          class="rounded p-1.5"
          :class="isActive({ textAlign: 'right' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="setAlign('right')"
        >
          <AlignRight :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-align-justify"
          class="rounded p-1.5"
          :class="
            isActive({ textAlign: 'justify' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'
          "
          @click="setAlign('justify')"
        >
          <AlignJustify :size="16" aria-hidden="true" />
        </button>

        <div class="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          data-test="prompt-toolbar-bullet-list"
          class="rounded p-1.5"
          :class="isActive('bulletList') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="editor?.chain().focus().toggleBulletList().run()"
        >
          <List :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-ordered-list"
          class="rounded p-1.5"
          :class="isActive('orderedList') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="editor?.chain().focus().toggleOrderedList().run()"
        >
          <ListOrdered :size="16" aria-hidden="true" />
        </button>

        <div class="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          data-test="prompt-toolbar-link"
          class="rounded p-1.5"
          :class="isActive('link') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="setLink()"
        >
          <LinkIcon :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-table"
          class="rounded p-1.5 text-ink-muted"
          @click="insertTable()"
        >
          <Table2 :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-toolbar-image"
          class="rounded p-1.5 text-ink-muted"
          @click="pickImage()"
        >
          <ImageIcon :size="16" aria-hidden="true" />
        </button>
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          class="hidden"
          data-test="prompt-toolbar-image-input"
          @change="onImagePicked"
        />
      </div>

      <div
        v-if="isActive('table')"
        data-test="prompt-table-toolbar"
        class="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface-sunken p-1.5 text-ink-muted"
      >
        <button
          type="button"
          data-test="prompt-table-add-column"
          class="relative rounded p-1.5"
          :title="t('promptEditor.addColumn')"
          @click="addColumn()"
        >
          <Columns3 :size="16" aria-hidden="true" />
          <Plus :size="10" class="absolute bottom-0.5 right-0.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-table-delete-column"
          class="relative rounded p-1.5"
          :title="t('promptEditor.deleteColumn')"
          @click="deleteColumn()"
        >
          <Columns3 :size="16" aria-hidden="true" />
          <Minus :size="10" class="absolute bottom-0.5 right-0.5" aria-hidden="true" />
        </button>
        <div class="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          data-test="prompt-table-add-row"
          class="relative rounded p-1.5"
          :title="t('promptEditor.addRow')"
          @click="addRow()"
        >
          <Rows3 :size="16" aria-hidden="true" />
          <Plus :size="10" class="absolute bottom-0.5 right-0.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-table-delete-row"
          class="relative rounded p-1.5"
          :title="t('promptEditor.deleteRow')"
          @click="deleteRow()"
        >
          <Rows3 :size="16" aria-hidden="true" />
          <Minus :size="10" class="absolute bottom-0.5 right-0.5" aria-hidden="true" />
        </button>
        <div class="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          data-test="prompt-table-toggle-header-row"
          class="rounded p-1.5"
          :title="t('promptEditor.toggleHeaderRow')"
          @click="toggleHeaderRow()"
        >
          <PanelTop :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-table-toggle-header-column"
          class="rounded p-1.5"
          :title="t('promptEditor.toggleHeaderColumn')"
          @click="toggleHeaderColumn()"
        >
          <PanelLeft :size="16" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="prompt-table-toggle-header-cell"
          class="rounded p-1.5"
          :title="t('promptEditor.toggleHeaderCell')"
          @click="toggleHeaderCell()"
        >
          <Frame :size="16" aria-hidden="true" />
        </button>
        <div class="mx-1 h-4 w-px bg-border" />
        <button type="button" data-test="prompt-table-merge-cells" class="rounded p-1.5" :title="t('promptEditor.mergeCells')" @click="mergeCells()">
          <Merge :size="16" aria-hidden="true" />
        </button>
        <button type="button" data-test="prompt-table-split-cell" class="rounded p-1.5" :title="t('promptEditor.splitCell')" @click="splitCell()">
          <Split :size="16" aria-hidden="true" />
        </button>
        <div class="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          data-test="prompt-table-toggle-border"
          class="rounded p-1.5"
          :title="t('promptEditor.toggleCellBorder')"
          @click="toggleCellBorder()"
        >
          <SquareDashed :size="16" aria-hidden="true" />
        </button>
        <label class="relative flex cursor-pointer items-center rounded p-1.5" :title="t('promptEditor.cellBackgroundColor')">
          <PaintBucket :size="16" aria-hidden="true" />
          <input
            type="color"
            data-test="prompt-table-cell-background"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            @input="setCellBackground"
          />
        </label>
        <div class="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          data-test="prompt-table-delete"
          class="rounded p-1.5 text-danger"
          :title="t('promptEditor.deleteTable')"
          @click="deleteTable()"
        >
          <Trash2 :size="16" aria-hidden="true" />
        </button>
      </div>
    </div>

    <EditorContent
      data-test="prompt-editor-content"
      class="prompt-editor-content rounded-md border border-border bg-surface-raised p-3 text-base"
      :editor="editor"
    />
  </div>
</template>

<style scoped>
/* ProseMirror renders these elements itself (via the schema's node/mark
   toDOM), so they can't take Tailwind utility classes through the
   template — this is the one case component-scoped CSS is the only way
   to reach them. Kept visually in step with PromptRenderer's Tailwind
   classes so the editor and the student-facing render don't diverge. */
.prompt-editor-content :deep(.tiptap) {
  min-height: 4.5rem;
  outline: none;
}
.prompt-editor-content :deep(.tiptap h1) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}
.prompt-editor-content :deep(.tiptap h2) {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}
.prompt-editor-content :deep(.tiptap h3) {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}
.prompt-editor-content :deep(.tiptap p) {
  font-size: 0.9375rem;
  line-height: 1.5;
  margin: 0;
}
.prompt-editor-content :deep(.tiptap ul) {
  list-style: disc;
  padding-left: 1.25rem;
}
.prompt-editor-content :deep(.tiptap ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}
.prompt-editor-content :deep(.tiptap a) {
  color: rgb(var(--color-accent));
  text-decoration: underline;
}
.prompt-editor-content :deep(.tiptap mark) {
  background-color: rgb(var(--color-accent-muted));
  border-radius: 0.25rem;
  padding: 0 0.125rem;
}
.prompt-editor-content :deep(.tiptap table) {
  border-collapse: collapse;
  width: 100%;
}
.prompt-editor-content :deep(.tiptap th),
.prompt-editor-content :deep(.tiptap td) {
  border: 1px solid rgb(var(--color-border));
  padding: 0.25rem 0.5rem;
  text-align: left;
}
.prompt-editor-content :deep(.tiptap th) {
  background-color: rgb(var(--color-surface-sunken));
  font-weight: 600;
}
.prompt-editor-content :deep(.tiptap img) {
  max-width: 100%;
  margin: 0.25rem 0;
  border-radius: 0.375rem;
  border: 1px solid rgb(var(--color-border));
}
</style>
