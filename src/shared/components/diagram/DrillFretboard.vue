<script setup lang="ts">
/**
 * A bare fretboard for timed drills: no diagram on it, only a cell lit for the student to name or
 * tap, the string a question is about, taps on the strings that take them, and a graded answer's
 * marks. It always fits its container from the nut to its last fret, so a timed answer never waits
 * on scrolling. Each cell that takes a tap is named by where it is, never by its note.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

import AnswerMark from '@/shared/components/diagram/AnswerMark.vue'
import type { AnswerMarkKind } from '@/shared/components/diagram/AnswerMark.vue'
import FretboardBoard from '@/shared/components/diagram/FretboardBoard.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { boardTopFor, fretLineX, MARKER_RADIUS, markerCenterX, ROW_GAP, stringLineY } from '@/shared/utils/fretboardGeometry'
import type { BoardFrame } from '@/shared/utils/fretboardGeometry'
import type { CellPlace } from '@/shared/utils/fretboardCell'

export interface CellMark extends CellPlace {
  mark: AnswerMarkKind
}

const props = withDefaults(
  defineProps<{
    /** The open-string pitches, lowest string first; one string per pitch. */
    tuning: string[]
    /** The last fret shown; the board always starts at the nut. */
    maxFret: number
    /** Names the drawing for screen readers. */
    label: string
    /** The cell lit for the student. */
    lit?: CellPlace | null
    /** The string a question is about, drawn highlighted. */
    askedString?: number | null
    /** The strings whose cells take a tap. */
    tapStrings?: number[]
    /** Takes no more taps, once an answer is in. */
    locked?: boolean
    marks?: CellMark[]
  }>(),
  { lit: null, askedString: null, tapStrings: () => [], locked: false, marks: () => [] },
)

const emit = defineEmits<{ tap: [place: CellPlace] }>()

const { t } = useTypedT()

/** Room left of the nut for an open-string cell, and at the right edge. */
const NUT_MARGIN = 26
const EDGE_MARGIN = 4
// Room under the board for the fret numbers.
const MARGIN_BOTTOM = 52
/** The width assumed until the container has been measured. */
const NOMINAL_WIDTH = 360
const BADGE_OFFSET = 15

const container = ref<HTMLElement | null>(null)
const width = ref(NOMINAL_WIDTH)
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  if (!container.value) return
  if (container.value.clientWidth > 0) width.value = container.value.clientWidth
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry && entry.contentRect.width > 0) width.value = entry.contentRect.width
  })
  resizeObserver.observe(container.value)
})
onUnmounted(() => resizeObserver?.disconnect())

const stringCount = computed(() => props.tuning.length)

const frame = computed<BoardFrame>(() => ({
  minFret: 0,
  maxFret: props.maxFret,
  stringCount: stringCount.value,
  left: NUT_MARGIN,
  columnGap: (width.value - NUT_MARGIN - EDGE_MARGIN) / Math.max(props.maxFret, 1),
  rowGap: ROW_GAP,
  top: boardTopFor(false),
}))

const height = computed(() => frame.value.top + (stringCount.value - 1) * ROW_GAP + MARGIN_BOTTOM)

const cx = (fret: number) => markerCenterX(frame.value, fret)
const cy = (string: number) => stringLineY(frame.value, string)

/** A cell's tap target: its whole fret space (left of the nut for the open string), one string high. */
function target(place: CellPlace) {
  const left = place.fret === 0 ? 0 : fretLineX(frame.value, place.fret - 1)
  const right = fretLineX(frame.value, place.fret)
  return { x: left, y: cy(place.string) - ROW_GAP / 2, width: right - left, height: ROW_GAP }
}

const tapCells = computed(() =>
  props.tapStrings.flatMap((string) => Array.from({ length: props.maxFret + 1 }, (_, fret) => ({ string, fret }))),
)

function cellLabel(place: CellPlace): string {
  return place.fret === 0 ? t('drillFretboard.openCell', { string: place.string }) : t('drillFretboard.cell', { string: place.string, fret: place.fret })
}

function tap(place: CellPlace) {
  if (!props.locked) emit('tap', place)
}
</script>

<template>
  <div ref="container" class="w-full select-none" data-test="drill-fretboard">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" role="group" :aria-label="label" class="block touch-manipulation">
      <FretboardBoard :frame="frame" :tuning="tuning" plain>
        <template #fills>
          <rect
            v-if="askedString"
            data-test="asked-string"
            :data-string="askedString"
            :x="0"
            :y="cy(askedString) - ROW_GAP / 2"
            :width="width"
            :height="ROW_GAP"
            class="fill-accent-muted opacity-70"
          />
        </template>
      </FretboardBoard>

      <circle
        v-if="lit"
        data-test="lit-cell"
        :data-string="lit.string"
        :data-fret="lit.fret"
        :cx="cx(lit.fret)"
        :cy="cy(lit.string)"
        :r="MARKER_RADIUS"
        class="fill-accent stroke-surface"
        stroke-width="2"
      />

      <g v-for="mark in marks" :key="`${mark.string}:${mark.fret}`" data-test="cell-mark" :data-string="mark.string" :data-fret="mark.fret">
        <AnswerMark :mark="mark.mark" :cx="cx(mark.fret)" :cy="cy(mark.string)" :ring-radius="MARKER_RADIUS + 2" :badge-offset="BADGE_OFFSET" />
      </g>

      <rect
        v-for="cell in tapCells"
        :key="`${cell.string}:${cell.fret}`"
        data-test="drill-cell"
        :data-string="cell.string"
        :data-fret="cell.fret"
        v-bind="target(cell)"
        role="button"
        :tabindex="locked ? -1 : 0"
        :aria-label="cellLabel(cell)"
        :aria-disabled="locked"
        fill="transparent"
        class="cursor-pointer outline-none focus:stroke-focus"
        stroke-width="2"
        @click="tap(cell)"
        @keydown.enter.prevent="tap(cell)"
        @keydown.space.prevent="tap(cell)"
      />
    </svg>
  </div>
</template>
