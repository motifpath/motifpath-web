<script setup lang="ts">
/**
 * The voicings of one chord in a song chart, in a card over the chart, opened from a tap on the
 * chord: the voicing as a chord box, or on the neck; one chip per voicing, named by where it sits
 * ("Open", "3fr"); and a Play control named after the voicing's default playback. It opens on the
 * voicing it's given; switching voicings, views or playing stays inside the card. It folds down to
 * its title, and a slash chord shown without its bass says so.
 */
import { ChevronDown, ChevronUp, X } from 'lucide-vue-next'
import { computed, ref, useId } from 'vue'

import type { components } from '@/api/generated/core-domain'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import ChordBoxDiagram from '@/shared/components/songChart/ChordBoxDiagram.vue'
import VoicingPlayButton from '@/shared/components/songChart/VoicingPlayButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { voicingNames } from '@/shared/utils/songChartReading'

type ChordDefinition = components['schemas']['ChordDefinition']
type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  /** The symbol as the author wrote it, the card's title. */
  writtenSymbol: string
  chord: ChordDefinition
  openingVoicing: ChordVoicing
  diagrams: Diagram[]
  instrument: Instrument
  /** The bass the written slash chord asks for that the shown voicings don't have; null when none. */
  missingBass: string | null
}>()
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()
const titleId = useId()

const folded = ref(false)
const view = ref<'box' | 'neck'>('box')
const voicingId = ref(props.openingVoicing.chord_voicing_id)
const voicing = computed(() => props.chord.voicings.find((v) => v.chord_voicing_id === voicingId.value) ?? props.openingVoicing)
const diagram = computed(() => props.diagrams.find((d) => d.diagram_id === voicing.value.diagram_id) ?? null)
const names = computed(() => voicingNames(props.chord.voicings, t('songChart.openVoicing')))

/** The voicing's default playback, the one Play sounds. */
const playback = computed(() => {
  const d = diagram.value
  return d?.playbacks.find((p) => p.playback_id === d.default_playback_id) ?? d?.playbacks[0] ?? null
})
const diagramRef = computed<DiagramRef | null>(() =>
  diagram.value ? { diagram_id: diagram.value.diagram_id, layers: {}, playback: { playback_id: playback.value?.playback_id ?? null, direction: 'as_authored', loop: false } } : null,
)
</script>

<template>
  <section
    data-test="voicing-card"
    role="dialog"
    :aria-labelledby="titleId"
    class="flex w-[min(320px,calc(100vw-32px))] flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4 shadow-level2"
  >
    <div class="flex items-center justify-between gap-2">
      <h2 :id="titleId" data-test="voicing-card-title" class="text-2xl font-bold text-ink">{{ writtenSymbol }}</h2>
      <div class="flex items-center gap-1">
        <button
          type="button"
          data-test="voicing-card-fold"
          class="rounded-md p-1 text-ink-muted hover:text-ink"
          :aria-label="folded ? t('songChart.unfoldCard') : t('songChart.foldCard')"
          :aria-expanded="!folded"
          @click="folded = !folded"
        >
          <ChevronUp v-if="folded" :size="20" aria-hidden="true" />
          <ChevronDown v-else :size="20" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-test="voicing-card-close"
          class="rounded-md p-1 text-ink-muted hover:text-ink"
          :aria-label="t('songChart.closeSheet')"
          @click="emit('close')"
        >
          <X :size="20" aria-hidden="true" />
        </button>
      </div>
    </div>

    <template v-if="!folded">
      <p v-if="missingBass" data-test="missing-bass" class="text-sm text-ink-muted">
        {{ t('songChart.missingBass', { chord: chord.canonical_symbol, bass: missingBass }) }}
      </p>

      <div class="flex w-fit gap-1 rounded-lg bg-surface-sunken p-1" role="group" :aria-label="t('songChart.view')">
        <button
          type="button"
          data-test="view-box"
          :aria-pressed="view === 'box'"
          class="rounded-md px-4 py-1.5 text-sm font-semibold"
          :class="view === 'box' ? 'bg-surface-raised text-ink shadow-level1' : 'text-ink-muted'"
          @click="view = 'box'"
        >
          {{ t('songChart.boxView') }}
        </button>
        <button
          type="button"
          data-test="view-neck"
          :aria-pressed="view === 'neck'"
          class="rounded-md px-4 py-1.5 text-sm font-semibold"
          :class="view === 'neck' ? 'bg-surface-raised text-ink shadow-level1' : 'text-ink-muted'"
          @click="view = 'neck'"
        >
          {{ t('songChart.neckView') }}
        </button>
      </div>

      <div v-if="diagram && diagramRef" class="flex items-center gap-3">
        <ChordBoxDiagram v-if="view === 'box'" :voicing="voicing" :diagram="diagram" :instrument="instrument" :label="writtenSymbol" />
        <FrettedDiagramView v-else :diagram="diagram" :instrument="instrument" :diagram-ref="diagramRef" compact />
        <VoicingPlayButton v-if="playback" :key="diagram.diagram_id" :diagram="diagram" :instrument="instrument" :playback="playback" />
      </div>
      <p v-else class="text-sm text-ink-muted">{{ t('songChart.voicingUnavailable') }}</p>

      <div role="group" :aria-label="t('songChart.voicings')" class="flex flex-wrap gap-2">
        <button
          v-for="(v, i) in chord.voicings"
          :key="v.chord_voicing_id"
          type="button"
          data-test="voicing-chip"
          :data-voicing-id="v.chord_voicing_id"
          :aria-pressed="v.chord_voicing_id === voicingId"
          class="rounded-full border px-4 py-1.5 text-sm font-semibold"
          :class="v.chord_voicing_id === voicingId ? 'border-accent bg-accent text-accent-fg' : 'border-border text-ink'"
          @click="voicingId = v.chord_voicing_id"
        >
          {{ names[i] }}
        </button>
      </div>
    </template>
  </section>
</template>
