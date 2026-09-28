<script setup lang="ts">
/**
 * Chooses a prebuilt diagram to embed — inline in rich text or as a cue — and
 * how it shows: interval labels on or off, and which of its intervals appear.
 * A live preview draws it exactly as a student will see it.
 *
 * Reports the ref to embed on every change, or null while there's nothing a
 * student could be shown (no diagram yet, every interval unchecked, or a
 * diagram the student view can't draw). Buttons belong to the caller.
 */
import { computed, ref, watch } from 'vue'

import DiagramPickerList from '@/features/teacher/components/DiagramPickerList.vue'
import { useDiagram } from '@/features/teacher/composables/useDiagram'
import { useDiagramEmbedDraft } from '@/features/teacher/composables/useDiagramEmbedDraft'
import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { EmbeddedDiagramStatus } from '@/shared/composables/useEmbeddedDiagram'
import { intervalLabelKey } from '@/shared/utils/intervalLabels'
import type { IntervalCode } from '@/shared/utils/intervalLabels'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']

const props = defineProps<{
  /** The ref already embedded, reopened for editing; null to embed a new one. */
  initial: DiagramRef | null
}>()
const emit = defineEmits<{ change: [diagramRef: DiagramRef | null] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const draft = useDiagramEmbedDraft(props.initial)
const step = ref<'list' | 'initial' | 'configure'>(props.initial ? 'initial' : 'list')
// Only a settled preview counts: toggling an interval redraws the preview,
// and its brief reload mustn't flicker what's reported.
const previewStatus = ref<EmbeddedDiagramStatus>('loading')

const initialLoad = props.initial ? useDiagram(props.initial.diagram_id) : null
if (initialLoad) {
  watch(initialLoad.diagram, (loaded) => {
    if (loaded && step.value === 'initial') choose(loaded)
  })
}

function choose(diagram: Diagram) {
  previewStatus.value = 'loading'
  draft.select(diagram)
  step.value = 'configure'
}

function changeDiagram() {
  step.value = 'list'
}

function onPreviewStatus(status: EmbeddedDiagramStatus) {
  if (status !== 'loading') previewStatus.value = status
}

const draftRef = computed(() => (step.value === 'configure' ? draft.toRef() : null))
const reported = computed(() => (previewStatus.value === 'ready' ? draftRef.value : null))

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

      <label class="flex items-center gap-2 text-sm">
        <input
          data-test="embed-picker-labels"
          type="checkbox"
          :checked="draft.showLabels.value"
          @change="draft.toggleLabels()"
        />
        {{ t('diagramEmbedPicker.showLabels') }}
      </label>

      <fieldset class="flex flex-col gap-1.5">
        <legend class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.intervalsLegend') }}</legend>
        <div class="flex flex-wrap gap-x-3 gap-y-1.5">
          <label
            v-for="code in draft.availableIntervals.value"
            :key="code"
            data-test="embed-picker-interval"
            class="flex items-center gap-1.5 text-sm"
          >
            <input
              type="checkbox"
              :checked="draft.selectedIntervals.value.includes(code)"
              @change="draft.toggleInterval(code)"
            />
            {{ intervalLabel(code) }}
          </label>
        </div>
      </fieldset>

      <p v-if="!draftRef" data-test="embed-picker-no-intervals" class="text-sm text-danger">
        {{ t('diagramEmbedPicker.noIntervals') }}
      </p>
      <div v-else data-test="embed-picker-preview" class="rounded-md border border-border bg-surface p-3">
        <EmbeddedDiagram :embed="{ kind: 'single', ref: draftRef }" @status="onPreviewStatus">
          <template #unavailable>
            <p data-test="embed-picker-unavailable" class="text-sm text-ink-muted">
              {{ t('diagramEmbedPicker.unavailable') }}
            </p>
          </template>
        </EmbeddedDiagram>
      </div>
    </div>
  </div>
</template>
