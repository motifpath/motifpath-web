<script setup lang="ts">
/**
 * Full-size diagram preview — the 360px authoring sidebar is too small to
 * read a fretboard comfortably, so the "preview" affordance is a modal at
 * full width instead of a permanently-visible miniature.
 */
import { useTypedT } from '@/shared/composables/useTypedT'

import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type DiagramRef = components['schemas']['DiagramRef']

const props = withDefaults(
  defineProps<{
    open: boolean
    diagram: Diagram
    instrument: Instrument
    labelMode: 'interval' | 'note' | 'hidden'
    diagramRef?: DiagramRef
  }>(),
  { diagramRef: () => ({ diagram_id: '', layers: { intervals: true } }) },
)
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()
</script>

<template>
  <ModalOverlay
    :open="open"
    panel-class="flex max-h-[90vh] w-[960px] max-w-[95vw] flex-col overflow-hidden rounded-xl bg-surface-raised shadow-level2"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between border-b border-border px-5 py-[18px]">
      <span class="text-base font-bold text-ink">{{ diagram.name || t('diagramPreviewModal.title') }}</span>
      <ModalCloseButton @close="emit('close')" />
    </div>

    <div class="overflow-auto p-6">
      <FrettedDiagramView
        :diagram="props.diagram"
        :instrument="props.instrument"
        :diagram-ref="props.diagramRef"
        :label-mode="props.labelMode"
      />
    </div>
  </ModalOverlay>
</template>
