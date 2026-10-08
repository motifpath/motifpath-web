<script setup lang="ts">
/**
 * The lyrics of a song chart, edited in place: sections of a kind and an optional label, lyric
 * lines with each chord over its word or syllable, and comment lines. It emits the chart document
 * each edit leaves (lines and sections with nothing in them left out), and shows a document given
 * from outside, such as an import, in place of what it held.
 */
import { EditorContent, useEditor } from '@tiptap/vue-3'
import type { JSONContent } from '@tiptap/core'
import { MessageSquare, Plus } from 'lucide-vue-next'
import { onBeforeUnmount, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { SECTION_KINDS, songChartExtensions } from '@/features/admin/components/songChartEditor/extensions'
import { toSavedDocument } from '@/features/admin/utils/songChartEditorDocument'
import { useTypedT } from '@/shared/composables/useTypedT'

type SongChartDocument = components['schemas']['SongChartDocument']
type SectionKind = (typeof SECTION_KINDS)[number]

const model = defineModel<SongChartDocument>({ required: true })

const { t } = useTypedT()

/** What the editor shows for a document: a chart with nothing in it gets one verse to write in. */
function editable(doc: SongChartDocument): JSONContent {
  return doc.content.length > 0 ? doc : { type: 'doc', content: [{ type: 'section', attrs: { kind: 'verse', label: null }, content: [{ type: 'lyricLine' }] }] }
}

let lastEmitted = JSON.stringify(model.value)
const sectionKind = ref<SectionKind>('verse')
const sectionLabel = ref('')

const editor = useEditor({
  extensions: songChartExtensions(),
  content: editable(model.value),
  editorProps: { attributes: { class: 'song-chart-lyrics', 'aria-label': t('songChartEditor.lyricsLabel'), spellcheck: 'false' } },
  onUpdate: ({ editor: e }) => {
    const doc = toSavedDocument(e.getJSON())
    lastEmitted = JSON.stringify(doc)
    model.value = doc
  },
  onTransaction: () => readSection(),
})

watch(model, (doc) => {
  if (!editor.value || JSON.stringify(doc) === lastEmitted) return
  lastEmitted = JSON.stringify(doc)
  editor.value.commands.setContent(editable(doc), { emitUpdate: false })
})

/** The section the cursor is in: its depth in the document, and its node. */
function currentSection() {
  const e = editor.value
  if (!e) return null
  const { $from } = e.state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'section') return { depth, node: $from.node(depth), $from }
  }
  return null
}

function readSection() {
  const section = currentSection()
  if (!section) return
  const kind = section.node.attrs.kind
  sectionKind.value = SECTION_KINDS.find((k) => k === kind) ?? 'other'
  sectionLabel.value = typeof section.node.attrs.label === 'string' ? section.node.attrs.label : ''
}

function setSectionAttrs() {
  editor.value
    ?.chain()
    .focus()
    .updateAttributes('section', { kind: sectionKind.value, label: sectionLabel.value.trim() || null })
    .run()
}

function addSection() {
  const section = currentSection()
  const e = editor.value
  if (!section || !e) return
  const at = section.$from.after(section.depth)
  e.chain()
    .insertContentAt(at, { type: 'section', attrs: { kind: 'verse', label: null }, content: [{ type: 'lyricLine' }] })
    .setTextSelection(at + 2)
    .focus()
    .run()
}

function addComment() {
  const section = currentSection()
  const e = editor.value
  if (!section || !e) return
  const at = section.$from.after(section.depth + 1)
  e.chain().insertContentAt(at, { type: 'comment' }).setTextSelection(at + 1).focus().run()
}

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-end gap-2 rounded-md border border-border bg-surface-sunken p-2">
      <label class="flex flex-col gap-1 text-xs font-semibold text-ink-subtle">
        {{ t('songChartEditor.sectionKind') }}
        <select
          v-model="sectionKind"
          data-test="section-kind"
          class="rounded-md border border-border bg-surface px-2 py-1 text-sm text-ink"
          @change="setSectionAttrs"
        >
          <option v-for="kind in SECTION_KINDS" :key="kind" :value="kind">{{ t(`songChart.sectionKind.${kind}`) }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1 text-xs font-semibold text-ink-subtle">
        {{ t('songChartEditor.sectionLabel') }}
        <input
          v-model="sectionLabel"
          data-test="section-label"
          type="text"
          maxlength="100"
          :placeholder="t('songChartEditor.sectionLabelPlaceholder')"
          class="w-40 rounded-md border border-border bg-surface px-2 py-1 text-sm text-ink"
          @change="setSectionAttrs"
        />
      </label>
      <button
        type="button"
        data-test="add-section"
        class="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-ink"
        @click="addSection"
      >
        <Plus :size="14" aria-hidden="true" />{{ t('songChartEditor.addSection') }}
      </button>
      <button
        type="button"
        data-test="add-comment"
        class="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-ink"
        @click="addComment"
      >
        <MessageSquare :size="14" aria-hidden="true" />{{ t('songChartEditor.addComment') }}
      </button>
    </div>
    <EditorContent :editor="editor" class="rounded-md border border-border bg-surface-raised px-4 py-3" />
  </div>
</template>

<style scoped>
/* A chord is drawn above the start of its word, and lines leave room for it: something Tailwind
   can't express for content the editor renders. */
:deep(.song-chart-lyrics) {
  outline: none;
}
:deep(.song-chart-lyrics section) {
  margin-bottom: 1.25rem;
  padding-left: 0.75rem;
  border-left: 2px solid rgb(var(--color-border));
}
:deep(.song-chart-lyrics section[data-label])::before {
  content: attr(data-label);
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(var(--color-ink-muted));
}
:deep(.song-chart-lyrics p[data-lyric-line]) {
  line-height: 2.6;
}
:deep(.song-chart-lyrics p[data-comment]) {
  font-style: italic;
  color: rgb(var(--color-ink-muted));
}
:deep(.song-chart-chord) {
  position: relative;
}
:deep(.song-chart-chord)::before {
  content: attr(data-chord);
  position: absolute;
  top: -1.2em;
  left: 0;
  font-size: 0.8em;
  font-weight: 700;
  line-height: 1;
  color: rgb(var(--color-accent-text));
  white-space: nowrap;
}
</style>
