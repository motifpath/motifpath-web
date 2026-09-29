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
 */
import { computed, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import { Info, X } from 'lucide-vue-next'

import { readableBoardGeometry } from '@/spike/diagram-ui/geometry'

import type { components } from '@/api/generated/core-domain'
import { computeFrettedDiagramLayout } from '@/shared/utils/frettedDiagramLayout'
import { LABEL_TEXT_DARK, LABEL_TEXT_LIGHT, readableTextColor } from '@/shared/utils/diagramColors'
import { starPolygonPoints } from '@/shared/utils/diagramMarkerShapes'
import {
  CAPTION_BAR_HEIGHT,
  CAPTION_FONT_SIZE,
  CAPTION_LANE_HEIGHT,
  layoutRegionCaptions,
} from '@/shared/utils/regionCaptionLayout'
import { useIntervalLabel } from '@/shared/composables/useIntervalLabel'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import { effectiveLabelMode, markerTextKind } from '@/shared/utils/diagramLabels'

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
    presentation?: 'classic' | 'study'
    texture?: boolean
    controlsWidth?: number
    drawingInert?: boolean
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
  }>(),
  {
    presentation: 'classic',
    texture: true,
    controlsWidth: 0,
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

const study = computed(() => props.presentation === 'study')
const leftMargin = computed(() => study.value ? geometry.value.left : MARGIN_LEFT)
const rightMargin = computed(() => study.value ? geometry.value.right : MARGIN_RIGHT)
const shownRegion = ref<string | null>(null)
const activeRegion = computed(() => layout.value.regions.find(region => region.regionId === shownRegion.value))
watch(() => [props.diagram, props.diagramRef], () => { shownRegion.value = null })
function regionColor(region: Region) { return region.color ?? 'rgb(var(--color-accent-text))' }
function toggleRegion(region: Region) {
  if (study.value) shownRegion.value = shownRegion.value === region.regionId ? null : region.regionId
}
const viewport = ref<HTMLElement | null>(null)
const boardScrollLeft = ref(0)
function onBoardScroll(event: Event) {
  if (event.target instanceof HTMLElement) boardScrollLeft.value = event.target.scrollLeft
}
const availableWidth = ref(328)
const paintId = `board-${useId()}`
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !viewport.value) return
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry) availableWidth.value = entry.contentRect.width
  })
  resizeObserver.observe(viewport.value)
})
onUnmounted(() => resizeObserver?.disconnect())
function revealFocused(event: FocusEvent) {
  if (study.value && event.target instanceof Element) event.target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
}
const geometry = computed(() => readableBoardGeometry(Math.max(availableWidth.value, layout.value.regions.length * 44 + 8), fretSpan.value, layout.value.stringCount, layout.value.minFret === 0))
const VIEW_W = computed(() => study.value ? geometry.value.width : 720)
const MARGIN_LEFT = 44
const MARGIN_RIGHT = 30
const MARGIN_TOP = 34
const MARGIN_BOTTOM = 40
// Half the width of a band covering only the open strings: it surrounds the markers on the nut.
const OPEN_BAND_HALF_WIDTH = 18
const BOARD_W = computed(() => VIEW_W.value - leftMargin.value - rightMargin.value)
const BOARD_H = computed(() => study.value ? geometry.value.height : 300 - MARGIN_TOP - MARGIN_BOTTOM)

const layout = computed(() =>
  // Hidden positions stay in view while an author can see them, or while the cells are the
  // answers (a hidden position can be a correct one); otherwise the window fits what's drawn.
  computeFrettedDiagramLayout(props.diagram, props.instrument, props.diagramRef, {
    includeHidden: props.revealHidden || props.answerCells.length > 0,
  }),
)

const lastFret = computed(() => study.value ? Math.max(layout.value.minFret + 1, layout.value.maxFret - 1) : layout.value.maxFret)
const fretSpan = computed(() => lastFret.value - layout.value.minFret)
const colGap = computed(() => study.value ? geometry.value.columnGap : BOARD_W.value / fretSpan.value)
const rowGap = computed(() => BOARD_H.value / Math.max(layout.value.stringCount - 1, 1))

function x(fret: number): number {
  return leftMargin.value + (fret - layout.value.minFret) * colGap.value
}

// Region captions stack on as many lines above the board as their overlaps need (horizontal
// geometry only, so this doesn't depend on where the board ends up vertically).
const captionLayout = computed(() =>
  layoutRegionCaptions(
    layout.value.regions.map((region) => {
      const { left, right } = regionFretEdges(region)
      return { left, right, text: localizedName(region.description) }
    }),
    VIEW_W.value,
  ),
)

const boardTop = computed(() => MARGIN_TOP + (study.value ? regionControlLanes.value * 44 - (regionControlLanes.value ? 12 : 0) : captionLayout.value.laneCount * CAPTION_LANE_HEIGHT))
const viewH = computed(() => boardTop.value + BOARD_H.value + MARGIN_BOTTOM + (study.value ? 16 : 0))

/**
 * X position for a position marker — the middle of the fret space behind
 * the fret wire, or on the nut for an open string, matching standard
 * fretboard-diagram convention (mirrors
 * `frettedFretboardEditor.ts`'s `positionX`, which the editor uses; this
 * viewer keeps its own local geometry rather than sharing that module).
 */
function markerX(fret: number): number {
  if (fret === 0) return x(0)
  return (x(fret - 1) + x(fret)) / 2
}

function y(stringNumber: number): number {
  return boardTop.value + (stringNumber - 1) * rowGap.value
}

// The wood and strings start at the window's left edge, which is never below the nut.
const boardLeft = computed(() => x(layout.value.minFret))

// The window never reaches below the nut, so no fret line is drawn or numbered below 0.
const frets = computed(() => {
  const start = Math.max(Math.ceil(layout.value.minFret), 0)
  const end = Math.floor(lastFret.value)
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

/** A band covers whole fret spaces: from the wire before fret_start (the nut for fret 0) to
 *  fret_end's wire, and from half a string gap above its first string to half a gap below its
 *  last. A band of only the open strings has no fret space, so it surrounds the nut, where
 *  their markers sit. */
function regionFretEdges(region: Region): { left: number; right: number } {
  if (region.fretEnd === 0) return { left: x(0) - OPEN_BAND_HALF_WIDTH, right: x(0) + OPEN_BAND_HALF_WIDTH }
  return { left: x(Math.max(region.fretStart - 1, 0)), right: x(region.fretEnd) }
}

function regionBox(region: Region): { x: number; y: number; width: number; height: number } {
  const { left, right } = regionFretEdges(region)
  const top = y(region.stringStart) - rowGap.value / 2
  const bottom = y(region.stringEnd) + rowGap.value / 2
  return { x: left, y: top, width: right - left, height: bottom - top }
}

const regionControls = computed(() => {
  const placed = layout.value.regions.map(region => ({ region, center: Math.max(22, Math.min(regionFretEdges(region).right - 12, VIEW_W.value - 22)), top: 0 }))
    .sort((a, b) => a.center - b.center)
  // Pack shared endpoints horizontally, keeping the last control at the final fret.
  for (let index = placed.length - 2; index >= 0; index--) {
    placed[index]!.center = Math.min(placed[index]!.center, placed[index + 1]!.center - 44)
  }
  for (let index = 0; index < placed.length; index++) {
    placed[index]!.center = Math.max(placed[index]!.center, index === 0 ? 22 : placed[index - 1]!.center + 44)
  }
  // Preserve endpoint anchors; a crowded information rail moves as one row below transport.
  if (props.controlsWidth && placed.some(control => control.center - 22 < props.controlsWidth)) {
    placed.forEach(control => { control.top = 44 })
  }
  return placed
})
const regionControlLanes = computed(() => study.value ? Math.max(props.controlsWidth ? 1 : 0, ...regionControls.value.map(control => 1 + control.top / 44)) : 0)
const regionOutlines = computed(() => {
  const placed: { region: Region; lane: number; box: ReturnType<typeof regionBox> }[] = []
  for (const region of layout.value.regions) {
    const box = regionBox(region)
    const overlaps = placed.filter(other => box.x <= other.box.x + other.box.width && box.x + box.width >= other.box.x && box.y <= other.box.y + other.box.height && box.y + box.height >= other.box.y)
    let lane = 0
    while (overlaps.some(other => other.lane === lane)) lane++
    placed.push({ region, lane, box })
  }
  return placed.map(({ region, lane, box }) => {
    const inset = Math.min(lane * 4, box.width / 3, box.height / 3)
    return { region, box: { x: box.x + inset, y: box.y + inset, width: box.width - 2 * inset, height: box.height - 2 * inset } }
  })
})
const regionPopover = computed(() => {
  const control = regionControls.value.find(item => item.region.regionId === shownRegion.value)
  const textWidth = activeRegion.value ? localizedName(activeRegion.value.description).length * 7 + 60 : 140
  const width = Math.min(248, availableWidth.value - 8, Math.max(140, textWidth))
  const center = control?.center ?? 22
  const left = Math.max(boardScrollLeft.value + 4, Math.min(center - width + 20, boardScrollLeft.value + availableWidth.value - width - 4))
  return { left, width, top: (control?.top ?? 0) + 40, arrow: Math.max(12, Math.min(center - left - 4, width - 20)) }
})

function regionStyle(region: Region): { fill: string } | undefined {
  return region.color ? { fill: region.color } : undefined
}

/** A caption's line and the bar under it spanning its band's frets, which ties it to its band
 *  even when several captions share a fret. */
function captionPlacement(index: number): { textX: number; textY: number; barY: number } {
  const placement = captionLayout.value.placements[index] ?? { lane: 0, textX: 0 }
  const linesBottom = y(1) - rowGap.value / 2 - 2
  const barY = linesBottom - CAPTION_BAR_HEIGHT - placement.lane * CAPTION_LANE_HEIGHT
  return { textX: placement.textX, textY: barY - 3, barY }
}

// Notes: shown while a marker is hovered or focused, and kept open by a tap (touch has no
// hover) until something else is tapped or Escape is pressed.
const notedPositions = computed(() => layout.value.positions.filter((position) => position.note))
const hasNotes = computed(() => notedPositions.value.length > 0)
// An image role would make every marker presentational, hiding answer choices and notes alike.
const svgRole = computed(() => {
  if (props.selectablePositionIds.length > 0 || props.answerCells.length > 0) return props.multiple ? 'group' : 'radiogroup'
  if (study.value && layout.value.regions.length) return 'group'
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
  const target = event.target
  if (!(target instanceof Element && viewport.value?.contains(target) && target.closest('[data-test="region-description"], [data-test="region-info"], [data-test="diagram-region"]'))) {
    shownRegion.value = null
  }
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

/** A check mark centred on (cx, cy), sized for the selected-choice badge. */
function checkPoints(cx: number, cy: number): string {
  return `${cx - 3.5},${cy} ${cx - 1},${cy + 2.5} ${cx + 3.5},${cy - 2.5}`
}

/** Where a note's popover anchors, as percentages of the diagram, so it tracks the marker at
 *  any rendered size. */
function noteAnchor(position: Marker): { left: string; top: string } {
  return {
    left: `${(markerX(position.fret) / VIEW_W.value) * 100}%`,
    top: `${((y(position.string) - 16) / viewH.value) * 100}%`,
  }
}

/** A marker near either edge anchors the popover's matching edge, so it stays on screen. */
function noteAlignClass(position: Marker): string {
  const fraction = markerX(position.fret) / VIEW_W.value
  if (fraction < 0.3) return '-translate-y-full'
  if (fraction > 0.7) return '-translate-x-full -translate-y-full'
  return '-translate-x-1/2 -translate-y-full'
}
</script>

<template>
  <div ref="viewport" class="relative min-w-0" :class="study ? 'study-board' : ''">
    <div data-test="board-scroll" :class="study ? 'overflow-x-auto rounded-lg' : ''" @focusin="revealFocused" @scroll="onBoardScroll">
    <div class="relative" :style="study ? { width: `${VIEW_W}px` } : undefined">
    <div v-if="$slots.controls" data-test="diagram-controls" :class="study ? 'pointer-events-none absolute left-0 top-0 z-30' : 'relative z-30'" :style="study ? { width: `${Math.min(availableWidth, VIEW_W)}px` } : undefined" @click.stop>
      <slot name="controls" />
    </div>
    <template v-if="study">
      <button v-for="control in regionControls" :key="control.region.regionId" type="button" data-test="region-info" class="absolute z-20 flex h-11 w-11 items-center justify-center rounded-md bg-transparent transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]" :style="{ left: `${control.center - 22}px`, top: `${control.top}px`, color: regionColor(control.region) }" :aria-label="localizedName(control.region.description)" :aria-expanded="shownRegion === control.region.regionId" :aria-controls="`${paintId}-region-description`" @click.stop="toggleRegion(control.region)" @keydown.esc="shownRegion = null">
        <Info :size="16" aria-hidden="true" />
      </button>
      <div v-if="activeRegion" :id="`${paintId}-region-description`" data-test="region-description" role="status" class="absolute z-30 rounded-md border border-border bg-surface-raised text-sm leading-relaxed text-ink shadow-level2" :style="{ left: `${regionPopover.left}px`, top: `${regionPopover.top}px`, width: `${regionPopover.width}px`, borderTopColor: regionColor(activeRegion) }" @click.stop @keydown.esc="shownRegion = null">
        <span aria-hidden="true" class="absolute -top-1 h-2 w-2 rotate-45 border-l border-t bg-surface-raised" :style="{ left: `${regionPopover.arrow}px`, borderColor: regionColor(activeRegion) }" />
        <div class="flex items-center gap-1 py-2 pl-3 pr-1">
          <span class="max-h-48 flex-1 overflow-y-auto break-words">{{ localizedName(activeRegion.description) }}</span>
          <button type="button" :aria-label="t('modalCloseButton.ariaLabel')" class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-surface-sunken" @click="shownRegion = null"><X :size="14" aria-hidden="true" /></button>
        </div>
      </div>
    </template>
    <svg
      data-test="diagram-canvas"
      :inert="drawingInert || undefined"
      :aria-hidden="drawingInert || undefined"
      :viewBox="`0 0 ${VIEW_W} ${viewH}`"
      :role="svgRole"
      :aria-label="localizedName(diagram.names)"
      :class="study ? 'block max-w-none' : 'w-full'"
      :width="study ? VIEW_W : undefined"
      :height="study ? viewH : undefined"
      :font-family="study ? 'inherit' : 'monospace'"
    >
      <defs>
        <linearGradient :id="`${paintId}-wood`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="study ? 'var(--board-edge)' : 'rgb(var(--color-fretboard-wood))'" :stop-opacity="study ? 1 : 0.55" />
          <stop offset="50%" :stop-color="study ? 'var(--board-center)' : 'rgb(var(--color-fretboard-wood))'" />
          <stop offset="100%" :stop-color="study ? 'var(--board-edge)' : 'rgb(var(--color-fretboard-wood))'" :stop-opacity="study ? 1 : 0.7" />
        </linearGradient>
        <pattern :id="`${paintId}-grain`" width="240" height="48" patternUnits="userSpaceOnUse">
          <path d="M-20 8 Q45 1 110 9 T260 5 M-20 18 Q70 28 170 16 T270 22 M-20 35 Q70 27 160 38 T270 31 M-20 43 Q80 35 180 46 T270 40" fill="none" stroke="var(--board-grain)" stroke-width="0.8" opacity="0.12" />
          <path d="M-20 12 Q75 7 150 15 T270 9 M-20 32 Q85 39 150 29 T270 34" fill="none" stroke="var(--board-grain)" stroke-width="0.4" opacity="0.16" />
        </pattern>
        <linearGradient :id="`${paintId}-metal`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="var(--board-metal-shadow)"/><stop offset="0.45" stop-color="var(--board-metal-light)"/><stop offset="1" stop-color="var(--board-metal-shadow)"/>
        </linearGradient>
      </defs>

      <rect
        data-test="fretboard-wood"
        :x="boardLeft"
        :y="boardTop - rowGap / 2"
        :width="leftMargin + BOARD_W - boardLeft"
        :height="BOARD_H + rowGap"
        rx="6"
        :fill="`url(#${paintId}-wood)`"
      />

      <rect v-if="study && texture" data-test="board-grain" :x="boardLeft" :y="boardTop - rowGap / 2" :width="BOARD_W" :height="BOARD_H + rowGap" rx="6" :fill="`url(#${paintId}-grain)`" />

      <g v-for="(region, index) in layout.regions" :key="`region-${region.regionId}`">
        <rect
          data-test="diagram-region"
          v-bind="regionBox(region)"
          rx="4"
          :fill-opacity="study ? 0.24 : 0.25"
          :class="study ? 'cursor-pointer focus:outline-none' : region.color ? '' : 'fill-accent'"
          :style="study ? { fill: regionColor(region) } : regionStyle(region)"
          :role="study ? 'button' : undefined"
          :tabindex="study ? 0 : undefined"
          :aria-label="study ? localizedName(region.description) : undefined"
          :aria-expanded="study ? shownRegion === region.regionId : undefined"
          @click.stop="toggleRegion(region)"
          @keydown.enter.prevent="toggleRegion(region)"
          @keydown.space.prevent="toggleRegion(region)"
          @keydown.esc="shownRegion = null"
        />
        <rect
          v-if="!study"
          data-test="diagram-region-caption-bar"
          :x="regionBox(region).x"
          :y="captionPlacement(index).barY"
          :width="regionBox(region).width"
          :height="CAPTION_BAR_HEIGHT"
          rx="1.5"
          fill-opacity="0.8"
          :class="region.color ? '' : 'fill-accent'"
          :style="regionStyle(region)"
        />
        <text
          v-if="!study"
          data-test="diagram-region-caption"
          :x="captionPlacement(index).textX"
          :y="captionPlacement(index).textY"
          :font-size="CAPTION_FONT_SIZE"
          font-weight="600"
          class="fill-ink-muted"
        >
          {{ localizedName(region.description) }}
        </text>
      </g>

      <g v-if="study" pointer-events="none">
        <rect v-for="outline in regionOutlines" :key="outline.region.regionId" data-test="region-outline" v-bind="outline.box" rx="3" fill="none" :stroke="regionColor(outline.region)" stroke-width="2" />
      </g>
      <circle
        v-for="(dot, index) in inlayDots.filter(dot => !study || dot.fret > layout.minFret)"
        :key="`inlay-${dot.fret}-${index}`"
        data-test="fret-inlay"
        :cx="markerX(dot.fret)"
        :cy="dot.cy"
        :r="study ? 6 : 4"
        :class="study ? 'board-inlay' : 'fill-ink-subtle'"
        :opacity="study ? 1 : 0.4"
      />

      <rect v-if="study && layout.minFret === 0" data-test="diagram-nut" :x="x(0) - 5" :y="boardTop - rowGap / 2" width="10" :height="BOARD_H + rowGap" rx="2" class="board-nut" />
      <line
        v-for="stringNumber in layout.stringCount"
        :key="`string-${stringNumber}`"
        data-test="diagram-string"
        :x1="boardLeft"
        :y1="y(stringNumber)"
        :x2="leftMargin + BOARD_W"
        :y2="y(stringNumber)"
          :class="study ? 'board-string' : 'stroke-border'"
        :stroke-width="study ? (instrument.string_count === 6 ? 0.9 + (stringNumber - 1) * 0.48 : 1.6) : 1.2"
      />

      <g v-for="fret in frets" :key="`fret-${fret}`">
        <rect v-if="study && fret !== 0" :x="x(fret) - 1.5" :y="boardTop - rowGap / 2" width="3" :height="BOARD_H + rowGap" :fill="`url(#${paintId}-metal)`" />
        <line v-if="!study"
          :x1="x(fret)"
          :y1="boardTop - 6"
          :x2="x(fret)"
          :y2="boardTop + BOARD_H + 6"
          :class="study ? '' : 'stroke-ink-subtle'"
          :stroke="study ? `url(#${paintId}-metal)` : undefined"
          :stroke-width="study ? 3 : 2"
        />
        <text
          data-test="fret-number"
          v-if="!study || fret > layout.minFret || fret === 0"
          :x="study ? markerX(fret) : x(fret)"
          :y="boardTop + BOARD_H + (study ? 48 : 24)"
          text-anchor="middle"
          :font-size="study ? 14 : 12"
          class="fill-ink-muted"
        >
          {{ fret }}
        </text>
      </g>

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
          :r="study ? 22 : 21"
          fill="transparent"
        />
        <circle v-if="study && !position.hidden && activePositionIds.includes(position.positionId)" data-test="diagram-playing" :data-position-id="position.positionId" :cx="markerX(position.fret)" :cy="y(position.string)" r="22" fill="none" class="board-playing" stroke-width="3" stroke-dasharray="4 3" />
        <g
          :opacity="position.hidden ? 0.35 : undefined"
          :data-test="position.hidden ? 'diagram-position-hidden' : undefined"
        >
        <circle
          v-if="position.shape === 'dot'"
          data-test="diagram-position"
          :cx="markerX(position.fret)"
          :cy="y(position.string)"
          :r="study ? 18 : 13.5"
          :class="shapeClass(position)"
          :style="shapeStyle(position)"
        />
        <rect
          v-else-if="position.shape === 'square'"
          data-test="diagram-position"
          :x="markerX(position.fret) - (study ? 17 : 12)"
          :y="y(position.string) - (study ? 17 : 12)"
          :width="study ? 34 : 24"
          :height="study ? 34 : 24"
          rx="3"
          :class="shapeClass(position)"
          :style="shapeStyle(position)"
        />
        <polygon
          v-else
          data-test="diagram-position"
          :points="starPolygonPoints(markerX(position.fret), y(position.string), study ? 21 : 15, study ? 11 : 6.5)"
          :class="shapeClass(position)"
          :style="shapeStyle(position)"
        />
        <text
          v-if="markerLabel(position) !== null"
          data-test="diagram-position-label"
          :x="markerX(position.fret)"
          :y="y(position.string) + 4.5"
          text-anchor="middle"
          :font-size="study ? 14 : 11.5"
          font-weight="600"
          :class="study ? 'study-position-label' : labelClass(position)"
          :style="study ? undefined : labelStyle(position)"
        >
          {{ markerLabel(position) }}
        </text>
        </g>
        <circle
          v-if="!study && !position.hidden && props.activePositionIds.includes(position.positionId)"
          data-test="diagram-position-playing"
          :cx="markerX(position.fret)"
          :cy="y(position.string)"
          r="19"
          fill="none"
          class="stroke-accent"
          stroke-width="3.5"
        />
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
          v-if="isInteractive(position) && (focusedMarker === position.positionId)"
          :cx="markerX(position.fret)"
          :cy="y(position.string)"
          :r="isChoice(position) ? 22 : 18"
          fill="none"
          class="stroke-accent"
          stroke-width="2"
          :stroke-dasharray="isChoice(position) ? '4 3' : undefined"
        />
        <g v-if="isSelectedChoice(position)" data-test="diagram-choice-selected">
          <circle
            :cx="markerX(position.fret)"
            :cy="y(position.string)"
            r="18"
            fill="none"
            class="stroke-accent"
            stroke-width="3.5"
          />
          <circle
            :cx="markerX(position.fret) - 12"
            :cy="y(position.string) - 12"
            r="7.5"
            class="fill-accent stroke-surface"
            stroke-width="1.5"
          />
          <polyline
            :points="checkPoints(markerX(position.fret) - 12, y(position.string) - 12)"
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
        <circle :cx="markerX(cell.fret)" :cy="y(cell.string)" r="18" fill="transparent" />
        <circle
          :cx="markerX(cell.fret)"
          :cy="y(cell.string)"
          r="18"
          fill="none"
          class="stroke-accent opacity-0 group-hover:opacity-60 group-focus:opacity-100"
          stroke-width="2"
          stroke-dasharray="4 3"
        />
        <g v-if="isSelectedAnswer(cell)" data-test="diagram-cell-selected">
          <circle :cx="markerX(cell.fret)" :cy="y(cell.string)" r="18" fill="none" class="stroke-accent" stroke-width="3.5" />
          <circle
            :cx="markerX(cell.fret) - 12"
            :cy="y(cell.string) - 12"
            r="7.5"
            class="fill-accent stroke-surface"
            stroke-width="1.5"
          />
          <polyline
            :points="checkPoints(markerX(cell.fret) - 12, y(cell.string) - 12)"
            fill="none"
            class="stroke-accent-fg"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>
      </g>
    </svg>
    </div>
    </div>

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

<style scoped>
.study-board {
  --board-edge: #241a18;
  --board-center: #493025;
  --board-grain: #ca9465;
  --board-metal-shadow: #898882;
  --board-metal-light: #f1eee5;
  --board-ivory: #eee4c9;
  --board-playing: #ffd580;
}
.board-inlay { fill: var(--board-ivory); }
.board-string { stroke: var(--board-metal-light); filter: drop-shadow(0 1px 1px #000); }
.board-nut { fill: var(--board-ivory); stroke: var(--board-metal-shadow); }
.board-playing { stroke: var(--board-playing); }
.study-board [data-test="diagram-region"]:focus-visible { stroke-width: 4; stroke-dasharray: 5 3; }
.study-position-label { fill: #17131b; stroke: #fff8e9; stroke-width: 3px; paint-order: stroke; font-weight: 800; }
</style>
