<script setup lang="ts">
/**
 * A generated drill question asked among options: what it gives (a chord, a chart, or a sound to
 * hear), then its options. Its look comes from the way it is asked and the instrument: guitar
 * draws chords as boxes, bass writes them as cifra. It shows what the plan gave and nothing more,
 * and never names a chord the question asks about. A tap answers it, sent back with the way and
 * the options as shown. When something it must show can't be shown (a box with no voicing, a sound
 * that can't be heard), it says so and holds its options, so a missing piece is never a wrong answer.
 */
import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { components as EventComponents } from '@/api/generated/event-ingestion'
import type { ChartBarContent } from '@/shared/components/ChartBar.vue'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import DrillChart from '@/shared/components/DrillChart.vue'
import DrillOptionGrid from '@/shared/components/DrillOptionGrid.vue'
import type { DrillOption } from '@/shared/components/DrillOptionGrid.vue'
import ProgressionPlayer from '@/shared/components/ProgressionPlayer.vue'
import type { ProgressionSource } from '@/shared/composables/useProgressionPlayback'
import { useTypedT } from '@/shared/composables/useTypedT'
import { drillLayoutOf } from '@/shared/utils/drillLayout'
import type { DrillInstrument } from '@/shared/utils/drillLayout'
import type { GeneratedWay } from '@/shared/utils/generatedChoice'

type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type MissingReason = EventComponents['schemas']['NotAnsweredResponse']['reason']

/** A chord as a question carries it: its symbol, and the voicing a box draws on guitar. */
export interface DrillChord {
  symbol: string
  voicing?: ChordVoicing
  diagram?: Diagram
}

export interface DrillQuestionOption {
  /** The option as the answer sends it back. */
  value: string
  label: string
  /** The chord an option stands for, drawn as a box on guitar. */
  chord?: DrillChord
}

/** Everything a drill question shows, as its plan gives it. */
export interface DrillQuestionView {
  way: GeneratedWay
  instrument: DrillInstrument
  /** A line under the question, such as "All four are chords of G major." */
  context?: string
  /** The chord a question shows. */
  chord?: DrillChord
  /** The chart a question shows, one chord a bar. */
  chart?: DrillChord[]
  /** The cadence or progression a question plays. */
  progression?: { source: ProgressionSource; bars: (string | null)[]; subtitle: string }
  options: DrillQuestionOption[]
}

/** What a question's answer sends back. */
export interface DrillAnswer {
  way: GeneratedWay
  options: string[]
  choice: string
}

const props = defineProps<{
  view: DrillQuestionView
  /** The instrument chord boxes are drawn for. */
  instrument: Instrument
  /** The right option, once the answer is graded; null before. */
  reveal: { right: string } | null
}>()

const emit = defineEmits<{ answer: [answer: DrillAnswer]; playing: [playing: boolean]; missing: [reason: MissingReason] }>()

const choice = defineModel<string | null>('choice', { required: true })

const { t } = useTypedT()

const layout = computed(() => drillLayoutOf(props.view.way, props.view.instrument))

function boxOf(chord: DrillChord | undefined): { voicing: ChordVoicing; diagram: Diagram } | null {
  return chord?.voicing && chord.diagram ? { voicing: chord.voicing, diagram: chord.diagram } : null
}

const chartBars = computed<ChartBarContent[]>(() =>
  (props.view.chart ?? []).flatMap((chord): ChartBarContent[] => {
    if (layout.value?.stimulus === 'chart_symbols') return [{ kind: 'symbol', symbol: chord.symbol }]
    const box = boxOf(chord)
    return box ? [{ kind: 'box', ...box }] : []
  }),
)

const options = computed<DrillOption[]>(() =>
  props.view.options.map((option) => {
    const box = layout.value?.options === 'chord_box' ? boxOf(option.chord) : null
    return box ? { value: option.value, label: option.label, chord: box } : { value: option.value, label: option.label }
  }),
)

/** Whether everything the question must show can be shown. */
const complete = computed(() => {
  const now = layout.value
  if (!now) return false
  if (now.stimulus === 'chord_box' && !boxOf(props.view.chord)) return false
  if (now.stimulus === 'chord_symbol' && !props.view.chord) return false
  if ((now.stimulus === 'chart_boxes' || now.stimulus === 'chart_symbols') && chartBars.value.length !== (props.view.chart ?? []).length) return false
  if (now.stimulus === 'player' && !props.view.progression) return false
  return now.options !== 'chord_box' || options.value.every((option) => option.chord)
})

const soundMissing = ref(false)
// A new question has its own sound, heard or not.
watch(
  () => props.view,
  () => {
    soundMissing.value = false
  },
)

watch(
  complete,
  (now) => {
    if (!now) emit('missing', 'unavailable')
  },
  { immediate: true },
)

function onPlaying(playing: boolean) {
  // A sound that plays, on a retry, is heard after all: its options take an answer again.
  if (playing) soundMissing.value = false
  emit('playing', playing)
}

function onMissing(reason: MissingReason) {
  soundMissing.value = true
  emit('missing', reason)
}

function answer(value: string | null) {
  choice.value = value
  if (value !== null) emit('answer', { way: props.view.way, options: props.view.options.map((option) => option.value), choice: value })
}
</script>

<template>
  <div v-if="layout" class="flex w-full flex-col gap-4">
    <p v-if="view.context" class="text-base text-ink">{{ view.context }}</p>
    <template v-if="complete">
      <div v-if="layout.stimulus === 'chord_box' && view.chord?.voicing && view.chord.diagram" data-test="drill-stimulus" class="flex justify-center">
        <ChordBox :voicing="view.chord.voicing" :diagram="view.chord.diagram" :instrument="instrument" :label="t('drill.question.chord')" />
      </div>
      <p v-else-if="layout.stimulus === 'chord_symbol'" data-test="drill-stimulus" class="text-center text-2xl font-bold text-ink">{{ view.chord?.symbol }}</p>
      <div v-else-if="layout.stimulus === 'chart_boxes' || layout.stimulus === 'chart_symbols'" data-test="drill-stimulus">
        <DrillChart :bars="chartBars" :instrument="instrument" />
      </div>
      <div v-else-if="layout.stimulus === 'player' && view.progression" data-test="drill-stimulus">
        <ProgressionPlayer
          :source="view.progression.source"
          :bars="view.progression.bars"
          :subtitle="view.progression.subtitle"
          @playing="onPlaying"
          @missing="onMissing"
        />
      </div>
    </template>
    <DrillOptionGrid
      :kind="layout.options"
      :options="options"
      :instrument="instrument"
      :reveal="reveal"
      :locked="!complete || soundMissing"
      :choice="choice"
      @update:choice="answer"
    />
  </div>
</template>
