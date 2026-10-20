<script setup lang="ts">
/**
 * The tools over a diagram's board: overlays, the full preview, the general color and what the
 * markers are labelled with. Placed inside the editor's `LocaleScope`, it speaks the editing language.
 */
import { Layers, Maximize2, Palette } from 'lucide-vue-next'

import type { LabelDisplay } from '@/features/teacher/composables/useDiagramForm'
import ColorPaletteMenu from '@/shared/components/ColorPaletteMenu.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  labelDisplay: LabelDisplay
  color: string | null
  canClearColor: boolean
  colorHint: string
  canPreview: boolean
  /** Stacking other diagrams adds positions, so it waits for a screen that can place them. */
  canOverlay: boolean
}>()

const emit = defineEmits<{
  overlay: []
  preview: []
  'update:color': [color: string | null]
  'update:labelDisplay': [mode: LabelDisplay]
}>()

const { t } = useTypedT()

const labelModes: { mode: LabelDisplay; key: 'labelModeInterval' | 'labelModeNote' | 'labelModeHidden' }[] = [
  { mode: 'interval', key: 'labelModeInterval' },
  { mode: 'note', key: 'labelModeNote' },
  { mode: 'hidden', key: 'labelModeHidden' },
]
</script>

<template>
  <!-- Wraps on a narrow screen: a row wider than the screen would widen the whole page. -->
  <div class="flex flex-wrap items-center justify-between gap-2">
    <label class="text-sm font-semibold">{{ t('diagramAuthoringView.positionsLabel') }}</label>
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-if="props.canOverlay"
        type="button"
        data-test="add-overlay"
        class="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-3 py-1 text-xs font-semibold text-ink-muted"
        @click="emit('overlay')"
      >
        <Layers :size="14" aria-hidden="true" />
        {{ t('diagramAuthoringView.addOverlayButton') }}
      </button>
      <button
        type="button"
        data-test="open-preview-modal"
        class="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-3 py-1 text-xs font-semibold text-ink-muted disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!props.canPreview"
        :title="props.canPreview ? undefined : t('diagramAuthoringView.previewEmpty')"
        @click="emit('preview')"
      >
        <Maximize2 :size="14" aria-hidden="true" />
        {{ t('diagramAuthoringView.viewPreviewButton') }}
      </button>
      <ColorPaletteMenu
        test-id="diagram-color"
        :title="t('diagramAuthoringView.colorLabel')"
        :model-value="props.color"
        :allow-clear="props.canClearColor"
        :hint="props.colorHint"
        @select="(color) => emit('update:color', color)"
      >
        <Palette :size="16" aria-hidden="true" />
      </ColorPaletteMenu>
      <div class="flex w-fit gap-1 rounded-lg bg-surface-sunken p-1">
        <button
          v-for="{ mode, key } in labelModes"
          :key="mode"
          type="button"
          :data-test="`label-mode-${mode}`"
          class="rounded-md px-3 py-1 text-xs font-semibold"
          :class="props.labelDisplay === mode ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="emit('update:labelDisplay', mode)"
        >
          {{ t(`diagramAuthoringView.${key}`) }}
        </button>
      </div>
    </div>
  </div>
</template>
