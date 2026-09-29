<script setup lang="ts">
/**
 * Click-to-place position editor for a `fretted`-family `Instrument`
 * (guitar, bass). Shows the whole playable neck (not the read-only viewer's
 * auto-cropped window) so a teacher can place a position anywhere on it,
 * drawn with the student's board, spacing and marker shapes, so the author
 * sees what a student will.
 * Owns no state itself — every change is emitted for a parent form
 * composable (`useDiagramForm`) to apply, the same split `ImageRegionEditor`
 * already uses for its own click-to-place editor.
 *
 * While `recording`, a click on a placed marker picks it for the diagram's
 * sequence instead of removing it, and empty cells do nothing.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Circle, GripVertical, Palette, Square, Star, X } from 'lucide-vue-next'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useIntervalLabel } from '@/shared/composables/useIntervalLabel'
import { useScopedLocale } from '@/shared/composables/useScopedLocale'
import { toApiLanguageCode } from '@/i18n'

import type { LocalPosition, LocalRegion, PositionShape } from '@/features/teacher/composables/useDiagramForm'
import type { components } from '@/api/generated/core-domain'
import ColorPaletteMenu from '@/shared/components/ColorPaletteMenu.vue'
import { readableTextColor, resolveMarkerColor } from '@/shared/utils/diagramColors'
import {
  DEFAULT_MAX_FRET,
  DEFAULT_MIN_FRET,
  editorRegionBox,
  frettedEditorLayout,
  isDrawableRegion,
  nearestFrettedCell,
} from '@/shared/utils/frettedFretboardEditor'
import {
  MARKER_RADIUS,
  MARKER_TEXT_SIZE,
  TARGET_RADIUS,
  markerCenterX,
  stringLineY,
} from '@/shared/utils/fretboardGeometry'
import { insetOverlappingOutlines } from '@/shared/utils/regionInfoLayout'
import FretboardBoard from '@/shared/components/diagram/FretboardBoard.vue'
import FretboardMarkerShape from '@/shared/components/diagram/FretboardMarkerShape.vue'
import RegionInfoRail from '@/shared/components/diagram/RegionInfoRail.vue'
import type { RailRegion } from '@/shared/components/diagram/RegionInfoRail.vue'

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
    /** Clicks pick placed markers for the sequence rather than placing or removing positions. */
    recording?: boolean
    /** The positions of the selected sequence step, ringed on the board. */
    sequenceHighlightIds?: string[]
  }>(),
  { labelMode: 'interval', regions: () => [], recording: false, sequenceHighlightIds: () => [] },
)

const emit = defineEmits<{
  'toggle-cell': [cell: { string: number; fret: number }]
  'pick-position': [id: string]
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

function markerFill(position: LocalPosition): string | null {
  return resolveMarkerColor(position.color, props.color)
}
function markerStyle(position: LocalPosition): { fill: string } | undefined {
  const fill = markerFill(position)
  return fill ? { fill } : undefined
}
function labelStyle(position: LocalPosition): { fill: string } | undefined {
  const fill = markerFill(position)
  return fill ? { fill: readableTextColor(fill) } : undefined
}

// The board fills its container when every fret space fits at a readable width, and grows wider
// (for the container to scroll) when they don't.
const scroller = ref<HTMLElement | null>(null)
const availableWidth = ref(0)
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  if (!scroller.value) return
  availableWidth.value = scroller.value.clientWidth
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(([entry]) => {
    if (entry) availableWidth.value = entry.contentRect.width
  })
  resizeObserver.observe(scroller.value)
})
onUnmounted(() => resizeObserver?.disconnect())

// Regions that can't be drawn yet (backwards, or past the last string) are left off the board;
// the regions editor below already flags them.
const drawableRegions = computed(() =>
  props.regions.filter((region) =>
    isDrawableRegion(region, {
      minFret: DEFAULT_MIN_FRET,
      maxFret: DEFAULT_MAX_FRET,
      stringCount: props.instrument.string_count ?? 0,
    }),
  ),
)
// Each drawn region offers its information control above the board, as a student's board does.
const showsRegionInfo = computed(() => drawableRegions.value.length > 0)

const board = computed(() =>
  frettedEditorLayout(props.instrument.string_count ?? 0, availableWidth.value, { underRail: showsRegionInfo.value }),
)
const frame = computed(() => board.value.frame)

function regionBox(region: LocalRegion) {
  return editorRegionBox(region, frame.value)
}
// Each outline follows its band, one step further inside when it overlaps an earlier band.
const regionOutlines = computed(() => insetOverlappingOutlines(drawableRegions.value.map(regionBox)))

// Region descriptions: one open at a time, in the language being edited. Tapping a band places a
// position, as anywhere on the board, so only its control opens the description.
const openRegionId = ref<string | null>(null)
const railRegions = computed<RailRegion[]>(() =>
  drawableRegions.value.map((region) => {
    const box = regionBox(region)
    return {
      id: region.id,
      right: box.x + box.width,
      color: region.color,
      label: region.description[editingLanguage.value] ?? '',
    }
  }),
)
// How far the board is scrolled, so an open description stays in its visible part.
const scrollLeft = ref(0)
function onBoardScroll(event: Event) {
  if (event.target instanceof HTMLElement) scrollLeft.value = event.target.scrollLeft
}

function regionStyle(region: LocalRegion): { fill: string } | undefined {
  return region.color ? { fill: region.color } : undefined
}

function markerX(fret: number): number {
  return markerCenterX(frame.value, fret)
}

function y(stringNumber: number): number {
  return stringLineY(frame.value, stringNumber)
}

function onFretboardClick(event: MouseEvent) {
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const px = ((event.clientX - rect.left) / rect.width) * board.value.width
  const py = ((event.clientY - rect.top) / rect.height) * board.value.height
  const cell = nearestFrettedCell(px, py, frame.value)
  if (!cell) return
  if (!props.recording) {
    emit('toggle-cell', cell)
    return
  }
  const picked = props.positions.find((p) => p.string === cell.string && p.fret === cell.fret)
  if (picked) emit('pick-position', picked.id)
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
    <!-- sticky + top-16 keeps the board and its toolbar in view under the AppBar (h-16, z-20)
         while the position list and any slotted content below scroll — otherwise a long list
         pushes the fretboard itself off-screen while editing. The opaque background hides what
         scrolls underneath. -->
    <div class="sticky top-16 z-10 flex flex-col gap-2 bg-surface py-2" data-test="fretboard-sticky">
      <slot name="toolbar" />
      <!-- Drawn at its real size, like a student's board, so markers and fret spaces stay
           readable and easy to hit; it scrolls on its own when wider than the screen. -->
      <div
        ref="scroller"
        class="overflow-x-auto overflow-y-hidden rounded-md bg-surface-raised"
        data-test="fretboard-scroll"
        data-region-scope
        @scroll="onBoardScroll"
      >
        <div class="relative" :style="{ width: `${board.width}px` }">
        <RegionInfoRail
          v-if="showsRegionInfo"
          v-model:open-id="openRegionId"
          :regions="railRegions"
          :width="board.width"
          :scroll-left="scrollLeft"
          :visible-width="availableWidth || board.width"
        />
        <svg
          data-test="editor-board"
          :viewBox="`0 0 ${board.width} ${board.height}`"
          :width="board.width"
          :height="board.height"
          role="img"
          :aria-label="t('frettedDiagramEditor.fretboardAriaLabel')"
          class="block max-w-none cursor-pointer"
          font-family="inherit"
          @click="onFretboardClick"
        >
          <FretboardBoard :frame="frame" :tuning="instrument.tuning">
            <template #fills>
              <rect
                v-for="region in drawableRegions"
                :key="`region-${region.id}`"
                data-test="editor-region"
                v-bind="regionBox(region)"
                rx="4"
                fill-opacity="0.24"
                :class="region.color ? '' : 'fill-accent'"
                :style="regionStyle(region)"
              />
            </template>
          </FretboardBoard>

          <rect
            v-for="(outline, index) in regionOutlines"
            :key="`outline-${drawableRegions[index]!.id}`"
            data-test="region-outline"
            v-bind="outline"
            rx="3"
            fill="none"
            stroke-width="2"
            pointer-events="none"
            :class="drawableRegions[index]!.color ? '' : 'stroke-accent'"
            :style="drawableRegions[index]!.color ? { stroke: drawableRegions[index]!.color } : undefined"
          />

          <g v-for="position in props.positions" :key="position.id" data-test="editor-position">
            <circle
              v-if="props.sequenceHighlightIds.includes(position.id)"
              data-test="sequence-highlight"
              :cx="markerX(position.fret)"
              :cy="y(position.string)"
              :r="TARGET_RADIUS + 2"
              fill="none"
              class="stroke-ink"
              stroke-width="2.5"
              stroke-dasharray="4 3"
            />
            <circle
              v-if="position.id === selectedPositionId"
              data-test="marker-highlight"
              :cx="markerX(position.fret)"
              :cy="y(position.string)"
              :r="MARKER_RADIUS + 2"
              fill="none"
              class="stroke-accent"
              stroke-width="3"
            />
            <FretboardMarkerShape
              :cx="markerX(position.fret)"
              :cy="y(position.string)"
              :shape="position.shape"
              :class="markerFill(position) ? '' : 'fill-accent'"
              :style="markerStyle(position)"
            />
            <text
              v-if="labelMode !== 'hidden'"
              :x="markerX(position.fret)"
              :y="y(position.string) + 5"
              text-anchor="middle"
              :font-size="MARKER_TEXT_SIZE"
              font-weight="700"
              :class="markerFill(position) ? '' : 'fill-accent-fg'"
              :style="labelStyle(position)"
            >
              {{ labelFor(position) }}
            </text>
          </g>
        </svg>
        </div>
      </div>
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
          data-test="position-number-badge"
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
    <!-- Content that belongs under the board, such as the regions editor, goes here: a sticky
         element only floats while its parent is on screen, so it must share this parent. -->
    <slot />
  </div>
</template>
