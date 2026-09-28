<script setup lang="ts">
/**
 * How one usage of a diagram shows: what its markers read (label mode) and
 * which positions are hidden, one by one on the diagram or an interval at a
 * time — drawn as a student will see it, with hidden positions faded so they
 * can be shown again. With `answers` (an exercise stimulus), a click can
 * also mark a position as a correct answer instead.
 *
 * Edits the draft it's given; the caller reads the ref from it.
 */
import { computed, ref } from 'vue'

import type { useDiagramEmbedDraft } from '@/features/teacher/composables/useDiagramEmbedDraft'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { DiagramLabelMode } from '@/shared/utils/diagramLabels'
import { intervalLabelKey } from '@/shared/utils/intervalLabels'
import type { IntervalCode } from '@/shared/utils/intervalLabels'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

const props = withDefaults(
  defineProps<{
    diagram: Diagram
    /** The diagram's instrument, when a student can be shown it (fretted); null otherwise. */
    instrument: Instrument | null
    draft: ReturnType<typeof useDiagramEmbedDraft>
    /** An exercise stimulus: clicking a position can also mark it correct. */
    answers?: boolean
  }>(),
  { answers: false },
)

const { t } = useTypedT()

const LABEL_MODES: DiagramLabelMode[] = ['interval', 'note', 'custom', 'none']

// What a click on a marker does; a stimulus starts on its answers.
const tool = ref<'visibility' | 'correct'>(props.answers ? 'correct' : 'visibility')

const allPositionIds = computed(() => props.diagram.positions.map((p) => p.position_id ?? ''))
const previewRef = computed(() => props.draft.toPreviewRef())

function onPositionClick(positionId: string) {
  if (tool.value === 'correct') props.draft.togglePositionCorrect(positionId)
  else props.draft.togglePosition(positionId)
}

function onLabelChange(event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) return
  const value = event.target.value
  const mode = LABEL_MODES.find((m) => m === value)
  if (mode) props.draft.setLabel(mode)
}

function intervalLabel(code: IntervalCode): string {
  const key = intervalLabelKey(code)
  return key ? t(key) : code
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-1">
        <label for="embed-picker-label" class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.labelLegend') }}</label>
        <select
          id="embed-picker-label"
          data-test="embed-picker-label"
          :value="draft.label.value"
          class="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          @change="onLabelChange"
        >
          <option v-for="mode in LABEL_MODES" :key="mode" :value="mode">{{ t(`diagramEmbedPicker.labelModes.${mode}`) }}</option>
        </select>
      </div>
      <div v-if="answers" class="flex flex-col gap-1">
        <span class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.toolLegend') }}</span>
        <div class="flex gap-1 rounded-md bg-surface-sunken p-[3px]" role="group" :aria-label="t('diagramEmbedPicker.toolLegend')">
          <button
            v-for="option in (['correct', 'visibility'] as const)"
            :key="option"
            type="button"
            :data-test="`embed-picker-tool-${option}`"
            :aria-pressed="tool === option"
            class="rounded-sm px-2.5 py-1 text-xs font-semibold"
            :class="tool === option ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
            @click="tool = option"
          >
            {{ option === 'correct' ? t('diagramEmbedPicker.toolCorrect') : t('diagramEmbedPicker.toolVisibility') }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.intervalsLegend') }}</span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="code in draft.availableIntervals.value"
          :key="code"
          type="button"
          data-test="embed-picker-interval"
          :aria-pressed="draft.intervalState(code) === 'shown' ? 'true' : draft.intervalState(code) === 'hidden' ? 'false' : 'mixed'"
          class="min-w-9 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
          :class="{
            'border-accent bg-accent text-accent-fg': draft.intervalState(code) === 'shown',
            'border-accent text-accent-text': draft.intervalState(code) === 'mixed',
            'border-border text-ink-subtle line-through': draft.intervalState(code) === 'hidden',
          }"
          @click="draft.toggleIntervalVisibility(code)"
        >
          {{ intervalLabel(code) }}
        </button>
      </div>
      <p class="text-xs text-ink-subtle">
        {{ answers && tool === 'correct' ? t('diagramEmbedPicker.clickToMarkCorrect') : t('diagramEmbedPicker.clickToHide') }}
      </p>
    </div>

    <slot name="warnings" />

    <div data-test="embed-picker-preview" class="rounded-md border border-border bg-surface p-3">
      <FrettedDiagramView
        v-if="instrument && previewRef"
        :diagram="diagram"
        :instrument="instrument"
        :diagram-ref="previewRef"
        :label-mode="diagram.label_display"
        reveal-hidden
        multiple
        :selectable-position-ids="allPositionIds"
        :selected-position-ids="answers && tool === 'correct' ? draft.correctPositionIds.value : []"
        @select="onPositionClick"
      />
      <p v-else data-test="embed-picker-unavailable" class="text-sm text-ink-muted">
        {{ t('diagramEmbedPicker.unavailable') }}
      </p>
    </div>
  </div>
</template>
