<script setup lang="ts">
/**
 * The bar of the Metronome tool as its fraction, with its choices on demand: a tap shows the
 * presets (2/4, 3/4, 4/4, 6/8, 12/8), one tap each, and − / + for the beats (1 to 12) and the beat
 * note (/2, /4, /8), which reach every other bar. A preset applies and closes; the steppers apply
 * at once and stay open. A tap outside or Escape closes it. It is drawn beside the fraction, never
 * over it.
 */
import { ChevronDown, Minus, Plus } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import { useAnchoredPopover } from '@/shared/composables/useAnchoredPopover'
import { useTypedT } from '@/shared/composables/useTypedT'

type TimeSignature = components['schemas']['TimeSignature']
type BeatValue = TimeSignature['beat_value']

const PRESETS: TimeSignature[] = [
  { beats: 2, beat_value: 4 },
  { beats: 3, beat_value: 4 },
  { beats: 4, beat_value: 4 },
  { beats: 6, beat_value: 8 },
  { beats: 12, beat_value: 8 },
]
const MIN_BEATS = 1
const MAX_BEATS = 12
/** The beat notes offered, longest first: − steps to a shorter note, + to a longer one. */
const BEAT_NOTES: BeatValue[] = [2, 4, 8]

const signature = defineModel<TimeSignature>({ required: true })

const { t } = useTypedT()

const open = ref(false)
const button = ref<HTMLButtonElement | null>(null)
const popover = ref<HTMLElement | null>(null)
const headingId = `time-signature-heading-${useId()}`

const { style } = useAnchoredPopover(button, popover, open)

const fraction = (bar: TimeSignature) => `${bar.beats}/${bar.beat_value}`
const same = (a: TimeSignature, b: TimeSignature) => a.beats === b.beats && a.beat_value === b.beat_value
const noteIndex = () => BEAT_NOTES.indexOf(signature.value.beat_value)

function close(returnFocus: boolean) {
  open.value = false
  if (returnFocus) button.value?.focus()
}

function choosePreset(bar: TimeSignature) {
  signature.value = { ...bar }
  close(true)
}

function stepBeats(by: number) {
  const beats = Math.min(MAX_BEATS, Math.max(MIN_BEATS, signature.value.beats + by))
  signature.value = { ...signature.value, beats }
}

function stepBeatNote(by: number) {
  const next = BEAT_NOTES[noteIndex() + by]
  if (next !== undefined) signature.value = { ...signature.value, beat_value: next }
}

/** A press anywhere but the fraction and the popover closes it, without taking focus. */
function onDocumentPointerDown(event: Event) {
  if (!open.value || !(event.target instanceof Node)) return
  if (button.value?.contains(event.target) || popover.value?.contains(event.target)) return
  close(false)
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

const STEPPER =
  'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40'
</script>

<template>
  <button
    ref="button"
    type="button"
    data-test="time-signature"
    class="flex min-h-12 shrink-0 items-center gap-1 rounded-md bg-surface-sunken py-1.5 pl-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    :aria-label="t('timeSignaturePicker.button', { signature: fraction(signature) })"
    aria-haspopup="dialog"
    :aria-expanded="open ? 'true' : 'false'"
    @click="open = !open"
  >
    <span class="text-xl font-bold tabular-nums text-ink" aria-hidden="true">{{ fraction(signature) }}</span>
    <ChevronDown :size="24" class="text-ink" aria-hidden="true" />
  </button>

  <Teleport to="body">
    <div
      v-if="open"
      ref="popover"
      data-test="time-signature-popover"
      role="dialog"
      :aria-labelledby="headingId"
      class="fixed z-50 flex w-[18.75rem] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-level2"
      :style="style"
      @keydown.escape.stop="close(true)"
    >
      <p :id="headingId" class="text-xs font-semibold uppercase tracking-wide text-ink-muted">{{ t('timeSignaturePicker.heading') }}</p>
      <div class="flex flex-wrap gap-x-2">
        <ChoiceChip
          v-for="preset in PRESETS"
          :key="fraction(preset)"
          data-test="time-signature-preset"
          :label="fraction(preset)"
          :selected="same(preset, signature)"
          @toggle="choosePreset(preset)"
        />
      </div>
      <div class="flex items-center gap-2">
        <span class="flex-1 text-sm text-ink-muted">{{ t('timeSignaturePicker.beats') }}</span>
        <button
          type="button"
          data-test="beats-less"
          :class="STEPPER"
          :aria-label="t('timeSignaturePicker.fewerBeats')"
          :disabled="signature.beats <= MIN_BEATS"
          @click="stepBeats(-1)"
        >
          <Minus :size="20" aria-hidden="true" />
        </button>
        <span data-test="beats" class="w-8 text-center text-lg font-semibold tabular-nums text-ink" aria-live="polite">{{ signature.beats }}</span>
        <button
          type="button"
          data-test="beats-more"
          :class="STEPPER"
          :aria-label="t('timeSignaturePicker.moreBeats')"
          :disabled="signature.beats >= MAX_BEATS"
          @click="stepBeats(1)"
        >
          <Plus :size="20" aria-hidden="true" />
        </button>
      </div>
      <div class="flex items-center gap-2">
        <span class="flex-1 text-sm text-ink-muted">{{ t('timeSignaturePicker.beatNote') }}</span>
        <button
          type="button"
          data-test="beat-note-less"
          :class="STEPPER"
          :aria-label="t('timeSignaturePicker.shorterBeatNote')"
          :disabled="noteIndex() >= BEAT_NOTES.length - 1"
          @click="stepBeatNote(1)"
        >
          <Minus :size="20" aria-hidden="true" />
        </button>
        <span data-test="beat-note" class="w-8 text-center text-lg font-semibold tabular-nums text-ink" aria-live="polite">{{ signature.beat_value }}</span>
        <button
          type="button"
          data-test="beat-note-more"
          :class="STEPPER"
          :aria-label="t('timeSignaturePicker.longerBeatNote')"
          :disabled="noteIndex() <= 0"
          @click="stepBeatNote(-1)"
        >
          <Plus :size="20" aria-hidden="true" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
