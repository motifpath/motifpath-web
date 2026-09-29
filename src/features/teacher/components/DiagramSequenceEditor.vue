<script setup lang="ts">
/**
 * Authoring a diagram's playback: its tempo, time signature and mode, and the
 * steps it plays — each step a note, a chord or a rest of one note value,
 * with a bar line wherever a new bar starts. Steps are added by recording
 * clicks on the fretboard above (the caller routes them to `editor`), or all
 * at once from the placed positions. A step dragged into a gap between steps
 * moves there; dragged onto another step, its notes join that step as a chord.
 *
 * Edits the form and sequence editor it's given; holds no state itself.
 */
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Circle, Trash2, X } from 'lucide-vue-next'

import type { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import type { useDiagramSequence } from '@/features/teacher/composables/useDiagramSequence'
import { useIntervalLabel } from '@/shared/composables/useIntervalLabel'
import { useTypedT } from '@/shared/composables/useTypedT'
import NoteValueIcon from '@/shared/components/NoteValueIcon.vue'
import { BASE_NOTE_VALUES, barStarts, describeNoteValue } from '@/shared/utils/sequence'
import type { components } from '@/api/generated/core-domain'

type NoteValue = components['schemas']['NoteValue']
type DiagramMode = components['schemas']['DiagramMode']
type SequenceStep = components['schemas']['SequenceStep']
type Strum = NonNullable<SequenceStep['strum']>

const props = defineProps<{
  form: ReturnType<typeof useDiagramForm>
  editor: ReturnType<typeof useDiagramSequence>
  /** What a step names its positions by: their interval, or else their note name. */
  labelMode: 'interval' | 'note' | 'hidden'
}>()

const { t } = useTypedT()
const { intervalLabel } = useIntervalLabel()

const MODES: DiagramMode[] = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']
const BEAT_COUNTS = Array.from({ length: 16 }, (_, i) => i + 1)
const BEAT_VALUES = [1, 2, 4, 8, 16, 32] as const
const TUPLET_OPTIONS = [3, 5] as const
const STRUMS: Strum[] = ['none', 'down', 'up']

const steps = computed(() => props.form.sequence.value)
const bars = computed(() => barStarts(steps.value, props.form.timeSignature.value))
// Each step with the note it's written as, when one note, dot or tuplet writes its value.
const stepViews = computed(() => steps.value.map((step) => ({ step, written: describeNoteValue(step.value) })))
const hasRoot = computed(() => props.form.rootNote.value.trim() !== '')
const selectedStep = computed(() =>
  props.editor.selectedIndex.value === null ? null : (steps.value[props.editor.selectedIndex.value] ?? null),
)

function positionLabel(positionId: string): string {
  const position = props.form.positions.value.find((p) => p.id === positionId)
  if (!position) return '?'
  if (props.labelMode === 'interval' && position.interval !== '') return intervalLabel(position.interval)
  return position.noteName || '?'
}

function stepContent(step: SequenceStep): string {
  return step.position_ids.length === 0
    ? t('diagramSequenceEditor.restLabel')
    : step.position_ids.map(positionLabel).join(' ')
}

function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1)
}

function baseName(base: (typeof BASE_NOTE_VALUES)[number]): string {
  return t(`diagramSequenceEditor.values.${base}`)
}

/** A note value's name ("Dotted quarter", "Eighth triplet"); names are lowercase until the label starts with one. */
function restLabel(base: (typeof BASE_NOTE_VALUES)[number]): string {
  return t('diagramSequenceEditor.addRest', { value: baseName(base) })
}

function valueLabel(value: NoteValue): string {
  const parts = describeNoteValue(value)
  if (!parts) return t('diagramSequenceEditor.fractionValue', { num: value.num, den: value.den })
  const name = baseName(parts.base)
  if (parts.dotted) return capitalized(t('diagramSequenceEditor.dottedValue', { value: name }))
  if (parts.tuplet) return capitalized(t(`diagramSequenceEditor.tupletValue.${parts.tuplet}`, { value: name }))
  return capitalized(name)
}

// The step being dragged, and the gap or step it's over — only while a drag is on.
const dragFrom = ref<number | null>(null)
const overGap = ref<number | null>(null)
const overStep = ref<number | null>(null)

function startDrag(index: number, event: DragEvent) {
  dragFrom.value = index
  // Firefox starts a drag only once it carries some data.
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function endDrag() {
  dragFrom.value = null
  overGap.value = null
  overStep.value = null
}

/** A step can take another's notes unless it's the one dragged, or the dragged one is a rest. */
function canMergeInto(index: number): boolean {
  const from = dragFrom.value
  return from !== null && from !== index && (steps.value[from]?.position_ids.length ?? 0) > 0
}

function onGapOver(gap: number, event: DragEvent) {
  if (dragFrom.value === null) return
  event.preventDefault()
  overGap.value = gap
  overStep.value = null
}

function onStepOver(index: number, event: DragEvent) {
  if (!canMergeInto(index)) return
  event.preventDefault()
  overStep.value = index
  overGap.value = null
}

function dropInGap(gap: number) {
  if (dragFrom.value !== null) props.editor.moveStepTo(dragFrom.value, gap)
  endDrag()
}

function dropOnStep(index: number) {
  if (dragFrom.value !== null && canMergeInto(index)) props.editor.mergeSteps(dragFrom.value, index)
  endDrag()
}

function selectValue(event: Event): string {
  return event.target instanceof HTMLSelectElement ? event.target.value : ''
}

/** Shows the tempo that was kept, since one typed out of range is clamped to a value the field may already hold. */
function onTempo(event: Event) {
  if (!(event.target instanceof HTMLInputElement) || event.target.value === '') return
  props.editor.setTempo(Number(event.target.value))
  event.target.value = String(props.form.tempoBpm.value ?? '')
}

function onBeats(event: Event) {
  const beats = Number(selectValue(event))
  if (BEAT_COUNTS.includes(beats)) props.editor.setTimeSignature({ ...props.form.timeSignature.value, beats })
}

function onBeatValue(event: Event) {
  const beatValue = BEAT_VALUES.find((value) => String(value) === selectValue(event))
  if (beatValue) props.editor.setTimeSignature({ ...props.form.timeSignature.value, beat_value: beatValue })
}

function onMode(event: Event) {
  const value = selectValue(event)
  props.editor.setMode(MODES.find((mode) => mode === value) ?? null)
}

function onStrum(event: Event) {
  const strum = STRUMS.find((s) => s === selectValue(event))
  if (strum && props.editor.selectedIndex.value !== null) props.editor.setStrum(props.editor.selectedIndex.value, strum)
}

function moveSelected(offset: number) {
  if (props.editor.selectedIndex.value !== null) props.editor.moveStep(props.editor.selectedIndex.value, offset)
}

function removeSelected() {
  if (props.editor.selectedIndex.value !== null) props.editor.removeStep(props.editor.selectedIndex.value)
}

const fieldClass = 'rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-ink disabled:opacity-50'
const toggleClass = (on: boolean) =>
  on ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface text-ink-muted'
</script>

<template>
  <section class="flex flex-col gap-3 rounded-md border border-border bg-surface-raised p-3" data-test="sequence-editor">
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-semibold text-ink">{{ t('diagramSequenceEditor.heading') }}</h3>
      <p class="text-xs text-ink-subtle">{{ t('diagramSequenceEditor.hint') }}</p>
    </div>
    <!-- Controls to hear the sequence as it stands. -->
    <slot name="player" />

    <div class="flex flex-wrap items-end gap-4">
      <label class="flex flex-col gap-1 text-xs text-ink-subtle">
        {{ t('diagramSequenceEditor.tempo') }}
        <input
          data-test="sequence-tempo"
          type="number"
          min="20"
          max="300"
          step="1"
          :value="form.tempoBpm.value ?? ''"
          :disabled="steps.length === 0"
          :class="[fieldClass, 'w-24']"
          @change="onTempo"
        />
      </label>
      <div class="flex flex-col gap-1">
        <span class="text-xs text-ink-subtle">{{ t('diagramSequenceEditor.timeSignature') }}</span>
        <div class="flex items-center gap-1">
          <select
            data-test="sequence-beats"
            :aria-label="t('diagramSequenceEditor.beatsAriaLabel')"
            :value="form.timeSignature.value.beats"
            :class="fieldClass"
            @change="onBeats"
          >
            <option v-for="beats in BEAT_COUNTS" :key="beats" :value="beats">{{ beats }}</option>
          </select>
          <span class="text-ink-subtle">/</span>
          <select
            data-test="sequence-beat-value"
            :aria-label="t('diagramSequenceEditor.beatValueAriaLabel')"
            :value="form.timeSignature.value.beat_value"
            :class="fieldClass"
            @change="onBeatValue"
          >
            <option v-for="value in BEAT_VALUES" :key="value" :value="value">{{ value }}</option>
          </select>
        </div>
      </div>
      <label class="flex flex-col gap-1 text-xs text-ink-subtle">
        {{ t('diagramSequenceEditor.mode') }}
        <select
          data-test="sequence-mode"
          :value="form.mode.value ?? ''"
          :disabled="!hasRoot"
          :title="hasRoot ? undefined : t('diagramSequenceEditor.modeNeedsRoot')"
          :class="fieldClass"
          @change="onMode"
        >
          <option value="">{{ t('diagramSequenceEditor.modeNone') }}</option>
          <option v-for="mode in MODES" :key="mode" :value="mode">{{ t(`diagramSequenceEditor.modes.${mode}`) }}</option>
        </select>
      </label>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-test="sequence-record"
        :aria-pressed="editor.recording.value"
        class="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold"
        :class="toggleClass(editor.recording.value)"
        @click="editor.toggleRecording()"
      >
        <Circle :size="10" :fill="editor.recording.value ? 'currentColor' : 'none'" aria-hidden="true" />
        {{ t('diagramSequenceEditor.record') }}
      </button>
      <button
        type="button"
        data-test="sequence-chord"
        :aria-pressed="editor.chord.value"
        :disabled="!editor.recording.value"
        class="rounded-md border px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
        :class="toggleClass(editor.chord.value)"
        @click="editor.toggleChord()"
      >
        {{ t('diagramSequenceEditor.chord') }}
      </button>
    </div>
    <p v-if="editor.recording.value" class="text-xs text-accent-text">{{ t('diagramSequenceEditor.recordingHint') }}</p>

    <div class="flex flex-wrap items-end gap-x-4 gap-y-2">
      <div class="flex flex-col gap-1">
        <span class="text-xs text-ink-subtle">{{ t('diagramSequenceEditor.noteValue') }}</span>
        <div class="flex flex-wrap items-center gap-1">
          <button
            v-for="base in BASE_NOTE_VALUES"
            :key="base"
            type="button"
            :data-test="`sequence-value-${base}`"
            :aria-pressed="editor.base.value === base"
            :title="capitalized(baseName(base))"
            class="flex h-9 w-9 items-center justify-center rounded-md border"
            :class="toggleClass(editor.base.value === base)"
            @click="editor.setBase(base)"
          >
            <NoteValueIcon kind="note" :base="base" :label="capitalized(baseName(base))" />
          </button>
          <span class="mx-1 h-6 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            data-test="sequence-dotted"
            :aria-pressed="editor.dotted.value"
            :aria-label="t('diagramSequenceEditor.dotted')"
            :title="t('diagramSequenceEditor.dotted')"
            class="flex h-9 w-9 items-center justify-center rounded-md border text-2xl leading-none"
            :class="toggleClass(editor.dotted.value)"
            @click="editor.toggleDotted()"
          >
            <span aria-hidden="true">·</span>
          </button>
          <button
            v-for="tuplet in TUPLET_OPTIONS"
            :key="tuplet"
            type="button"
            :data-test="`sequence-tuplet-${tuplet}`"
            :aria-pressed="editor.tuplet.value === tuplet"
            :aria-label="t(`diagramSequenceEditor.tuplets.${tuplet}`)"
            :title="t(`diagramSequenceEditor.tuplets.${tuplet}`)"
            class="flex h-9 w-9 items-center justify-center rounded-md border text-sm font-bold italic"
            :class="toggleClass(editor.tuplet.value === tuplet)"
            @click="editor.setTuplet(editor.tuplet.value === tuplet ? null : tuplet)"
          >
            <span aria-hidden="true">{{ tuplet }}</span>
          </button>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs text-ink-subtle">{{ t('diagramSequenceEditor.rests') }}</span>
        <div class="flex flex-wrap items-center gap-1">
          <button
            v-for="base in BASE_NOTE_VALUES"
            :key="base"
            type="button"
            :data-test="`sequence-rest-${base}`"
            :aria-label="restLabel(base)"
            :title="restLabel(base)"
            class="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted"
            @click="editor.addRest(base)"
          >
            <NoteValueIcon kind="rest" :base="base" :dotted="editor.dotted.value" :tuplet="editor.tuplet.value" label="" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <p v-if="steps.length === 0" data-test="sequence-empty" class="text-sm text-ink-muted">
      {{ t('diagramSequenceEditor.empty') }}
    </p>
    <template v-else>
      <p class="text-xs text-ink-subtle">{{ t('diagramSequenceEditor.dragHint') }}</p>
      <ol class="flex flex-wrap items-stretch gap-y-1.5" :aria-label="t('diagramSequenceEditor.stepsAriaLabel')">
        <template v-for="({ step, written }, index) in stepViews" :key="index">
          <li
            data-test="sequence-gap"
            aria-hidden="true"
            class="w-2 shrink-0 self-stretch rounded-full"
            :class="overGap === index ? 'bg-accent' : ''"
            @dragover="onGapOver(index, $event)"
            @drop.prevent="dropInGap(index)"
          />
          <li
            v-if="bars[index]"
            data-test="sequence-bar-line"
            class="mr-2 w-0.5 self-stretch rounded-full bg-ink-subtle"
            :aria-label="t('diagramSequenceEditor.barLine')"
          />
          <li class="relative">
            <button
              type="button"
              draggable="true"
              data-test="sequence-step"
              :aria-pressed="editor.selectedIndex.value === index"
              :aria-label="t('diagramSequenceEditor.stepAriaLabel', { number: index + 1, content: stepContent(step), value: valueLabel(step.value) })"
              class="flex min-w-12 cursor-grab flex-col items-center gap-0.5 rounded-md border px-2 py-1 text-xs"
              :class="[
                editor.selectedIndex.value === index
                  ? 'border-accent bg-accent-muted text-ink'
                  : 'border-border bg-surface text-ink-muted',
                overStep === index ? 'ring-2 ring-accent' : '',
                dragFrom === index ? 'opacity-50' : '',
              ]"
              @click="editor.selectStep(index)"
              @dragstart="startDrag(index, $event)"
              @dragend="endDrag"
              @dragover="onStepOver(index, $event)"
              @drop.prevent="dropOnStep(index)"
            >
              <NoteValueIcon
                v-if="written"
                :kind="step.position_ids.length === 0 ? 'rest' : 'note'"
                :base="written.base"
                :dotted="written.dotted"
                :tuplet="written.tuplet"
                label=""
                aria-hidden="true"
              />
              <span v-else class="text-[0.6875rem]">{{ step.value.num }}/{{ step.value.den }}</span>
              <span v-if="step.position_ids.length > 0" class="font-semibold">{{ stepContent(step) }}</span>
            </button>
            <button
              type="button"
              data-test="sequence-step-remove"
              :aria-label="t('diagramSequenceEditor.removeStepNumber', { number: index + 1 })"
              :title="t('diagramSequenceEditor.removeStepNumber', { number: index + 1 })"
              class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-surface text-ink-subtle hover:text-ink"
              @click="editor.removeStep(index)"
            >
              <X :size="10" aria-hidden="true" />
            </button>
          </li>
        </template>
        <li
          data-test="sequence-gap"
          aria-hidden="true"
          class="w-2 shrink-0 self-stretch rounded-full"
          :class="overGap === steps.length ? 'bg-accent' : ''"
          @dragover="onGapOver(steps.length, $event)"
          @drop.prevent="dropInGap(steps.length)"
        />
      </ol>
    </template>

    <div
      v-if="selectedStep && editor.selectedIndex.value !== null"
      class="flex flex-wrap items-center gap-2"
      data-test="sequence-step-controls"
    >
      <label v-if="selectedStep.position_ids.length >= 2" class="flex items-center gap-1.5 text-xs text-ink-subtle">
        {{ t('diagramSequenceEditor.strum') }}
        <select data-test="sequence-strum" :value="selectedStep.strum ?? 'none'" :class="fieldClass" @change="onStrum">
          <option v-for="strum in STRUMS" :key="strum" :value="strum">{{ t(`diagramSequenceEditor.strums.${strum}`) }}</option>
        </select>
      </label>
      <button
        type="button"
        data-test="sequence-move-earlier"
        :aria-label="t('diagramSequenceEditor.moveEarlier')"
        :disabled="editor.selectedIndex.value === 0"
        class="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-ink-muted disabled:opacity-50"
        @click="moveSelected(-1)"
      >
        <ChevronLeft :size="14" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="sequence-move-later"
        :aria-label="t('diagramSequenceEditor.moveLater')"
        :disabled="editor.selectedIndex.value === steps.length - 1"
        class="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-ink-muted disabled:opacity-50"
        @click="moveSelected(1)"
      >
        <ChevronRight :size="14" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="sequence-remove-step"
        :aria-label="t('diagramSequenceEditor.removeStep')"
        class="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-ink-muted"
        @click="removeSelected"
      >
        <X :size="14" aria-hidden="true" />
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        v-if="steps.length === 0"
        type="button"
        data-test="sequence-fill"
        :disabled="form.positions.value.length === 0"
        :title="t('diagramSequenceEditor.fillHint')"
        class="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink disabled:opacity-50"
        @click="editor.fillFromPositions()"
      >
        {{ t('diagramSequenceEditor.fill') }}
      </button>
      <button
        v-else
        type="button"
        data-test="sequence-clear"
        class="flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted"
        @click="editor.clear()"
      >
        <Trash2 :size="12" aria-hidden="true" />
        {{ t('diagramSequenceEditor.clear') }}
      </button>
    </div>
  </section>
</template>
