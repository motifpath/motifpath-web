import { ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'
import { fetchDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { fetchInstruments } from '@/shared/composables/useListInstruments'

type ChordVoicing = components['schemas']['ChordVoicing']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

/** A chord to draw as its box: the voicing's diagram, and the voicing it carries. */
export interface ChordBoxSource {
  diagram: Diagram
  voicing: ChordVoicing
}

export type ChordBoxesStatus = 'loading' | 'ready' | 'unavailable'

/**
 * Loads chord voicings to draw as boxes, in the order given, and the instrument they're on. A
 * chord that can't be loaded, or whose diagram carries no voicing, leaves the whole set
 * unavailable: a pair with one box missing can't be practised. No chords at all is unavailable
 * too, and loads nothing.
 */
export function useChordBoxes(diagramIds: MaybeRefOrGetter<string[]>) {
  const { coreApi } = useApi()

  const status = ref<ChordBoxesStatus>('loading')
  const boxes = ref<ChordBoxSource[]>([])
  const instrument = ref<Instrument | null>(null)
  let latest = 0

  async function load(ids: string[]) {
    const attempt = ++latest
    if (ids.length === 0) {
      boxes.value = []
      instrument.value = null
      status.value = 'unavailable'
      return
    }
    status.value = 'loading'
    const [diagrams, instruments] = await Promise.all([
      Promise.all(ids.map((id) => fetchDiagram(coreApi, id))),
      fetchInstruments(coreApi).catch(() => ({ data: undefined })),
    ])
    // Newer chords replaced these while they loaded.
    if (attempt !== latest) return

    const loaded = diagrams.flatMap((diagram) => (diagram?.chord_voicing ? [{ diagram, voicing: diagram.chord_voicing }] : []))
    const on = instruments.data?.find((candidate) => candidate.instrument_id === loaded[0]?.diagram.instrument_id)
    if (loaded.length !== ids.length || !on) {
      boxes.value = []
      instrument.value = null
      status.value = 'unavailable'
      return
    }
    boxes.value = loaded
    instrument.value = on
    status.value = 'ready'
  }

  watch(
    () => toValue(diagramIds).join(','),
    () => void load(toValue(diagramIds)),
    { immediate: true },
  )

  return { status, boxes, instrument }
}
