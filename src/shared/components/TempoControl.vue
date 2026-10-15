<script setup lang="ts">
/**
 * A tempo to play at, in one 48 px row: the metronome toggle, a slider from the slowest tempo
 * offered to the fastest playable as the main control, with the best clean tempo and the goal
 * marked on it when there are any, and the value, which the student taps to type an exact tempo.
 * A tempo is chosen once the slider is released or the typing is done, so one gesture is one
 * choice. Where the surface offers note values, the one the music plays at shows as an icon
 * after the tempo, its choices one tap away.
 */
import { computed, nextTick, ref } from 'vue'
import { Metronome } from 'lucide-vue-next'

import NoteValuePicker from '@/shared/components/NoteValuePicker.vue'
import { useTempoAsPlayed } from '@/shared/composables/useTempoAsPlayed'
import { useTypedT } from '@/shared/composables/useTypedT'
import { MAX_TEMPO_BPM, TEMPO_STEP_BPM } from '@/shared/utils/sequence'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

const props = defineProps<{
  tempo: number
  /** The ladder's slowest tempo, where the slider starts. */
  slowest: number
  /** The tempo to work up to, marked on the slider; none when there's no target. */
  goal: number | null
  /** What the goal's mark says; "Goal {bpm} BPM" by default. */
  goalLabel?: string
  /** The best clean tempo so far, if any. */
  best: number | null
  /** Whether a take clicks the beat. */
  metronome: boolean
  /** While a take plays, nothing here changes. */
  disabled: boolean
  /** The note value the music plays at; shown only with `noteValues`. */
  noteValue?: TempoNoteValue
  /** The note values this surface offers; none shows no note value. */
  noteValues?: readonly TempoNoteValue[]
}>()

const emit = defineEmits<{ tempo: [bpm: number]; 'update:metronome': [on: boolean]; 'update:noteValue': [value: TempoNoteValue] }>()

const { t } = useTypedT()
const { asPlayed } = useTempoAsPlayed()

/** A mark's tempo in words, in the note value shown, if any. */
const markTempo = (bpm: number) => asPlayed(bpm, props.noteValues?.length ? (props.noteValue ?? 'quarters') : 'quarters')

/** The slider's tempo while it's being dragged. */
const sliding = ref<number | null>(null)
const shownTempo = computed(() => sliding.value ?? props.tempo)

function slide(event: Event) {
  if (event.target instanceof HTMLInputElement) sliding.value = Number(event.target.value)
}

function release(event: Event) {
  if (event.target instanceof HTMLInputElement) choose(Number(event.target.value))
}

function choose(bpm: number) {
  sliding.value = null
  emit('tempo', Math.min(MAX_TEMPO_BPM, Math.max(props.slowest, Math.round(bpm))))
}

/** Where a tempo sits along the slider, as a share of its length. */
function along(bpm: number): string {
  const share = (bpm - props.slowest) / (MAX_TEMPO_BPM - props.slowest)
  return `${Math.min(1, Math.max(0, share)) * 100}%`
}

const ticks = computed(() => [
  ...(props.best === null ? [] : [{ kind: 'best', bpm: props.best, label: t('tempoControl.bestTick', { tempo: markTempo(props.best) }) }]),
  ...(props.goal === null
    ? []
    : [{ kind: 'goal', bpm: props.goal, label: props.goalLabel ?? t('tempoControl.goalTick', { tempo: markTempo(props.goal) }) }]),
])

/** The typed tempo while the student types one; null while the value only shows. */
const typed = ref<string | null>(null)
const field = ref<HTMLInputElement | null>(null)

async function startTyping() {
  if (props.disabled) return
  typed.value = String(props.tempo)
  await nextTick()
  field.value?.focus()
  field.value?.select()
}

function finishTyping() {
  const raw = typed.value
  typed.value = null
  if (raw === null || String(raw).trim() === '') return
  const bpm = Number(raw)
  if (Number.isFinite(bpm) && bpm > 0) choose(bpm)
}

function onFieldKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    // Typing's Enter isn't the screen's primary action.
    event.preventDefault()
    finishTyping()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    typed.value = null
  }
}
</script>

<template>
  <div data-test="tempo-control" class="flex min-h-12 items-center gap-3" role="group" aria-labelledby="tempo-heading">
    <span id="tempo-heading" data-test="tempo-heading" class="sr-only">{{ t('tempoControl.label') }}</span>

    <button
      type="button"
      data-test="metronome"
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
      :class="metronome ? 'bg-accent-muted text-accent-text' : 'border border-border text-ink-muted'"
      :aria-pressed="metronome"
      :aria-label="t('tempoControl.metronome')"
      :title="t('tempoControl.metronome')"
      :disabled="disabled"
      @click="emit('update:metronome', !metronome)"
    >
      <Metronome :size="20" aria-hidden="true" />
    </button>

    <div class="flex min-w-0 flex-1 flex-col">
      <div class="relative flex h-8 items-center">
        <input
          type="range"
          data-test="tempo-slider"
          class="h-8 w-full cursor-pointer accent-accent disabled:cursor-default disabled:opacity-60"
          :min="slowest"
          :max="MAX_TEMPO_BPM"
          :step="TEMPO_STEP_BPM"
          :value="shownTempo"
          :disabled="disabled"
          :aria-label="t('tempoControl.label')"
          :aria-valuetext="t('tempoControl.bpm', { bpm: shownTempo })"
          @input="slide"
          @change="release"
        />
        <span
          v-for="tick in ticks"
          :key="tick.kind"
          :data-test="`tempo-tick-${tick.kind}`"
          :title="tick.label"
          class="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          :class="tick.kind === 'goal' ? 'bg-ink-muted' : 'bg-accent'"
          :style="{ left: along(tick.bpm) }"
        />
      </div>
      <div class="flex justify-between text-xs tabular-nums text-ink-subtle" aria-hidden="true">
        <span data-test="tempo-min">{{ slowest }}</span>
        <span data-test="tempo-max">{{ MAX_TEMPO_BPM }}</span>
      </div>
    </div>

    <input
      v-if="typed !== null"
      ref="field"
      v-model="typed"
      data-test="tempo-input"
      type="number"
      inputmode="numeric"
      class="h-12 w-20 shrink-0 rounded-md border border-accent bg-surface px-2 text-right text-lg font-semibold tabular-nums"
      :min="slowest"
      :max="MAX_TEMPO_BPM"
      :aria-label="t('tempoControl.typeTempo')"
      @keydown="onFieldKeydown"
      @blur="finishTyping"
    />
    <button
      v-else
      type="button"
      data-test="tempo-value"
      class="flex h-12 shrink-0 items-baseline gap-1 rounded-md px-3 pt-3 tabular-nums"
      :class="disabled ? 'cursor-default' : 'border border-border'"
      :title="t('tempoControl.typeTempo')"
      :aria-disabled="disabled"
      @click="startTyping"
    >
      <span class="text-lg font-semibold">{{ shownTempo }}</span>{{ ' ' }}<span class="text-xs text-ink-muted">BPM</span>
    </button>

    <NoteValuePicker
      v-if="noteValues && noteValues.length > 0"
      :model-value="noteValue ?? 'quarters'"
      :values="noteValues"
      :disabled="disabled"
      @update:model-value="emit('update:noteValue', $event)"
    />
  </div>
</template>
