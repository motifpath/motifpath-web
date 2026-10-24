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
 *
 * Each section is headed by its name and the progressions it's tagged with; + Progression opens
 * the catalog to tag it with more. A tag the last save found a section doesn't play is marked.
 */
import { EditorContent, useEditor } from '@tiptap/vue-3'
import type { Editor, JSONContent } from '@tiptap/core'
import { MessageSquare, Music, Plus, Redo2, Undo2, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ChordPopover from '@/features/admin/components/songChartEditor/ChordPopover.vue'
import ProgressionPicker from '@/features/admin/components/songChartEditor/ProgressionPicker.vue'
import SongChartSectionView from '@/features/admin/components/songChartEditor/SongChartSectionView.vue'
import { sectionHeadingContextKey } from '@/features/admin/components/songChartEditor/sectionHeadingContext'
import { chordProblemsKey, SECTION_KINDS, songChartExtensions } from '@/features/admin/components/songChartEditor/extensions'
import type { ChordProblem } from '@/features/admin/components/songChartEditor/extensions'
import { useChordLookup } from '@/shared/composables/useChordLookup'
import { useProgressionNames } from '@/shared/composables/useProgressionNames'
import { toSavedDocument } from '@/features/admin/utils/songChartEditorDocument'
import { useTypedT } from '@/shared/composables/useTypedT'

type SongChartDocument = components['schemas']['SongChartDocument']
type SectionKind = (typeof SECTION_KINDS)[number]
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']
type UnplayedProgression = components['schemas']['SongChartUnplayedProgression']

const model = defineModel<SongChartDocument>({ required: true })
const props = withDefaults(
  defineProps<{
    /** The tags the last save found a section doesn't play. */
    unplayed?: UnplayedProgression[]
    /** The song's key as of the last save, which is the key the tags were checked in. */
    concertKey?: string | null
  }>(),
  { unplayed: () => [], concertKey: null },
)

const { t } = useTypedT()

/** What the editor shows for a document: a chart with nothing in it gets one verse to write in. */
function editable(doc: SongChartDocument): JSONContent {
  return doc.content.length > 0 ? doc : { type: 'doc', content: [{ type: 'section', attrs: { kind: 'verse', label: null }, content: [{ type: 'lyricLine' }] }] }
}

let lastEmitted = JSON.stringify(model.value)
const sectionKind = ref<SectionKind>('verse')
const sectionLabel = ref('')

const { lookUp, checkOf } = useChordLookup()

/** A written chord's problem, when it stops publishing. */
function problemOf(symbol: string): ChordProblem | null {
  const check = checkOf(symbol)
  if (!check?.blocks) return null
  return check.kind === 'not_in_catalog' ? 'not_in_catalog' : 'not_a_chord'
}

function reasonOf(symbol: string, problem: ChordProblem): string {
  return problem === 'not_in_catalog' ? t('songChartEditor.notInCatalogReason', { symbol }) : t('songChartEditor.notAChordReason', { symbol })
}

const editor = useEditor({
  extensions: songChartExtensions({ problemOf, reasonOf }, SongChartSectionView),
  content: editable(model.value),
  editorProps: {
    attributes: { class: 'song-chart-lyrics', 'aria-label': t('songChartEditor.lyricsLabel'), spellcheck: 'false' },
    // "[" on a selected word, or on a chord, writes a chord there, as Chord does.
    handleKeyDown: (_, event) => {
      if (event.key !== '[' || !canWriteChord.value) return false
      void openChordPopover()
      return true
    },
  },
  onUpdate: ({ editor: e }) => {
    const doc = toSavedDocument(e.getJSON())
    lastEmitted = JSON.stringify(doc)
    model.value = doc
  },
  onCreate: ({ editor: e }) => readPosition(e),
  onTransaction: ({ editor: e, transaction }) => {
    readPosition(e)
    // The picker tags a section by its place in the chart: any other change to the lyrics may
    // move that place, so it closes rather than tag another section.
    if (transaction.docChanged && !transaction.getMeta(PICKER_CHANGE)) picking.value = null
  },
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

// The catalog answers after the lyrics are drawn; each answer that changes a problem draws the marks again.
watch(
  () => writtenSymbols.value.map((symbol) => `${symbol}:${problemOf(symbol) ?? ''}`).join('|'),
  () => editor.value?.view.dispatch(editor.value.state.tr.setMeta(chordProblemsKey, true)),
)
const voicingsAtCursor = computed(() => (chordAtCursor.value ? (checkOf(chordAtCursor.value.writtenSymbol)?.chord?.voicings ?? []) : []))

// ── The chord popover ────────────────────────────────────────────────────────

const canWriteChord = computed(() => hasSelection.value || chordAtCursor.value !== null)
const popoverOpen = ref(false)
const popoverPosition = ref({ top: 0, left: 0, above: false })
const lyricsBox = ref<HTMLElement | null>(null)
/** The popover's height, about; it goes above the selection when there's less room below. */
const POPOVER_HEIGHT = 260
const POPOVER_GAP = 8

/** Where the selection is, in the lyrics' box; the top-left corner when it can't be measured. */
function placePopover() {
  const e = editor.value
  const box = lyricsBox.value?.getBoundingClientRect()
  if (!e || !box) return
  try {
    const start = e.view.coordsAtPos(e.state.selection.from)
    const roomBelow = window.innerHeight - start.bottom
    const above = roomBelow < POPOVER_HEIGHT && start.top > POPOVER_HEIGHT
    popoverPosition.value = {
      top: (above ? start.top - POPOVER_HEIGHT - POPOVER_GAP : start.bottom + POPOVER_GAP) - box.top,
      left: Math.max(0, start.left - box.left),
      above,
    }
  } catch {
    popoverPosition.value = { top: 0, left: 0, above: false }
  }
}

async function openChordPopover() {
  if (!canWriteChord.value) return
  chordSymbol.value = chordAtCursor.value?.writtenSymbol ?? ''
  placePopover()
  popoverOpen.value = true
  await nextTick()
  lyricsBox.value?.querySelector<HTMLInputElement>('[data-test="chord-symbol-input"]')?.focus()
}

function closeChordPopover() {
  popoverOpen.value = false
  editor.value?.commands.focus()
}

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
  popoverOpen.value = false
}

function removeChord() {
  editor.value?.chain().focus().extendMarkRange('chordAnchor').unsetMark('chordAnchor').run()
  popoverOpen.value = false
}

function pickVoicing(voicingId: string | null) {
  editor.value?.chain().focus().extendMarkRange('chordAnchor').updateAttributes('chordAnchor', { chordVoicingId: voicingId }).run()
}

// ── Progressions a section plays ─────────────────────────────────────────────

const { progressions } = useProgressionNames()
/** Marks the changes the picker and the headings make to a section's tags. */
const PICKER_CHANGE = 'sectionTags'
/** The section the picker tags, by its place in the chart, and where the picker sits. */
const picking = ref<{ sectionIndex: number; top: number; left: number } | null>(null)

/** Where the section at that place starts in the document, and its tags. */
function sectionAt(sectionIndex: number): { pos: number; keys: string[] } | null {
  const doc = editor.value?.state.doc
  if (!doc || sectionIndex < 0 || sectionIndex >= doc.childCount) return null
  let pos = 0
  for (let i = 0; i < sectionIndex; i++) pos += doc.child(i).nodeSize
  const keys: unknown = doc.child(sectionIndex).attrs.progression_keys
  return { pos, keys: Array.isArray(keys) ? keys.filter((k): k is string => typeof k === 'string') : [] }
}

function setTags(sectionIndex: number, keys: (current: string[]) => string[]) {
  const section = sectionAt(sectionIndex)
  if (!section) return
  editor.value
    ?.chain()
    .command(({ tr }) => {
      tr.setNodeAttribute(section.pos, 'progression_keys', keys(section.keys)).setMeta(PICKER_CHANGE, true)
      return true
    })
    .run()
}

function toggleTag(key: string) {
  if (!picking.value) return
  setTags(picking.value.sectionIndex, (keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]))
}

const pickingTags = computed(() => (picking.value ? (sectionAt(picking.value.sectionIndex)?.keys ?? []) : []))

function openPicker(sectionIndex: number, anchor: HTMLElement) {
  const box = lyricsBox.value?.getBoundingClientRect()
  const at = anchor.getBoundingClientRect()
  picking.value = { sectionIndex, top: box ? at.bottom + POPOVER_GAP - box.top : 0, left: box ? Math.max(0, at.left - box.left) : 0 }
  void nextTick(() => lyricsBox.value?.querySelector<HTMLInputElement>('[data-test="progression-search"]')?.focus())
}

function closePicker() {
  picking.value = null
  editor.value?.commands.focus()
}

provide(sectionHeadingContextKey, {
  unplayedAt: (sectionIndex) => props.unplayed.filter((u) => u.section_index === sectionIndex).map((u) => u.progression_key),
  concertKey: () => props.concertKey,
  remove: (sectionIndex, key) => setTags(sectionIndex, (keys) => keys.filter((k) => k !== key)),
  openPicker,
})

onBeforeUnmount(() => editor.value?.destroy())

const toolClass = 'flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface-sunken disabled:opacity-40'
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-1" role="toolbar" :aria-label="t('songChartEditor.lyricsLabel')">
      <button type="button" data-test="undo" :class="toolClass" :aria-label="t('songChartEditor.undo')" :disabled="!editor?.can().undo()" @click="editor?.chain().focus().undo().run()">
        <Undo2 :size="18" aria-hidden="true" />
      </button>
      <button type="button" data-test="redo" :class="toolClass" :aria-label="t('songChartEditor.redo')" :disabled="!editor?.can().redo()" @click="editor?.chain().focus().redo().run()">
        <Redo2 :size="18" aria-hidden="true" />
      </button>
      <button type="button" data-test="add-section" :class="toolClass" @click="addSection">
        <Plus :size="18" aria-hidden="true" />{{ t('songChartEditor.addSection') }}
      </button>
      <button type="button" data-test="add-comment" :class="toolClass" @click="addComment">
        <MessageSquare :size="18" aria-hidden="true" />{{ t('songChartEditor.addComment') }}
      </button>
      <button type="button" data-test="open-chord" :class="toolClass" :disabled="!canWriteChord" @mousedown.prevent @click="openChordPopover">
        <Music :size="18" aria-hidden="true" />{{ t('songChartEditor.chord') }}
      </button>
    </div>
    <p class="text-xs text-ink-muted">{{ t('songChartEditor.chordHint') }}</p>

    <div class="flex flex-wrap items-end gap-2">
      <label class="flex flex-col gap-1 text-xs font-semibold text-ink-subtle">
        {{ t('songChartEditor.sectionKind') }}
        <select v-model="sectionKind" data-test="section-kind" class="h-10 rounded-lg border border-border bg-surface px-2 text-sm text-ink" @change="setSectionAttrs">
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
          class="h-10 w-44 rounded-lg border border-border bg-surface px-2 text-sm text-ink"
          @change="setSectionAttrs"
        />
      </label>
    </div>

    <div ref="lyricsBox" class="relative">
      <EditorContent :editor="editor" class="rounded-xl bg-surface-raised py-2" />
      <ChordPopover
        v-if="popoverOpen"
        v-model:symbol="chordSymbol"
        :on-chord="chordAtCursor !== null"
        :check="typedCheck"
        :voicings="voicingsAtCursor"
        :picked-voicing-id="chordAtCursor?.chordVoicingId ?? null"
        :position="popoverPosition"
        @put="putChord"
        @remove="removeChord"
        @pick="pickVoicing"
        @close="closeChordPopover"
      />
      <div
        v-if="picking"
        data-test="progression-picker"
        role="dialog"
        :aria-label="t('songChartEditor.progressions')"
        class="absolute z-30 flex w-[min(320px,calc(100vw-48px))] flex-col rounded-2xl border border-border bg-surface-raised p-2 shadow-level2"
        :style="{ top: `${picking.top}px`, left: `${picking.left}px` }"
        @keydown.esc.stop="closePicker"
      >
        <div class="flex justify-end">
          <button type="button" data-test="close-progression-picker" class="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken" :aria-label="t('songChart.closeSheet')" @click="closePicker">
            <X :size="16" aria-hidden="true" />
          </button>
        </div>
        <ProgressionPicker :progressions="progressions" :tagged="pickingTags" @toggle="toggleTag" />
      </div>
    </div>
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
/* A chord that stops publishing is marked where it is written: red dashed when it isn't a chord,
   amber dashed when the catalog lacks it. The first reason on a line sits under that line. */
:deep(.song-chart-lyrics [data-problem]) {
  text-decoration: underline dashed 2px;
  text-underline-offset: 4px;
}
:deep(.song-chart-lyrics [data-problem='not_a_chord']) {
  text-decoration-color: rgb(var(--color-danger));
}
:deep(.song-chart-lyrics [data-problem='not_in_catalog']) {
  text-decoration-color: rgb(var(--color-warning));
}
:deep(.song-chart-chord:has(> [data-problem]))::before {
  padding: 0 2px;
  border: 1px dashed;
  border-radius: 4px;
}
:deep(.song-chart-chord:has(> [data-problem='not_a_chord']))::before {
  border-color: rgb(var(--color-danger));
  color: rgb(var(--color-danger));
}
:deep(.song-chart-chord:has(> [data-problem='not_in_catalog']))::before {
  border-color: rgb(var(--color-warning));
  color: rgb(var(--color-warning));
}
:deep(.song-chart-lyrics p[data-problem-reason])::after {
  content: attr(data-problem-reason);
  display: block;
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgb(var(--color-ink-muted));
}
</style>
