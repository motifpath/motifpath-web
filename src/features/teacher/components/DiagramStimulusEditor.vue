<script setup lang="ts">
/**
 * Edits a diagram exercise stimulus in the exercise form, the way regions are
 * drawn on an image stimulus: what its markers read, which positions are
 * hidden, and which are the correct answers — hidden ones included, since the
 * student looks for them on the fretboard.
 *
 * Reports the ref on every change, even with no correct position yet: the
 * form warns and won't save until one is, as with an image's regions. A
 * saved stimulus that names its answers by interval is reported with the
 * positions those intervals meant.
 *
 * Keyed on the diagram by its caller: a different diagram starts afresh.
 */
import { watch } from 'vue'

import DiagramRefControls from '@/features/teacher/components/DiagramRefControls.vue'
import { useDiagramEmbedDraft } from '@/features/teacher/composables/useDiagramEmbedDraft'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  diagram: Diagram
  instrument: Instrument
  diagramRef: DiagramRef
}>()
const emit = defineEmits<{ 'update:diagramRef': [diagramRef: DiagramRef] }>()

const { t } = useTypedT()

const draft = useDiagramEmbedDraft(props.diagramRef, { answers: true })
draft.select(props.diagram)

watch(
  () => JSON.stringify(draft.toPreviewRef()),
  () => {
    const next = draft.toPreviewRef()
    if (next) emit('update:diagramRef', next)
  },
  { immediate: true },
)
</script>

<template>
  <div data-test="stimulus-diagram-editor" class="rounded-md border border-border bg-surface-sunken p-3">
    <DiagramRefControls :diagram="diagram" :instrument="instrument" :draft="draft" answers>
      <template #warnings>
        <p
          v-if="draft.correctPositionIds.value.length === 0"
          data-test="stimulus-no-correct"
          class="text-sm text-danger"
        >
          {{ t('diagramEmbedPicker.noCorrect') }}
        </p>
      </template>
    </DiagramRefControls>
  </div>
</template>
