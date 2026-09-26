import { computed, ref, shallowRef } from 'vue'

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
 * Diagrams overlaid on the one being authored, while the teacher decides whether to
 * merge them into it. Overlays are never saved as a stack: merging flattens the
 * diagram and every overlay (in the order added) into the form's own positions and
 * regions, and discarding drops them. Either way the overlays are then gone.
 */
export function useDiagramOverlays(form: DiagramForm) {
  const overlays = shallowRef<Diagram[]>([])
  // Whether merging adds a highlighted region per diagram; on unless the teacher declines it.
  const regionPerLayer = ref(true)

  const hasOverlays = computed(() => overlays.value.length > 0)
  const overlayIds = computed(() => overlays.value.map((d) => d.diagram_id))

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
    return flattenDiagramStack([baseLayer(), ...overlays.value.map(stackLayerFromDiagram)], {
      languages: form.languages.value,
      regionPerLayer,
    })
  }

  /** Exactly what merging would produce; null without overlays. */
  const preview = computed<FlattenedStack | null>(() => (hasOverlays.value ? flatten(regionPerLayer.value) : null))

  function reset() {
    overlays.value = []
    regionPerLayer.value = true
  }

  /** Drops the overlays, leaving the form as it was. */
  function discard() {
    reset()
  }

  // A position without an interval yet (no root note chosen) couldn't be carried into the merge.
  const canMerge = computed(() => hasOverlays.value && form.hasCompletePositions.value)

  /** Merges the overlays into the form; false, leaving everything as it was, when it can't. */
  function merge(): boolean {
    if (!canMerge.value) return false
    form.loadFlattened(flatten(regionPerLayer.value))
    reset()
    return true
  }

  return { overlays, hasOverlays, overlayIds, regionPerLayer, add, remove, preview, canMerge, merge, discard }
}
