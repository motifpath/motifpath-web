<script setup lang="ts">
/**
 * Renders one `Diagram` authored against a `fretted`-family `Instrument`
 * (guitar, bass) as an SVG fretboard, per a `DiagramRef`'s `layers`/`styling`
 * config. `root_override` transposition is not applied here — this draws the
 * diagram's own authored positions as-is. While the diagram plays,
 * `activePositionIds` rings the markers being heard.
 *
 * Given `selectablePositionIds`, those markers become an exercise's answer
 * choices: clicking one (or Enter/Space) emits `select` instead of pinning its
 * note, and `selectedPositionIds` marks the picked ones.
 *
 * Given `answerCells`, every one of those fretboard cells — marked or empty,
 * open strings included — is an answer choice instead, emitting
 * `selectAnswer` with its option id; `selectedAnswerIds` marks the picked ones.
 *
 * Markers show the text the ref's label mode picks (`labelMode` is the
 * diagram's own label display, which that mode can fall back to). Hidden
 * positions aren't drawn, unless `revealHidden` draws them faded for an author.
 *
 * The board is drawn at its real size in CSS pixels, so text and touch targets
 * stay readable on a phone; a board wider than its container scrolls on its
 * own. `compact` instead scales a plainer drawing to fit, for a thumbnail.
 *
 * Each region is a translucent band with an outline in its color, and one
 * information control above the board near its last fret, which opens the
 * region's description on demand. `regionInfo: false` leaves the controls out
 * of a static picture; `drawingInert` makes the drawing a picture only while
 * its controls stay usable. The `controls` slot, `controlsWidth` wide, puts
 * other controls such as a player at the left end of that same rail.
 */
import { computed, onMounted, onUnmounted, ref, useId, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { computeFrettedDiagramLayout } from '@/shared/utils/frettedDiagramLayout'
import {
  fretboardGeometry,
  MARKER_RADIUS,
  MARKER_TEXT_SIZE as TEXT_SIZE,
  boardTopFor,
  TARGET_RADIUS,
  markerCenterX,
  regionBandBox,
  stringLineY,
} from '@/shared/utils/fretboardGeometry'
import type { BoardFrame } from '@/shared/utils/fretboardGeometry'
import { LABEL_TEXT_DARK, LABEL_TEXT_LIGHT, readableTextColor } from '@/shared/utils/diagramColors'
import { insetOverlappingOutlines, railWidthFor } from '@/shared/utils/regionInfoLayout'
import { useIntervalLabel } from '@/shared/composables/useIntervalLabel'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import { effectiveLabelMode, markerTextKind } from '@/shared/utils/diagramLabels'
import FretboardBoard from '@/shared/components/diagram/FretboardBoard.vue'
import FretboardMarkerShape from '@/shared/components/diagram/FretboardMarkerShape.vue'
import RegionInfoRail from '@/shared/components/diagram/RegionInfoRail.vue'
import type { RailRegion } from '@/shared/components/diagram/RegionInfoRail.vue'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type DiagramRef = components['schemas']['DiagramRef']

/** One fretboard cell a student can pick, standing for one answer option. */
export interface AnswerCell {
  optionId: string
  string: number
  fret: number
}

const props = withDefaults(
  defineProps<{
    diagram: Diagram
    instrument: Instrument
    diagramRef: DiagramRef
    labelMode?: 'interval' | 'note' | 'hidden'
    /** The markers a student can pick as an answer; none by default. */
    selectablePositionIds?: string[]
    selectedPositionIds?: string[]
    /** Whether several choices may be picked (checkboxes) rather than one (radios). */
    multiple?: boolean
    /** Draw the positions the ref hides, faded, instead of leaving them out — for an author. */
    revealHidden?: boolean
    /** The fretboard cells a student can pick as answers; none by default. */
    answerCells?: AnswerCell[]
    selectedAnswerIds?: string[]
    /** The positions sounding right now, while the diagram plays. A hidden one stays undrawn. */
    activePositionIds?: string[]
    /** Scale a plain drawing to fit its container, for a thumbnail, instead of drawing it at a
     *  readable size that may scroll. */
    compact?: boolean
    /** Offer each region's information control; off for a static picture. */
    regionInfo?: boolean
    /** Make the drawing a picture only — no input reaches it and screen readers skip it — while
     *  its region controls stay usable. */
    drawingInert?: boolean
    /** Room for the `controls` slot at the left of the control rail; 0 leaves the slot out. */
    controlsWidth?: number
  }>(),
  {
    controlsWidth: 0,
    compact: false,
    regionInfo: true,
    drawingInert: false,
    labelMode: 'interval',
    selectablePositionIds: () => [],
    selectedPositionIds: () => [],
    multiple: false,
    revealHidden: false,
    answerCells: () => [],
    selectedAnswerIds: () => [],
    activePositionIds: () => [],
  },
)

const emit = defineEmits<{ select: [positionId: string]; selectAnswer: [optionId: string] }>()

const { t } = useTypedT()

const { intervalLabel } = useIntervalLabel()
const { localizedName } = useLocalizedName()

/** The width a compact drawing is laid out at before it's scaled to fit, and the width assumed
 *  for a readable one until its container has been measured. */
const NOMINAL_WIDTH = 720
// Room under the board for the fret numbers.
const MARGIN_BOTTOM = 52

const container = ref<HTMLElement | null>(null)
const availableWidth = ref(NOMINAL_WIDTH)
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  if (!container.value) return
  if (container.value.clientWidth > 0) availableWidth.value = container.value.clientWidth
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry && entry.contentRect.width > 0) availableWidth.value = entry.contentRect.width
  })
  resizeObserver.observe(container.value)
})
onUnmounted(() => resizeObserver?.disconnect())

// How far the board is scrolled, so an open description stays in its visible part.
const scrollLeft = ref(0)
function onBoardScroll(event: Event) {
  if (event.target instanceof HTMLElement) scrollLeft.value = event.target.scrollLeft
}

/** Brings a focused answer or note fully into view when the board scrolls. */
function revealFocused(event: FocusEvent) {
  if (props.compact || !(event.target instanceof Element)) return
  event.target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
}

const layout = computed(() =>
  // Hidden positions stay in view while an author can see them, or while the cells are the
  // answers (a hidden position can be a correct one); otherwise the window fits what's drawn.
  // Every answer cell stays on the board, those past the used frets included.
  computeFrettedDiagramLayout(props.diagram, props.instrument, props.diagramRef, {
    includeHidden: props.revealHidden || props.answerCells.length > 0,
    extraFrets: props.answerCells.map((cell) => cell.fret),
  }),
)

const showsNut = computed(() => layout.value.minFret === 0)
const showsRegionInfo = computed(() => props.regionInfo && layout.value.regions.length > 0)
const slots = defineSlots<{ controls?: () => unknown }>()
const showsControls = computed(() => Boolean(slots.controls) && props.controlsWidth > 0)
const showsRail = computed(() => showsRegionInfo.value || showsControls.value)
const geometry = computed(() =>
  fretboardGeometry({
    // A readable board grows wide enough for every region's control, side by side.
    availableWidth: props.compact
      ? NOMINAL_WIDTH
      : Math.max(availableWidth.value, showsRegionInfo.value ? railWidthFor(layout.value.regions.length) : 0),
    fretSpan: layout.value.maxFret - layout.value.minFret,
    stringCount: layout.value.stringCount,
    showsNut: showsNut.value,
  }),
)
const viewW = computed(() => geometry.value.width)
const rowGap = computed(() => geometry.value.rowGap)
const BOARD_H = computed(() => geometry.value.boardHeight)

// A compact drawing is scaled to its container; a readable one is drawn at its own size.
const scale = computed(() => (props.compact ? availableWidth.value / viewW.value : 1))

const boardTop = computed(() => boardTopFor(showsRail.value))
const viewH = computed(() => boardTop.value + BOARD_H.value + MARGIN_BOTTOM)

const frame = computed<BoardFrame>(() => ({
  minFret: layout.value.minFret,
  maxFret: layout.value.maxFret,
  stringCount: layout.value.stringCount,
  left: geometry.value.left,
  columnGap: geometry.value.columnGap,
  rowGap: rowGap.value,
  top: boardTop.value,
}))

function markerX(fret: number): number {
  return markerCenterX(frame.value, fret)
}

function y(stringNumber: number): number {
  return stringLineY(frame.value, stringNumber)
}

const boardMidY = computed(() => (y(1) + y(layout.value.stringCount)) / 2)

const rootColor = computed(() => props.diagramRef.styling?.root_color ?? null)
const intervalColor = computed(() => props.diagramRef.styling?.interval_color ?? null)

type Marker = (typeof layout.value.positions)[number] & { hidden?: boolean }

// The markers drawn: the ref's visible positions, plus its hidden ones (faded) for an author.
const markers = computed<Marker[]>(() =>
  props.revealHidden
    ? [...layout.value.positions, ...layout.value.hiddenPositions.map((position) => ({ ...position, hidden: true }))]
    : layout.value.positions,
)

const labelModeForRef = computed(() => effectiveLabelMode(props.diagramRef, props.labelMode))
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

/** The text a marker shows under the ref's label mode, or null for none. */
function markerLabel(position: Marker): string | null {
  switch (markerTextKind(labelModeForRef.value, Boolean(position.customLabel), props.labelMode)) {
    case 'custom':
      return position.customLabel ? localizedName(position.customLabel) : null
    case 'note':
      return position.noteName
    case 'interval':
      return intervalLabel(position.interval)
    default:
      return null
  }
}

function regionBox(region: Region): { x: number; y: number; width: number; height: number } {
  return regionBandBox(frame.value, region)
}

function regionFill(region: Region): { fill: string } | undefined {
  return region.color ? { fill: region.color } : undefined
}

// Each outline follows its band, one step further inside when it overlaps an earlier band.
const regionOutlines = computed(() => insetOverlappingOutlines(layout.value.regions.map(regionBox)))

// Region descriptions: one open at a time, shown under its control.
const shownRegionId = ref<string | null>(null)
watch(
  () => props.diagram,
  () => {
    shownRegionId.value = null
  },
)

const railRegions = computed<RailRegion[]>(() =>
  layout.value.regions.map((region) => {
    const box = regionBox(region)
    return {
      id: region.regionId,
      right: (box.x + box.width) * scale.value,
      color: region.color,
      label: localizedName(region.description),
    }
  }),
)

function toggleRegion(region: Region) {
  shownRegionId.value = shownRegionId.value === region.regionId ? null : region.regionId
}

// Notes: shown while a marker is hovered or focused, and kept open by a tap (touch has no
// hover) until something else is tapped or Escape is pressed.
const notedPositions = computed(() => layout.value.positions.filter((position) => position.note))
const hasNotes = computed(() => notedPositions.value.length > 0)
// An image role would make every marker presentational, hiding answer choices and notes alike.
const svgRole = computed(() => {
  if (props.selectablePositionIds.length > 0 || props.answerCells.length > 0) return props.multiple ? 'group' : 'radiogroup'
  return hasNotes.value ? 'group' : 'img'
})
const noteIdPrefix = useId()
const hoveredNote = ref<string | null>(null)
const focusedNote = ref<string | null>(null)
const pinnedNote = ref<string | null>(null)
const shownNote = computed(() => pinnedNote.value ?? focusedNote.value ?? hoveredNote.value)
// Which marker shows a focus ring: any interactive one. Kept apart from focusedNote so a focused
// choice without a note never hides a hovered note.
const focusedMarker = ref<string | null>(null)

function onMarkerFocus(position: Marker) {
  if (!isInteractive(position)) return
  focusedMarker.value = position.positionId
  if (position.note) focusedNote.value = position.positionId
}

function onMarkerBlur(position: Marker) {
  if (!isInteractive(position)) return
  focusedMarker.value = null
  if (position.note) focusedNote.value = null
}

function noteId(position: Marker): string {
  return `${noteIdPrefix}-note-${position.positionId}`
}

function togglePinnedNote(position: Marker) {
  pinnedNote.value = pinnedNote.value === position.positionId ? null : position.positionId
}

/** A click, Enter or Space: picks an answer choice, or else pins a marker's note. */
function activate(position: Marker) {
  if (isChoice(position)) emit('select', position.positionId)
  else if (position.note) togglePinnedNote(position)
}

function isInteractive(position: Marker): boolean {
  return isChoice(position) || Boolean(position.note)
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

function isChoice(position: Marker): boolean {
  return props.selectablePositionIds.includes(position.positionId)
}

function isSelectedChoice(position: Marker): boolean {
  return isChoice(position) && props.selectedPositionIds.includes(position.positionId)
}

/** Accessibility wiring for an answer choice. Named by where it sits, never by its interval or
 *  note name, which could give the answer away. */
function choiceAttrs(position: Marker): Record<string, string | number | boolean> {
  return {
    'data-test': 'diagram-choice',
    tabindex: 0,
    role: props.multiple ? 'checkbox' : 'radio',
    'aria-checked': isSelectedChoice(position),
    'aria-label': t('exerciseView.diagramChoice', { string: position.string, fret: position.fret }),
    ...(position.note ? { 'data-note-marker': '', 'aria-describedby': noteId(position) } : {}),
  }
}

/** Accessibility and pointer wiring for a marker: an answer choice, one that carries a note, or
 *  none for a plain marker. */
function markerAttrs(position: Marker): Record<string, string | number | boolean> {
  if (isChoice(position)) return choiceAttrs(position)
  if (!position.note) return {}
  return {
    'data-test': 'diagram-noted-marker',
    'data-note-marker': '',
    tabindex: 0,
    role: 'button',
    'aria-label': markerLabel(position) ?? intervalLabel(position.interval),
    'aria-describedby': noteId(position),
    'aria-expanded': shownNote.value === position.positionId,
  }
}

function isSelectedAnswer(cell: AnswerCell): boolean {
  return props.selectedAnswerIds.includes(cell.optionId)
}

/** Accessibility wiring for an answer cell, named by where it sits so it never gives the answer away. */
function cellAttrs(cell: AnswerCell): Record<string, string | number | boolean> {
  return {
    tabindex: 0,
    role: props.multiple ? 'checkbox' : 'radio',
    'aria-checked': isSelectedAnswer(cell),
    'aria-label': t('exerciseView.diagramChoice', { string: cell.string, fret: cell.fret }),
  }
}

/** Where a selected choice's check badge sits, off the marker's top-left. */
const BADGE_OFFSET = 15

/** A check mark centred on (cx, cy), sized for the selected-choice badge. */
function checkPoints(cx: number, cy: number): string {
  return `${cx - 3.5},${cy} ${cx - 1},${cy + 2.5} ${cx + 3.5},${cy - 2.5}`
}

/** Gap between a marker's centre and the edge of its note's popover. */
const NOTE_OFFSET = 16

/** The scrolling board clips anything outside it, and there's little room above the top strings,
 *  so a note on the upper half of the board opens below its marker instead of above. */
function noteOpensBelow(position: Marker): boolean {
  return y(position.string) < boardMidY.value
}

/** Where a note's popover anchors, as percentages of the diagram, so it tracks the marker at
 *  any rendered size. */
function noteAnchor(position: Marker): { left: string; top: string } {
  const offset = noteOpensBelow(position) ? NOTE_OFFSET : -NOTE_OFFSET
  return {
    left: `${(markerX(position.fret) / viewW.value) * 100}%`,
    top: `${((y(position.string) + offset) / viewH.value) * 100}%`,
  }
}

/** A marker near either edge anchors the popover's matching edge, so it stays on screen. */
function noteAlignClass(position: Marker): string {
  const fraction = markerX(position.fret) / viewW.value
  const vertical = noteOpensBelow(position) ? '' : '-translate-y-full'
  if (fraction < 0.3) return vertical
  if (fraction > 0.7) return `-translate-x-full ${vertical}`
  return `-translate-x-1/2 ${vertical}`
}
</script>

<template>
  <div ref="container" class="relative min-w-0" data-region-scope>
    <div
      data-test="board-scroll"
      :class="compact ? '' : 'overflow-x-auto overflow-y-hidden'"
      @focusin="revealFocused"
      @scroll="onBoardScroll"
    >
      <div class="relative" :style="compact ? undefined : { width: `${viewW}px` }">
        <!-- Region controls sit above the board, never over a marker. -->
        <RegionInfoRail
          v-if="showsRail"
          v-model:open-id="shownRegionId"
          :regions="showsRegionInfo ? railRegions : []"
          :width="viewW * scale"
          :scroll-left="compact ? 0 : scrollLeft"
          :visible-width="compact ? viewW * scale : availableWidth"
          :leading-width="showsControls ? controlsWidth : 0"
        >
          <template v-if="showsControls" #leading>
            <slot name="controls" />
          </template>
        </RegionInfoRail>
        <div class="relative">
        <svg
          data-test="diagram-canvas"
          :viewBox="`0 0 ${viewW} ${viewH}`"
          :width="compact ? undefined : viewW"
          :height="compact ? undefined : viewH"
          :role="svgRole"
          :aria-label="localizedName(diagram.names)"
          :class="compact ? 'w-full' : 'block max-w-none'"
          font-family="inherit"
          :inert="drawingInert || undefined"
          :aria-hidden="drawingInert || undefined"
        >
          <FretboardBoard :frame="frame" :tuning="instrument.tuning" :plain="compact">
            <template #fills>
              <rect
                v-for="region in layout.regions"
                :key="`region-${region.regionId}`"
                data-test="diagram-region"
                v-bind="regionBox(region)"
                rx="4"
                fill-opacity="0.24"
                :class="[region.color ? '' : 'fill-accent', showsRegionInfo ? 'cursor-pointer' : '']"
                :style="regionFill(region)"
                :data-region-ui="showsRegionInfo || undefined"
                @click="showsRegionInfo && toggleRegion(region)"
              />
            </template>
          </FretboardBoard>

          <rect
            v-for="(outline, index) in regionOutlines"
            :key="`outline-${layout.regions[index]!.regionId}`"
            data-test="region-outline"
            v-bind="outline"
            rx="3"
            fill="none"
            stroke-width="2"
            pointer-events="none"
            :class="layout.regions[index]!.color ? '' : 'stroke-accent'"
            :style="layout.regions[index]!.color ? { stroke: layout.regions[index]!.color } : undefined"
          />

          <g
            v-for="position in markers"
            :key="position.positionId"
            v-bind="markerAttrs(position)"
            :class="isInteractive(position) ? 'cursor-pointer outline-none' : ''"
            @mouseenter="position.note && (hoveredNote = position.positionId)"
            @mouseleave="position.note && (hoveredNote = null)"
            @focus="onMarkerFocus(position)"
            @blur="onMarkerBlur(position)"
            @click="activate(position)"
            @keydown.escape="closeNotes"
            @keydown.enter.prevent="activate(position)"
            @keydown.space.prevent="activate(position)"
          >
            <circle
              v-if="isChoice(position)"
              data-test="diagram-choice-target"
              :cx="markerX(position.fret)"
              :cy="y(position.string)"
              :r="TARGET_RADIUS"
              fill="transparent"
            />
            <!-- Behind the marker, so a sounding marker keeps its shape, color and label. -->
            <circle
              v-if="!position.hidden && props.activePositionIds.includes(position.positionId)"
              data-test="diagram-position-playing"
              :cx="markerX(position.fret)"
              :cy="y(position.string)"
              :r="TARGET_RADIUS"
              class="fill-warning"
              fill-opacity="0.6"
            />
            <g
              :opacity="position.hidden ? 0.35 : undefined"
              :data-test="position.hidden ? 'diagram-position-hidden' : undefined"
            >
              <FretboardMarkerShape
                data-test="diagram-position"
                :cx="markerX(position.fret)"
                :cy="y(position.string)"
                :shape="position.shape"
                :class="shapeClass(position)"
                :style="shapeStyle(position)"
              />
              <text
                v-if="markerLabel(position) !== null"
                data-test="diagram-position-label"
                :x="markerX(position.fret)"
                :y="y(position.string) + 5"
                text-anchor="middle"
                :font-size="TEXT_SIZE"
                font-weight="700"
                :class="labelClass(position)"
                :style="labelStyle(position)"
              >
                {{ markerLabel(position) }}
              </text>
            </g>
            <circle
              v-if="position.note"
              data-test="diagram-note-badge"
              :cx="markerX(position.fret) + 14"
              :cy="y(position.string) - 14"
              r="5"
              class="fill-accent stroke-surface"
              stroke-width="1.5"
            />
            <circle
              v-if="isInteractive(position) && focusedMarker === position.positionId"
              data-test="diagram-focus-ring"
              :cx="markerX(position.fret)"
              :cy="y(position.string)"
              :r="TARGET_RADIUS + 2"
              fill="none"
              class="stroke-focus"
              stroke-width="2"
              :stroke-dasharray="isChoice(position) ? '4 3' : undefined"
            />
            <g v-if="isSelectedChoice(position)" data-test="diagram-choice-selected">
              <circle
                :cx="markerX(position.fret)"
                :cy="y(position.string)"
                :r="MARKER_RADIUS + 2"
                fill="none"
                class="stroke-accent"
                stroke-width="3"
              />
              <circle
                :cx="markerX(position.fret) - BADGE_OFFSET"
                :cy="y(position.string) - BADGE_OFFSET"
                r="7.5"
                class="fill-accent stroke-surface"
                stroke-width="1.5"
              />
              <polyline
                :points="checkPoints(markerX(position.fret) - BADGE_OFFSET, y(position.string) - BADGE_OFFSET)"
                fill="none"
                class="stroke-accent-fg"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </g>
          </g>
          <g
            v-for="cell in answerCells"
            :key="cell.optionId"
            data-test="diagram-cell"
            v-bind="cellAttrs(cell)"
            class="group cursor-pointer outline-none"
            @click="emit('selectAnswer', cell.optionId)"
            @keydown.enter.prevent="emit('selectAnswer', cell.optionId)"
            @keydown.space.prevent="emit('selectAnswer', cell.optionId)"
          >
            <circle :cx="markerX(cell.fret)" :cy="y(cell.string)" :r="TARGET_RADIUS" fill="transparent" />
            <circle
              :cx="markerX(cell.fret)"
              :cy="y(cell.string)"
              :r="MARKER_RADIUS + 2"
              fill="none"
              class="stroke-focus opacity-0 group-hover:opacity-60 group-focus:opacity-100"
              stroke-width="2"
              stroke-dasharray="4 3"
            />
            <g v-if="isSelectedAnswer(cell)" data-test="diagram-cell-selected">
              <circle
                :cx="markerX(cell.fret)"
                :cy="y(cell.string)"
                :r="MARKER_RADIUS + 2"
                fill="none"
                class="stroke-accent"
                stroke-width="3"
              />
              <circle
                :cx="markerX(cell.fret) - BADGE_OFFSET"
                :cy="y(cell.string) - BADGE_OFFSET"
                r="7.5"
                class="fill-accent stroke-surface"
                stroke-width="1.5"
              />
              <polyline
                :points="checkPoints(markerX(cell.fret) - BADGE_OFFSET, y(cell.string) - BADGE_OFFSET)"
                fill="none"
                class="stroke-accent-fg"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </g>
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
      </div>
    </div>
  </div>
</template>
