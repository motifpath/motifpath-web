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
import { computed, ref, watch } from 'vue'
import { useTypedT } from '@/shared/composables/useTypedT'

import DiagramEmbedPickerModal from '@/features/teacher/components/DiagramEmbedPickerModal.vue'
import PromptDockedBar from '@/features/teacher/components/PromptDockedBar.vue'
import PromptFormatSheet from '@/features/teacher/components/PromptFormatSheet.vue'
import PromptInsertSheet from '@/features/teacher/components/PromptInsertSheet.vue'
import PromptLinkSheet from '@/features/teacher/components/PromptLinkSheet.vue'
import PromptTableSheet from '@/features/teacher/components/PromptTableSheet.vue'
import PromptWideToolbar from '@/features/teacher/components/PromptWideToolbar.vue'
import SongChartPickerModal from '@/features/teacher/components/SongChartPickerModal.vue'
import { PromptSongChartNode } from '@/features/teacher/components/promptSongChartNode'
import { PromptDiagramNode } from '@/features/teacher/components/promptDiagramNode'
import { CellsAcrossSelection } from '@/features/teacher/components/cellsAcrossSelection'
import { useMediaUpload } from '@/features/teacher/composables/useMediaUpload'
import { usePromptCommands } from '@/features/teacher/composables/usePromptCommands'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { parseDiagramEmbed } from '@/shared/utils/diagramEmbed'
import { useToast } from '@/shared/composables/useToast'
import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']
type DiagramRef = components['schemas']['DiagramRef']

const props = withDefaults(
  defineProps<{
    modelValue: PromptDocument
    /** Names the text field for assistive technology: the label the form shows beside it. */
    label: string
    /** Whether the document may embed song charts: only lesson content does, never an exercise. */
    songCharts?: boolean
  }>(),
  { songCharts: false },
)
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

const editor = useEditor({
  content: toWireDocument(props.modelValue),
  editorProps: { attributes: { 'aria-label': props.label } },
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
    CellsAcrossSelection,
    TiptapImage,
    PromptDiagramNode.configure({ onEdit: editDiagram }),
    PromptSongChartNode.configure({ onReplace: replaceSongChart }),
  ],
  onUpdate: ({ editor: current }) => {
    emit('update:modelValue', toWireDocument(current.getJSON()))
  },
})

const { isCompact } = useSizeClass()

// On a phone the commands are spread over a docked bar and sheets; only one sheet is open at a time.
// The Link sheet is a dialog from Medium up, in place of a browser prompt.
type Sheet = 'format' | 'insert' | 'table' | 'link'
const openSheet = ref<Sheet | null>(null)
const linkHref = ref('')

// A command run from an open sheet on a phone leaves the focus where it is: putting it back in the
// editor would raise the keyboard over the sheet.
const commands = usePromptCommands(editor, () => !isCompact.value || openSheet.value === null)

// The bar sits above every layer, so it stays usable inside a pop-up's modal; it steps aside while
// one of its own sheets is open, which it would otherwise cover.
const dockedBarShown = computed(() => isCompact.value && commands.focused.value && openSheet.value === null)

function showSheet(sheet: Sheet) {
  openSheet.value = sheet
}
/** Closes the open sheet; on a phone, `refocus` returns the cursor to the text, keyboard and all. */
function closeSheet({ refocus = true } = {}) {
  openSheet.value = null
  if (refocus && isCompact.value) editor.value?.commands.focus()
}

function openLinkSheet() {
  linkHref.value = commands.currentLink()
  showSheet('link')
}
function applyLink(href: string) {
  closeSheet({ refocus: false })
  commands.setLink(href)
}
function removeLink() {
  closeSheet({ refocus: false })
  commands.unsetLink()
}

function insertTableFromSheet() {
  closeSheet({ refocus: false })
  commands.insertTable()
}
function pickImageFromSheet() {
  closeSheet({ refocus: false })
  pickImage()
}
function insertDiagramFromSheet() {
  closeSheet({ refocus: false })
  insertDiagram()
}
function insertSongChartFromSheet() {
  closeSheet({ refocus: false })
  openSongChartPicker()
}

function editSelectedBlock() {
  const block = commands.selectedBlock()
  if (!block) return
  if (block.type === 'diagram') editDiagram(block.pos)
  else replaceSongChart(block.pos)
}

function hideKeyboard() {
  editor.value?.commands.blur()
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

function pickImage() {
  imageInput.value?.click()
}
// The song chart picker inserts the picked chart at the cursor or, opened from a chart's Replace,
// swaps that one's chart in place.
const songChartPickerOpen = ref(false)
const replacingSongChartPos = ref<number | null>(null)

function openSongChartPicker() {
  replacingSongChartPos.value = null
  songChartPickerOpen.value = true
}
function replaceSongChart(pos: number) {
  replacingSongChartPos.value = pos
  songChartPickerOpen.value = true
}
function insertSongChart(songChartId: string) {
  const pos = replacingSongChartPos.value
  if (pos === null) {
    editor.value?.chain().focus().insertContent({ type: 'songChart', attrs: { songChartId } }).run()
  } else {
    editor.value
      ?.chain()
      .focus()
      .command(({ tr }) => {
        tr.setNodeMarkup(pos, undefined, { songChartId })
        return true
      })
      .run()
  }
  songChartPickerOpen.value = false
}

// The diagram picker either inserts a new diagram at the cursor or, opened
// from a diagram's own edit button, replaces that one's ref in place.
const diagramPickerOpen = ref(false)
const diagramPickerInitial = ref<DiagramRef | null>(null)
const editingDiagramPos = ref<number | null>(null)

function insertDiagram() {
  editingDiagramPos.value = null
  diagramPickerInitial.value = null
  diagramPickerOpen.value = true
}
function editDiagram(pos: number) {
  const node = editor.value?.state.doc.nodeAt(pos)
  if (!node) return
  // Only a single diagram can be picked, so a stack reopens empty and is replaced by the pick.
  const embed = parseDiagramEmbed(node.attrs.diagramRef, node.attrs.diagramStackRef)
  editingDiagramPos.value = pos
  diagramPickerInitial.value = embed?.kind === 'single' ? embed.ref : null
  diagramPickerOpen.value = true
}
function applyDiagram(diagramRef: DiagramRef) {
  const pos = editingDiagramPos.value
  const attrs = { diagramRef, diagramStackRef: null }
  if (pos === null) {
    editor.value?.chain().focus().insertContent({ type: 'diagram', attrs }).run()
  } else {
    editor.value
      ?.chain()
      .focus()
      .command(({ tr }) => {
        tr.setNodeMarkup(pos, undefined, attrs)
        return true
      })
      .run()
  }
  diagramPickerOpen.value = false
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
    <PromptWideToolbar
      v-if="!isCompact"
      :commands="commands"
      :song-charts="songCharts"
      @link="openLinkSheet"
      @image="pickImage"
      @diagram="insertDiagram"
      @song-chart="openSongChartPicker"
    />
    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      class="hidden"
      data-test="prompt-toolbar-image-input"
      @change="onImagePicked"
    />

    <EditorContent
      data-test="prompt-editor-content"
      class="prompt-editor-content rounded-md border border-border bg-surface-raised p-3 text-base"
      :editor="editor"
    />

    <!-- The docked bar is fixed over the page's foot: this room lets the last lines scroll above it. -->
    <div v-if="dockedBarShown" class="h-14 shrink-0" aria-hidden="true" />
    <PromptDockedBar
      v-if="dockedBarShown"
      :commands="commands"
      @format="showSheet('format')"
      @insert="showSheet('insert')"
      @table="showSheet('table')"
      @edit="editSelectedBlock"
      @hide-keyboard="hideKeyboard"
    />
    <template v-if="isCompact">
      <PromptFormatSheet :open="openSheet === 'format'" :commands="commands" @close="closeSheet()" />
      <PromptInsertSheet
        :open="openSheet === 'insert'"
        :song-charts="songCharts"
        @close="closeSheet()"
        @link="openLinkSheet"
        @table="insertTableFromSheet"
        @image="pickImageFromSheet"
        @diagram="insertDiagramFromSheet"
        @song-chart="insertSongChartFromSheet"
      />
      <PromptTableSheet :open="openSheet === 'table'" :commands="commands" @close="closeSheet()" />
    </template>
    <PromptLinkSheet :open="openSheet === 'link'" :href="linkHref" @apply="applyLink" @remove="removeLink" @close="closeSheet()" />

    <DiagramEmbedPickerModal
      :open="diagramPickerOpen"
      :initial="diagramPickerInitial"
      :editing="editingDiagramPos !== null"
      @apply="applyDiagram"
      @close="diagramPickerOpen = false"
    />
    <!-- Created only while open: the picker loads the published song charts as soon as it exists. -->
    <SongChartPickerModal
      v-if="songCharts && songChartPickerOpen"
      :open="songChartPickerOpen"
      @pick="insertSongChart"
      @close="songChartPickerOpen = false"
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
