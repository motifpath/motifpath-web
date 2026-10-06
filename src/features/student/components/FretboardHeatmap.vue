<script setup lang="ts">
/**
 * How well the student knows each cell of an instrument's fretboard: every cell of its layout,
 * coloured by level, with a dashed edge on the ones whose review is due. Instruments that share a
 * layout show the same cells, on that layout's tuning. Nothing shows for an instrument without a
 * fretboard.
 */
import { computed } from 'vue'

import { useFretboardMap } from '@/features/student/composables/usePracticeHome'
import DrillFretboard from '@/shared/components/diagram/DrillFretboard.vue'
import type { HeatCell } from '@/shared/components/diagram/DrillFretboard.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useTypedT } from '@/shared/composables/useTypedT'
import { KNOWLEDGE_LEVELS, LEVEL_FILLS } from '@/shared/utils/knowledgeLevels'

const props = defineProps<{ instrumentId: string }>()

const { t } = useTypedT()
const { item: map, isLoading, error, retry } = useFretboardMap(props.instrumentId)
const { instruments } = useListInstruments()

const levelKeys = {
  new: 'practiceHomeView.levels.new',
  learning: 'practiceHomeView.levels.learning',
  accurate: 'practiceHomeView.levels.accurate',
  fluent: 'practiceHomeView.levels.fluent',
  retained: 'practiceHomeView.levels.retained',
} as const

/** The tuning of the layout the cells belong to; unknown until the instruments are listed. */
const tuning = computed(() => {
  const layoutId = map.value?.layout_instrument_id
  return layoutId ? instruments.value.find((instrument) => instrument.instrument_id === layoutId)?.tuning : undefined
})

const heat = computed<HeatCell[]>(() =>
  (map.value?.cells ?? []).map((cell) => {
    const place = cell.fret === 0 ? t('drillFretboard.openCell', { string: cell.string }) : t('drillFretboard.cell', { string: cell.string, fret: cell.fret })
    const level = t(levelKeys[cell.level])
    return {
      string: cell.string,
      fret: cell.fret,
      level: cell.level,
      fading: cell.fading,
      label: cell.fading ? t('practiceHomeView.fretboard.cellFading', { place, level }) : t('practiceHomeView.fretboard.cell', { place, level }),
    }
  }),
)

const maxFret = computed(() => Math.max(0, ...heat.value.map((cell) => cell.fret)))
</script>

<template>
  <StateLoading v-if="isLoading" :noun="t('practiceHomeView.fretboard.noun')" />
  <StateError v-else-if="error" :message="t('practiceHomeView.fretboard.error')" @retry="retry()" />

  <section v-else-if="tuning && heat.length > 0" data-test="fretboard-heatmap" class="flex flex-col gap-2">
    <h2 class="text-base font-semibold">{{ t('practiceHomeView.fretboard.title') }}</h2>
    <DrillFretboard :tuning="tuning" :max-fret="maxFret" :heat="heat" :label="t('practiceHomeView.fretboard.label')" />
    <ul data-test="heat-legend" class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
      <li v-for="level in KNOWLEDGE_LEVELS" :key="level" class="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <rect x="1" y="1" width="12" height="12" rx="3" :class="[LEVEL_FILLS[level], 'stroke-border']" stroke-width="1" />
        </svg>
        {{ t(levelKeys[level]) }}
      </li>
      <li class="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <rect x="1" y="1" width="12" height="12" rx="3" class="fill-transparent stroke-warning" stroke-width="2" stroke-dasharray="4 3" />
        </svg>
        {{ t('practiceHomeView.fading') }}
      </li>
    </ul>
  </section>
</template>
