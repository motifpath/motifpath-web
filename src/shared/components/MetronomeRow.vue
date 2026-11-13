<script setup lang="ts">
/**
 * The metronome row every drill that keeps a beat shows, the same as the Metronome tool's: a dot a
 * beat, the sounding one lit, above the tempo control with its marks, its metronome switch and,
 * where the drill lets the student pick one, its note values. What goes before the dots, such as
 * the Metronome tool's bar picker, comes in the `before` slot.
 */
import BeatDots from '@/shared/components/BeatDots.vue'
import TempoControl from '@/shared/components/TempoControl.vue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

defineProps<{
  /** Beats in the bar, a dot each. */
  beats: number
  /** The sounding beat, from 0; null while silent. */
  lit: number | null
  tempo: number
  slowest: number
  goal: number | null
  goalLabel?: string
  best: number | null
  metronome: boolean
  disabled: boolean
  noteValue?: TempoNoteValue
  noteValues?: readonly TempoNoteValue[]
}>()

const emit = defineEmits<{ tempo: [bpm: number]; 'update:metronome': [on: boolean]; 'update:noteValue': [value: TempoNoteValue] }>()
</script>

<template>
  <div data-test="metronome-row" class="flex flex-col gap-4">
    <div class="flex items-center justify-center gap-5">
      <slot name="before" />
      <BeatDots :beats="beats" :lit="lit" />
    </div>
    <TempoControl
      :tempo="tempo"
      :slowest="slowest"
      :goal="goal"
      :goal-label="goalLabel"
      :best="best"
      :metronome="metronome"
      :disabled="disabled"
      :note-value="noteValue"
      :note-values="noteValues"
      @tempo="emit('tempo', $event)"
      @update:metronome="emit('update:metronome', $event)"
      @update:note-value="emit('update:noteValue', $event)"
    />
  </div>
</template>
