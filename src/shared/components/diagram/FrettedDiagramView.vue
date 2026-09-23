<script setup lang="ts">
/**
 * Renders one `Diagram` authored against a `fretted`-family `Instrument`
 * (guitar, bass) as an SVG fretboard, per a `DiagramRef`'s `layers`/`styling`
 * config. `root_override` transposition and `playback` are not applied here
 * — this draws the diagram's own authored positions as-is.
 */
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { computeFrettedDiagramLayout } from '@/shared/utils/frettedDiagramLayout'
import { starPolygonPoints } from '@/shared/utils/diagramMarkerShapes'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type DiagramRef = components['schemas']['DiagramRef']

const props = withDefaults(
  defineProps<{
    diagram: Diagram
    instrument: Instrument
    diagramRef: DiagramRef
    labelMode?: 'interval' | 'note' | 'hidden'
  }>(),
  { labelMode: 'interval' },
)

const VIEW_W = 720
const VIEW_H = 300
const MARGIN_LEFT = 44
const MARGIN_RIGHT = 30
const MARGIN_TOP = 34
const MARGIN_BOTTOM = 40
const BOARD_W = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT
const BOARD_H = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM

const layout = computed(() =>
  computeFrettedDiagramLayout(props.diagram, props.instrument, props.diagramRef),
)

const fretSpan = computed(() => layout.value.maxFret - layout.value.minFret)
const colGap = computed(() => BOARD_W / fretSpan.value)
const rowGap = computed(() => BOARD_H / Math.max(layout.value.stringCount - 1, 1))

function x(fret: number): number {
  return MARGIN_LEFT + (fret - layout.value.minFret) * colGap.value
}

/**
 * X position for a position marker — the middle of the fret space behind
 * the fret wire, matching standard fretboard-diagram convention (mirrors
 * `frettedFretboardEditor.ts`'s `positionX`, which the editor uses; this
 * viewer keeps its own local geometry rather than sharing that module).
 */
function markerX(fret: number): number {
  if (fret === 0) return x(0) - colGap.value / 2
  return (x(fret - 1) + x(fret)) / 2
}

function y(stringNumber: number): number {
  return MARGIN_TOP + (stringNumber - 1) * rowGap.value
}

const frets = computed(() => {
  const start = Math.ceil(layout.value.minFret)
  const end = Math.floor(layout.value.maxFret)
  const result: number[] = []
  for (let fret = start; fret <= end; fret++) result.push(fret)
  return result
})

// Conventional fretboard inlay-dot frets — single dot, except a double dot at the octave marks.
const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21]
const DOUBLE_DOT_FRETS = [12, 24]
const boardMidY = computed(() => (y(1) + y(layout.value.stringCount)) / 2)
const inlayDots = computed(() => {
  const dots: { fret: number; cy: number }[] = []
  for (const fret of frets.value) {
    if (SINGLE_DOT_FRETS.includes(fret)) dots.push({ fret, cy: boardMidY.value })
    if (DOUBLE_DOT_FRETS.includes(fret)) {
      dots.push({ fret, cy: boardMidY.value - 22 }, { fret, cy: boardMidY.value + 22 })
    }
  }
  return dots
})

const rootColor = computed(() => props.diagramRef.styling?.root_color ?? null)
const intervalColor = computed(() => props.diagramRef.styling?.interval_color ?? null)

/** Simple fixed-contrast heuristic (dark text on a custom root color, light text on a custom
 *  other color) matching the reference renderer — not accessibility-validated contrast. */
function labelStyle(isRoot: boolean): { fill: string } | undefined {
  const custom = isRoot ? rootColor.value : intervalColor.value
  if (!custom) return undefined
  return { fill: isRoot ? '#1a1a1a' : '#f4f4f4' }
}

function shapeStyle(isRoot: boolean): { fill: string } | undefined {
  const custom = isRoot ? rootColor.value : intervalColor.value
  return custom ? { fill: custom } : undefined
}

function shapeClass(isRoot: boolean): string {
  if (isRoot) return rootColor.value ? '' : 'fill-accent'
  return intervalColor.value ? '' : 'fill-ink'
}

function labelClass(isRoot: boolean): string {
  const custom = isRoot ? rootColor.value : intervalColor.value
  if (custom) return ''
  return isRoot ? 'fill-accent-fg' : 'fill-surface'
}
</script>

<template>
  <svg
    :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
    role="img"
    :aria-label="diagram.name"
    class="w-full"
    font-family="monospace"
  >
    <defs>
      <linearGradient :id="`fretboard-wood-${diagram.diagram_id}`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(var(--color-fretboard-wood))" stop-opacity="0.55" />
        <stop offset="50%" stop-color="rgb(var(--color-fretboard-wood))" stop-opacity="1" />
        <stop offset="100%" stop-color="rgb(var(--color-fretboard-wood))" stop-opacity="0.7" />
      </linearGradient>
    </defs>

    <rect
      :x="MARGIN_LEFT"
      :y="MARGIN_TOP - rowGap / 2"
      :width="BOARD_W"
      :height="BOARD_H + rowGap"
      rx="6"
      :fill="`url(#fretboard-wood-${diagram.diagram_id})`"
    />

    <circle
      v-for="(dot, index) in inlayDots"
      :key="`inlay-${dot.fret}-${index}`"
      data-test="fret-inlay"
      :cx="markerX(dot.fret)"
      :cy="dot.cy"
      r="4"
      class="fill-ink-subtle"
      opacity="0.4"
    />

    <line
      v-for="stringNumber in layout.stringCount"
      :key="`string-${stringNumber}`"
      :x1="MARGIN_LEFT"
      :y1="y(stringNumber)"
      :x2="MARGIN_LEFT + BOARD_W"
      :y2="y(stringNumber)"
      class="stroke-border"
      stroke-width="1.2"
    />

    <g v-for="fret in frets" :key="`fret-${fret}`">
      <line
        :x1="x(fret)"
        :y1="MARGIN_TOP - 6"
        :x2="x(fret)"
        :y2="MARGIN_TOP + BOARD_H + 6"
        class="stroke-ink-subtle"
        stroke-width="2"
      />
      <text
        :x="x(fret)"
        :y="MARGIN_TOP + BOARD_H + 24"
        text-anchor="middle"
        font-size="12"
        class="fill-ink-muted"
      >
        {{ fret }}
      </text>
    </g>

    <g v-for="position in layout.positions" :key="position.positionId">
      <circle
        v-if="position.shape === 'dot'"
        data-test="diagram-position"
        :cx="markerX(position.fret)"
        :cy="y(position.string)"
        r="13.5"
        :class="shapeClass(position.isRoot)"
        :style="shapeStyle(position.isRoot)"
      />
      <rect
        v-else-if="position.shape === 'square'"
        data-test="diagram-position"
        :x="markerX(position.fret) - 12"
        :y="y(position.string) - 12"
        width="24"
        height="24"
        rx="3"
        :class="shapeClass(position.isRoot)"
        :style="shapeStyle(position.isRoot)"
      />
      <polygon
        v-else
        data-test="diagram-position"
        :points="starPolygonPoints(markerX(position.fret), y(position.string), 15, 6.5)"
        :class="shapeClass(position.isRoot)"
        :style="shapeStyle(position.isRoot)"
      />
      <text
        v-if="diagramRef.layers.intervals && labelMode !== 'hidden'"
        data-test="diagram-position-label"
        :x="markerX(position.fret)"
        :y="y(position.string) + 4.5"
        text-anchor="middle"
        font-size="11.5"
        font-weight="600"
        :class="labelClass(position.isRoot)"
        :style="labelStyle(position.isRoot)"
      >
        {{ labelMode === 'note' ? position.noteName : position.interval }}
      </text>
    </g>
  </svg>
</template>
