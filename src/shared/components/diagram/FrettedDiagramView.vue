<script setup lang="ts">
/**
 * Renders one `Diagram` authored against a `fretted`-family `Instrument`
 * (guitar, bass) as an SVG fretboard, per a `DiagramRef`'s `layers`/`styling`
 * config. `root_override` transposition and `playback` are not applied here
 * — this draws the diagram's own authored positions as-is.
 */
import { computed, onMounted, onUnmounted, ref, useId } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { computeFrettedDiagramLayout } from '@/shared/utils/frettedDiagramLayout'
import { LABEL_TEXT_DARK, LABEL_TEXT_LIGHT, readableTextColor } from '@/shared/utils/diagramColors'
import { starPolygonPoints } from '@/shared/utils/diagramMarkerShapes'
import { useIntervalLabel } from '@/shared/composables/useIntervalLabel'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'

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

const { intervalLabel } = useIntervalLabel()
const { localizedName } = useLocalizedName()

const VIEW_W = 720
const MARGIN_LEFT = 44
const MARGIN_RIGHT = 30
const MARGIN_TOP = 34
const MARGIN_BOTTOM = 40
// Extra room above the board for region captions, taken only when there are regions.
const CAPTION_SPACE = 20
const BOARD_W = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT
const BOARD_H = 300 - MARGIN_TOP - MARGIN_BOTTOM

const layout = computed(() =>
  computeFrettedDiagramLayout(props.diagram, props.instrument, props.diagramRef),
)

const boardTop = computed(() => MARGIN_TOP + (layout.value.regions.length > 0 ? CAPTION_SPACE : 0))
const viewH = computed(() => boardTop.value + BOARD_H + MARGIN_BOTTOM)

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
  return boardTop.value + (stringNumber - 1) * rowGap.value
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

type Marker = (typeof layout.value.positions)[number]
type Region = (typeof layout.value.regions)[number]

/** The color a marker is filled with: the ref's styling override for this embedding wins,
 *  then the diagram's persisted color (its own, else the general one); null = design token. */
function stylingColor(isRoot: boolean): string | null {
  return isRoot ? rootColor.value : intervalColor.value
}

function markerColor(position: Marker): string | null {
  return stylingColor(position.isRoot) ?? position.color
}

/** A styling override keeps the reference renderer's fixed dark/light heuristic; a persisted
 *  color picks whichever text color reads better on it. */
function labelStyle(position: Marker): { fill: string } | undefined {
  if (stylingColor(position.isRoot)) return { fill: position.isRoot ? LABEL_TEXT_DARK : LABEL_TEXT_LIGHT }
  return position.color ? { fill: readableTextColor(position.color) } : undefined
}

function shapeStyle(position: Marker): { fill: string } | undefined {
  const color = markerColor(position)
  return color ? { fill: color } : undefined
}

function shapeClass(position: Marker): string {
  if (markerColor(position)) return ''
  return position.isRoot ? 'fill-accent' : 'fill-ink'
}

function labelClass(position: Marker): string {
  if (markerColor(position)) return ''
  return position.isRoot ? 'fill-accent-fg' : 'fill-surface'
}

/** What a marker shows: its custom label wins over the interval or note name. */
function markerLabel(position: Marker): string {
  if (position.customLabel) return localizedName(position.customLabel)
  return props.labelMode === 'note' ? position.noteName : intervalLabel(position.interval)
}

/** A band covers whole fret spaces: from the wire before fret_start (the open-string area
 *  for fret 0) to fret_end's wire, and from half a string gap above its first string to
 *  half a gap below its last. */
function regionBox(region: Region): { x: number; y: number; width: number; height: number } {
  const left = region.fretStart === 0 ? x(0) - colGap.value : x(region.fretStart - 1)
  const right = x(region.fretEnd)
  const top = y(region.stringStart) - rowGap.value / 2
  const bottom = y(region.stringEnd) + rowGap.value / 2
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function regionStyle(region: Region): { fill: string } | undefined {
  return region.color ? { fill: region.color } : undefined
}

// Notes: shown while a marker is hovered or focused, and kept open by a tap (touch has no
// hover) until something else is tapped or Escape is pressed.
const notedPositions = computed(() => layout.value.positions.filter((position) => position.note))
const hasNotes = computed(() => notedPositions.value.length > 0)
const noteIdPrefix = useId()
const hoveredNote = ref<string | null>(null)
const focusedNote = ref<string | null>(null)
const pinnedNote = ref<string | null>(null)
const shownNote = computed(() => pinnedNote.value ?? focusedNote.value ?? hoveredNote.value)

function noteId(position: Marker): string {
  return `${noteIdPrefix}-note-${position.positionId}`
}

function togglePinnedNote(position: Marker) {
  pinnedNote.value = pinnedNote.value === position.positionId ? null : position.positionId
}

function closeNotes() {
  pinnedNote.value = null
  hoveredNote.value = null
}

function onDocumentPointerDown(event: Event) {
  if (event.target instanceof Element && event.target.closest('[data-note-marker]')) return
  pinnedNote.value = null
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

/** Accessibility and pointer wiring for a marker that carries a note; none for one without. */
function noteMarkerAttrs(position: Marker): Record<string, string | number | boolean> {
  if (!position.note) return {}
  return {
    'data-test': 'diagram-noted-marker',
    'data-note-marker': '',
    tabindex: 0,
    role: 'button',
    'aria-label': markerLabel(position),
    'aria-describedby': noteId(position),
    'aria-expanded': shownNote.value === position.positionId,
  }
}

/** Where a note's popover anchors, as percentages of the diagram, so it tracks the marker at
 *  any rendered size. */
function noteAnchor(position: Marker): { left: string; top: string } {
  return {
    left: `${(markerX(position.fret) / VIEW_W) * 100}%`,
    top: `${((y(position.string) - 16) / viewH.value) * 100}%`,
  }
}

/** A marker near either edge anchors the popover's matching edge, so it stays on screen. */
function noteAlignClass(position: Marker): string {
  const fraction = markerX(position.fret) / VIEW_W
  if (fraction < 0.3) return '-translate-y-full'
  if (fraction > 0.7) return '-translate-x-full -translate-y-full'
  return '-translate-x-1/2 -translate-y-full'
}
</script>

<template>
  <div class="relative">
    <svg
      :viewBox="`0 0 ${VIEW_W} ${viewH}`"
      :role="hasNotes ? 'group' : 'img'"
      :aria-label="localizedName(diagram.names)"
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
        :y="boardTop - rowGap / 2"
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

      <g v-for="region in layout.regions" :key="`region-${region.regionId}`">
        <rect
          data-test="diagram-region"
          v-bind="regionBox(region)"
          rx="4"
          fill-opacity="0.25"
          :class="region.color ? '' : 'fill-accent'"
          :style="regionStyle(region)"
        />
        <text
          data-test="diagram-region-caption"
          :x="regionBox(region).x + 4"
          :y="regionBox(region).y - 5"
          font-size="12"
          font-weight="600"
          class="fill-ink-muted"
        >
          {{ localizedName(region.description) }}
        </text>
      </g>

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
          :y1="boardTop - 6"
          :x2="x(fret)"
          :y2="boardTop + BOARD_H + 6"
          class="stroke-ink-subtle"
          stroke-width="2"
        />
        <text
          :x="x(fret)"
          :y="boardTop + BOARD_H + 24"
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
        v-bind="noteMarkerAttrs(position)"
        :class="position.note ? 'cursor-pointer outline-none' : ''"
        @mouseenter="position.note && (hoveredNote = position.positionId)"
        @mouseleave="position.note && (hoveredNote = null)"
        @focus="position.note && (focusedNote = position.positionId)"
        @blur="position.note && (focusedNote = null)"
        @click="position.note && togglePinnedNote(position)"
        @keydown.escape="closeNotes"
        @keydown.enter.prevent="position.note && togglePinnedNote(position)"
        @keydown.space.prevent="position.note && togglePinnedNote(position)"
      >
        <circle
          v-if="position.shape === 'dot'"
          data-test="diagram-position"
          :cx="markerX(position.fret)"
          :cy="y(position.string)"
          r="13.5"
          :class="shapeClass(position)"
          :style="shapeStyle(position)"
        />
        <rect
          v-else-if="position.shape === 'square'"
          data-test="diagram-position"
          :x="markerX(position.fret) - 12"
          :y="y(position.string) - 12"
          width="24"
          height="24"
          rx="3"
          :class="shapeClass(position)"
          :style="shapeStyle(position)"
        />
        <polygon
          v-else
          data-test="diagram-position"
          :points="starPolygonPoints(markerX(position.fret), y(position.string), 15, 6.5)"
          :class="shapeClass(position)"
          :style="shapeStyle(position)"
        />
        <text
          v-if="diagramRef.layers.intervals && labelMode !== 'hidden'"
          data-test="diagram-position-label"
          :x="markerX(position.fret)"
          :y="y(position.string) + 4.5"
          text-anchor="middle"
          font-size="11.5"
          font-weight="600"
          :class="labelClass(position)"
          :style="labelStyle(position)"
        >
          {{ markerLabel(position) }}
        </text>
        <circle
          v-if="position.note"
          data-test="diagram-note-badge"
          :cx="markerX(position.fret) + 11"
          :cy="y(position.string) - 11"
          r="5"
          class="fill-accent stroke-surface"
          stroke-width="1.5"
        />
        <circle
          v-if="position.note && (focusedNote === position.positionId)"
          :cx="markerX(position.fret)"
          :cy="y(position.string)"
          r="18"
          fill="none"
          class="stroke-accent"
          stroke-width="2"
        />
      </g>
    </svg>

    <div
      v-for="position in notedPositions"
      v-show="shownNote === position.positionId"
      :id="noteId(position)"
      :key="`note-${position.positionId}`"
      data-test="diagram-note"
      role="tooltip"
      class="pointer-events-none absolute z-30 max-w-xs rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-ink shadow-level2"
      :class="noteAlignClass(position)"
      :style="noteAnchor(position)"
    >
      {{ position.note ? localizedName(position.note) : '' }}
    </div>
  </div>
</template>
