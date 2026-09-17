<script setup lang="ts">
import Bold from '@tiptap/extension-bold'
import BulletList from '@tiptap/extension-bullet-list'
import Document from '@tiptap/extension-document'
import Heading from '@tiptap/extension-heading'
import Highlight from '@tiptap/extension-highlight'
import TiptapImage from '@tiptap/extension-image'
import Italic from '@tiptap/extension-italic'
import Link from '@tiptap/extension-link'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Paragraph from '@tiptap/extension-paragraph'
import Strike from '@tiptap/extension-strike'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import TiptapText from '@tiptap/extension-text'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import {
  Bold as BoldIcon,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic as ItalicIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Pilcrow,
  Strikethrough,
  Table2,
} from 'lucide-vue-next'
import { ref, watch } from 'vue'

import { useMediaUpload } from '@/features/teacher/composables/useMediaUpload'
import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']

const props = defineProps<{ modelValue: PromptDocument }>()
const emit = defineEmits<{ 'update:modelValue': [document: PromptDocument] }>()

const { upload } = useMediaUpload()
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
  extensions: [
    Document,
    Paragraph,
    TiptapText,
    Heading.configure({ levels: [1, 2, 3] }),
    Bold,
    Italic,
    Strike,
    Highlight,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    BulletList,
    OrderedList,
    ListItem,
    Link.configure({ openOnClick: false }),
    Table,
    TableRow,
    TableHeader,
    TableCell,
    TiptapImage,
  ],
  onUpdate: ({ editor: current }) => {
    emit('update:modelValue', toWireDocument(current.getJSON()))
  },
})

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
function setLink() {
  const url = window.prompt('Link URL')
  if (!url) return
  editor.value?.chain().focus().setLink({ href: url }).run()
}
function pickImage() {
  imageInput.value?.click()
}
async function onImagePicked(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return

  const src = await upload(file, 'image')
  editor.value?.chain().focus().setImage({ src }).run()
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface-sunken p-1.5">
      <button
        type="button"
        data-test="prompt-toolbar-h1"
        class="rounded p-1.5"
        :class="editor?.isActive('heading', { level: 1 }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="setHeading(1)"
      >
        <Heading1 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-h2"
        class="rounded p-1.5"
        :class="editor?.isActive('heading', { level: 2 }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="setHeading(2)"
      >
        <Heading2 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-h3"
        class="rounded p-1.5"
        :class="editor?.isActive('heading', { level: 3 }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="setHeading(3)"
      >
        <Heading3 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-paragraph"
        class="rounded p-1.5"
        :class="editor?.isActive('paragraph') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="setParagraph()"
      >
        <Pilcrow :size="16" aria-hidden="true" />
      </button>

      <div class="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        data-test="prompt-toolbar-bold"
        class="rounded p-1.5"
        :class="editor?.isActive('bold') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <BoldIcon :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-italic"
        class="rounded p-1.5"
        :class="editor?.isActive('italic') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <ItalicIcon :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-strike"
        class="rounded p-1.5"
        :class="editor?.isActive('strike') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <Strikethrough :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-highlight"
        class="rounded p-1.5"
        :class="editor?.isActive('highlight') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="editor?.chain().focus().toggleHighlight().run()"
      >
        <Highlighter :size="16" aria-hidden="true" />
      </button>

      <div class="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        data-test="prompt-toolbar-align-left"
        class="rounded p-1.5"
        :class="editor?.isActive({ textAlign: 'left' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="setAlign('left')"
      >
        <AlignLeft :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-align-center"
        class="rounded p-1.5"
        :class="editor?.isActive({ textAlign: 'center' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="setAlign('center')"
      >
        <AlignCenter :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-align-right"
        class="rounded p-1.5"
        :class="editor?.isActive({ textAlign: 'right' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="setAlign('right')"
      >
        <AlignRight :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-align-justify"
        class="rounded p-1.5"
        :class="editor?.isActive({ textAlign: 'justify' }) ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="setAlign('justify')"
      >
        <AlignJustify :size="16" aria-hidden="true" />
      </button>

      <div class="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        data-test="prompt-toolbar-bullet-list"
        class="rounded p-1.5"
        :class="editor?.isActive('bulletList') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <List :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="prompt-toolbar-ordered-list"
        class="rounded p-1.5"
        :class="editor?.isActive('orderedList') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered :size="16" aria-hidden="true" />
      </button>

      <div class="mx-1 h-4 w-px bg-border" />

      <button
        type="button"
        data-test="prompt-toolbar-link"
        class="rounded p-1.5"
        :class="editor?.isActive('link') ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
        @click="setLink()"
      >
        <LinkIcon :size="16" aria-hidden="true" />
      </button>
      <button type="button" data-test="prompt-toolbar-table" class="rounded p-1.5 text-ink-muted" @click="insertTable()">
        <Table2 :size="16" aria-hidden="true" />
      </button>
      <button type="button" data-test="prompt-toolbar-image" class="rounded p-1.5 text-ink-muted" @click="pickImage()">
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

    <EditorContent
      data-test="prompt-editor-content"
      class="prose-sm max-w-none rounded-md border border-border bg-surface-raised p-3 text-base [&_.tiptap]:min-h-[4.5rem] [&_.tiptap]:outline-none"
      :editor="editor"
    />
  </div>
</template>
