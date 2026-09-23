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

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type DiagramRef = components['schemas']['DiagramRef']

const props = defineProps<{
  diagram: Diagram
  instrument: Instrument
  diagramRef: DiagramRef
}>()

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

function y(stringNumber: number): number {
  return MARGIN_TOP + (layout.value.stringCount - stringNumber) * rowGap.value
}

const frets = computed(() => {
  const start = Math.ceil(layout.value.minFret)
  const end = Math.floor(layout.value.maxFret)
  const result: number[] = []
  for (let fret = start; fret <= end; fret++) result.push(fret)
  return result
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
    <rect
      :x="MARGIN_LEFT"
      :y="MARGIN_TOP - rowGap / 2"
      :width="BOARD_W"
      :height="BOARD_H + rowGap"
      rx="6"
      class="fill-surface-sunken"
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

    <g
      v-for="position in layout.positions"
      :key="position.positionId"
      data-test="diagram-position"
      :class="shapeClass(position.isRoot)"
      :style="shapeStyle(position.isRoot)"
    >
      <circle :cx="x(position.fret)" :cy="y(position.string)" r="13.5" fill="currentColor" />
      <text
        v-if="diagramRef.layers.intervals"
        data-test="diagram-position-label"
        :x="x(position.fret)"
        :y="y(position.string) + 4.5"
        text-anchor="middle"
        font-size="11.5"
        font-weight="600"
        :class="labelClass(position.isRoot)"
        :style="labelStyle(position.isRoot)"
        fill="currentColor"
      >
        {{ position.interval }}
      </text>
    </g>
  </svg>
</template>
