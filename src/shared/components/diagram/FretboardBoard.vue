<script setup lang="ts">
/**
 * The fretboard itself, drawn inside a parent `<svg>`: wood and grain, inlays, the nut, metal
 * fret wires, strings as thick as their open pitch, and fret numbers. The student's viewer and the
 * teacher's editor both draw their board with it, so an author sees the board a student will.
 * What sits on the board — region bands through the `fills` slot (under the wires and strings),
 * markers after it — is the parent's.
 */
import { computed, useId } from 'vue'

import { fretLineX, markerCenterX, stringLineY, stringThicknesses } from '@/shared/utils/fretboardGeometry'
import type { BoardFrame } from '@/shared/utils/fretboardGeometry'

const props = withDefaults(
  defineProps<{
    frame: BoardFrame
    /** The instrument's open-string pitches, lowest string first; strings are drawn alike without it. */
    tuning?: string[]
    /** Leave out the decorative grain, for a small drawing. */
    plain?: boolean
  }>(),
  { tuning: undefined, plain: false },
)

defineSlots<{ fills?: () => unknown }>()

/** Room under the wood for the fret numbers' baseline. */
const NUMBER_OFFSET = 22
const TEXT_SIZE = 14

// Paint ids unique to this drawing, so two boards on a page never share them.
const paintId = `fretboard-${useId()}`

const x = (fret: number) => fretLineX(props.frame, fret)
const y = (stringNumber: number) => stringLineY(props.frame, stringNumber)

const showsNut = computed(() => props.frame.minFret === 0)
const boardLeft = computed(() => x(props.frame.minFret))
const boardRight = computed(() => x(props.frame.maxFret))
const woodTop = computed(() => props.frame.top - props.frame.rowGap / 2)
const woodHeight = computed(() => Math.max(props.frame.stringCount - 1, 0) * props.frame.rowGap + props.frame.rowGap)

// The fret wires, from the board's left edge to its right. At fret 0 the nut stands in for one.
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
    <defs>
      <linearGradient :id="`${paintId}-wood`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(var(--color-fretboard-wood-edge))" />
        <stop offset="50%" stop-color="rgb(var(--color-fretboard-wood))" />
        <stop offset="100%" stop-color="rgb(var(--color-fretboard-wood-edge))" />
      </linearGradient>
      <pattern :id="`${paintId}-grain`" width="240" height="48" patternUnits="userSpaceOnUse">
        <path
          d="M-20 8 Q45 1 110 9 T260 5 M-20 18 Q70 28 170 16 T270 22 M-20 35 Q70 27 160 38 T270 31 M-20 43 Q80 35 180 46 T270 40"
          fill="none"
          stroke="rgb(var(--color-fretboard-grain))"
          stroke-width="0.8"
          opacity="0.25"
        />
      </pattern>
      <linearGradient :id="`${paintId}-metal`" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="rgb(var(--color-fretboard-metal-shadow))" />
        <stop offset="0.45" stop-color="rgb(var(--color-fretboard-metal))" />
        <stop offset="1" stop-color="rgb(var(--color-fretboard-metal-shadow))" />
      </linearGradient>
    </defs>

    <rect
      data-test="fretboard-wood"
      :x="boardLeft"
      :y="woodTop"
      :width="boardRight - boardLeft"
      :height="woodHeight"
      rx="6"
      :fill="`url(#${paintId}-wood)`"
    />
    <rect
      v-if="!plain"
      data-test="board-grain"
      :x="boardLeft"
      :y="woodTop"
      :width="boardRight - boardLeft"
      :height="woodHeight"
      rx="6"
      :fill="`url(#${paintId}-grain)`"
    />

    <circle
      v-for="(dot, index) in inlayDots"
      :key="`inlay-${dot.fret}-${index}`"
      data-test="fret-inlay"
      :data-fret="dot.fret"
      :cx="markerCenterX(frame, dot.fret)"
      :cy="dot.cy"
      r="6"
      class="fill-fretboard-inlay"
    />

    <slot name="fills" />

    <rect
      v-if="showsNut"
      data-test="diagram-nut"
      :x="x(0) - 5"
      :y="woodTop"
      width="10"
      :height="woodHeight"
      rx="2"
      class="fill-fretboard-inlay stroke-fretboard-metal-shadow"
    />
    <rect
      v-for="fret in fretWires"
      :key="`fret-${fret}`"
      data-test="fret-wire"
      :data-fret="fret"
      :x="x(fret) - 1.5"
      :y="woodTop"
      width="3"
      :height="woodHeight"
      :fill="`url(#${paintId}-metal)`"
    />

    <line
      v-for="stringNumber in frame.stringCount"
      :key="`string-${stringNumber}`"
      data-test="diagram-string"
      :x1="boardLeft"
      :y1="y(stringNumber)"
      :x2="boardRight"
      :y2="y(stringNumber)"
      class="stroke-fretboard-string"
      :stroke-width="stringWidths[stringNumber - 1]"
    />

    <text
      v-for="fret in fretNumbers"
      :key="`fret-number-${fret}`"
      data-test="fret-number"
      :x="markerCenterX(frame, fret)"
      :y="woodTop + woodHeight + NUMBER_OFFSET"
      text-anchor="middle"
      :font-size="TEXT_SIZE"
      class="fill-ink-muted"
    >
      {{ fret }}
    </text>
  </g>
</template>
