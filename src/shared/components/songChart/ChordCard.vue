<script setup lang="ts">
/**
 * One chord of a song chart, opened from a tap on it: the chord as written, Box | Neck, the
 * voicing drawn that way with Strum, and one chip per voicing, named by where it sits ("Open",
 * "3fr"). The parent holds the voicing, the view and whether the card is minimized, so it can
 * remember them across chords. It minimizes to a chip with the chord and closes with ×, floating
 * over the chart or docked across a side pane. A slash chord shown without its bass says so.
 */
import { ChevronDown, X } from 'lucide-vue-next'
import { computed, useId } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import ChordViewSwitch from '@/shared/components/diagram/ChordViewSwitch.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import VoicingPlayButton from '@/shared/components/songChart/VoicingPlayButton.vue'
import type { ChordView } from '@/shared/composables/useChordView'
import { useTypedT } from '@/shared/composables/useTypedT'
import { voicingNames } from '@/shared/utils/songChartReading'

type ChordDefinition = components['schemas']['ChordDefinition']
type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  /** The symbol as the author wrote it, the card's title. */
  writtenSymbol: string
  chord: ChordDefinition
  diagrams: Diagram[]
  instrument: Instrument
  /** The bass the written slash chord asks for that the shown voicings don't have; null when none. */
  missingBass: string | null
  /** Over the chart, or docked in a side pane next to it. */
  placement: 'floating' | 'docked'
}>()
const emit = defineEmits<{ close: [] }>()

const voicingId = defineModel<string>('voicingId', { required: true })
const view = defineModel<ChordView>('view', { required: true })
const minimized = defineModel<boolean>('minimized', { default: false })

const { t } = useTypedT()
const titleId = useId()

const voicing = computed(() => props.chord.voicings.find((v) => v.chord_voicing_id === voicingId.value) ?? props.chord.voicings[0]!)
const diagram = computed(() => props.diagrams.find((d) => d.diagram_id === voicing.value.diagram_id) ?? null)
const names = computed(() => voicingNames(props.chord.voicings, t('songChart.openVoicing')))
const floating = computed(() => props.placement === 'floating')

/** The voicing's default playback, the one Strum sounds. */
const playback = computed(() => {
  const d = diagram.value
  return d?.playbacks.find((p) => p.playback_id === d.default_playback_id) ?? d?.playbacks[0] ?? null
})
const diagramRef = computed<DiagramRef | null>(() =>
  diagram.value
    ? { diagram_id: diagram.value.diagram_id, layers: {}, playback: { playback_id: playback.value?.playback_id ?? null, direction: 'as_authored', loop: false } }
    : null,
)
</script>

<template>
  <button
    v-if="minimized"
    type="button"
    data-test="chord-card-chip"
    class="flex h-11 min-w-11 items-center justify-center rounded-full border border-border bg-surface px-4 text-base font-bold text-ink shadow-level2"
    :aria-label="t('songChart.expandCard', { chord: writtenSymbol })"
    @click="minimized = false"
  >
    {{ writtenSymbol }}
  </button>

  <section
    v-else
    data-test="chord-card"
    :role="floating ? 'dialog' : 'region'"
    :aria-labelledby="titleId"
    class="flex flex-col gap-2 rounded-2xl border border-border bg-surface pb-3.5 pl-3.5 pr-1.5 pt-1.5"
    :class="!floating ? 'w-full' : view === 'neck' ? 'w-[min(320px,calc(100vw-32px))] shadow-level2' : 'w-[232px] shadow-level2'"
  >
    <div class="flex items-center">
      <h2 :id="titleId" data-test="chord-card-title" class="min-w-0 flex-1 text-[28px] font-bold leading-[34px] text-ink">{{ writtenSymbol }}</h2>
      <button
        type="button"
        data-test="chord-card-minimize"
        class="flex size-11 items-center justify-center rounded-full text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :aria-label="t('songChart.minimizeCard')"
        @click="minimized = true"
      >
        <ChevronDown :size="20" aria-hidden="true" />
      </button>
      <button
        type="button"
        data-test="chord-card-close"
        class="flex size-11 items-center justify-center rounded-full text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :aria-label="t('songChart.closeSheet')"
        @click="emit('close')"
      >
        <X :size="20" aria-hidden="true" />
      </button>
    </div>

    <p v-if="missingBass" data-test="missing-bass" class="pr-2 text-sm text-ink-muted">
      {{ t('songChart.missingBass', { chord: chord.canonical_symbol, bass: missingBass }) }}
    </p>

    <ChordViewSwitch v-model="view" />

    <template v-if="diagram && diagramRef">
      <div v-if="view === 'box'" class="flex items-center gap-1">
        <ChordBox :voicing="voicing" :diagram="diagram" :instrument="instrument" :label="writtenSymbol" />
        <VoicingPlayButton v-if="playback" :key="diagram.diagram_id" :diagram="diagram" :instrument="instrument" :playback="playback" />
      </div>
      <div v-else class="flex flex-col items-start gap-2 pr-2">
        <FrettedDiagramView class="w-full" :diagram="diagram" :instrument="instrument" :diagram-ref="diagramRef" :region-info="false" />
        <VoicingPlayButton v-if="playback" :key="diagram.diagram_id" :diagram="diagram" :instrument="instrument" :playback="playback" />
      </div>
    </template>
    <p v-else data-test="voicing-unavailable" class="text-sm text-ink-muted">{{ t('songChart.voicingUnavailable') }}</p>

    <div role="group" :aria-label="t('songChart.voicings')" class="flex flex-wrap gap-1.5">
      <button
        v-for="(v, i) in chord.voicings"
        :key="v.chord_voicing_id"
        type="button"
        data-test="voicing-chip"
        :data-voicing-id="v.chord_voicing_id"
        :aria-pressed="v.chord_voicing_id === voicing.chord_voicing_id"
        class="flex h-11 items-center rounded-full border px-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        :class="v.chord_voicing_id === voicing.chord_voicing_id ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface text-ink'"
        @click="voicingId = v.chord_voicing_id"
      >
        {{ names[i] }}
      </button>
    </div>
  </section>
</template>
