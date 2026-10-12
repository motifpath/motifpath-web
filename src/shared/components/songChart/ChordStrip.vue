<script setup lang="ts">
/**
 * The chords in this song, each once, as a small chord box under its name, so a learner can check
 * every shape before playing. Tapping one opens it. It scrolls sideways under the song's header,
 * and wraps in a side pane.
 */
import type { components } from '@/api/generated/core-domain'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type ChordDefinition = components['schemas']['ChordDefinition']
type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  chords: ChordDefinition[]
  diagrams: Diagram[]
  instrument: Instrument
  /** The voicing each chord's box shows. */
  voicingOf: (chord: ChordDefinition) => ChordVoicing
  layout: 'row' | 'wrap'
}>()
const emit = defineEmits<{ pick: [chord: ChordDefinition] }>()

const { t } = useTypedT()

function diagramOf(chord: ChordDefinition): Diagram | null {
  return props.diagrams.find((d) => d.diagram_id === props.voicingOf(chord).diagram_id) ?? null
}
</script>

<template>
  <section class="flex flex-col gap-2" :aria-label="t('songChart.chordsInSong')">
    <h2 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{{ t('songChart.chordsInSong') }}</h2>
    <div class="flex gap-1.5" :class="layout === 'row' ? 'overflow-x-auto' : 'flex-wrap'">
      <button
        v-for="chord in chords"
        :key="chord.chord_definition_id"
        type="button"
        data-test="strip-chord"
        :data-chord="chord.canonical_symbol"
        class="flex shrink-0 flex-col items-center gap-0.5 rounded-[10px] border border-border bg-surface-raised px-1 pb-1 pt-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        @click="emit('pick', chord)"
      >
        <span class="text-sm font-semibold text-ink">{{ chord.canonical_symbol }}</span>
        <ChordBox
          v-if="diagramOf(chord)"
          :voicing="voicingOf(chord)"
          :diagram="diagramOf(chord)!"
          :instrument="instrument"
          :label="chord.canonical_symbol"
          :scale="0.4"
        />
      </button>
    </div>
  </section>
</template>
