<script setup lang="ts">
/**
 * The fretboard itself, drawn inside a parent `<svg>`: a flat board in the theme's colours, inlays,
 * the nut, fret lines, strings as thick as their open pitch, and fret numbers. The student's viewer and the
 * teacher's editor both draw their board with it, so an author sees the board a student will.
 * What sits on the board — region bands through the `fills` slot (under the wires and strings),
 * markers after it — is the parent's.
 */
import { computed } from 'vue'

import { fretLineX, markerCenterX, stringLineY, stringThicknesses } from '@/shared/utils/fretboardGeometry'
import type { BoardFrame } from '@/shared/utils/fretboardGeometry'

const props = withDefaults(
  defineProps<{
    frame: BoardFrame
    /** The instrument's open-string pitches, lowest string first; strings are drawn alike without it. */
    tuning?: string[]
  }>(),
  { tuning: undefined },
)

defineSlots<{ fills?: () => unknown }>()

/** Room under the board for the fret numbers' baseline. */
const NUMBER_OFFSET = 22
const TEXT_SIZE = 14
const FRET_WIDTH = 2
/** The nut is twice as thick as a fret line. */
const NUT_WIDTH = FRET_WIDTH * 2

const x = (fret: number) => fretLineX(props.frame, fret)
const y = (stringNumber: number) => stringLineY(props.frame, stringNumber)

const showsNut = computed(() => props.frame.minFret === 0)
const boardLeft = computed(() => x(props.frame.minFret))
const boardRight = computed(() => x(props.frame.maxFret))
const boardTop = computed(() => props.frame.top - props.frame.rowGap / 2)
const boardHeight = computed(() => Math.max(props.frame.stringCount - 1, 0) * props.frame.rowGap + props.frame.rowGap)

// The fret lines, from the board's left edge to its right. At fret 0 the nut stands in for one.
const fretWires = computed(() => {
  const result: number[] = []
  for (let fret = Math.max(props.frame.minFret, 1); fret <= props.frame.maxFret; fret++) result.push(fret)
  return result
})

// The fret spaces the board shows, each numbered under its middle — plus 0 under the nut.
const shownFretSpaces = computed(() => {
  const result: number[] = []
  for (let fret = props.frame.minFret + 1; fret <= props.frame.maxFret; fret++) result.push(fret)
  return result
})
const fretNumbers = computed(() => (showsNut.value ? [0, ...shownFretSpaces.value] : shownFretSpaces.value))

const stringWidths = computed(() => stringThicknesses(props.tuning, props.frame.stringCount))

// Conventional fretboard inlay-dot frets — single dot, except a double dot at the octave marks.
const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21]
const DOUBLE_DOT_FRETS = [12, 24]
const inlayDots = computed(() => {
  const middle = (y(1) + y(props.frame.stringCount)) / 2
  const dots: { fret: number; cy: number }[] = []
  for (const fret of shownFretSpaces.value) {
    if (SINGLE_DOT_FRETS.includes(fret)) dots.push({ fret, cy: middle })
    if (DOUBLE_DOT_FRETS.includes(fret)) {
      dots.push({ fret, cy: middle - props.frame.rowGap }, { fret, cy: middle + props.frame.rowGap })
    }
  }
  return dots
})
</script>

<template>
  <g>
    <rect
      data-test="fretboard-area"
      :x="boardLeft"
      :y="boardTop"
      :width="boardRight - boardLeft"
      :height="boardHeight"
      rx="6"
      class="fill-surface-raised"
    />

    <circle
      v-for="(dot, index) in inlayDots"
      :key="`inlay-${dot.fret}-${index}`"
      data-test="fret-inlay"
      :data-fret="dot.fret"
      :cx="markerCenterX(frame, dot.fret)"
      :cy="dot.cy"
      r="6"
      class="fill-border"
    />

    <slot name="fills" />

    <rect
      v-if="showsNut"
      data-test="diagram-nut"
      :x="x(0) - NUT_WIDTH / 2"
      :y="boardTop"
      :width="NUT_WIDTH"
      :height="boardHeight"
      class="fill-ink"
    />
    <rect
      v-for="fret in fretWires"
      :key="`fret-${fret}`"
      data-test="fret-wire"
      :data-fret="fret"
      :x="x(fret) - FRET_WIDTH / 2"
      :y="boardTop"
      :width="FRET_WIDTH"
      :height="boardHeight"
      class="fill-border"
    />

    <line
      v-for="stringNumber in frame.stringCount"
      :key="`string-${stringNumber}`"
      data-test="diagram-string"
      :x1="boardLeft"
      :y1="y(stringNumber)"
      :x2="boardRight"
      :y2="y(stringNumber)"
      class="stroke-ink-subtle"
      :stroke-width="stringWidths[stringNumber - 1]"
    />

    <text
      v-for="fret in fretNumbers"
      :key="`fret-number-${fret}`"
      data-test="fret-number"
      :x="markerCenterX(frame, fret)"
      :y="boardTop + boardHeight + NUMBER_OFFSET"
      text-anchor="middle"
      :font-size="TEXT_SIZE"
      class="fill-ink-subtle"
    >
      {{ fret }}
    </text>
  </g>
</template>
