import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

export type ChordView = 'box' | 'neck'

export function isChordView(value: unknown): value is ChordView {
  return value === 'box' || value === 'neck'
}

/**
 * How one showing of a diagram looks: a diagram that carries chord data (its voicing's fingers,
 * muted strings and fret window) is a chord, shown as a chord box; any other on the fretboard. On a
 * chord box the student switches with Box | Neck for this showing only; the next chord opens as a
 * box again.
 */
export function useChordView(diagram: MaybeRefOrGetter<Diagram | null>) {
  const canSwitch = computed(() => Boolean(toValue(diagram)?.chord_voicing))

  /** The student's switch on this showing; null keeps the box. */
  const switched = ref<ChordView | null>(null)
  watch(
    () => toValue(diagram)?.diagram_id,
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
