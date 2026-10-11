import { computed, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

export type ChordView = 'box' | 'neck'

const STORAGE_KEY = 'motifpath.chordView'

export function isChordView(value: unknown): value is ChordView {
  return value === 'box' || value === 'neck'
}

function readPreference(): ChordView | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isChordView(stored) ? stored : null
  } catch {
    // Blocked storage only costs the remembered choice.
    return null
  }
}

function writePreference(view: ChordView): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, view)
  } catch {
    // Remembering the choice is a convenience; this chord already switched.
  }
}

// Shared by every chord on the page, so switching one switches the next too.
const preferred = ref<ChordView | null>(readPreference())

/** Reads the remembered choice from storage again. For tests. */
export function resetChordViewPreference() {
  preferred.value = readPreference()
}

/**
 * How a diagram is shown: a chord voicing (one that carries its voicing) opens as a chord box, any
 * other diagram as a fretboard. On a chord the student switches with Box | Neck, and that choice
 * is remembered on this device over the default for every chord after it.
 */
export function useChordView(diagram: MaybeRefOrGetter<Diagram | null>) {
  const canSwitch = computed(() => Boolean(toValue(diagram)?.chord_voicing))
  const view = computed<ChordView>(() => (canSwitch.value ? (preferred.value ?? 'box') : 'neck'))

  function choose(next: ChordView) {
    preferred.value = next
    writePreference(next)
  }

  return { view, canSwitch, choose }
}
