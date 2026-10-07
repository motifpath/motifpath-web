import { ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'
import { fetchDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']
type LocalizedNames = components['schemas']['LocalizedNames']

/**
 * What each item of a session plan is called, so the student always knows what they're
 * practising: an exercise by its title, a play-along by its diagram's name once the diagram has
 * loaded. A fretboard cell has no name of its own; its drill says what it is. Nor has a diagram
 * shape: its diagram's name would give away the shape to name.
 */
export function usePlanItemNames(items: MaybeRefOrGetter<Item[]>) {
  const { coreApi } = useApi()
  const { localizedName } = useLocalizedName()
  const { t } = useTypedT()
  const diagramNames = ref<Record<string, LocalizedNames>>({})

  watch(
    () => toValue(items).flatMap((item) => (item.play_along ? [item.play_along.diagram_id] : [])),
    (diagramIds) => {
      for (const diagramId of new Set(diagramIds)) {
        if (diagramNames.value[diagramId]) continue
        void fetchDiagram(coreApi, diagramId).then((diagram) => {
          if (diagram) diagramNames.value = { ...diagramNames.value, [diagramId]: diagram.names }
        })
      }
    },
    { immediate: true },
  )

  /** The item's name; null for a fretboard cell, a diagram shape, or a play-along whose diagram isn't loaded. */
  function nameOf(item: Item): string | null {
    if (item.exercise) return item.exercise.title
    const names = item.play_along && diagramNames.value[item.play_along.diagram_id]
    return names ? localizedName(names) : null
  }

  /** What to call the item on screen: its name, its drill for a fretboard cell or a shape, or its kind until named. */
  function labelOf(item: Item): string {
    const name = nameOf(item)
    if (name) return name
    if (item.fretboard_cell) {
      return item.fretboard_cell.drill === 'name_the_note' ? t('sessionPlan.drills.nameTheNote') : t('sessionPlan.drills.findTheNote')
    }
    if (item.diagram_shape) {
      return item.diagram_shape.drill === 'name_the_shape' ? t('sessionPlan.drills.nameTheShape') : t('sessionPlan.drills.findTheDegree')
    }
    return t('sessionPlan.playAlong')
  }

  return { nameOf, labelOf }
}
