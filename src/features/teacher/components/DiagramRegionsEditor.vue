<script setup lang="ts">
/**
 * Edits a fretted diagram's highlighted regions: each one a band of frets,
 * optionally limited to some strings, with a caption in the language being
 * edited and an optional tint. Owns no state — every change is emitted for
 * the parent form composable (`useDiagramForm`) to apply, like
 * `FrettedDiagramEditor` does for positions.
 */
import { Palette, Plus, X } from 'lucide-vue-next'

import { REGION_CAPTION_MAX_LENGTH, type LocalRegion } from '@/features/teacher/composables/useDiagramForm'
import ColorPaletteMenu from '@/shared/components/ColorPaletteMenu.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  regions: LocalRegion[]
  /** The instrument's string count, the bound a limited region's strings start from. */
  stringCount: number
  /** The language code whose captions are shown and edited. */
  language: string
  /** Regions whose range runs backwards or past the instrument. */
  invalidIds: string[]
}>()

const emit = defineEmits<{
  add: []
  'set-frets': [id: string, fretStart: number, fretEnd: number]
  'set-strings': [id: string, stringStart: number | null, stringEnd: number | null]
  'set-description': [id: string, value: string]
  'set-color': [id: string, color: string | null]
  remove: [id: string]
}>()

const { t } = useTypedT()

/** The whole number typed into a numeric input, or null while it holds none. */
function typedNumber(event: Event): number | null {
  if (!(event.target instanceof HTMLInputElement) || event.target.value.trim() === '') return null
  const value = Number(event.target.value)
  return Number.isInteger(value) ? value : null
}

function typedText(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : ''
}

// A merged caption can arrive longer than the input would let anyone type.
function captionTooLong(region: LocalRegion): boolean {
  return (region.description[props.language] ?? '').trim().length > REGION_CAPTION_MAX_LENGTH
}

function onFretStart(region: LocalRegion, event: Event) {
  const value = typedNumber(event)
  if (value !== null) emit('set-frets', region.id, value, region.fretEnd)
}

function onFretEnd(region: LocalRegion, event: Event) {
  const value = typedNumber(event)
  if (value !== null) emit('set-frets', region.id, region.fretStart, value)
}

function onStringStart(region: LocalRegion, event: Event) {
  const value = typedNumber(event)
  if (value !== null) emit('set-strings', region.id, value, region.stringEnd)
}

function onStringEnd(region: LocalRegion, event: Event) {
  const value = typedNumber(event)
  if (value !== null) emit('set-strings', region.id, region.stringStart, value)
}

function coversEveryString(region: LocalRegion): boolean {
  return region.stringStart === null && region.stringEnd === null
}

/** Checked covers every string; unchecking starts from the full string range to narrow down. */
function onAllStrings(region: LocalRegion, event: Event) {
  const all = event.target instanceof HTMLInputElement && event.target.checked
  if (all) emit('set-strings', region.id, null, null)
  else emit('set-strings', region.id, 1, Math.max(props.stringCount, 1))
}

const numberInputClass =
  'w-16 rounded border border-border bg-surface px-2 py-1 text-center text-sm text-ink'
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <div>
        <span class="text-sm font-semibold">{{ t('diagramRegionsEditor.title') }}</span>
        <span class="block text-xs text-ink-subtle">{{ t('diagramRegionsEditor.hint') }}</span>
      </div>
      <button
        type="button"
        data-test="region-add"
        class="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-ink-muted"
        @click="emit('add')"
      >
        <Plus :size="14" aria-hidden="true" />
        {{ t('diagramRegionsEditor.add') }}
      </button>
    </div>

    <div
      v-for="(region, index) in regions"
      :key="region.id"
      data-test="region-row"
      class="flex flex-col gap-2 rounded-md border p-2.5"
      :class="invalidIds.includes(region.id) ? 'border-danger' : 'border-border bg-surface-raised'"
    >
      <div class="flex flex-wrap items-center gap-2.5">
        <span
          class="flex h-5 w-5 items-center justify-center rounded-full bg-surface-sunken text-[0.6875rem] font-semibold text-ink-muted"
        >
          {{ index + 1 }}
        </span>
        <label class="flex items-center gap-1.5 text-xs text-ink-muted">
          {{ t('diagramRegionsEditor.fretsLabel') }}
          <input
            :value="region.fretStart"
            type="number"
            min="0"
            data-test="region-fret-start"
            :aria-label="t('diagramRegionsEditor.fretStartAriaLabel')"
            :class="numberInputClass"
            @input="onFretStart(region, $event)"
          />
          {{ t('diagramRegionsEditor.rangeTo') }}
          <input
            :value="region.fretEnd"
            type="number"
            min="0"
            data-test="region-fret-end"
            :aria-label="t('diagramRegionsEditor.fretEndAriaLabel')"
            :class="numberInputClass"
            @input="onFretEnd(region, $event)"
          />
        </label>
        <label class="flex items-center gap-1.5 text-xs text-ink-muted">
          <input
            :checked="coversEveryString(region)"
            type="checkbox"
            data-test="region-all-strings"
            @change="onAllStrings(region, $event)"
          />
          {{ t('diagramRegionsEditor.allStrings') }}
        </label>
        <label
          v-if="!coversEveryString(region)"
          class="flex items-center gap-1.5 text-xs text-ink-muted"
        >
          {{ t('diagramRegionsEditor.stringsLabel') }}
          <input
            :value="region.stringStart ?? ''"
            type="number"
            min="1"
            :max="stringCount"
            data-test="region-string-start"
            :aria-label="t('diagramRegionsEditor.stringStartAriaLabel')"
            :class="numberInputClass"
            @input="onStringStart(region, $event)"
          />
          {{ t('diagramRegionsEditor.rangeTo') }}
          <input
            :value="region.stringEnd ?? ''"
            type="number"
            min="1"
            :max="stringCount"
            data-test="region-string-end"
            :aria-label="t('diagramRegionsEditor.stringEndAriaLabel')"
            :class="numberInputClass"
            @input="onStringEnd(region, $event)"
          />
        </label>
        <div class="ml-auto flex items-center gap-1">
          <div class="rounded-md bg-surface-sunken">
            <ColorPaletteMenu
              test-id="region-color"
              :title="t('diagramRegionsEditor.colorTitle')"
              :model-value="region.color"
              @select="(color) => emit('set-color', region.id, color)"
            >
              <Palette :size="13" aria-hidden="true" />
            </ColorPaletteMenu>
          </div>
          <button
            type="button"
            data-test="region-remove"
            :aria-label="t('diagramRegionsEditor.removeAriaLabel')"
            class="flex h-[26px] w-[26px] items-center justify-center rounded-sm text-ink-subtle"
            @click="emit('remove', region.id)"
          >
            <X :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>
      <input
        :value="region.description[language] ?? ''"
        type="text"
        :maxlength="REGION_CAPTION_MAX_LENGTH"
        data-test="region-description"
        :aria-label="t('diagramRegionsEditor.descriptionAriaLabel')"
        :placeholder="t('diagramRegionsEditor.descriptionPlaceholder')"
        class="rounded border bg-surface px-2 py-1 text-sm text-ink"
        :class="captionTooLong(region) ? 'border-danger' : 'border-border'"
        @input="emit('set-description', region.id, typedText($event))"
      />
      <p v-if="captionTooLong(region)" data-test="region-caption-too-long" class="text-xs text-danger">
        {{ t('diagramRegionsEditor.captionTooLong', { max: REGION_CAPTION_MAX_LENGTH }) }}
      </p>
      <p v-if="invalidIds.includes(region.id)" data-test="region-invalid" class="text-xs text-danger">
        {{ t('diagramRegionsEditor.invalid') }}
      </p>
    </div>
  </div>
</template>
