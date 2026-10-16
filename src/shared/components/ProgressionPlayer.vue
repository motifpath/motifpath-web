<script setup lang="ts">
/**
 * A cadence or progression a drill plays before its question: Play, "Listen" with what it plays,
 * a tempo chip that opens its tempo, note value and click, and a bar for each chord that follows
 * the playing. The bars the question gives
 * show their numerals; the bar asked shows "?". Replay is unlimited and is never an answer. It
 * says when the sound starts and stops, so an answer can be timed from the sound, and when the
 * sound can't be heard, so the holder can hold the options and offer another try.
 */
import { LoaderCircle, Play, Square } from 'lucide-vue-next'
import { computed, onBeforeUnmount, watch } from 'vue'

import type { components as EventComponents } from '@/api/generated/event-ingestion'
import BarCell from '@/shared/components/BarCell.vue'
import type { BarPhase } from '@/shared/components/BarCell.vue'
import ProgressionTempo from '@/shared/components/ProgressionTempo.vue'
import { useProgressionPlayback } from '@/shared/composables/useProgressionPlayback'
import type { ProgressionSource } from '@/shared/composables/useProgressionPlayback'
import { useTypedT } from '@/shared/composables/useTypedT'

type MissingReason = EventComponents['schemas']['NotAnsweredResponse']['reason']

const props = defineProps<{
  source: ProgressionSource
  /** Each bar's label, in order; null for the bar asked. */
  bars: (string | null)[]
  /** What the player plays, e.g. "A cadence sets the key, then the chord". */
  subtitle: string
}>()

const emit = defineEmits<{ playing: [playing: boolean]; missing: [reason: MissingReason] }>()

const { t } = useTypedT()
const { state, status, currentBar, tempo, noteValue, metronome, toggle } = useProgressionPlayback(() => props.source)

const sounding = computed(() => state.value === 'playing')
watch(sounding, (now) => emit('playing', now))
// Going away silences the sound, which a holder timing answers must hear about.
onBeforeUnmount(() => {
  if (sounding.value) emit('playing', false)
})
watch(status, (now) => {
  if (now === 'missing') emit('missing', 'failed_to_load')
})

const busy = computed(() => state.value === 'playing' || state.value === 'loading')

function phaseOf(bar: number): BarPhase {
  if (currentBar.value === null) return 'upcoming'
  if (bar < currentBar.value) return 'played'
  return bar === currentBar.value ? 'current' : 'upcoming'
}
</script>

<template>
  <div data-test="progression-player" class="flex w-full flex-col gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3">
    <div class="flex items-center gap-3">
      <button
        data-test="progression-play"
        type="button"
        class="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        :aria-label="busy ? t('diagramPlayer.stop') : t('drill.player.listen')"
        :aria-busy="state === 'loading' ? 'true' : undefined"
        @click="toggle"
      >
        <LoaderCircle v-if="state === 'loading'" :size="24" class="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <Square v-else-if="state === 'playing'" :size="20" fill="currentColor" aria-hidden="true" />
        <Play v-else :size="24" aria-hidden="true" />
      </button>
      <div class="min-w-0 flex-1">
        <p class="text-base font-semibold text-ink">{{ t('drill.player.listen') }}</p>
        <p class="text-xs font-medium text-ink-muted">{{ subtitle }}</p>
      </div>
      <ProgressionTempo v-model:tempo="tempo" v-model:note-value="noteValue" v-model:metronome="metronome" />
    </div>
    <ol :aria-label="t('drill.player.bars')" class="flex w-full gap-1.5">
      <BarCell v-for="(label, i) in bars" :key="i" :label="label" :position="i + 1" :phase="phaseOf(i)" />
    </ol>
  </div>
</template>
