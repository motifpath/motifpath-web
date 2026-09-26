import { computed, shallowRef } from 'vue'

import type { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import {
  flattenDiagramStack,
  stackLayerFromDiagram,
  type FlattenedStack,
  type StackLayer,
} from '@/shared/utils/flattenDiagramStack'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramForm = ReturnType<typeof useDiagramForm>

/**
 * Diagrams overlaid read-only on the one being authored, and merging them into it.
 * Overlays are authoring state only: they are never saved as a stack. Merging
 * flattens the diagram and every overlay (in the order added) into the form's own
 * positions and regions, after which the overlays are gone.
 */
export function useDiagramOverlays(form: DiagramForm) {
  const overlays = shallowRef<Diagram[]>([])

  const hasOverlays = computed(() => overlays.value.length > 0)
  const overlayIds = computed(() => overlays.value.map((d) => d.diagram_id))
  const overlayLayers = computed<StackLayer[]>(() => overlays.value.map(stackLayerFromDiagram))

  function add(diagram: Diagram) {
    if (overlayIds.value.includes(diagram.diagram_id)) return
    overlays.value = [...overlays.value, diagram]
  }

  function remove(diagramId: string) {
    overlays.value = overlays.value.filter((d) => d.diagram_id !== diagramId)
  }

  // The diagram being authored, as it stands, as the bottom layer.
  function baseLayer(): StackLayer {
    const request = form.toCreateDiagramRequest()
    return {
      names: request.names,
      color: form.color.value,
      positions: request.positions,
      regions: request.regions ?? [],
      skillIds: [...form.skillIds.value],
      conceptIds: [...form.conceptIds.value],
    }
  }

  function flatten(regionPerLayer: boolean): FlattenedStack {
    return flattenDiagramStack([baseLayer(), ...overlayLayers.value], {
      languages: form.languages.value,
      regionPerLayer,
    })
  }

  /** What merging would produce, before any region per layer; null without overlays. */
  const preview = computed<FlattenedStack | null>(() => (hasOverlays.value ? flatten(false) : null))

  // A position without an interval yet (no root note chosen) couldn't be carried into the merge.
  const canMerge = computed(() => hasOverlays.value && form.hasCompletePositions.value)

  function merge({ regionPerLayer }: { regionPerLayer: boolean }) {
    if (!canMerge.value) return
    form.loadFlattened(flatten(regionPerLayer))
    overlays.value = []
  }

  return { overlays, overlayLayers, hasOverlays, overlayIds, add, remove, preview, canMerge, merge }
}
