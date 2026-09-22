<script setup lang="ts">
/**
 * Click-to-place position editor for a `fretted`-family `Instrument`
 * (guitar, bass). Shows the whole playable neck (not the read-only viewer's
 * auto-cropped window) so a teacher can place a position anywhere on it.
 * Owns no state itself — every change is emitted for a parent form
 * composable (`useDiagramForm`) to apply, the same split `ImageRegionEditor`
 * already uses for its own click-to-place editor.
 */
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useTypedT } from '@/shared/composables/useTypedT'

import type { LocalPosition } from '@/features/teacher/composables/useDiagramForm'
import type { components } from '@/api/generated/core-domain'
import {
  EDITOR_BOARD_H,
  EDITOR_BOARD_W,
  EDITOR_MARGIN_LEFT,
  EDITOR_MARGIN_TOP,
  EDITOR_VIEW_H,
  EDITOR_VIEW_W,
  fretX,
  frettedEditorGeometry,
  nearestFrettedCell,
  stringY,
} from '@/shared/utils/frettedFretboardEditor'

type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  instrument: Instrument
  positions: LocalPosition[]
}>()

const emit = defineEmits<{
  'toggle-cell': [cell: { string: number; fret: number }]
  'edit-interval': [id: string, interval: string]
  'edit-note-name': [id: string, noteName: string]
  'set-sequence-index': [id: string, sequenceIndex: number | null]
  remove: [id: string]
}>()

const { t } = useTypedT()

const geometry = computed(() => frettedEditorGeometry(props.instrument.string_count ?? 0))

const frets = computed(() => {
  const result: number[] = []
  for (let fret = geometry.value.minFret; fret <= geometry.value.maxFret; fret++) result.push(fret)
  return result
})

function x(fret: number): number {
  return fretX(fret, geometry.value)
}

function y(stringNumber: number): number {
  return stringY(stringNumber, geometry.value)
}

function onFretboardClick(event: MouseEvent) {
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return

  const px = ((event.clientX - rect.left) / rect.width) * EDITOR_VIEW_W
  const py = ((event.clientY - rect.top) / rect.height) * EDITOR_VIEW_H
  const cell = nearestFrettedCell(px, py, geometry.value)
  if (cell) emit('toggle-cell', cell)
}

function onSequenceInput(id: string, value: string) {
  emit('set-sequence-index', id, value === '' ? null : Number(value))
}
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <svg
      :viewBox="`0 0 ${EDITOR_VIEW_W} ${EDITOR_VIEW_H}`"
      role="img"
      :aria-label="t('frettedDiagramEditor.fretboardAriaLabel')"
      class="w-full cursor-crosshair"
      font-family="monospace"
      @click="onFretboardClick"
    >
      <rect
        :x="EDITOR_MARGIN_LEFT"
        :y="EDITOR_MARGIN_TOP - 10"
        :width="EDITOR_BOARD_W"
        :height="EDITOR_BOARD_H + 20"
        rx="6"
        class="fill-surface-sunken"
      />

      <line
        v-for="stringNumber in geometry.stringCount"
        :key="`string-${stringNumber}`"
        :x1="EDITOR_MARGIN_LEFT"
        :y1="y(stringNumber)"
        :x2="EDITOR_MARGIN_LEFT + EDITOR_BOARD_W"
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
        v-for="position in props.positions"
        :key="position.id"
        data-test="editor-position"
        class="fill-accent"
      >
        <circle :cx="x(position.fret)" :cy="y(position.string)" r="13.5" fill="currentColor" />
        <text
          :x="x(position.fret)"
          :y="y(position.string) + 4.5"
          text-anchor="middle"
          font-size="11.5"
          font-weight="600"
          class="fill-accent-fg"
          fill="currentColor"
        >
          {{ position.interval }}
        </text>
      </g>
    </svg>

    <div class="flex flex-col gap-2">
      <div
        v-for="position in props.positions"
        :key="position.id"
        data-test="position-controls"
        class="flex flex-wrap items-center gap-2.5 rounded-md border border-border bg-surface-raised p-2.5"
      >
        <span class="text-xs text-ink-subtle">{{ t('frettedDiagramEditor.stringFret', { string: position.string, fret: position.fret }) }}</span>
        <input
          data-test="position-interval-input"
          type="text"
          :value="position.interval"
          :placeholder="t('frettedDiagramEditor.intervalPlaceholder')"
          class="w-16 rounded border border-border bg-surface px-2 py-1 text-sm"
          @input="emit('edit-interval', position.id, ($event.target as HTMLInputElement).value)"
        />
        <input
          data-test="position-note-name-input"
          type="text"
          :value="position.noteName"
          :placeholder="t('frettedDiagramEditor.noteNamePlaceholder')"
          class="w-16 rounded border border-border bg-surface px-2 py-1 text-sm"
          @input="emit('edit-note-name', position.id, ($event.target as HTMLInputElement).value)"
        />
        <input
          data-test="position-sequence-input"
          type="number"
          min="0"
          :value="position.sequenceIndex ?? ''"
          :placeholder="t('frettedDiagramEditor.sequencePlaceholder')"
          class="w-20 rounded border border-border bg-surface px-2 py-1 text-sm"
          @input="onSequenceInput(position.id, ($event.target as HTMLInputElement).value)"
        />
        <button
          type="button"
          data-test="position-remove"
          :aria-label="t('frettedDiagramEditor.removePositionAriaLabel')"
          class="ml-auto flex h-[26px] w-[26px] items-center justify-center rounded-sm text-ink-subtle"
          @click="emit('remove', position.id)"
        >
          <X :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
