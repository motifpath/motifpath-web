<script setup lang="ts">
/**
 * Chooses a prebuilt diagram to embed — inline in rich text, as a cue, or as
 * an exercise stimulus — and how it shows: what its markers read (label
 * mode) and which positions are hidden, one by one in the preview or an
 * interval at a time. The preview draws it as a student will see it, with
 * hidden positions faded so they can be shown again. As a stimulus
 * (`answers`), clicking positions also marks the correct ones.
 *
 * Reports the ref to embed on every change, or null while there's nothing a
 * student could be shown (no diagram yet, nothing drawn, no correct answer,
 * or a diagram the student view can't draw). Buttons belong to the caller.
 */
import { computed, ref, watch } from 'vue'

import DiagramPickerList from '@/features/teacher/components/DiagramPickerList.vue'
import { useDiagram } from '@/features/teacher/composables/useDiagram'
import { useDiagramEmbedDraft } from '@/features/teacher/composables/useDiagramEmbedDraft'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { DiagramLabelMode } from '@/shared/utils/diagramLabels'
import { intervalLabelKey } from '@/shared/utils/intervalLabels'
import type { IntervalCode } from '@/shared/utils/intervalLabels'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']

const props = withDefaults(
  defineProps<{
    /** The ref already embedded, reopened for editing; null to embed a new one. */
    initial: DiagramRef | null
    /** An exercise stimulus: also mark which positions are the correct answers. */
    answers?: boolean
  }>(),
  { answers: false },
)
const emit = defineEmits<{ change: [diagramRef: DiagramRef | null] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const draft = useDiagramEmbedDraft(props.initial, { answers: props.answers })
const step = ref<'list' | 'initial' | 'configure'>(props.initial ? 'initial' : 'list')
const { instruments } = useListInstruments()
// What a click on a preview marker does; a stimulus starts on its answers.
const tool = ref<'visibility' | 'correct'>(props.answers ? 'correct' : 'visibility')

const LABEL_MODES: DiagramLabelMode[] = ['interval', 'note', 'custom', 'none']

const initialLoad = props.initial ? useDiagram(props.initial.diagram_id) : null
if (initialLoad) {
  watch(initialLoad.diagram, (loaded) => {
    if (loaded && step.value === 'initial') choose(loaded)
  })
}

function choose(diagram: Diagram) {
  draft.select(diagram)
  step.value = 'configure'
}

function changeDiagram() {
  step.value = 'list'
}

// Only a fretted diagram can be drawn for a student yet.
const instrument = computed(() => {
  const found = instruments.value.find((i) => i.instrument_id === draft.diagram.value?.instrument_id)
  return found?.family === 'fretted' ? found : null
})
const inConfigure = computed(() => step.value === 'configure')
const previewRef = computed(() => (inConfigure.value ? draft.toPreviewRef() : null))
const reported = computed(() => (inConfigure.value && instrument.value ? draft.toRef() : null))
const allPositionIds = computed(() => draft.diagram.value?.positions.map((p) => p.position_id ?? '') ?? [])
const nothingShown = computed(() => !props.answers && draft.hiddenPositionIds.value.length === allPositionIds.value.length)

function onPositionClick(positionId: string) {
  if (tool.value === 'correct') draft.togglePositionCorrect(positionId)
  else draft.togglePosition(positionId)
}

function onLabelChange(event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) return
  const value = event.target.value
  const mode = LABEL_MODES.find((m) => m === value)
  if (mode) draft.setLabel(mode)
}

watch(
  () => JSON.stringify(reported.value),
  () => emit('change', reported.value),
  { immediate: true },
)

function intervalLabel(code: IntervalCode): string {
  const key = intervalLabelKey(code)
  return key ? t(key) : code
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <template v-if="step === 'initial' && initialLoad">
      <StateLoading v-if="initialLoad.isLoading.value" :noun="t('diagramEmbedPicker.loadingNoun')" />
      <div v-else-if="initialLoad.error.value" class="flex flex-col gap-2">
        <StateError
          data-test="embed-picker-load-error"
          :message="t('diagramEmbedPicker.loadErrorMessage')"
          @retry="initialLoad.retry"
        />
        <button
          type="button"
          data-test="embed-picker-choose-another"
          class="w-fit text-sm font-semibold text-accent-text"
          @click="changeDiagram"
        >
          {{ t('diagramEmbedPicker.chooseAnother') }}
        </button>
      </div>
    </template>

    <DiagramPickerList v-else-if="step === 'list'" @select="choose" />

    <div v-else-if="step === 'configure' && draft.diagram.value" data-test="embed-picker-config" class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <span data-test="embed-picker-name" class="font-semibold text-ink">{{
          localizedName(draft.diagram.value.names)
        }}</span>
        <button
          type="button"
          data-test="embed-picker-change"
          class="text-sm font-semibold text-accent-text"
          @click="changeDiagram"
        >
          {{ t('diagramEmbedPicker.changeDiagram') }}
        </button>
      </div>

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

      <p v-if="answers && draft.correctPositionIds.value.length === 0" data-test="embed-picker-no-correct" class="text-sm text-danger">
        {{ t('diagramEmbedPicker.noCorrect') }}
      </p>
      <p v-if="nothingShown" data-test="embed-picker-nothing-shown" class="text-sm text-danger">
        {{ t('diagramEmbedPicker.nothingShown') }}
      </p>

      <div data-test="embed-picker-preview" class="rounded-md border border-border bg-surface p-3">
        <FrettedDiagramView
          v-if="instrument && previewRef"
          :diagram="draft.diagram.value"
          :instrument="instrument"
          :diagram-ref="previewRef"
          :label-mode="draft.diagram.value.label_display"
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
  </div>
</template>
