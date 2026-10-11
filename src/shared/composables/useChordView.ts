import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']

export type ChordView = 'box' | 'neck'

export function isChordView(value: unknown): value is ChordView {
  return value === 'box' || value === 'neck'
}

/**
 * How one showing of a diagram looks: as a chord box when its author chose one for this usage and
 * the diagram carries the voicing that fingers the box, otherwise on the fretboard. On a chord box
 * the student switches with Box | Neck for this showing only; the next diagram opens in its
 * author's view again.
 */
export function useChordView(source: MaybeRefOrGetter<{ diagram: Diagram | null; diagramRef: DiagramRef | null }>) {
  const canSwitch = computed(() => {
    const { diagram, diagramRef } = toValue(source)
    return diagramRef?.view === 'chord_box' && Boolean(diagram?.chord_voicing)
  })

  /** The student's switch on this showing; null keeps the author's view. */
  const switched = ref<ChordView | null>(null)
  watch(
    () => JSON.stringify(toValue(source).diagramRef),
    () => {
      switched.value = null
    },
  )

  const view = computed<ChordView>(() => (canSwitch.value ? (switched.value ?? 'box') : 'neck'))

  function choose(next: ChordView) {
    switched.value = next
  }

  return { view, canSwitch, choose }
}
