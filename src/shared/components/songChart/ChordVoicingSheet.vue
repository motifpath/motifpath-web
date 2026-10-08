<script setup lang="ts">
/**
 * The voicings of one chord in a song chart, opened from a tap on the chord: one tab per voicing,
 * best first, and for the selected voicing its diagram with a Play control and one tab per
 * playback. It opens on the voicing it's given; switching voicings or playbacks stays inside the
 * sheet. A slash chord shown without its bass says so.
 */
import { computed, ref, useId, watch } from 'vue'
import { X } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import DiagramPlayer from '@/shared/components/diagram/DiagramPlayer.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type ChordDefinition = components['schemas']['ChordDefinition']
type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  /** The symbol as the author wrote it, the sheet's title. */
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
const { localizedName } = useLocalizedName()
const titleId = useId()

const voicingId = ref(props.openingVoicing.chord_voicing_id)
const voicing = computed(() => props.chord.voicings.find((v) => v.chord_voicing_id === voicingId.value) ?? props.openingVoicing)
const diagram = computed(() => props.diagrams.find((d) => d.diagram_id === voicing.value.diagram_id) ?? null)

const playbackId = ref<string | null>(null)
watch(
  diagram,
  (d) => {
    playbackId.value = d?.default_playback_id ?? d?.playbacks[0]?.playback_id ?? null
  },
  { immediate: true },
)

const diagramRef = computed<DiagramRef | null>(() =>
  diagram.value ? { diagram_id: diagram.value.diagram_id, layers: {}, playback: { playback_id: playbackId.value, direction: 'as_authored', loop: false } } : null,
)
</script>

<template>
  <ModalOverlay
    open
    panel-class="flex w-[min(430px,calc(100vw-32px))] flex-col gap-4 rounded-xl bg-surface-raised p-5 shadow-level2"
    @close="emit('close')"
  >
    <div data-test="voicing-sheet" role="dialog" aria-modal="true" :aria-labelledby="titleId" class="flex flex-col gap-4">
      <div class="flex items-start justify-between gap-3">
        <h2 :id="titleId" data-test="voicing-sheet-title" class="text-xl font-bold text-ink">{{ writtenSymbol }}</h2>
        <button
          type="button"
          data-test="voicing-sheet-close"
          class="rounded-md p-1 text-ink-muted hover:text-ink"
          :aria-label="t('songChart.closeSheet')"
          @click="emit('close')"
        >
          <X :size="20" aria-hidden="true" />
        </button>
      </div>
      <p v-if="missingBass" data-test="missing-bass" class="text-sm text-ink-muted">
        {{ t('songChart.missingBass', { chord: chord.canonical_symbol, bass: missingBass }) }}
      </p>

      <div role="tablist" :aria-label="t('songChart.voicings')" class="flex flex-wrap gap-2">
        <button
          v-for="(v, i) in chord.voicings"
          :key="v.chord_voicing_id"
          type="button"
          role="tab"
          data-test="voicing-tab"
          :data-voicing-id="v.chord_voicing_id"
          :aria-selected="v.chord_voicing_id === voicingId"
          class="rounded-md border px-3 py-1.5 text-sm font-semibold"
          :class="v.chord_voicing_id === voicingId ? 'border-accent bg-accent text-accent-fg' : 'border-border text-ink'"
          @click="voicingId = v.chord_voicing_id"
        >
          {{ t('songChart.voicingTab', { n: i + 1 }) }}
        </button>
      </div>

      <div v-if="diagram && diagramRef" class="flex flex-col gap-3">
        <FrettedDiagramView :diagram="diagram" :instrument="instrument" :diagram-ref="diagramRef" />
        <div v-if="diagram.playbacks.length > 0" class="flex flex-wrap items-center gap-2">
          <div role="tablist" :aria-label="t('songChart.playbacks')" class="flex flex-wrap gap-2">
            <button
              v-for="p in diagram.playbacks"
              :key="p.playback_id"
              type="button"
              role="tab"
              data-test="playback-tab"
              :aria-selected="p.playback_id === playbackId"
              class="rounded-md border px-3 py-1.5 text-sm"
              :class="p.playback_id === playbackId ? 'border-accent font-semibold text-ink' : 'border-border text-ink-muted'"
              @click="playbackId = p.playback_id"
            >
              {{ localizedName(p.names) }}
            </button>
          </div>
          <DiagramPlayer :diagram="diagram" :instrument="instrument" :playback="diagramRef.playback ?? null" />
        </div>
      </div>
      <p v-else class="text-sm text-ink-muted">{{ t('songChart.voicingUnavailable') }}</p>
    </div>
  </ModalOverlay>
</template>
