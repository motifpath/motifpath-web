<script setup lang="ts">
/**
 * The lyrics of a song chart, edited in place: sections of a kind and an optional label, lyric
 * lines with each chord over its word or syllable, and comment lines. It emits the chart document
 * each edit leaves (lines and sections with nothing in them left out), and shows a document given
 * from outside, such as an import, in place of what it held.
 *
 * A chord is put on the selected text, or changed or removed at the cursor. Each symbol is
 * checked as it is written, the same way the server reads it, and the chords that stop the chart
 * from being published are listed. A chord the catalog has offers its voicings; until the author
 * picks one, learners see the best one first.
 */
import { EditorContent, useEditor } from '@tiptap/vue-3'
import type { Editor, JSONContent } from '@tiptap/core'
import { MessageSquare, Music, Plus, X } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { SECTION_KINDS, songChartExtensions } from '@/features/admin/components/songChartEditor/extensions'
import { useChordLookup } from '@/shared/composables/useChordLookup'
import { toSavedDocument } from '@/features/admin/utils/songChartEditorDocument'
import { useTypedT } from '@/shared/composables/useTypedT'
import { voicingNames } from '@/shared/utils/songChartReading'

type SongChartDocument = components['schemas']['SongChartDocument']
type SectionKind = (typeof SECTION_KINDS)[number]
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']

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
  onCreate: ({ editor: e }) => readPosition(e),
  onTransaction: ({ editor: e }) => readPosition(e),
})

watch(model, (doc) => {
  if (!editor.value || JSON.stringify(doc) === lastEmitted) return
  lastEmitted = JSON.stringify(doc)
  editor.value.commands.setContent(editable(doc), { emitUpdate: false })
})

/** Reads what's at the cursor: its section, and the chord it's on. */
function readPosition(e: Editor) {
  readSection(e)
  readChord(e)
}

/** The section the cursor is in: its depth in the document, and its node. */
function currentSection(e: Editor | undefined = editor.value) {
  if (!e) return null
  const { $from } = e.state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'section') return { depth, node: $from.node(depth), $from }
  }
  return null
}

function readSection(e: Editor) {
  const section = currentSection(e)
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

// ── Chords ───────────────────────────────────────────────────────────────────

const { lookUp, checkOf } = useChordLookup()
const chordSymbol = ref('')
const chordAtCursor = ref<Anchor | null>(null)
const hasSelection = ref(false)

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/**
 * The attributes of the chord the cursor is on, or null. A cursor just before a chord's word is
 * on that chord too: the chord sits at the start of its word, where an author clicks.
 */
function chordAttrsAtCursor(e: Editor): Record<string, unknown> | null {
  if (e.isActive('chordAnchor')) return e.getAttributes('chordAnchor')
  const { selection } = e.state
  if (!selection.empty) return null
  const mark = selection.$from.nodeAfter?.marks.find((m) => m.type.name === 'chordAnchor')
  return mark ? mark.attrs : null
}

function readChord(e: Editor) {
  hasSelection.value = !e.state.selection.empty
  const before = chordAtCursor.value
  const attrs = chordAttrsAtCursor(e)
  if (attrs) {
    chordAtCursor.value = {
      anchorId: text(attrs.anchorId) ?? '',
      writtenSymbol: text(attrs.writtenSymbol) ?? '',
      chordDefinitionId: text(attrs.chordDefinitionId),
      chordVoicingId: text(attrs.chordVoicingId),
    }
    if (before?.anchorId !== chordAtCursor.value.anchorId) chordSymbol.value = chordAtCursor.value.writtenSymbol
  } else {
    chordAtCursor.value = null
    if (before) chordSymbol.value = ''
  }
}

/** Every chord written in the lyrics, once each. */
const writtenSymbols = computed(() => {
  const symbols = model.value.content.flatMap((s) =>
    s.content.flatMap((line) => (line.type === 'lyricLine' ? line.content.flatMap((r) => (r.marks ?? []).map((m) => m.attrs.writtenSymbol)) : [])),
  )
  return [...new Set(symbols)]
})

watch(
  [chordSymbol, writtenSymbols],
  ([symbol, symbols]) => {
    if (symbol.trim()) lookUp(symbol.trim())
    symbols.forEach(lookUp)
  },
  { immediate: true },
)

const typedCheck = computed(() => (chordSymbol.value.trim() ? checkOf(chordSymbol.value.trim()) : null))
const chordsToFix = computed(() => writtenSymbols.value.filter((symbol) => checkOf(symbol)?.blocks))
const voicingsAtCursor = computed(() => (chordAtCursor.value ? (checkOf(chordAtCursor.value.writtenSymbol)?.chord?.voicings ?? []) : []))
const voicingNamesAtCursor = computed(() => voicingNames(voicingsAtCursor.value, t('songChart.openVoicing')))

function nextAnchorId(): string {
  const used = model.value.content.flatMap((s) =>
    s.content.flatMap((line) => (line.type === 'lyricLine' ? line.content.flatMap((r) => (r.marks ?? []).map((m) => m.attrs.anchorId)) : [])),
  )
  const highest = Math.max(0, ...used.map((id) => Number(/^a(\d+)$/.exec(id)?.[1] ?? 0)))
  return `a${highest + 1}`
}

function putChord() {
  const e = editor.value
  const symbol = chordSymbol.value.trim()
  if (!e || !symbol) return
  const current = chordAtCursor.value
  if (current) {
    e.chain()
      .focus()
      .extendMarkRange('chordAnchor')
      .setMark('chordAnchor', {
        ...current,
        writtenSymbol: symbol,
        chordDefinitionId: symbol === current.writtenSymbol ? current.chordDefinitionId : null,
        chordVoicingId: symbol === current.writtenSymbol ? current.chordVoicingId : null,
      })
      .run()
  } else if (hasSelection.value) {
    e.chain().focus().setMark('chordAnchor', { anchorId: nextAnchorId(), writtenSymbol: symbol, chordDefinitionId: null, chordVoicingId: null }).run()
  }
}

function removeChord() {
  editor.value?.chain().focus().extendMarkRange('chordAnchor').unsetMark('chordAnchor').run()
}

function pickVoicing(voicingId: string | null) {
  editor.value?.chain().focus().extendMarkRange('chordAnchor').updateAttributes('chordAnchor', { chordVoicingId: voicingId }).run()
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
    <div class="flex flex-col gap-2 rounded-md border border-border bg-surface-sunken p-2">
      <div class="flex flex-wrap items-end gap-2">
        <label class="flex flex-col gap-1 text-xs font-semibold text-ink-subtle">
          {{ t('songChartEditor.chord') }}
          <input
            v-model="chordSymbol"
            data-test="chord-symbol-input"
            type="text"
            maxlength="32"
            :placeholder="t('songChartEditor.chordPlaceholder')"
            class="w-28 rounded-md border border-border bg-surface px-2 py-1 font-mono text-sm text-ink"
            @keydown.enter.prevent="putChord"
          />
        </label>
        <button
          type="button"
          data-test="put-chord"
          class="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
          :disabled="!chordSymbol.trim() || (!hasSelection && !chordAtCursor)"
          @click="putChord"
        >
          <Music :size="14" aria-hidden="true" />{{ chordAtCursor ? t('songChartEditor.changeChord') : t('songChartEditor.putChord') }}
        </button>
        <button
          v-if="chordAtCursor"
          type="button"
          data-test="remove-chord"
          class="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-ink"
          @click="removeChord"
        >
          <X :size="14" aria-hidden="true" />{{ t('songChartEditor.removeChord') }}
        </button>
        <p
          v-if="typedCheck"
          data-test="chord-status"
          :data-kind="typedCheck.kind"
          :data-blocks="String(typedCheck.blocks)"
          class="text-xs"
          :class="typedCheck.blocks ? 'text-danger' : 'text-ink-muted'"
        >
          {{ t(`songChartEditor.chordCheck.${typedCheck.kind}`) }}
          <span v-if="typedCheck.blocks">({{ t('songChartEditorView.blocksPublishing') }})</span>
        </p>
        <p v-else-if="!hasSelection && !chordAtCursor" class="text-xs text-ink-subtle">{{ t('songChartEditor.selectToPut') }}</p>
      </div>

      <div v-if="voicingsAtCursor.length" role="radiogroup" :aria-label="t('songChart.voicings')" class="flex flex-wrap gap-1.5">
        <button
          type="button"
          role="radio"
          data-test="voicing-option"
          data-voicing-id=""
          :aria-checked="chordAtCursor?.chordVoicingId === null"
          class="rounded-md border px-2.5 py-1 text-xs"
          :class="chordAtCursor?.chordVoicingId === null ? 'border-accent bg-accent text-accent-fg' : 'border-border text-ink'"
          @click="pickVoicing(null)"
        >
          {{ t('songChartEditor.bestVoicing') }}
        </button>
        <button
          v-for="(v, i) in voicingsAtCursor"
          :key="v.chord_voicing_id"
          type="button"
          role="radio"
          data-test="voicing-option"
          :data-voicing-id="v.chord_voicing_id"
          :aria-checked="chordAtCursor?.chordVoicingId === v.chord_voicing_id"
          class="rounded-md border px-2.5 py-1 text-xs"
          :class="chordAtCursor?.chordVoicingId === v.chord_voicing_id ? 'border-accent bg-accent text-accent-fg' : 'border-border text-ink'"
          @click="pickVoicing(v.chord_voicing_id)"
        >
          {{ voicingNamesAtCursor[i] }}
        </button>
      </div>

      <p v-if="chordsToFix.length" class="text-xs text-danger">
        {{ t('songChartEditor.chordsToFix') }}
        <span v-for="symbol in chordsToFix" :key="symbol" data-test="chord-to-fix" :data-symbol="symbol" class="ml-1 font-mono font-semibold">{{ symbol }}</span>
      </p>
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
