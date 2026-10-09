<script setup lang="ts">
/**
 * Chooses a prebuilt diagram to embed — inline in rich text, as a cue, or as
 * an exercise stimulus — from the diagram library or, as a chord's voicing,
 * from the chord catalog — and how it shows: what its markers read (label
 * mode) and which positions are hidden, one by one in the preview or an
 * interval at a time. The preview draws it as a student will see it, with
 * hidden positions faded so they can be shown again. An exercise stimulus's
 * answers are marked in the exercise form, not here.
 *
 * Reports the ref to embed on every change, or null while there's nothing a
 * student could be shown (no diagram yet, nothing drawn, or a diagram the
 * student view can't draw). Buttons belong to the caller.
 */
import { computed, ref, watch } from 'vue'

import ChordVoicingPickerList from '@/features/teacher/components/ChordVoicingPickerList.vue'
import DiagramPickerList from '@/features/teacher/components/DiagramPickerList.vue'
import DiagramRefControls from '@/features/teacher/components/DiagramRefControls.vue'
import { useDiagram } from '@/features/teacher/composables/useDiagram'
import { useDiagramEmbedDraft } from '@/features/teacher/composables/useDiagramEmbedDraft'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import { useListInstruments } from '@/shared/composables/useListInstruments'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
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
/** Where a new diagram is picked from: the diagram library, or a chord's voicings in the chord catalog. */
const source = ref<'diagrams' | 'chords'>('diagrams')
const { instruments } = useListInstruments()

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
const reported = computed(() => (inConfigure.value && instrument.value ? draft.toRef() : null))
const nothingShown = computed(
  () => (draft.diagram.value?.positions.length ?? 0) === draft.hiddenPositionIds.value.length,
)

watch(
  () => JSON.stringify(reported.value),
  () => emit('change', reported.value),
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <template v-if="step === 'initial' && initialLoad">
      <LoadingSkeleton v-if="initialLoad.isLoading.value" />
      <div v-else-if="initialLoad.error.value" class="flex flex-col gap-2">
        <LoadFailed
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

    <template v-else-if="step === 'list'">
      <div class="flex w-fit gap-1 rounded-lg bg-surface-sunken p-1" role="group" :aria-label="t('diagramEmbedPicker.sourceLabel')">
        <button
          type="button"
          data-test="embed-picker-source-diagrams"
          :aria-pressed="source === 'diagrams'"
          class="rounded-md px-3 py-1 text-xs font-semibold"
          :class="source === 'diagrams' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="source = 'diagrams'"
        >
          {{ t('diagramEmbedPicker.sourceDiagrams') }}
        </button>
        <button
          type="button"
          data-test="embed-picker-source-chords"
          :aria-pressed="source === 'chords'"
          class="rounded-md px-3 py-1 text-xs font-semibold"
          :class="source === 'chords' ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
          @click="source = 'chords'"
        >
          {{ t('diagramEmbedPicker.sourceChords') }}
        </button>
      </div>
      <ChordVoicingPickerList v-if="source === 'chords'" @select="choose" />
      <DiagramPickerList v-else @select="choose" />
    </template>

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

      <DiagramRefControls :diagram="draft.diagram.value" :instrument="instrument" :draft="draft">
        <template #warnings>
          <p v-if="nothingShown" data-test="embed-picker-nothing-shown" class="text-sm text-danger">
            {{ t('diagramEmbedPicker.nothingShown') }}
          </p>
        </template>
      </DiagramRefControls>
    </div>
  </div>
</template>
