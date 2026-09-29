<script setup lang="ts">
/**
 * A diagram drawn whole, as its author made it — every position, its
 * colors, shapes and custom labels, in its own label choice — for picking
 * it out of a list. A picture only: its card handles clicks and focus. An
 * instrument the viewer can't draw yet (keyboard), or one not loaded, shows
 * a "no preview" placeholder the same size.
 */
import { computed } from 'vue'

import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Instrument = components['schemas']['Instrument']

const props = defineProps<{
  diagram: Diagram
  /** The instruments to find the diagram's own among. */
  instruments: Instrument[]
}>()

const { t } = useTypedT()

const instrument = computed(() => {
  const found = props.instruments.find((i) => i.instrument_id === props.diagram.instrument_id)
  return found?.family === 'fretted' ? found : null
})
const wholeDiagram = computed<DiagramRef>(() => ({
  diagram_id: props.diagram.diagram_id,
  layers: { intervals: true, subset: null },
}))
</script>

<template>
  <div data-test="diagram-thumbnail" inert>
    <FrettedDiagramView
      v-if="instrument"
      :diagram="diagram"
      :instrument="instrument"
      :diagram-ref="wholeDiagram"
      :label-mode="diagram.label_display"
      compact
      :region-info="false"
    />
    <div
      v-else
      data-test="diagram-thumbnail-none"
      class="flex aspect-[12/5] w-full items-center justify-center rounded-md bg-surface-sunken text-xs text-ink-muted"
    >
      {{ t('diagramThumbnail.noPreview') }}
    </div>
  </div>
</template>
