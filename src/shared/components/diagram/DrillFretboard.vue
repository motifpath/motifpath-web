<script setup lang="ts">
/**
 * A bare fretboard for timed drills: no diagram on it, only a cell lit for the student to name or
 * tap, the string a question is about, taps on the strings that take them, and a graded answer's
 * marks. It always fits its container, so a timed answer never waits on scrolling. A drill asked in
 * a fret window takes taps only there, each place at least a touch target wide, the open string's
 * too: the whole neck is drawn when it fits at that size, the rest dimmed; otherwise only the window.
 * Each cell that takes a tap is named by where it is, never by its note. Places to play, such as a
 * chord's root and fifth, are marked and named by what they are and where: a root as R, in the
 * darker colour.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

import AnswerMark from '@/shared/components/diagram/AnswerMark.vue'
import type { AnswerMarkKind } from '@/shared/components/diagram/AnswerMark.vue'
import FretboardBoard from '@/shared/components/diagram/FretboardBoard.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { boardTopFor, fretLineX, MARKER_RADIUS, markerCenterX, MIN_COLUMN_GAP, ROW_GAP, stringLineY } from '@/shared/utils/fretboardGeometry'
import type { BoardFrame } from '@/shared/utils/fretboardGeometry'
import type { CellPlace } from '@/shared/utils/fretboardCell'
import { inFretWindow, windowBoardFrets } from '@/shared/utils/fretWindow'
import type { FretWindowRange } from '@/shared/utils/fretWindow'

export interface CellMark extends CellPlace {
  mark: AnswerMarkKind
}

/** A place marked for the student to play, by what it is in the chord. */
export interface MarkedPlace extends CellPlace {
  role: 'root' | 'third' | 'fifth'
  /** The chord it belongs to, named when a board marks more than one. */
  chord?: string
}

const props = withDefaults(
  defineProps<{
    /** The open-string pitches, lowest string first; one string per pitch. */
    tuning: string[]
    /** The last fret of the whole neck; the neck starts at the nut. */
    maxFret: number
    /** The frets a drill is asked in; without one, every fret takes taps. */
    fretWindow?: FretWindowRange | null
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
    /** Places to play, marked. */
    places?: MarkedPlace[]
    /** Whether a tap toggles a place on or off, for a drill answered with several places. */
    selectable?: boolean
    /** The places toggled on, ringed with a dashed halo, and still after the answer is graded. */
    selected?: CellPlace[]
  }>(),
  { fretWindow: null, lit: null, askedString: null, tapStrings: () => [], locked: false, marks: () => [], places: () => [], selectable: false, selected: () => [] },
)

const emit = defineEmits<{ tap: [place: CellPlace] }>()

const { t } = useTypedT()

/** Room left of the nut for an open-string cell without a fret window, and at the board's edges. */
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

/** In a fret window the open string's place, left of the nut, is as wide as a fret's. */
function windowColumnGap(minFret: number, maxFret: number): number {
  return minFret === 0 ? (width.value - EDGE_MARGIN) / (maxFret + 1) : (width.value - 2 * EDGE_MARGIN) / (maxFret - minFret)
}

const wholeNeckFits = computed(() => windowColumnGap(0, props.maxFret) >= MIN_COLUMN_GAP)

/** Only the window when the whole neck won't fit at a tappable size. */
const drawsOnlyWindow = computed(() => props.fretWindow !== null && !wholeNeckFits.value)

const frame = computed<BoardFrame>(() => {
  const base = { stringCount: stringCount.value, rowGap: ROW_GAP, top: boardTopFor(false) }
  if (!props.fretWindow) {
    return { ...base, minFret: 0, maxFret: props.maxFret, left: NUT_MARGIN, columnGap: (width.value - NUT_MARGIN - EDGE_MARGIN) / Math.max(props.maxFret, 1) }
  }
  const { minFret, maxFret } = drawsOnlyWindow.value ? windowBoardFrets(props.fretWindow) : { minFret: 0, maxFret: props.maxFret }
  const columnGap = windowColumnGap(minFret, maxFret)
  return { ...base, minFret, maxFret, columnGap, left: minFret === 0 ? columnGap : EDGE_MARGIN }
})

const height = computed(() => frame.value.top + (stringCount.value - 1) * ROW_GAP + MARGIN_BOTTOM)

const cx = (fret: number) => markerCenterX(frame.value, fret)
const cy = (string: number) => stringLineY(frame.value, string)

/** A cell's tap target: its whole fret space (left of the nut for the open string), one string high. */
function target(place: CellPlace) {
  const left = place.fret === 0 ? 0 : fretLineX(frame.value, place.fret - 1)
  const right = fretLineX(frame.value, place.fret)
  return { x: left, y: cy(place.string) - ROW_GAP / 2, width: right - left, height: ROW_GAP }
}

const tapFrets = computed(() =>
  Array.from({ length: props.maxFret + 1 }, (_, fret) => fret).filter((fret) => !props.fretWindow || inFretWindow(props.fretWindow, fret)),
)

const tapCells = computed(() => props.tapStrings.flatMap((string) => tapFrets.value.map((fret) => ({ string, fret }))))

/** The neck either side of the window, when the whole neck is drawn. */
const outsideWindow = computed(() => {
  const range = props.fretWindow
  if (!range || drawsOnlyWindow.value) return []
  const zones = [
    { from: 0, to: range.from - 1 },
    { from: range.to + 1, to: props.maxFret },
  ].filter((zone) => zone.from <= zone.to)
  return zones.map((zone) => {
    const left = target({ string: 1, fret: zone.from }).x
    return { ...zone, x: left, width: fretLineX(frame.value, zone.to) - left }
  })
})

function cellLabel(place: CellPlace): string {
  return place.fret === 0 ? t('drillFretboard.openCell', { string: place.string }) : t('drillFretboard.cell', { string: place.string, fret: place.fret })
}

const ROLE_NAMES = {
  root: { alone: 'drillFretboard.root', of: 'drillFretboard.rootOf' },
  third: { alone: 'drillFretboard.third', of: 'drillFretboard.thirdOf' },
  fifth: { alone: 'drillFretboard.fifth', of: 'drillFretboard.fifthOf' },
} as const

/** What a marked place shows on its marker: R for a root, 3 for a third; a fifth shows nothing. */
const ROLE_GLYPHS: Partial<Record<MarkedPlace['role'], string>> = { root: 'R', third: '3' }

function placeLabel(place: MarkedPlace): string {
  const names = ROLE_NAMES[place.role]
  const role = place.chord ? t(names.of, { chord: place.chord }) : t(names.alone)
  const where = { role, string: place.string, fret: place.fret }
  return place.fret === 0 ? t('drillFretboard.markedOpen', where) : t('drillFretboard.markedPlace', where)
}

/** A selected place's halo sits just outside an answer mark's ring, so both show at once. */
const SELECTED_RADIUS = MARKER_RADIUS + 7

function isSelected(place: CellPlace): boolean {
  return props.selected.some((s) => s.string === place.string && s.fret === place.fret)
}

function tap(place: CellPlace) {
  if (!props.locked) emit('tap', place)
}
</script>

<template>
  <div ref="container" class="w-full select-none" data-test="drill-fretboard">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" role="group" :aria-label="label" class="block touch-manipulation">
      <FretboardBoard :frame="frame" :tuning="tuning">
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

      <rect
        v-for="zone in outsideWindow"
        :key="`${zone.from}-${zone.to}`"
        data-test="outside-window"
        :data-frets="`${zone.from}-${zone.to}`"
        :x="zone.x"
        :y="0"
        :width="zone.width"
        :height="height"
        aria-hidden="true"
        class="fill-surface opacity-60"
      />

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

      <g
        v-for="place in places"
        :key="`place-${place.string}:${place.fret}`"
        data-test="marked-place"
        :data-string="place.string"
        :data-fret="place.fret"
        :data-role="place.role"
        role="img"
        :aria-label="placeLabel(place)"
      >
        <circle
          :cx="cx(place.fret)"
          :cy="cy(place.string)"
          :r="MARKER_RADIUS"
          :class="place.role === 'root' ? 'fill-ink' : 'fill-accent'"
          class="stroke-surface"
          stroke-width="2"
        />
        <text
          v-if="ROLE_GLYPHS[place.role]"
          :x="cx(place.fret)"
          :y="cy(place.string) + 4"
          text-anchor="middle"
          aria-hidden="true"
          class="text-[11px] font-bold"
          :class="place.role === 'root' ? 'fill-surface' : 'fill-accent-fg'"
        >{{ ROLE_GLYPHS[place.role] }}</text>
      </g>

      <circle
        v-for="place in selected"
        :key="`selected-${place.string}:${place.fret}`"
        data-test="selected-cell"
        :data-string="place.string"
        :data-fret="place.fret"
        :cx="cx(place.fret)"
        :cy="cy(place.string)"
        :r="SELECTED_RADIUS"
        fill="none"
        class="stroke-accent"
        stroke-width="2.5"
        stroke-dasharray="4 3"
        aria-hidden="true"
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
        :aria-pressed="selectable ? isSelected(cell) : undefined"
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
