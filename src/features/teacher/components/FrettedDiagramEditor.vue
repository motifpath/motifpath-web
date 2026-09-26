<script setup lang="ts">
/**
 * Click-to-place position editor for a `fretted`-family `Instrument`
 * (guitar, bass). Shows the whole playable neck (not the read-only viewer's
 * auto-cropped window) so a teacher can place a position anywhere on it.
 * Owns no state itself — every change is emitted for a parent form
 * composable (`useDiagramForm`) to apply, the same split `ImageRegionEditor`
 * already uses for its own click-to-place editor.
 */
import { computed, ref } from 'vue'
import { Circle, GripVertical, Palette, Square, Star, X } from 'lucide-vue-next'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useIntervalLabel } from '@/shared/composables/useIntervalLabel'
import { useScopedLocale } from '@/shared/composables/useScopedLocale'
import { toApiLanguageCode } from '@/i18n'

import { toLocalPosition, type LocalPosition, type LocalRegion, type PositionShape } from '@/features/teacher/composables/useDiagramForm'
import type { StackLayer } from '@/shared/utils/flattenDiagramStack'
import type { components } from '@/api/generated/core-domain'
import ColorPaletteMenu from '@/shared/components/ColorPaletteMenu.vue'
import { readableTextColor, resolveMarkerColor } from '@/shared/utils/diagramColors'
import { starPolygonPoints } from '@/shared/utils/diagramMarkerShapes'
import {
  EDITOR_BOARD_H,
  EDITOR_CAPTION_SPACE,
  EDITOR_MARGIN_LEFT,
  EDITOR_MARGIN_TOP,
  EDITOR_VIEW_H,
  editorBoardWidth,
  editorRegionBox,
  editorViewWidth,
  fretX,
  frettedEditorGeometry,
  isDrawableRegion,
  nearestFrettedCell,
  positionX,
  stringY,
} from '@/shared/utils/frettedFretboardEditor'

type Instrument = components['schemas']['Instrument']

const props = withDefaults(
  defineProps<{
    instrument: Instrument
    positions: LocalPosition[]
    labelMode?: 'interval' | 'note' | 'hidden'
    /** The diagram's general marker color (#RRGGBB); a position's own color wins over it. */
    color?: string | null
    /** The language code whose custom labels and notes are shown and edited; defaults to the
     *  language the editor is displayed in. */
    language?: string
    /** Highlighted regions drawn behind the markers, so the author sees them where they place positions. */
    regions?: LocalRegion[]
    /** Other diagrams drawn read-only on top of this one, in the order they were added. */
    overlays?: StackLayer[]
  }>(),
  { labelMode: 'interval', regions: () => [], overlays: () => [] },
)

const emit = defineEmits<{
  'toggle-cell': [cell: { string: number; fret: number }]
  reorder: [fromIndex: number, toIndex: number]
  'set-shape': [id: string, shape: PositionShape]
  'set-color': [id: string, color: string | null]
  'set-custom-label': [id: string, value: string]
  'set-note': [id: string, value: string]
  remove: [id: string]
}>()

const scopedLocale = useScopedLocale()
const editingLanguage = computed(() => props.language ?? toApiLanguageCode(scopedLocale.value))

const SHAPES: PositionShape[] = ['dot', 'square', 'star']
const SHAPE_ICONS = { dot: Circle, square: Square, star: Star } as const

const { t } = useTypedT()

/** One marker on the board: the diagram's own position, or an overlay's drawn read-only on top. */
interface BoardMarker {
  key: string
  position: LocalPosition
  /** The color a marker falls back to without its own: the diagram's, or its overlay's. */
  fallbackColor: string | null
  overlay: boolean
}

// The diagram's own markers first, then each overlay's in the order added, so later ones paint on top.
const markers = computed<BoardMarker[]>(() => [
  ...props.positions.map((position) => ({
    key: position.id,
    position,
    fallbackColor: props.color ?? null,
    overlay: false,
  })),
  ...props.overlays.flatMap((layer, layerIndex) =>
    layer.positions.map((p, index) => ({
      key: `overlay-${layerIndex}-${index}`,
      position: toLocalPosition(p),
      fallbackColor: layer.color,
      overlay: true,
    })),
  ),
])

function markerFill(marker: BoardMarker): string | null {
  return resolveMarkerColor(marker.position.color, marker.fallbackColor)
}
function markerStyle(marker: BoardMarker): { fill: string } | undefined {
  const fill = markerFill(marker)
  return fill ? { fill } : undefined
}
function labelStyle(marker: BoardMarker): { fill: string } | undefined {
  const fill = markerFill(marker)
  return fill ? { fill: readableTextColor(fill) } : undefined
}

const geometry = computed(() => frettedEditorGeometry(props.instrument.string_count ?? 0))
const viewWidth = computed(() => editorViewWidth(geometry.value))
const boardWidth = computed(() => editorBoardWidth(geometry.value))

// Regions that can't be drawn yet (backwards, or past the last string) are left off the board;
// the regions editor below already flags them.
const drawableRegions = computed(() => props.regions.filter((region) => isDrawableRegion(region, geometry.value)))
// The board shifts down to make room for region captions above it.
const boardOffsetY = computed(() => (drawableRegions.value.length > 0 ? EDITOR_CAPTION_SPACE : 0))
const viewHeight = computed(() => EDITOR_VIEW_H + boardOffsetY.value)

function regionBox(region: LocalRegion) {
  return editorRegionBox(region, geometry.value)
}
function regionStyle(region: LocalRegion): { fill: string } | undefined {
  return region.color ? { fill: region.color } : undefined
}

const frets = computed(() => {
  const result: number[] = []
  for (let fret = geometry.value.minFret; fret <= geometry.value.maxFret; fret++) result.push(fret)
  return result
})

// Conventional fretboard inlay-dot frets — single dot, except a double dot at the octave marks.
const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21]
const DOUBLE_DOT_FRETS = [12, 24]
const boardMidY = computed(() => (y(1) + y(geometry.value.stringCount)) / 2)
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

function x(fret: number): number {
  return fretX(fret, geometry.value)
}

function markerX(fret: number): number {
  return positionX(fret, geometry.value)
}

function y(stringNumber: number): number {
  return stringY(stringNumber, geometry.value)
}

function onFretboardClick(event: MouseEvent) {
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const px = ((event.clientX - rect.left) / rect.width) * viewWidth.value
  const py = ((event.clientY - rect.top) / rect.height) * viewHeight.value - boardOffsetY.value
  const cell = nearestFrettedCell(px, py, geometry.value)
  if (cell) emit('toggle-cell', cell)
}

const { intervalLabel } = useIntervalLabel()

/** A marker's label: its custom label in the editing language wins over the interval or note name. */
function labelFor(position: LocalPosition): string {
  const custom = (position.customLabel[editingLanguage.value] ?? '').trim()
  if (custom !== '') return custom
  return props.labelMode === 'note' ? position.noteName : intervalLabel(position.interval)
}

function inputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : ''
}

// Selecting a position row highlights its marker on the fretboard, so a teacher can see which
// position they're looking at — purely local UI state, not part of the authored diagram.
const selectedPositionId = ref<string | null>(null)

function selectPosition(id: string) {
  selectedPositionId.value = selectedPositionId.value === id ? null : id
}

const dragFromIndex = ref<number | null>(null)

function onDragStart(index: number) {
  dragFromIndex.value = index
}

function onDrop(index: number) {
  if (dragFromIndex.value !== null && dragFromIndex.value !== index) emit('reorder', dragFromIndex.value, index)
  dragFromIndex.value = null
}
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <!-- sticky + top-16 keeps the board in view under the AppBar (h-16, z-20) while the
         position list below scrolls — otherwise a long list pushes the fretboard itself
         off-screen while editing. -->
    <div class="sticky top-16 z-10 overflow-x-auto rounded-md bg-surface-raised" data-test="fretboard-scroll">
      <!-- w-full lets the board fill however much space it's given (the "leverage full width"
           requirement); min-w-[1106px] is a legibility floor — the default 0-24 fret range at
           EDITOR_PX_PER_FRET density (44 + 43*24 + 30, see frettedFretboardEditor.ts, guarded by
           a test there) — so on a narrower viewport it scrolls instead of squeezing frets thin. -->
      <svg
        :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
        role="img"
        :aria-label="t('frettedDiagramEditor.fretboardAriaLabel')"
        class="w-full min-w-[1106px] cursor-pointer"
        font-family="monospace"
        @click="onFretboardClick"
      >
        <defs>
          <linearGradient id="editor-fretboard-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgb(var(--color-fretboard-wood))" stop-opacity="0.55" />
            <stop offset="50%" stop-color="rgb(var(--color-fretboard-wood))" stop-opacity="1" />
            <stop offset="100%" stop-color="rgb(var(--color-fretboard-wood))" stop-opacity="0.7" />
          </linearGradient>
        </defs>

        <g :transform="`translate(0 ${boardOffsetY})`">
          <rect
            :x="EDITOR_MARGIN_LEFT"
            :y="EDITOR_MARGIN_TOP - 10"
            :width="boardWidth"
            :height="EDITOR_BOARD_H + 20"
            rx="6"
            fill="url(#editor-fretboard-wood)"
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

          <g v-for="region in drawableRegions" :key="`region-${region.id}`">
            <rect
              data-test="editor-region"
              v-bind="regionBox(region)"
              rx="4"
              fill-opacity="0.25"
              :class="region.color ? '' : 'fill-accent'"
              :style="regionStyle(region)"
            />
            <text
              data-test="editor-region-caption"
              :x="regionBox(region).x + 4"
              :y="regionBox(region).y - 5"
              font-size="12"
              font-weight="600"
              class="fill-ink-muted"
            >
              {{ region.description[editingLanguage] ?? '' }}
            </text>
          </g>

          <line
            v-for="stringNumber in geometry.stringCount"
            :key="`string-${stringNumber}`"
            :x1="EDITOR_MARGIN_LEFT"
            :y1="y(stringNumber)"
            :x2="EDITOR_MARGIN_LEFT + boardWidth"
            :y2="y(stringNumber)"
            class="stroke-border"
            stroke-width="1.2"
          />

          <g v-for="fret in frets" :key="`fret-${fret}`">
            <line
              :x1="x(fret)"
              :y1="EDITOR_MARGIN_TOP - 6"
              :x2="x(fret)"
              :y2="EDITOR_MARGIN_TOP + EDITOR_BOARD_H + 6"
              class="stroke-ink-subtle"
              stroke-width="2"
            />
            <text
              :x="x(fret)"
              :y="EDITOR_MARGIN_TOP + EDITOR_BOARD_H + 24"
              text-anchor="middle"
              font-size="12"
              class="fill-ink-muted"
            >
              {{ fret }}
            </text>
          </g>

          <g
            v-for="marker in markers"
            :key="marker.key"
            :data-test="marker.overlay ? 'editor-overlay-position' : 'editor-position'"
            :class="marker.overlay ? 'pointer-events-none' : ''"
            :opacity="marker.overlay ? 0.8 : undefined"
          >
            <circle
              v-if="!marker.overlay && marker.position.id === selectedPositionId"
              data-test="marker-highlight"
              :cx="markerX(marker.position.fret)"
              :cy="y(marker.position.string)"
              r="18"
              fill="none"
              class="stroke-accent"
              stroke-width="3"
            />
            <circle
              v-if="marker.position.shape === 'dot'"
              :cx="markerX(marker.position.fret)"
              :cy="y(marker.position.string)"
              r="13.5"
              :class="markerFill(marker) ? '' : 'fill-accent'"
              :style="markerStyle(marker)"
            />
            <rect
              v-else-if="marker.position.shape === 'square'"
              :x="markerX(marker.position.fret) - 12"
              :y="y(marker.position.string) - 12"
              width="24"
              height="24"
              rx="3"
              :class="markerFill(marker) ? '' : 'fill-accent'"
              :style="markerStyle(marker)"
            />
            <polygon
              v-else
              :points="starPolygonPoints(markerX(marker.position.fret), y(marker.position.string), 15, 6.5)"
              :class="markerFill(marker) ? '' : 'fill-accent'"
              :style="markerStyle(marker)"
            />
            <text
              v-if="labelMode !== 'hidden'"
              :x="markerX(marker.position.fret)"
              :y="y(marker.position.string) + 4.5"
              text-anchor="middle"
              font-size="11.5"
              font-weight="600"
              :class="markerFill(marker) ? '' : 'fill-accent-fg'"
              :style="labelStyle(marker)"
            >
              {{ labelFor(marker.position) }}
            </text>
          </g>
        </g>
      </svg>
    </div>

    <p class="text-xs text-ink-subtle">{{ t('frettedDiagramEditor.reorderHint') }}</p>
    <div class="flex flex-col gap-2">
      <div
        v-for="(position, index) in props.positions"
        :key="position.id"
        data-test="position-controls"
        draggable="true"
        role="button"
        tabindex="0"
        :aria-pressed="position.id === selectedPositionId"
        class="flex flex-wrap items-center gap-2.5 rounded-md border p-2.5"
        :class="position.id === selectedPositionId ? 'border-accent bg-accent-muted' : 'border-border bg-surface-raised'"
        @click="selectPosition(position.id)"
        @keydown.enter="selectPosition(position.id)"
        @keydown.space.prevent="selectPosition(position.id)"
        @dragstart="onDragStart(index)"
        @dragover.prevent
        @drop="onDrop(index)"
      >
        <GripVertical :size="14" class="cursor-grab text-ink-subtle" aria-hidden="true" />
        <span
          data-test="position-sequence-badge"
          class="flex h-5 w-5 items-center justify-center rounded-full bg-surface-sunken text-[0.6875rem] font-semibold text-ink-muted"
        >
          {{ index + 1 }}
        </span>
        <span class="text-xs text-ink-subtle">{{ t('frettedDiagramEditor.stringFret', { string: position.string, fret: position.fret }) }}</span>
        <span
          data-test="position-interval-input"
          class="w-16 rounded border border-transparent bg-surface-sunken px-2 py-1 text-center text-sm text-ink-muted"
        >
          {{ intervalLabel(position.interval) || '—' }}
        </span>
        <span
          data-test="position-note-name-input"
          class="w-16 rounded border border-transparent bg-surface-sunken px-2 py-1 text-center text-sm text-ink-muted"
        >
          {{ position.noteName || '—' }}
        </span>
        <div class="flex gap-1 rounded-md bg-surface-sunken p-1" @click.stop @keydown.stop>
          <button
            v-for="shape in SHAPES"
            :key="shape"
            type="button"
            data-test="position-shape-option"
            :aria-label="t('frettedDiagramEditor.shapeAriaLabel', { shape })"
            :aria-pressed="position.shape === shape"
            class="flex h-6 w-6 items-center justify-center rounded-sm"
            :class="position.shape === shape ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
            @click="emit('set-shape', position.id, shape)"
          >
            <component :is="SHAPE_ICONS[shape]" :size="13" aria-hidden="true" />
          </button>
        </div>
        <div class="rounded-md bg-surface-sunken" @click.stop @keydown.stop>
          <ColorPaletteMenu
            test-id="position-color"
            :title="t('frettedDiagramEditor.positionColor')"
            :model-value="position.color"
            @select="(color) => emit('set-color', position.id, color)"
          >
            <Palette :size="13" aria-hidden="true" />
          </ColorPaletteMenu>
        </div>
        <div class="flex w-full gap-2" @click.stop @keydown.stop>
          <input
            :value="position.customLabel[editingLanguage] ?? ''"
            type="text"
            maxlength="2"
            data-test="position-custom-label"
            :aria-label="t('frettedDiagramEditor.customLabelAriaLabel')"
            :placeholder="t('frettedDiagramEditor.customLabelPlaceholder')"
            class="w-16 rounded border border-border bg-surface px-2 py-1 text-center text-sm text-ink"
            @input="emit('set-custom-label', position.id, inputValue($event))"
          />
          <input
            :value="position.note[editingLanguage] ?? ''"
            type="text"
            maxlength="280"
            data-test="position-note"
            :aria-label="t('frettedDiagramEditor.noteAriaLabel')"
            :placeholder="t('frettedDiagramEditor.notePlaceholder')"
            class="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-sm text-ink"
            @input="emit('set-note', position.id, inputValue($event))"
          />
        </div>
        <button
          type="button"
          data-test="position-remove"
          :aria-label="t('frettedDiagramEditor.removePositionAriaLabel')"
          class="ml-auto flex h-[26px] w-[26px] items-center justify-center rounded-sm text-ink-subtle"
          @click.stop="emit('remove', position.id)"
        >
          <X :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
