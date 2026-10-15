<script setup lang="ts">
/**
 * One bar of a chord chart in a drill: a bar line, then the bar's chord, drawn as a chord box
 * (guitar reads the shapes) or written as a chord symbol (bass reads cifra). A box is never named,
 * on screen or to a screen reader, which hears it as its bar: naming it would answer the question.
 */
import type { components } from '@/api/generated/core-domain'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

export type ChartBarContent = { kind: 'box'; voicing: ChordVoicing; diagram: Diagram } | { kind: 'symbol'; symbol: string }

/** A box in a chart bar is drawn at half its size, so four fit across a phone. */
const BOX_SCALE = 0.5

defineProps<{
  bar: ChartBarContent
  /** The bar's place in the chart, from 1. */
  position: number
  instrument: Instrument
}>()

const { t } = useTypedT()
</script>

<template>
  <div class="flex min-h-[56px] items-center border-l-2 border-ink-subtle" :class="bar.kind === 'box' ? 'pl-1' : 'pl-3'">
    <ChordBox
      v-if="bar.kind === 'box'"
      :voicing="bar.voicing"
      :diagram="bar.diagram"
      :instrument="instrument"
      :label="t('drill.chart.bar', { position })"
      :scale="BOX_SCALE"
    />
    <span v-else class="text-lg font-semibold text-ink">{{ bar.symbol }}</span>
  </div>
</template>
