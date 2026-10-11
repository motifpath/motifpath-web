<script setup lang="ts">
/**
 * Plays a chord voicing's diagram with one of its playbacks, named after it ("Strum"). Shows
 * nothing when the diagram has nothing to play on the instrument.
 */
import { Play, Square } from 'lucide-vue-next'
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'

type Diagram = components['schemas']['Diagram']
type DiagramPlayback = components['schemas']['DiagramPlayback']
type Instrument = components['schemas']['Instrument']

const props = defineProps<{ diagram: Diagram; instrument: Instrument; playback: DiagramPlayback }>()

const { localizedName } = useLocalizedName()
const { canPlay, state, toggle } = useDiagramPlayback(() => ({
  diagram: props.diagram,
  instrument: props.instrument,
  playback: { playback_id: props.playback.playback_id, direction: 'as_authored', loop: false },
}))
const playing = computed(() => state.value === 'playing' || state.value === 'loading')
</script>

<template>
  <button
    v-if="canPlay"
    type="button"
    data-test="play-voicing"
    class="flex h-16 min-w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-accent-muted px-2 text-xs font-medium text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    @click="toggle()"
  >
    <Square v-if="playing" :size="24" aria-hidden="true" />
    <Play v-else :size="24" aria-hidden="true" />
    {{ localizedName(playback.names) }}
  </button>
</template>
