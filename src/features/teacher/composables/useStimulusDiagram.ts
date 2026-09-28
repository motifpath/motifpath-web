import { ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import { fetchInstruments } from '@/shared/composables/useListInstruments'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

export type StimulusDiagramStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

/**
 * Loads an exercise stimulus's diagram and its instrument, for editing its
 * answers in the form: `unavailable` when either fails to load, or the
 * instrument isn't fretted (no fretboard to mark answers on yet). Loads again
 * only when the diagram itself changes, not on every edit of how it shows.
 */
export function useStimulusDiagram(diagramId: MaybeRefOrGetter<string | null>) {
  const { coreApi } = useApi()

  const status = ref<StimulusDiagramStatus>('idle')
  const diagram = ref<Diagram | null>(null)
  const instrument = ref<Instrument | null>(null)
  let latest = 0

  async function load(id: string | null) {
    const attempt = ++latest
    diagram.value = null
    instrument.value = null
    if (!id) {
      status.value = 'idle'
      return
    }
    status.value = 'loading'

    const [loaded, instruments] = await Promise.all([
      coreApi
        .GET('/diagrams/{diagram_id}', { params: { path: { diagram_id: id } } })
        .then((result) => (result.error ? null : (result.data ?? null)))
        .catch(() => null),
      fetchInstruments(coreApi).catch(() => ({ data: undefined })),
    ])
    // A newer diagram replaced this one while it loaded.
    if (attempt !== latest) return

    const found = loaded && instruments.data?.find((i) => i.instrument_id === loaded.instrument_id)
    if (!loaded || !found || found.family !== 'fretted') {
      status.value = 'unavailable'
      return
    }
    diagram.value = loaded
    instrument.value = found
    status.value = 'ready'
  }

  watch(() => toValue(diagramId), (id) => void load(id), { immediate: true })

  return { status, diagram, instrument }
}
