<script setup lang="ts">
/**
 * The Metronome tool, a page inside the Practice Shell: the same metronome row as every practice
 * screen, with every note value, and above it the bar, its time signature beside the beat dots
 * that follow the click. It opens at 80 BPM in 4/4, in quarters, silent. Every control stays live
 * while it plays and applies from the next beat. It stops when the student leaves it, and nothing
 * on it is tracked or kept.
 */
import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import BeatDots from '@/shared/components/BeatDots.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import TempoControl from '@/shared/components/TempoControl.vue'
import TimeSignaturePicker from '@/shared/components/TimeSignaturePicker.vue'
import { useMetronome } from '@/shared/composables/useMetronome'
import { useTypedT } from '@/shared/composables/useTypedT'
import { MIN_TEMPO_BPM } from '@/shared/utils/sequence'
import { ALL_NOTE_VALUES } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

type TimeSignature = components['schemas']['TimeSignature']

const START_BPM = 80

const { t } = useTypedT()

const bpm = ref(START_BPM)
const signature = ref<TimeSignature>({ beats: 4, beat_value: 4 })
const noteValue = ref<TempoNoteValue>('quarters')

const metronome = useMetronome(() => ({
  bpm: bpm.value,
  beats: signature.value.beats,
  beatValue: signature.value.beat_value,
  noteValue: noteValue.value,
}))

const label = computed(() => (metronome.on.value ? t('metronomeTool.stop') : t('metronomeTool.start')))
</script>

<template>
  <div data-test="metronome-tool" class="flex flex-col gap-6 pt-6">
    <div class="flex items-center justify-center gap-5">
      <TimeSignaturePicker v-model="signature" />
      <BeatDots :beats="signature.beats" :lit="metronome.beat.value" />
    </div>

    <TempoControl
      :tempo="bpm"
      :slowest="MIN_TEMPO_BPM"
      :goal="null"
      :best="null"
      :metronome="metronome.on.value"
      :disabled="false"
      :note-value="noteValue"
      :note-values="ALL_NOTE_VALUES"
      @tempo="bpm = $event"
      @update:metronome="metronome.toggle()"
      @update:note-value="noteValue = $event"
    />

    <PracticeActionBar>
      <PrimaryButton data-test="metronome-start" data-primary-action class="h-12 w-full" @click="metronome.toggle()">
        {{ label }}
      </PrimaryButton>
    </PracticeActionBar>
  </div>
</template>
