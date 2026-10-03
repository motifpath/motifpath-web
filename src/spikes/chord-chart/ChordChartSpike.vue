<script setup lang="ts">
import { computed, ref } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

import { ChordAnchor } from '@/spikes/chord-chart/chordAnchor'

const symbol = ref('C')
const voicingId = ref('c-open')
const phonePreview = ref(false)
const chartDocument = ref<Record<string, unknown> | null>(null)
const selectedRange = ref({ from: 0, to: 0, empty: true })

const voicings = [
  { id: 'c-open', label: 'Open shape', detail: 'Open · easy' },
  { id: 'c-barre-3', label: 'Barre · fret 3', detail: 'Movable · barre' },
]

const editor = useEditor({
  extensions: [Document, Paragraph, Text, ChordAnchor],
  content: '<p>Amazing grace, how sweet the sound that saved a wretch like me.</p>',
  editorProps: {
    attributes: {
      class: 'lyric-editor',
      'aria-label': 'Song lyrics. Select a word or syllable to attach a chord.',
      spellcheck: 'false',
    },
  },
  onUpdate: ({ editor: current }) => {
    chartDocument.value = current.getJSON() as Record<string, unknown>
  },
  onSelectionUpdate: ({ editor: current }) => {
    const { from, to, empty } = current.state.selection
    selectedRange.value = { from, to, empty }
  },
  onCreate: ({ editor: current }) => {
    chartDocument.value = current.getJSON() as Record<string, unknown>
  },
})

const hasSelection = computed(() => !selectedRange.value.empty)
const markCount = computed(() => {
  const json = chartDocument.value
  const paragraph = json?.content as
    Array<{ content?: Array<{ marks?: Array<{ type: string }> }> }> | undefined
  return (
    paragraph
      ?.flatMap((block) => block.content ?? [])
      .filter((node) => node.marks?.some((mark) => mark.type === 'chordAnchor')).length ?? 0
  )
})

function applyChord() {
  if (!editor.value || selectedRange.value.empty) return
  editor.value.commands.setChordAnchor({
    symbol: symbol.value.trim() || 'C',
    chordDefinitionId: symbol.value.trim().toLowerCase() === 'c' ? 'c-major' : null,
    voicingId: voicingId.value,
  })
}

function removeChord() {
  if (!editor.value || selectedRange.value.empty) return
  editor.value.commands.unsetChordAnchor()
}

function loadSavedDocument() {
  if (editor.value && chartDocument.value) editor.value.commands.setContent(chartDocument.value)
}
</script>

<template>
  <main class="spike-shell" :class="{ 'phone-preview': phonePreview }">
    <header class="topbar">
      <a class="brand" href="#" aria-label="MotifPath chord chart spike">
        <span class="brand-mark">m</span><span>MotifPath</span>
      </a>
      <span class="topbar-context"
        >Content studio <span class="context-dot">/</span> Song chart</span
      >
      <button
        class="preview-toggle"
        type="button"
        :aria-pressed="phonePreview"
        @click="phonePreview = !phonePreview"
      >
        {{ phonePreview ? 'Desktop preview' : 'Phone preview' }}
      </button>
      <span class="draft-badge"><i></i> Draft</span>
    </header>

    <section class="workspace">
      <div class="intro">
        <div>
          <p class="eyebrow">AUTHORING SPIKE · TIPTAP</p>
          <h1>Build a song chart</h1>
          <p class="intro-copy">
            Write the lyric, select a word, and place its chord right where it belongs.
          </p>
        </div>
        <div class="test-chip"><span class="check">✓</span> Real editor · local draft</div>
      </div>

      <div class="columns">
        <section class="editor-card" aria-labelledby="lyrics-heading">
          <div class="card-heading">
            <div>
              <span class="step">01</span>
              <h2 id="lyrics-heading">Lyrics &amp; chord anchors</h2>
            </div>
            <span class="format-pill">SONG BODY</span>
          </div>
          <div class="song-meta">
            <div><label>SONG TITLE</label><strong>Amazing Grace</strong></div>
            <div><label>KEY</label><strong>G major</strong></div>
          </div>
          <div class="editor-instruction">
            <span class="cursor-icon">↖</span> Select a word or syllable below to attach a chord
          </div>
          <EditorContent v-if="editor" :editor="editor" />
          <div class="editor-footer">
            <span>{{ markCount }} chord {{ markCount === 1 ? 'anchor' : 'anchors' }}</span
            ><span>Changes are local to this spike</span>
          </div>
        </section>

        <aside class="chord-card" aria-labelledby="chord-heading">
          <div class="card-heading">
            <div>
              <span class="step">02</span>
              <h2 id="chord-heading">Place a chord</h2>
            </div>
            <span class="music-note">♪</span>
          </div>
          <p class="panel-copy">
            The chord stays attached to your selected lyric, even when the line wraps.
          </p>

          <label class="field-label" for="chord-symbol">CHORD SYMBOL</label>
          <input
            id="chord-symbol"
            v-model="symbol"
            class="symbol-input"
            autocomplete="off"
            aria-label="Chord symbol"
          />

          <div class="field-label voicing-label">CHART VOICING</div>
          <div class="voicing-options" role="group" aria-label="Choose a chord voicing">
            <button
              v-for="voicing in voicings"
              :key="voicing.id"
              type="button"
              class="voicing-option"
              :class="{ selected: voicingId === voicing.id }"
              :aria-pressed="voicingId === voicing.id"
              @mousedown.prevent
              @click="voicingId = voicing.id"
            >
              <span class="radio-dot"></span>
              <span
                ><strong>{{ voicing.label }}</strong
                ><small>{{ voicing.detail }}</small></span
              >
              <span
                class="mini-fretboard"
                :class="voicing.id === 'c-barre-3' ? 'barre' : 'open'"
                aria-hidden="true"
              >
                <i v-for="n in 6" :key="n"></i>
                <b v-for="n in 3" :key="n"></b>
              </span>
            </button>
          </div>

          <button
            class="primary-action"
            type="button"
            :disabled="!hasSelection"
            @mousedown.prevent
            @click="applyChord"
          >
            <span>＋</span>
            {{ hasSelection ? 'Add chord to selection' : 'Select lyric text first' }}
          </button>
          <button
            class="remove-action"
            type="button"
            :disabled="!hasSelection"
            @mousedown.prevent
            @click="removeChord"
          >
            Remove chord from selection
          </button>
          <div class="tip">
            <span>↗</span>
            <p>
              Try a word, a syllable, or a short phrase. Choose another shape without changing the
              lyric.
            </p>
          </div>
        </aside>
      </div>

      <details class="data-panel">
        <summary>
          <span>Saved chart document</span
          ><span class="data-meta">Tiptap JSON · chart-specific mark</span>
        </summary>
        <pre>{{ JSON.stringify(chartDocument, null, 2) }}</pre>
        <button type="button" class="restore-button" @click="loadSavedDocument">
          Reload saved JSON into editor
        </button>
      </details>
      <footer class="scope-note">
        <span class="scope-line"></span
        ><span>This is a technical spike only. No learner chart or production data is saved.</span>
      </footer>
    </section>
  </main>
</template>

<style>
:root {
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  color: #17221f;
  background: #f7f8f5;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  min-width: 320px;
  background: #f7f8f5;
}
button,
input {
  font: inherit;
}
.spike-shell {
  min-height: 100vh;
  background: #f7f8f5;
}
.topbar {
  height: 62px;
  padding: 0 clamp(20px, 5vw, 72px);
  display: flex;
  align-items: center;
  gap: 24px;
  background: #fff;
  border-bottom: 1px solid #e8ebe7;
}
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #20302a;
  text-decoration: none;
  font-weight: 720;
  letter-spacing: -0.03em;
}
.brand-mark {
  width: 27px;
  height: 27px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: #dcece4;
  color: #357a5c;
  font-family: Georgia, serif;
  font-size: 20px;
  font-weight: 700;
}
.topbar-context {
  color: #737e78;
  font-size: 12px;
}
.context-dot {
  padding: 0 6px;
  color: #b7bfba;
}
.draft-badge {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 99px;
  background: #f1f4f0;
  color: #627169;
  font-size: 11px;
  font-weight: 600;
}
.draft-badge i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d8a447;
}
.workspace {
  width: min(1024px, calc(100% - 40px));
  margin: 0 auto;
  padding: 40px 0 24px;
}
.intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.eyebrow {
  color: #55836b;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.12em;
  margin: 0 0 10px;
}
.intro h1 {
  margin: 0;
  color: #1c2924;
  font-size: clamp(25px, 4vw, 34px);
  letter-spacing: -0.045em;
  font-weight: 650;
}
.intro-copy {
  margin: 8px 0 0;
  color: #78827c;
  font-size: 13px;
}
.test-chip {
  white-space: nowrap;
  padding: 8px 11px;
  border: 1px solid #e1e9e2;
  border-radius: 8px;
  color: #68766d;
  font-size: 10px;
  background: #fbfcfa;
}
.check {
  color: #478162;
  margin-right: 5px;
  font-weight: 800;
}
.columns {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.85fr);
  gap: 16px;
  align-items: start;
}
.editor-card,
.chord-card {
  border: 1px solid #e5e9e4;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 5px 18px #293b3010;
}
.editor-card {
  min-height: 390px;
}
.chord-card {
  padding: 20px;
}
.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 17px 20px;
  border-bottom: 1px solid #eef0ed;
}
.card-heading > div {
  display: flex;
  align-items: center;
  gap: 9px;
}
.card-heading h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.015em;
}
.step {
  color: #9ba69f;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.format-pill {
  color: #87928b;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.music-note {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #edf5ef;
  color: #518269;
}
.song-meta {
  display: flex;
  gap: 34px;
  padding: 20px 24px 4px;
}
.song-meta div {
  display: grid;
  gap: 5px;
}
.song-meta label,
.field-label {
  color: #89948d;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.09em;
}
.song-meta strong {
  color: #35423b;
  font-size: 12px;
  font-weight: 600;
}
.editor-instruction {
  margin: 20px 24px 0;
  padding: 9px 11px;
  border-radius: 6px;
  background: #f6f8f5;
  color: #7e8982;
  font-size: 10px;
}
.cursor-icon {
  margin-right: 5px;
  color: #5d8d6f;
}
.lyric-editor {
  outline: none;
  min-height: 160px;
  padding: 30px 24px 22px;
  color: #34423a;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(19px, 2.6vw, 24px);
  line-height: 2.15;
  white-space: normal;
  overflow-wrap: anywhere;
  caret-color: #39805b;
}
.lyric-editor p {
  margin: 0;
}
.lyric-editor p:focus {
  outline: none;
}
.lyric-editor ::selection {
  background: #d4ebdc;
}
.chord-anchor {
  position: relative;
  display: inline;
  white-space: nowrap;
  border-radius: 3px;
  outline: none;
}
.chord-anchor::before {
  content: attr(data-chord-symbol);
  position: absolute;
  bottom: calc(100% + 1px);
  left: 50%;
  transform: translateX(-50%);
  color: #397754;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 0.53em;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: 0.01em;
}
.chord-anchor.ProseMirror-selectednode {
  background: #e5f1e8;
}
.editor-footer {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #f0f2ef;
  padding: 11px 20px;
  color: #939c96;
  font-size: 10px;
}
.editor-footer span:first-child {
  color: #65806f;
  font-weight: 600;
}
.panel-copy {
  margin: 12px 0 20px;
  color: #7b857f;
  font-size: 11px;
  line-height: 1.55;
}
.field-label {
  display: block;
  margin: 0 0 7px;
}
.symbol-input {
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border: 1px solid #dde4dd;
  border-radius: 7px;
  outline: none;
  color: #20372b;
  font-size: 14px;
  font-weight: 650;
  background: #fff;
}
.symbol-input:focus {
  border-color: #73a485;
  box-shadow: 0 0 0 3px #e9f2eb;
}
.voicing-label {
  margin-top: 18px;
}
.voicing-options {
  display: grid;
  gap: 7px;
}
.voicing-option {
  width: 100%;
  min-height: 55px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border: 1px solid #e6eae5;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  color: #3e4b43;
  cursor: pointer;
}
.voicing-option.selected {
  border-color: #79a78a;
  background: #f7fbf7;
}
.radio-dot {
  width: 12px;
  height: 12px;
  border: 1px solid #c4cec6;
  border-radius: 50%;
  flex: none;
}
.selected .radio-dot {
  border: 4px solid #4e8965;
}
.voicing-option strong,
.voicing-option small {
  display: block;
}
.voicing-option strong {
  font-size: 10px;
  font-weight: 650;
}
.voicing-option small {
  margin-top: 3px;
  color: #89938c;
  font-size: 9px;
}
.mini-fretboard {
  margin-left: auto;
  width: 33px;
  height: 34px;
  position: relative;
  display: flex;
  justify-content: space-between;
  padding: 0 3px;
  border-top: 2px solid #657168;
  border-bottom: 1px solid #aeb8b0;
}
.mini-fretboard i {
  height: 100%;
  width: 1px;
  background: #bbc4bc;
}
.mini-fretboard b {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #558367;
  top: 8px;
  left: 11px;
}
.mini-fretboard b:last-child {
  left: 22px;
  top: 19px;
}
.mini-fretboard.barre::after {
  content: '';
  position: absolute;
  top: 9px;
  left: 8px;
  width: 19px;
  height: 4px;
  border-radius: 4px;
  background: #548367;
}
.mini-fretboard.barre b {
  display: none;
}
.primary-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  height: 39px;
  margin-top: 17px;
  border: 0;
  border-radius: 7px;
  background: #31754f;
  color: #fff;
  font-size: 11px;
  font-weight: 650;
  cursor: pointer;
}
.primary-action:hover:not(:disabled) {
  background: #286641;
}
.primary-action:disabled {
  background: #e9ede9;
  color: #929b94;
  cursor: not-allowed;
}
.primary-action span {
  font-size: 16px;
  line-height: 0;
}
.remove-action {
  display: block;
  margin: 8px auto 0;
  border: 0;
  background: transparent;
  color: #758078;
  font-size: 10px;
  cursor: pointer;
}
.remove-action:disabled {
  color: #b3bab5;
  cursor: not-allowed;
}
.tip {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding: 10px;
  border-radius: 7px;
  background: #f7f8f5;
  color: #718077;
}
.tip > span {
  color: #568569;
  font-size: 12px;
}
.tip p {
  margin: 0;
  font-size: 9px;
  line-height: 1.55;
}
.data-panel {
  margin-top: 16px;
  border: 1px solid #e5e9e4;
  border-radius: 10px;
  background: #fff;
}
.data-panel summary {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 15px;
  cursor: pointer;
  color: #46534a;
  font-size: 10px;
  font-weight: 650;
}
.data-meta {
  color: #9aa39d;
  font-weight: 400;
}
.data-panel pre {
  overflow: auto;
  max-height: 320px;
  margin: 0;
  padding: 16px;
  background: #f6f8f5;
  color: #4e5c52;
  font-size: 10px;
  line-height: 1.5;
}
.restore-button {
  margin: 10px 14px 14px;
  padding: 6px 9px;
  border: 1px solid #e0e6e0;
  border-radius: 6px;
  background: #fff;
  color: #68766d;
  font-size: 10px;
  cursor: pointer;
}
.scope-note {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 18px;
  color: #9aa39c;
  font-size: 10px;
}
.scope-line {
  width: 18px;
  height: 1px;
  background: #b6c9ba;
}
.preview-toggle {
  margin-left: auto;
  padding: 6px 9px;
  border: 1px solid #dfe7df;
  border-radius: 7px;
  background: #fff;
  color: #62746a;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}
.draft-badge {
  margin-left: 0;
}
.phone-preview {
  width: min(430px, 100%);
  min-height: 100vh;
  margin: 0 auto;
  border-left: 1px solid #e9ece8;
  border-right: 1px solid #e9ece8;
  background: #f7f8f5;
  box-shadow: 0 0 30px #20372b12;
}
.phone-preview .topbar {
  padding: 0 15px;
  gap: 10px;
}
.phone-preview .topbar-context {
  display: none;
}
.phone-preview .preview-toggle {
  margin-left: auto;
}
.phone-preview .workspace {
  width: calc(100% - 28px);
  padding-top: 25px;
}
.phone-preview .intro {
  align-items: flex-start;
}
.phone-preview .intro-copy {
  max-width: 290px;
  line-height: 1.5;
}
.phone-preview .test-chip {
  display: none;
}
.phone-preview .columns {
  grid-template-columns: 1fr;
  gap: 12px;
}
.phone-preview .editor-card {
  min-height: 330px;
}
.phone-preview .lyric-editor {
  min-height: 150px;
  padding: 27px 19px 20px;
  font-size: 20px;
  line-height: 2.15;
}
.phone-preview .song-meta {
  padding-left: 19px;
}
.phone-preview .editor-instruction {
  margin-left: 19px;
  margin-right: 19px;
}
.phone-preview .card-heading {
  padding: 15px 17px;
}
.phone-preview .chord-card {
  padding: 17px;
}
.phone-preview .data-meta {
  text-align: right;
}
.phone-preview .scope-note {
  line-height: 1.4;
}
@media (max-width: 700px) {
  .topbar {
    height: 56px;
    padding: 0 18px;
    gap: 12px;
  }
  .topbar-context {
    font-size: 10px;
  }
  .workspace {
    width: calc(100% - 28px);
    padding: 28px 0 20px;
  }
  .intro {
    align-items: flex-start;
    margin-bottom: 17px;
  }
  .intro-copy {
    max-width: 270px;
    line-height: 1.5;
  }
  .test-chip {
    display: none;
  }
  .columns {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .editor-card {
    min-height: 340px;
  }
  .chord-card {
    padding: 17px;
  }
  .lyric-editor {
    min-height: 150px;
    padding: 27px 19px 20px;
    font-size: 20px;
    line-height: 2.15;
  }
  .song-meta {
    padding-left: 19px;
  }
  .editor-instruction {
    margin-left: 19px;
    margin-right: 19px;
  }
  .card-heading {
    padding: 15px 17px;
  }
  .data-meta {
    text-align: right;
  }
  .scope-note {
    line-height: 1.4;
  }
}
</style>
