<script setup lang="ts">
/**
 * How well the student knows each cell of an instrument's fretboard: every cell of its layout as a
 * marker coloured by level, ringed with a dashed line when its review is due. It's drawn on the
 * board diagrams use, at their readable size, so a narrow screen scrolls it rather than shrinking
 * it. Instruments that share a layout show the same cells, on that layout's tuning. Nothing shows
 * for an instrument without a fretboard.
 */
import { computed, onUnmounted, ref, watch } from 'vue'

import { useFretboardMap } from '@/features/student/composables/usePracticeHome'
import FretboardBoard from '@/shared/components/diagram/FretboardBoard.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useTypedT } from '@/shared/composables/useTypedT'
import { boardTopFor, fretboardGeometry, MARKER_RADIUS, markerCenterX, stringLineY } from '@/shared/utils/fretboardGeometry'
import type { BoardFrame } from '@/shared/utils/fretboardGeometry'
import { KNOWLEDGE_LEVELS, LEVEL_FILLS } from '@/shared/utils/knowledgeLevels'
import type { KnowledgeLevel } from '@/shared/utils/knowledgeLevels'

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

// Room under the board for the fret numbers.
const MARGIN_BOTTOM = 52
/** How far outside its marker a fading cell's ring sits. */
const FADING_GAP = 4

/** The width the board may fill before it scrolls; unknown (0) until measured. The board shows
 *  only once the map has loaded, so it's measured whenever it appears. */
const scroller = ref<HTMLElement | null>(null)
const availableWidth = ref(0)
let resizeObserver: ResizeObserver | undefined
watch(scroller, (element) => {
  resizeObserver?.disconnect()
  if (!element) return
  if (element.clientWidth > 0) availableWidth.value = element.clientWidth
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry && entry.contentRect.width > 0) availableWidth.value = entry.contentRect.width
  })
  resizeObserver.observe(element)
})
onUnmounted(() => resizeObserver?.disconnect())

/** The tuning of the layout the cells belong to; unknown until the instruments are listed. */
const tuning = computed(() => {
  const layoutId = map.value?.layout_instrument_id
  return layoutId ? instruments.value.find((instrument) => instrument.instrument_id === layoutId)?.tuning : undefined
})

interface HeatCell {
  string: number
  fret: number
  level: KnowledgeLevel
  fading: boolean
  label: string
}

const cells = computed<HeatCell[]>(() =>
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

const maxFret = computed(() => Math.max(1, ...cells.value.map((cell) => cell.fret)))
const stringCount = computed(() => tuning.value?.length ?? 0)

const geometry = computed(() =>
  fretboardGeometry({ availableWidth: availableWidth.value, fretSpan: maxFret.value, stringCount: stringCount.value, showsNut: true }),
)

const frame = computed<BoardFrame>(() => ({
  minFret: 0,
  maxFret: maxFret.value,
  stringCount: stringCount.value,
  left: geometry.value.left,
  columnGap: geometry.value.columnGap,
  rowGap: geometry.value.rowGap,
  top: boardTopFor(false),
}))

const height = computed(() => frame.value.top + geometry.value.boardHeight + MARGIN_BOTTOM)

const cx = (fret: number) => markerCenterX(frame.value, fret)
const cy = (string: number) => stringLineY(frame.value, string)
</script>

<template>
  <LoadingSkeleton v-if="isLoading" />
  <LoadFailed v-else-if="error" :message="t('practiceHomeView.fretboard.error')" @retry="retry()" />

  <section v-else-if="tuning && cells.length > 0" data-test="fretboard-heatmap" class="flex flex-col gap-2">
    <h2 class="text-base font-semibold">{{ t('practiceHomeView.fretboard.title') }}</h2>
    <div ref="scroller" data-test="heatmap-scroll" class="overflow-x-auto overflow-y-hidden">
      <svg :width="geometry.width" :height="height" :viewBox="`0 0 ${geometry.width} ${height}`" role="group" :aria-label="t('practiceHomeView.fretboard.label')" class="block">
        <FretboardBoard :frame="frame" :tuning="tuning" />

        <circle
          v-for="cell in cells"
          :key="`${cell.string}:${cell.fret}`"
          data-test="heat-cell"
          :data-string="cell.string"
          :data-fret="cell.fret"
          :data-level="cell.level"
          :cx="cx(cell.fret)"
          :cy="cy(cell.string)"
          :r="MARKER_RADIUS"
          role="img"
          :aria-label="cell.label"
          :class="[LEVEL_FILLS[cell.level], cell.level === 'new' ? 'stroke-fretboard-inlay' : 'stroke-surface']"
          :stroke-width="cell.level === 'new' ? 1.5 : 2"
        />
        <circle
          v-for="cell in cells.filter((candidate) => candidate.fading)"
          :key="`fading-${cell.string}:${cell.fret}`"
          data-test="fading-ring"
          :data-string="cell.string"
          :data-fret="cell.fret"
          :cx="cx(cell.fret)"
          :cy="cy(cell.string)"
          :r="MARKER_RADIUS + FADING_GAP"
          fill="none"
          class="stroke-ink"
          stroke-width="2"
          stroke-dasharray="4 3"
          aria-hidden="true"
        />
      </svg>
    </div>
    <ul data-test="heat-legend" class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
      <li v-for="level in KNOWLEDGE_LEVELS" :key="level" class="flex items-center gap-1.5">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle
            cx="8"
            cy="8"
            r="6"
            :class="[LEVEL_FILLS[level], level === 'new' ? 'stroke-ink-subtle' : 'stroke-surface']"
            :stroke-width="level === 'new' ? 1.5 : 1"
          />
        </svg>
        {{ t(levelKeys[level]) }}
      </li>
      <li class="flex items-center gap-1.5">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" fill="none" class="stroke-ink" stroke-width="1.5" stroke-dasharray="3 2" />
        </svg>
        {{ t('practiceHomeView.fading') }}
      </li>
    </ul>
  </section>
</template>
