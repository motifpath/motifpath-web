<script setup lang="ts">
/**
 * The options of a generated drill question, in the order the plan gave them, each with its key
 * (1–9) so a keyboard or a pedal can answer. A tap is the answer. Options are text (numerals,
 * functions, progressions), chord symbols (bass reads cifra), chord boxes, two a row, which
 * carry no name until the answer is in (the box is the question), or whole charts, one a row, of
 * unnamed boxes or of chord symbols. Nothing sets the right option
 * apart before then. Once graded, the right option and a wrong pick are marked and the rest lock.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { ChartBarContent } from '@/shared/components/ChartBar.vue'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import DrillChart from '@/shared/components/DrillChart.vue'
import ImageOption from '@/shared/components/ImageOption.vue'
import OptionTile from '@/shared/components/OptionTile.vue'
import { useOptionKeys } from '@/shared/composables/useOptionKeys'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { DrillOptionKind } from '@/shared/utils/drillLayout'
import { optionState } from '@/shared/utils/optionState'
import type { OptionState } from '@/shared/utils/optionState'

type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

export interface DrillOption {
  /** The option as the answer sends it back, e.g. "Em", "vi", "tonic". */
  value: string
  /** What the option shows; a chord box shows it only once the answer is in. */
  label: string
  /** The voicing a chord-box option draws. */
  chord?: { voicing: ChordVoicing; diagram: Diagram }
  /** The chart a chart option draws, one bar a chord. */
  chart?: ChartBarContent[]
}

/** A chord box drawn to fill an option's 112 px picture. */
const BOX_SCALE = 0.86

const props = defineProps<{
  kind: DrillOptionKind
  options: DrillOption[]
  /** The instrument boxes are drawn for; none when chords are written as symbols. */
  instrument?: Instrument | null
  /** The right option, once the answer is graded; null before. */
  reveal: { right: string } | null
  /** Whether the options take no answer, such as while the question's sound is missing. */
  locked: boolean
}>()

const choice = defineModel<string | null>('choice', { required: true })

const { t } = useTypedT()

const settled = computed(() => props.reveal !== null || props.locked)

function choose(value: string) {
  if (!settled.value) choice.value = value
}

function stateOf(value: string): OptionState {
  const mark = props.reveal === null ? undefined : value === props.reveal.right ? 'right' : value === choice.value ? 'wrong' : undefined
  return optionState({ selected: value === choice.value, mark, settled: settled.value })
}

useOptionKeys({
  options: () => props.options.map((option) => ({ option_id: option.value })),
  multiple: () => false,
  selected: () => (choice.value === null ? [] : [choice.value]),
  locked: () => settled.value,
  choose: ([value]) => {
    if (value !== undefined) choose(value)
  },
})
</script>

<template>
  <div data-test="drill-options" class="w-full gap-3" :class="kind === 'chord_box' ? 'grid grid-cols-2' : 'flex flex-col'">
    <template v-if="kind === 'chord_box'">
      <ImageOption
        v-for="(option, i) in options"
        :key="option.value"
        :key-hint="i + 1"
        :label="reveal ? option.label : undefined"
        :state="stateOf(option.value)"
        @click="choose(option.value)"
      >
        <ChordBox
          v-if="option.chord && instrument"
          :voicing="option.chord.voicing"
          :diagram="option.chord.diagram"
          :instrument="instrument"
          :label="t('drill.options.chord', { key: i + 1 })"
          :scale="BOX_SCALE"
        />
      </ImageOption>
    </template>
    <template v-else-if="kind === 'chart_boxes' || kind === 'chart_symbols'">
      <OptionTile
        v-for="(option, i) in options"
        :key="option.value"
        :key-hint="i + 1"
        :label="t('drill.options.chart', { key: i + 1 })"
        :state="stateOf(option.value)"
        @click="choose(option.value)"
      >
        <DrillChart v-if="option.chart" :bars="option.chart" :instrument="instrument" />
      </OptionTile>
    </template>
    <template v-else>
      <OptionTile
        v-for="(option, i) in options"
        :key="option.value"
        :key-hint="i + 1"
        :label="option.label"
        :state="stateOf(option.value)"
        @click="choose(option.value)"
      />
    </template>
  </div>
</template>
